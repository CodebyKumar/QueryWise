from typing import List, Dict, Any, Optional
from lib.config import settings
import logging
import asyncio
from datetime import datetime

from groq import AsyncGroq
from service.monitoring.usage_tracker import usage_tracker

logger = logging.getLogger(__name__)

# Default model name
DEFAULT_MODEL_NAME = "llama-3.3-70b-versatile"

# Context limits mapping for Groq Models
MODEL_CONTEXT_LIMITS: Dict[str, int] = {
    # Production Models
    "llama-3.1-8b-instant": 131072,
    "llama-3.3-70b-versatile": 131072,
    "openai/gpt-oss-120b": 131072,
    "openai/gpt-oss-20b": 131072,
    # Preview Models
    "canopylabs/orpheus-arabic-saudi": 4000,
    "canopylabs/orpheus-v1-english": 4000,
    "meta-llama/llama-prompt-guard-2-22m": 512,
    "meta-llama/llama-prompt-guard-2-86m": 512,
    "minimaxai/minimax-m2.7": 196608,
    "openai/gpt-oss-safeguard-20b": 131072,
    "qwen/qwen3.8-27b": 131072,
}

class GroqService:
    def __init__(self):
        self._client: Optional[AsyncGroq] = None

    def _get_client(self, api_key: str = None) -> Optional[AsyncGroq]:
        """
        Get a Groq client instance. 
        Prioritizes the provided api_key, falls back to settings.groq_api_key.
        """
        key = api_key or settings.groq_api_key
        if not key:
            logger.warning("No Groq API key provided or found in settings.")
            return None
        return AsyncGroq(api_key=key)

    def truncate_prompt_to_context_limit(self, prompt: str, model_name: str = DEFAULT_MODEL_NAME, max_output_tokens: int = 4000) -> str:
        """
        Truncates prompt to fit within the model's context window limit.
        Estimates ~4 characters per token.
        """
        if not prompt:
            return ""
            
        context_limit = MODEL_CONTEXT_LIMITS.get(model_name, 131072)
        available_input_tokens = max(100, context_limit - max_output_tokens)
        max_prompt_chars = available_input_tokens * 4
        
        if len(prompt) <= max_prompt_chars:
            return prompt
            
        logger.warning(f"Prompt length ({len(prompt)} chars) exceeds model limit for '{model_name}'. Truncating to ~{max_prompt_chars} chars.")
        # Keep instruction header and trim context middle
        head_len = int(max_prompt_chars * 0.4)
        tail_len = int(max_prompt_chars * 0.6)
        return prompt[:head_len] + "\n\n[... Context Truncated for Token Limits ...]\n\n" + prompt[-tail_len:]

    async def generate_description(self, content: str, title: str = None, api_key: str = None, model: str = None) -> str:
        """
        Generates a short description or summary for a document using Groq.
        """
        if not content or not isinstance(content, str):
            return "No description available."
            
        client = self._get_client(api_key)
        if not client:
             return "No description available (API Key missing)."

        selected_model = model or DEFAULT_MODEL_NAME
        prompt = (
            f"Summarize the following document in 1-2 sentences for a user-facing description. "
            f"Be concise and clear.\n\n"
            f"Title: {title or ''}\n"
            f"Content: {content[:2000]}"
        )
        try:
            usage_tracker.increment()
            response = await client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes documents concisely."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Failed to generate description: {e}")
            return "No description available."
            
    async def generate_chat_title(self, query: str, api_key: str = None, model: str = None) -> str:
        """
        Generates a simple, short title for a chat session based on the first query.
        """
        if not query or not isinstance(query, str):
            return "New Chat"
            
        client = self._get_client(api_key)
        if not client:
            return "New Chat"
        
        selected_model = model or DEFAULT_MODEL_NAME
        prompt = (
            f"Generate a very short, concise title (max 4-5 words) for a chat session that starts with this user query: "
            f"'{query}'\n\n"
            f"Title:"
        )
        try:
            usage_tracker.increment()
            response = await client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates short titles."},
                    {"role": "user", "content": prompt}
                ]
            )
            title = response.choices[0].message.content.strip()
            title = title.strip().strip('"').strip("'")
            return title if len(title) <= 50 else title[:47] + "..."
        except Exception as e:
            logger.error(f"Failed to generate chat title: {e}")
            return "New Chat"
        
    async def generate_answer(self, prompt: str, api_key: str = None, model: str = None) -> Optional[str]:
        """Generates a text response based on a prompt using an async call with fallback models."""
        client = self._get_client(api_key)
        if not client:
            logger.error("Groq client could not be initialized (Missing Key).")
            return None
            
        models_to_try = []
        if model and "gemini" not in model.lower():
            models_to_try.append(model)
        if DEFAULT_MODEL_NAME not in models_to_try:
            models_to_try.append(DEFAULT_MODEL_NAME)
        if "llama-3.1-8b-instant" not in models_to_try:
            models_to_try.append("llama-3.1-8b-instant")

        for selected_model in models_to_try:
            try:
                truncated_prompt = self.truncate_prompt_to_context_limit(prompt, model_name=selected_model)
                usage_tracker.increment()
                response = await client.chat.completions.create(
                    model=selected_model,
                    messages=[
                        {"role": "user", "content": truncated_prompt}
                    ]
                )
                if response and response.choices and response.choices[0].message and response.choices[0].message.content:
                    return response.choices[0].message.content
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"Groq model '{selected_model}' generation failed: {e}")
                if "invalid_api_key" in err_msg.lower() or "authentication" in err_msg.lower():
                    logger.error("Invalid Groq API key detected. Stopping model fallback loop.")
                    break

        logger.error(f"All Groq models failed for prompt.")
        return None

    async def generate_answer_stream(self, prompt: str, api_key: str = None, model: str = None):
        """Generates a text response stream based on a prompt using an async call with fallback models."""
        client = self._get_client(api_key)
        if not client:
            logger.error("Groq client could not be initialized (Missing Key).")
            return

        models_to_try = []
        if model and "gemini" not in model.lower():
            models_to_try.append(model)
        if DEFAULT_MODEL_NAME not in models_to_try:
            models_to_try.append(DEFAULT_MODEL_NAME)
        if "llama-3.1-8b-instant" not in models_to_try:
            models_to_try.append("llama-3.1-8b-instant")

        for selected_model in models_to_try:
            try:
                truncated_prompt = self.truncate_prompt_to_context_limit(prompt, model_name=selected_model)
                usage_tracker.increment()
                stream = await client.chat.completions.create(
                    model=selected_model,
                    messages=[
                        {"role": "user", "content": truncated_prompt}
                    ],
                    stream=True
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"Groq streaming model '{selected_model}' generation failed: {e}")
                if "invalid_api_key" in err_msg.lower() or "authentication" in err_msg.lower():
                    logger.error("Invalid Groq API key detected in streaming.")
                    break

    async def transcribe_audio(self, file_content: bytes, filename: str = "recording.webm", api_key: str = None, model: str = "whisper-large-v3-turbo") -> str:
        """
        Transcribes audio bytes using Groq Whisper (Whisper Large V3 Turbo or V3).
        High throughput, 400 RPM, low cost ($0.04/hr).
        """
        client = self._get_client(api_key)
        if not client:
            raise Exception("Groq API Key not found for Whisper transcription.")

        selected_model = model or "whisper-large-v3-turbo"
        try:
            logger.info(f"Transcribing audio ({len(file_content)} bytes) via Groq {selected_model}...")
            usage_tracker.increment()
            transcription = await client.audio.transcriptions.create(
                file=(filename, file_content),
                model=selected_model,
                response_format="json"
            )
            text = transcription.text if hasattr(transcription, 'text') else str(transcription)
            logger.info(f"Groq Whisper transcription successful: '{text[:60]}...'")
            return text or ""
        except Exception as e:
            logger.error(f"Groq Whisper transcription failed: {e}")
            raise Exception(f"Groq Whisper transcription failed: {str(e)}")

# Singleton instance
groq_service = GroqService()

