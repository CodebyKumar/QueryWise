from typing import List, Dict, Any
from lib.config import settings
import logging
import asyncio
import asyncio
from datetime import datetime

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Constants for model names
GENERATIVE_MODEL_NAME = "gemini-2.5-flash"  # A fast and capable model for generation/reranking

class GeminiService:
    def __init__(self):
        self.client = None
        # Safety settings to configure what content is blocked.
        self.safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
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
        """Initializes the Google Generative AI client."""
        try:
            self.client = genai.Client(api_key=settings.google_api_key)
            logger.info("Google Gemini service initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            return False
    
    # Embeddings are now handled by EmbeddingService (Local FastEmbed)

    
    async def generate_answer(self, prompt: str) -> str:
        """Generates a text response based on a prompt using an async call with retry logic."""
        if not self.client:
            logger.error("Gemini model not initialized.")
            return "Sorry, the generation service is not available."
            
        max_retries = 3
        base_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = await self.client.aio.models.generate_content(
                    model=GENERATIVE_MODEL_NAME,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        safety_settings=self.safety_settings
                    )
                )
                return response.text
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    if attempt < max_retries - 1:
                        wait_time = base_delay * (2 ** attempt)
                        logger.warning(f"Rate limit hit in generate_answer. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                        await asyncio.sleep(wait_time)
                        continue
                elif "503" in error_msg or "Service Unavailable" in error_msg:
                     if attempt < max_retries - 1:
                        wait_time = base_delay * (2 ** attempt)
                        logger.warning(f"Service unavailable in generate_answer. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                        await asyncio.sleep(wait_time)
                        continue
                        
                logger.error(f"Failed to generate answer (Attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    return "Sorry, I couldn't generate an answer at this time due to high traffic or connection issues."

    async def rerank_documents(self, query: str, documents: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Enhanced document reranking with relevance scoring.
        Uses the LLM to assess semantic relevance and provide numerical scores.
        Returns documents sorted by relevance with attached scores.
        """
        if not documents:
            return []
        
        # Limit to reasonable number for reranking (LLM context limits)
        docs_to_rank = documents[:20]  # Only rerank top 20 to avoid context overload
        
        # Create a numbered list of document contents
        doc_texts = []
        for i, doc in enumerate(docs_to_rank, 1):
            content = doc.get("metadata", {}).get("content", "")
            # Truncate very long documents to fit in context
            if len(content) > 500:
                content = content[:500] + "..."
            doc_texts.append(f"[{i}] {content}")
        
        # Enhanced prompt for scoring and ranking
        prompt = f"""You are an expert at evaluating document relevance. Rate each document's relevance to the query on a scale of 0-100.

Query: "{query}"

Documents:
{chr(10).join(doc_texts)}

For each document, provide:
1. Document number
2. Relevance score (0-100)
3. Brief reason (one line)

Format: [doc_number]: [score] - [reason]

Example:
[3]: 95 - Directly answers the question with specific details
[1]: 70 - Provides related context but not the main answer
[2]: 30 - Only tangentially related

Your assessment:"""

        try:
            response_text = await self.generate_answer(prompt)
            
            # Parse the response to extract scores
            scored_docs = []
            for line in response_text.strip().split('\n'):
                line = line.strip()
                if not line or not line.startswith('['):
                    continue
                
                try:
                    # Parse format: [3]: 95 - Reason
                    parts = line.split(']:', 1)
                    if len(parts) != 2:
                        continue
                    
                    doc_num = int(parts[0].strip('[').strip())
                    score_part = parts[1].strip().split('-', 1)[0].strip()
                    score = int(score_part)
                    
                    # Validate
                    if 1 <= doc_num <= len(docs_to_rank) and 0 <= score <= 100:
                        scored_docs.append((doc_num - 1, score))  # Convert to 0-based index
                except (ValueError, IndexError) as e:
                    logger.debug(f"Skipping unparseable line: {line}")
                    continue
            
            # If parsing succeeded, sort by scores
            if scored_docs:
                # Sort by score (descending)
                scored_docs.sort(key=lambda x: x[1], reverse=True)
                
                # Build reranked list with scores
                reranked = []
                for doc_idx, score in scored_docs[:top_n]:
                    if 0 <= doc_idx < len(docs_to_rank):
                        doc = dict(docs_to_rank[doc_idx])
                        # Normalize score to 0-1 range
                        doc['score'] = score / 100.0
                        reranked.append(doc)
                
                # Add any remaining docs not scored (shouldn't happen, but safety)
                scored_indices = {idx for idx, _ in scored_docs}
                for i, doc in enumerate(docs_to_rank):
                    if i not in scored_indices:
                        doc_copy = dict(doc)
                        doc_copy['score'] = 0.3  # Low default score
                        reranked.append(doc_copy)
                
                logger.info(f"Successfully reranked {len(scored_docs)} documents with scores")
                return reranked[:top_n]
            else:
                # Fallback: if parsing failed, try simple ordering
                logger.warning("Score parsing failed, attempting simple ordering fallback")
                return await self._fallback_rerank(query, docs_to_rank, response_text, top_n)

        except Exception as e:
            logger.error(f"Failed to rerank documents: {e}. Returning original order with default scores.")
            # Return original order with neutral scores
            return [dict(doc, score=0.5) for doc in docs_to_rank[:top_n]]
    
    async def _fallback_rerank(self, query: str, documents: List[Dict[str, Any]], llm_response: str, top_n: int) -> List[Dict[str, Any]]:
        """
        Fallback reranking when score parsing fails.
        Tries to extract document ordering from LLM response.
        """
        try:
            # Try to find numbers in the response
            import re
            numbers = re.findall(r'\[(\d+)\]', llm_response)
            if numbers:
                ordered_indices = [int(n) - 1 for n in numbers if n.isdigit()]
                
                reranked = []
                for idx in ordered_indices:
                    if 0 <= idx < len(documents):
                        doc = dict(documents[idx])
                        # Assign scores based on position (first = highest)
                        position_score = 1.0 - (len(reranked) * 0.1)
                        doc['score'] = max(0.3, position_score)
                        reranked.append(doc)
                
                # Add missing docs
                seen_indices = set(ordered_indices)
                for i, doc in enumerate(documents):
                    if i not in seen_indices:
                        doc_copy = dict(doc)
                        doc_copy['score'] = 0.3
                        reranked.append(doc_copy)
                
                logger.info(f"Fallback reranking extracted {len(ordered_indices)} ordered documents")
                return reranked[:top_n]
        except Exception as e:
            logger.error(f"Fallback reranking also failed: {e}")
        
        # Ultimate fallback: original order with decreasing scores
        return [dict(doc, score=max(0.3, 0.9 - i*0.1)) for i, doc in enumerate(documents[:top_n])]

# Singleton instance
gemini_service = GeminiService()