from typing import List, Dict, Any
import logging
from flashrank import Ranker, RerankRequest
from lib.config import settings

logger = logging.getLogger(__name__)

class RerankService:
    """
    Service for local document reranking using FlashRank.
    Implements the Singleton pattern to maintain the model in memory.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RerankService, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
            
        try:
            logger.info("Initializing FlashRank Service (ms-marco-MiniLM-L-12-v2)...")
            # Uses MiniLM - better accuracy/reliability trade-off than TinyBERT, still very fast
            self.ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir=".cache/flashrank")
            self.initialized = True
            logger.info("FlashRank Service (MiniLM) initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize FlashRank Service: {e}")
            self.ranker = None

    def rerank_documents(self, query: str, documents: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Rerank a list of documents based on their relevance to the query.
        
        Args:
            query: The search query
            documents: List of document dictionaries (must have 'metadata' -> 'content')
            top_n: Number of top documents to return
            
        Returns:
            List of reranked documents with 'score' field added
        """
        if not documents or not self.ranker:
            if not self.ranker:
                logger.warning("Reranker not initialized, returning original order")
            return documents[:top_n]

        try:
            # Prepare data for FlashRank
            # FlashRank expects list of dicts with "id" and "text" (or similar)
            passages = []
            for i, doc in enumerate(documents):
                content = doc.get("metadata", {}).get("content", "")
                # Create a unique ID if not present
                doc_id = doc.get("id", str(i))
                
                passages.append({
                    "id": doc_id,
                    "text": content,
                    "meta": {"original_index": i} # Keep track of original document
                })

            if not passages:
                return []

            rerank_request = RerankRequest(query=query, passages=passages)
            results = self.ranker.rerank(rerank_request)
            
            # Map results back to original documents
            reranked_docs = []
            for res in results:
                # Find original doc
                original_idx = res.get("meta", {}).get("original_index")
                if original_idx is not None and 0 <= original_idx < len(documents):
                    doc = documents[original_idx].copy()
                    # Add normalized score
                    score = res.get('score', 0.0)
                    
                    # Sanity check: FlashRank occasionally returns 0 for very short or oddly formatted text
                    # If 0, fallback to the original retrieval score to ensure we don't drop relevant chunks
                    if score <= 0.0001:
                        # Use retrieval_score (from vector DB) or a small fallback
                        fallback_score = doc.get('retrieval_score', 0.1)
                        logger.warning(f"RERANK: Score was {score} for doc {doc_id}, falling back to {fallback_score}")
                        score = fallback_score
                        
                    doc['score'] = score
                    reranked_docs.append(doc)
            
            if reranked_docs and all(d['score'] == 0.0 for d in reranked_docs):
                 logger.warning("FlashRank returned all zero scores. This might indicate an issue with the model or input.")

            logger.info(f"Reranked {len(documents)} documents locally using FlashRank")
            return reranked_docs[:top_n]
            
        except Exception as e:
            logger.error(f"Error during local reranking: {e}")
            # Fallback to original order
            return documents[:top_n]

# Singleton instance
rerank_service = RerankService()
