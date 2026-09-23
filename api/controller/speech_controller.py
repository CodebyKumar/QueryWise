"""
Speech Controller
Handles speech-related business logic for ASR and TTS endpoints.
"""

from fastapi import HTTPException, status, UploadFile
from typing import Dict, Any
from service.features.speech_service import speech_service
import logging

logger = logging.getLogger(__name__)


class SpeechController:
    """Controller for handling speech recognition and synthesis requests."""
    
    async def transcribe_audio(self, file: UploadFile, user: Dict[str, Any]) -> Dict[str, str]:
        """
        Controller logic to handle audio transcription.
        
        Args:
            file: The uploaded audio file
            user: The authenticated user
        
        Returns:
            Dict containing the transcribed text
        """
        username = user.get('username', 'unknown')
        api_keys = user.get('api_keys', {})
        sarvam_key = api_keys.get('sarvam_api_key')
        groq_key = api_keys.get('groq_api_key')

        logger.info(f"User '{username}' requested audio transcription for file: {file.filename}")
        
        # Validate file type
        allowed_types = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg', 'audio/x-wav']
        if file.content_type and file.content_type not in allowed_types:
            # Be lenient - some browsers report different content types
            logger.warning(f"Unexpected content type: {file.content_type}, proceeding anyway")
        
        try:
            # Call the speech service with both keys
            transcribed_text = await speech_service.transcribe_audio(file, sarvam_api_key=sarvam_key, groq_api_key=groq_key)
            
            logger.info(f"Transcription successful for user '{username}'")
            return {"text": transcribed_text}
            
        except Exception as e:
            logger.error(f"Transcription failed for user '{username}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to transcribe audio: {str(e)}"
            )
    
    async def text_to_speech(self, text: str, user: Dict[str, Any], **kwargs) -> bytes:
        """
        Controller logic to handle text-to-speech conversion.
        NO text length limits - the speech service handles chunking for long text.
        
        Args:
            text: The text to convert to speech (any length)
            user: The authenticated user
            **kwargs: Additional TTS parameters
        
        Returns:
            Audio bytes (stitched if text was chunked)
        """
        username = user.get('username', 'unknown')
        api_keys = user.get('api_keys', {})
        sarvam_key = api_keys.get('sarvam_api_key')
        
        logger.info(f"User '{username}' requested text-to-speech for text of length {len(text)} chars")
        
        if not text or not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        # NO length limit - speech service handles chunking internally
        # Long text will be split into chunks, converted separately, and stitched together
        
        try:
            # Call the speech service with any additional parameters
            # The service will handle chunking for long text automatically
            audio_bytes = await speech_service.text_to_speech(text, api_key=sarvam_key, **kwargs)
            
            logger.info(f"Text-to-speech successful for user '{username}' ({len(audio_bytes)} bytes audio)")
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Text-to-speech failed for user '{username}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to convert text to speech: {str(e)}"
            )
    
    async def check_service_status(self) -> Dict[str, Any]:
        """
        Check if the speech service is available.
        Note: This checks availability relative to environment variables or global init.
        User-specific availability depends on their provided keys.
        """
        is_available = speech_service.is_available()
        return {
            "available": is_available,
            "message": "Speech service is operational" if is_available else "Speech service is not configured"
        }


# Singleton instance
speech_controller = SpeechController()
