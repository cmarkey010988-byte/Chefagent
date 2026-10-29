/**
 * src/services/pos/LegacyPOSGatewayAdapter.ts
 *
 * Bi-Directional Legacy POS Gateway Adapter Layer (Toast, Lightspeed, Generic REST)
 * with Inbound Ingestion, Continuous Delta Polling (5000ms), Outbound 86'd Synchronization,
 * and Optimistic Concurrency (@Version) Conflict Resolution.
 */
import {
  POSProvider,
  POSOrderPayload,
  POSOrderItem,
  POSEightysixSyncPayload,
  TableStatus,
  KitchenEvent,
  PrepItem,
  OptimisticLockConflictRecord,
} from '../../types';

export interface IPOSGatewayAdapter {
  readonly provider: POSProvider;
  readonly name: string;
  pullActiveTables(): Promise<POSOrderPayload[]>;
  ingestGuestCheck(payload: POSOrderPayload): Promise<{ success: boolean; checkId: string }>;
  pushEightysixStatus(ingredientName: string, is86: boolean, reason?: string): Promise<{ success: boolean; posItemIdsUpdated: string[] }>;
}

export class ToastPOSAdapter implements IPOSGatewayAdapter {
  readonly provider: POSProvider = 'TOAST';
  readonly name = 'Toast POS Enterprise API';

  async pullActiveTables(): Promise<POSOrderPayload[]> {
    // Simulated Toast Orders endpoint response
    return [
      {
        checkId: `chk-toast-${Date.now().toString().slice(-4)}`,
        orderNumber: 'TOAST-4882',
        tableNumber: '02',
        tableId: 'tbl-02',
        diningSection: 'Main Dining Room',
        guestCount: 4,
        serverName: 'Chloe M.',
        openedTimestamp: Date.now() - 40 * 60 * 1000,
        status: 'IN_KITCHEN',
        subtotal: 218.0,
        tax: 17.44,
        total: 235.44,
        version: 1,
        items: [
          {
            id: 'item-toast-1',
            menuItemId: 'rec-1',
            name: 'Prime Tenderloin Au Poivre',
            quantity: 2,
            price: 58.0,
            seatNumber: 1,
            course: 'ENTREE',
            targetStation: 'Butchery',
            modifiers: ['Medium-Rare', 'Extra Peppercorn Glace'],
            allergenAlerts: [],
            fireStatus: 'FIRED',
          },
          {
            id: 'item-toast-2',
            menuItemId: 'rec-2',
            name: 'Pan-Roasted Pacific Halibut',
            quantity: 2,
            price: 48.0,
            seatNumber: 2,
            course: 'ENTREE',
            targetStation: 'Sauce/Sauté',
            modifiers: ['Sauce on Side'],
            allergenAlerts: ['GLUTEN_FREE requested'],
            fireStatus: 'FIRED',
          },
        ],
      },
    ];
  }

  async ingestGuestCheck(payload: POSOrderPayload): Promise<{ success: boolean; checkId: string }> {
    return { success: true, checkId: payload.checkId };
  }

  async pushEightysixStatus(
    ingredientName: string,
    is86: boolean,
    reason?: string
  ): Promise<{ success: boolean; posItemIdsUpdated: string[] }> {
    // Toast menu item 86 broadcast simulation
    const updatedIds = [`toast-item-${ingredientName.toLowerCase().replace(/\s+/g, '-')}`];
    return { success: true, posItemIdsUpdated: updatedIds };
  }
}

export class LightspeedPOSAdapter implements IPOSGatewayAdapter {
  readonly provider: POSProvider = 'LIGHTSPEED';
  readonly name = 'Lightspeed Restaurant POS Gateway';

