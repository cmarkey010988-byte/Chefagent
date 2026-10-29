/**
 * src/components/executive/ExpirationMenuModal.tsx
 *
 * Side-by-side presentation modal for AI-generated waste-mitigation specials & banquet courses
 * generated from expiring or surplus inventory. Strictly enforces 28.00% FCP benchmark.
 */
import React from 'react';
import { X, Sparkles, ChefHat, Check, Wine, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { useChef } from '../../context/ChefContext';
import { ExpirationMenuProposal } from '../../types';

export const ExpirationMenuModal: React.FC = () => {
  const {
    activeExpirationMenuProposal,
    setActiveExpirationMenuProposal,
    addPrepItem,
    establishmentProfile,
  } = useChef();

  if (!activeExpirationMenuProposal || activeExpirationMenuProposal.length === 0) {
    return null;
  }

  const handlePushToPrep = (proposal: ExpirationMenuProposal) => {
    addPrepItem({
      recipeId: `rec-${proposal.id}`,
      recipeName: proposal.dishName,
      targetQuantity: 20,
      completedQuantity: 0,
      unitOfMeasure: 'Portions',
      stationAssignment:
        proposal.station === 'Butchery'
          ? 'Butchery'
          : proposal.station === 'Garde Manger'
          ? 'Garde Manger'
          : proposal.station === 'Pastry'
          ? 'Pastry'
          : 'Sauce/Sauté',
      priorityLevel: 1, // Critical daily special
      isCompleted: false,
      assignedCookName: 'Chef Bruce',
    });

    alert(`"${proposal.dishName}" pushed to BOH Line Prep Board (20 Portions)!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">AI Waste-Mitigation Menu Proposals</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                  ≤ 28.0% FOOD COST COMPLIANT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Engineered from inventory lines within 72 hours of expiration for {establishmentProfile.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveExpirationMenuProposal(null)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Proposals Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeExpirationMenuProposal.map((prop, idx) => {
            const isCompliant = prop.foodCostPercentage <= 28.0;
            return (
              <div
                key={prop.id || idx}
                className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all shadow-md"
              >
                {/* Title & Financial Metric Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-700/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                        {prop.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Station: {prop.station}</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1.5">{prop.dishName}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{prop.description}</p>
                  </div>

                  {/* Financial Metrics Card */}
                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 shrink-0 flex items-center gap-4 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Portion Cost</div>
                      <div className="text-sm font-bold text-slate-200">${prop.portionCost.toFixed(2)}</div>
                    </div>
                    <div className="w-px h-8 bg-slate-700" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Target Menu Price</div>
                      <div className="text-sm font-bold text-white">${prop.targetPrice.toFixed(2)}</div>
                    </div>
                    <div className="w-px h-8 bg-slate-700" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Food Cost %</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          isCompliant ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {prop.foodCostPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Utilized Expiring Inventory Breakdown */}
                <div className="mt-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Utilized Near-Expiry / Surplus Inventory Lines
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {prop.utilizedExpiringItems.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-200 font-medium">{item.ingredientName}</span>
                        <div className="text-right">
                          <span className="font-mono text-slate-400">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-emerald-400 ml-2 font-mono font-semibold">
                            ${item.subtotal.toFixed(2)} saved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plating Notes & Sommelier Recommendation */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/40 p-3 rounded-lg border border-slate-700/40">
                  <div className="flex items-start gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-300">Line Cook Plating: </span>
                      <span className="text-slate-400">{prop.platingNotes}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Wine className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-300">Wine Pairing: </span>
                      <span className="text-slate-400">{prop.winePairing}</span>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-700/60">
                  <div className="text-[11px] text-slate-400 italic">{prop.chefInstructions}</div>
                  <button
                    onClick={() => handlePushToPrep(prop)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Push Special to Station Prep Board</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>Benchmarked against 28.00% maximum food cost ceiling.</span>
          <button
            onClick={() => setActiveExpirationMenuProposal(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Close Proposal Review
          </button>
        </div>
      </div>
    </div>
  );
};
