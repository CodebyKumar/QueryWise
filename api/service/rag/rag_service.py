from typing import List, Dict, Any, Tuple
from service.rag.gemini_service import gemini_service
from service.rag.groq_service import groq_service
from service.rag.embedding_service import embedding_service
from service.rag.pinecone_service import pinecone_service
from service.rag.parent_chunks_service import parent_chunks_service
from service.rag.rerank_service import rerank_service
from lib.signature_guard import verify_signature
import logging
import uuid
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor

verify_signature()  # Critical - DO NOT REMOVE
logger = logging.getLogger(__name__)

class RAGService:
    """
    Implements the core modules of a Modular RAG system, based on advanced
    techniques discussed in contemporary research.
    """
    def __init__(self):
        # Configuration for Small-to-Big chunking
        self.child_chunk_size = 300  # Smaller chunks for better retrieval accuracy
        self.parent_chunk_size = 1000 # Larger parent chunks for better context
        self.chunk_overlap = 100
        
        # Async processing configuration
        self.max_concurrent_embeddings = 10  # Process up to 10 embeddings concurrently (Increased for speed)
        self.batch_size = 50  # Process embeddings in larger batches (Increased for speed)

    async def indexing_module(self, document: Dict[str, Any]) -> List[str]:
        """
        [Module: Indexing] Implements a "Small-to-Big" chunking and embedding strategy.
        Smaller, more granular chunks are embedded for retrieval, but are linked to
        larger parent chunks that provide more context for the generation model.
        
        Concept from Paper: Chunk Optimization -> Small-to-Big
        
        OPTIMIZED: Uses async batch processing for embeddings to significantly improve speed.
        """
        try:
            # Prepare metadata for vectors, excluding description to save space
            clean_metadata = document.get("metadata", {}).copy()
            clean_metadata.pop('description', None)
            
            # 1. Chunk the document into parent and child chunks
            parent_chunks, child_chunks = self._chunk_document_small_to_big(
                document["content"], document.get("title", "")
            )
            
            logger.info(f"Created {len(parent_chunks)} parent chunks and {len(child_chunks)} child chunks")
            
            # 2. Generate embeddings for child chunks using async batch processing
            vectors = await self._generate_embeddings_batch(child_chunks, clean_metadata, document)
            
            if not vectors:
                logger.error("No embeddings were generated successfully")
                return {"chunk_ids": [], "parent_ids": []}
            
            # 3. Store child vectors and parent chunks concurrently
            # We use gather to run them in parallel for speed
            results = await asyncio.gather(
                pinecone_service.upsert_vectors(vectors),
                parent_chunks_service.store_parent_chunks(parent_chunks),
                return_exceptions=True
            )
            
            # Check for failures in storage
            for i, result in enumerate(results):
                if isinstance(result, Exception) or result is False:
                    error_msg = f"Failed to store {'vectors' if i == 0 else 'parent chunks'}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
            
            logger.info(f"Successfully indexed {len(vectors)} child chunks for document '{document.get('title', 'Unknown')}'")
            
            # Return both child chunk IDs and parent chunk IDs for better tracking
            return {
                "chunk_ids": [v["id"] for v in vectors],
                "parent_ids": [p["id"] for p in parent_chunks]
            }
            
        except Exception as e:
            logger.error(f"Error in indexing module: {e}")
            return {"chunk_ids": [], "parent_ids": []}

    async def pre_retrieval_module(self, query: str, api_keys: Dict[str, str] = {}) -> str:
        """
        [Module: Pre-Retrieval] Enhances the query using Hypothetical Document Embeddings (HyDE).
        It generates a hypothetical answer to the query, which is often semantically closer
        to the target document chunks than the query itself.

        Concept from Paper: Query Transformation -> HyDE (Hypothetical Document Embeddings)
        """
        try:
            hyde_prompt = (
                f"Please write a short, hypothetical passage that answers the following question. "
                f"This passage will be used to retrieve relevant documents.\n\nQuestion: {query}"
            )
            model = api_keys.get("model", "gemini-2.5-flash")
            
            if "groq" in model.lower() or "llama" in model.lower():
                groq_key = api_keys.get("groq_api_key")
                hypothetical_answer = await groq_service.generate_answer(hyde_prompt, api_key=groq_key)
            else:
                google_key = api_keys.get("google_api_key")
                hypothetical_answer = await gemini_service.generate_answer(hyde_prompt, api_key=google_key)
                
            enhanced_query = f"{query}\n\n{hypothetical_answer}"
            logger.info(f"Generated hypothetical document for query: '{query}'")
            return enhanced_query # The embedding of this is used for retrieval
        except Exception as e:
            logger.error(f"Error in pre-retrieval (HyDE) module: {e}")
            return query  # Fallback to original query

    async def retrieval_module(self, query: str, top_k: int = 10, username: str = None, documents: List[str] = None, similarity_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """
        [Module: Retrieval] Enhanced retrieval with relevance filtering and diversity.
        1. Embed the (potentially enhanced) query.
        2. Retrieve the top CHILD chunks from vector store (filtered by username and documents).
        3. Filter by similarity threshold to remove low-quality matches.
        4. Apply diversity filtering to reduce redundancy.
        5. Fetch corresponding PARENT chunks for rich context.

        Concept from Paper: Small-to-Big Retrieval + Relevance Filtering
        """
        try:
            query_embedding = await embedding_service.get_embedding(query)
            if not query_embedding or len(query_embedding) == 0:
                logger.warning("Failed to get query embedding")
                return []

            # 1. Retrieve more child chunks for better coverage (we'll filter later)
            retrieval_size = min(top_k * 2, 50)  # Cast wider net, but cap at reasonable size
            child_results = await pinecone_service.query_vectors(query_embedding, retrieval_size, username=username, documents=documents)
            
            if not child_results:
                if username:
                    logger.warning(f"RETRIEVAL DEBUG: No child chunks retrieved for user '{username}'")
                else:
                    logger.warning("RETRIEVAL DEBUG: No child chunks retrieved from vector search")
                return []
            
            # Log initial retrieval scores
            initial_scores = [round(c.get('score', 0.0), 4) for c in child_results[:5]]
            logger.info(f"RETRIEVAL DEBUG: Top 5 initial vector scores: {initial_scores}")

            # Dynamic thresholding: If specific documents are selected, be more lenient
            effective_threshold = 0.15 if documents else 0.2
            logger.info(f"RETRIEVAL DEBUG: Using effective similarity threshold: {effective_threshold}")

            # 2. Filter by similarity threshold
            filtered_results = []
            for res in child_results:
                score = res.get('score', 0.0)
                # Only keep results above similarity threshold
                if score >= effective_threshold:
                    filtered_results.append(res)
                else:
                    # Log drops occasionally
                    if len(filtered_results) < 1:
                        logger.info(f"RETRIEVAL DEBUG: Dropping initial chunk score {score} < {similarity_threshold}")
            
            if not filtered_results:
                logger.warning(f"RETRIEVAL DEBUG: No results above similarity threshold {similarity_threshold}. Using all results.")
                filtered_results = child_results
            
            logger.info(f"Filtered {len(child_results)} to {len(filtered_results)} chunks above similarity threshold")
            
            # 3. Get unique parent chunks with diversity filtering
            parent_ids = []
            parent_scores = {}
            seen_content_hashes = set()
            
            for res in filtered_results:
                metadata = res.get('metadata', {})
                if 'parent_id' in metadata:
                    parent_id = metadata['parent_id']
                    
                    # Diversity check: avoid very similar content
                    content = metadata.get('content', '')
                    content_hash = hash(content[:200])  # Hash first 200 chars for quick comparison
                    
                    if parent_id not in parent_ids:
                        # Simple diversity: skip if we've seen very similar content
                        if content_hash not in seen_content_hashes or len(parent_ids) < 3:
                            parent_ids.append(parent_id)
                            parent_scores[parent_id] = res.get('score', 0.0)
                            seen_content_hashes.add(content_hash)
            
            if not parent_ids:
                logger.warning("No parent IDs found in child chunk metadata")
                return []

            logger.info(f"Selected {len(parent_ids)} diverse parent chunks from {len(filtered_results)} candidates")

            # 4. Fetch the full PARENT chunks from the document store
            parent_chunks = await parent_chunks_service.fetch_parent_chunks(parent_ids)
            
            if not parent_chunks:
                logger.warning("No parent chunks found in document store")
                return []
            
            # 5. Attach scores to parent chunks for downstream ranking
            enriched_chunks = []
            for parent_id, chunk_data in parent_chunks.items():
                chunk_with_score = dict(chunk_data)
                chunk_with_score['retrieval_score'] = parent_scores.get(parent_id, 0.0)
                enriched_chunks.append(chunk_with_score)
            
            # Sort by retrieval score
            enriched_chunks.sort(key=lambda x: x.get('retrieval_score', 0.0), reverse=True)
            
            logger.info(f"Retrieved {len(enriched_chunks)} parent chunks for user '{username or 'all users'}'")
            return enriched_chunks
            
        except Exception as e:
            logger.error(f"Error in retrieval module: {e}")
            return []

    async def post_retrieval_module(self, chunks: List[Dict[str, Any]], query: str, target_count: int = 5, min_relevance_score: float = 0.4) -> List[Dict[str, Any]]:
        """
        [Module: Post-Retrieval] Enhanced reranking with adaptive selection.
        1. Uses model-based reranking for semantic relevance assessment.
        2. Adaptively selects optimal number of chunks based on quality.
        3. Applies minimum relevance threshold.
        4. Ensures diversity in final selection.

        Concept from Paper: Rerank -> Model-base rerank + Adaptive Selection
        """
        try:
            if not chunks:
                return []
            
            # Determine how many to keep after reranking - adaptive based on available chunks
            # If we have many high-quality chunks, we can afford to be selective
            # If we have fewer chunks, we keep more to ensure sufficient context
            if len(chunks) >= target_count * 2:
                # Plenty of chunks - be selective, keep target + 50%
                keep_count = min(int(target_count * 1.5), len(chunks))
            elif len(chunks) >= target_count:
                # Moderate number - keep target + 20%
                keep_count = min(int(target_count * 1.2), len(chunks))
            else:
                # Limited chunks - keep all
                keep_count = len(chunks)
            
            logger.info(f"Reranking {len(chunks)} chunks, will keep up to {keep_count} after quality filtering")
            
            # Use FlashRank to rerank documents locally
            # This implements the Post-Retrieval Mechanism (Section 4.1) from Modular RAG docs
            reranked_chunks = rerank_service.rerank_documents(query=query, documents=chunks, top_n=keep_count)
            
            # Apply relevance scoring and filtering
            # Note: FlashRank provides normalized scores
            high_quality_chunks = []
            
            # Log the top scores to understand distribution
            if reranked_chunks:
                top_scores = [round(c.get('score', 0.0), 4) for c in reranked_chunks[:5]]
                logger.info(f"RERANK DEBUG: Top 5 FlashRank scores: {top_scores}")
                logger.info(f"RERANK DEBUG: Top chunk text: {reranked_chunks[0].get('metadata', {}).get('content', '')[:100]}...")

            for chunk in reranked_chunks:
                # OPTIMISTIC SCORING STRATEGY
                # FlashRank can sometimes return near-zero scores (e.g., 1.5e-5) even for relevant content.
                # Vector Search (Pinecone) usually gives reliable semantic similarity (e.g., 0.5).
                # To prevent dropping good content due to Reranker failure, we take the MAX of both scores.
                
                rerank_score = float(chunk.get('score', 0.0))
                retrieval_score = float(chunk.get('retrieval_score', 0.0))
                
                # STRICT SCORING STRATEGY (User Request)
                # We use the actual Reranker score as the authority.
                # Only fallback to retrieval score if reranker score is effectively zero (failed to score)
                if rerank_score > 0.0001:
                    score = rerank_score
                else:
                    score = retrieval_score
                
                logger.info(f"RERANK DEBUG: Chunk '{chunk.get('id')}' - Rerank: {rerank_score:.4f}, Vector: {retrieval_score:.4f} -> Final: {score:.4f}")
                
                # Keep chunks above minimum relevance threshold (Lowered to 0.25 effective)
                # If the user specifically accepted a lower threshold, respect that
                effective_min_score = min(min_relevance_score, 0.25)

                if score >= effective_min_score:
                    chunk['final_score'] = score
                    high_quality_chunks.append(chunk)
                # Fallback: keep top 2 if they are at least somewhat relevant (e.g. > 0.15)
                # This prevents showing completely irrelevant docs (0.01 score) for nonsense queries
                elif len(high_quality_chunks) < 2 and score > 0.15:
                    logger.info(f"RERANK DEBUG: Keeping lower score chunk {score} as fallback")
                    chunk['final_score'] = score
                    high_quality_chunks.append(chunk)
                else:
                    # Log what we are dropping to understand why
                     if len(high_quality_chunks) < 5: # Only log first few drops to avoid noise
                        logger.info(f"RERANK DEBUG: Dropping chunk with score {score} (Threshold: {effective_min_score})")
            
            # CRITICAL FALLBACK: If we have NO high quality chunks, but we did find *something*,
            # we should return the top chunks rather than nothing, especially if retrieval found them.
            # This handles cases where the reranker is strict or uncalibrated.
            if not high_quality_chunks and reranked_chunks:
                logger.warning(f"No chunks met the threshold {min_relevance_score}. Returning top {min(3, len(reranked_chunks))} chunks as fallback.")
                high_quality_chunks = reranked_chunks[:min(3, len(reranked_chunks))]
                for chunk in high_quality_chunks:
                     chunk['final_score'] = chunk.get('score', 0.0)

            # Ensure we have enough context (Guaranteed Diversity)
            # Use a slighly lower threshold for the "fillers" to ensure we get at least 3 items if available
            target_min_chunks = min(3, len(reranked_chunks))
            if len(high_quality_chunks) < target_min_chunks:
                logger.info(f"RERANK DEBUG: Not enough high quality chunks ({len(high_quality_chunks)}), adding fillers...")
                for chunk in reranked_chunks:
                    if chunk not in high_quality_chunks:
                        # Hard floor check - just filter complete garbage
                        score = chunk.get('score', 0.0)
                        if score > 0.001:  # Extremely low floor, just to filter noise
                            logger.info(f"RERANK DEBUG: Adding filler chunk with score {score}")
                            chunk['final_score'] = score
                            high_quality_chunks.append(chunk)
                            if len(high_quality_chunks) >= target_min_chunks:
                                break
            
            # SORTING (User Request): Ensure strictly descending order by final_score
            high_quality_chunks.sort(key=lambda x: x.get('final_score', 0.0), reverse=True)

            # Cap at the strict target count requested by the user for optimal retrieval
            final_chunks = high_quality_chunks[:target_count]
            
            logger.info(f"Post-retrieval complete: {len(chunks)} → {len(reranked_chunks)} reranked → {len(final_chunks)} final chunks")
            logger.info(f"Final chunk scores: {[round(c.get('final_score', 0), 2) for c in final_chunks[:5]]}")
            
            return final_chunks
            
        except Exception as e:
            logger.error(f"Error in post-retrieval (reranking) module: {e}")
            # Fallback: return top chunks by retrieval score
            fallback = sorted(chunks, key=lambda x: x.get('retrieval_score', 0.0), reverse=True)[:target_count]
            logger.info(f"Using fallback: returning top {len(fallback)} chunks by retrieval score")
            return fallback



    async def generation_module(self, query: str, context_chunks: List[Dict[str, Any]], chat_history: List[Dict[str, Any]] = None, document_descriptions: List[str] = None, api_keys: Dict[str, str] = {}) -> str:
        """
        [Module: Generation] Generates answers optimized for TTS with adaptive detail level.
        Uses full chat history and retrieved context for context-aware responses.
        Adapts response length and detail based on validation by the LLM itself.
        
        Args:
            query: The user's current question
            context_chunks: Retrieved and reranked document chunks
            chat_history: Previous messages in the conversation (optional)
            document_descriptions: List of descriptions of available documents (always included)
            api_keys: Dictionary containing user-specific API keys
        """
        try:
            model = api_keys.get("model", "gemini-2.5-flash")
            logger.info(f"Using model: {model} for generation")
            # Build context from chunks - include ALL retrieved content
            context_parts = [chunk.get("metadata", {}).get("content", "") for chunk in context_chunks]
            context = "\n\n---\n\n".join(context_parts)
            
            # Build conversation history string - include full history for context
            conversation_context = ""
            if chat_history and len(chat_history) > 0:
                # Include up to last 20 messages for better context understanding
                recent_history = chat_history[-20:]
                history_parts = []
                for msg in recent_history:
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    if role == 'user':
                        history_parts.append(f"User: {content}")
                    else:
                        # Include full assistant responses for complete context
                        history_parts.append(f"Assistant: {content}")
                
                conversation_context = "\n".join(history_parts)
            
            # Prepare document overview section
            doc_overview = ""
            if document_descriptions:
                doc_overview = "DOCUMENT OVERVIEW:\n" + "\n".join([f"- {desc}" for desc in document_descriptions]) + "\n\n"
            
            # Unified Claude/ChatGPT-style prompt for all response styles
            history_header = f"PREVIOUS CONVERSATION:\n{conversation_context}\n\n" if conversation_context else ""
            
            prompt = f"""
You are an expert assistant. Your goal is to provide a comprehensive, well-structured answer in a natural, professional voice.

### Guidelines:
1.  **Structure is Key**: Use Markdown headers (###) to organize your response into logical sections (e.g., "Overview", "Key Details", "Analysis").
2.  **Rich Formatting**: 
    - **Tables**: You MUST use Markdown table syntax (e.g., `| Col1 | Col2 |` followed by `|---|---|`). Do NOT use plain text tables or tab separations.
    - Use `Code Blocks` for technical terms, commands, or code.
    - Use **Bold** for emphasis on important concepts.
    - Use > Blockquotes for summaries or key takeaways.
3.  **Be Direct**: Start with a direct answer to the question.
4.  **Natural Flow**: Use fluid transitions between paragraphs.
5.  **Context Use**: Base your answer STRICTLY on the "Available Information" below.
6.  **Tone**: Professional, confident, and helpful.

### Context:
{history_header}{doc_overview}

### Available Information:
{context}

### User Question:
{query}

Answer:
"""
            
            if "groq" in model.lower() or "llama" in model.lower():
                groq_key = api_keys.get("groq_api_key")
                answer = await groq_service.generate_answer(prompt, api_key=groq_key)
            else:
                google_key = api_keys.get("google_api_key")
                answer = await gemini_service.generate_answer(prompt, api_key=google_key)
            
            # Keep the markdown formatting - don't strip it
            logger.info(f"Generated markdown answer for query: {query[:50]}... (length: {len(answer)} chars)")
            return answer
            
        except Exception as e:
            logger.error(f"Error in generation module: {e}")
            return "I apologize, but I encountered an error while generating the answer."
    
    def _strip_markdown_for_tts(self, text: str) -> str:
        """
        Strip markdown formatting for Text-to-Speech compatibility.
        Used only when converting to speech, not for display.
        """
        # Remove markdown bold/italic but preserve the text
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        
        # Remove headers but keep the text on new line
        text = re.sub(r'^#{1,6}\s+(.+)$', r'\1', text, flags=re.MULTILINE)
        
        # Remove inline code backticks
        text = re.sub(r'`(.+?)`', r'\1', text)
        
        # Remove code blocks but keep the content
        text = re.sub(r'```[a-z]*\n?(.+?)\n?```', r'\1', text, flags=re.DOTALL)
        
        # Remove emojis
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"  # dingbats
            "\U000024C2-\U0001F251"  # enclosed characters
            "]+",
            flags=re.UNICODE
        )
        text = emoji_pattern.sub('', text)
        
        # Expand common abbreviations for better TTS
        text = text.replace(' e.g. ', ' for example ')
        text = text.replace(' E.g. ', ' For example ')
        text = text.replace(' i.e. ', ' that is ')
        text = text.replace(' I.e. ', ' That is ')
        text = text.replace(' etc.', ' and so on')
        text = text.replace(' vs. ', ' versus ')
        text = text.replace(' vs ', ' versus ')
        
        # Clean up spacing
        text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 newlines
        text = re.sub(r' {2,}', ' ', text)  # Remove multiple spaces
        text = re.sub(r'\n ', '\n', text)  # Remove spaces after newlines
        text = re.sub(r' \n', '\n', text)  # Remove spaces before newlines
        
        # Ensure proper sentence endings
        text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
        
        return text.strip()
    
    def _clean_for_tts(self, text: str) -> str:
        """
        Clean text to be fully TTS-compatible.
        Removes all formatting and symbols that break text-to-speech.
        """
        # Remove markdown bold/italic
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        
        # Remove headers
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        
        # Remove inline code
        text = re.sub(r'`(.+?)`', r'\1', text)
        
        # Remove code blocks
        text = re.sub(r'```[a-z]*\n?(.+?)\n?```', r'\1', text, flags=re.DOTALL)
        
        # Remove bullet points and convert to sentences
        text = re.sub(r'^\s*[-•●◦▪]\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*\d+\.\s*', '', text, flags=re.MULTILINE)
        
        # Remove emojis (common Unicode ranges)
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"  # dingbats
            "\U000024C2-\U0001F251"  # enclosed characters
            "]+",
            flags=re.UNICODE
        )
        text = emoji_pattern.sub('', text)
        
        # Replace common abbreviations
        text = text.replace(' e.g. ', ' for example ')
        text = text.replace(' i.e. ', ' that is ')
        text = text.replace(' etc.', ' and so on.')
        text = text.replace(' vs. ', ' versus ')
        text = text.replace(' vs ', ' versus ')
        
        # Remove excessive whitespace and normalize
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        
        return text.strip()
    
    def _remove_markdown_formatting(self, text: str) -> str:
        """
        Helper method to remove common Markdown formatting from text.
        """
        # Remove bold formatting (**text** or __text__)
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        
        # Remove italic formatting (*text* or _text_)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        
        # Remove headers (# or ## or ### etc.)
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        
        # Remove inline code (`code`)
        text = re.sub(r'`(.+?)`', r'\1', text)
        
        # Remove code blocks (```code```)
        text = re.sub(r'```[a-z]*\n(.+?)\n```', r'\1', text, flags=re.DOTALL)
        
        return text.strip()

    async def _generate_embeddings_batch(self, child_chunks: List[Dict], clean_metadata: Dict, document: Dict) -> List[Dict]:
        """
        Generate embeddings for child chunks using async batch processing for improved performance.
        Uses the new batch embedding method for maximum efficiency.
        
        Args:
            child_chunks: List of child chunk dictionaries
            clean_metadata: Cleaned metadata for vectors
            document: Original document dictionary
            
        Returns:
            List of vector dictionaries ready for Pinecone upsert
        """
        if not child_chunks:
            return []
            
        logger.info(f"Starting batch embedding generation for {len(child_chunks)} chunks")
        
        # Extract texts for batch processing
        texts = [chunk["content"] for chunk in child_chunks]
        
        # Generate all embeddings in one batch call for maximum efficiency
        try:
            embeddings = await embedding_service.get_embeddings_batch(texts)
            
            if not embeddings or len(embeddings) != len(child_chunks):
                logger.error(f"Batch embedding failed: expected {len(child_chunks)}, got {len(embeddings) if embeddings else 0}")
                # Fallback to individual processing
                return await self._generate_embeddings_individual_fallback(child_chunks, clean_metadata, document)
            
            # Create vectors from successful embeddings
            vectors = []
            for i, (child_chunk, embedding) in enumerate(zip(child_chunks, embeddings)):
                if embedding and len(embedding) > 0:
                    vectors.append({
                        "id": child_chunk["id"],
                        "values": embedding,
                        "metadata": {
                            "content": child_chunk["content"],
                            "parent_id": child_chunk["parent_id"],
                            "title": document.get("title", ""),
                            "chunk_index": i,
                            "is_fallback": False,
                            **clean_metadata
                        }
                    })
                else:
                    logger.warning(f"Empty embedding for chunk {i + 1}")
            
            logger.info(f"Successfully generated {len(vectors)} embeddings out of {len(child_chunks)} chunks using batch processing")
            return vectors
            
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            # Fallback to individual processing
            return await self._generate_embeddings_individual_fallback(child_chunks, clean_metadata, document)

    async def _generate_embeddings_individual_fallback(self, child_chunks: List[Dict], clean_metadata: Dict, document: Dict) -> List[Dict]:
        """
        Fallback method for individual embedding generation when batch processing fails.
        """
        logger.info("Using individual embedding generation as fallback")
        vectors = []
        failed_embeddings = 0
        
        # Create semaphore to limit concurrent embeddings
        semaphore = asyncio.Semaphore(self.max_concurrent_embeddings)
        
        # Create tasks for concurrent embedding generation
        tasks = []
        for i, child_chunk in enumerate(child_chunks):
            task = self._generate_single_embedding(
                semaphore, child_chunk, i, clean_metadata, document
            )
            tasks.append(task)
        
        # Wait for all embeddings to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Embedding generation failed: {result}")
                failed_embeddings += 1
            elif result is not None:
                vectors.append(result)
            else:
                failed_embeddings += 1
        
        if failed_embeddings > 0:
            logger.warning(f"Failed to generate embeddings for {failed_embeddings}/{len(child_chunks)} chunks")
        
        logger.info(f"Fallback processing generated {len(vectors)} embeddings")
        return vectors

    async def _generate_single_embedding(self, semaphore: asyncio.Semaphore, child_chunk: Dict, 
                                       chunk_index: int, clean_metadata: Dict, document: Dict) -> Dict:
        """
        Generate a single embedding with semaphore control for concurrency limiting.
        
        Args:
            semaphore: Asyncio semaphore for controlling concurrency
            child_chunk: Individual child chunk dictionary
            chunk_index: Index of the chunk for logging
            clean_metadata: Cleaned metadata for the vector
            document: Original document dictionary
            
        Returns:
            Vector dictionary or None if failed
        """
        async with semaphore:
            try:
                embedding = await embedding_service.get_embedding(child_chunk["content"])
                
                if embedding and len(embedding) > 0:
                    return {
                        "id": child_chunk["id"],
                        "values": embedding,
                        "metadata": {
                            "content": child_chunk["content"],
                            "parent_id": child_chunk["parent_id"],
                            "title": document.get("title", ""),
                            "chunk_index": chunk_index,
                            "is_fallback": False,
                            **clean_metadata
                        }
                    }
                else:
                    logger.warning(f"Failed to get embedding for chunk {chunk_index + 1}")
                    return None
                    
            except Exception as e:
                logger.error(f"Error generating embedding for chunk {chunk_index + 1}: {e}")
                return None

    def _chunk_document_small_to_big(self, content: str, title: str) -> Tuple[List[Dict], List[Dict]]:
        """
        Private helper for the "Small-to-Big" chunking strategy.
        - Parent Chunks: Larger, overlapping segments for context.
        - Child Chunks: Smaller sentences within each parent chunk for retrieval.
        
        OPTIMIZED: Improved sentence splitting and chunk creation for better performance.
        """
        parent_chunks = []
        child_chunks = []
        
        # Pre-compile regex for better performance
        sentence_pattern = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s+')
        
        # Create parent chunks with optimized processing
        start = 0
        parent_index = 0
        
        while start < len(content):
            end = start + self.parent_chunk_size
            parent_content = content[start:end].strip()
            
            if parent_content:
                parent_id = f"parent_{uuid.uuid4().hex}"
                parent_chunks.append({
                    "id": parent_id,
                    "metadata": {"content": parent_content, "title": title}
                })
                
                # Create child chunks from this parent chunk using optimized sentence splitting
                sentences = sentence_pattern.split(parent_content)
                
                # Filter and process sentences more efficiently
                valid_sentences = [
                    sentence.strip() 
                    for sentence in sentences 
                    if len(sentence.strip()) > 20  # Filter out very short sentences
                ]
                
                # Create child chunks for valid sentences
                for sentence in valid_sentences:
                    child_chunks.append({
                        "id": f"child_{uuid.uuid4().hex}",
                        "content": sentence,
                        "parent_id": parent_id
                    })
                
                parent_index += 1

            start += self.parent_chunk_size - self.chunk_overlap
            
        logger.info(f"Chunking complete: {len(parent_chunks)} parent chunks, {len(child_chunks)} child chunks")
        return parent_chunks, child_chunks


# Singleton instance
rag_service = RAGService()
