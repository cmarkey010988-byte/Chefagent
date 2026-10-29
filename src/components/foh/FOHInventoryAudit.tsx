import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { InventoryItem, InventoryItemType, StorageLocation, FoodStorageLocation, NonFoodStorageLocation } from '../../types';
import { InventoryItemModal } from './InventoryItemModal';
import {
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  Package,
  Search,
  SlidersHorizontal,
  Edit3,
  RotateCcw,
  Sparkles,
  Archive,
  Camera,
} from 'lucide-react';

const FOOD_LOCATIONS: ('ALL' | FoodStorageLocation)[] = [
  'ALL',
  'Walk-In Cooler',
  'Dry Prep',
  'Freezer',
  'Bar',
];

const NON_FOOD_LOCATIONS: ('ALL' | NonFoodStorageLocation)[] = [
  'ALL',
  'Chemical Storage',
  'Janitorial / Facilities',
  'Paper Goods',
  'Bar Consumables',
];

export const FOHInventoryAudit: React.FC = () => {
  const {
    inventoryItems,
    auditInventoryItem,
    addInventoryItem,
    updateInventoryItem,
    archiveInventoryItem,
    restoreInventoryItem,
    establishmentProfile,
    terminology,
    setIsVisionScanModalOpen,
  } = useChef();

  // Tab State: 'FOOD' vs 'NON_FOOD'
  const [activeTab, setActiveTab] = useState<'FOOD' | 'NON_FOOD'>('FOOD');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Categorize items
  const activeItems = inventoryItems.filter((item) => (showArchived ? item.isArchived : !item.isArchived));

  const foodItems = activeItems.filter(
    (item) => !item.itemType || item.itemType === 'FOOD_INGREDIENT'
  );
  const nonFoodItems = activeItems.filter(
    (item) => item.itemType && item.itemType !== 'FOOD_INGREDIENT'
  );

  const currentTabItems = activeTab === 'FOOD' ? foodItems : nonFoodItems;

  const filteredItems = currentTabItems.filter((item) => {
    const matchesLoc = selectedLocation === 'ALL' || item.storageLocation === selectedLocation;
    const matchesSearch = item.ingredientName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLoc && matchesSearch;
  });

  // Calculate Metrics
  const activeNonArchived = inventoryItems.filter((i) => !i.isArchived);
  const totalValuation = activeNonArchived.reduce(
    (sum, item) => sum + item.currentOnHandQuantity * item.unitCost,
    0
  );
  const foodValuation = activeNonArchived
    .filter((i) => !i.itemType || i.itemType === 'FOOD_INGREDIENT')
    .reduce((sum, item) => sum + item.currentOnHandQuantity * item.unitCost, 0);
  const nonFoodValuation = activeNonArchived
    .filter((i) => i.itemType && i.itemType !== 'FOOD_INGREDIENT')
    .reduce((sum, item) => sum + item.currentOnHandQuantity * item.unitCost, 0);

  const lowStockCount = activeNonArchived.filter(
    (item) => item.currentOnHandQuantity <= item.reorderPointQuantity
  ).length;

  const lowStockInTab = currentTabItems.filter(
    (item) => item.currentOnHandQuantity <= item.reorderPointQuantity
  ).length;

  const handleAdjust = (item: InventoryItem, delta: number) => {
    const nextQty = Math.max(0, item.currentOnHandQuantity + delta);
    auditInventoryItem(item.id, nextQty, 'FOH_MANAGER');
  };

  const handleDirectInput = (item: InventoryItem, value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      auditInventoryItem(item.id, parsed, 'FOH_MANAGER');
    }
  };

  const handleTabSwitch = (tab: 'FOOD' | 'NON_FOOD') => {
    setActiveTab(tab);
    setSelectedLocation('ALL');
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = (itemData: any) => {
    if (editingItem) {
      updateInventoryItem(itemData);
    } else {
      addInventoryItem(itemData);
    }
  };

  const dynamicFoodLocations = [
    'ALL',
    ...Array.from(new Set([
      ...establishmentProfile.primaryLocations.filter((l) => !l.isNonFoodZone).map((l) => l.name),
      ...foodItems.map((i) => i.storageLocation),
    ])),
  ];

  const dynamicNonFoodLocations = [
    'ALL',
    ...Array.from(new Set([
      ...establishmentProfile.primaryLocations.filter((l) => l.isNonFoodZone).map((l) => l.name),
      ...nonFoodItems.map((i) => i.storageLocation),
    ])),
  ];

  const locationOptions = activeTab === 'FOOD' ? dynamicFoodLocations : dynamicNonFoodLocations;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Executive Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Perpetual Stock Valuation</span>
            <DollarSign className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">
            {establishmentProfile.currencySymbol}{totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
            <span>Food: {establishmentProfile.currencySymbol}{foodValuation.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span aria-hidden="true">·</span>
            <span>Supplies: {establishmentProfile.currencySymbol}{nonFoodValuation.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900 flex items-center gap-2">
            <span className={lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}>{lowStockCount}</span>
            <span className="text-xs font-sans text-slate-500 font-semibold">SKUs below reorder par</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {lowStockInTab} warning{lowStockInTab === 1 ? '' : 's'} in current {activeTab === 'FOOD' ? 'culinary' : 'supply'} view
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Distribution</span>
            <Package className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">
            {activeNonArchived.length}{' '}
            <span className="text-xs font-sans text-slate-500 font-semibold">Active Tracked SKUs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
            <span>{foodItems.length} Food ingredients</span>
            <span aria-hidden="true">·</span>
            <span>{nonFoodItems.length} Facility & bar supplies</span>
          </div>
        </div>
      </div>

      {/* Top Controls: Food vs Non-Food Segmented Tabs + Add Item Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleTabSwitch('FOOD')}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'FOOD'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Food & Beverage Ingredients</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'FOOD' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {foodItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('NON_FOOD')}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'NON_FOOD'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Non-Food Operational Supplies</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'NON_FOOD' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {nonFoodItems.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
              showArchived
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4 text-slate-400" />
            <span>{showArchived ? 'Viewing Archived' : 'Archived SKUs'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVisionScanModalOpen(true)}
            className="min-h-[44px] px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4 text-sky-200" />
            <span>AI Vision Shelf Scan</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom SKU</span>
          </button>
        </div>
      </div>

      {/* Sub-Filters: Storage Zones & Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Dynamic Zone Chips based on Active Tab */}
        <div className="flex flex-wrap items-center gap-1.5">
          {locationOptions.map((loc) => {
            const isSelected = selectedLocation === loc;
            const count =
              loc === 'ALL'
                ? currentTabItems.length
                : currentTabItems.filter((i) => i.storageLocation === loc).length;

            return (
              <button
                key={loc}
                type="button"
                onClick={() => setSelectedLocation(loc)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200/60'
                }`}
              >
                <span>{loc}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'FOOD' ? 'ingredients...' : 'supplies & chemicals...'}`}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Inventory Audit Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item & Specification</th>
                <th className="py-3 px-4">Zone & Category</th>
                <th className="py-3 px-4 font-mono text-center">Current On-Hand</th>
                <th className="py-3 px-4 font-mono text-right">Par Level</th>
                <th className="py-3 px-4 font-mono text-right">Reorder Pt</th>
                <th className="py-3 px-4 font-mono text-right">Wholesale Cost</th>
                <th className="py-3 px-4 font-mono text-right">Total Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No inventory items found</p>
                    <p className="text-[11px] mt-1">
                      {searchQuery
                        ? `No items match "${searchQuery}" in this zone`
                        : `No active items in ${selectedLocation}`}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="mt-3 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                    >
                      + Add New SKU
                    </button>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.currentOnHandQuantity <= item.reorderPointQuantity;
                  const valuation = item.currentOnHandQuantity * item.unitCost;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.isArchived ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Item Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="text-left font-bold text-slate-900 hover:text-indigo-700 transition-colors"
                          >
                            {item.ingredientName}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SKU: {item.id}
                        </div>
                      </td>

                      {/* Storage Location & Category */}
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="font-semibold text-slate-800">{item.storageLocation}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.itemType ? item.itemType.replace('_', ' ') : 'FOOD INGREDIENT'}
                        </div>
                      </td>

                      {/* Rapid Counting Touch Stepper */}
                      <td className="py-2 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleAdjust(item, -1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            step="0.5"
                            value={item.currentOnHandQuantity}
                            onChange={(e) => handleDirectInput(item, e.target.value)}
                            className="w-16 h-8 bg-white text-center font-mono font-bold text-sm text-slate-900 rounded-md border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                          />

                          <button
                            type="button"
                            onClick={() => handleAdjust(item, 1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-mono text-slate-500 pr-1">{item.unitOfMeasure}</span>
                        </div>
                      </td>

                      {/* Par Level */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {item.parLevelQuantity.toFixed(1)} {item.unitOfMeasure}
                      </td>

                      {/* Reorder Point */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {item.reorderPointQuantity.toFixed(1)} {item.unitOfMeasure}
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {establishmentProfile.currencySymbol}{item.unitCost.toFixed(2)}
                      </td>

                      {/* Total Valuation */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {establishmentProfile.currencySymbol}{valuation.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.isArchived ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
                            Archived
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Par Met
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit or Restore */}
                      <td className="py-3.5 px-4 text-right">
                        {item.isArchived ? (
                          <button
                            type="button"
                            onClick={() => restoreInventoryItem(item.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Restore item to active catalog"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Edit specification & pars"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Inventory Item Modal */}
      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        onArchive={archiveInventoryItem}
        initialItem={editingItem}
        defaultItemType={activeTab === 'FOOD' ? 'FOOD_INGREDIENT' : 'CHEMICAL_SUPPLY'}
      />
    </div>
  );
};
