import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { Recipe } from '../../types';
import {
  Scale,
  Users,
  DollarSign,
  PlusCircle,
  Clock,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const BOHRecipeScaler: React.FC = () => {
  const { recipes, addPrepItem, establishmentProfile } = useChef();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || 'rec-1');
  const [targetCovers, setTargetCovers] = useState<number>(recipes[0]?.standardYieldQuantity || 10);
  const [pushedSuccess, setPushedSuccess] = useState(false);

  const recipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  const baseYield = recipe.standardYieldQuantity;
  const multiplier = baseYield > 0 ? targetCovers / baseYield : 1;

  // Compute scaled ingredients with waste factor
  const scaledIngredients = recipe.ingredients.map((ing) => {
    const rawScaled = ing.quantity * multiplier;
    const withWaste = rawScaled * (1 + ing.wastePct / 100);
    const itemTotalCost = withWaste * ing.unitCost;
    return {
      ...ing,
      scaledQty: withWaste,
      itemTotalCost,
    };
  });

  const totalBatchCost = scaledIngredients.reduce((sum, item) => sum + item.itemTotalCost, 0);
  const portionCost = targetCovers > 0 ? totalBatchCost / targetCovers : 0;
  const foodCostPct = recipe.targetMenuPrice > 0 ? (portionCost / recipe.targetMenuPrice) * 100 : 0;

  const handleSelectRecipe = (newId: string) => {
    setSelectedRecipeId(newId);
    const found = recipes.find((r) => r.id === newId);
    if (found) {
      setTargetCovers(found.standardYieldQuantity);
    }
    setPushedSuccess(false);
  };

  const handlePushToPrep = () => {
    // Determine target station based on category
    let station: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Pastry' = 'Sauce/Sauté';
    if (recipe.category === 'Banquet Entree') station = 'Butchery';
    if (recipe.category === 'Prep Base') station = 'Sauce/Sauté';
    if (recipe.category === 'Dessert') station = 'Pastry';

    addPrepItem({
      recipeId: recipe.id,
      recipeName: `${recipe.name} (${targetCovers} Covers)`,
      targetQuantity: targetCovers,
      completedQuantity: 0,
      unitOfMeasure: recipe.yieldUnit,
      stationAssignment: station,
      priorityLevel: targetCovers >= 50 ? 1 : 2,
      isCompleted: false,
      assignedCookName: 'Chef Bruce',
    });

    setPushedSuccess(true);
    setTimeout(() => setPushedSuccess(false), 2500);
  };

  const coverPresets = [baseYield, 25, 50, 100, 200, 350, 500];

  return (
    <div className="space-y-6">
      {/* Recipe Header & Selector Carousel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <Scale className="w-6 h-6 text-amber-400" />
              <span>Dynamic Recipe Yield & Batch Scaling</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Linear ingredient expansion with trim waste factoring and live raw food cost calculation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalog:</span>
            <select
              value={selectedRecipeId}
              onChange={(e) => handleSelectRecipe(e.target.value)}
              className="h-10 bg-slate-950 border border-slate-700 rounded-xl px-3 text-sm font-bold text-amber-400 focus:outline-hidden"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recipe Quick Info Strip & Allergen / Sub-Recipe Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Standard Yield</div>
            <div className="font-mono text-base font-bold text-slate-200">
              {baseYield} {recipe.yieldUnit}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Prep / Cook Time</div>
            <div className="font-mono text-base font-bold text-slate-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {recipe.laborMinutesRequired} min
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Target Menu Price</div>
            <div className="font-mono text-base font-bold text-emerald-400">
              {establishmentProfile.currencySymbol}{recipe.targetMenuPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Target Benchmark FCP</div>
            <div className="font-mono text-base font-bold text-amber-400">
              {recipe.targetFoodCostPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Sub-Recipe Architecture & Allergen Matrix Ribbon */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Dietary & Allergens:
            </span>
            <div className="flex flex-wrap gap-1">
              {recipe.name.toLowerCase().includes('halibut') ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    GLUTEN-FREE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                    NUT-FREE
                  </span>
                </>
              ) : recipe.name.toLowerCase().includes('risotto') ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    VEGETARIAN
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    GLUTEN-FREE
                  </span>
                </>
              ) : recipe.name.toLowerCase().includes('tenderloin') ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    GLUTEN-FREE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                    NUT-FREE
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    VEGETARIAN
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Sub-Recipe Hierarchy:
            </span>
            <span className="text-amber-400/90 font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Mother Sauce Base → Compound Infusion → Plated Entree
            </span>
          </div>
        </div>
      </div>

      {/* Target Yield Slider & Banquet Scale Controls */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Target Yield Covers & Multiplier</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-100 mt-1">
              {targetCovers} {recipe.yieldUnit}{' '}
              <span className="text-sm font-semibold text-slate-400 font-sans">
                ({multiplier.toFixed(2)}x standard batch)
              </span>
            </div>
          </div>

          {/* Quick Cover Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {coverPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTargetCovers(preset)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  targetCovers === preset
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider for Touch Terminals */}
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="600"
            step="1"
            value={targetCovers}
            onChange={(e) => setTargetCovers(parseInt(e.target.value, 10))}
            className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>1 Cover</span>
            <span>150 Covers (Luncheon)</span>
            <span>350 Covers (Banquet)</span>
            <span>600 Covers (Grand Gala)</span>
          </div>
        </div>
      </div>

      {/* Scaled Ingredients Specification Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">
            Scaled Mise en Place Requirements
          </h3>
          <div className="text-xs text-slate-400 font-mono">
            Trim waste factor included in gross requirements
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ingredient Item</th>
                <th className="py-3 px-4 font-mono text-right">Standard Qty</th>
                <th className="py-3 px-4 font-mono text-right text-amber-400">Scaled Req.</th>
                <th className="py-3 px-4 font-mono text-right">Waste %</th>
                <th className="py-3 px-4 font-mono text-right">Wholesale Rate</th>
                <th className="py-3 px-4 font-mono text-right text-slate-200">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {scaledIngredients.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-100">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {item.quantity.toFixed(2)} {item.unit}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-amber-400 text-sm">
                    {item.scaledQty.toFixed(2)} <span className="text-xs font-sans">{item.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {item.wastePct > 0 ? `+${item.wastePct}%` : '0%'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {establishmentProfile.currencySymbol}{item.unitCost.toFixed(2)}/{item.unit}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                    {establishmentProfile.currencySymbol}{item.itemTotalCost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Costing Footer & Send to Station Prep Action */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                Total Scaled Batch Raw Cost
              </span>
              <span className="text-2xl font-black font-mono text-slate-100">
                {establishmentProfile.currencySymbol}{totalBatchCost.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                Calculated Portion Cost
              </span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {establishmentProfile.currencySymbol}{portionCost.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                Actual Food Cost %
              </span>
              <span
                className={`text-xl font-black font-mono ${
                  foodCostPct > 28.0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {foodCostPct.toFixed(1)}%{' '}
                <span className="text-xs font-sans font-normal text-slate-500">
                  (Target 28%)
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePushToPrep}
            className={`min-h-[48px] px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
              pushedSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 active:scale-95'
            }`}
          >
            {pushedSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>Added to Line Prep!</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" />
                <span>Push {targetCovers} Covers to Station Prep</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plating Specification Notes for Line Cooks */}
      {recipe.platingDescription && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 uppercase tracking-wide block mb-1">
              Line Plating Guide & Texture Architecture:
            </span>
            <p className="leading-relaxed text-slate-400">{recipe.platingDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
};
