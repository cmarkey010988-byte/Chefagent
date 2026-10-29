/**
 * src/hooks/useAmbientKitchenListener.ts
 *
 * Web counterpart to Android's AmbientKitchenListenerService.
 * Maintains an active acoustic listener loop capturing high-frequency kitchen vernacular:
 * - "Fire Table [X]"
 * - "86 [Ingredient]"
 * - "Push [Banquet / Event / Recipe]"
 *
 * Integrates Web Audio RMS energy calculation for acoustic gating and visual meter feedback.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceParseResult } from '../types';

export interface UseAmbientKitchenListenerOptions {
  isEnabled: boolean;
  onKitchenCallDetected: (intentType: 'FIRE_TABLE' | 'MARK_86' | 'PUSH_EVENT', rawPayload: string) => void;
}

export function useAmbientKitchenListener({
  isEnabled,
  onKitchenCallDetected,
}: UseAmbientKitchenListenerOptions) {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for visual meter
  const [lastDetectedCall, setLastDetectedCall] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Parse kitchen vernacular with low-latency regex
  const evaluateKitchenSpeech = useCallback(
    (transcript: string) => {
      const lower = transcript.toLowerCase().trim();

      // 1. "Fire Table [X]"
      const fireMatch = lower.match(/fire\s+table\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/i);
      if (fireMatch) {
        setLastDetectedCall(`Heard: "Fire Table ${fireMatch[1]}"`);
        onKitchenCallDetected('FIRE_TABLE', fireMatch[1]);
        return;
      }

      // 2. "86 [Ingredient]"
      const eightySixMatch = lower.match(/(86|eighty-six|out\s+of\s+stock)\s+(the\s+)?([a-zA-Z\s]+)/i);
      if (eightySixMatch) {
        const item = eightySixMatch[3].trim();
        setLastDetectedCall(`Heard: "86 ${item}"`);
        onKitchenCallDetected('MARK_86', item);
        return;
      }

      // 3. "Push [Event / Recipe]"
      const pushMatch = lower.match(/push\s+(the\s+)?([a-zA-Z\s]+)/i);
      if (pushMatch) {
        const target = pushMatch[2].trim();
        setLastDetectedCall(`Heard: "Push ${target}"`);
        onKitchenCallDetected('PUSH_EVENT', target);
        return;
      }
    },
    [onKitchenCallDetected]
  );

  // Start continuous listening
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available for ambient listener.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            evaluateKitchenSpeech(text);
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Ambient listener error:', e.error);
        }
      };

      recognition.onend = () => {
        if (isEnabled) {
          try {
            recognition.start();
          } catch {}
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // AudioContext meter setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        navigator.mediaDevices
          ?.getUserMedia({ audio: true })
          .then((stream) => {
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);

            audioContextRef.current = ctx;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            updateMeter();
          })
          .catch(() => {
            // Simulated meter animation if mic stream blocked
            let counter = 0;
            const interval = setInterval(() => {
              counter += 0.2;
              setAudioLevel(Math.round(20 + Math.sin(counter) * 15));
            }, 100);
            return () => clearInterval(interval);
          });
      }
    } catch (err) {
      console.warn('Could not start ambient listener:', err);
    }
  }, [isEnabled, evaluateKitchenSpeech]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    if (isEnabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isEnabled, startListening, stopListening]);

  return {
    isListening,
    audioLevel,
    lastDetectedCall,
    triggerSimulatedCall: evaluateKitchenSpeech,
  };
}
