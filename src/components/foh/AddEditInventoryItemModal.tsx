import React, { useState, useEffect } from 'react';
import { useChef } from '../../context/ChefContext';
import { InventoryItem, InventoryItemType, StorageLocation, FoodStorageLocation, NonFoodStorageLocation } from '../../types';
import { X, Check, Trash2, AlertTriangle, Package, Warehouse, DollarSign, Layers } from 'lucide-react';

interface AddEditInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'lastAuditTimestamp' | 'auditedByProfile'> | InventoryItem) => void;
  onArchive?: (id: string) => void;
  initialItem?: InventoryItem | null;
  defaultItemType?: InventoryItemType;
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
    description: 'Raw kitchen stock, proteins, dairy, dry pantry goods',
    defaultLocation: 'Walk-In Cooler',
  },
  CHEMICAL_SUPPLY: {
    label: 'Chemical Supply',
    description: 'Dishwashing solids, quaternary sanitizers, degreasers',
    defaultLocation: 'Chemical Storage',
  },
  JANITORIAL: {
    label: 'Janitorial / Facilities',
    description: 'Commercial can liners, mops, gloves, restroom paper',
    defaultLocation: 'Janitorial / Facilities',
  },
  OPERATIONAL_CONSUMABLE: {
    label: 'Consumable / Amenities',
    description: 'Cocktail napkins, bamboo skewers, guest amenities',
    defaultLocation: 'Paper Goods',
  },
};

export const AddEditInventoryItemModal: React.FC<AddEditInventoryItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onArchive,
  initialItem,
  defaultItemType = 'FOOD_INGREDIENT',
}) => {
  const { establishmentProfile } = useChef();
  const isEditing = Boolean(initialItem);

  const dynamicFoodLocations = establishmentProfile.primaryLocations
    .filter((l) => !l.isNonFoodZone)
    .map((l) => l.name);
  const dynamicNonFoodLocations = establishmentProfile.primaryLocations
    .filter((l) => l.isNonFoodZone)
    .map((l) => l.name);

  const [ingredientName, setIngredientName] = useState('');
  const [itemType, setItemType] = useState<InventoryItemType>(defaultItemType);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(() => {
    const defaultList = defaultItemType === 'FOOD_INGREDIENT' ? dynamicFoodLocations : dynamicNonFoodLocations;
    return (defaultList[0] || CATEGORY_CONFIG[defaultItemType].defaultLocation) as StorageLocation;
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
    if (initialItem) {
      setIngredientName(initialItem.ingredientName);
      setItemType(initialItem.itemType || 'FOOD_INGREDIENT');
      setStorageLocation(initialItem.storageLocation);
      setUnitOfMeasure(initialItem.unitOfMeasure);
      setCurrentOnHand(initialItem.currentOnHandQuantity);
      setParLevel(initialItem.parLevelQuantity);
      setReorderPoint(initialItem.reorderPointQuantity);
      setUnitCost(initialItem.unitCost);
      setConfirmArchive(false);
    } else {
      setIngredientName('');
      setItemType(defaultItemType);
      const defaultList = defaultItemType === 'FOOD_INGREDIENT' ? dynamicFoodLocations : dynamicNonFoodLocations;
      const defLoc = (defaultList[0] || CATEGORY_CONFIG[defaultItemType].defaultLocation) as StorageLocation;
      setStorageLocation(defLoc);
      setUnitOfMeasure(defaultItemType === 'FOOD_INGREDIENT' ? 'LB' : 'CASE');
      setCustomUnit('');
      setCurrentOnHand(0);
      setParLevel(10);
      setReorderPoint(3);
      setUnitCost(25.0);
      setConfirmArchive(false);
    }
    setErrors({});
  }, [initialItem, defaultItemType, isOpen]);

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
      errs.ingredientName = 'Item specification name is required.';
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
      errs.unitCost = 'Unit cost must be at least $0.00.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalUnit = (customUnit.trim() || unitOfMeasure).toUpperCase();

    if (initialItem) {
      onSave({
        ...initialItem,
        ingredientName: ingredientName.trim(),
        itemType,
        storageLocation,
        unitOfMeasure: finalUnit,
        currentOnHandQuantity: Number(currentOnHand) || 0,
        parLevelQuantity: Number(parLevel) || 0,
        reorderPointQuantity: Number(reorderPoint) || 0,
        unitCost: Number(unitCost) || 0,
      });
    } else {
      onSave({
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
      });
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
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Inventory Specification' : 'Create Custom Inventory Item'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `SKU: ${initialItem?.id} · Active in ${initialItem?.storageLocation}`
                  : 'Add a culinary ingredient or operational non-food supply'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Classification Segmented Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Item Classification & Domain
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as InventoryItemType[]).map((type) => {
                const config = CATEGORY_CONFIG[type];
                const isSelected = itemType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleCategoryChange(type)}
                    className={`min-h-[50px] p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-600'
                    }`}
                  >
                    <div className="text-xs leading-tight">{config.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">
                      {type === 'FOOD_INGREDIENT' ? 'Kitchen line' : 'Operational'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Item Name & Brand Specification <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={ingredientName}
              onChange={(e) => setIngredientName(e.target.value)}
              placeholder="e.g. Ecolab Solid Dish Detergent or Prime Beef PSMO"
              className={`w-full h-11 px-3.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white transition-colors ${
                errors.ingredientName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-600'
              }`}
            />
            {errors.ingredientName && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.ingredientName}</p>
            )}
          </div>

          {/* Storage Zone & Unit of Measure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Storage Zone
              </label>
              <select
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value as StorageLocation)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 focus:bg-white"
              >
                {activeLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {itemType === 'FOOD_INGREDIENT' ? 'Culinary storage location' : 'Facility supply storage room'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Unit of Measure
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setUnitOfMeasure(u);
                      setCustomUnit('');
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                      unitOfMeasure === u && !customUnit
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customUnit}
                onChange={(e) => {
                  setCustomUnit(e.target.value);
                  if (e.target.value) setUnitOfMeasure(e.target.value.toUpperCase());
                }}
                placeholder="Or custom unit (e.g. ROLL, DRUM)"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Numbers: On Hand, Par, Reorder Point, Wholesale Cost */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  On-Hand
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentOnHand}
                    onChange={(e) => setCurrentOnHand(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    {unitOfMeasure}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Par Level
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={parLevel}
                    onChange={(e) => setParLevel(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    {unitOfMeasure}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Reorder Pt
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    {unitOfMeasure}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Unit Cost ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Live Audit Metrics Preview */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Projected Stock Valuation:</span>
                <span className="font-mono font-black text-slate-900">
                  ${valuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                {isLowStock ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    Triggers Reorder Warning
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Stock above reorder buffer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Archive Obsolete Item (Edit Mode Only) */}
          {isEditing && initialItem && onArchive && (
            <div className="pt-2 border-t border-slate-100">
              {confirmArchive ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="text-xs text-rose-800">
                    <span className="font-bold">Archive SKU {initialItem.id}?</span>
                    <p className="text-[11px] text-rose-600">
                      Hides item from active audits while safeguarding past recipe costing history.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmArchive(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onArchive(initialItem.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-xs"
                    >
                      Confirm Archive
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmArchive(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Archive Obsolete Item</span>
                </button>
              )}
            </div>
          )}

          {/* Modal Action Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Specification' : 'Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { InventoryItemModal } from './InventoryItemModal';
