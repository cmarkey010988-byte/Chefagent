/**
 * src/hooks/useTriModeVoice.ts
 *
 * Tri-Mode Voice Trigger Engine:
 * - MANUAL (Push-to-Talk)
 * - WAKE_WORD (Passive listening for "Chef", "Ashley", or venue name with Web Audio rising chime)
 * - CONTINUOUS (Hands-free walkthrough mode)
 *
 * Includes Web Audio harmonic synth chimes, SpeechSynthesis vocal feedback, and 5-second Undo stack.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceConfig,
  VoiceListeningState,
  VoiceParseResult,
  VoiceUndoAction,
  InventoryItem,
  TableStatus,
  ShiftRosterItem,
  PrepItem,
} from '../types';
import { parseSpokenCommand } from '../utils/voiceCommandParser';

export interface UseTriModeVoiceOptions {
  inventory: InventoryItem[];
  tables: TableStatus[];
  roster: ShiftRosterItem[];
  prepList?: PrepItem[];
  onCommandParsed?: (result: VoiceParseResult, registerUndo: (action: VoiceUndoAction) => void) => void;
  defaultConfig?: Partial<VoiceConfig>;
}

export function useTriModeVoice({
  inventory,
  tables,
  roster,
  prepList,
  onCommandParsed,
  defaultConfig,
}: UseTriModeVoiceOptions) {
  const [config, setConfig] = useState<VoiceConfig>({
    mode: defaultConfig?.mode || 'WAKE_WORD',
    wakeWord: defaultConfig?.wakeWord || 'Chef',
    isWakeChimeEnabled: defaultConfig?.isWakeChimeEnabled ?? true,
    isTtsEnabled: defaultConfig?.isTtsEnabled ?? true,
    activeDomainContext: defaultConfig?.activeDomainContext || 'AUTO',
  });

  const [state, setState] = useState<VoiceListeningState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [lastResult, setLastResult] = useState<VoiceParseResult | null>(null);
  const [activeUndo, setActiveUndo] = useState<VoiceUndoAction | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const undoTimerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  // Initialize Web Audio Context lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Web Audio rising harmonic chime (587Hz D5 -> 880Hz A5)
  const playWakeChime = useCallback(() => {
    if (!config.isWakeChimeEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Web Audio chime could not play:', e);
    }
  }, [config.isWakeChimeEnabled, getAudioContext]);

  // Web Audio success commit chime (880Hz -> 1320Hz)
  const playSuccessChime = useCallback(() => {
    if (!config.isWakeChimeEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(880.0, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Success chime error:', e);
    }
  }, [config.isWakeChimeEnabled, getAudioContext]);

  // Vocal speech feedback using window.speechSynthesis
  const speakResponse = useCallback(
    (text: string) => {
      if (!config.isTtsEnabled || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    },
    [config.isTtsEnabled]
  );

  // Register undo action with 5-second countdown
  const registerUndo = useCallback((action: VoiceUndoAction) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setActiveUndo(action);
    undoTimerRef.current = setTimeout(() => {
      setActiveUndo(null);
    }, 5000);
  }, []);

  const triggerUndo = useCallback(() => {
    if (activeUndo) {
      activeUndo.revert();
      speakResponse('Action undone.');
      setActiveUndo(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  }, [activeUndo, speakResponse]);

  // Process raw command text
  const executeCommand = useCallback(
    (rawText: string) => {
      setState('PROCESSING');
      const result = parseSpokenCommand(rawText, {
        inventory,
        tables,
        roster,
        prepList,
        activeDomain: config.activeDomainContext,
      });

      setLastResult(result);

      if (result.intent !== 'UNKNOWN') {
        playSuccessChime();
        if (result.spokenFeedback) {
          speakResponse(result.spokenFeedback);
        }
        if (onCommandParsed) {
          onCommandParsed(result, registerUndo);
        }
        setState('CONFIRMED');
        setTimeout(() => {
          setState(config.mode === 'WAKE_WORD' ? 'WAKE_STANDBY' : config.mode === 'CONTINUOUS' ? 'LISTENING' : 'IDLE');
        }, 1500);
      } else {
        setState('ERROR');
        if (result.spokenFeedback) speakResponse(result.spokenFeedback);
        setTimeout(() => {
          setState(config.mode === 'WAKE_WORD' ? 'WAKE_STANDBY' : config.mode === 'CONTINUOUS' ? 'LISTENING' : 'IDLE');
        }, 2000);
      }
    },
    [inventory, tables, roster, prepList, config, onCommandParsed, registerUndo, playSuccessChime, speakResponse]
  );

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setState('IDLE');
  }, []);

  // Start listening according to active mode
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    stopListening();
    isListeningRef.current = true;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = config.mode !== 'MANUAL';
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setState(config.mode === 'WAKE_WORD' ? 'WAKE_STANDBY' : 'LISTENING');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        setTranscript(currentTranscript);

        // Wake word handling
        if (config.mode === 'WAKE_WORD') {
          const wakeWordLower = config.wakeWord.toLowerCase();
          const transcriptLower = currentTranscript.toLowerCase();

          if (transcriptLower.includes(wakeWordLower)) {
            playWakeChime();
            setState('LISTENING');

            // If the phrase has a command payload after the wake word, parse it on final
            const parts = transcriptLower.split(wakeWordLower);
            const trailingCommand = parts[parts.length - 1].trim();

            if (event.results[event.results.length - 1].isFinal && trailingCommand.length > 2) {
              executeCommand(trailingCommand);
              setTranscript('');
            }
          }
        } else if (config.mode === 'CONTINUOUS' || config.mode === 'MANUAL') {
          if (event.results[event.results.length - 1].isFinal && currentTranscript.trim().length > 2) {
            executeCommand(currentTranscript);
            setTranscript('');
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech recognition error:', e.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if in WAKE_WORD or CONTINUOUS mode
        if (isListeningRef.current && (config.mode === 'WAKE_WORD' || config.mode === 'CONTINUOUS')) {
          try {
            recognition.start();
          } catch {}
        } else {
          setState('IDLE');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      setState('ERROR');
    }
  }, [config, stopListening, playWakeChime, executeCommand]);

  // Simulated command runner for testing or non-mic environments
  const simulateCommand = useCallback(
    (text: string) => {
      setTranscript(text);
      executeCommand(text);
    },
    [executeCommand]
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    config,
    setConfig,
    state,
    transcript,
    lastResult,
    activeUndo,
    isSupported,
    startListening,
    stopListening,
    triggerUndo,
    simulateCommand,
    playWakeChime,
    playSuccessChime,
    speakResponse,
  };
}
