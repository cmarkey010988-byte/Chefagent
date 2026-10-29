/**
 * src/components/boh/ChronosCountdownFeed.tsx
 *
 * Vertical Chronos Countdown Schedule with moving Burn Line divider.
 * Orders tasks chronologically by minutes until fire (T-45m, T-12m, T+5m OVERDUE),
 * highlighting prerequisite dependencies and featuring single-tap completion targets (>= 64dp).
 */
import React from 'react';
import { ChronosTimelineItem, Station } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Flame, ChefHat, Link2 } from 'lucide-react';

interface ChronosCountdownFeedProps {
  items: ChronosTimelineItem[];
  selectedStation: Station;
  currentTime: number;
  onToggleComplete: (id: string) => void;
}

export const ChronosCountdownFeed: React.FC<ChronosCountdownFeedProps> = ({
  items,
  selectedStation,
  currentTime,
  onToggleComplete,
}) => {
  const filteredItems = items.filter(
    (item) => selectedStation === 'ALL' || item.stationAssignment === selectedStation
  );

  // Split into past Burn Line (overdue) and upcoming items
  const pastBurnLineItems = filteredItems.filter(
    (item) => !item.isCompleted && item.minutesToBurnLine < 0
  );
  const upcomingItems = filteredItems.filter(
    (item) => item.isCompleted || item.minutesToBurnLine >= 0
  );

  return (
    <div className="space-y-4 text-white">
      {/* Overdue Alert Banner if past burn line tasks exist */}
      {pastBurnLineItems.length > 0 && (
        <div className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-rose-950/40 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-200 uppercase tracking-wide">
                {pastBurnLineItems.length} Prep Task{pastBurnLineItems.length > 1 ? 's' : ''} Past the Burn Line
              </h4>
              <p className="text-xs text-rose-300">
                Line execution lead times breached. Prioritize immediate finish to prevent service delay.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-rose-900 border border-rose-400 rounded-lg text-rose-100">
            EMERGENCY PRIORITY
          </span>
        </div>
      )}

      {/* Overdue Section */}
      {pastBurnLineItems.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase font-bold text-rose-400 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>BREACHED TASKS (PAST BURN LINE)</span>
          </div>
          {pastBurnLineItems.map((item) => (
            <ChronosTaskRow
              key={item.id}
              item={item}
              allItems={items}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}

      {/* Real-Time Crimson Burn Line Divider */}
      <div className="relative py-2 flex items-center justify-center">
        <div className="absolute inset-x-0 h-0.5 bg-linear-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
        <div className="relative bg-rose-600 border border-rose-400 text-white text-[10px] font-black font-mono px-3 py-1 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1.5 z-10">
          <Flame className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>CURRENT BURN LINE: {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Upcoming & Completed Section */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
          <span>UPCOMING LINE TIMELINE</span>
          <span className="text-[11px] text-slate-400">{upcomingItems.length} tasks queued</span>
        </div>

        {upcomingItems.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No upcoming prep tasks queued for this station.
          </div>
        ) : (
          upcomingItems.map((item) => (
            <ChronosTaskRow
              key={item.id}
              item={item}
              allItems={items}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface ChronosTaskRowProps {
  item: ChronosTimelineItem;
  allItems: ChronosTimelineItem[];
  onToggleComplete: (id: string) => void;
}

const ChronosTaskRow: React.FC<ChronosTaskRowProps> = ({ item, allItems, onToggleComplete }) => {
  const isDone = item.isCompleted;
  const isOverdue = item.urgencyStatus === 'CRITICAL_BURN_OVERDUE';
  const isApproaching = item.urgencyStatus === 'APPROACHING_BURN_LINE';

  // Find prerequisite names
  const prerequisiteNames = item.dependencies
    .map((depId) => allItems.find((i) => i.id === depId)?.recipeName)
    .filter(Boolean);

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-5 transition-all shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isDone
          ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
          : isOverdue
          ? 'bg-rose-950/70 border-2 border-rose-500 shadow-rose-950/50'
          : isApproaching
          ? 'bg-amber-950/70 border-2 border-amber-500 shadow-amber-950/40 ring-1 ring-amber-500/30'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          {/* Station Badge */}
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
            {item.stationAssignment}
          </span>

          {/* Chronos Stage Badge */}
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold border border-sky-800/50">
            {item.chronosStage.replace('_', ' ')}
          </span>

          {/* Assigned Cook */}
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <ChefHat className="w-3.5 h-3.5 text-slate-400" />
            <span>{item.assignedCookName}</span>
          </span>
        </div>

        {/* Task Title */}
        <h4 className={`text-base font-bold tracking-tight truncate ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
          {item.recipeName}
        </h4>

        {/* Quantity and Target Fire */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 font-mono">
          <span>Target: <strong className="text-white">{item.targetQuantity} {item.unitOfMeasure}</strong></span>
          <span>·</span>
          <span>Lead Time: <strong className="text-amber-400">{item.estimatedDurationMinutes} min</strong></span>
          <span>·</span>
          <span>Fire At: <strong className="text-sky-300">{new Date(item.targetFireTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
        </div>

        {/* Dependency linkages */}
        {prerequisiteNames.length > 0 && (
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
            <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-300">Prerequisites:</span>
            <span className="text-slate-400 italic truncate">{prerequisiteNames.join(' → ')}</span>
          </div>
        )}
      </div>

      {/* Right Urgency Badge & Single-Tap Action Button (>= 64dp touch target) */}
      <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
        {/* Countdown Pill */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Countdown</div>
          <div
            className={`text-sm font-black font-mono ${
              isDone
                ? 'text-emerald-400'
                : isOverdue
                ? 'text-rose-400 animate-pulse'
                : isApproaching
                ? 'text-amber-400 font-bold'
                : 'text-slate-300'
            }`}
          >
            {isDone
              ? 'COMPLETED ✓'
              : isOverdue
              ? `T+${Math.abs(item.minutesToBurnLine)}m LATE`
              : `T-${item.minutesToBurnLine}m`}
          </div>
        </div>

        {/* 64dp Touch Target Button */}
        <button
          onClick={() => onToggleComplete(item.id)}
          className={`min-h-[56px] sm:min-h-[64px] min-w-[130px] px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
            isDone
              ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              : isOverdue
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 ring-2 ring-rose-400'
              : isApproaching
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
          }`}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mark Active</span>
            </>
          ) : (
            <>
              <span>Complete</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
