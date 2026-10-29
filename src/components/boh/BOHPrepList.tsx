import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { Station, PrepItem } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Zap,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Trash2,
} from 'lucide-react';

const STATIONS: Station[] = ['ALL', 'Sauce/Sauté', 'Butchery', 'Garde Manger', 'Pastry'];

export const BOHPrepList: React.FC = () => {
  const {
    prepItems,
    togglePrepItem,
    addPrepItem,
    deletePrepItem,
    resetPrepItems,
    quickAssist,
    isQuickAssistLoading,
    terminology,
  } = useChef();

  const [activeStation, setActiveStation] = useState<Station>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Quick Assist input state
  const [quickQuery, setQuickQuery] = useState('');
  const [quickResult, setQuickResult] = useState<{ answer: string; latencyMs: number } | null>(null);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('5.0');
  const [newItemUnit, setNewItemUnit] = useState('Portions');
  const [newItemStation, setNewItemStation] = useState<PrepItem['stationAssignment']>('Sauce/Sauté');
  const [newItemPriority, setNewItemPriority] = useState<1 | 2 | 3>(2);
  const [newItemCook, setNewItemCook] = useState('Chef Bruce');

  const filteredItems = prepItems.filter((item) => {
    if (activeStation === 'ALL') return true;
    return item.stationAssignment === activeStation;
  });

  const totalCount = filteredItems.length;
  const completedCount = filteredItems.filter((i) => i.isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleQuickAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    const res = await quickAssist(quickQuery, activeStation !== 'ALL' ? activeStation : 'Kitchen Line');
    setQuickResult(res);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addPrepItem({
      recipeId: `custom-${Date.now()}`,
      recipeName: newItemName.trim(),
      targetQuantity: parseFloat(newItemQty) || 1,
      completedQuantity: 0,
      unitOfMeasure: newItemUnit,
      stationAssignment: newItemStation,
      priorityLevel: newItemPriority,
      isCompleted: false,
      assignedCookName: newItemCook,
    });

    setNewItemName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Station Selector Bar & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        {/* Station Filter Tabs (Touch Targets >= 48px) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATIONS.map((st) => {
            const count =
              st === 'ALL'
                ? prepItems.length
                : prepItems.filter((i) => i.stationAssignment === st).length;
            const isSelected = activeStation === st;

            return (
              <button
                key={st}
                type="button"
                onClick={() => setActiveStation(st)}
                className={`min-h-[46px] px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 select-none ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold ${
                    isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shift Progress Gauge & Action Buttons */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {terminology.prepCardTitle}
            </div>
            <div className="text-xl font-black font-mono text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">{completedCount}</span>
              <span className="text-slate-600">/</span>
              <span>{totalCount} Done</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {progressPercent}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[46px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all select-none"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Prep Item</span>
          </button>
        </div>
      </div>

      {/* Low-Latency Quick Line Triage Bar (gemini-3.1-flash-lite) */}
      <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-3.5 shadow-md">
        <form onSubmit={handleQuickAssist} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-amber-400 shrink-0 font-bold text-xs uppercase tracking-wide">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>Low-Latency Line Triage:</span>
          </div>

          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="e.g. Broken beurre blanc fix? Prime rib probe temp? Halibut searing oil?"
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={isQuickAssistLoading}
            className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-2 shrink-0 select-none"
          >
            {isQuickAssistLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span>Ask Lite AI</span>
          </button>
        </form>

        {quickResult && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-amber-500/20 text-xs text-slate-200 flex items-start gap-2 animate-fadeIn">
            <div className="text-amber-400 font-bold shrink-0 mt-0.5">LINE ADVICE:</div>
            <div className="flex-1 font-medium">{quickResult.answer}</div>
            <div className="font-mono text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
              ⚡ {quickResult.latencyMs}ms
            </div>
          </div>
        )}
      </div>

      {/* Prep Items List (Massive 64px–88px Cards for Gloves & Apron Operation, Responsive for Tablet 1920x1200) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredItems.map((item) => {
          const isPriority1 = item.priorityLevel === 1;

          return (
            <div
              key={item.id}
              onClick={() => togglePrepItem(item.id)}
              className={`min-h-[84px] p-4 rounded-2xl border transition-all duration-150 cursor-pointer select-none flex items-center justify-between gap-4 relative overflow-hidden group ${
                item.isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/50 text-slate-300'
                  : isPriority1
                  ? 'bg-slate-900 border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-500/5'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Left Color Accent Stripe */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-2 ${
                  item.isCompleted
                    ? 'bg-emerald-500'
                    : isPriority1
                    ? 'bg-amber-500'
                    : 'bg-slate-700'
                }`}
              />

              <div className="flex items-center gap-3.5 pl-2 flex-1 min-w-0">
                {/* Touch Checkbox */}
                <div className="shrink-0">
                  {item.isCompleted ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl border-2 border-slate-600 flex items-center justify-center text-slate-500 group-hover:border-amber-400 transition-colors">
                      <Circle className="w-5 h-5 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Recipe & Task Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-black text-base truncate tracking-tight ${
                        item.isCompleted
                          ? 'line-through text-slate-400'
                          : 'text-slate-100 group-hover:text-amber-300 transition-colors'
                      }`}
                    >
                      {item.recipeName}
                    </h3>

                    {isPriority1 && !item.isCompleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Banquet Critical
                      </span>
                    )}
                  </div>

                  {/* Metadata line without pill clutter */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="text-amber-400 font-semibold">{item.stationAssignment}</span>
                    <span className="text-slate-600">·</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {item.assignedCookName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Quantity Display (Tabular Figures) */}
              <div className="text-right shrink-0">
                <div className="font-mono text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  {item.targetQuantity}{' '}
                  <span className="text-xs font-bold text-amber-400 font-sans">{item.unitOfMeasure}</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  {item.isCompleted ? '✓ 100% Prepared' : 'Target Yield'}
                </div>
              </div>

              {/* Delete trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePrepItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-400 transition-opacity"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-slate-200">Station Mise en Place Complete!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              All prep items for <span className="text-amber-400 font-bold">{activeStation}</span> have been completed for dinner service.
            </p>
            <button
              onClick={resetPrepItems}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 inline-flex items-center gap-2 border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default Seed Prep
            </button>
          </div>
        )}
      </div>

      {/* Add Prep Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <h2 className="text-lg font-bold text-amber-400 mb-4">Add Station Prep Order</h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Dish / Prep Item Name
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Saffron Leek Reduction"
                  className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Target Yield Qty
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="GAL, Portions, LB, QT"
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Station Assignment
                  </label>
                  <select
                    value={newItemStation}
                    onChange={(e) => setNewItemStation(e.target.value as any)}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm focus:border-amber-400 focus:outline-hidden"
                  >
                    <option value="Sauce/Sauté">Sauce/Sauté</option>
                    <option value="Butchery">Butchery</option>
                    <option value="Garde Manger">Garde Manger</option>
                    <option value="Pastry">Pastry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Cook Assigned
                  </label>
                  <input
                    type="text"
                    value={newItemCook}
                    onChange={(e) => setNewItemCook(e.target.value)}
                    placeholder="Chef Bruce"
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Priority
                </label>
                <div className="flex gap-2">
                  {[
                    { level: 1, label: '1 - Banquet Critical' },
                    { level: 2, label: '2 - Standard Par' },
                    { level: 3, label: '3 - Low' },
                  ].map((p) => (
                    <button
                      key={p.level}
                      type="button"
                      onClick={() => setNewItemPriority(p.level as any)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                        newItemPriority === p.level
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  Add to Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