  async pullActiveTables(): Promise<POSOrderPayload[]> {
    return [
      {
        checkId: `chk-lightspeed-${Date.now().toString().slice(-4)}`,
        orderNumber: 'LS-9014',
        tableNumber: 'PDR Boardroom',
        tableId: 'tbl-pdr1',
        diningSection: 'Private Dining Room',
        guestCount: 12,
        serverName: 'Sam T.',
        openedTimestamp: Date.now() - 55 * 60 * 1000,
        status: 'IN_KITCHEN',
        subtotal: 960.0,
        tax: 76.8,
        total: 1036.8,
        version: 2,
        items: [
          {
            id: 'item-ls-1',
            menuItemId: 'rec-4',
            name: 'Governors Roast Prime Rib of Beef',
            quantity: 12,
            price: 46.0,
            course: 'ENTREE',
            targetStation: 'Butchery',
            modifiers: ['12oz Carved to order', 'Au jus warming well'],
            allergenAlerts: ['SHELLFISH_FREE table-wide'],
            fireStatus: 'FIRED',
          },
        ],
      },
    ];
  }

  async ingestGuestCheck(payload: POSOrderPayload): Promise<{ success: boolean; checkId: string }> {
    return { success: true, checkId: payload.checkId };
  }

  async pushEightysixStatus(
    ingredientName: string,
    is86: boolean,
    reason?: string
  ): Promise<{ success: boolean; posItemIdsUpdated: string[] }> {
    return { success: true, posItemIdsUpdated: [`ls-menu-${ingredientName.toLowerCase().slice(0, 8)}`] };
  }
}

export class LegacyPOSGatewayAdapter {
  private static activeAdapter: IPOSGatewayAdapter = new ToastPOSAdapter();
  private static pollingIntervalTimer: any = null;
  private static isPolling = false;
  private static conflictLogs: OptimisticLockConflictRecord[] = [];
  private static eightySixAuditHistory: POSEightysixSyncPayload[] = [];

  /**
   * Selects active POS provider strategy
   */
  static selectProvider(provider: POSProvider) {
    if (provider === 'LIGHTSPEED') {
      this.activeAdapter = new LightspeedPOSAdapter();
    } else {
      this.activeAdapter = new ToastPOSAdapter();
    }
  }

  static getActiveProvider(): POSProvider {
    return this.activeAdapter.provider;
  }

  /**
   * Starts continuous delta polling (5000ms interval) for environments without incoming webhooks
   */
  static startDeltaPolling(onOrdersPolled: (orders: POSOrderPayload[]) => void) {
    if (this.isPolling) return;
    this.isPolling = true;

    this.pollingIntervalTimer = setInterval(async () => {
      try {
        const orders = await this.activeAdapter.pullActiveTables();
        if (orders && orders.length > 0) {
          onOrdersPolled(orders);
        }
      } catch (err) {
        console.warn('POS delta polling error:', err);
      }
    }, 5000);
  }

  static stopDeltaPolling() {
    this.isPolling = false;
    if (this.pollingIntervalTimer) {
      clearInterval(this.pollingIntervalTimer);
      this.pollingIntervalTimer = null;
    }
  }

  /**
   * Maps incoming POS check payload into native ChefAgent domain interfaces:
   * - TableStatus
   * - PrepItem tickets with station routing, seat numbers, modifiers, and allergen highlights
   */
  static mapPOSToChefAgentDomain(payload: POSOrderPayload): {
    tableStatusUpdate: Partial<TableStatus>;
    prepItemsGenerated: PrepItem[];
  } {
    // 1. Map TableStatus
    const tableStatusUpdate: Partial<TableStatus> = {
      tableId: payload.tableId,
      tableName: `Table ${payload.tableNumber}`,
      currentCovers: payload.guestCount,
      serverName: payload.serverName,
      status: payload.status === 'IN_KITCHEN' ? 'ENTREE_PHASE' : 'SEATED',
      lastStatusChangeTimestamp: Date.now(),
      orderTotal: payload.total,
      activeAlerts: Array.from(
        new Set(payload.items.flatMap((i) => i.allergenAlerts || []))
      ),
      version: payload.version,
    };

    // 2. Map Kitchen Prep Items for Station Cooks
    const prepItemsGenerated: PrepItem[] = payload.items.map((item, idx) => {
      const modifierDesc = item.modifiers && item.modifiers.length > 0 ? ` [${item.modifiers.join(', ')}]` : '';
      const allergenDesc = item.allergenAlerts && item.allergenAlerts.length > 0 ? ` (⚠️ ${item.allergenAlerts.join(', ')})` : '';

      return {
        id: `prep-pos-${payload.checkId}-${idx}-${Date.now()}`,
        recipeId: item.menuItemId || `pos-rec-${item.id}`,
        recipeName: `[Tbl ${payload.tableNumber}] ${item.name}${modifierDesc}${allergenDesc}`,
        targetQuantity: item.quantity,
        completedQuantity: 0,
        unitOfMeasure: 'Portions',
        stationAssignment: item.targetStation as any,
        priorityLevel: (item.allergenAlerts && item.allergenAlerts.length > 0 ? 1 : 2) as 1 | 2 | 3,
        isCompleted: false,
        assignedCookName: item.targetStation === 'Butchery' ? 'Chef Bruce' : 'Cook Marco',
        shiftedDateTimestamp: Date.now(),
        targetPlatingTimestamp: Date.now() + 25 * 60 * 1000,
        estimatedDurationMinutes: item.course === 'ENTREE' ? 20 : 12,
        chronosStage: item.course === 'ENTREE' ? 'PLATING_FIRE' : 'SUB_RECIPE',
      };
    });

    return { tableStatusUpdate, prepItemsGenerated };
  }

