/**
 * src/types/barcode.ts
 *
 * Data contracts for Multi-Device Bluetooth Barcode Engine (BLE & HID Wedge)
 * and low-latency physical inventory reconciliation.
 */
import { InventoryItem } from './index';

export type ScannerConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'BONDING'
  | 'ERROR';

export type ScannerConnectionType =
  | 'BLE_GATT'
  | 'HID_KEYBOARD_WEDGE'
  | 'SPP_SERIAL'
  | 'VIRTUAL_SIMULATOR';

export type BarcodeSymbology =
  | 'EAN-13'
  | 'UPC-A'
  | 'GS1-128'
  | 'CODE_128'
  | 'QR_CODE'
  | 'UNKNOWN';

export interface ScannerDeviceInfo {
  id: string;
  name: string; // e.g. "Zebra DS2278", "Socket Mobile S700", "Honeywell Voyager"
  type: ScannerConnectionType;
  macAddress?: string;
  batteryLevel?: number; // 0 to 100%
  isConnected: boolean;
  status: ScannerConnectionStatus;
  lastScannedCode?: string;
  lastScanTimestamp?: number;
}

export interface BarcodeScanEvent {
  eventId: string;
  rawData: string;
  cleanCode: string;
  symbology: BarcodeSymbology;
  timestamp: number;
  sourceDevice: string;
  latencyMs: number;
}

export interface BarcodeResolutionResult {
  barcode: string;
  symbology: BarcodeSymbology;
  matchedItem?: InventoryItem;
  isMapped: boolean;
  actionTaken: 'INCREMENTED' | 'DECREMENTED' | 'DIRECT_AUDITED' | 'UNMAPPED';
  previousQuantity: number;
  newQuantity: number;
  timestamp: number;
  feedbackMessage: string;
}

export interface NewSkuAssociationPayload {
  barcode: string;
  symbology: BarcodeSymbology;
  inventoryItemId?: string;
  // Or create new SKU
  createItemPayload?: {
    name: string;
    category: 'FOOD_INGREDIENT' | 'CHEMICAL_SUPPLY' | 'JANITORIAL' | 'OPERATIONAL_CONSUMABLE';
    location: string;
    unitOfMeasure: string;
    parLevel: number;
    reorderPoint: number;
    unitCost: number;
    initialCount: number;
  };
}
