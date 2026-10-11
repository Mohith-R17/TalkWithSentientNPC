import { useState, useRef, useEffect } from 'react';
import { speechService } from '../services/speech';

export type SpeechState = 'IDLE' | 'LISTENING' | 'TRANSCRIBING' | 'ERROR';

export function useSpeechRecognition() {
  const [speechState, setSpeechState] = useState<SpeechState>('IDLE');
  const [speechErrorMsg, setSpeechErrorMsg] = useState<string>('');
  
  const timerRef = useRef<number | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const speechStateRef = useRef<SpeechState>(speechState);

  useEffect(() => {
    speechStateRef.current = speechState;
  }, [speechState]);

  const startListening = async () => {
    if (speechStateRef.current !== 'IDLE' && speechStateRef.current !== 'ERROR') return;
    if (isStartingRef.current) return;

    isStartingRef.current = true;
    setSpeechErrorMsg('');

    try {
      await speechService.startRecording();
      isStartingRef.current = false;
      speechStateRef.current = 'LISTENING';
      setSpeechState('LISTENING');
      
      // Enforce 15-second maximum recording time
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        stopListening().catch(console.error);
      }, 15000);
      
    } catch (e: any) {
      isStartingRef.current = false;
      console.error("Microphone error:", e);
      speechStateRef.current = 'ERROR';
      setSpeechState('ERROR');
      const msg = e?.name === 'NotAllowedError' 
        ? "Microphone permission denied by browser." 
        : `Microphone error: ${e?.message || 'Could not start recording'}`;
      setSpeechErrorMsg(msg);
      
      // Auto-recover visual state
      setTimeout(() => {
        if (speechStateRef.current === 'ERROR') {
          speechStateRef.current = 'IDLE';
          setSpeechState('IDLE');
        }
      }, 4000);
    }
  };

  const stopListening = async (): Promise<string> => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If microphone is still starting up, wait up to 400ms for it to finish initializing
    if (isStartingRef.current) {
      let waitCount = 0;
      while (isStartingRef.current && waitCount < 8) {
        await new Promise(r => setTimeout(r, 50));
        waitCount++;
      }
    }
    
    // Only transcribe if we were actively listening
    if (speechStateRef.current !== 'LISTENING') return '';

    speechStateRef.current = 'TRANSCRIBING';
    setSpeechState('TRANSCRIBING');
    
    try {
      const blob = await speechService.stopRecording();
      if (!blob) {
        speechStateRef.current = 'IDLE';
        setSpeechState('IDLE');
        setSpeechErrorMsg('The tavern heard nothing. (Speak clearly)');
        setTimeout(() => setSpeechErrorMsg(''), 3000);
        return '';
      }
      
      const transcript = await speechService.transcribe(blob);
      speechStateRef.current = 'IDLE';
      setSpeechState('IDLE');
      
      if (!transcript) {
        setSpeechErrorMsg('The tavern heard nothing. (Speak clearly)');
        setTimeout(() => setSpeechErrorMsg(''), 3000);
      }
      return transcript;
      
    } catch (e) {
      console.error("Transcription error:", e);
      speechStateRef.current = 'ERROR';
      setSpeechState('ERROR');
      setSpeechErrorMsg('The tavern could not understand your words.');
      await speechService.stopRecording(); // ensure cleanup on error
      setTimeout(() => {
        if (speechStateRef.current === 'ERROR') {
          speechStateRef.current = 'IDLE';
          setSpeechState('IDLE');
        }
      }, 4000);
      return '';
    }
  };
  
  const cancelListening = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    speechService.resetMicrophone();
    speechStateRef.current = 'IDLE';
    setSpeechState('IDLE');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelListening();
      speechService.resetMicrophone();
    };
  }, []);

  return {
    speechState,
    speechErrorMsg,
    startListening,
    stopListening,
    cancelListening
  };
}
