from typing import List, Optional
from lib.config import settings
import logging
import asyncio
import google.genai as genai
from google.genai import types

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        """
        Memory-optimized Embedding Service.
        Does NOT load ONNX models into RAM on startup.
        Uses Google Gemini text-embedding-004 (384-dim) as primary provider (0 MB RAM),
        with lazy-loaded FastEmbed as fallback when Google API key is missing.
        """
        self._fastembed_model = None
        self.output_dim = getattr(settings, 'embedding_dim', 384) or 384

    def _get_gemini_client(self, api_key: str = None) -> Optional[genai.Client]:
        key = api_key or settings.google_api_key
        if not key:
            return None
        try:
            return genai.Client(api_key=key)
        except Exception as e:
            logger.error(f"Failed to create Gemini client for embedding: {e}")
            return None

    def _get_fastembed_model(self):
        """Lazy load FastEmbed model on-demand to save memory at startup."""
        if self._fastembed_model is None:
            try:
                from fastembed import TextEmbedding
                logger.info("Lazy-loading FastEmbed model (BAAI/bge-small-en-v1.5)...")
                self._fastembed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
                logger.info("FastEmbed model lazy-loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load FastEmbed model: {e}")
                self._fastembed_model = None
        return self._fastembed_model

    async def get_embedding(self, text: str, api_key: str = None) -> List[float]:
        """
        Generates a 384-dimensional vector embedding for the given text.
        Primary: Gemini text-embedding-004 (fast, 0 MB RAM).
        Fallback: FastEmbed local model (lazy loaded).
        """
        if not text or not isinstance(text, str):
            logger.warning("get_embedding called with empty or invalid text.")
            return []

        # 1. Try Gemini Cloud Embeddings first (0 MB RAM footprint)
        client = self._get_gemini_client(api_key)
        if client:
            try:
                res = await client.aio.models.embed_content(
                    model="text-embedding-004",
                    contents=text,
                    config=types.EmbedContentConfig(output_dimensionality=self.output_dim)
                )
                if res and res.embeddings and len(res.embeddings) > 0:
                    vec = res.embeddings[0].values
                    return list(vec)
            except Exception as e:
                logger.warning(f"Gemini cloud embedding failed, falling back to local model: {e}")

        # 2. Fallback to local FastEmbed (lazy loaded)
        try:
            model = self._get_fastembed_model()
            if not model:
                logger.error("No embedding service available (Gemini API key missing and FastEmbed failed).")
                return []
            
            loop = asyncio.get_running_loop()
            embeddings = await loop.run_in_executor(
                None, 
                lambda: list(model.embed([text]))
            )
            return embeddings[0].tolist() if hasattr(embeddings[0], 'tolist') else list(embeddings[0])
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return []

    async def get_embeddings_batch(self, texts: List[str], batch_size: int = 32, api_key: str = None) -> List[List[float]]:
        """
        Generate 384-dimensional embeddings for multiple texts.
        Primary: Gemini text-embedding-004 (batch mode).
        Fallback: FastEmbed batch processing.
        """
        if not texts:
            return []

        # 1. Try Gemini Cloud Embeddings batch
        client = self._get_gemini_client(api_key)
        if client:
            try:
                logger.info(f"Generating {len(texts)} embeddings via Gemini Cloud API (text-embedding-004)...")
                # Gemini embed_content supports batching by passing list of contents
                # Process in sub-batches if large
                results = []
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    res = await client.aio.models.embed_content(
                        model="text-embedding-004",
                        contents=batch,
                        config=types.EmbedContentConfig(output_dimensionality=self.output_dim)
                    )
                    if res and res.embeddings:
                        for emb in res.embeddings:
                            results.append(list(emb.values))
                
                if len(results) == len(texts):
                    logger.info(f"Successfully generated {len(results)} embeddings via Gemini Cloud API")
                    return results
            except Exception as e:
                logger.warning(f"Gemini cloud batch embedding failed, falling back to local model: {e}")

        # 2. Fallback to local FastEmbed batch
        try:
            model = self._get_fastembed_model()
            if not model:
                logger.error("No embedding service available for batch generation.")
                return [[] for _ in texts]

            logger.info(f"Processing {len(texts)} texts with FastEmbed (lazy-loaded)")
            loop = asyncio.get_running_loop()
            
            def _process_batch():
                return list(model.embed(texts, batch_size=batch_size))
            
            embeddings = await loop.run_in_executor(None, _process_batch)
            result = [e.tolist() if hasattr(e, 'tolist') else list(e) for e in embeddings]
            logger.info(f"Successfully generated {len(result)} embeddings locally")
            return result

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [[] for _ in texts]

# Singleton instance
embedding_service = EmbeddingService()

