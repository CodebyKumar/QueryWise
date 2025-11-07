from fastapi import HTTPException, status, UploadFile
from typing import Dict, Any

from schema.rag_schema import DocumentPayload, QueryRequest, QueryResponse, SourceDocument
from service.rag_modules_service import rag_modules_service
from service.file_processing_service import file_processing_service
import logging

logger = logging.getLogger(__name__)

class RAGController:
    async def process_and_index_document(
        self, document: DocumentPayload, user: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Controller logic to process and index a document.
        Converts the Pydantic model to a dict for the service layer.
        """
        logger.info(f"User '{user.get('username')}' initiated indexing for document: '{document.title or 'Untitled'}'")
        
        # Convert Pydantic model to dictionary for the service
        doc_dict = document.model_dump()
        
        success = await rag_modules_service.indexing_module(doc_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to index the document.",
            )
        
        return {"message": f"Document '{document.title or 'Untitled'}' indexed successfully."}

    async def orchestrate_rag_flow(
        self, query_request: QueryRequest, user: Dict[str, Any]
    ) -> QueryResponse:
        """
        Orchestrates the full Modular RAG pipeline from query to generation.
        """
        query = query_request.query
        top_k = query_request.top_k
        logger.info(f"User '{user.get('username')}' submitted query: '{query}'")

        try:
            # 1. [Pre-Retrieval Module] Enhance the query (e.g., with HyDE)
            enhanced_query = await rag_modules_service.pre_retrieval_module(query)
            
            # 2. [Retrieval Module] Retrieve documents. Fetch more than needed (e.g., 2x) for the reranker to work effectively.
            retrieved_chunks = await rag_modules_service.retrieval_module(enhanced_query, top_k=top_k * 2)

            # Handle case where no documents are retrieved
            if not retrieved_chunks:
                logger.warning(f"No documents retrieved for query: '{query}'")
                return QueryResponse(
                    answer="I couldn't find any relevant documents to answer your question. Please make sure documents have been uploaded and indexed.",
                    sources=[]
                )

            # 3. [Post-Retrieval Module] Rerank the results for better relevance.
            #    Note: Reranking is done on the ORIGINAL query for maximum accuracy.
            reranked_chunks = await rag_modules_service.post_retrieval_module(retrieved_chunks, query)
            
            # We only need the top_k chunks for the final context
            final_context_chunks = reranked_chunks[:top_k] if reranked_chunks else []

            # Handle case where reranking returns empty results
            if not final_context_chunks:
                logger.warning(f"No relevant context after reranking for query: '{query}'")
                return QueryResponse(
                    answer="I found some documents but none seem relevant to your specific question. Please try rephrasing your query.",
                    sources=[]
                )

            # 4. [Generation Module] Generate the answer from the refined context.
            final_answer = await rag_modules_service.generation_module(query, final_context_chunks)
            
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
        Controller logic to handle file upload, extract text, and then index it.
        """
        logger.info(f"User '{user.get('username')}' uploaded file: '{file.filename}' for indexing.")
        
        # 1. Extract text from the uploaded file
        extracted_data = await file_processing_service.extract_text_from_file(file)
        
        # 2. Create a DocumentPayload from the extracted content
        doc_payload = DocumentPayload(
            title=extracted_data["title"],
            content=extracted_data["content"],
            metadata={"source_filename": file.filename} # Add original filename to metadata
        )
        
        # 3. Reuse the existing indexing logic
        return await self.process_and_index_document(doc_payload, user)

# Singleton instance
rag_controller = RAGController()

