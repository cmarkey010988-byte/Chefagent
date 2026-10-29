/**
 * P2PDeltaSyncEngine.ts
 *
 * Industrial-Grade P2P Local Mesh & Background Delta Sync Engine for ChefAgent.
 * Implements exponential backoff retry logic and Deterministic Last-Write-Wins (LWW)
 * conflict resolution paired with logical Entity Vector Clocks.
 */

import {
  SqliteOutboxRepository,
  VectorClock,
  MutationOutboxRecord,
} from './SqliteOutboxRepository';
import { LocalDatabaseEngine } from './LocalDatabaseEngine';

export type EngineSyncState =
  | 'ONLINE'
  | 'OFFLINE'
  | 'POLLING'
  | 'SYNCING'
  | 'RESOLVING_CONFLICT'
  | 'BACKOFF';

export type VectorClockComparisonResult =
  | 'A_DOMINATES'
  | 'B_DOMINATES'
  | 'EQUAL'
  | 'CONCURRENT';

export interface SyncConflictAuditEntry {
  id: string;
  seqId: number;
  entityId: string;
  tableName: string;
  localVectorClock: VectorClock;
  remoteVectorClock: VectorClock;
  resolutionStrategy:
    | 'REMOTE_DOMINATES'
    | 'LOCAL_DOMINATES'
    | 'LWW_REMOTE_TIMESTAMP'
    | 'LWW_LOCAL_TIMESTAMP'
    | 'TIEBREAKER_NODE_ID';
  winningPayload: Record<string, any>;
  resolvedAt: number;
}

export interface P2PMeshNode {
  nodeId: string;
  nodeName: string;
  ipAddress: string;
  latencyMs: number;
  isLeader: boolean;
  lastSeenMs: number;
  syncSequence: number;
}

export class P2PDeltaSyncEngine {
  private static currentState: EngineSyncState = 'ONLINE';
  private static isNetworkForcedOffline: boolean = false;
  private static conflictAuditLogs: SyncConflictAuditEntry[] = [];
  private static syncListeners: Array<(state: EngineSyncState) => void> = [];
  private static currentRetryAttempt: number = 0;
  private static backoffTimeoutTimer: any = null;
  private static syncIntervalTimer: any = null;

  private static meshNodes: P2PMeshNode[] = [
    {
      nodeId: 'node_central_cloud',
      nodeName: 'Central Cloud Server',
      ipAddress: '10.0.1.1',
      latencyMs: 14,
      isLeader: true,
      lastSeenMs: Date.now(),
      syncSequence: 1042,
    },
    {
      nodeId: 'node_sauce_kiosk',
      nodeName: 'BOH Sauce Station Kiosk',
      ipAddress: '192.168.1.104',
      latencyMs: 2,
      isLeader: false,
      lastSeenMs: Date.now(),
      syncSequence: 1039,
    },
    {
      nodeId: 'node_expeditor_pass',
      nodeName: 'Expediter Pass Terminal',
      ipAddress: '192.168.1.108',
      latencyMs: 3,
      isLeader: false,
      lastSeenMs: Date.now(),
      syncSequence: 1041,
    },
  ];

  /**
   * Start background sync worker polling loop
   */
  public static startSyncWorker(pollIntervalMs: number = 3000): void {
    if (this.syncIntervalTimer) clearInterval(this.syncIntervalTimer);
    this.syncIntervalTimer = setInterval(() => {
      if (!this.isNetworkForcedOffline && this.currentState !== 'SYNCING') {
        this.processOutboxDeltaQueue();
      }
    }, pollIntervalMs);
  }

