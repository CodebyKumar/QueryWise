from typing import List, Dict, Any
from lib.config import settings
import logging
import asyncio
import asyncio
from datetime import datetime

import google.genai as genai
from google.genai import types
from google.genai.types import HarmCategory, HarmBlockThreshold

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
        self.client = None
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


    async def generate_description(self, content: str, title: str = None) -> str:
        """
        Generates a short description or summary for a document using Gemini.
        """
        if not content or not isinstance(content, str):
            return "No description available."
        prompt = (
            f"Summarize the following document in 1-2 sentences for a user-facing description. "
            f"Be concise and clear.\n\n"
            f"Title: {title or ''}\n"
            f"Content: {content[:2000]}"
        )
        try:
            desc = await self.generate_answer(prompt)
            return desc.strip()
        except Exception as e:
            logger.error(f"Failed to generate description: {e}")
            return "No description available."
            
    async def generate_chat_title(self, query: str) -> str:
        """
        Generates a simple, short title for a chat session based on the first query.
        Uses simple keyword extraction for faster, more predictable titles.
        """
        if not query or not isinstance(query, str):
            return "New Chat"
        
        # Simple title generation without AI to make it faster and more predictable
        query = query.strip().lower()
        
        # Common question patterns and their simple titles
        if any(word in query for word in ['what', 'how', 'why', 'when', 'where', 'which']):
            # Extract key topic words
            words = query.split()
            # Filter out common question words and short words
            key_words = [w for w in words if len(w) > 3 and w not in ['what', 'how', 'why', 'when', 'where', 'which', 'does', 'will', 'can', 'should', 'would', 'could', 'the', 'and', 'for', 'with', 'about']]
            
            if key_words:
                # Take first 2-3 key words and capitalize
                title_words = key_words[:2]
                title = ' '.join(word.capitalize() for word in title_words)
                return title if len(title) <= 20 else title[:17] + "..."
        
        # For other queries, use first few words
        words = query.split()[:3]
        title = ' '.join(word.capitalize() for word in words)
        
        # Fallback to simple patterns
        if len(title) > 25:
            title = title[:22] + "..."
        
        return title if title else "New Chat"
        
    async def initialize_gemini(self):
        """Initializes the Google Gen AI client."""
        try:
            logger.info("Initializing Google Gemini Service...")
            # New SDK initialization
            self.client = genai.Client(api_key=settings.google_api_key)
            logger.info("Google Gemini service initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            self.client = None
            return False

    async def generate_answer(self, prompt: str) -> str:
        """Generates a text response based on a prompt using an async call."""
        if not self.client:
            logger.error("Gemini client not initialized.")
            return "Sorry, the generation service is not available."
            
        try:
            # New SDK async generation
            response = await self.client.aio.models.generate_content(
                model=GENERATIVE_MODEL_NAME,
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