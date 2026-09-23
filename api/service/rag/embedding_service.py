from typing import List
from fastembed import TextEmbedding
from lib.paths import get_model_cache_dir
import logging
import asyncio

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        """
        Lazy-loads FastEmbed (BAAI/bge-small-en-v1.5) on first use.
        Produces 384-dimensional vectors.
        """
        self.model = None
        self.output_dim = 384
        self._init_attempted = False

    def _ensure_model(self) -> bool:
        if self.model is not None:
            return True
        if self._init_attempted and self.model is None:
            return False

        self._init_attempted = True
        try:
            cache_dir = get_model_cache_dir("fastembed")
            logger.info(
                "Initializing FastEmbed Service (BAAI/bge-small-en-v1.5) "
                f"cache={cache_dir}..."
            )
            self.model = TextEmbedding(
                model_name="BAAI/bge-small-en-v1.5",
                cache_dir=cache_dir,
            )
            logger.info("FastEmbed Service initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize FastEmbed Service: {e}")
            self.model = None
            return False

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates a 384-dimensional vector embedding for the given text using local FastEmbed model.
        Running in a thread executor to ensure async compatibility.
        """
        if not text or not isinstance(text, str):
            logger.warning("get_embedding called with empty or invalid text.")
            return []

        if not self._ensure_model():
            logger.error("Embedding model not initialized.")
            return []

        try:
            loop = asyncio.get_running_loop()
            embeddings = await loop.run_in_executor(
                None,
                lambda: list(self.model.embed([text])),
            )
            return embeddings[0].tolist() if hasattr(embeddings[0], "tolist") else list(embeddings[0])
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return []

    async def get_embeddings_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate 384-dimensional embeddings for multiple texts using local FastEmbed.
        """
        if not texts:
            return []

        if not self._ensure_model():
            logger.error("Embedding model not initialized.")
            return []

        logger.info(f"Processing {len(texts)} texts with FastEmbed")

        try:
            loop = asyncio.get_running_loop()

            def _process_batch():
                return list(self.model.embed(texts, batch_size=batch_size))

            embeddings = await loop.run_in_executor(None, _process_batch)
            result = [e.tolist() if hasattr(e, "tolist") else list(e) for e in embeddings]

            logger.info(f"Successfully generated {len(result)} embeddings locally")
            return result

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [[] for _ in texts]


# Singleton instance
embedding_service = EmbeddingService()
