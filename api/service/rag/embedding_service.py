from typing import List
from fastembed import TextEmbedding
from lib.config import settings
import logging
import asyncio
import time

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        """
        Initializes the FastEmbed model (BAAI/bge-small-en-v1.5).
        Produces 384-dimensional vectors.
        """
        try:
            logger.info("Initializing FastEmbed Service (BAAI/bge-small-en-v1.5)...")
            # This will download the model if not present (~something small, <1GB)
            self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
            self.output_dim = 384
            logger.info("FastEmbed Service initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize FastEmbed Service: {e}")
            self.model = None

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates a 384-dimensional vector embedding for the given text using local FastEmbed model.
        Running in a thread executor to ensure async compatibility.
        """
        if not text or not isinstance(text, str):
            logger.warning("get_embedding called with empty or invalid text.")
            return []
        
        if not self.model:
            logger.error("Embedding model not initialized.")
            return []

        try:
            loop = asyncio.get_running_loop()
            # fastembed's embed method returns a generator, so we list() it.
            # We pass a list of ONE text.
            # run_in_executor prevents blocking the event loop with CPU-bound model inference.
            embeddings = await loop.run_in_executor(
                None, 
                lambda: list(self.model.embed([text]))
            )
            return embeddings[0].tolist() if hasattr(embeddings[0], 'tolist') else list(embeddings[0])
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return []

    async def get_embeddings_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate 384-dimensional embeddings for multiple texts using local FastEmbed.
        """
        if not texts:
            return []
            
        if not self.model:
            logger.error("Embedding model not initialized.")
            return []

        logger.info(f"Processing {len(texts)} texts with FastEmbed")
        
        try:
            loop = asyncio.get_running_loop()
            
            # fastembed handles batching internally efficiently, 
            # but we run the whole operation in executor to be safe async-wise.
            def _process_batch():
                # fastembed generator -> list
                return list(self.model.embed(texts, batch_size=batch_size))
            
            embeddings = await loop.run_in_executor(None, _process_batch)
            
            # Convert numpy arrays to lists if necessary
            result = [e.tolist() if hasattr(e, 'tolist') else list(e) for e in embeddings]
            
            logger.info(f"Successfully generated {len(result)} embeddings locally")
            return result

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            # Return empty list matching input length to avoid misalignments upstream? 
            # Or just empty list. The original code returned empty lists for failed items 
            # but that was per-batch. Here let's fail safe.
            return [[] for _ in texts]


# Singleton instance
embedding_service = EmbeddingService()
