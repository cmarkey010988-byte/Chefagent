import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { OnHandMenuProposal } from '../../types';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Check,
  Flame,
  ChefHat,
  Wine,
  DollarSign,
  Package,
  Layers,
  Clock,
  Send,
  Zap,
} from 'lucide-react';

export const OnHandMenuGeneratorView: React.FC = () => {
  const {
    activeProfile,
    inventoryItems,
    onHandMenuProposals,
    isGeneratingOnHandMenu,
    generateOnHandMenu,
    acceptAndPushToPrep,
  } = useChef();

  const isBOH = activeProfile === 'BOH_KITCHEN';
  const [acceptedId, setAcceptedId] = useState<string | null>(null);

  // Compute surplus inventory metrics (strictly culinary food ingredients)
  const surplusItems = inventoryItems
    .filter(
      (i) =>
        (!i.itemType || i.itemType === 'FOOD_INGREDIENT') &&
        !i.isArchived &&
        i.currentOnHandQuantity > i.reorderPointQuantity
    )
    .map((i) => {
      const surplusQty = Math.max(0, i.currentOnHandQuantity - i.reorderPointQuantity);
      const dollarSurplus = surplusQty * i.unitCost;
      return {
        ...i,
        surplusQty,
        dollarSurplus,
      };
    })
    .sort((a, b) => b.dollarSurplus - a.dollarSurplus);

  const totalSurplusValue = surplusItems.reduce((sum, i) => sum + i.dollarSurplus, 0);

  const handlePush = (proposal: OnHandMenuProposal) => {
    const result = acceptAndPushToPrep(proposal);
    if (result.success) {
      setAcceptedId(proposal.id);
      setTimeout(() => setAcceptedId(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Surplus Inventory Radar Header */}
      <div
        className={`rounded-2xl border p-5 shadow-xl transition-all ${
          isBOH
            ? 'bg-slate-900 border-amber-500/30 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                  isBOH
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                Par-to-Plate AI Engine
              </span>
              <span className="text-xs font-mono text-slate-400">
                gemini-4-argon · 28.00% FCP Benchmark
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Surplus On-Hand Menu Optimization
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Analyzes real-time inventory surpluses above par, calculates dollar capital tied up in walk-in coolers and dry prep, and crafts mathematically validated, high-margin specials.
            </p>
          </div>

          {/* Surplus Metrics & Generate Button */}
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Surplus Capital
              </span>
              <div className="text-2xl font-black font-mono text-emerald-500">
                ${totalSurplusValue.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {surplusItems.length} lines above reorder par
              </span>
            </div>

            <button
              type="button"
              disabled={isGeneratingOnHandMenu}
              onClick={generateOnHandMenu}
              className={`min-h-[50px] px-6 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all select-none ${
                isBOH
                  ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-amber-500/25'
                  : 'bg-indigo-900 hover:bg-indigo-800 active:scale-95 text-white shadow-md'
              }`}
            >
              {isGeneratingOnHandMenu ? (
                <>
                  <span className="animate-spin text-base">⏳</span>
                  <span>Synthesizing with Gemini 4 Argon...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Surplus Specials</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top 6 Surplus Ingredient Chips Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            Top Surplus Lines:
          </span>
          {surplusItems.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 ${
                isBOH
                  ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span className="font-bold">{item.ingredientName}</span>
              <span className="text-emerald-400 font-mono font-bold">
                +{item.surplusQty.toFixed(1)} {item.unitOfMeasure}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                (${item.dollarSurplus.toFixed(0)})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Generated Proposals Grid (Adaptive for 1920x1200 Tablet Landscape and Portrait) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {onHandMenuProposals.map((proposal) => {
          const isAccepted = acceptedId === proposal.id;

          return (
            <div
              key={proposal.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between shadow-xl transition-all duration-200 ${
                isBOH
                  ? 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              {/* Proposal Top Section */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                      proposal.category === 'A La Carte Special'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : proposal.category === 'Chef Tasting Course'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {proposal.category}
                  </span>

                  {/* FCP Benchmark Compliance Badge */}
                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{proposal.foodCostPercentage.toFixed(1)}% FCP</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight leading-snug">
                    {proposal.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {proposal.description}
                  </p>
                </div>

                {/* Financial Economics Strip (Tabular Figures) */}
                <div
                  className={`grid grid-cols-3 gap-2 p-3 rounded-xl border text-center font-mono ${
                    isBOH
                      ? 'bg-slate-950/70 border-slate-800/80'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold block">
                      Portion Cost
                    </span>
                    <strong className="text-sm font-black text-slate-200">
                      ${proposal.portionCost.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold block">
                      Menu Price
                    </span>
                    <strong className="text-sm font-black text-emerald-400">
                      ${proposal.targetMenuPrice.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold block">
                      Gross Margin
                    </span>
                    <strong className="text-sm font-black text-indigo-400">
                      ${(proposal.targetMenuPrice - proposal.portionCost).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Utilized Surplus Ingredients */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Utilized Surplus Ingredients:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {proposal.utilizedSurplusIngredients.map((u, i) => (
                      <span
                        key={i}
                        className={`text-[11px] px-2 py-1 rounded-lg border font-mono ${
                          isBOH
                            ? 'bg-slate-950 border-slate-800 text-slate-300'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {u.name}{' '}
                        <strong className="text-amber-400 font-bold">
                          ({u.quantity} {u.unit})
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Plating & Wine Pairing Notes */}
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    isBOH
                      ? 'bg-slate-950/50 border-slate-800/60'
                      : 'bg-indigo-50/50 border-indigo-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <ChefHat className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed">
                      <strong>Plating:</strong> {proposal.platingNotes}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-300">
                    <Wine className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed">
                      <strong>Pairing:</strong> {proposal.winePairing}
                    </span>
                  </div>
                </div>

                {/* Decomposed Station Prep Breakdown */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Station Line Breakdown:
                  </span>
                  <div className="space-y-1">
                    {proposal.stationBreakdown.map((task, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                          isBOH
                            ? 'bg-slate-950/80 border-slate-800/70'
                            : 'bg-white border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-bold text-amber-400 uppercase">
                            [{task.station}]
                          </span>
                          <span className="truncate text-slate-200 font-medium">
                            {task.taskName}
                          </span>
                        </div>
                        <div className="text-right shrink-0 text-[11px] font-mono text-slate-400">
                          {task.quantity} {task.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* One-Tap Push to Prep & Recipe Catalog (Minimum 64dp Touch Target in BOH) */}
              <div className="pt-4 border-t border-slate-800/60 mt-4">
                <button
                  type="button"
                  onClick={() => handlePush(proposal)}
                  className={`w-full ${
                    isBOH ? 'min-h-[64px]' : 'min-h-[48px]'
                  } rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all select-none ${
                    isAccepted
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                      : isBOH
                      ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-amber-500/20'
                      : 'bg-indigo-900 hover:bg-indigo-800 text-white shadow-md'
                  }`}
                >
                  {isAccepted ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Committed to Catalog & Line Prep!</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4" />
                      <span>1-Tap Push to Catalog & Station Prep</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
