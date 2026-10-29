/**
 * src/components/foh/FOHVoiceOverlay.tsx
 *
 * Floating HUD displaying live voice transcripts, confirmed operational intents,
 * and a 5-second non-blocking Undo action banner.
 */
import React from 'react';
import { RotateCcw, CheckCircle2, Mic } from 'lucide-react';
import { VoiceUndoAction } from '../../types';

interface FOHVoiceOverlayProps {
  transcript?: string;
  isListening?: boolean;
  activeUndo?: VoiceUndoAction | null;
  onUndo?: () => void;
}

export const FOHVoiceOverlay: React.FC<FOHVoiceOverlayProps> = ({
  transcript,
  isListening,
  activeUndo,
  onUndo,
}) => {
  if (!transcript && !isListening && !activeUndo) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92vw] sm:w-full animate-in fade-in slide-in-from-bottom-3 duration-150 pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 text-white pointer-events-auto">
        {/* Undo Card if an action was executed recently */}
        {activeUndo ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                  Action Executed
                </div>
                <div className="text-xs font-bold text-white truncate">{activeUndo.description}</div>
              </div>
            </div>

            <button
              onClick={onUndo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition-colors shrink-0 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo (5s)</span>
            </button>
          </div>
        ) : transcript ? (
          /* Live Hearing Transcript */
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <Mic className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                Listening...
              </div>
              <div className="text-xs text-slate-200 truncate italic">"{transcript}"</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
