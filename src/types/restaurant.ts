/**
 * src/types/restaurant.ts
 * Unified BOH and FOH Restaurant Operating System data contracts.
 */

// ============================================================================
// 1. BACK OF HOUSE (BOH) DATA CONTRACTS
// ============================================================================

export type BOHStation =
  | 'Sauce/Sauté'
  | 'Butchery'
  | 'Garde Manger'
  | 'Grill'
  | 'Pastry'
  | 'Dishwash/Sanitation';

export type AllergenType =
  | 'GLUTEN_FREE'
  | 'DAIRY_FREE'
  | 'NUT_FREE'
  | 'SHELLFISH_FREE'
  | 'VEGAN'
  | 'VEGETARIAN'
  | 'HALAL';

export interface ExtendedRecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wastePercentage: number;
}

export interface SubRecipeReference {
  subRecipeId: string;
  subRecipeName: string;
  quantityUsed: number;
  unit: string;
  subRecipeCost: number;
}

export interface RestaurantRecipe {
  id: string;
  name: string;
  category: string;
  yieldQuantity: number;
  yieldUnit: string;
  laborMinutesRequired: number;
  ingredients: ExtendedRecipeIngredient[];
  subRecipes?: SubRecipeReference[];
  costPerPortion: number;
  targetMenuPrice: number;
  foodCostPercentage: number;
  allergens: AllergenType[];
  stationAssignment: BOHStation;
  platingNotes?: string;
  isBanquetCompatible?: boolean;
}

export type WasteReason =
  | 'TRIM_LOSS'
  | 'EXPIRED_SPOILAGE'
  | 'LINE_DROP'
  | 'OVER_PORTION'
  | 'QUALITY_REJECT';

export interface WasteLog {
  id: string;
  timestamp: number;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costImpact: number;
  reason: WasteReason;
  loggedBy: string;
  notes?: string;
}

export interface SanitationLog {
  id: string;
  timestamp: number;
  equipmentName: string; // e.g. "Apex Commercial Dishmachine #1"
  washTemperatureFahrenheit: number; // minimum 120°F (chemical) or 160°F (high-temp)
  rinseTemperatureFahrenheit: number; // minimum 180°F for high-temp sanitizing
  sanitizerPpm: number; // 200-400 PPM for Quat; 50-100 PPM for Chlorine
  sanitizerType: 'QUAT_AMMONIA' | 'CHLORINE' | 'THERMAL_HIGH_TEMP';
  testedBy: string;
  isPassed: boolean;
  notes?: string;
}

// ============================================================================
// 2. FRONT OF HOUSE (FOH) DATA CONTRACTS
// ============================================================================

export type TableServiceStatus =
  | 'VACANT'
  | 'SEATED'
  | 'ENTREE_PHASE'
  | 'CHECK_DROPPED'
  | 'DIRTY';

export type DiningSection =
  | 'Main Dining Room'
  | 'Patio & Terrace'
  | 'Bar Lounge'
  | 'Private Dining Room';

export interface TableStatus {
  tableId: string;
  tableName: string;
  section: DiningSection;
  capacity: number;
  currentCovers: number;
  status: TableServiceStatus;
  serverName?: string;
  seatedTimestamp?: number;
  lastStatusChangeTimestamp?: number;
  notes?: string;
  activeAlerts?: string[];
  orderTotal?: number;
  version?: number; // Optimistic locking (@Version)
}

export type ShiftRole =
  | 'EXECUTIVE_CHEF'
  | 'SOUS_CHEF'
  | 'LINE_COOK'
  | 'DISHWASHER'
  | 'FLOOR_MANAGER'
  | 'SERVER'
  | 'BARTENDER'
  | 'HOST';

export interface ShiftRosterItem {
  id: string;
  employeeName: string;
  role: ShiftRole;
  stationOrSection: string;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isClockedIn: boolean;
  clockInTimestamp?: number;
  phone?: string;
}

export interface PreShiftHandoff {
  date: string; // YYYY-MM-DD
  serviceShift: 'LUNCH' | 'DINNER' | 'BANQUET_SERVICE';
  eightySixList: string[];
  dailySpecials: string[];
  vipNotes: string[];
  dietaryAlerts: string[];
  stationAssignments: Array<{
    stationOrSection: string;
    staffName: string;
    role: string;
  }>;
  generalNotes?: string;
}

// ============================================================================
// 3. PROCUREMENT & PURCHASING DATA CONTRACTS
// ============================================================================

export type POStatus = 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED';

export interface PurchaseOrderItem {
  inventoryItemId: string;
  itemName: string;
  quantityOrdered: number;
  unitOfMeasure: string;
  agreedUnitCost: number;
  quantityReceived?: number;
  actualUnitCost?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorName: string; // e.g. "US Foods", "Sysco", "EcoLab", "Local Farm Co-op"
  vendorContact?: string;
  orderDate: number;
  expectedDeliveryDate: number;
  receivedDate?: number;
  items: PurchaseOrderItem[];
  status: POStatus;
  totalCost: number;
  invoiceNumber?: string;
  notes?: string;
  // B2B Distributor EDI & Outbox Pipeline Fields
  ediControlNumber?: string;
  transmissionStatus?: 'DRAFT' | 'QUEUED' | 'TRANSMITTED' | 'ACKNOWLEDGED' | 'SHIPPED' | 'FAILED';
  distributorTrackingId?: string;
  lastEdiErrorLog?: string;
  ediAuditLogs?: Array<{
    id: string;
    timestamp: number;
    action: string;
    documentType: string;
    controlNumber: string;
    status: string;
    details: string;
    payloadExcerpt?: string;
  }>;
  version?: number; // Optimistic locking (@Version)
}
