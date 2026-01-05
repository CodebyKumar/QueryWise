from typing import List, Dict, Any
from lib.config import settings
import logging
import asyncio
import asyncio
from datetime import datetime

import google.genai as genai
from google.genai import types
from google.genai.types import HarmCategory, HarmBlockThreshold
from service.monitoring.usage_tracker import usage_tracker

logger = logging.getLogger(__name__)

# Constants for model names
GENERATIVE_MODEL_NAME = "gemini-2.5-flash"  # A fast and capable model for generation/reranking

# Suppress noisy logs from Google GenAI SDK
logging.getLogger("google.genai").setLevel(logging.WARNING) 
logging.getLogger("google.generativeai").setLevel(logging.WARNING)
logging.getLogger("common.rpc").setLevel(logging.WARNING)
logging.getLogger("google.api_core").setLevel(logging.WARNING)
# Specific one reported by user
logging.getLogger("google_genai").setLevel(logging.WARNING)
logging.getLogger("google_genai.models").setLevel(logging.WARNING)

class GeminiService:
    def __init__(self):
        # Safety settings to configure what content is blocked.
        self.safety_settings = [
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT",
                threshold="BLOCK_NONE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH",
                threshold="BLOCK_NONE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold="BLOCK_NONE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold="BLOCK_NONE"
            ),
        ]

    def _get_client(self, api_key: str = None):
        """
        Get a Gemini client instance. 
        Prioritizes the provided api_key, falls back to settings.google_api_key.
        """
        key = api_key or settings.google_api_key
        if not key:
            logger.warning("No Google API key provided or found in settings.")
            return None
        return genai.Client(api_key=key)

    async def generate_description(self, content: str, title: str = None, api_key: str = None) -> str:
        """
        Generates a short description or summary for a document using Gemini.
        """
        if not content or not isinstance(content, str):
            return "No description available."
            
        client = self._get_client(api_key)
        if not client:
             return "No description available (API Key missing)."

        prompt = (
            f"Summarize the following document in 1-2 sentences for a user-facing description. "
            f"Be concise and clear.\n\n"
            f"Title: {title or ''}\n"
            f"Content: {content[:2000]}"
        )
        try:
            # New SDK async generation
            usage_tracker.increment()
            response = await client.aio.models.generate_content(
                model=GENERATIVE_MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    safety_settings=self.safety_settings
                )
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to generate description: {e}")
            return "No description available."
            
    async def generate_chat_title(self, query: str, api_key: str = None) -> str:
        """
        Generates a simple, short title for a chat session based on the first query.
        """
        if not query or not isinstance(query, str):
            return "New Chat"
            
        client = self._get_client(api_key)
        if not client:
            return "New Chat"
        
        # Use Gemini to generate a creative and concise title
        prompt = (
            f"Generate a very short, concise title (max 4-5 words) for a chat session that starts with this user query: "
            f"'{query}'\n\n"
            f"Title:"
        )
        try:
            usage_tracker.increment()
            response = await client.aio.models.generate_content(
                model=GENERATIVE_MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    safety_settings=self.safety_settings
                )
            )
            title = response.text
            # Clean up the title (remove quotes, extra whitespace)
            title = title.strip().strip('"').strip("'")
            return title if len(title) <= 50 else title[:47] + "..."
        except Exception as e:
            logger.error(f"Failed to generate chat title: {e}")
            return "New Chat"
        
    async def initialize_gemini(self):
        """Deprecated: No longer needed with per-request clients."""
        logger.info("Gemini Service initialized (stateless mode).")
        return True

    async def generate_answer(self, prompt: str, api_key: str = None, model: str = None) -> str:
        """Generates a text response based on a prompt using an async call."""
        client = self._get_client(api_key)
        if not client:
            logger.error("Gemini client could not be initialized (Missing Key).")
            return "Sorry, the generation service is not available (Missing API Key)."
            
        try:
            # New SDK async generation
            usage_tracker.increment()
            response = await client.aio.models.generate_content(
                model=model or GENERATIVE_MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    safety_settings=self.safety_settings
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Failed to generate answer: {e}")
            return "Sorry, I couldn't generate an answer at this time."

# Singleton instance
gemini_service = GeminiService()