import { useState, useRef, useEffect } from 'react';
import { speechService } from '../../services/speechService';
import { useToast } from '../../hooks/useToast';

/**
 * VoiceInput Component
 * Records audio from the browser microphone and sends it to the speech-to-text API.
 * Returns transcribed text via the onTranscribe callback.
 */
export function VoiceInput({ onTranscribe, onAutoSubmit, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const { showToast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Send to API
        await processAudio(audioBlob);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error.name === 'NotAllowedError') {
        showToast({ type: 'error', message: 'Microphone access denied. Please allow microphone access.' });
      } else if (error.name === 'NotFoundError') {
        showToast({ type: 'error', message: 'No microphone found. Please connect a microphone.' });
      } else {
        showToast({ type: 'error', message: 'Failed to access microphone.' });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const result = await speechService.speechToText(audioBlob);
      const transcribedText = result.text;

      if (transcribedText && transcribedText.trim()) {
        // Call the callback with transcribed text
        onTranscribe?.(transcribedText);

        // Auto-submit if callback provided
        if (onAutoSubmit) {
          onAutoSubmit(transcribedText);
        }
      } else {
        showToast({ type: 'warning', message: 'No speech detected. Please try again.' });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      showToast({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to transcribe audio.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`
        p-2 rounded-md transition-all duration-200
        ${isRecording
          ? 'text-red-500 animate-pulse hover:text-red-600'
          : 'text-gray-400 hover:text-orange-600'
        }
        ${isProcessing ? 'opacity-50 cursor-wait' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      title={isRecording ? 'Stop recording' : isProcessing ? 'Processing...' : 'Start voice input'}
    >
      {isProcessing ? (
        // Processing spinner
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : isRecording ? (
        // Stop icon
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Microphone icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  );
}