  /**
   * Broadcasts 86'd status to legacy POS APIs in real time when an item is depleted
   */
  static async broadcast86Update(
    ingredientName: string,
    is86: boolean,
    reason: string = 'Inventory Par Threshold Breached'
  ): Promise<POSEightysixSyncPayload> {
    const res = await this.activeAdapter.pushEightysixStatus(ingredientName, is86, reason);

    const payload: POSEightysixSyncPayload = {
      ingredientName,
      is86,
      timestamp: Date.now(),
      reason,
      affectedPosItemIds: res.posItemIdsUpdated,
      broadcastResults: [
        {
          provider: this.activeAdapter.provider,
          endpoint: `/api/v1/pos/menu/items/86`,
          status: res.success ? 'SUCCESS' : 'FAILED',
          timestamp: Date.now(),
        },
      ],
    };

    this.eightySixAuditHistory.unshift(payload);
    return payload;
  }

  /**
   * Resolves optimistic concurrency collisions when POS webhook writes simultaneously
   * with line-cook touch updates on tablet terminals (@Version column).
   */
  static resolveOptimisticLockCollision(
    entityType: 'TABLE_STATUS' | 'PREP_ITEM',
    entityId: string,
    localVersion: number,
    incomingVersion: number,
    localState: any,
    incomingState: any
  ): {
    resolvedState: any;
    nextVersion: number;
    conflictRecord: OptimisticLockConflictRecord;
  } {
    let resolvedState = { ...incomingState };
    let strategy: 'EXTERNAL_POS_WINS' | 'LOCAL_LINE_WINS' | 'MERGE_DIRTY_FIELDS' = 'MERGE_DIRTY_FIELDS';

    if (incomingVersion > localVersion) {
      // Incoming is newer
      if (localState.isCompleted && !incomingState.isCompleted) {
        // Line cook marked item complete on physical line: line cook completion takes precedence!
        resolvedState = { ...incomingState, isCompleted: true, completedQuantity: incomingState.targetQuantity };
        strategy = 'LOCAL_LINE_WINS';
      } else {
        resolvedState = { ...incomingState };
        strategy = 'EXTERNAL_POS_WINS';
      }
    } else {
      // Local version is equal or ahead: merge dirty fields
      resolvedState = { ...localState, ...incomingState };
      strategy = 'MERGE_DIRTY_FIELDS';
    }

    const nextVersion = Math.max(localVersion, incomingVersion) + 1;
    resolvedState.version = nextVersion;

    const conflictRecord: OptimisticLockConflictRecord = {
      conflictId: `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entityType,
      entityId,
      localVersion,
      incomingVersion,
      resolutionStrategy: strategy,
      timestamp: Date.now(),
      resolvedStateJson: JSON.stringify(resolvedState),
    };

    this.conflictLogs.unshift(conflictRecord);
    return { resolvedState, nextVersion, conflictRecord };
  }

  static getConflictLogs(): OptimisticLockConflictRecord[] {
    return [...this.conflictLogs];
  }

  static get86AuditHistory(): POSEightysixSyncPayload[] {
    return [...this.eightySixAuditHistory];
  }
}
