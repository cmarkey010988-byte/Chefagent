import React, { useState } from 'react';
import { useChef } from '../context/ChefContext';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';

export const PinModal: React.FC = () => {
  const { isPinModalOpen, setIsPinModalOpen, confirmPinAndSwitch } = useChef();
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);

  if (!isPinModalOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setHasError(false);

      if (nextPin.length === 4) {
        const success = confirmPinAndSwitch(nextPin);
        if (!success) {
          setHasError(true);
          setTimeout(() => {
            setPin('');
            setHasError(false);
          }, 800);
        } else {
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setHasError(false);
  };

  const handleClear = () => {
    setPin('');
    setHasError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={() => {
            setIsPinModalOpen(false);
            setPin('');
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Executive FOH Access</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter 4-digit manager PIN to unlock costing, margin analytics, and inventory par audits.
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  hasError
                    ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/50'
                    : isFilled
                    ? 'bg-amber-400 scale-110 shadow-md shadow-amber-400/40'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {hasError && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 mb-4 animate-shake">
            <AlertCircle className="w-4 h-4" />
            <span>Invalid Manager PIN. Try again.</span>
          </div>
        )}

        {/* Keypad Grid (Touch-friendly 60px buttons for terminal kiosks) */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700/60 text-xl font-bold font-mono transition-colors flex items-center justify-center select-none"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700/60 text-xl font-bold font-mono transition-colors flex items-center justify-center select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider transition-colors"
          >
            Del
          </button>
        </div>

        {/* Demo Hint */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-amber-400/80">
            <KeyRound className="w-3.5 h-3.5" /> Default PIN: <strong className="font-mono text-amber-300">1234</strong>
          </span>
          <button
            onClick={() => confirmPinAndSwitch('1234')}
            className="text-slate-400 hover:text-slate-200 underline"
          >
            Quick Fill
          </button>
        </div>
      </div>
    </div>
  );
};
