from fastapi import HTTPException, status, UploadFile
from typing import Dict, Any, Optional, List

from schema.rag_schema import DocumentPayload, QueryRequest, QueryResponse, SourceDocument
from service.rag.rag_service import rag_service
from service.features.file_processing_service import file_processing_service
from service.features.user_documents_service import user_documents_service
from service.features.chat_session_service import chat_session_service
import logging

logger = logging.getLogger(__name__)

class RAGController:

    async def delete_documents(self, filenames: list, user: Dict[str, Any]) -> Dict[str, Any]:
        """Delete documents and their vectors for the user."""
        username = user.get('username')
        
        # Get all chunk_ids and parent_ids for these documents from user record
        docs = await user_documents_service.get_user_documents(username)
        chunk_ids = []
        parent_ids = set()
        for doc in docs:
            if doc['filename'] in filenames:
                chunk_ids.extend(doc.get('chunk_ids', []))
                # Add parent_ids if they exist in the record (newer documents)
                if 'parent_ids' in doc:
                    parent_ids.update(doc.get('parent_ids', []))
        
        if not chunk_ids:
            logger.warning(f"No chunks found for documents: {filenames}")
            return {"deleted": 0, "vectors_deleted": 0, "parent_chunks_deleted": 0}
        
        from service.rag.pinecone_service import pinecone_service
        from service.rag.parent_chunks_service import parent_chunks_service
        
        # Fallback: if parent_ids were not in MongoDB record, try to get them from Pinecone metadata
        if not parent_ids:
            logger.info("Parent IDs not found in MongoDB record, fetching from Pinecone...")
            parent_ids = await pinecone_service.get_parent_ids_from_chunks(chunk_ids)
        else:
            parent_ids = list(parent_ids)
        
        # Delete from user docs record
        deleted_count = await user_documents_service.delete_documents(username, filenames)
        
        # Delete child vectors from Pinecone using known chunk_ids
        vectors_deleted = await pinecone_service.delete_vectors_by_chunk_ids(chunk_ids)
        
        # Robust sweep: also delete by source_filename and username filter
        # This ensures cleanup even if chunk_ids list was incomplete
        for filename in filenames:
            await pinecone_service.delete_vectors_by_filter({
                "username": username,
                "source_filename": filename
            })
        
        # Delete parent chunks from MongoDB
        parent_chunks_deleted = 0
        if parent_ids:
            parent_chunks_deleted = await parent_chunks_service.delete_parent_chunks(parent_ids)
        
        logger.info(f"Deleted {deleted_count} documents, {vectors_deleted} vectors, {parent_chunks_deleted} parent chunks for user '{username}'")
        
        return {
            "deleted": deleted_count, 
            "vectors_deleted": vectors_deleted,
            "parent_chunks_deleted": parent_chunks_deleted
        }

    async def process_and_index_document(
        self, document: DocumentPayload, user: Dict[str, Any], filename: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Controller logic to process and index a document.
        Converts the Pydantic model to a dict for the service layer.
        """
        username = user.get('username')
        logger.info(f"User '{username}' initiated indexing for document: '{document.title or 'Untitled'}'")

        # Convert Pydantic model to dictionary for the service
        doc_dict = document.model_dump()

        # Add username to metadata for user-specific filtering
        if 'metadata' not in doc_dict:
            doc_dict['metadata'] = {}
        doc_dict['metadata']['username'] = username

        # Call indexing module which returns chunk IDs and parent IDs
        result = await rag_service.indexing_module(doc_dict)
        new_chunk_ids = result.get("chunk_ids", [])
        new_parent_ids = result.get("parent_ids", [])

        if not new_chunk_ids:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to index the document.",
            )
            
        # Track document for this user in MongoDB
        # Pass description if present in metadata
        description = document.metadata.get('description') if document.metadata else None
        await user_documents_service.add_document(
            username=username,
            title=document.title or 'Untitled',
            filename=filename or document.metadata.get('source_filename', 'Unknown'),
            chunk_ids=new_chunk_ids,
            parent_ids=new_parent_ids,
            description=description
        )

        return {"message": f"Document '{document.title or 'Untitled'}' indexed successfully."}

    async def orchestrate_rag_flow(
        self, query_request: QueryRequest, user: Dict[str, Any], session_id: Optional[str] = None, documents: Optional[List[str]] = None
    ) -> QueryResponse:
        """
        Orchestrates the full Modular RAG pipeline from query to generation.
        Optionally filters retrieval to specific documents if provided.
        Includes full chat history for context-aware responses.
        Supports adaptive response styles (auto, detailed, concise, balanced).
        """
        query = query_request.query
        top_k = query_request.top_k
        response_style = query_request.response_style or "auto"
        retrieval_multiplier = query_request.retrieval_multiplier or 4
        username = user.get('username')
        logger.info(f"User '{username}' query: '{query[:50]}...' | style: '{response_style}' | top_k: {top_k} | multiplier: {retrieval_multiplier}")
        logger.info(f"Document filter: {documents} (type: {type(documents)})")
        
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
                enhanced_query = await rag_service.pre_retrieval_module(query)
            except Exception as e:
                logger.warning(f"Pre-retrieval failed: {e}. Using original query.")
                enhanced_query = query
            
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
            if not retrieved_chunks:
                logger.warning(f"No documents retrieved for query: '{query}'")
                
                # Check if user has any documents at all
                user_docs = await user_documents_service.get_user_documents(username)
                if not user_docs:
                     return QueryResponse(
                        answer="You haven't uploaded any documents yet. Please upload a document to start chatting.",
                        sources=[]
                    )
                
                return QueryResponse(
                    answer="I scanned your documents but couldn't find any content that directly matches your question. You might try:\n1. Rephrasing your query\n2. Checking if the information is in your uploaded files",
                    sources=[]
                )

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
            if not final_context_chunks:
                logger.warning(f"No relevant context after reranking for query: '{query}'")
                return QueryResponse(
                    answer="I found some documents but none seem relevant to your specific question. Please try rephrasing your query.",
                    sources=[]
                )

            # 4. [Generation Module] Generate the answer from the refined context with chat history and response style
            final_answer = await rag_service.generation_module(query, final_context_chunks, chat_history, response_style)
            
            # 5. Format the sources for the final response
            sources = []
            for chunk in final_context_chunks:
                metadata = chunk.get('metadata', {})
                sources.append(SourceDocument(
                    id=chunk.get('id', 'unknown_id'),
                    content=metadata.get('content', ''),
                    title=metadata.get('title'),
                    score=chunk.get('score') # The reranker should add a score
                ))
            
            # Save to chat session if session_id provided
            if session_id:
                # Add user message
                await chat_session_service.add_message(session_id, username, "user", query)
                
                # Check if we need to update title (first message heuristic done in service now or helper)
                await chat_session_service.update_session_title_if_needed(session_id, username, query)

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

        # 1. Extract text from the uploaded file
        extracted_data = await file_processing_service.extract_text_from_file(file)

        # 1.1 Deduplication Check: Remove existing document with same name
        existing_docs = await user_documents_service.get_user_documents(user.get('username'))
        if any(doc.get('filename') == file.filename for doc in existing_docs):
            logger.info(f"Document '{file.filename}' already exists. Replacing it...")
            await self.delete_documents([file.filename], user)

        # 2. Generate a description using Gemini
        from service.rag.gemini_service import gemini_service
        await gemini_service.initialize_gemini()
        description = await gemini_service.generate_description(
            content=extracted_data["content"],
            title=extracted_data["title"]
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

