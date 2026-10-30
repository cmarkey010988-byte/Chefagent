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

// ============================================================================
// BOH Edge-AI Station Vision & Telemetry Contracts
// ============================================================================

export type SafetyZoneViolation =
  | 'HANDS_SAFETY_ZONE'
  | 'KNIFE_HAZARD'
  | 'TEMPERATURE_WARNING'
  | 'GREASE_LENS_FOG'
  | 'NONE';

export interface VisionBoundingBox {
  id: string;
  label: string; // e.g. "Salmon Fillets", "Sauté Pan", "Chef Knife"
  confidence: number; // 0.0 - 1.0
  x: number; // Normalized 0..1 bounding box coordinate
  y: number;
  width: number;
  height: number;
  stationId: string;
  fillLevelPercentage: number; // 0 - 100%
  anomalyFlag: boolean;
  safetyViolation: SafetyZoneViolation;
  temperatureCelsius?: number;
}

export interface VisionFrameTelemetry {
  stationId: string;
  timestamp: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  hardwareTempCelsius: number;
  thermalThrottlingActive: boolean;
  lensHealth: 'CLEAR' | 'GREASE_FOGGED' | 'STEAM_OBSCURED';
  detections: VisionBoundingBox[];
}

export type FusionActionType =
  | 'CONFIRM_86'
  | 'CONFLICT_REJECT'
  | 'PAN_DEPLETED_AUTO_86'
  | 'PLATING_FIRE_VALIDATED'
  | 'REQUIRE_CHEF_OVERRIDE';

export interface MultimodalFusionRequest {
  audioTranscript: string;
  audioRms: number;
  audioConfidence: number;
  visualDetections: VisionBoundingBox[];
  stationId: string;
  audioWeightAlpha?: number;
  visionWeightBeta?: number;
}

export interface MultimodalFusionResult {
  finalConfidence: number;
  audioScore: number;
  visionScore: number;
  alpha: number;
  beta: number;
  confirmedAction: FusionActionType;
  targetRecipeOrItemName: string;
  visualStationId: string;
  fillLevelPercentage: number;
  anomalyFlag: boolean;
  rationaleText: string;
  timestamp: number;
}

// ============================================================================
// Enterprise Edge AI Acceleration & Model Quantization Types
// ============================================================================

export type NpuExecutionDelegate =
  | 'TFLITE_INT8'
  | 'QUALCOMM_SNPE'
  | 'MEDIATEK_NEUROPILOT'
  | 'ROCKCHIP_NPU'
  | 'NNAPI'
  | 'CPU_FALLBACK';

export type FrameDecimationMode = 'ACTIVE_MOTION_30FPS' | 'IDLE_DECIMATED_2FPS';

export interface EdgeNpuTelemetry {
  delegate: NpuExecutionDelegate;
  quantization: 'INT8' | 'FP16' | 'FP32';
  motionVectorDelta: number; // 0.0 - 1.0 (difference between successive frames)
  staticDurationMs: number;  // How long frame has been static
  currentFps: number;        // 2 FPS (decimated) or 30 FPS (active)
  decimationMode: FrameDecimationMode;
  npuInferenceLatencyMs: number; // typically 4-8ms on NPU vs 45ms on CPU
  memoryFootprintMb: number;
}

// ============================================================================
// Environmental Optics & Self-Cleaning Pipeline Types
// ============================================================================

export type GastronormStandard = 'GN_1_1' | 'GN_1_2' | 'GN_1_3' | 'GN_1_6' | 'CUSTOM';

export interface GastronormTareProfile {
  standard: GastronormStandard;
  nominalWidthMm: number;
  nominalLengthMm: number;
  opticalSkewMatrix: [number, number, number, number];
  tareWeightGrams: number;
  specularReflectanceTarePct: number;
  isCalibrated: boolean;
  calibratedAt?: number;
}

export type DehazeFilterMode =
  | 'BYPASS'
  | 'RETINEX_MULTI_SCALE'
  | 'STEAM_CONTRAST_BOOST';

export type MicroHeaterState = 'STANDBY' | 'PULSING' | 'CONTINUOUS_DEFOG';

export interface EnvironmentalOpticsState {
  dehazeMode: DehazeFilterMode;
  steamObscurationLevel: number; // 0 - 100%
  greaseFilmVariance: number;    // 0 - 100%
  microHeaterState: MicroHeaterState;
  microHeaterTempC: number;      // e.g. 48°C bezel temp
  gastronormTare: GastronormTareProfile;
}

// ============================================================================
// Automated HACCP & Safety Audit Compliance Ledger Types
// ============================================================================

export type HaccpIncidentType =
  | 'TEMPERATURE_DANGER_ZONE'
  | 'KNIFE_HAZARD'
  | 'HANDS_SAFETY_ZONE'
  | 'AUTO_86_TRIGGER'
  | 'LENS_GREASE_OBSCURATION'
  | 'SANITATION_TIME_LIMIT';

export interface HaccpBlockEntry {
  blockHeight: number;
  timestamp: number;
  stationId: string;
  incidentType: HaccpIncidentType;
  itemDescription: string;
  measuredValue: string;
  thresholdValue: string;
  actionTaken: string;
  previousHash: string;
  currentHash: string;
  signatureVerified: boolean;
  inspectorSignedBy?: string;
}

export interface HaccpShiftReport {
  shiftDate: string;
  stationId: string;
  totalBlocks: number;
  dangerZoneViolations: number;
  safetyInfractions: number;
  auto86Deductions: number;
  complianceScorePercent: number;
  ledgerIntegrityValid: boolean;
  generatedAt: number;
  blocks: HaccpBlockEntry[];
}

// ============================================================================
// Local-First CRDT & Edge Mesh Synchronization Types
// ============================================================================

export interface MeshCrdtPeerNode {
  peerId: string;
  stationName: string;
  ipAddress: string;
  port: number;
  vectorClock: Record<string, number>;
  isMeshLeader: boolean;
  latencyMs: number;
  partitionStatus: 'CONNECTED' | 'ISOLATED_RECOVERY' | 'MERGING';
  lastMergeTimestamp: number;
}

export interface CrdtPanState {
  stationId: string;
  panId: string;
  itemName: string;
  fillLevel: number;
  is86: boolean;
  lastWriterNode: string;
  lamportTimestamp: number;
  versionVector: Record<string, number>;
}


