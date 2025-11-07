from typing import List, Dict, Any, Tuple
from service.gemini_service import gemini_service
from service.pinecone_service import pinecone_service
import logging
import uuid
import re

logger = logging.getLogger(__name__)

class RAGModulesService:
    """
    Implements the core modules of a Modular RAG system, based on advanced
    techniques discussed in contemporary research.
    """
    def __init__(self):
        # Configuration for Small-to-Big chunking
        self.child_chunk_size = 300  # Smaller chunks for better retrieval accuracy
        self.parent_chunk_size = 1000 # Larger parent chunks for better context
        self.chunk_overlap = 100

    async def indexing_module(self, document: Dict[str, Any]) -> bool:
        """
        [Module: Indexing] Implements a "Small-to-Big" chunking and embedding strategy.
        Smaller, more granular chunks are embedded for retrieval, but are linked to
        larger parent chunks that provide more context for the generation model.
        
        Concept from Paper: Chunk Optimization -> Small-to-Big
        """
        try:
            # 1. Chunk the document into parent and child chunks
            parent_chunks, child_chunks = self._chunk_document_small_to_big(
                document["content"], document.get("title", "")
            )
            
            # 2. Generate embeddings for each CHILD chunk
            vectors = []
            failed_embeddings = 0
            
            for i, child_chunk in enumerate(child_chunks):
                logger.info(f"Processing chunk {i+1}/{len(child_chunks)} for embeddings")
                embedding = await gemini_service.get_embedding(child_chunk["content"])
                
                if embedding and len(embedding) > 0:
                    vectors.append({
                        "id": child_chunk["id"],
                        "values": embedding,
                        "metadata": {
                            "content": child_chunk["content"], # The small chunk content
                            "parent_id": child_chunk["parent_id"],
                            "title": document.get("title", ""),
                            "chunk_index": i,
                            "is_fallback": len(embedding) == 768 and all(isinstance(x, float) for x in embedding[:3]),
                            **document.get("metadata", {})
                        }
                    })
                else:
                    failed_embeddings += 1
                    logger.warning(f"Failed to get embedding for chunk {i+1}")
            
            if failed_embeddings > 0:
                logger.warning(f"Failed to generate embeddings for {failed_embeddings}/{len(child_chunks)} chunks")
            
            if not vectors:
                logger.error("No embeddings were generated successfully")
                return False
            
            # 3. Store child vectors and parent chunks
            if vectors:
                # Store child vectors in Pinecone for retrieval
                await pinecone_service.upsert_vectors(vectors)
                
                # Store parent chunks in a separate store (e.g., another Pinecone namespace, a docstore, or cache)
                # For simplicity, we'll assume a method exists to store/retrieve them.
                await pinecone_service.store_parent_chunks(parent_chunks)
                
                logger.info(f"Indexed {len(vectors)} child chunks for document '{document.get('title', 'Unknown')}'")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error in indexing module: {e}")
            return False

    async def pre_retrieval_module(self, query: str) -> str:
        """
        [Module: Pre-Retrieval] Enhances the query using Hypothetical Document Embeddings (HyDE).
        It generates a hypothetical answer to the query, which is often semantically closer
        to the target document chunks than the query itself.

        Concept from Paper: Query Transformation -> HyDE (Hypothetical Document Embeddings)
        """
        try:
            hyde_prompt = (
                f"Please write a short, hypothetical passage that answers the following question. "
                f"This passage will be used to retrieve relevant documents.\n\nQuestion: {query}"
            )
            hypothetical_answer = await gemini_service.generate_answer(hyde_prompt)
            enhanced_query = f"{query}\n\n{hypothetical_answer}"
            logger.info(f"Generated hypothetical document for query: '{query}'")
            return enhanced_query # The embedding of this is used for retrieval
        except Exception as e:
            logger.error(f"Error in pre-retrieval (HyDE) module: {e}")
            return query  # Fallback to original query

    async def retrieval_module(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        [Module: Retrieval] Retrieves relevant PARENT chunks using the Small-to-Big strategy.
        1. Embed the (potentially enhanced) query.
        2. Retrieve the top_k CHILD chunks from Pinecone.
        3. Fetch the corresponding PARENT chunks linked to these child chunks.

        Concept from Paper: Small-to-Big Retrieval
        """
        try:
            query_embedding = await gemini_service.get_embedding(query)
            if not query_embedding or len(query_embedding) == 0:
                logger.warning("Failed to get query embedding")
                return []

            # 1. Retrieve the top CHILD chunks
            child_results = await pinecone_service.query_vectors(query_embedding, top_k)
            
            if not child_results:
                logger.warning("No child chunks retrieved from vector search")
                return []
            
            # 2. Get the unique IDs of the parent chunks
            parent_ids = []
            for res in child_results:
                metadata = res.get('metadata', {})
                if 'parent_id' in metadata:
                    parent_id = metadata['parent_id']
                    if parent_id not in parent_ids:
                        parent_ids.append(parent_id)
            
            if not parent_ids:
                logger.warning("No parent IDs found in child chunk metadata")
                return []

            # 3. Fetch the full PARENT chunks from the document store
            parent_chunks = await pinecone_service.fetch_parent_chunks(parent_ids)
            
            if not parent_chunks:
                logger.warning("No parent chunks found in document store")
                return []
            
            logger.info(f"Retrieved {len(parent_chunks)} parent chunks for query")
            return list(parent_chunks.values())
            
        except Exception as e:
            logger.error(f"Error in retrieval module: {e}")
            return []

    async def post_retrieval_module(self, chunks: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """
        [Module: Post-Retrieval] Reranks the retrieved parent chunks using a model-based reranker.
        This provides a more accurate relevance score than vector similarity alone, as it
        evaluates the (query, chunk) pair directly.

        Concept from Paper: Rerank -> Model-base rerank
        """
        try:
            if not chunks:
                return []
            
            # Use Gemini as a cross-encoder to rerank documents
            reranked_chunks = await gemini_service.rerank_documents(query=query, documents=chunks)
            
            # Keep the top 5 most relevant chunks after reranking
            final_chunks = reranked_chunks[:5]
            
            logger.info(f"Reranked {len(chunks)} chunks, keeping top {len(final_chunks)}")
            return final_chunks
            
        except Exception as e:
            logger.error(f"Error in post-retrieval (reranking) module: {e}")
            return chunks[:5] # Fallback to original top-k

    async def generation_module(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """
        [Module: Generation] Generates the final answer with a more robust prompt,
        instructing the model to base its answer strictly on the provided context.
        """
        try:
            context_parts = [chunk.get("metadata", {}).get("content", "") for chunk in context_chunks]
            context = "\n\n---\n\n".join(context_parts)
            
            prompt = f"""
            You are a helpful assistant. Your task is to answer the user's question based *only* on the provided context.
            Do not use any external knowledge. If the answer is not contained within the text below, state "The answer is not available in the provided context."

            Provided Context:
            {context}

            Question: {query}

            Answer:
            """
            
            answer = await gemini_service.generate_answer(prompt)
            logger.info(f"Generated answer for query: {query[:50]}...")
            return answer
            
        except Exception as e:
            logger.error(f"Error in generation module: {e}")
            return "I apologize, but I encountered an error while generating the answer."

    def _chunk_document_small_to_big(self, content: str, title: str) -> Tuple[List[Dict], List[Dict]]:
        """
        Private helper for the "Small-to-Big" chunking strategy.
        - Parent Chunks: Larger, overlapping segments for context.
        - Child Chunks: Smaller sentences within each parent chunk for retrieval.
        """
        parent_chunks = []
        child_chunks = []
        
        # Create parent chunks
        start = 0
        while start < len(content):
            end = start + self.parent_chunk_size
            parent_content = content[start:end].strip()
            if parent_content:
                parent_id = f"parent_{uuid.uuid4().hex}"
                parent_chunks.append({
                    "id": parent_id,
                    "metadata": {"content": parent_content, "title": title}
                })
                
                # Create child chunks from this parent chunk
                # Using sentence splitting for smaller, more semantic units
                sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', parent_content)
                for sentence in sentences:
                    if len(sentence.strip()) > 20: # Filter out very short sentences
                        child_chunks.append({
                            "id": f"child_{uuid.uuid4().hex}",
                            "content": sentence.strip(),
                            "parent_id": parent_id
                        })

            start += self.parent_chunk_size - self.chunk_overlap
            
        return parent_chunks, child_chunks


# Singleton instance
rag_modules_service = RAGModulesService()
