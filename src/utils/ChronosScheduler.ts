/**
 * src/utils/ChronosScheduler.ts
 *
 * Reverse-calculates exact station fire timestamps from a target banquet plating deadline,
 * traversing the task dependency DAG and enforcing the confirmed 15-minute inter-station staging buffer.
 *
 * Pure algorithmic execution: 100% offline, zero network dependencies.
 */
import { PrepItem, ChronosTimelineItem, ChronosScheduleResult, ChronosUrgencyStatus } from '../types';

export const STAGING_BUFFER_MINUTES = 15;
export const MILLIS_PER_MINUTE = 60 * 1000;

/**
 * Reverse-calculates target fire timestamps for all prep items based on a target plating deadline.
 */
export function reverseScheduleChronosTimeline(
  items: PrepItem[],
  targetPlatingTimestamp: number = Date.now() + 2 * 60 * 60 * 1000,
  banquetEventId?: string,
  currentTime: number = Date.now()
): ChronosScheduleResult {
  if (items.length === 0) {
    return {
      scheduledAt: new Date().toISOString(),
      targetPlatingTimestamp,
      totalLeadTimeMinutes: 0,
      items: [],
      earliestFireTimestamp: targetPlatingTimestamp,
      criticalPathItemIds: [],
    };
  }

  const itemMap = new Map<string, PrepItem>();
  items.forEach((item) => itemMap.set(item.id, item));

  // Build reverse dependency graph: parentId -> list of child item IDs that depend on parent
  const successorMap = new Map<string, string[]>();
  items.forEach((item) => {
    const deps = item.dependencies || [];
    deps.forEach((parentId) => {
      if (!successorMap.has(parentId)) {
        successorMap.set(parentId, []);
      }
      successorMap.get(parentId)!.push(item.id);
    });
  });

  const calculatedFireTimes = new Map<string, number>();

  // Backward propagation function
  function getOrComputeFireTime(itemId: string): number {
    if (calculatedFireTimes.has(itemId)) {
      return calculatedFireTimes.get(itemId)!;
    }

    const item = itemMap.get(itemId);
    if (!item) return targetPlatingTimestamp;

    const durationMillis = (item.estimatedDurationMinutes || 30) * MILLIS_PER_MINUTE;
    const bufferMillis = STAGING_BUFFER_MINUTES * MILLIS_PER_MINUTE;

    const successors = successorMap.get(itemId);

    let fireTime: number;
    if (!successors || successors.length === 0) {
      // Direct pass task leading straight to plating window
      fireTime = targetPlatingTimestamp - durationMillis;
    } else {
      // Must be done before the earliest successor starts, minus the 15-min staging buffer
      const earliestSuccessorFire = Math.min(
        ...successors.map((succId) => getOrComputeFireTime(succId))
      );
      fireTime = earliestSuccessorFire - bufferMillis - durationMillis;
    }

    calculatedFireTimes.set(itemId, fireTime);
    return fireTime;
  }

  // Compute for all items
  items.forEach((item) => getOrComputeFireTime(item.id));

  // Map to ChronosTimelineItem with live urgency status
  const scheduledItems: ChronosTimelineItem[] = items.map((item) => {
    const fireTime = calculatedFireTimes.get(item.id) || (targetPlatingTimestamp - (item.estimatedDurationMinutes || 30) * MILLIS_PER_MINUTE);
    const durationMinutes = item.estimatedDurationMinutes || 30;

    // Minutes until this item must fire relative to the Burn Line (currentTime)
    const minutesToBurnLine = Math.round((fireTime - currentTime) / MILLIS_PER_MINUTE);

    let urgencyStatus: ChronosUrgencyStatus = 'NORMAL';
    if (item.isCompleted) {
      urgencyStatus = 'COMPLETED';
    } else if (minutesToBurnLine < 0) {
      urgencyStatus = 'CRITICAL_BURN_OVERDUE';
    } else if (minutesToBurnLine <= 15) {
      urgencyStatus = 'APPROACHING_BURN_LINE';
    }

    return {
      id: item.id,
      recipeId: item.recipeId,
      recipeName: item.recipeName,
      targetQuantity: item.targetQuantity,
      completedQuantity: item.completedQuantity,
      unitOfMeasure: item.unitOfMeasure,
      stationAssignment: item.stationAssignment,
      priorityLevel: item.priorityLevel,
      isCompleted: item.isCompleted,
      assignedCookName: item.assignedCookName,
      targetFireTimestamp: fireTime,
      estimatedDurationMinutes: durationMinutes,
      dependencies: item.dependencies || [],
      chronosStage: item.chronosStage || 'SUB_RECIPE',
      targetPlatingTimestamp,
      banquetEventId: banquetEventId || item.banquetEventId,
      minutesToBurnLine,
      urgencyStatus,
    };
  });

  // Sort by targetFireTimestamp ascending (earliest tasks first)
  scheduledItems.sort((a, b) => a.targetFireTimestamp - b.targetFireTimestamp);

  const earliestFireTimestamp = scheduledItems.length > 0 ? scheduledItems[0].targetFireTimestamp : targetPlatingTimestamp;
  const totalLeadTimeMinutes = Math.round((targetPlatingTimestamp - earliestFireTimestamp) / MILLIS_PER_MINUTE);

  return {
    scheduledAt: new Date().toISOString(),
    targetPlatingTimestamp,
    totalLeadTimeMinutes,
    items: scheduledItems,
    earliestFireTimestamp,
    criticalPathItemIds: scheduledItems.slice(0, 3).map((i) => i.id),
  };
}

