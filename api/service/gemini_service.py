from typing import List, Dict, Any
from lib.config import settings
import logging
import asyncio
import time
from datetime import datetime, timedelta
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

logger = logging.getLogger(__name__)

# Constants for model names
GENERATIVE_MODEL_NAME = "gemini-2.0-flash"  # A fast and capable model for generation/reranking
EMBEDDING_MODEL_NAME = "models/embedding-001" # The standard text embedding model

class GeminiService:
    def __init__(self):
        self.generative_model = None
        # Safety settings to configure what content is blocked.
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        
        # Rate limiting
        self.last_embedding_call = 0
        self.embedding_call_count = 0
        self.daily_call_count = 0
        self.last_reset_date = datetime.now().date()
        self.quota_exceeded = False
        self.quota_reset_time = None
        
    async def initialize_gemini(self):
        """Initializes the Google Generative AI client."""
        try:
            genai.configure(api_key=settings.google_api_key)
            self.generative_model = genai.GenerativeModel(
                model_name=GENERATIVE_MODEL_NAME,
                safety_settings=self.safety_settings
            )
            logger.info("Google Gemini service initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            return False
    
    async def get_embedding(self, text: str, task_type="RETRIEVAL_DOCUMENT") -> List[float]:
        """
        Generates a vector embedding for the given text with rate limiting and quota handling.
        task_type can be: "RETRIEVAL_QUERY", "RETRIEVAL_DOCUMENT", "SEMANTIC_SIMILARITY", etc.
        """
        if not text or not isinstance(text, str):
            logger.warning("get_embedding called with empty or invalid text.")
            return []
        
        # Check if quota is exceeded and if we should try again
        if self.quota_exceeded:
            if self.quota_reset_time and datetime.now() < self.quota_reset_time:
                logger.warning(f"Quota exceeded. Skipping embedding until {self.quota_reset_time}")
                return self._get_fallback_embedding(text)
            else:
                # Reset quota flag after 24 hours
                self.quota_exceeded = False
                self.quota_reset_time = None
        
        # Reset daily counter if it's a new day
        today = datetime.now().date()
        if today != self.last_reset_date:
            self.daily_call_count = 0
            self.embedding_call_count = 0
            self.last_reset_date = today
            
        # Rate limiting: Max 15 calls per minute (conservative)
        current_time = time.time()
        if current_time - self.last_embedding_call < 4:  # 4 seconds between calls
            logger.info("Rate limiting: waiting before next embedding call")
            await asyncio.sleep(4 - (current_time - self.last_embedding_call))
            
        try:
            # The genai library's async support is still developing,
            # so we run the synchronous SDK call in a thread pool to avoid blocking.
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,  # Use the default thread pool executor
                lambda: genai.embed_content(
                    model=EMBEDDING_MODEL_NAME,
                    content=text,
                    task_type=task_type
                )
            )
            
            self.last_embedding_call = time.time()
            self.embedding_call_count += 1
            self.daily_call_count += 1
            
            return result.get('embedding', [])
            
        except Exception as e:
            error_str = str(e)
            if "quota" in error_str.lower() or "429" in error_str:
                logger.error(f"Quota exceeded for embeddings. Setting quota flag.")
                self.quota_exceeded = True
                self.quota_reset_time = datetime.now() + timedelta(hours=24)
                return self._get_fallback_embedding(text)
            else:
                logger.error(f"Failed to get embedding for text: '{text[:100]}...': {e}")
                return []
    
    def _get_fallback_embedding(self, text: str) -> List[float]:
        """
        Generate a simple fallback embedding when API is unavailable.
        This is a basic hash-based approach for development purposes.
        """
        import hashlib
        
        try:
            # Simple hash-based embedding (768 dimensions to match Google's model)
            hash_obj = hashlib.sha256(text.encode())
            hash_bytes = hash_obj.digest()
            
            # Convert to 768-dimensional vector
            embedding = []
            for i in range(768):
                byte_index = i % len(hash_bytes)
                # Normalize to [-1, 1] range
                normalized_value = (hash_bytes[byte_index] / 255.0) * 2 - 1
                embedding.append(normalized_value)
                
            logger.info(f"Using fallback embedding for text: '{text[:50]}...'")
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate fallback embedding: {e}")
            # Return a basic zero vector as last resort
            return [0.0] * 768
    
    async def generate_answer(self, prompt: str) -> str:
        """Generates a text response based on a prompt using an async call."""
        if not self.generative_model:
            logger.error("Gemini model not initialized.")
            return "Sorry, the generation service is not available."
            
        try:
            response = await self.generative_model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Failed to generate answer: {e}")
            return "Sorry, I couldn't generate an answer at this time."

    async def rerank_documents(self, query: str, documents: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Reranks a list of documents based on their relevance to a query using the LLM.
        This simulates a cross-encoder by asking the model to score and sort the documents.
        """
        if not documents:
            return []
        
        # Create a numbered list of document contents
        doc_texts = [
            doc.get("metadata", {}).get("content", "") for doc in documents
        ]
        
        # Create the prompt for the reranking task
        prompt = f"""
        You are an expert at evaluating the relevance of documents to a user's query.
        Please reorder the following documents based on how well they answer the question.
        Do not try to answer the question yourself, only provide the new order of the documents.
        Your output should be a comma-separated list of the original document numbers, from most relevant to least relevant.

        Query: "{query}"

        Documents:
        """
        for i, doc_text in enumerate(doc_texts, 1):
            prompt += f"\n[{i}] {doc_text}\n"

        prompt += "\nNew order:"

        try:
            # Generate the new order
            response_text = await self.generate_answer(prompt)
            
            # Parse the response to get the new order of indices
            # e.g., "3, 1, 4, 2, 5" -> [2, 0, 3, 1, 4] (after converting to 0-based index)
            ordered_indices = [int(i.strip()) - 1 for i in response_text.split(',') if i.strip().isdigit()]
            
            # Create the reranked list of documents
            reranked_docs = [documents[i] for i in ordered_indices if 0 <= i < len(documents)]
            
            # Append any documents the model might have missed, in their original order
            for i, doc in enumerate(documents):
                if i not in ordered_indices:
                    reranked_docs.append(doc)
            
            return reranked_docs[:top_n]

        except Exception as e:
            logger.error(f"Failed to rerank documents: {e}. Returning original order.")
            return documents[:top_n] # Fallback to original order

# Singleton instance
gemini_service = GeminiService()