from fastapi import HTTPException, status, UploadFile
from typing import Dict, Any, Optional, List
import uuid

from schema.rag_schema import DocumentPayload, QueryRequest, QueryResponse, SourceDocument
from service.rag.rag_service import rag_service
from service.features.file_processing_service import file_processing_service
from service.features.user_documents_service import user_documents_service
from service.features.chat_session_service import chat_session_service
import logging

logger = logging.getLogger(__name__)

from lib.config import settings

class RAGController:

    def _resolve_and_log_key(self, api_keys: Dict[str, str], key_key: str, setting_key: Optional[str], provider_name: str, username: str) -> Optional[str]:
        """
        Helper to resolve API key priority (User > System) and log the source.
        """
        user_key = api_keys.get(key_key)
        if user_key:
            logger.info(f"KEYS: Using USER provided {provider_name} API Key for user '{username}'")
            return user_key
        
        if setting_key:
            logger.info(f"KEYS: Using SYSTEM default {provider_name} API Key (User key not found)")
            return setting_key
            
        logger.warning(f"KEYS: No {provider_name} API Key found (User or System)")
        return None

    async def delete_documents(self, filenames: list, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deletes documents and their associated index data for a user.
        """
        username = user.get('username')
        logger.info(f"User '{username}' requesting deletion of {len(filenames)} documents: {filenames}")
        
        try:
            # Local imports to avoid circular dependencies
            from service.rag.pinecone_service import pinecone_service
            from service.rag.parent_chunks_service import parent_chunks_service

            # 1. Get the documents to retrieve metadata (chunk_ids, parent_ids) before deletion
            existing_docs = await user_documents_service.get_user_documents(username)
            target_docs = [doc for doc in existing_docs if doc.get('filename') in filenames]
            
            if not target_docs:
                logger.warning(f"No documents found for deletion matching: {filenames}")
                return {"deleted": 0, "message": "No matching documents found."}
            
            # 2. Collect IDs
            chunk_ids = []
            parent_ids = []
            for doc in target_docs:
                chunk_ids.extend(doc.get('chunk_ids', []))
                parent_ids.extend(doc.get('parent_ids', []))
            
            # 3. Delete from Vector Store (Pinecone)
            # Delete child chunks by ID
            vectors_deleted = 0
            if chunk_ids:
                vectors_deleted = await pinecone_service.delete_vectors_by_chunk_ids(chunk_ids)
            
            # Also delete by filter as a safety net
            await pinecone_service.delete_vectors_by_filter({
                "username": username,
                "source_filename": {"$in": filenames}
            })
            
            # 4. Delete Parent Chunks (MongoDB)
            parents_deleted = 0
            if parent_ids:
                parents_deleted = await parent_chunks_service.delete_parent_chunks(parent_ids)
                
            # 5. Delete from User Documents Collection (MongoDB)
            docs_deleted = await user_documents_service.delete_documents(username, filenames)
            
            logger.info(f"Deletion complete. Docs: {docs_deleted}, Vectors: {vectors_deleted}, Parents: {parents_deleted}")
            
            return {
                "deleted_documents": docs_deleted,
                "deleted_vectors": vectors_deleted, 
                "deleted_parent_chunks": parents_deleted,
                "message": f"Successfully deleted {docs_deleted} documents."
            }
            
        except Exception as e:
            logger.error(f"Error deleting documents for user '{username}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete documents: {str(e)}",
            )

    async def _ensure_db_connection(self, connection_id: Optional[str] = None) -> Optional[str]:
        from controller.query_controller import query_controller
        from schema.query_schema import DatabaseConnectionRequest
        import os

        conn_id = connection_id
        if conn_id and conn_id in query_controller._schema_cache:
            return conn_id
            
        if query_controller._schema_cache:
            return list(query_controller._schema_cache.keys())[0]

        # Auto-connect to workspace test_ecommerce.db if available
        db_path = os.path.abspath(os.path.join(settings.BASE_DIR, "..", "test_ecommerce.db"))
        if os.path.exists(db_path):
            sqlite_uri = f"sqlite:///{db_path}"
            logger.info(f"Auto-connecting DB pipeline to workspace database: {sqlite_uri}")
            try:
                conn_res = await query_controller.connect_to_database(
                    DatabaseConnectionRequest(connection_string=sqlite_uri)
                )
                if conn_res and conn_res.success:
                    return conn_res.connection_id
            except Exception as e:
                logger.warning(f"Auto-connection to {db_path} failed: {e}")
                
        return None

    async def orchestrate_rag_flow(
        self, query_request: QueryRequest, user: Dict[str, Any], session_id: Optional[str] = None, documents: Optional[List[str]] = None
    ) -> QueryResponse:
        """
        Orchestrates the full Modular RAG pipeline from query to generation.
        """
        query = query_request.query
        top_k = query_request.top_k
        response_style = query_request.response_style or "auto"
        retrieval_multiplier = query_request.retrieval_multiplier or 2
        username = user.get('username')
        api_keys = user.get('api_keys', {})
        
        # Add model to api_keys context
        api_keys['model'] = query_request.model
        
        # Resolve and inject keys into api_keys dict so services use the prioritized one
        api_keys['google_api_key'] = self._resolve_and_log_key(
            api_keys, 'google_api_key', settings.google_api_key, 'Google', username
        )
        api_keys['groq_api_key'] = self._resolve_and_log_key(
            api_keys, 'groq_api_key', settings.groq_api_key, 'Groq', username
        )

        logger.info(f"User '{username}' query: '{query[:50]}...' | style: '{response_style}' | top_k: {top_k} | multiplier: {retrieval_multiplier}")
        logger.info(f"Document filter: {documents} (type: {type(documents)})")
        
        doc_selection = query_request.selected_documents if query_request.selected_documents is not None else documents
        
        skip_vector_search = False
        if doc_selection is not None and len(doc_selection) == 0:
            skip_vector_search = True
            logger.info("User explicitly selected 0 documents. Skipping vector document search.")
        elif doc_selection:
            logger.info(f"Filtering vector search to {len(doc_selection)} selected documents: {doc_selection}")

        try:
            # Get chat history if session_id is provided
            chat_history = []
            if session_id:
                session = await chat_session_service.get_session(session_id, username)
                if session and session.get('messages'):
                    chat_history = session['messages']
                    logger.info(f"Loaded {len(chat_history)} messages from chat history")
            
            user_docs = []
            current_doc_descriptions = []
            final_context_chunks = []

            # 1. Handle Document Retrieval only if vector search is not skipped
            if not skip_vector_search:
                user_docs = await user_documents_service.get_user_documents(username)
                if doc_selection:
                    user_docs = [doc for doc in user_docs if doc.get('filename') in doc_selection]
                    
                current_doc_descriptions = [
                    f"{doc.get('title', 'Untitled')}: {doc.get('description', 'No description')}" 
                    for doc in user_docs 
                    if doc.get('description')
                ]

                try:
                    enhanced_query = await rag_service.pre_retrieval_module(query, api_keys=api_keys)
                except Exception as e:
                    logger.warning(f"Pre-retrieval failed: {e}. Using original query.")
                    enhanced_query = query

                retrieval_pool_size = min(top_k * retrieval_multiplier, 50)
                retrieved_chunks = await rag_service.retrieval_module(
                    enhanced_query, 
                    top_k=retrieval_pool_size, 
                    username=username, 
                    documents=doc_selection,
                    similarity_threshold=0.3
                )

                if retrieved_chunks:
                    reranked_chunks = await rag_service.post_retrieval_module(
                        retrieved_chunks, 
                        query,
                        target_count=top_k,
                        min_relevance_score=0.35
                    )
                    final_context_chunks = reranked_chunks if reranked_chunks else []

            # 2. Handle Database Integration if db_connected is True
            db_sql_query = None
            db_sql_results = None
            if query_request.db_connected:
                try:
                    from controller.query_controller import query_controller
                    from schema.query_schema import NaturalLanguageQueryRequest
                    
                    conn_id = await self._ensure_db_connection(query_request.connection_id)
                    
                    if conn_id and conn_id in query_controller._schema_cache:
                        logger.info(f"DB Connected: Inspecting schema & executing query on connection {conn_id}")
                        schema_obj = query_controller._schema_cache[conn_id]
                        fmt_schema = query_controller.sql_analysis_service.format_schema_for_llm(schema_obj)
                        current_doc_descriptions.append(f"Connected Database Structure:\n{fmt_schema}")

                        req = NaturalLanguageQueryRequest(
                            connection_id=conn_id,
                            natural_language_query=query,
                            model=query_request.model
                        )
                        db_res = await query_controller.execute_natural_language_query(req)
                        if db_res and db_res.success:
                            db_sql_query = db_res.generated_sql
                            db_sql_results = db_res.results
                            current_doc_descriptions.append(
                                f"Executed SQL Query: `{db_sql_query}`\nSQL Execution Results: {db_sql_results}"
                            )
                except Exception as db_err:
                    logger.warning(f"Database query execution in RAG flow skipped: {db_err}")

            # Check if we have no context at all
            if not final_context_chunks and not current_doc_descriptions and not query_request.db_connected:
                return QueryResponse(
                    answer="No active documents or database selected. Please select a document or connect a database to ask questions.",
                    sources=[]
                )

            # 3. Generate answer using refined context
            final_answer = await rag_service.generation_module(
                query=query, 
                context_chunks=final_context_chunks, 
                chat_history=chat_history, 
                document_descriptions=current_doc_descriptions,
                api_keys=api_keys
            )
            
            # 5. Format the sources strictly from matched vector chunks
            sources = []
            if not skip_vector_search and final_context_chunks:
                for chunk in final_context_chunks:
                    metadata = chunk.get('metadata', {})
                    rerank_sc = chunk.get('final_score', chunk.get('score', 0.0))
                    vector_sc = chunk.get('retrieval_score', chunk.get('score', 0.0))
                    sources.append(SourceDocument(
                        id=str(chunk.get('id', 'chunk')),
                        content=metadata.get('content', ''),
                        title=metadata.get('title'),
                        score=float(rerank_sc) if rerank_sc is not None else 0.0,
                        retrieval_score=float(vector_sc) if vector_sc is not None else 0.0
                    ))

            # Build thought process steps
            thoughts_list = []
            if documents:
                thoughts_list.append(f"• Document Search: Filtered retrieval to {len(documents)} selected document(s). Retrieved {len(final_context_chunks)} relevant chunk(s).")
            else:
                thoughts_list.append(f"• Document Search: Evaluated all available documents. Retrieved {len(final_context_chunks)} relevant chunk(s).")
            
            if query_request.db_connected:
                if db_sql_query:
                    thoughts_list.append(f"• Database Query: Generated SQL `{db_sql_query}` and retrieved {len(db_sql_results or [])} row(s).")
                else:
                    thoughts_list.append("• Database Connection: Active database context enabled for query.")
            
            thoughts_list.append("• Hybrid Synthesis: Integrated document passages and database knowledge into unified response.")
            thoughts_str = "\n".join(thoughts_list)

            # Save to chat session if session_id provided
            if session_id:
                await chat_session_service.add_message(session_id, username, "user", query)
                await chat_session_service.update_session_title_if_needed(session_id, username, query, api_keys)

                sources_dict = [s.model_dump() for s in sources]
                await chat_session_service.add_message(
                    session_id, username, "assistant", final_answer, sources_dict,
                    metadata={"thoughts": thoughts_str, "sql_query": db_sql_query, "db_connected": query_request.db_connected}
                )
                
            return QueryResponse(
                answer=final_answer, 
                sources=sources, 
                thoughts=thoughts_str,
                sql_query=db_sql_query,
                sql_results=db_sql_results
            )
            
        except Exception as e:
            logger.error(f"Error in RAG flow for user '{user.get('username')}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while processing your query. Please try again.",
            )

    async def orchestrate_rag_flow_stream(
        self, query_request: QueryRequest, user: Dict[str, Any], session_id: Optional[str] = None, documents: Optional[List[str]] = None
    ):
        """
        Streaming version of orchestrate_rag_flow yielding SSE data chunks.
        """
        import json
        query = query_request.query
        top_k = query_request.top_k
        response_style = query_request.response_style or "auto"
        retrieval_multiplier = query_request.retrieval_multiplier or 2
        username = user.get('username')
        api_keys = user.get('api_keys', {})
        api_keys['model'] = query_request.model
        
        api_keys['google_api_key'] = self._resolve_and_log_key(
            api_keys, 'google_api_key', settings.google_api_key, 'Google', username
        )
        api_keys['groq_api_key'] = self._resolve_and_log_key(
            api_keys, 'groq_api_key', settings.groq_api_key, 'Groq', username
        )

        doc_selection = query_request.selected_documents if query_request.selected_documents is not None else documents

        skip_vector_search = False
        if doc_selection is not None and len(doc_selection) == 0:
            skip_vector_search = True
            logger.info("User explicitly selected 0 documents in stream. Skipping vector document search.")
        elif doc_selection:
            logger.info(f"Filtering stream vector search to {len(doc_selection)} selected documents: {doc_selection}")

        try:
            chat_history = []
            if session_id:
                session = await chat_session_service.get_session(session_id, username)
                if session and session.get('messages'):
                    chat_history = session['messages']
            
            user_docs = []
            current_doc_descriptions = []
            final_context_chunks = []

            if not skip_vector_search:
                user_docs = await user_documents_service.get_user_documents(username)
                if doc_selection:
                    user_docs = [doc for doc in user_docs if doc.get('filename') in doc_selection]
                    
                current_doc_descriptions = [
                    f"{doc.get('title', 'Untitled')}: {doc.get('description', 'No description')}" 
                    for doc in user_docs 
                    if doc.get('description')
                ]

                try:
                    enhanced_query = await rag_service.pre_retrieval_module(query, api_keys=api_keys)
                except Exception:
                    enhanced_query = query

                retrieval_pool_size = min(top_k * retrieval_multiplier, 50)
                retrieved_chunks = await rag_service.retrieval_module(
                    enhanced_query, 
                    top_k=retrieval_pool_size, 
                    username=username, 
                    documents=doc_selection,
                    similarity_threshold=0.3
                )

                if retrieved_chunks:
                    reranked_chunks = await rag_service.post_retrieval_module(
                        retrieved_chunks, 
                        query,
                        target_count=top_k,
                        min_relevance_score=0.35
                    )
                    final_context_chunks = reranked_chunks if reranked_chunks else []

            db_sql_query = None
            db_sql_results = None
            if query_request.db_connected:
                try:
                    from controller.query_controller import query_controller
                    from schema.query_schema import NaturalLanguageQueryRequest
                    
                    conn_id = await self._ensure_db_connection(query_request.connection_id)
                    
                    if conn_id and conn_id in query_controller._schema_cache:
                        schema_obj = query_controller._schema_cache[conn_id]
                        fmt_schema = query_controller.sql_analysis_service.format_schema_for_llm(schema_obj)
                        current_doc_descriptions.append(f"Connected Database Structure:\n{fmt_schema}")

                        req = NaturalLanguageQueryRequest(
                            connection_id=conn_id,
                            natural_language_query=query,
                            model=query_request.model
                        )
                        db_res = await query_controller.execute_natural_language_query(req)
                        if db_res and db_res.success:
                            db_sql_query = db_res.generated_sql
                            db_sql_results = db_res.results
                            current_doc_descriptions.append(
                                f"Executed SQL Query: `{db_sql_query}`\nSQL Execution Results: {db_sql_results}"
                            )
                except Exception as db_err:
                    logger.warning(f"Database query execution in streaming RAG flow skipped: {db_err}")

            if not final_context_chunks and not current_doc_descriptions and not query_request.db_connected:
                yield f"data: {json.dumps({'type': 'metadata', 'sources': [], 'thoughts': '', 'sql_query': None})}\n\n"
                yield f"data: {json.dumps({'type': 'chunk', 'text': 'No active documents or database selected. Please select a document or connect a database to ask questions.'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            sources = []
            if not skip_vector_search and final_context_chunks:
                for chunk in final_context_chunks:
                    metadata = chunk.get('metadata', {})
                    rerank_sc = chunk.get('final_score', chunk.get('score', 0.0))
                    vector_sc = chunk.get('retrieval_score', chunk.get('score', 0.0))
                    sources.append(SourceDocument(
                        id=str(chunk.get('id', 'chunk')),
                        content=metadata.get('content', ''),
                        title=metadata.get('title'),
                        score=float(rerank_sc) if rerank_sc is not None else 0.0,
                        retrieval_score=float(vector_sc) if vector_sc is not None else 0.0
                    ))

            thoughts_list = []
            if documents:
                thoughts_list.append(f"• Document Search: Filtered retrieval to {len(documents)} selected document(s). Retrieved {len(final_context_chunks)} relevant chunk(s).")
            else:
                thoughts_list.append(f"• Document Search: Evaluated all available documents. Retrieved {len(final_context_chunks)} relevant chunk(s).")
            
            if query_request.db_connected:
                if db_sql_query:
                    thoughts_list.append(f"• Database Query: Generated SQL `{db_sql_query}` and retrieved {len(db_sql_results or [])} row(s).")
                else:
                    thoughts_list.append("• Database Connection: Active database context enabled for query.")
            
            thoughts_list.append("• Hybrid Synthesis: Integrated document passages and database knowledge into unified response.")
            thoughts_str = "\n".join(thoughts_list)

            # Send metadata header first
            sources_dict = [s.model_dump() for s in sources]
            yield f"data: {json.dumps({'type': 'metadata', 'sources': sources_dict, 'thoughts': thoughts_str, 'sql_query': db_sql_query})}\n\n"

            # Stream generation content
            full_answer = ""
            async for chunk in rag_service.generation_module_stream(
                query=query, 
                context_chunks=final_context_chunks, 
                chat_history=chat_history, 
                document_descriptions=current_doc_descriptions,
                api_keys=api_keys
            ):
                full_answer += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            # Save full conversation to chat session history
            if session_id:
                await chat_session_service.add_message(session_id, username, "user", query)
                await chat_session_service.update_session_title_if_needed(session_id, username, query, api_keys)
                await chat_session_service.add_message(
                    session_id, username, "assistant", full_answer, sources_dict,
                    metadata={"thoughts": thoughts_str, "sql_query": db_sql_query, "db_connected": query_request.db_connected}
                )
            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Error in streaming RAG flow for user '{user.get('username')}': {e}")
            yield f"data: {json.dumps({'type': 'chunk', 'text': '❌ An error occurred while generating the response.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    async def upload_and_index_file(
        self, file: UploadFile, user: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Controller logic to handle file upload, extract text, generate description, and then index it.
        """
        logger.info(f"User '{user.get('username')}' uploaded file: '{file.filename}' for indexing.")
        api_keys = user.get('api_keys', {})

        # 1. Extract text from the uploaded file
        extracted_data = await file_processing_service.extract_text_from_file(file)

        # 1.1 Deduplication Check: Remove existing document with same name
        existing_docs = await user_documents_service.get_user_documents(user.get('username'))
        if any(doc.get('filename') == file.filename for doc in existing_docs):
            logger.info(f"Document '{file.filename}' already exists. Replacing it...")
            await self.delete_documents([file.filename], user)

        # 2. Generate a description using Gemini or Groq
        from service.rag.gemini_service import gemini_service
        from service.rag.groq_service import groq_service
        
        # Resolve keys to decide which service to use
        # We prefer Groq for description if available (User or System)
        groq_key = self._resolve_and_log_key(api_keys, 'groq_api_key', settings.groq_api_key, 'Groq', user.get('username'))
        
        if groq_key:
             description = await groq_service.generate_description(
                content=extracted_data["content"],
                title=extracted_data["title"],
                api_key=groq_key
            )
        else:
            # Fallback to Gemini
            google_key = self._resolve_and_log_key(api_keys, 'google_api_key', settings.google_api_key, 'Google', user.get('username'))
            description = await gemini_service.generate_description(
                content=extracted_data["content"],
                title=extracted_data["title"],
                api_key=google_key
            )

        # 3. Create a DocumentPayload from the extracted content and description
        doc_payload = DocumentPayload(
            title=extracted_data["title"],
            content=extracted_data["content"],
            metadata={
                "source_filename": file.filename,
                "description": description
            }
        )

        # 4. Reuse the existing indexing logic
        return await self.process_and_index_document(doc_payload, user, file.filename)

    async def process_and_index_document(self, doc_payload: DocumentPayload, user: Dict[str, Any], filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Orchestrates the indexing process:
        1. Run the core RAG indexing module (Chunking -> Embedding -> Pinecone).
        2. Save document metadata to MongoDB (User Documents) with the generated IDs.
        """
        username = user.get('username')
        
        # Determine filename if not provided
        if not filename:
             filename = doc_payload.metadata.get('source_filename')
             if not filename:
                 filename = f"document_{doc_payload.title}_{uuid.uuid4().hex[:8]}.txt"
        
        logger.info(f"Processing and indexing document '{filename}' for user '{username}'")

        try:
            # 1. Prepare data for indexing module
            # CRITICAL: Inject username into metadata for multi-tenant isolation
            doc_payload.metadata["username"] = username
            
            indexing_input = {
                "content": doc_payload.content,
                "title": doc_payload.title,
                "metadata": doc_payload.metadata
            }
            
            # 2. Run Indexing Module
            # This handles chunking, embedding, and storing in Pinecone/Parent Store
            index_result = await rag_service.indexing_module(indexing_input)
            
            chunk_ids = index_result.get("chunk_ids", [])
            parent_ids = index_result.get("parent_ids", [])
            
            if not chunk_ids:
                 # It's possible indexing failed or content was empty/too short
                 if len(doc_payload.content.strip()) < 10:
                      logger.warning(f"Document content too short for indexing: {len(doc_payload.content)} chars")
                 else:
                      logger.warning("Indexing returned 0 chunks.")
                 
            # 3. Save to User Documents (MongoDB)
            doc_record = await user_documents_service.add_document(
                username=username,
                title=doc_payload.title,
                filename=filename,
                chunk_ids=chunk_ids,
                parent_ids=parent_ids,
                description=doc_payload.metadata.get("description")
            )
            
            logger.info(f"Document '{filename}' successfully processed and stored for user '{username}'.")
            
            return {
                "message": f"Successfully indexed '{filename}'",
                "document": doc_record
            }

        except Exception as e:
            logger.error(f"Error processing document '{filename}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process document: {str(e)}",
            )

    async def get_indexed_documents(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Controller logic to retrieve all indexed documents for the user.
        Returns a list of user-specific documents with their metadata.
        """
        username = user.get('username')
        logger.info(f"User '{username}' requested list of indexed documents.")
        
        try:
            # Get user-specific documents
            documents = await user_documents_service.get_user_documents(username)
            
            logger.info(f"Found {len(documents)} documents for user '{username}'")
            
            return {
                'documents': documents,
                'total': len(documents)
            }
            
        except Exception as e:
            logger.error(f"Error retrieving documents for user '{username}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving documents.",
            )

# Singleton instance
rag_controller = RAGController()