/**
 * Creates seed demo prep items with multi-station dependency chains
 */
export function createSeedChronosPrepItems(targetPlatingTimestamp: number): PrepItem[] {
  return [
    {
      id: 'prep-chronos-1',
      recipeId: 'rec-1',
      recipeName: 'Fabricate & Truss 8oz Prime Tenderloin Cuts',
      targetQuantity: 24,
      completedQuantity: 24,
      unitOfMeasure: 'Portions',
      stationAssignment: 'Butchery',
      priorityLevel: 1,
      isCompleted: true,
      assignedCookName: 'Chef Bruce',
      shiftedDateTimestamp: Date.now(),
      estimatedDurationMinutes: 45,
      dependencies: [],
      chronosStage: 'FABRICATION',
      targetPlatingTimestamp,
    },
    {
      id: 'prep-chronos-2',
      recipeId: 'rec-1',
      recipeName: 'Shallot Peppercorn Demi-Glace Reduction',
      targetQuantity: 2.5,
      completedQuantity: 1.5,
      unitOfMeasure: 'QT',
      stationAssignment: 'Sauce/Sauté',
      priorityLevel: 1,
      isCompleted: false,
      assignedCookName: 'Cook Marco',
      shiftedDateTimestamp: Date.now(),
      estimatedDurationMinutes: 60,
      dependencies: ['prep-chronos-1'],
      chronosStage: 'SUB_RECIPE',
      targetPlatingTimestamp,
    },
    {
      id: 'prep-chronos-3',
      recipeId: 'rec-1',
      recipeName: 'Velvet Russet Potato Puree & Cream Mount',
      targetQuantity: 15,
      completedQuantity: 0,
      unitOfMeasure: 'LB',
      stationAssignment: 'Garde Manger',
      priorityLevel: 1,
      isCompleted: false,
      assignedCookName: 'Cook Leo',
      shiftedDateTimestamp: Date.now(),
      estimatedDurationMinutes: 35,
      dependencies: ['prep-chronos-1'],
      chronosStage: 'HOT_HOLD',
      targetPlatingTimestamp,
    },
    {
      id: 'prep-chronos-4',
      recipeId: 'rec-1',
      recipeName: 'High-Heat Sear & Cognac Pan Finish',
      targetQuantity: 24,
      completedQuantity: 0,
      unitOfMeasure: 'Portions',
      stationAssignment: 'Grill',
      priorityLevel: 1,
      isCompleted: false,
      assignedCookName: 'Chef Bruce',
      shiftedDateTimestamp: Date.now(),
      estimatedDurationMinutes: 15,
      dependencies: ['prep-chronos-2', 'prep-chronos-3'],
      chronosStage: 'PLATING_FIRE',
      targetPlatingTimestamp,
    },
    {
      id: 'prep-chronos-5',
      recipeId: 'rec-2',
      recipeName: 'Scale & Portion 7oz Pacific Halibut Fillets',
      targetQuantity: 18,
      completedQuantity: 0,
      unitOfMeasure: 'Portions',
      stationAssignment: 'Butchery',
      priorityLevel: 2,
      isCompleted: false,
      assignedCookName: 'Cook Dave',
      shiftedDateTimestamp: Date.now(),
      estimatedDurationMinutes: 30,
      dependencies: [],
      chronosStage: 'FABRICATION',
      targetPlatingTimestamp,
    },
    {
      id: 'prep-chronos-6',
      recipeId: 'rec-2',
      recipeName: 'Chive Beurre Blanc Emulsion',
      targetQuantity: 2.0,
      completedQuantity: 0,
      unitOfMeasure: 'QT',
      stationAssignment: 'Sauce/Sauté',
      priorityLevel: 2,
      isCompleted: false,
      assignedCookName: 'Cook Marco',
      shiftedDateTimestamp: Date.now(),
      estimatedDurationMinutes: 25,
      dependencies: ['prep-chronos-5'],
      chronosStage: 'SUB_RECIPE',
      targetPlatingTimestamp,
    },
  ];
}
