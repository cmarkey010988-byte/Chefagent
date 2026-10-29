import React from 'react';
import { useChef } from '../../context/ChefContext';
import { BanquetEvent } from '../../types';
import {
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Users,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';

export const FOHMarginDashboard: React.FC = () => {
  const { recipes, banquets, updateBanquetStatus } = useChef();

  const CLUB_BENCHMARK_FCP = 28.0;

  // Compute margin metrics for each recipe
  const menuAnalytics = recipes.map((recipe) => {
    const rawBatchCost = recipe.ingredients.reduce((sum, ing) => {
      const grossQty = ing.quantity * (1 + ing.wastePct / 100);
      return sum + grossQty * ing.unitCost;
    }, 0);

    const portionCost = recipe.standardYieldQuantity > 0 ? rawBatchCost / recipe.standardYieldQuantity : 0;
    const actualFcp = recipe.targetMenuPrice > 0 ? (portionCost / recipe.targetMenuPrice) * 100 : 0;
    const grossMarginDollars = recipe.targetMenuPrice - portionCost;
    const isMarginSqueezed = actualFcp > CLUB_BENCHMARK_FCP;

    // Suggested menu price to hit exactly 28% FCP
    const suggestedPrice28 = portionCost / (CLUB_BENCHMARK_FCP / 100);

    return {
      ...recipe,
      rawBatchCost,
      portionCost,
      actualFcp,
      grossMarginDollars,
      isMarginSqueezed,
      suggestedPrice28,
    };
  });

  const averageFcp =
    menuAnalytics.length > 0
      ? menuAnalytics.reduce((sum, r) => sum + r.actualFcp, 0) / menuAnalytics.length
      : 0;

  const squeezedCount = menuAnalytics.filter((r) => r.isMarginSqueezed).length;

  return (
    <div className="space-y-6 text-slate-800">
      {/* KPI Cards Row (Responsive 2-col on portrait, 4-col on tablet landscape 1920x1200) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Menu FCP</span>
            <Percent className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">
            {averageFcp.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Target Benchmark:</span>
            <strong className="font-mono text-indigo-700 font-bold">28.0%</strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Margin Squeeze Alerts</span>
            <ShieldAlert className={`w-5 h-5 ${squeezedCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className="text-3xl font-black font-mono flex items-center gap-2">
            <span className={squeezedCount > 0 ? 'text-rose-600' : 'text-slate-900'}>{squeezedCount}</span>
            <span className="text-xs font-sans text-slate-500 font-semibold">Dishes over 28%</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Requires portion adjustment or price repricing</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Upcoming Banquets</span>
            <Calendar className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">
            {banquets.length}{' '}
            <span className="text-xs font-sans text-slate-500 font-semibold">Events scheduled</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {banquets.reduce((sum, b) => sum + b.guestCount, 0)} total banquet covers
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Banquet Contract Value</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-600">
            ${banquets.reduce((sum, b) => sum + b.totalContractValue, 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Committed club food & beverage revenue</div>
        </div>
      </div>

      {/* Menu Engineering & Margin Squeeze Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Menu Engineering & Food Cost Percentage (FCP) Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dishes where actual FCP exceeds the 28.0% club standard are highlighted with margin squeeze alerts.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Menu Dish</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 font-mono text-right">Raw Portion Cost</th>
                <th className="py-3 px-4 font-mono text-right">Menu Price</th>
                <th className="py-3 px-4 font-mono text-center">Actual FCP vs 28% Target</th>
                <th className="py-3 px-4 font-mono text-right">Gross Margin $</th>
                <th className="py-3 px-4 font-mono text-right">Rec. Price (28%)</th>
                <th className="py-3 px-4 text-center">Action Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {menuAnalytics.map((dish) => {
                const diff = dish.actualFcp - CLUB_BENCHMARK_FCP;

                return (
                  <tr
                    key={dish.id}
                    className={`transition-colors ${
                      dish.isMarginSqueezed ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">
                      {dish.name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {dish.category}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ${dish.portionCost.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ${dish.targetMenuPrice.toFixed(2)}
                    </td>

                    {/* FCP Gauge */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-between w-36 text-[11px] font-mono font-bold mb-1">
                          <span
                            className={dish.isMarginSqueezed ? 'text-rose-600' : 'text-emerald-700'}
                          >
                            {dish.actualFcp.toFixed(1)}%
                          </span>
                          <span className="text-slate-400 text-[10px]">Bench: 28%</span>
                        </div>
                        <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full ${
                              dish.isMarginSqueezed ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (dish.actualFcp / 40) * 100)}%` }}
                          />
                          {/* 28% Benchmark Marker Line */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                            style={{ left: `${(28 / 40) * 100}%` }}
                            title="28% Club Benchmark"
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      +${dish.grossMarginDollars.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-600">
                      ${dish.suggestedPrice28.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {dish.isMarginSqueezed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 border border-rose-300 px-2 py-0.5 rounded-md">
                          <AlertOctagon className="w-3 h-3" />
                          Margin Squeezed (+{diff.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 border border-emerald-300 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Optimal Margin
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banquet Cover Breakdown & Operational Schedule */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-700" />
              <span>Banquet Cover Breakdown & Profitability</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upcoming club banquets, estimated production costs, and station scheduling.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banquets.map((b) => {
            const isCompleted = b.status === 'COMPLETED';
            const isInProgress = b.status === 'PREP_IN_PROGRESS';

            return (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-sm">{b.eventName}</h4>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        isCompleted
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : isInProgress
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-200/70 my-2 font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-sans">Guest Covers</span>
                      <strong className="text-slate-800 text-sm flex items-center gap-1 font-bold">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {b.guestCount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-sans">Contract Value</span>
                      <strong className="text-emerald-700 text-sm font-bold">
                        ${b.totalContractValue.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {b.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">
                      "{b.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-200/50 mt-3">
                  <span className="text-[11px] text-slate-500">
                    Est. Food Cost: <strong className="font-mono">${(b.totalContractValue * 0.26).toFixed(0)}</strong>
                  </span>

                  <select
                    value={b.status}
                    onChange={(e) => updateBanquetStatus(b.id, e.target.value as any)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-hidden"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="PREP_IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
