/**
 * src/types/chronos.ts
 *
 * Chronos Acoustic Orchestration Engine Contracts:
 * - Reverse-calculated timeline items
 * - Burn Line tracking and urgency states
 * - Dual-layout modes (Gantt lanes vs Countdown feed)
 */
import { Station } from './index';

export type ChronosStage =
  | 'FABRICATION'   // Butchery, peeling, portioning
  | 'SUB_RECIPE'    // Reductions, stocks, doughs
  | 'HOT_HOLD'      // Braising, resting, holding at 145°F
  | 'PLATING_FIRE'; // Immediate sear, garnish, pass assembly

export type ChronosUrgencyStatus =
  | 'NORMAL'                  // > 15 minutes to Burn Line
  | 'APPROACHING_BURN_LINE'   // <= 15 minutes (Pulsing Kitchen Amber #FF9800)
  | 'CRITICAL_BURN_OVERDUE'   // Past Burn Line and incomplete (Flashing Crimson #EF4444)
  | 'COMPLETED';              // Done (Emerald Green #1B5E20)

export type ChronosLayoutMode = 'GANTT' | 'COUNTDOWN';

export interface ChronosTimelineItem {
  id: string;
  recipeId: string;
  recipeName: string;
  targetQuantity: number;
  completedQuantity: number;
  unitOfMeasure: string;
  stationAssignment: Station;
  priorityLevel: 1 | 2 | 3;
  isCompleted: boolean;
  assignedCookName: string;
  targetFireTimestamp: number; // Epoch ms when cooking must start on line
  estimatedDurationMinutes: number; // Lead time needed
  dependencies: string[]; // IDs of predecessor prep items
  chronosStage: ChronosStage;
  targetPlatingTimestamp: number; // Hard event plating deadline
  banquetEventId?: string;
  // Edge-AI Vision Telemetry Fields
  visionStationId?: string;
  detectedItemClass?: string;
  fillLevelPercentage?: number; // 0 - 100%
  anomalyFlag?: boolean;
  lastVisualTimestamp?: number;
  // Computed runtime fields
  minutesToBurnLine: number;
  urgencyStatus: ChronosUrgencyStatus;
  predecessorItems?: ChronosTimelineItem[];
}

export interface ChronosScheduleResult {
  scheduledAt: string;
  targetPlatingTimestamp: number;
  totalLeadTimeMinutes: number;
  items: ChronosTimelineItem[];
  earliestFireTimestamp: number;
  criticalPathItemIds: string[];
}
