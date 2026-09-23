"""
SarvamAI Speech Service
Provides Speech-to-Text (ASR) and Text-to-Speech (TTS) functionality.
Completely modular and separate from RAG, chat, and auth services.
"""

import os
import re
import io
import base64
import logging
import struct
import asyncio
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Maximum characters per TTS chunk (SarvamAI limit is around 500)
MAX_CHUNK_SIZE = 350


class SpeechService:
    """Service for handling speech recognition and synthesis using SarvamAI."""
    
    def __init__(self):
        pass
    
    def _get_client(self, api_key: str = None):
        """
        Get a SarvamAI client instance.
        Prioritizes the provided api_key, falls back to environment variable.
        """
        key = api_key or os.getenv("SARVAM_API_KEY")
        if not key:
            # logger.error("SARVAM_API_KEY not found in environment variables or user config")
            return None
        
        try:
            from sarvamai import SarvamAI
            return SarvamAI(api_subscription_key=key)
        except ImportError:
            logger.error("sarvamai package not installed. Run: pip install sarvamai")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize SarvamAI client: {e}")
            return None

    def _split_text_into_chunks(self, text: str, max_size: int = MAX_CHUNK_SIZE) -> List[str]:
        """
        Split long text into smaller chunks based on sentence boundaries.
        
        Args:
            text: The text to split
            max_size: Maximum characters per chunk
        
        Returns:
            List of text chunks
        """
        if len(text) <= max_size:
            return [text]
        
        # Split by sentence boundaries (., !, ?, ;, :, newlines)
        sentence_pattern = r'(?<=[.!?;:\n])\s+'
        sentences = re.split(sentence_pattern, text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # If single sentence is too long, split by commas or spaces
            if len(sentence) > max_size:
                # Try splitting by commas first
                if ',' in sentence:
                    parts = sentence.split(',')
                    for part in parts:
                        part = part.strip()
                        if not part:
                            continue
                        if len(current_chunk) + len(part) + 2 <= max_size:
                            current_chunk = f"{current_chunk}, {part}".strip(', ')
                        else:
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = part
                else:
                    # Split by words as last resort
                    words = sentence.split()
                    for word in words:
                        if len(current_chunk) + len(word) + 1 <= max_size:
                            current_chunk = f"{current_chunk} {word}".strip()
                        else:
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = word
            elif len(current_chunk) + len(sentence) + 1 <= max_size:
                current_chunk = f"{current_chunk} {sentence}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = sentence
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(current_chunk)
        
        logger.info(f"Split text into {len(chunks)} chunks")
        return chunks
    
    def _stitch_wav_audio(self, audio_chunks: List[bytes]) -> bytes:
        """
        Merge multiple WAV audio byte chunks into a single WAV file.
        
        Args:
            audio_chunks: List of WAV audio bytes
        
        Returns:
            Single merged WAV audio bytes
        """
        if not audio_chunks:
            return b''
        
        if len(audio_chunks) == 1:
            return audio_chunks[0]
        
        # Parse WAV headers and extract raw PCM data
        all_pcm_data = []
        sample_rate = None
        num_channels = None
        bits_per_sample = None
        
        for i, chunk in enumerate(audio_chunks):
            try:
                # WAV file structure:
                # Bytes 0-3: "RIFF"
                # Bytes 4-7: File size - 8
                # Bytes 8-11: "WAVE"
                # Bytes 12-15: "fmt "
                # Bytes 16-19: Format chunk size (usually 16)
                # Bytes 20-21: Audio format (1 = PCM)
                # Bytes 22-23: Number of channels
                # Bytes 24-27: Sample rate
                # Bytes 28-31: Byte rate
                # Bytes 32-33: Block align
                # Bytes 34-35: Bits per sample
                # Then "data" chunk...
                
                if len(chunk) < 44:
                    logger.warning(f"Chunk {i} too small, skipping")
                    continue
                
                # Verify WAV header
                if chunk[:4] != b'RIFF' or chunk[8:12] != b'WAVE':
                    logger.warning(f"Chunk {i} is not a valid WAV file, skipping")
                    continue
                
                # Parse format info from first valid chunk
                if sample_rate is None:
                    num_channels = struct.unpack('<H', chunk[22:24])[0]
                    sample_rate = struct.unpack('<I', chunk[24:28])[0]
                    bits_per_sample = struct.unpack('<H', chunk[34:36])[0]
                
                # Find the data chunk
                pos = 12
                while pos < len(chunk) - 8:
                    chunk_id = chunk[pos:pos+4]
                    chunk_size = struct.unpack('<I', chunk[pos+4:pos+8])[0]
                    
                    if chunk_id == b'data':
                        pcm_data = chunk[pos+8:pos+8+chunk_size]
                        all_pcm_data.append(pcm_data)
                        break
                    
                    pos += 8 + chunk_size
                    # Word alignment
                    if chunk_size % 2 == 1:
                        pos += 1
                        
            except Exception as e:
                logger.warning(f"Error parsing WAV chunk {i}: {e}")
                continue
        
        if not all_pcm_data or sample_rate is None:
            logger.error("No valid audio data found")
            return audio_chunks[0] if audio_chunks else b''
        
        # Concatenate all PCM data
        combined_pcm = b''.join(all_pcm_data)
        
        # Build new WAV file
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8
        data_size = len(combined_pcm)
        file_size = 36 + data_size
        
        # Create WAV header
        wav_header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF',
            file_size,
            b'WAVE',
            b'fmt ',
            16,  # Format chunk size
            1,   # Audio format (PCM)
            num_channels,
            sample_rate,
            byte_rate,
            block_align,
            bits_per_sample,
            b'data',
            data_size
        )
        
        result = wav_header + combined_pcm
        logger.info(f"Stitched {len(audio_chunks)} audio chunks into {len(result)} bytes")
        return result
    
    async def transcribe_audio(self, file, sarvam_api_key: str = None, groq_api_key: str = None) -> str:
        """
        Transcribe audio file to text.
        Primary: Groq Whisper Large V3 Turbo (400 RPM, 400K ASH, $0.04/hr - optimal for multi-user testing).
        Fallback: SarvamAI saarika:v2.5 ASR.
        """
        filename = getattr(file, 'filename', 'recording.webm')
        logger.info(f"Starting audio transcription for file: {filename}")
        
        # Read file content bytes
        if hasattr(file, 'read'):
            content = await file.read()
            await file.seek(0)
        else:
            content = file

        # 1. Try Groq Whisper Turbo first (High capacity, low cost, fast)
        from service.rag.groq_service import groq_service
        try:
            transcription = await groq_service.transcribe_audio(
                file_content=content,
                filename=filename,
                api_key=groq_api_key,
                model="whisper-large-v3-turbo"
            )
            if transcription and transcription.strip():
                return transcription.strip()
        except Exception as groq_err:
            logger.warning(f"Groq Whisper transcription failed or key not set, trying SarvamAI: {groq_err}")

        # 2. Fallback to SarvamAI ASR if configured
        client = self._get_client(sarvam_api_key)
        if not client:
            raise Exception("Transcription failed: Neither Groq API key nor Sarvam API key is available.")
        
        try:
            content_type = getattr(file, 'content_type', 'audio/webm')
            if 'webm' in filename.lower() or 'webm' in content_type:
                audio_codec = 'webm'
            elif 'wav' in filename.lower() or 'wav' in content_type:
                audio_codec = 'wav'
            elif 'mp3' in filename.lower() or 'mpeg' in content_type:
                audio_codec = 'mp3'
            elif 'ogg' in filename.lower() or 'ogg' in content_type:
                audio_codec = 'ogg'
            else:
                audio_codec = 'webm'
            
            response = client.speech_to_text.transcribe(
                file=content,
                model="saarika:v2.5",
                language_code="unknown",
                input_audio_codec=audio_codec
            )
            
            if hasattr(response, 'transcript'):
                text = response.transcript
            elif isinstance(response, dict):
                text = response.get('transcript', response.get('text', ''))
            else:
                text = str(response)
            
            logger.info(f"SarvamAI Transcription successful: {text[:100] if text else 'empty'}...")
            return text or ""
                    
        except Exception as e:
            logger.error(f"Error during SarvamAI audio transcription: {e}")
            raise Exception(f"Transcription failed: {str(e)}")
    
    async def _convert_single_chunk(
        self,
        client,
        text: str,
        target_language_code: str,
        speaker: str,
        pitch: float,
        pace: float,
        loudness: float,
        speech_sample_rate: int,
        enable_preprocessing: bool
    ) -> bytes:
        """Convert a single text chunk to speech."""
        response = client.text_to_speech.convert(
            text=text,
            target_language_code=target_language_code,
            speaker=speaker,
            pitch=pitch,
            pace=pace,
            loudness=loudness,
            speech_sample_rate=speech_sample_rate,
            enable_preprocessing=enable_preprocessing,
            model="bulbul:v2"
        )
        
        # Extract audio bytes from response
        if hasattr(response, 'audios') and response.audios and len(response.audios) > 0:
            audio_base64 = response.audios[0]
            return base64.b64decode(audio_base64)
        elif hasattr(response, 'audio'):
            if isinstance(response.audio, str):
                return base64.b64decode(response.audio)
            return response.audio
        elif isinstance(response, bytes):
            return response
        else:
            raise Exception("No audio data in response")
    
    async def text_to_speech(
        self,
        text: str,
        target_language_code: str = "en-IN",
        speaker: str = "anushka",
        pitch: float = 0,
        pace: float = 1,
        loudness: float = 1,
        speech_sample_rate: int = 22050,
        enable_preprocessing: bool = True,
        api_key: str = None
    ) -> bytes:
        """
        Convert text to speech using SarvamAI TTS.
        Handles long text by splitting into chunks and stitching audio.
        """
        client = self._get_client(api_key)
        if not client:
            raise Exception("SarvamAI service not available. Check SARVAM_API_KEY.")
        
        try:
            logger.info(f"Starting text-to-speech conversion for text ({len(text)} chars): {text[:50]}...")
            
            # Split text into chunks if needed
            chunks = self._split_text_into_chunks(text)
            
            if len(chunks) == 1:
                # Single chunk - direct conversion
                audio_bytes = await self._convert_single_chunk(
                    client=client,
                    text=chunks[0],
                    target_language_code=target_language_code,
                    speaker=speaker,
                    pitch=pitch,
                    pace=pace,
                    loudness=loudness,
                    speech_sample_rate=speech_sample_rate,
                    enable_preprocessing=enable_preprocessing
                )
            else:
                # Multiple chunks - convert each using async batch processing
                logger.info(f"Converting {len(chunks)} text chunks to audio using async processing...")
                audio_chunks = await self._convert_chunks_async(
                    client=client,
                    chunks=chunks,
                    target_language_code=target_language_code,
                    speaker=speaker,
                    pitch=pitch,
                    pace=pace,
                    loudness=loudness,
                    speech_sample_rate=speech_sample_rate,
                    enable_preprocessing=enable_preprocessing
                )
                
                # Stitch all audio chunks together
                audio_bytes = self._stitch_wav_audio(audio_chunks)
            
            logger.info(f"Text-to-speech conversion successful, audio size: {len(audio_bytes)} bytes")
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Error during text-to-speech conversion: {e}")
            raise Exception(f"Text-to-speech conversion failed: {str(e)}")
    
    async def _convert_chunks_async(self, client, chunks: List[str], **kwargs) -> List[bytes]:
        """
        Convert multiple text chunks to audio using async batch processing for improved performance.
        """
        max_concurrent = 5  # Limit concurrent API calls to avoid rate limiting
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def convert_with_semaphore(i: int, chunk: str) -> bytes:
            async with semaphore:
                logger.info(f"Converting chunk {i+1}/{len(chunks)}: {chunk[:30]}...")
                return await self._convert_single_chunk(client=client, text=chunk, **kwargs)
        
        # Create tasks for all chunks
        tasks = [convert_with_semaphore(i, chunk) for i, chunk in enumerate(chunks)]
        
        # Execute all tasks concurrently with semaphore limiting
        audio_chunks = await asyncio.gather(*tasks)
        
        logger.info(f"Successfully converted {len(audio_chunks)} chunks to audio")
        return audio_chunks

    def is_available(self, api_key: str = None) -> bool:
        """Check if the speech service is available and configured."""
        return self._get_client(api_key) is not None


# Singleton instance
speech_service = SpeechService()
