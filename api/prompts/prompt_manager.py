import json
import os
import logging

logger = logging.getLogger(__name__)

class PromptManager:
    """Manages externalized prompt templates from JSON configuration."""
    def __init__(self, prompt_file_path: str = None):
        if prompt_file_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            prompt_file_path = os.path.join(base_dir, "prompts", "rag_prompts.json")
        
        self.prompt_file_path = prompt_file_path
        self.prompts = self._load_prompts()

    def _load_prompts(self) -> dict:
        try:
            if os.path.exists(self.prompt_file_path):
                with open(self.prompt_file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                logger.warning(f"Prompt file not found at {self.prompt_file_path}. Using fallback prompts.")
                return self._get_fallback_prompts()
        except Exception as e:
            logger.error(f"Failed to load prompts from {self.prompt_file_path}: {e}")
            return self._get_fallback_prompts()

    def _get_fallback_prompts(self) -> dict:
        return {
            "generation_prompt_template": "You are QueryWise. Answer the question based on the context below.\n\nContext:\n{context}\n\nQuestion: {query}\nAnswer:",
            "pre_retrieval_prompt": "Rephrase query for search: {query}",
            "chat_title_prompt": "Title for query: '{query}'",
            "summary_prompt": "Summarize: {content}"
        }

    def get_prompt(self, key: str, **kwargs) -> str:
        template = self.prompts.get(key, "")
        if not template:
            template = self._get_fallback_prompts().get(key, "")
        return template.format(**kwargs)

prompt_manager = PromptManager()
