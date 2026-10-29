import React, { useState, useEffect } from 'react';
import { useChef } from '../../context/ChefContext';
import {
  InventoryItem,
  InventoryItemType,
  StorageLocation,
  FoodStorageLocation,
  NonFoodStorageLocation,
} from '../../types';
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Package,
  Warehouse,
  DollarSign,
  Layers,
  Archive,
  RotateCcw,
} from 'lucide-react';

export interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (item: Omit<InventoryItem, 'id' | 'lastAuditTimestamp' | 'auditedByProfile'> | InventoryItem) => void;
  onSubmit?: (item: Omit<InventoryItem, 'id' | 'lastAuditTimestamp' | 'auditedByProfile'> | InventoryItem) => void;
  onArchive?: (id: string) => void;
  initialItem?: InventoryItem | null;
  item?: InventoryItem | null;
  defaultItemType?: InventoryItemType;
  category?: InventoryItemType;
}

const FOOD_LOCATIONS: FoodStorageLocation[] = [
  'Walk-In Cooler',
  'Dry Prep',
  'Freezer',
  'Bar',
];

const NON_FOOD_LOCATIONS: NonFoodStorageLocation[] = [
  'Chemical Storage',
  'Janitorial / Facilities',
  'Paper Goods',
  'Bar Consumables',
];

const COMMON_UNITS = ['CASE', 'BOX', 'GAL', 'EA', 'LB', 'OZ', 'PACK', 'QT'];

const CATEGORY_CONFIG: Record<
  InventoryItemType,
  { label: string; description: string; defaultLocation: StorageLocation }
