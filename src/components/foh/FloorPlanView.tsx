import React, { useState, useEffect } from 'react';
import { useChef } from '../../context/ChefContext';
import { TableStatus, TableServiceStatus, DiningSection } from '../../types';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Coffee,
  Sparkles,
  RefreshCw,
  Plus,
  Utensils,
  CreditCard,
  Trash2,
  X,
  ChefHat,
  Filter,
} from 'lucide-react';

const SECTIONS: Array<{ id: DiningSection | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Floor Sections' },
  { id: 'Main Dining Room', label: 'Main Dining Room' },
  { id: 'Patio & Terrace', label: 'Patio & Terrace' },
  { id: 'Bar Lounge', label: 'Bar Lounge' },
  { id: 'Private Dining Room', label: 'Private Dining' },
];

export const FloorPlanView: React.FC = () => {
  const {
    floorTables,
    updateTableStatus,
    seatTable,
    resetTable,
    eightySixList,
    terminology,
    establishmentProfile,
  } = useChef();

  const [activeSection, setActiveSection] = useState<DiningSection | 'ALL'>('ALL');
  const [selectedTableForSeating, setSelectedTableForSeating] = useState<TableStatus | null>(null);
  const [coversInput, setCoversInput] = useState(2);
  const [serverInput, setServerInput] = useState('Chloe M.');
  const [notesInput, setNotesInput] = useState('');

  // Clock tick to refresh elapsed minutes
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  const filteredTables = floorTables.filter(
    (t) => activeSection === 'ALL' || t.section === activeSection
  );

  const totalSeats = floorTables.reduce((acc, t) => acc + t.capacity, 0);
  const activeCovers = floorTables.reduce((acc, t) => acc + t.currentCovers, 0);
  const seatedTablesCount = floorTables.filter((t) => t.status !== 'VACANT' && t.status !== 'DIRTY').length;
  const occupancyPct = totalSeats > 0 ? Math.round((activeCovers / totalSeats) * 100) : 0;

  const handleOpenSeatModal = (table: TableStatus) => {
    setSelectedTableForSeating(table);
    setCoversInput(table.capacity);
    setServerInput(table.serverName || 'Chloe M.');
    setNotesInput(table.notes || '');
  };

  const handleConfirmSeating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForSeating) return;

    seatTable(
      selectedTableForSeating.tableId,
      Number(coversInput),
      serverInput.trim() || undefined,
      notesInput.trim() || undefined
    );

    setSelectedTableForSeating(null);
  };

  const getStatusBadge = (status: TableServiceStatus) => {
    switch (status) {
      case 'VACANT':
        return { label: 'Vacant / Open', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'SEATED':
        return { label: 'Seated / Starters', bg: 'bg-sky-50 text-sky-800 border-sky-200 font-bold' };
      case 'ENTREE_PHASE':
        return { label: 'Entree Phase', bg: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' };
      case 'CHECK_DROPPED':
        return { label: 'Check Dropped', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold' };
      case 'DIRTY':
        return { label: 'Dirty / Needs Bus', bg: 'bg-rose-50 text-rose-800 border-rose-200 font-bold' };
    }
  };

  const getElapsedMinutes = (seatedTimestamp?: number) => {
    if (!seatedTimestamp) return null;
    const diffMs = Date.now() - seatedTimestamp;
    return Math.max(1, Math.floor(diffMs / 60000));
  };

  return (
    <div className="space-y-6">
      {/* Live 86-List Warning Banner */}
      {eightySixList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Live Kitchen 86 & Depletion Alert
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                  {eightySixList.length} Items Low
                </span>
              </div>
              <div className="text-xs text-amber-800 font-medium mt-0.5">
                {eightySixList.join(' · ')}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 shrink-0 font-medium">
            Notify servers & host stand before seating
          </div>
        </div>
      )}

      {/* Top Floor Metrics & Pacing Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Seated Covers Metric */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">
              Active {terminology.guestPluralLabel}
            </span>
            <span className="font-mono text-indigo-700 font-bold">{occupancyPct}% Floor Turn</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {activeCovers}{' '}
              <span className="text-sm font-sans font-normal text-slate-400">
                / {totalSeats} seats
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>Seated Tables:</span>
            <span className="font-mono font-bold text-slate-800">{seatedTablesCount} of {floorTables.length}</span>
          </div>
        </div>

        {/* Turn Pacing & Line Flow */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Kitchen Pacing</span>
            <span className="font-mono text-xs text-emerald-600 font-bold">Optimal Rate</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              12 <span className="text-sm font-sans font-normal text-slate-400">covers / 15m</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Maintains steady ticket injection without saute line bottlenecks.
            </div>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            ✓ Line cook ticket turnaround target: 14 mins
          </div>
        </div>

        {/* Overdue Turn Warning */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Turn Velocity
            </span>
            <span className="font-mono text-xs text-slate-500">Target: 75m</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {floorTables.filter((t) => (getElapsedMinutes(t.seatedTimestamp) || 0) > 60).length}
              <span className="text-sm font-sans font-normal text-slate-400"> tables &gt; 60m</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Prompt server dessert / check drop to free tables.
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Average dining duration: 52 minutes
          </div>
        </div>

        {/* Reset Floor Action */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Floor Management
          </div>
          <div className="my-2 text-xs text-slate-600 leading-relaxed">
            Quick status progression: tap table cards to cycle service phases or assign servers.
          </div>
          <button
            type="button"
            onClick={() => {
              const dirtyTables = floorTables.filter((t) => t.status === 'DIRTY');
              dirtyTables.forEach((t) => resetTable(t.tableId));
            }}
            className="w-full min-h-[44px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-slate-600" />
            <span>Reset All Dirty Tables ({floorTables.filter((t) => t.status === 'DIRTY').length})</span>
          </button>
        </div>
      </div>

      {/* Floor Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SECTIONS.map((sec) => {
          const count = floorTables.filter((t) => sec.id === 'ALL' || t.section === sec.id).length;
          const isSelected = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`min-h-[48px] px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border shrink-0 ${
                isSelected
                  ? 'bg-indigo-900 border-indigo-900 text-white font-black shadow-md'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{sec.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-white/20 text-white font-black' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Table Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const statusBadge = getStatusBadge(table.status);
          const elapsed = getElapsedMinutes(table.seatedTimestamp);
          const isOverdue = (elapsed || 0) > 60;

          return (
            <div
              key={table.tableId}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                table.status === 'SEATED'
                  ? 'border-sky-300 ring-1 ring-sky-200'
                  : table.status === 'ENTREE_PHASE'
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : table.status === 'CHECK_DROPPED'
                  ? 'border-indigo-300 ring-1 ring-indigo-200'
                  : table.status === 'DIRTY'
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Table Header: Name, Capacity & Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      {table.tableName}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {table.section} · {table.capacity}-Top
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded border ${statusBadge.bg}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* Table Content & Service Details */}
                <div className="space-y-2 py-2 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{terminology.guestLabel}s Seated:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {table.currentCovers} / {table.capacity}
                    </span>
                  </div>

                  {table.serverName && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Server:</span>
                      <span className="font-semibold text-slate-800">{table.serverName}</span>
                    </div>
                  )}

                  {elapsed !== null && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> Seated Timer:
                      </span>
                      <span
                        className={`font-mono font-bold text-xs ${
                          isOverdue ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {elapsed} min {isOverdue && '(!)'}
                      </span>
                    </div>
                  )}

                  {table.notes && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                      "{table.notes}"
                    </div>
                  )}

                  {table.activeAlerts && table.activeAlerts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {table.activeAlerts.map((alt, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons (>= 48dp ergonomics) */}
              <div className="mt-4 pt-2 flex items-center gap-2">
                {table.status === 'VACANT' && (
                  <button
                    type="button"
                    onClick={() => handleOpenSeatModal(table)}
                    className="flex-1 min-h-[44px] px-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    <span>Seat Table</span>
                  </button>
                )}

                {table.status === 'SEATED' && (
                  <button
                    type="button"
                    onClick={() => updateTableStatus(table.tableId, 'ENTREE_PHASE')}
                    className="flex-1 min-h-[44px] px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Advance to Entree</span>
                  </button>
                )}

                {table.status === 'ENTREE_PHASE' && (
                  <button
                    type="button"
                    onClick={() => updateTableStatus(table.tableId, 'CHECK_DROPPED')}
                    className="flex-1 min-h-[44px] px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Drop Check</span>
                  </button>
                )}

                {table.status === 'CHECK_DROPPED' && (
                  <button
                    type="button"
                    onClick={() => updateTableStatus(table.tableId, 'DIRTY')}
                    className="flex-1 min-h-[44px] px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Guest Departed (Dirty)</span>
                  </button>
                )}

                {table.status === 'DIRTY' && (
                  <button
                    type="button"
                    onClick={() => resetTable(table.tableId)}
                    className="flex-1 min-h-[44px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Bus & Reset Vacant</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seating Modal */}
      {selectedTableForSeating && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Seat {selectedTableForSeating.tableName}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedTableForSeating.section} · Capacity: {selectedTableForSeating.capacity} {terminology.guestLabel}s
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableForSeating(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSeating} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seated {terminology.guestLabel} Headcount
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedTableForSeating.capacity + 2}
                  value={coversInput}
                  onChange={(e) => setCoversInput(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Server
                </label>
                <input
                  type="text"
                  value={serverInput}
                  onChange={(e) => setServerInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guest Notes & Dietary Alerts
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anniversary celebration, strict gluten-free seat 1"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTableForSeating(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  Confirm Table Seating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
