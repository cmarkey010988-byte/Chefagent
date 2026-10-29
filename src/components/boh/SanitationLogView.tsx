import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { SanitationLog } from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  Thermometer,
  Droplets,
  Plus,
  CheckCircle2,
  XCircle,
  Sparkles,
  ClipboardCheck,
  X,
  Gauge,
} from 'lucide-react';

export const SanitationLogView: React.FC = () => {
  const { sanitationLogs, logSanitationRecord, inventoryItems, establishmentProfile } = useChef();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [equipmentName, setEquipmentName] = useState('Apex Commercial Dishmachine #1');
  const [washTemp, setWashTemp] = useState(162);
  const [rinseTemp, setRinseTemp] = useState(182);
  const [sanitizerPpm, setSanitizerPpm] = useState(300);
  const [sanitizerType, setSanitizerType] = useState<'QUAT_AMMONIA' | 'CHLORINE' | 'THERMAL_HIGH_TEMP'>('THERMAL_HIGH_TEMP');
  const [testedBy, setTestedBy] = useState('Chef Bruce');
  const [notes, setNotes] = useState('');

  // Calculate chemical levels from inventory
  const detergentItem = inventoryItems.find(
    (i) => i.id === 'inv-chem-1' || i.ingredientName.toLowerCase().includes('dish detergent')
  );
  const rinseItem = inventoryItems.find(
    (i) => i.id === 'inv-chem-2' || i.ingredientName.toLowerCase().includes('rinse dry')
  );
  const sanitizerItem = inventoryItems.find(
    (i) => i.id === 'inv-chem-3' || i.ingredientName.toLowerCase().includes('sanitizer')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // NSF Validation:
    // Thermal High-Temp: wash >= 150°F, rinse >= 180°F
    // Chemical Low-Temp: wash >= 120°F, rinse >= 120°F, Quat 200-400 PPM or Chlorine 50-100 PPM
    let isPassed = false;
    if (sanitizerType === 'THERMAL_HIGH_TEMP') {
      isPassed = washTemp >= 150 && rinseTemp >= 180;
    } else if (sanitizerType === 'QUAT_AMMONIA') {
      isPassed = washTemp >= 120 && sanitizerPpm >= 200 && sanitizerPpm <= 400;
    } else {
      isPassed = washTemp >= 120 && sanitizerPpm >= 50 && sanitizerPpm <= 100;
    }

    logSanitationRecord({
      equipmentName,
      washTemperatureFahrenheit: Number(washTemp),
      rinseTemperatureFahrenheit: Number(rinseTemp),
      sanitizerPpm: Number(sanitizerPpm),
      sanitizerType,
      testedBy,
      isPassed,
      notes: notes.trim() || undefined,
    });

    setIsLogModalOpen(false);
    setNotes('');
  };

  const latestLog = sanitationLogs[0];

  return (
    <div className="space-y-6">
      {/* Top Sanitation Compliance KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Compliance Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">NSF Compliance</span>
            <span className="font-mono text-emerald-400">Health Code Safe</span>
          </div>
          <div className="my-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xl font-black text-white">Active Audit Passed</div>
              <div className="text-xs text-slate-400">180°F NSF High-Temp Verified</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Last logged: {latestLog ? new Date(latestLog.timestamp).toLocaleTimeString() : 'No audits today'}
          </div>
        </div>

        {/* Dishwasher Rinse Temp */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              Rinse Booster Temp
            </span>
            <span className="font-mono text-xs text-amber-400">NSF Min: 180°F</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-white">
              {latestLog ? latestLog.rinseTemperatureFahrenheit : 182}°F
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">
              ✓ Thermal sanitizing pathogen kill threshold reached
            </div>
          </div>
          <div className="text-[11px] text-slate-400">Wash tank: {latestLog ? latestLog.washTemperatureFahrenheit : 160}°F</div>
        </div>

        {/* Sanitizer PPM Check */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              Active Sanitizer PPM
            </span>
            <span className="font-mono text-sky-400">200-400 PPM</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-sky-400">
              {latestLog ? latestLog.sanitizerPpm : 300} <span className="text-sm font-sans font-normal text-slate-400">PPM</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              Multi-Quat / Chlorine sanitizer concentration nominal
            </div>
          </div>
          <div className="text-[11px] text-slate-400">Tested by: {latestLog ? latestLog.testedBy : 'Steward Lead'}</div>
        </div>

        {/* Quick Log Action Button */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Shift Audit Logging
          </div>
          <div className="my-2 text-xs text-slate-300 leading-relaxed">
            Record morning, mid-rush, and closing dishwash temperatures and test strip PPM values.
          </div>
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="w-full min-h-[44px] px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record Warewash Audit</span>
          </button>
        </div>
      </div>

      {/* Non-Food Chemical Stock Monitoring Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Warewash Chemical Reserves & Auto-Decrement Status
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Synced to Chemical Storage</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span className="font-semibold">Solid Dish Detergent Capsule</span>
              <span className="font-mono text-amber-400">
                {detergentItem ? detergentItem.currentOnHandQuantity : 1.2} CASE
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((detergentItem?.currentOnHandQuantity || 1.2) / (detergentItem?.parLevelQuantity || 4)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Par: {detergentItem?.parLevelQuantity || 4} · Reorder: {detergentItem?.reorderPointQuantity || 1}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span className="font-semibold">Solid Rinse Dry Sheeting Agent</span>
              <span className="font-mono text-sky-400">
                {rinseItem ? rinseItem.currentOnHandQuantity : 2.5} CASE
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-sky-400 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((rinseItem?.currentOnHandQuantity || 2.5) / (rinseItem?.parLevelQuantity || 3)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Par: {rinseItem?.parLevelQuantity || 3} · Reorder: {rinseItem?.reorderPointQuantity || 1}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span className="font-semibold">Multi-Quat Sanitizer (2.5 Gal)</span>
              <span className="font-mono text-emerald-400">
                {sanitizerItem ? sanitizerItem.currentOnHandQuantity : 3.0} GAL
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((sanitizerItem?.currentOnHandQuantity || 3.0) / (sanitizerItem?.parLevelQuantity || 4)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Par: {sanitizerItem?.parLevelQuantity || 4} · Reorder: {sanitizerItem?.reorderPointQuantity || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Warewash & Sanitizer Verification History
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{sanitationLogs.length} logs recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Equipment</th>
                <th className="py-2.5 px-3">Wash Temp</th>
                <th className="py-2.5 px-3">Rinse Temp</th>
                <th className="py-2.5 px-3">Sanitizer PPM</th>
                <th className="py-2.5 px-3">Tested By</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Compliance Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {sanitationLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 font-sans font-bold text-white">{log.equipmentName}</td>
                  <td className="py-3 px-3">
                    <span className={log.washTemperatureFahrenheit >= 150 ? 'text-emerald-400' : 'text-amber-400'}>
                      {log.washTemperatureFahrenheit}°F
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={log.rinseTemperatureFahrenheit >= 180 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {log.rinseTemperatureFahrenheit}°F
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sky-400">{log.sanitizerPpm} PPM</td>
                  <td className="py-3 px-3 font-sans text-slate-300">{log.testedBy}</td>
                  <td className="py-3 px-3">
                    {log.isPassed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                        <XCircle className="w-3.5 h-3.5" /> RE-TEST
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-400 max-w-xs truncate">
                    {log.notes || 'Routine shift audit verified.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sanitation Log Entry Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Record Dishwash & Sanitizer Audit</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Equipment Station
                </label>
                <input
                  type="text"
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Wash Temp (°F)
                  </label>
                  <input
                    type="number"
                    value={washTemp}
                    onChange={(e) => setWashTemp(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-400"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Target: 150°F–165°F</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Rinse Temp (°F)
                  </label>
                  <input
                    type="number"
                    value={rinseTemp}
                    onChange={(e) => setRinseTemp(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-400"
                    required
                  />
                  <span className="text-[10px] text-emerald-400 mt-0.5 block">NSF Min: 180°F</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sanitizer Type
                  </label>
                  <select
                    value={sanitizerType}
                    onChange={(e) => setSanitizerType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="THERMAL_HIGH_TEMP">Thermal (High-Temp Booster)</option>
                    <option value="QUAT_AMMONIA">Quaternary Ammonia (Strip)</option>
                    <option value="CHLORINE">Chlorine Chemical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sanitizer Concentration (PPM)
                  </label>
                  <input
                    type="number"
                    value={sanitizerPpm}
                    onChange={(e) => setSanitizerPpm(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-400"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Quat: 200–400 PPM</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auditor / Steward Lead
                </label>
                <input
                  type="text"
                  value={testedBy}
                  onChange={(e) => setTestedBy(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Log Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Machine descaled, clean screens reinstalled"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all"
                >
                  Save Sanitation Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