> = {
  FOOD_INGREDIENT: {
    label: 'Food Ingredient',
    description: 'Culinary stock, proteins, produce, dairy, dry pantry goods',
    defaultLocation: 'Walk-In Cooler',
  },
  CHEMICAL_SUPPLY: {
    label: 'Chemical Supply',
    description: 'Commercial dishwashing solids, sanitizers, degreasers',
    defaultLocation: 'Chemical Storage',
  },
  JANITORIAL: {
    label: 'Janitorial / Facilities',
    description: 'Heavy can liners, cleaning tools, gloves, restroom paper',
    defaultLocation: 'Janitorial / Facilities',
  },
  OPERATIONAL_CONSUMABLE: {
    label: 'Consumable / Amenities',
    description: 'Cocktail napkins, toothpicks, takeout containers, guest amenities',
    defaultLocation: 'Paper Goods',
  },
};

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSubmit,
  onArchive,
  initialItem: propInitialItem,
  item: propItem,
  defaultItemType,
  category,
}) => {
  const {
    establishmentProfile,
    addInventoryItem,
    updateInventoryItem,
    archiveInventoryItem: contextArchiveItem,
  } = useChef();

  const activeInitial = propInitialItem || propItem || null;
  const isEditing = Boolean(activeInitial);
  const startingType: InventoryItemType =
    category || defaultItemType || activeInitial?.itemType || 'FOOD_INGREDIENT';

  const dynamicFoodLocations = establishmentProfile.primaryLocations
    .filter((l) => !l.isNonFoodZone)
    .map((l) => l.name);
  const dynamicNonFoodLocations = establishmentProfile.primaryLocations
    .filter((l) => l.isNonFoodZone)
    .map((l) => l.name);

  const [ingredientName, setIngredientName] = useState('');
  const [itemType, setItemType] = useState<InventoryItemType>(startingType);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(() => {
    const defaultList = startingType === 'FOOD_INGREDIENT' ? dynamicFoodLocations : dynamicNonFoodLocations;
    return (defaultList[0] || CATEGORY_CONFIG[startingType].defaultLocation) as StorageLocation;
  });
  const [unitOfMeasure, setUnitOfMeasure] = useState('CASE');
  const [customUnit, setCustomUnit] = useState('');
  const [currentOnHand, setCurrentOnHand] = useState<number>(0);
  const [parLevel, setParLevel] = useState<number>(10);
  const [reorderPoint, setReorderPoint] = useState<number>(3);
  const [unitCost, setUnitCost] = useState<number>(25.0);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeInitial) {
      setIngredientName(activeInitial.ingredientName);
      setItemType(activeInitial.itemType || 'FOOD_INGREDIENT');
      setStorageLocation(activeInitial.storageLocation);
      setUnitOfMeasure(activeInitial.unitOfMeasure);
      setCurrentOnHand(activeInitial.currentOnHandQuantity);
      setParLevel(activeInitial.parLevelQuantity);
      setReorderPoint(activeInitial.reorderPointQuantity);
      setUnitCost(activeInitial.unitCost);
      setConfirmArchive(false);
    } else {
      setIngredientName('');
      setItemType(startingType);
      const defaultList = startingType === 'FOOD_INGREDIENT' ? dynamicFoodLocations : dynamicNonFoodLocations;
      const defLoc = (defaultList[0] || CATEGORY_CONFIG[startingType].defaultLocation) as StorageLocation;
      setStorageLocation(defLoc);
      setUnitOfMeasure(startingType === 'FOOD_INGREDIENT' ? 'LB' : 'CASE');
      setCustomUnit('');
      setCurrentOnHand(0);
      setParLevel(10);
      setReorderPoint(3);
      setUnitCost(25.0);
      setConfirmArchive(false);
    }
    setErrors({});
  }, [activeInitial, startingType, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (newType: InventoryItemType) => {
    setItemType(newType);
    const validLocations: string[] =
      newType === 'FOOD_INGREDIENT'
        ? (dynamicFoodLocations.length > 0 ? dynamicFoodLocations : [...FOOD_LOCATIONS])
        : (dynamicNonFoodLocations.length > 0 ? dynamicNonFoodLocations : [...NON_FOOD_LOCATIONS]);
    if (!validLocations.includes(storageLocation)) {
      setStorageLocation((validLocations[0] || CATEGORY_CONFIG[newType].defaultLocation) as StorageLocation);
    }
    if (!isEditing) {
      setUnitOfMeasure(newType === 'FOOD_INGREDIENT' ? 'LB' : 'CASE');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!ingredientName.trim()) {
      errs.ingredientName = 'Item name is required.';
    }
    const finalUnit = customUnit.trim() || unitOfMeasure;
    if (!finalUnit) {
      errs.unitOfMeasure = 'Unit of measure is required.';
    }
    if (parLevel < 0) {
      errs.parLevel = 'Par level cannot be negative.';
    }
    if (reorderPoint < 0) {
      errs.reorderPoint = 'Reorder threshold cannot be negative.';
    }
    if (unitCost < 0) {
      errs.unitCost = 'Unit cost cannot be negative.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalUnit = (customUnit.trim() || unitOfMeasure).toUpperCase();

    if (activeInitial) {
      const updatedItem: InventoryItem = {
        ...activeInitial,
        ingredientName: ingredientName.trim(),
        itemType,
        storageLocation,
        unitOfMeasure: finalUnit,
        currentOnHandQuantity: Number(currentOnHand) || 0,
        parLevelQuantity: Number(parLevel) || 0,
        reorderPointQuantity: Number(reorderPoint) || 0,
        unitCost: Number(unitCost) || 0,
      };

      if (onSave) {
        onSave(updatedItem);
      } else if (onSubmit) {
        onSubmit(updatedItem);
      } else {
        updateInventoryItem(updatedItem);
      }
    } else {
      const newItemData: Omit<InventoryItem, 'id' | 'lastAuditTimestamp' | 'auditedByProfile'> = {
        ingredientId: `ing-${Date.now()}`,
        ingredientName: ingredientName.trim(),
        itemType,
        storageLocation,
        unitOfMeasure: finalUnit,
        currentOnHandQuantity: Number(currentOnHand) || 0,
        parLevelQuantity: Number(parLevel) || 0,
        reorderPointQuantity: Number(reorderPoint) || 0,
        unitCost: Number(unitCost) || 0,
        isArchived: false,
      };

      if (onSave) {
        onSave(newItemData);
      } else if (onSubmit) {
        onSubmit(newItemData);
      } else {
        addInventoryItem(newItemData);
      }
    }
    onClose();
  };

  const handleArchive = () => {
    if (!activeInitial) return;
    if (onArchive) {
      onArchive(activeInitial.id);
    } else {
      contextArchiveItem(activeInitial.id);
    }
    onClose();
  };

  const activeLocations =
    itemType === 'FOOD_INGREDIENT'
      ? (dynamicFoodLocations.length > 0 ? dynamicFoodLocations : FOOD_LOCATIONS)
      : (dynamicNonFoodLocations.length > 0 ? dynamicNonFoodLocations : NON_FOOD_LOCATIONS);

  const valuation = (Number(currentOnHand) || 0) * (Number(unitCost) || 0);
  const isLowStock = (Number(currentOnHand) || 0) <= (Number(reorderPoint) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 id="inventory-modal-title" className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Inventory Item' : 'Create Inventory Item'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `SKU: ${activeInitial?.id} · Stored in ${activeInitial?.storageLocation}`
                  : 'Add a culinary food ingredient or operational non-food supply'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* 1. Category Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Item Category & Domain Classification
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as InventoryItemType[]).map((typeKey) => {
                const config = CATEGORY_CONFIG[typeKey];
                const isSelected = itemType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => handleCategoryChange(typeKey)}
                    className={`p-3 text-left rounded-xl border text-xs transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold ring-1 ring-indigo-500 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block truncate">{config.label}</span>
                    <span className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                      {config.description}
                    </span>
                  </button>
                );
              })}
            </div>
            {itemType !== 'FOOD_INGREDIENT' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong>Non-Food Separation:</strong> This item is strictly filtered out of Par-to-Plate culinary recipe generation.
                </span>
              </p>
            )}
          </div>

          {/* 2. Item Name & Storage Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="inv-name"
                type="text"
                placeholder={
                  itemType === 'FOOD_INGREDIENT'
                    ? 'e.g. Prime Beef Tenderloin (PSMO)'
                    : itemType === 'CHEMICAL_SUPPLY'
                    ? 'e.g. Solid Dishwasher Detergent Capsule'
                    : itemType === 'JANITORIAL'
                    ? 'e.g. 55-Gal Heavy Duty Can Liners'
                    : 'e.g. White Linen-Feel Cocktail Napkins'
                }
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border transition-colors focus:outline-hidden ${
                  errors.ingredientName
                    ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                    : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              {errors.ingredientName && (
                <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                  {errors.ingredientName}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="inv-location" className="block text-xs font-semibold text-slate-700 mb-1">
                Storage Location Zone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="inv-location"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value as StorageLocation)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white appearance-none focus:outline-hidden focus:border-indigo-600"
                >
                  {activeLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <Warehouse className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 3. Unit of Measure Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unit of Measure <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_UNITS.map((u) => {
                const isSelected = unitOfMeasure === u && !customUnit;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setUnitOfMeasure(u);
                      setCustomUnit('');
                    }}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? 'bg-indigo-900 border-indigo-900 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Or specify custom unit (e.g. ROLL, JUG, TUB, BTL, PAIL)"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono uppercase focus:outline-hidden focus:border-indigo-600"
              />
            </div>
            {errors.unitOfMeasure && (
              <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                {errors.unitOfMeasure}
              </span>
            )}
          </div>

          {/* 4. Stock Levels, Par Levels & Reorder Thresholds */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <label htmlFor="inv-onhand" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Current On-Hand
              </label>
              <input
                id="inv-onhand"
                type="number"
                step="0.01"
                min="0"
                value={currentOnHand}
                onChange={(e) => setCurrentOnHand(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600"
              />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {customUnit || unitOfMeasure} in stock
              </span>
            </div>

            <div>
              <label htmlFor="inv-par" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Par Level
              </label>
              <input
                id="inv-par"
                type="number"
                step="0.1"
                min="0"
                value={parLevel}
                onChange={(e) => setParLevel(parseFloat(e.target.value) || 0)}
                className={`w-full px-2.5 py-1.5 text-sm font-mono font-bold rounded-lg border bg-white focus:outline-hidden ${
                  errors.parLevel ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Target inventory</span>
            </div>

            <div>
              <label htmlFor="inv-reorder" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Reorder Point
              </label>
              <input
                id="inv-reorder"
                type="number"
                step="0.1"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(parseFloat(e.target.value) || 0)}
                className={`w-full px-2.5 py-1.5 text-sm font-mono font-bold rounded-lg border bg-white focus:outline-hidden ${
                  errors.reorderPoint ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              <span className="text-[10px] text-amber-600 font-mono mt-0.5 block">Reorder alert</span>
            </div>

            <div>
              <label htmlFor="inv-cost" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Unit Wholesale Cost
              </label>
              <div className="relative">
                <input
                  id="inv-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className={`w-full pl-6 pr-2 py-1.5 text-sm font-mono font-bold rounded-lg border bg-white focus:outline-hidden ${
                    errors.unitCost ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-600'
                  }`}
                />
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                  {establishmentProfile.currencySymbol}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Per {customUnit || unitOfMeasure}</span>
            </div>
          </div>

          {/* 5. Inventory Status & Valuation Preview */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50 text-xs">
            <div className="flex items-center gap-2">
              {isLowStock ? (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Below Reorder Point
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Par Level Satisfied
                </span>
              )}
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">
                Zone: <strong className="text-slate-800">{storageLocation}</strong>
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 mr-1.5">Extended Valuation:</span>
              <strong className="font-mono text-sm text-slate-900">
                {establishmentProfile.currencySymbol}
                {valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* 6. Soft Archiving Confirmation Area (When Editing Existing Item) */}
          {isEditing && (
            <div className="pt-2 border-t border-slate-100">
              {!confirmArchive ? (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Need to retire this item? Archiving preserves historical audits and banquet recipe records.
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Soft Archive Item</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Are you sure you want to soft-archive <strong>"{activeInitial?.ingredientName}"</strong>? It will be hidden from active par audits.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmArchive(false)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleArchive}
                      className="px-3 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-xs"
                    >
                      Confirm Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Dialog Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-900/10 transition-all flex items-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
