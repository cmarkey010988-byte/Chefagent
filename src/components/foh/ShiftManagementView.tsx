import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { ShiftRosterItem, ShiftRole } from '../../types';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Calendar,
  Phone,
  Flame,
  Plus,
  Edit2,
  FileText,
  BadgeAlert,
  X,
} from 'lucide-react';

export const ShiftManagementView: React.FC = () => {
  const {
    shiftRoster,
    toggleClockIn,
    preShiftHandoff,
    updatePreShiftHandoff,
    eightySixList,
    terminology,
  } = useChef();

  const [activeTab, setActiveTab] = useState<'roster' | 'briefing'>('briefing');
  const [newSpecialInput, setNewSpecialInput] = useState('');
  const [newVipInput, setNewVipInput] = useState('');
  const [newDietaryInput, setNewDietaryInput] = useState('');

  const clockedInCount = shiftRoster.filter((s) => s.isClockedIn).length;
  const totalStaffCount = shiftRoster.length;

  const handleAddSpecial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialInput.trim()) return;
    updatePreShiftHandoff({
      dailySpecials: [...preShiftHandoff.dailySpecials, newSpecialInput.trim()],
    });
    setNewSpecialInput('');
  };

  const handleAddVip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVipInput.trim()) return;
    updatePreShiftHandoff({
      vipNotes: [...preShiftHandoff.vipNotes, newVipInput.trim()],
    });
    setNewVipInput('');
  };

  const handleAddDietary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDietaryInput.trim()) return;
    updatePreShiftHandoff({
      dietaryAlerts: [...preShiftHandoff.dietaryAlerts, newDietaryInput.trim()],
    });
    setNewDietaryInput('');
  };

  const removeSpecial = (idx: number) => {
    updatePreShiftHandoff({
      dailySpecials: preShiftHandoff.dailySpecials.filter((_, i) => i !== idx),
    });
  };

  const removeVip = (idx: number) => {
    updatePreShiftHandoff({
      vipNotes: preShiftHandoff.vipNotes.filter((_, i) => i !== idx),
    });
  };

  const removeDietary = (idx: number) => {
    updatePreShiftHandoff({
      dietaryAlerts: preShiftHandoff.dietaryAlerts.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
              Shift Operations
            </span>
            <span className="text-xs text-slate-500">
              {preShiftHandoff.date} · {preShiftHandoff.serviceShift} Service
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Labor Roster & Pre-Shift Briefing
          </h2>
        </div>

        <div className="p-1 bg-white border border-slate-200 rounded-xl flex items-center shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('briefing')}
            className={`min-h-[42px] px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'briefing'
                ? 'bg-indigo-900 text-white font-black shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pre-Shift Handoff Card</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`min-h-[42px] px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-indigo-900 text-white font-black shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Team Roster ({clockedInCount}/{totalStaffCount})</span>
          </button>
        </div>
      </div>

      {activeTab === 'briefing' ? (
        /* Pre-Shift Handoff Card View */
        <div className="space-y-6">
          {/* Executive Briefing Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-700" />
                  <span>Executive Service Briefing & Line Notes</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-shift alignment for kitchen line cooks, banquet staff, and floor servers.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                Shift Status: ACTIVE LINE
              </span>
            </div>

            {/* General Forecast Banner */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 leading-relaxed font-medium">
              <span className="font-bold">Service Directive: </span>
              {preShiftHandoff.generalNotes}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 86 List & Inventory Warnings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      86 / Depletion List (Live Sync)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    {eightySixList.length} items flagged
                  </span>
                </div>

                <div className="space-y-2">
                  {eightySixList.length > 0 ? (
                    eightySixList.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs font-medium flex items-center justify-between"
                      >
                        <span>{item}</span>
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-700">
                          DO NOT SELL
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                      No critical food shortages active.
                    </div>
                  )}
                </div>
              </div>

              {/* Critical Dietary & Allergy Alerts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BadgeAlert className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Dietary & Allergen Safety
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    High Alert
                  </span>
                </div>

                <div className="space-y-2">
                  {preShiftHandoff.dietaryAlerts.map((diet, idx) => (
                    <div
                      key={idx}
                      className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3 text-xs font-medium flex items-center justify-between group"
                    >
                      <span>{diet}</span>
                      <button
                        type="button"
                        onClick={() => removeDietary(idx)}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <form onSubmit={handleAddDietary} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="+ Add table dietary warning..."
                      value={newDietaryInput}
                      onChange={(e) => setNewDietaryInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* Daily Culinary Specials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Chef Specials & Features
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {preShiftHandoff.dailySpecials.length} features
                  </span>
                </div>

                <div className="space-y-2">
                  {preShiftHandoff.dailySpecials.map((spec, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-semibold flex items-center justify-between group"
                    >
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => removeSpecial(idx)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <form onSubmit={handleAddSpecial} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="+ Add daily special item..."
                      value={newSpecialInput}
                      onChange={(e) => setNewSpecialInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* VIP Guests & Occasions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      VIP Members & Special Occasions
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {preShiftHandoff.vipNotes.length} notes
                  </span>
                </div>

                <div className="space-y-2">
                  {preShiftHandoff.vipNotes.map((vip, idx) => (
                    <div
                      key={idx}
                      className="bg-indigo-50/50 border border-indigo-100 text-indigo-950 rounded-xl p-3 text-xs font-medium flex items-center justify-between group"
                    >
                      <span>{vip}</span>
                      <button
                        type="button"
                        onClick={() => removeVip(idx)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <form onSubmit={handleAddVip} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="+ Add VIP guest / anniversary note..."
                      value={newVipInput}
                      onChange={(e) => setNewVipInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Station Assignments Matrix */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Shift Station Command Matrix
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {preShiftHandoff.stationAssignments.map((stn, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="text-[10px] text-slate-500 font-bold uppercase truncate">
                      {stn.stationOrSection}
                    </div>
                    <div className="text-xs font-black text-slate-900 mt-1 truncate">
                      {stn.staffName}
                    </div>
                    <div className="text-[10px] text-indigo-700 font-medium truncate">{stn.role}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Team Shift Roster & Clock-In Grid */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Active Shift Roster & Time Clock
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor team arrivals, station assignments, and clock-in durations.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
              {clockedInCount} of {totalStaffCount} On Duty
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Station / Section</th>
                  <th className="py-3 px-4">Scheduled Hours</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Clock Status</th>
                  <th className="py-3 px-4 text-right">Time Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shiftRoster.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{emp.employeeName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-medium text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {emp.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{emp.stationOrSection}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {emp.startTime} - {emp.endTime}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{emp.phone || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {emp.isClockedIn ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Clocked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Off Duty
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleClockIn(emp.id)}
                        className={`min-h-[38px] px-3.5 rounded-lg text-xs font-bold transition-all ${
                          emp.isClockedIn
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {emp.isClockedIn ? 'Clock Out' : 'Clock In'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
