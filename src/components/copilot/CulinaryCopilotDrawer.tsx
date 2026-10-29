import React, { useState, useRef, useEffect } from 'react';
import { useChef } from '../../context/ChefContext';
import { CopilotRole } from '../../types';
import {
  Sparkles,
  X,
  Send,
  Zap,
  Trash2,
  Bot,
  User,
  Clock,
  ChevronDown,
  Layers,
  ChefHat,
  TrendingUp,
  Calendar,
} from 'lucide-react';

export const CulinaryCopilotDrawer: React.FC = () => {
  const {
    copilotOpen,
    setCopilotOpen,
    copilotRole,
    setCopilotRole,
    selectedModel,
    setSelectedModel,
    chatMessages,
    isChatLoading,
    sendChatMessage,
    clearChat,
  } = useChef();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (copilotOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, copilotOpen]);

  if (!copilotOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    const msg = input.trim();
    setInput('');
    await sendChatMessage(msg);
  };

  const promptSuggestions = [
    {
      role: 'SOUS_CHEF',
      text: 'What is the exact internal resting temp curve for Prime Rib to ensure a 130°F medium-rare center?',
    },
    {
      role: 'SOUS_CHEF',
      text: 'Calculate gross butcher weight needed for 350 filet cuts at 8 oz portions with 8% trim loss.',
    },
    {
      role: 'FOH_CONTROLLER',
      text: 'Our Governors Roast Beef is at 29.8% FCP. Recommend 3 concrete adjustments to bring it below 28%.',
    },
    {
      role: 'BANQUET_MASTER',
      text: 'Draft a 45-minute plating line orchestration schedule for a 350-cover dual-entree gala dinner.',
    },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-slideIn">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
              <span>Culinary Copilot</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Multi-Turn
              </span>
            </h3>
            <div className="text-[11px] text-slate-400">Back & Front of House Operations AI</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearChat}
            title="Clear Chat History"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCopilotOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Role & Model Selectors Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 space-y-2.5 text-xs">
        {/* Role Selector */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Active Persona:
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'SOUS_CHEF', label: 'Line Sous-Chef', icon: ChefHat },
              { id: 'FOH_CONTROLLER', label: 'F&B Controller', icon: TrendingUp },
              { id: 'BANQUET_MASTER', label: 'Banquet Master', icon: Calendar },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = copilotRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setCopilotRole(r.id as CopilotRole)}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gemini Model Switcher */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Gemini Engine:
            </label>
            <span className="text-[10px] text-amber-400/90 font-mono">
              {selectedModel === 'gemini-3.1-flash-lite' && '⚡ Sub-second latency line queries'}
              {selectedModel === 'gemini-3.8-flash' && '🧑‍🍳 Versatile culinary assistance'}
              {selectedModel === 'gemini-4-argon' && '🧠 Complex yield & financial math'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 font-mono text-[11px]">
            {[
              { id: 'gemini-3.1-flash-lite', label: '3.1 Flash Lite', tag: 'Fast' },
              { id: 'gemini-3.8-flash', label: '3.8 Flash', tag: 'General' },
              { id: 'gemini-4-argon', label: '4 Argon', tag: 'Complex' },
            ].map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id as any)}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-between border transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-amber-300 border-amber-500/60 shadow-xs'
                      : 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{m.label}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase ${
                      isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {m.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-xs shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-xs whitespace-pre-wrap'
                }`}
              >
                {msg.content}

                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Model: {msg.modelUsed || selectedModel}</span>
                    {msg.latencyMs && (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Zap className="w-3 h-3" />
                        {msg.latencyMs}ms
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isChatLoading && (
          <div className="flex items-center gap-2.5 text-xs text-amber-400 p-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span>Reasoning with {selectedModel}...</span>
              <span className="animate-pulse">● ● ●</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        {promptSuggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendChatMessage(s.text)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:text-white shrink-0 max-w-[260px] truncate transition-colors text-left"
          >
            {s.text}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${copilotRole === 'SOUS_CHEF' ? 'Sous-Chef' : 'F&B Copilot'} (${selectedModel})...`}
          className="flex-1 h-11 bg-slate-900 border border-slate-800 rounded-xl px-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isChatLoading}
          className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all select-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
