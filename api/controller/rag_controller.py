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
        
        # If documents is an empty list, treat it as None (Search All) rather than "filter by nothing"
        if documents is not None and len(documents) == 0:
            documents = None

        if documents:
            logger.info(f"Filtering to {len(documents)} documents: {documents}")

        try:
            # Get chat history if session_id is provided
            chat_history = []
            if session_id:
                session = await chat_session_service.get_session(session_id, username)
                if session and session.get('messages'):
                    chat_history = session['messages']
                    logger.info(f"Loaded {len(chat_history)} messages from chat history")
            
            # 1. [Pre-Retrieval Module] Enhance the query (e.g., with HyDE)
            try:
                enhanced_query = await rag_service.pre_retrieval_module(query, api_keys=api_keys)
            except Exception as e:
                logger.warning(f"Pre-retrieval failed: {e}. Using original query.")
                enhanced_query = query
            
            # Get user documents to provide high-level context
            user_docs = await user_documents_service.get_user_documents(username)
            
            # Filter based on selected documents if provided
            if documents:
                user_docs = [doc for doc in user_docs if doc.get('filename') in documents]
                
            current_doc_descriptions = [
                f"{doc.get('title', 'Untitled')}: {doc.get('description', 'No description')}" 
                for doc in user_docs 
                if doc.get('description')
            ]

            # 2. [Retrieval Module] Retrieve documents with enhanced diversity and relevance filtering
            # Use retrieval_multiplier to cast a wider net for better quality selection
            retrieval_pool_size = min(top_k * retrieval_multiplier, 50)  # Cap at 50 for performance
            
            retrieved_chunks = await rag_service.retrieval_module(
                enhanced_query, 
                top_k=retrieval_pool_size, 
                username=username, 
                documents=documents,
                similarity_threshold=0.3  # Filter out very low relevance matches
            )

            # Handle case where no documents are retrieved
            # NEW STRATEGY: If no chunks found, but user has documents, let the LLM answer using 
            # the document descriptions/summaries. This allows for general questions about what documents exist.
            if not retrieved_chunks:
                logger.warning(f"No documents retrieved for query: '{query}'. Proceeding with document summaries only.")
                
                if not user_docs:
                     return QueryResponse(
                        answer="You haven't uploaded any documents yet. Please upload a document to start chatting.",
                        sources=[]
                    )
                # We will proceed to generation with empty chunks but populated descriptions


            # 3. [Post-Retrieval Module] Rerank with adaptive selection based on quality
            #    Note: Reranking is done on the ORIGINAL query for maximum accuracy.
            reranked_chunks = await rag_service.post_retrieval_module(
                retrieved_chunks, 
                query,
                target_count=top_k,
                min_relevance_score=0.35  # Only keep reasonably relevant chunks
            )
            
            # Use the adaptively selected chunks (already filtered by quality)
            final_context_chunks = reranked_chunks if reranked_chunks else []

            # Handle case where reranking returns empty results
            if not final_context_chunks and not current_doc_descriptions:
                 logger.warning(f"No relevant context after reranking for query: '{query}' and no document summaries available.")
                 return QueryResponse(
                    answer="I found some documents but none seem relevant to your specific question. Please try rephrasing your query.",
                    sources=[]
                )
            
            # If we have descriptions but no chunks, we proceed to generation


            # 4. [Generation Module] Generate the answer from the refined context with chat history and response style
            final_answer = await rag_service.generation_module(
                query=query, 
                context_chunks=final_context_chunks, 
                chat_history=chat_history, 
                document_descriptions=current_doc_descriptions,
                api_keys=api_keys
            )
            
            # 5. Format the sources for the final response
            sources = []
            if final_context_chunks:
                for chunk in final_context_chunks:
                    metadata = chunk.get('metadata', {})
                    sources.append(SourceDocument(
                        id=chunk.get('id', 'unknown_id'),
                        content=metadata.get('content', ''),
                        title=metadata.get('title'),
                        score=chunk.get('score')
                    ))
            elif user_docs:
                # Fallback: If no chunks were used but we had documents (and presumably used their descriptions),
                # list them as sources so the user knows what was considered.
                # We limit to 5 to avoid cluttering the UI if there are many.
                for doc in user_docs[:5]:
                    sources.append(SourceDocument(
                        id=str(doc.get('_id', 'unknown')),
                        content=doc.get('description', 'Document Overview/Summary'),
                        title=doc.get('title'),
                        score=1.0
                    ))
            
            # Skip appending sources to the final answer for visibility in chat


            # Save to chat session if session_id provided
            if session_id:
                # Add user message
                await chat_session_service.add_message(session_id, username, "user", query)
                
                # Check if we need to update title (first message heuristic done in service now or helper)
                # Pass API keys for title generation
                await chat_session_service.update_session_title_if_needed(session_id, username, query, api_keys)

                # Add assistant message with sources
                sources_dict = [s.model_dump() for s in sources]
                await chat_session_service.add_message(session_id, username, "assistant", final_answer, sources_dict)
                
            return QueryResponse(answer=final_answer, sources=sources)
            
        except Exception as e:
            logger.error(f"Error in RAG flow for user '{user.get('username')}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while processing your query. Please try again.",
            )

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

