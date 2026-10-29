import test from 'node:test';
import assert from 'node:assert/strict';
import { BarcodeScannerEngine } from './BarcodeScannerEngine';
import { InventoryItem } from '../../types';

const mockCatalog: InventoryItem[] = [
  {
    id: 'inv-beef-1',
    ingredientId: 'ing-beef',
    ingredientName: 'Prime Beef Tenderloin (PSMO)',
    itemType: 'FOOD_INGREDIENT',
    unitOfMeasure: 'LB',
    storageLocation: 'Walk-In Cooler',
    currentOnHandQuantity: 14.5,
    parLevelQuantity: 35.0,
    reorderPointQuantity: 18.0,
    unitCost: 24.5,
    lastAuditTimestamp: Date.now(),
    auditedByProfile: 'BOH_CHEF',
    barcode: '012345678905',
    sku: 'BEEF-PSMO-109',
  },
  {
    id: 'inv-halibut-2',
    ingredientId: 'ing-halibut',
    ingredientName: 'Wild Pacific Halibut Fillet',
    itemType: 'FOOD_INGREDIENT',
    unitOfMeasure: 'LB',
    storageLocation: 'Walk-In Cooler',
    currentOnHandQuantity: 26.0,
    parLevelQuantity: 30.0,
    reorderPointQuantity: 15.0,
    unitCost: 28.0,
    lastAuditTimestamp: Date.now(),
    auditedByProfile: 'BOH_CHEF',
    barcode: '4006381333931',
    sku: 'SEAFD-HAL-44',
  },
];

test('Barcode standardizer removes termination delimiters and scanner AIM prefixes', () => {
  assert.equal(BarcodeScannerEngine.standardizeBarcode(']E0012345678905\r\n'), '012345678905');
  assert.equal(BarcodeScannerEngine.standardizeBarcode('  4006381333931\t\n '), '4006381333931');
  assert.equal(BarcodeScannerEngine.standardizeBarcode(']C1SKU-BEEF-109\r'), 'SKU-BEEF-109');
});

test('Symbology detector accurately identifies EAN-13, UPC-A, GS1-128, and Code 128', () => {
  assert.equal(BarcodeScannerEngine.detectSymbology('4006381333931'), 'EAN-13');
  assert.equal(BarcodeScannerEngine.detectSymbology('012345678905'), 'UPC-A');
  assert.equal(BarcodeScannerEngine.detectSymbology('(01)00123456789012'), 'GS1-128');
  assert.equal(BarcodeScannerEngine.detectSymbology('BEEF-PSMO-109'), 'CODE_128');
});

test('Barcode resolution increments matching inventory item count atomically', () => {
  const result = BarcodeScannerEngine.processIncomingBarcode(
    '012345678905\r',
    'HID_KEYBOARD_WEDGE',
    mockCatalog
  );

  assert.equal(result.isMapped, true);
  assert.equal(result.matchedItem?.ingredientName, 'Prime Beef Tenderloin (PSMO)');
  assert.equal(result.previousQuantity, 14.5);
  assert.equal(result.newQuantity, 15.5);
  assert.equal(result.actionTaken, 'INCREMENTED');
});

test('Unmapped barcode detection reports unmapped status for SKU association workflow', () => {
  const result = BarcodeScannerEngine.processIncomingBarcode(
    '999999999999\n',
    'BLE_GATT',
    mockCatalog
  );

  assert.equal(result.isMapped, false);
  assert.equal(result.actionTaken, 'UNMAPPED');
  assert.ok(result.feedbackMessage.includes('Unmapped barcode'));
});

test('Throughput stress test processes 100 continuous barcode stream inputs with zero dropped frames', () => {
  const stressStats = BarcodeScannerEngine.runThroughputStressTest(mockCatalog, 100);

  assert.equal(stressStats.totalScanned, 100);
  assert.equal(stressStats.droppedFrames, 0);
  assert.ok(stressStats.avgLatencyMs < 20); // Zero-latency requirement (<20ms)
});
