export type ProfileMode = 'BOH_KITCHEN' | 'FOH_MANAGEMENT';

export type Station = 'ALL' | 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Grill' | 'Pastry' | 'Dishwash/Sanitation';

export interface IngredientCostItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wastePct: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  standardYieldQuantity: number;
  yieldUnit: string;
  laborMinutesRequired: number;
  targetFoodCostPercentage: number; // e.g. 28.0%
  isBanquetCompatible: boolean;
  targetMenuPrice: number;
  ingredients: IngredientCostItem[];
  platingDescription?: string;
}

export interface PrepItem {
  id: string;
  recipeId: string;
  recipeName: string;
  targetQuantity: number;
  completedQuantity: number;
  unitOfMeasure: string;
  stationAssignment: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Grill' | 'Pastry' | 'Dishwash/Sanitation';
  priorityLevel: 1 | 2 | 3; // 1 = Critical Banquet, 2 = Standard Par, 3 = Low
  isCompleted: boolean;
  assignedCookName: string;
  shiftedDateTimestamp: number;
  // Chronos Acoustic Orchestration Engine Fields
  targetFireTimestamp?: number;
  estimatedDurationMinutes?: number;
  dependencies?: string[];
  chronosStage?: 'FABRICATION' | 'SUB_RECIPE' | 'HOT_HOLD' | 'PLATING_FIRE';
  targetPlatingTimestamp?: number;
  banquetEventId?: string;
}

export type InventoryItemType =
  | 'FOOD_INGREDIENT'
  | 'CHEMICAL_SUPPLY'
  | 'JANITORIAL'
  | 'OPERATIONAL_CONSUMABLE';

export type FoodStorageLocation =
  | 'Walk-In Cooler'
  | 'Dry Prep'
  | 'Freezer'
  | 'Bar';

export type NonFoodStorageLocation =
  | 'Chemical Storage'
  | 'Janitorial / Facilities'
  | 'Paper Goods'
  | 'Bar Consumables';

export type StorageLocation = FoodStorageLocation | NonFoodStorageLocation;

export interface InventoryItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  itemType: InventoryItemType;
  unitOfMeasure: string;
  storageLocation: StorageLocation;
  currentOnHandQuantity: number;
  parLevelQuantity: number;
  reorderPointQuantity: number;
  unitCost: number;
  lastAuditTimestamp: number;
  auditedByProfile: string;
  isArchived?: boolean;
  archivedTimestamp?: number;
  // Barcode Engine & SKU Resolution
  barcode?: string;
  sku?: string;
  version?: number;
}

export interface BanquetEvent {
  id: string;
  eventName: string;
  guestCount: number;
  eventDateTimestamp: number;
  status: 'PLANNED' | 'PREP_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalContractValue: number;
  primaryEntreeRecipeId: string;
  secondaryEntreeRecipeId: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  timestamp: number;
  latencyMs?: number;
}

export type CopilotRole = 'SOUS_CHEF' | 'FOH_CONTROLLER' | 'BANQUET_MASTER';

export type ImageResolution = '1K' | '2K' | '4K';
export type ImageStyle = 'plating' | 'marketing';
export type AspectRatio = '1:1' | '16:9' | '4:3' | '9:16';

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  imageUrl: string;
  resolution: ImageResolution;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  timestamp: number;
  modelUsed: string;
}

export interface SurplusIngredientUsage {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
}

export interface StationPrepTask {
  station: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Pastry';
  taskName: string;
  quantity: number;
  unit: string;
  suggestedCook: string;
}

export interface OnHandMenuProposal {
  id: string;
  name: string;
  category: 'A La Carte Special' | 'Chef Tasting Course' | 'Banquet Buffet Option';
  description: string;
  targetMenuPrice: number;
  portionCost: number;
  foodCostPercentage: number;
  isBenchmarkCompliant: boolean;
  utilizedSurplusIngredients: SurplusIngredientUsage[];
  platingNotes: string;
  winePairing: string;
  stationBreakdown: StationPrepTask[];
}

export * from './events';
export * from './establishment';
export * from './restaurant';
export * from './vision';
export * from './voice';
export * from './executive';
export * from './chronos';
export * from './edi';
export * from './barcode';
export * from './pos';

