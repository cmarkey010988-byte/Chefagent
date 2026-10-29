import React, { useState, useEffect } from 'react';
import { useChef } from '../../context/ChefContext';
import { BOHStation, Station, WasteReason, PrepItem, ChronosLayoutMode } from '../../types';
import {
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Plus,
  Scale,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  Filter,
  User,
  X,
  Volume2,
  Mic,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ChronosGanttLane } from './ChronosGanttLane';
import { ChronosCountdownFeed } from './ChronosCountdownFeed';
import { reverseScheduleChronosTimeline } from '../../utils/ChronosScheduler';
import { useAmbientKitchenListener } from '../../hooks/useAmbientKitchenListener';

const STATIONS: Array<{ id: BOHStation | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Stations' },
  { id: 'Sauce/Sauté', label: 'Sauce / Sauté' },
  { id: 'Butchery', label: 'Butchery' },
  { id: 'Garde Manger', label: 'Garde Manger' },
  { id: 'Grill', label: 'Grill' },
  { id: 'Pastry', label: 'Pastry' },
  { id: 'Dishwash/Sanitation', label: 'Dishwash' },
];

export const StationPrepBoard: React.FC = () => {
  const {
    prepItems,
    togglePrepItem,
    addPrepItem,
    wasteLogs,
    logFoodWaste,
    inventoryItems,
    establishmentProfile,
    floorTables,
    updateTableStatus,
    auditInventoryItem,
  } = useChef();

  // Chronos Acoustic Orchestration Engine State
  const [viewMode, setViewMode] = useState<'CHRONOS' | 'STANDARD'>('CHRONOS');
  const [chronosLayout, setChronosLayout] = useState<ChronosLayoutMode>('GANTT');
  const [targetPlatingTime, setTargetPlatingTime] = useState<number>(() => Date.now() + 2 * 60 * 60 * 1000);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [isAmbientListenerActive, setIsAmbientListenerActive] = useState<boolean>(true);

  // Live wall-clock tick to advance the Crimson Burn Line every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Ambient Acoustic Kitchen Listener
  const { isListening, audioLevel, lastDetectedCall, triggerSimulatedCall } = useAmbientKitchenListener({
    isEnabled: isAmbientListenerActive,
    onKitchenCallDetected: (intentType, rawPayload) => {
      if (intentType === 'FIRE_TABLE') {
        const tblNum = rawPayload.length === 1 ? `0${rawPayload}` : rawPayload;
        const targetTable = floorTables.find((t) => t.tableName.endsWith(tblNum) || t.tableId.endsWith(tblNum));
        if (targetTable) {
          updateTableStatus(targetTable.tableId, 'ENTREE_PHASE');
        }
      } else if (intentType === 'MARK_86') {
        const lower = rawPayload.toLowerCase();
        const matched = inventoryItems.find((i) => i.ingredientName.toLowerCase().includes(lower));
        if (matched) {
          auditInventoryItem(matched.id, 0);
        }
      } else if (intentType === 'PUSH_EVENT') {
        // Dynamically push the target plating deadline by +15 minutes
        setTargetPlatingTime((prev) => prev + 15 * 60 * 1000);
      }
    },
  });

  // Reverse-calculated Chronos timeline schedule (100% offline DAG calculation)
  const chronosSchedule = reverseScheduleChronosTimeline(
    prepItems,
    targetPlatingTime,
    undefined,
    currentTime
  );

  const [activeStation, setActiveStation] = useState<BOHStation | 'ALL'>('ALL');
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New task form state
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskQty, setNewTaskQty] = useState(10);
  const [newTaskUnit, setNewTaskUnit] = useState('Portions');
  const [newTaskStation, setNewTaskStation] = useState<BOHStation>('Sauce/Sauté');
  const [newTaskPriority, setNewTaskPriority] = useState<1 | 2 | 3>(2);
  const [newTaskCook, setNewTaskCook] = useState('Chef Bruce');

  // Waste form state
  const [selectedIngredientId, setSelectedIngredientId] = useState(inventoryItems[0]?.id || '');
  const [wasteQty, setWasteQty] = useState(0.5);
  const [wasteReason, setWasteReason] = useState<WasteReason>('TRIM_LOSS');
  const [wasteCook, setWasteCook] = useState('Chef Bruce');
  const [wasteNotes, setWasteNotes] = useState('');

  const selectedInventoryItem = inventoryItems.find((i) => i.id === selectedIngredientId);
  const calculatedWasteCost = selectedInventoryItem
    ? Math.round(selectedInventoryItem.unitCost * wasteQty * 100) / 100
    : 0;

  // Filter prep items by station
  const filteredItems = prepItems.filter((item) => {
    if (activeStation === 'ALL') return true;
    if (activeStation === 'Grill') {
      return item.stationAssignment === 'Butchery' || item.recipeName.toLowerCase().includes('grill');
    }
    if (activeStation === 'Dishwash/Sanitation') {
      return item.stationAssignment === 'Dishwash/Sanitation';
    }
    return item.stationAssignment === activeStation;
  });

  const completedCount = filteredItems.filter((i) => i.isCompleted).length;
  const totalCount = filteredItems.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const totalWasteDollars = wasteLogs.reduce((acc, log) => acc + log.costImpact, 0);

  const handleCreatePrepItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    addPrepItem({
      recipeId: `rec-custom-${Date.now()}`,
      recipeName: newTaskName.trim(),
      targetQuantity: Number(newTaskQty) || 1,
      completedQuantity: 0,
      unitOfMeasure: newTaskUnit,
      stationAssignment: newTaskStation as any,
      priorityLevel: newTaskPriority,
      isCompleted: false,
      assignedCookName: newTaskCook,
    });

    setNewTaskName('');
    setIsNewTaskModalOpen(false);
  };

  const handleLogWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId || wasteQty <= 0) return;

    logFoodWaste(selectedIngredientId, Number(wasteQty), wasteReason, wasteCook, wasteNotes);
    setIsWasteModalOpen(false);
    setWasteNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Station Performance & Quick Action Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Line Execution</span>
            <span className="font-mono text-amber-400">{completedCount} of {totalCount} Done</span>
          </div>
          <div className="my-3">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-3xl font-black font-mono tracking-tight text-white">{progressPct}%</span>
              <span className="text-xs text-slate-400 font-medium">Shift Completion</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Critical Par items remaining:</span>
            <span className="font-mono font-bold text-amber-400">
              {filteredItems.filter((i) => !i.isCompleted && i.priorityLevel === 1).length}
            </span>
          </div>
        </div>

        {/* Batch Yield Scaling Multiplier */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              Batch Yield Scaling
            </span>
            <span className="font-mono text-xs text-slate-400">×{scaleMultiplier}</span>
          </div>
          <div className="my-2 flex items-center gap-1.5">
            {[1, 1.5, 2, 3].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => setScaleMultiplier(mult)}
                className={`flex-1 min-h-[44px] rounded-xl text-xs font-mono font-bold transition-all border ${
                  scaleMultiplier === mult
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-400">
            Quantities auto-scaled for active shift turnout.
          </div>
        </div>

        {/* Shift Waste Cost Metric */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Shift Waste & Trim
            </span>
            <span className="font-mono text-rose-400">{wasteLogs.length} logged</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-rose-400">
              {establishmentProfile.currencySymbol}{totalWasteDollars.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Deducted atomically from live inventory par counts.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWasteModalOpen(true)}
            className="w-full min-h-[40px] px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>+ Log Food Waste & Trim</span>
          </button>
        </div>

        {/* Rapid New Prep Task Trigger */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Station Task Routing
          </div>
          <div className="my-2 text-xs text-slate-300 leading-relaxed">
            Dispatch rapid custom prep tasks directly to station lines with 64dp touch checkboxes.
          </div>
          <button
            type="button"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="w-full min-h-[44px] px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Station Prep Card</span>
          </button>
        </div>
      </div>

      {/* Chronos Acoustic Orchestration Engine Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Main Mode & Layout Selection Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: View Mode & Dual Layout Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Chronos vs Standard */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('CHRONOS')}
                className={`min-h-[44px] px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  viewMode === 'CHRONOS'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Chronos Reverse Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('STANDARD')}
                className={`min-h-[44px] px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  viewMode === 'STANDARD'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Station Cards Grid</span>
              </button>
            </div>

            {/* Chronos Sub-layout Toggle (Gantt vs Countdown) */}
            {viewMode === 'CHRONOS' && (
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChronosLayout('GANTT')}
                  className={`min-h-[44px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    chronosLayout === 'GANTT'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>↔ Horizontal Gantt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChronosLayout('COUNTDOWN')}
                  className={`min-h-[44px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    chronosLayout === 'COUNTDOWN'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>↕ Urgency Countdown</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Plating Target & Dynamic Crimson Burn Line Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Banquet Plating Deadline Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">
                Target Plating:
              </span>
              {[
                { label: '+1h', ms: 60 * 60 * 1000 },
                { label: '+2h (Gala)', ms: 2 * 60 * 60 * 1000 },
                { label: '+3h (Rush)', ms: 3 * 60 * 60 * 1000 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setTargetPlatingTime(Date.now() + opt.ms)}
                  className="px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700/60 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Dynamic Crimson Burn Line Clock Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                Burn Line:
              </span>
              <span className="font-mono font-black text-red-200">
                {new Date(currentTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Ambient Acoustic Kitchen Listener HUD Strip */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Listener Indicator & Toggle */}
            <button
              type="button"
              onClick={() => setIsAmbientListenerActive((prev) => !prev)}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                isAmbientListenerActive
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <Mic className={`w-4 h-4 ${isAmbientListenerActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{isAmbientListenerActive ? 'Ambient Listener: ON' : 'Ambient Listener: OFF'}</span>
            </button>

            {/* RMS Audio Meter */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">RMS Level:</span>
              <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    audioLevel > 60
                      ? 'bg-amber-400'
                      : audioLevel > 20
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.max(8, audioLevel)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400">{audioLevel}%</span>
            </div>

            {/* Last Heard Vernacular Chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-medium">Acoustic Bus:</span>
              <span className="font-mono text-amber-300 font-semibold truncate max-w-[220px]">
                {lastDetectedCall || 'Awaiting calls ("Fire Table [X]", "86 [Item]", "Push [Event]")'}
              </span>
            </div>
          </div>

          {/* Quick Vernacular Triggers (Hands-Free Simulation) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
              Test Triggers:
            </span>
            <button
              type="button"
              onClick={() => triggerSimulatedCall('Fire Table 4')}
              className="px-2.5 py-1 min-h-[36px] rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Fire T4</span>
            </button>
            <button
              type="button"
              onClick={() => triggerSimulatedCall('86 Duck Breast')}
              className="px-2.5 py-1 min-h-[36px] rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors flex items-center gap-1"
            >
              <span>86 Duck</span>
            </button>
            <button
              type="button"
              onClick={() => triggerSimulatedCall('Push Banquet')}
              className="px-2.5 py-1 min-h-[36px] rounded-lg text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 transition-colors flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Push (+15m)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Station Navigation Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STATIONS.map((stn) => {
          const count = prepItems.filter(
            (i) => stn.id === 'ALL' || i.stationAssignment === stn.id
          ).length;
          const isSelected = activeStation === stn.id;
          return (
            <button
              key={stn.id}
              type="button"
              onClick={() => setActiveStation(stn.id)}
              className={`min-h-[48px] px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border shrink-0 ${
                isSelected
                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{stn.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-black/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Viewport Content: Chronos Timeline vs Standard Prep Cards */}
      {viewMode === 'CHRONOS' ? (
        <div className="space-y-4">
          {chronosLayout === 'GANTT' ? (
            <ChronosGanttLane
              items={chronosSchedule.items}
              selectedStation={activeStation as Station}
              currentTime={currentTime}
              targetPlatingTimestamp={targetPlatingTime}
              onToggleComplete={togglePrepItem}
            />
          ) : (
            <ChronosCountdownFeed
              items={chronosSchedule.items}
              selectedStation={activeStation as Station}
              currentTime={currentTime}
              onToggleComplete={togglePrepItem}
            />
          )}
        </div>
      ) : (
        /* Standard Station Prep Cards Grid (Tactile OLED with >= 64dp hit areas) */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const scaledTarget = Math.round(item.targetQuantity * scaleMultiplier * 10) / 10;
              return (
                <div
                  key={item.id}
                  className={`bg-slate-900 border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                    item.isCompleted
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : item.priorityLevel === 1
                      ? 'border-amber-500/50 bg-slate-900/90 shadow-md shadow-amber-500/5'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header Meta: Station & Priority */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-amber-400 font-bold uppercase tracking-wide">
                          {item.stationAssignment}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {item.assignedCookName}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          item.priorityLevel === 1
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.priorityLevel === 2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.priorityLevel === 1 ? 'Critical Priority' : item.priorityLevel === 2 ? 'Standard Par' : 'Low Par'}
                      </span>
                    </div>

                    {/* Recipe Item Name */}
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                      {item.recipeName}
                    </h3>
                  </div>

                  {/* Action Area: Scaling, Quantity & Checkbox Button (>= 64dp Touch Target) */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-slate-400">Target Production</div>
                      <div className="text-lg font-black font-mono text-white">
                        {scaledTarget}{' '}
                        <span className="text-xs font-sans text-slate-400 font-normal">
                          {item.unitOfMeasure}
                        </span>
                      </div>
                    </div>

                    {/* 64dp Touch Button */}
                    <button
                      type="button"
                      onClick={() => togglePrepItem(item.id)}
                      className={`min-h-[56px] min-w-[140px] px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none active:scale-95 ${
                        item.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      }`}
                    >
                      {item.isCompleted ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Ready / Done</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-5 h-5 text-slate-950" />
                          <span>Mark Ready</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Flame className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
              <p className="font-bold text-slate-200">No active prep cards for this station.</p>
              <p className="text-xs text-slate-500 mt-1">Tap 'Add Station Prep Card' to route new mise en place.</p>
            </div>
          )}
        </>
      )}

      {/* Waste & Trim History Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Waste, Spoilage & Trim Logs
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Total Loss: {establishmentProfile.currencySymbol}{totalWasteDollars.toFixed(2)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Ingredient Item</th>
                <th className="py-2.5 px-3">Qty Lost</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Logged By</th>
                <th className="py-2.5 px-3 text-right">Cost Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {wasteLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-bold text-white">
                    {log.ingredientName}
                  </td>
                  <td className="py-2.5 px-3">
                    {log.quantity} {log.unit}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-sans font-semibold">
                      {log.reason.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-300">{log.loggedBy}</td>
                  <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                    -{establishmentProfile.currencySymbol}{log.costImpact.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waste Logging Modal */}
      {isWasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black text-white">Log Food Waste & Trim Loss</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWasteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogWasteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ingredient from Inventory
                </label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                >
                  {inventoryItems
                    .filter((i) => i.itemType === 'FOOD_INGREDIENT' && !i.isArchived)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ingredientName} ({item.currentOnHandQuantity} {item.unitOfMeasure} in stock · {establishmentProfile.currencySymbol}{item.unitCost}/{item.unitOfMeasure})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Waste Quantity ({selectedInventoryItem?.unitOfMeasure || 'units'})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={wasteQty}
                    onChange={(e) => setWasteQty(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Loss Reason
                  </label>
                  <select
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value as WasteReason)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="TRIM_LOSS">Trim Loss / Fabrication</option>
                    <option value="EXPIRED_SPOILAGE">Expired Spoilage</option>
                    <option value="LINE_DROP">Line Drop / Floor Spillage</option>
                    <option value="OVER_PORTION">Over-portioning</option>
                    <option value="QUALITY_REJECT">Quality / Burn Reject</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono">
                <span className="text-xs text-slate-400 font-sans">Estimated Cost Impact:</span>
                <span className="text-base font-black text-rose-400">
                  -{establishmentProfile.currencySymbol}{calculatedWasteCost.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Responsible Cook / Steward
                </label>
                <input
                  type="text"
                  value={wasteCook}
                  onChange={(e) => setWasteCook(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Station Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Silver-skin discard during tenderloin medallion fabrication"
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWasteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black shadow-md transition-all"
                >
                  Confirm & Deduct Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Prep Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Add Station Prep Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrepItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prep Item / Task Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Herb-Dijon Marinade for Halibut"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTaskQty}
                    onChange={(e) => setNewTaskQty(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={newTaskUnit}
                    onChange={(e) => setNewTaskUnit(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Station Assignment
                  </label>
                  <select
                    value={newTaskStation}
                    onChange={(e) => setNewTaskStation(e.target.value as BOHStation)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="Sauce/Sauté">Sauce / Sauté</option>
                    <option value="Butchery">Butchery</option>
                    <option value="Garde Manger">Garde Manger</option>
                    <option value="Grill">Grill</option>
                    <option value="Pastry">Pastry</option>
                    <option value="Dishwash/Sanitation">Dishwash / Sanitation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value={1}>1 - Critical Priority</option>
                    <option value={2}>2 - Standard Par</option>
                    <option value={3}>3 - Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Line Cook
                </label>
                <input
                  type="text"
                  value={newTaskCook}
                  onChange={(e) => setNewTaskCook(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all"
                >
                  Route to Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
