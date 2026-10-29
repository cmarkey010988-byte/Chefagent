/**
 * src/services/VisionInventoryService.ts
 *
 * Client-side service for AI Vision Shelf-Counting, Image Capture,
 * and Reconciliation Diff Calculation.
 */
import { InventoryItem, VisionScanResult, ReconciliationDiffItem, ShelfScanPreset } from '../types';

/**
 * Built-in high-fidelity presets for instant testing in browser/desktop environments
 */
export const SHELF_SCAN_PRESETS: ShelfScanPreset[] = [
  {
    id: 'preset-cooler-protein',
    title: 'Walk-In Cooler: Protein & Dairy Wire Tier',
    storageLocation: 'Walk-In Cooler',
    description: '3 cryovac beef tenderloins, 4 pans of Pacific Halibut portions, heavy cream cartons.',
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f172a"/><rect x="20" y="30" width="560" height="340" rx="8" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><line x1="40" y1="160" x2="560" y2="160" stroke="%2364748b" stroke-width="4"/><line x1="40" y1="280" x2="560" y2="280" stroke="%2364748b" stroke-width="4"/><rect x="60" y="80" width="130" height="70" rx="6" fill="%23881337" stroke="%23f43f5e" stroke-width="2"/><text x="75" y="122" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold">BEEF TENDERLOIN (3x)</text><rect x="220" y="85" width="140" height="65" rx="6" fill="%230e7490" stroke="%2322d3ee" stroke-width="2"/><text x="235" y="122" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold">PACIFIC HALIBUT (4x)</text><rect x="390" y="90" width="140" height="60" rx="6" fill="%23eab308" stroke="%23fef08a" stroke-width="2"/><text x="405" y="125" fill="%23713f12" font-family="sans-serif" font-size="12" font-weight="bold">HEAVY CREAM (8x)</text><rect x="70" y="190" width="120" height="80" rx="6" fill="%2378350f" stroke="%23d97706" stroke-width="2"/><text x="85" y="235" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold">SHALLOTS (2x Sack)</text><text x="40" y="355" fill="%2394a3b8" font-family="monospace" font-size="13">STATION: WALK-IN COOLER SHELF A-2 (TEMP 36.2°F)</text></svg>',
  },
  {
    id: 'preset-bar-liquor',
    title: 'Bar & Wine Cellar: Back Bar Spirits Tier',
    storageLocation: 'Bar',
    description: '12 bottles of Kentucky Straight Bourbon, 8 London Dry Gin, vermouth bottles.',
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%2318181b"/><rect x="30" y="40" width="540" height="320" rx="6" fill="%2327272a" stroke="%23a1a1aa" stroke-width="2"/><line x1="40" y1="200" x2="560" y2="200" stroke="%2371717a" stroke-width="3"/><rect x="60" y="70" width="35" height="120" rx="4" fill="%23b45309"/><rect x="110" y="70" width="35" height="120" rx="4" fill="%23b45309"/><rect x="160" y="70" width="35" height="120" rx="4" fill="%23b45309"/><rect x="210" y="70" width="35" height="120" rx="4" fill="%23b45309"/><rect x="260" y="70" width="35" height="120" rx="4" fill="%230284c7"/><rect x="310" y="70" width="35" height="120" rx="4" fill="%230284c7"/><rect x="360" y="70" width="35" height="120" rx="4" fill="%230284c7"/><rect x="420" y="70" width="35" height="120" rx="4" fill="%23059669"/><rect x="470" y="70" width="35" height="120" rx="4" fill="%23059669"/><text x="50" y="240" fill="%23fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">BOURBON (4 BTL FRONT) · GIN (3 BTL) · VERMOUTH (2 BTL)</text><text x="40" y="340" fill="%23a1a1aa" font-family="monospace" font-size="12">BACK BAR SPIRITS INVENTORY RACK B-1</text></svg>',
  },
  {
    id: 'preset-dry-storage',
    title: 'Dry Prep: Bulk Grains & Canola Oil',
    storageLocation: 'Dry Prep',
    description: '4 bags of aged Carnaroli rice, 6 jugs of canola oil, russet potato sacks.',
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><rect x="30" y="30" width="540" height="340" rx="8" fill="%23334155" stroke="%23fbbf24" stroke-width="2"/><rect x="60" y="120" width="100" height="140" rx="6" fill="%23d97706"/><rect x="180" y="120" width="100" height="140" rx="6" fill="%23d97706"/><rect x="300" y="100" width="110" height="160" rx="6" fill="%2365a30d"/><rect x="430" y="100" width="110" height="160" rx="6" fill="%2365a30d"/><text x="75" y="200" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold">RICE (50#)</text><text x="195" y="200" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold">RICE (50#)</text><text x="320" y="190" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold">OIL (35#)</text><text x="450" y="190" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold">OIL (35#)</text><text x="50" y="345" fill="%23f8fafc" font-family="monospace" font-size="13">DRY PREP PANTRY SECTION D · PALLET 4</text></svg>',
  },
];

/**
 * Analyzes an image base64 against the active inventory catalog
 */
export async function analyzeShelfImage(
  imageBase64: string,
  storageLocation: string,
  catalog: InventoryItem[],
  modelPreference: 'auto' | 'gemini-3.8-flash' | 'gemini-4-argon' = 'auto'
): Promise<VisionScanResult> {
  const response = await fetch('/api/analyze-inventory-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      storageLocation,
      inventoryCatalog: catalog,
      modelPreference,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image analysis failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Computes side-by-side reconciliation diff between previous count and AI detected count
 */
export function computeReconciliationDiff(
  scanResult: VisionScanResult,
  catalog: InventoryItem[]
): ReconciliationDiffItem[] {
  const catalogMap = new Map<string, InventoryItem>();
  catalog.forEach((item) => {
    catalogMap.set(item.id, item);
  });

  const diffItems: ReconciliationDiffItem[] = [];

  scanResult.detectedItems.forEach((detected) => {
    let matchedItem: InventoryItem | undefined;

    // 1. Match by catalog ID
    if (detected.matchedItemId && catalogMap.has(detected.matchedItemId)) {
      matchedItem = catalogMap.get(detected.matchedItemId);
    }

    // 2. Fallback fuzzy name match if matchedItemId is missing
    if (!matchedItem) {
      const lowerDetected = detected.detectedName.toLowerCase();
      matchedItem = catalog.find(
        (c) =>
          c.ingredientName.toLowerCase().includes(lowerDetected) ||
          lowerDetected.includes(c.ingredientName.toLowerCase())
      );
    }

    const previousCount = matchedItem ? matchedItem.currentOnHandQuantity : 0;
    const detectedCount = detected.estimatedQuantity;
    const delta = Math.round((detectedCount - previousCount) * 10) / 10;
    const deltaPercent = previousCount > 0 ? Math.round((delta / previousCount) * 100) : 100;

    let status: 'INCREASE' | 'DECREASE' | 'MATCH' = 'MATCH';
    if (delta > 0.1) status = 'INCREASE';
    else if (delta < -0.1) status = 'DECREASE';

    diffItems.push({
      itemId: matchedItem ? matchedItem.id : `detected-new-${Math.random().toString(36).substring(2, 7)}`,
      ingredientName: matchedItem ? matchedItem.ingredientName : detected.detectedName,
      storageLocation: matchedItem ? matchedItem.storageLocation : (scanResult.storageLocation as any),
      unitOfMeasure: matchedItem ? matchedItem.unitOfMeasure : detected.unitOfMeasure,
      previousCount,
      detectedCount,
      delta,
      deltaPercent,
      status,
      confidenceScore: detected.confidenceScore,
      visualNotes: detected.visualNotes,
      isAccepted: true,
      editedCount: detectedCount,
    });
  });

  return diffItems;
}
