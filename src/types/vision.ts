/**
 * src/types/vision.ts
 *
 * Multimodal AI Vision Shelf-Counting & Image Scanner Contracts
 */

export interface DetectedShelfItem {
  matchedItemId?: string;
  detectedName: string;
  estimatedQuantity: number;
  unitOfMeasure: string;
  confidenceScore: number;
  visualNotes: string;
  isUnmatched: boolean;
  boxOrContainerCount?: number;
}

export interface VisionScanResult {
  scanId: string;
  timestamp: string;
  storageLocation: string;
  detectedItems: DetectedShelfItem[];
  shelfSummary: string;
  lightingCondition: 'Optimal' | 'Low-Light (Torch Active)' | 'Glare / Reflected' | 'Good';
  modelUsed: string;
  latencyMs: number;
}

export interface ReconciliationDiffItem {
  itemId: string;
  ingredientName: string;
  storageLocation: string;
  unitOfMeasure: string;
  previousCount: number;
  detectedCount: number;
  delta: number;
  deltaPercent: number;
  status: 'INCREASE' | 'DECREASE' | 'MATCH';
  confidenceScore: number;
  visualNotes: string;
  isAccepted: boolean;
  editedCount?: number;
}

export interface ShelfScanPreset {
  id: string;
  title: string;
  storageLocation: string;
  description: string;
  imageUrl: string;
}
