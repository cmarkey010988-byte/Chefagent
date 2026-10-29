/**
 * src/types/pos.ts
 *
 * Data contracts for Bi-Directional Legacy POS & KDS Gateway
 * (Toast, Lightspeed, ESC/POS Thermal Printer Drivers, Optimistic Concurrency).
 */

export type POSProvider = 'TOAST' | 'LIGHTSPEED' | 'GENERIC_REST';

export interface POSOrderItemModifier {
  name: string;
  priceDelta: number;
}

export interface POSOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  seatNumber?: number;
  course: 'STARTER' | 'APPETIZER' | 'ENTREE' | 'DESSERT' | 'BEVERAGE';
  targetStation: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Grill' | 'Pastry' | 'Expediter_Pass';
  modifiers?: string[];
  allergenAlerts?: string[];
  specialInstructions?: string;
  fireStatus: 'HOLD' | 'FIRED' | 'PLATED' | 'SERVED';
}

export interface POSOrderPayload {
  checkId: string;
  orderNumber: string;
  tableNumber: string;
  tableId: string;
  diningSection: string;
  guestCount: number;
  serverName: string;
  openedTimestamp: number;
  closedTimestamp?: number;
  status: 'OPEN' | 'IN_KITCHEN' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  tax: number;
  total: number;
  items: POSOrderItem[];
  isRushOrder?: boolean;
  version: number; // Optimistic locking (@Version)
}

export interface POSEightysixSyncPayload {
  ingredientId?: string;
  ingredientName: string;
  is86: boolean;
  timestamp: number;
  reason?: string;
  affectedPosItemIds: string[];
  broadcastResults?: Array<{
    provider: POSProvider;
    endpoint: string;
    status: 'SUCCESS' | 'FAILED' | 'RETRY_QUEUED';
    timestamp: number;
  }>;
}

export interface ESCPOSCommand {
  commandName: string;
  hexSequence: string;
  description: string;
}

export interface KitchenPrinterConfig {
  id: string;
  name: string;
  model: 'EPSON_TM_T88' | 'STAR_SP700' | 'GENERIC_ESC_POS';
  ipAddress: string;
  port: number; // Default 9100 for raw TCP socket
  assignedStation: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Grill' | 'Pastry' | 'Expediter_Pass';
  paperWidthMm: 58 | 80;
  isOnline: boolean;
  buzzerEnabled: boolean;
  cutterEnabled: boolean;
  lastPrintTimestamp?: number;
}

export interface ThermalSlipTicket {
  ticketId: string;
  orderNumber: string;
  tableName: string;
  serverName: string;
  diningSection: string;
  timestamp: number;
  destinationStation: string;
  items: Array<{
    name: string;
    quantity: number;
    course: string;
    modifiers: string[];
    allergenAlerts: string[];
    specialInstructions?: string;
  }>;
  rawHexStream?: string;
  cutterActuated: boolean;
  buzzerTriggered: boolean;
}

export interface OptimisticLockConflictRecord {
  conflictId: string;
  entityType: 'TABLE_STATUS' | 'PREP_ITEM' | 'PURCHASE_ORDER';
  entityId: string;
  localVersion: number;
  incomingVersion: number;
  resolutionStrategy: 'EXTERNAL_POS_WINS' | 'LOCAL_LINE_WINS' | 'MERGE_DIRTY_FIELDS';
  timestamp: number;
  resolvedStateJson: string;
}
