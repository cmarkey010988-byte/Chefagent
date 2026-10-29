/**
 * src/components/inventory/AuditDiffModal.tsx
 *
 * Side-by-side reconciliation screen for AI Vision Shelf-Counting.
 * Provides color-coded variance badges:
 * - Emerald for count increase (+)
 * - Rose for count decrease (-)
 * - Slate for matching count (=)
 *
 * Ensures human-in-the-loop verification before atomic commit to local storage.
 */
import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit2,
  Check,
  Eye,
} from 'lucide-react';
import { useChef } from '../../context/ChefContext';
import { ReconciliationDiffItem } from '../../types';

export const AuditDiffModal: React.FC = () => {
  const {
    activeVisionScanDiff,
    setActiveVisionScanDiff,
    applyVisionAuditDiff,
    setIsVisionScanModalOpen,
  } = useChef();

  const [diffItems, setDiffItems] = useState<ReconciliationDiffItem[]>(() => {
    return activeVisionScanDiff || [];
  });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<number>(0);

  if (!activeVisionScanDiff || activeVisionScanDiff.length === 0) {
    return null;
  }

  // Toggle item inclusion
  const toggleItemAcceptance = (itemId: string) => {
    setDiffItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, isAccepted: !item.isAccepted } : item))
    );
  };

  // Discard an item completely
  const discardItem = (itemId: string) => {
    setDiffItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  // Save inline edit
  const saveInlineEdit = (itemId: string) => {
    setDiffItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const delta = Math.round((editVal - item.previousCount) * 10) / 10;
          const deltaPercent =
            item.previousCount > 0 ? Math.round((delta / item.previousCount) * 100) : 100;
          let status: 'INCREASE' | 'DECREASE' | 'MATCH' = 'MATCH';
          if (delta > 0.1) status = 'INCREASE';
          else if (delta < -0.1) status = 'DECREASE';

          return {
            ...item,
            detectedCount: editVal,
            editedCount: editVal,
            delta,
            deltaPercent,
            status,
            isAccepted: true,
          };
        }
        return item;
      })
    );
    setEditingItemId(null);
  };

  const handleApplyVerifiedCounts = () => {
    applyVisionAuditDiff(diffItems);
    setIsVisionScanModalOpen(false);
  };

  const acceptedCount = diffItems.filter((d) => d.isAccepted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">AI Vision Reconciliation Diff</h3>
                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                  HUMAN-IN-THE-LOOP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Review detected inventory counts before committing to on-hand records
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveVisionScanDiff(null)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Table List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {diffItems.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-sm">
              No detected items remaining in reconciliation list.
            </div>
          ) : (
            diffItems.map((item) => {
              const isEditing = editingItemId === item.itemId;

              return (
                <div
                  key={item.itemId}
                  className={`border rounded-xl p-3.5 sm:p-4 transition-all ${
                    item.isAccepted
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-slate-900/50 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Item Information */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.isAccepted}
                        onChange={() => toggleItemAcceptance(item.itemId)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 mt-1 cursor-pointer"
                        title="Include in count commit"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{item.ingredientName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.storageLocation}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.visualNotes}</p>
                      </div>
                    </div>

                    {/* Counts & Diff Badge */}
                    <div className="flex items-center gap-4 shrink-0 pl-7 sm:pl-0">
                      {/* Previous Count */}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-mono uppercase">Previous</div>
                        <div className="text-xs font-semibold text-slate-300 font-mono">
                          {item.previousCount} {item.unitOfMeasure}
                        </div>
                      </div>

                      {/* Detected / Edited Count */}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-mono uppercase">Detected</div>
                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <input
                              type="number"
                              step="0.5"
                              value={editVal}
                              onChange={(e) => setEditVal(parseFloat(e.target.value) || 0)}
                              className="w-16 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => saveInlineEdit(item.itemId)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
                            <span>
                              {item.editedCount ?? item.detectedCount} {item.unitOfMeasure}
                            </span>
                            <button
                              onClick={() => {
                                setEditingItemId(item.itemId);
                                setEditVal(item.editedCount ?? item.detectedCount);
                              }}
                              className="text-slate-400 hover:text-sky-300 p-0.5"
                              title="Edit detected count"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Color-Coded Diff Variance Badge */}
                      <div className="w-28 text-center">
                        {item.status === 'INCREASE' && (
                          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{item.delta}</span>
                            <span className="text-[10px] font-normal">({item.deltaPercent}%)</span>
                          </div>
                        )}
                        {item.status === 'DECREASE' && (
                          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-400 px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>{item.delta}</span>
                            <span className="text-[10px] font-normal">({item.deltaPercent}%)</span>
                          </div>
                        )}
                        {item.status === 'MATCH' && (
                          <div className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1">
                            <Minus className="w-3.5 h-3.5" />
                            <span>0.0 (Match)</span>
                          </div>
                        )}
                      </div>

                      {/* Discard row */}
                      <button
                        onClick={() => discardItem(item.itemId)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Discard this item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span className="text-white font-bold">{acceptedCount}</span> of{' '}
            <span className="text-slate-300">{diffItems.length}</span> items selected for update.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveVisionScanDiff(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyVerifiedCounts}
              disabled={acceptedCount === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Verified Counts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
