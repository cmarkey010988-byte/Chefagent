/**
 * src/components/voice/VoiceSettingsToolbar.tsx
 *
 * Persistent Voice Trigger Widget with Triple-Ring Indicator:
 * - Slate: Inactive / Off
 * - Pulsing Sky Blue: Wake-word Standby (Passive listening for "Chef", "Ashley", or Venue Name)
 * - Glowing Emerald: Active Command Recording / Processing
 *
 * Includes Popover Settings & Interactive Natural-Language Macro Simulator.
 */
import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Settings2,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
} from 'lucide-react';
import { useChef } from '../../context/ChefContext';
import { useTriModeVoice } from '../../hooks/useTriModeVoice';
import { VoiceTriggerMode } from '../../types';

export const VoiceSettingsToolbar: React.FC = () => {
  const {
    inventoryItems,
    floorTables,
    shiftRoster,
    prepItems,
    establishmentProfile,
    handleVoiceCommand,
  } = useChef();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [testCommandText, setTestCommandText] = useState('');

  const {
    config,
    setConfig,
    state,
    startListening,
    stopListening,
    simulateCommand,
    isSupported,
  } = useTriModeVoice({
    inventory: inventoryItems,
    tables: floorTables,
    roster: shiftRoster,
    prepList: prepItems,
    onCommandParsed: (result, registerUndo) => {
      handleVoiceCommand(result, registerUndo);
    },
    defaultConfig: {
      mode: 'WAKE_WORD',
      wakeWord: 'Chef',
    },
  });

  const toggleMic = () => {
    if (state === 'IDLE' || state === 'ERROR') {
      startListening();
    } else {
      stopListening();
    }
  };

  const handleModeChange = (mode: VoiceTriggerMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  };

  const handleRunTest = (cmd: string) => {
    simulateCommand(cmd);
    setTestCommandText('');
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Primary Voice Mic Trigger Button with Triple-Ring Status */}
      <button
        onClick={toggleMic}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 select-none ${
          state === 'LISTENING' || state === 'PROCESSING' || state === 'CONFIRMED'
            ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
            : state === 'WAKE_STANDBY'
            ? 'bg-sky-950/80 text-sky-300 border-sky-500/60 shadow-md ring-2 ring-sky-400/30'
            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
        }`}
        title={
          state === 'WAKE_STANDBY'
            ? `Wake-word standby: Say "${config.wakeWord}" to activate`
            : state === 'LISTENING'
            ? 'Listening to command...'
            : 'Click to activate voice engine'
        }
      >
        {/* Animated Soundwave or Mic Icon */}
        <div className="relative">
          {state === 'WAKE_STANDBY' ? (
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 h-3 bg-sky-400 rounded-full animate-pulse" />
              <span className="w-1 h-4 bg-sky-300 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-sky-400 rounded-full animate-pulse delay-150" />
            </div>
          ) : state === 'LISTENING' || state === 'PROCESSING' ? (
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 h-4 bg-emerald-200 rounded-full animate-bounce" />
              <span className="w-1 h-5 bg-white rounded-full animate-bounce delay-75" />
              <span className="w-1 h-3 bg-emerald-200 rounded-full animate-bounce delay-150" />
            </div>
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </div>

        {/* Text Status Badge */}
        <span className="text-xs font-semibold tracking-wide hidden md:inline">
          {state === 'WAKE_STANDBY'
            ? `"${config.wakeWord}" Standby`
            : state === 'LISTENING'
            ? 'Recording...'
            : state === 'PROCESSING'
            ? 'Thinking...'
            : state === 'CONFIRMED'
            ? 'Confirmed ✓'
            : 'Voice'}
        </span>
      </button>

      {/* Voice Engine Settings Trigger */}
      <button
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        title="Voice Engine Settings & Simulator"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {/* Settings & Macro Simulator Popover */}
      {isPopoverOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-slate-900/98 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                Voice Operations Engine
              </h4>
            </div>
            <button
              onClick={() => setIsPopoverOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              ✕
            </button>
          </div>

          {!isSupported && (
            <div className="mt-2.5 p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
              Web Speech API not detected in this browser. You can still test any command using the Natural Language simulator below!
            </div>
          )}

          {/* Trigger Mode Segmented Control */}
          <div className="mt-3">
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5 font-semibold">
              Trigger Mode
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => handleModeChange('MANUAL')}
                className={`py-1.5 rounded-lg font-medium transition-colors ${
                  config.mode === 'MANUAL' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Push-to-Talk
              </button>
              <button
                onClick={() => handleModeChange('WAKE_WORD')}
                className={`py-1.5 rounded-lg font-medium transition-colors ${
                  config.mode === 'WAKE_WORD' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wake-Word
              </button>
              <button
                onClick={() => handleModeChange('CONTINUOUS')}
                className={`py-1.5 rounded-lg font-medium transition-colors ${
                  config.mode === 'CONTINUOUS' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Walkthrough
              </button>
            </div>
          </div>

          {/* Configurable Wake-Word Field */}
          <div className="mt-3">
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5 font-semibold">
              Configured Wake-Word
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {['Chef', 'Ashley', establishmentProfile.name.split(' ')[0]].map((word) => (
                <button
                  key={word}
                  onClick={() => setConfig((prev) => ({ ...prev, wakeWord: word }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    config.wakeWord.toLowerCase() === word.toLowerCase()
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  "{word}"
                </button>
              ))}
            </div>
            <input
              type="text"
              value={config.wakeWord}
              onChange={(e) => setConfig((prev) => ({ ...prev, wakeWord: e.target.value }))}
              placeholder="Custom wake word..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Sound Feedback Toggles */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, isWakeChimeEnabled: !prev.isWakeChimeEnabled }))}
              className="flex items-center gap-2 hover:text-white"
            >
              {config.isWakeChimeEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>Web Audio Chimes</span>
            </button>

            <button
              onClick={() => setConfig((prev) => ({ ...prev, isTtsEnabled: !prev.isTtsEnabled }))}
              className="flex items-center gap-2 hover:text-white"
            >
              {config.isTtsEnabled ? (
                <Volume2 className="w-4 h-4 text-sky-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>Spoken Vocal Responses</span>
            </button>
          </div>

          {/* Natural Language Simulator for Testing */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5 font-semibold">
              Simulate Spoken Macro / Test Command
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={testCommandText}
                onChange={(e) => setTestCommandText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && testCommandText.trim()) {
                    handleRunTest(testCommandText.trim());
                  }
                }}
                placeholder="e.g. Put together a restocking order..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-sky-500"
              />
              <button
                onClick={() => {
                  if (testCommandText.trim()) handleRunTest(testCommandText.trim());
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Test Macro Chips */}
            <div className="mt-2 flex flex-col gap-1 text-[11px]">
              <span className="text-[10px] text-slate-500 font-mono">1-CLICK SAMPLE COMMANDS:</span>
              <button
                onClick={() => handleRunTest('Put together a restocking order')}
                className="text-left px-2 py-1 bg-slate-800/80 hover:bg-slate-800 text-sky-300 rounded border border-slate-700/60 truncate"
              >
                "Put together a restocking order"
              </button>
              <button
                onClick={() => handleRunTest('Generate a menu based on items about to expire')}
                className="text-left px-2 py-1 bg-slate-800/80 hover:bg-slate-800 text-amber-300 rounded border border-slate-700/60 truncate"
              >
                "Generate a menu based on items about to expire"
              </button>
              <button
                onClick={() => handleRunTest('Seat table 4, 4 covers, server Chloe')}
                className="text-left px-2 py-1 bg-slate-800/80 hover:bg-slate-800 text-emerald-300 rounded border border-slate-700/60 truncate"
              >
                "Seat table 4, 4 covers, server Chloe"
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
