import { useState, useRef, useEffect } from 'react';
import { speechService } from '../../services/speechService';
import { useToast } from '../../hooks/useToast';

/**
 * VoiceInput Component
 * Records audio from the browser microphone and sends it to the speech-to-text API.
 * Returns transcribed text via the onTranscribe callback.
 */
export function VoiceInput({ onTranscribe, onAutoSubmit, disabled = false, theme = 'orange' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const { showToast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
    };
  }, []);

  const startRecording = async () => {
    // 1. Try Browser Web Speech API first (Instant, zero server cost)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const text = event.results[0][0].transcript;
          if (text && text.trim()) {
            onTranscribe?.(text.trim());
            if (onAutoSubmit) onAutoSubmit(text.trim());
          } else {
            showToast({ type: 'warning', message: 'No speech detected. Please try again.' });
          }
          setIsRecording(false);
        };

        recognition.onerror = (event) => {
          console.warn('Web Speech API error, falling back to server Whisper:', event.error);
          setIsRecording(false);
          startMediaRecorder(); // Fallback to MediaRecorder + Groq Whisper
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        return;
      } catch (err) {
        console.warn('Web Speech API start failed, using server Whisper fallback:', err);
      }
    }

    // 2. Fallback to MediaRecorder + Server Groq Whisper
    await startMediaRecorder();
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

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
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

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
    if (recognitionRef.current && isRecording) {
      try { recognitionRef.current.stop(); } catch (e) { }
      setIsRecording(false);
      return;
    }
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
        onTranscribe?.(transcribedText);
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

  const getThemeColors = () => {
    if (theme === 'blue') {
      return isRecording ? 'text-red-500 animate-pulse hover:text-red-600' : 'text-gray-400 hover:text-blue-600';
    }
    return isRecording ? 'text-red-500 animate-pulse hover:text-red-600' : 'text-gray-400 hover:text-orange-600';
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`
        p-2 rounded-md transition-all duration-200
        ${getThemeColors()}
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
