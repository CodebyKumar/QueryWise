from typing import List, Dict, Any
import logging
from flashrank import Ranker, RerankRequest
from lib.paths import get_model_cache_dir

logger = logging.getLogger(__name__)


class RerankService:
    """
    Service for local document reranking using FlashRank.
    Implements the Singleton pattern and lazy-loads the model on first use.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RerankService, cls).__new__(cls)
            cls._instance.initialized = False
            cls._instance.ranker = None
        return cls._instance

    def __init__(self):
        return

    def _ensure_ranker(self) -> bool:
        if self.initialized and self.ranker is not None:
            return True
        if self.initialized and self.ranker is None:
            return False

        try:
            cache_dir = get_model_cache_dir("flashrank")
            logger.info(
                "Initializing FlashRank Service (ms-marco-MiniLM-L-12-v2) "
                f"cache={cache_dir}..."
            )
            self.ranker = Ranker(
                model_name="ms-marco-MiniLM-L-12-v2",
                cache_dir=cache_dir,
            )
            self.initialized = True
            logger.info("FlashRank Service (MiniLM) initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize FlashRank Service: {e}")
            self.ranker = None
            self.initialized = True
            return False

    def rerank_documents(self, query: str, documents: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Rerank a list of documents based on their relevance to the query.
        """
        if not documents:
            return []

        if not self._ensure_ranker():
            logger.warning("Reranker not initialized, returning original order")
            return documents[:top_n]

        try:
            passages = []
            for i, doc in enumerate(documents):
                content = doc.get("metadata", {}).get("content", "")
                doc_id = doc.get("id", str(i))

                passages.append({
                    "id": doc_id,
                    "text": content,
                    "meta": {"original_index": i},
                })

            if not passages:
                return []

            rerank_request = RerankRequest(query=query, passages=passages)
            results = self.ranker.rerank(rerank_request)

            reranked_docs = []
            for res in results:
                original_idx = res.get("meta", {}).get("original_index")
                if original_idx is not None and 0 <= original_idx < len(documents):
                    doc = documents[original_idx].copy()
                    score = res.get("score", 0.0)

                    if score <= 0.0001:
                        fallback_score = doc.get("retrieval_score", 0.1)
                        logger.warning(
                            f"RERANK: Score was {score} for doc {doc.get('id')}, "
                            f"falling back to {fallback_score}"
                        )
                        score = fallback_score

                    doc["score"] = score
                    reranked_docs.append(doc)

            if reranked_docs and all(d["score"] == 0.0 for d in reranked_docs):
                logger.warning(
                    "FlashRank returned all zero scores. "
                    "This might indicate an issue with the model or input."
                )

            logger.info(f"Reranked {len(documents)} documents locally using FlashRank")
            return reranked_docs[:top_n]

        except Exception as e:
            logger.error(f"Error during local reranking: {e}")
            return documents[:top_n]


# Singleton instance
rerank_service = RerankService()
