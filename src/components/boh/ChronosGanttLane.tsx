/**
 * src/components/boh/ChronosGanttLane.tsx
 *
 * Horizontal Station Gantt Timeline View with the dynamic Crimson Burn Line (#EF4444).
 * Renders station swimlanes (Butchery, Sauce/Sauté, Garde Manger, Grill, Pastry)
 * with task blocks positioned according to their reverse-calculated targetFireTimestamp.
 */
import React from 'react';
import { ChronosTimelineItem, Station } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Flame } from 'lucide-react';

interface ChronosGanttLaneProps {
  items: ChronosTimelineItem[];
  selectedStation: Station;
  currentTime: number;
  targetPlatingTimestamp: number;
  onToggleComplete: (id: string) => void;
}

const STATIONS: Station[] = ['Butchery', 'Sauce/Sauté', 'Garde Manger', 'Grill', 'Pastry'];

export const ChronosGanttLane: React.FC<ChronosGanttLaneProps> = ({
  items,
  selectedStation,
  currentTime,
  targetPlatingTimestamp,
  onToggleComplete,
}) => {
  // Timeline spans from earliest fire time (or 2 hours ago) to target plating + 30m
  const windowStart = Math.min(...items.map((i) => i.targetFireTimestamp), currentTime - 30 * 60 * 1000);
  const windowEnd = Math.max(targetPlatingTimestamp + 15 * 60 * 1000, currentTime + 90 * 60 * 1000);
  const totalWindowDuration = Math.max(1, windowEnd - windowStart);

  // Time divisions every 15 minutes
  const timeMarkers: number[] = [];
  const startQuarter = Math.floor(windowStart / (15 * 60 * 1000)) * (15 * 60 * 1000);
  for (let t = startQuarter; t <= windowEnd; t += 15 * 60 * 1000) {
    timeMarkers.push(t);
  }

  // Calculate percentage position of the live Burn Line
  const burnLinePercent = Math.min(
    100,
    Math.max(0, ((currentTime - windowStart) / totalWindowDuration) * 100)
  );

  const displayStations = selectedStation === 'ALL' ? STATIONS : [selectedStation];

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-x-auto text-white">
      {/* Time Header with 15-Minute Divisions */}
      <div className="min-w-[850px] relative pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold text-rose-400 uppercase">Live Burn Line: {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Target Plating: <strong className="text-white">{new Date(targetPlatingTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
            <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-amber-400">15m Staging Buffers Enforced</span>
          </div>
        </div>

        {/* Time Marker Tick Bar */}
        <div className="relative h-6 flex justify-between text-[11px] font-mono text-slate-400">
          {timeMarkers.map((time) => {
            const leftPct = ((time - windowStart) / totalWindowDuration) * 100;
            if (leftPct < 0 || leftPct > 100) return null;
            return (
              <div
                key={time}
                style={{ left: `${leftPct}%` }}
                className="absolute -translate-x-1/2 flex flex-col items-center"
              >
                <span>{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="w-px h-2 bg-slate-700 mt-0.5" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Swimlanes Container with Moving Burn Line */}
      <div className="min-w-[850px] relative mt-4 space-y-4">
        {/* Dynamic Crimson Burn Line Overlay */}
        <div
          style={{ left: `${burnLinePercent}%` }}
          className="absolute top-0 bottom-0 z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center"
        >
          {/* Burn Line Tag */}
          <div className="bg-rose-600 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow-lg shadow-rose-600/50 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-300 animate-bounce" />
            <span>BURN LINE</span>
          </div>
          {/* Vertical Red Line */}
          <div className="w-0.5 flex-1 bg-linear-to-b from-rose-500 via-rose-600 to-rose-700 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
        </div>

        {/* Station Swimlanes */}
        {displayStations.map((station) => {
          const stationItems = items.filter((i) => i.stationAssignment === station);

          return (
            <div
              key={station}
              className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 relative min-h-[90px]"
            >
              <div className="text-xs font-mono uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
                <span>{station}</span>
                <span className="text-[10px] text-slate-400 font-normal">{stationItems.length} tasks scheduled</span>
              </div>

              {/* Task track */}
              <div className="relative h-14 w-full bg-slate-950/60 rounded-lg border border-slate-800/60 overflow-hidden">
                {stationItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic">
                    No prep tasks scheduled for this station
                  </div>
                ) : (
                  stationItems.map((item) => {
                    const startPct = Math.max(0, ((item.targetFireTimestamp - windowStart) / totalWindowDuration) * 100);
                    const durationMillis = item.estimatedDurationMinutes * 60 * 1000;
                    const widthPct = Math.max(8, (durationMillis / totalWindowDuration) * 100);

                    // Urgency styling
                    const isOverdue = item.urgencyStatus === 'CRITICAL_BURN_OVERDUE';
                    const isApproaching = item.urgencyStatus === 'APPROACHING_BURN_LINE';
                    const isDone = item.isCompleted;

                    return (
                      <div
                        key={item.id}
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                        }}
                        onClick={() => onToggleComplete(item.id)}
                        className={`absolute top-1.5 bottom-1.5 rounded-lg px-2.5 py-1 text-xs cursor-pointer select-none transition-all flex flex-col justify-between overflow-hidden shadow-md group ${
                          isDone
                            ? 'bg-emerald-950/80 border border-emerald-600/70 text-emerald-200'
                            : isOverdue
                            ? 'bg-rose-950/90 border-2 border-rose-500 text-rose-100 animate-pulse shadow-rose-900/50'
                            : isApproaching
                            ? 'bg-amber-950/90 border-2 border-amber-500 text-amber-100 ring-2 ring-amber-500/30'
                            : 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-500'
                        }`}
                        title={`${item.recipeName} · Fire: ${new Date(item.targetFireTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${item.estimatedDurationMinutes}m)`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate text-[11px] leading-tight">
                            {item.recipeName}
                          </span>
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isOverdue ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
                          ) : isApproaching ? (
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span>
                            {new Date(item.targetFireTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-semibold text-white">
                            {item.targetQuantity} {item.unitOfMeasure}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
