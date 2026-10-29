/**
 * src/components/executive/ExecutiveWorkflowHUD.tsx
 *
 * High-contrast, top-floating executive processing banner for automated restocking
 * and expiration menu generation workflows.
 */
import React, { useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react';
import { useChef } from '../../context/ChefContext';

export const ExecutiveWorkflowHUD: React.FC = () => {
  const { executiveToast, dismissExecutiveToast } = useChef();

  useEffect(() => {
    if (executiveToast?.autoDismissMs) {
      const timer = setTimeout(() => {
        dismissExecutiveToast();
      }, executiveToast.autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [executiveToast, dismissExecutiveToast]);

  if (!executiveToast) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92vw] sm:w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl p-4 text-white">
        <div className="flex items-start gap-3.5">
          {/* Stage Indicator Icon */}
          <div className="mt-0.5 shrink-0">
            {executiveToast.stage === 'ANALYZING' && (
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {executiveToast.stage === 'SYNTHESIZING' && (
              <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            )}
            {executiveToast.stage === 'COMPLETED' && (
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {executiveToast.stage === 'ERROR' && (
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-sky-400">
                AI Executive Workflow
              </span>
              {executiveToast.stage === 'ANALYZING' && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                  PROCESSING
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white mt-0.5 truncate">{executiveToast.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
              {executiveToast.subtitle}
            </p>

            {/* Action button if provided */}
            {executiveToast.actionLabel && executiveToast.onAction && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    executiveToast.onAction?.();
                    dismissExecutiveToast();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                >
                  <span>{executiveToast.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={dismissExecutiveToast}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