  public static stopSyncWorker(): void {
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
      this.syncIntervalTimer = null;
    }
  }

  // ============================================================================
  // VECTOR CLOCK & CONFLICT RESOLUTION MATHEMATICAL ALGORITHMS
  // ============================================================================

  /**
   * Compare two logical Vector Clocks (clockA vs clockB)
   * Dominance Rule:
   * A dominates B iff for every nodeId n, clockA[n] >= clockB[n] AND for at least one n, clockA[n] > clockB[n].
   */
  public static compareVectorClocks(
    clockA: VectorClock,
    clockB: VectorClock
  ): VectorClockComparisonResult {
    const allNodeIds = new Set([
      ...Object.keys(clockA || {}),
      ...Object.keys(clockB || {}),
    ]);

    let aGreaterCount = 0;
    let bGreaterCount = 0;

    for (const nodeId of allNodeIds) {
      const vA = clockA[nodeId] || 0;
      const vB = clockB[nodeId] || 0;

      if (vA > vB) aGreaterCount++;
      if (vB > vA) bGreaterCount++;
    }

    if (aGreaterCount > 0 && bGreaterCount === 0) return 'A_DOMINATES';
    if (bGreaterCount > 0 && aGreaterCount === 0) return 'B_DOMINATES';
    if (aGreaterCount === 0 && bGreaterCount === 0) return 'EQUAL';
    return 'CONCURRENT'; // Split-brain concurrent edits
  }

  /**
   * Deterministic LWW Conflict Resolver using Entity Vector Clocks
   */
  public static resolveConflict(
    localMutation: {
      vectorClock: VectorClock;
      updatedAt: number;
      payload: Record<string, any>;
      nodeId: string;
      seqId: number;
      tableName: string;
      entityId: string;
    },
    remoteMutation: {
      vectorClock: VectorClock;
      updatedAt: number;
      payload: Record<string, any>;
      nodeId: string;
      seqId: number;
      tableName: string;
      entityId: string;
    }
  ): {
    winner: 'LOCAL' | 'REMOTE';
    winningPayload: Record<string, any>;
    strategy: SyncConflictAuditEntry['resolutionStrategy'];
  } {
    const clockComparison = this.compareVectorClocks(
      localMutation.vectorClock,
      remoteMutation.vectorClock
    );

    let winner: 'LOCAL' | 'REMOTE' = 'LOCAL';
    let strategy: SyncConflictAuditEntry['resolutionStrategy'] = 'LOCAL_DOMINATES';

    if (clockComparison === 'A_DOMINATES') {
      winner = 'LOCAL';
      strategy = 'LOCAL_DOMINATES';
    } else if (clockComparison === 'B_DOMINATES') {
      winner = 'REMOTE';
      strategy = 'REMOTE_DOMINATES';
    } else {
      // Split-brain concurrent modification -> Fallback to Last-Write-Wins (LWW) by timestamp
      if (remoteMutation.updatedAt > localMutation.updatedAt) {
        winner = 'REMOTE';
        strategy = 'LWW_REMOTE_TIMESTAMP';
      } else if (localMutation.updatedAt > remoteMutation.updatedAt) {
        winner = 'LOCAL';
        strategy = 'LWW_LOCAL_TIMESTAMP';
      } else {
        // Equal timestamps -> Deterministic tie-breaker using nodeId lexicographical string comparison
        if (remoteMutation.nodeId > localMutation.nodeId) {
          winner = 'REMOTE';
          strategy = 'TIEBREAKER_NODE_ID';
        } else {
          winner = 'LOCAL';
          strategy = 'TIEBREAKER_NODE_ID';
        }
      }
    }

    const winningPayload =
      winner === 'REMOTE' ? remoteMutation.payload : localMutation.payload;

    // Log conflict audit entry
    const auditEntry: SyncConflictAuditEntry = {
      id: SqliteOutboxRepository.generateUUIDv4(),
      seqId: localMutation.seqId,
      entityId: localMutation.entityId,
      tableName: localMutation.tableName,
      localVectorClock: localMutation.vectorClock,
      remoteVectorClock: remoteMutation.vectorClock,
      resolutionStrategy: strategy,
      winningPayload,
      resolvedAt: Date.now(),
    };

    this.conflictAuditLogs.unshift(auditEntry);
    if (this.conflictAuditLogs.length > 50) this.conflictAuditLogs.pop();

    return { winner, winningPayload, strategy };
  }

  // ============================================================================
  // EXPONENTIAL BACKOFF RETRY ALGORITHM
  // ============================================================================

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: delay = min(maxDelay, baseDelay * (factor ^ attempt)) +/- jitter
   */
  public static calculateExponentialBackoff(
    attempt: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000,
    factor: number = 2.0,
    jitterRatio: number = 0.2
  ): number {
    const rawDelay = baseDelayMs * Math.pow(factor, Math.max(0, attempt - 1));
    const cappedDelay = Math.min(maxDelayMs, rawDelay);
    const jitter = cappedDelay * jitterRatio * (Math.random() * 2 - 1);
    return Math.round(Math.max(baseDelayMs, cappedDelay + jitter));
  }

  // ============================================================================
  // OUTBOX DELTA SYNC PIPELINE & RECONCILIATION WORKER
  // ============================================================================

  public static async processOutboxDeltaQueue(): Promise<{
    processedCount: number;
    syncedSeqIds: number[];
    conflictsResolvedCount: number;
  }> {
    if (this.isNetworkForcedOffline) {
      this.setState('OFFLINE');
      return { processedCount: 0, syncedSeqIds: [], conflictsResolvedCount: 0 };
    }

    const pendingMutations = SqliteOutboxRepository.getPendingMutations(20);
    if (pendingMutations.length === 0) {
      if (this.currentState !== 'ONLINE') this.setState('ONLINE');
      return { processedCount: 0, syncedSeqIds: [], conflictsResolvedCount: 0 };
    }

    this.setState('SYNCING');

    try {
      // Simulate/Trigger API endpoint /api/v1/sync/wal-outbox transmission
      const response = await fetch('/api/v1/sync/wal-outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceNodeId: SqliteOutboxRepository.getNodeId(),
          mutations: pendingMutations,
          timestamp: Date.now(),
        }),
      }).catch(() => null);

      if (!response || !response.ok) {
        // Handle server unreachable / offline error -> Trigger Backoff
        this.handleSyncFailure(pendingMutations);
        return { processedCount: 0, syncedSeqIds: [], conflictsResolvedCount: 0 };
      }

      const result = await response.json();
      const syncedSeqIds = result.syncedSeqIds || pendingMutations.map((m) => m.seqId);

      SqliteOutboxRepository.markMutationsSynced(syncedSeqIds);

      this.currentRetryAttempt = 0;
      this.setState('ONLINE');

      return {
        processedCount: pendingMutations.length,
        syncedSeqIds,
        conflictsResolvedCount: result.conflictsResolvedCount || 0,
      };
    } catch (err) {
      this.handleSyncFailure(pendingMutations);
      return { processedCount: 0, syncedSeqIds: [], conflictsResolvedCount: 0 };
    }
  }

  private static handleSyncFailure(mutations: MutationOutboxRecord[]): void {
    this.currentRetryAttempt += 1;
    for (const m of mutations) {
      SqliteOutboxRepository.incrementRetryCount(m.seqId);
    }

    const backoffMs = this.calculateExponentialBackoff(this.currentRetryAttempt);
    this.setState('BACKOFF');

    if (this.backoffTimeoutTimer) clearTimeout(this.backoffTimeoutTimer);
    this.backoffTimeoutTimer = setTimeout(() => {
      this.processOutboxDeltaQueue();
    }, backoffMs);
  }

  // ============================================================================
  // SIMULATION & CONTROLS FOR UI DEMO HUD
  // ============================================================================

  public static toggleForcedNetworkOffline(): boolean {
    this.isNetworkForcedOffline = !this.isNetworkForcedOffline;
    if (this.isNetworkForcedOffline) {
      this.setState('OFFLINE');
    } else {
      this.currentRetryAttempt = 0;
      this.setState('ONLINE');
      this.processOutboxDeltaQueue();
    }
    return this.isNetworkForcedOffline;
  }

  public static isOffline(): boolean {
    return this.isNetworkForcedOffline || this.currentState === 'OFFLINE';
  }

  public static getCurrentState(): EngineSyncState {
    return this.currentState;
  }

  public static getMeshNodes(): P2PMeshNode[] {
    return this.meshNodes;
  }

  public static getConflictAuditLogs(): SyncConflictAuditEntry[] {
    return this.conflictAuditLogs;
  }

  public static subscribeStateChange(listener: (state: EngineSyncState) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private static setState(newState: EngineSyncState): void {
    this.currentState = newState;
    for (const listener of this.syncListeners) {
      listener(newState);
    }
  }

  /**
   * Simulate a concurrent split-brain conflict for visual demonstration
   */
  public static simulateSplitBrainConflict(): {
    localRecord: MutationOutboxRecord;
    conflictResult: any;
  } {
    const entityId = 'item-beef-101';
    const localClock: VectorClock = { [SqliteOutboxRepository.getNodeId()]: 5, node_sauce_kiosk: 2 };
    const remoteClock: VectorClock = { [SqliteOutboxRepository.getNodeId()]: 3, node_sauce_kiosk: 6 }; // Concurrent!

    const localMutation = SqliteOutboxRepository.appendMutation(
      'inventory_items',
      'UPDATE',
      entityId,
      {
        ingredientName: 'Prime Beef Tenderloin (PSMO)',
        currentOnHandQuantity: 18.5,
        updatedAt: Date.now() - 500,
      },
      localClock
    );

    const remoteMutation = {
      vectorClock: remoteClock,
      updatedAt: Date.now(),
      payload: {
        ingredientName: 'Prime Beef Tenderloin (PSMO)',
        currentOnHandQuantity: 14.0,
        updatedAt: Date.now(),
      },
      nodeId: 'node_sauce_kiosk',
      seqId: 999,
      tableName: 'inventory_items',
      entityId,
    };

    const conflictResult = this.resolveConflict(
      {
        vectorClock: localMutation.vectorClock,
        updatedAt: localMutation.createdAt,
        payload: JSON.parse(localMutation.payloadJson),
        nodeId: SqliteOutboxRepository.getNodeId(),
        seqId: localMutation.seqId,
        tableName: localMutation.tableName,
        entityId: localMutation.entityId,
      },
      remoteMutation
    );

    SqliteOutboxRepository.markMutationConflict(
      localMutation.seqId,
      `Resolved via ${conflictResult.strategy}. Winner: ${conflictResult.winner}`
    );

    return { localRecord: localMutation, conflictResult };
  }
}
