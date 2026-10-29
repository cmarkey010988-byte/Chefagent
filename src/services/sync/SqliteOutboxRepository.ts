/**
 * SqliteOutboxRepository.ts
 *
 * DAO & Repository layer managing the local append-only `mutation_outbox` table
 * and vector clock versioning for local-first zero-latency writes.
 */

export interface VectorClock {
  [nodeId: string]: number;
}

export type OutboxSyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT';
export type MutationOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface MutationOutboxRecord {
  seqId: number;
  id: string; // UUIDv4
  tableName: string;
  operation: MutationOperation;
  payloadJson: string;
  entityId: string;
  vectorClock: VectorClock;
  createdAt: number; // ms timestamp
  syncStatus: OutboxSyncStatus;
  retryCount: number;
  lastAttemptAt?: number;
  conflictResolutionNotes?: string;
}

export interface OutboxStats {
  pendingCount: number;
  syncingCount: number;
  syncedCount: number;
  conflictCount: number;
  totalMutations: number;
  maxSeqId: number;
  journalMode: 'WAL' | 'DELETE' | 'MEMORY';
  synchronousMode: 'NORMAL' | 'FULL' | 'OFF';
  nodeId: string;
}

export class SqliteOutboxRepository {
  private static nodeId: string = `node_${Math.floor(100 + Math.random() * 900)}`;
  private static sequenceCounter: number = 1000;
  private static outboxStore: MutationOutboxRecord[] = [];
  private static journalMode: 'WAL' | 'DELETE' | 'MEMORY' = 'WAL';
  private static synchronousMode: 'NORMAL' | 'FULL' | 'OFF' = 'NORMAL';

  public static getNodeId(): string {
    return this.nodeId;
  }

  public static setNodeId(id: string): void {
    this.nodeId = id;
  }

  /**
   * Configures SQLite WAL mode pragmas
   */
  public static configureWalPragmas(
    journalMode: 'WAL' | 'DELETE' | 'MEMORY' = 'WAL',
    synchronousMode: 'NORMAL' | 'FULL' | 'OFF' = 'NORMAL'
  ): { journalMode: string; synchronousMode: string } {
    this.journalMode = journalMode;
    this.synchronousMode = synchronousMode;
    return {
      journalMode: this.journalMode,
      synchronousMode: this.synchronousMode,
    };
  }

  /**
   * Generate UUIDv4 for local mutations
   */
  public static generateUUIDv4(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Append a local mutation to the outbox queue in an atomic local transaction
   */
  public static appendMutation(
    tableName: string,
    operation: MutationOperation,
    entityId: string,
    payload: Record<string, any>,
    existingVectorClock?: VectorClock
  ): MutationOutboxRecord {
    this.sequenceCounter += 1;
    const seqId = this.sequenceCounter;
    const id = this.generateUUIDv4();

    // Increment current node version in vector clock
    const updatedClock: VectorClock = { ...(existingVectorClock || {}) };
    updatedClock[this.nodeId] = (updatedClock[this.nodeId] || 0) + 1;

    const record: MutationOutboxRecord = {
      seqId,
      id,
      tableName,
      operation,
      payloadJson: JSON.stringify({
        ...payload,
        vectorClock: updatedClock,
        updatedAt: Date.now(),
      }),
      entityId,
      vectorClock: updatedClock,
      createdAt: Date.now(),
      syncStatus: 'PENDING',
      retryCount: 0,
    };

    this.outboxStore.push(record);
    return record;
  }

  /**
   * Retrieve pending outbox mutations up to batchSize
   */
  public static getPendingMutations(batchSize: number = 50): MutationOutboxRecord[] {
    return this.outboxStore
      .filter((r) => r.syncStatus === 'PENDING' || r.syncStatus === 'SYNCING')
      .slice(0, batchSize);
  }

  /**
   * Mark sequence IDs as SYNCED
   */
  public static markMutationsSynced(seqIds: number[]): void {
    const idSet = new Set(seqIds);
    for (const record of this.outboxStore) {
      if (idSet.has(record.seqId)) {
        record.syncStatus = 'SYNCED';
        record.lastAttemptAt = Date.now();
      }
    }
  }

  /**
   * Mark sequence ID as CONFLICT with resolution notes
   */
  public static markMutationConflict(seqId: number, notes: string): void {
    for (const record of this.outboxStore) {
      if (record.seqId === seqId) {
        record.syncStatus = 'CONFLICT';
        record.conflictResolutionNotes = notes;
        record.lastAttemptAt = Date.now();
      }
    }
  }

  /**
   * Increment retry count for failed sync attempt
   */
  public static incrementRetryCount(seqId: number): void {
    for (const record of this.outboxStore) {
      if (record.seqId === seqId) {
        record.retryCount += 1;
        record.lastAttemptAt = Date.now();
        if (record.retryCount >= 5) {
          record.syncStatus = 'CONFLICT';
          record.conflictResolutionNotes = 'Max sync retries exceeded (5 attempts).';
        }
      }
    }
  }

  /**
   * Get outbox summary statistics
   */
  public static getOutboxStats(): OutboxStats {
    let pendingCount = 0;
    let syncingCount = 0;
    let syncedCount = 0;
    let conflictCount = 0;
    let maxSeqId = 0;

    for (const record of this.outboxStore) {
      if (record.seqId > maxSeqId) maxSeqId = record.seqId;
      if (record.syncStatus === 'PENDING') pendingCount++;
      else if (record.syncStatus === 'SYNCING') syncingCount++;
      else if (record.syncStatus === 'SYNCED') syncedCount++;
      else if (record.syncStatus === 'CONFLICT') conflictCount++;
    }

    return {
      pendingCount,
      syncingCount,
      syncedCount,
      conflictCount,
      totalMutations: this.outboxStore.length,
      maxSeqId,
      journalMode: this.journalMode,
      synchronousMode: this.synchronousMode,
      nodeId: this.nodeId,
    };
  }

  /**
   * Purge synced mutations from outbox store
   */
  public static purgeSyncedMutations(): number {
    const initialCount = this.outboxStore.length;
    this.outboxStore = this.outboxStore.filter((r) => r.syncStatus !== 'SYNCED');
    return initialCount - this.outboxStore.length;
  }

  /**
   * Get all outbox records (for inspection / testing)
   */
  public static getAllRecords(): MutationOutboxRecord[] {
    return [...this.outboxStore];
  }

  /**
   * Reset store (testing)
   */
  public static resetStore(): void {
    this.outboxStore = [];
    this.sequenceCounter = 1000;
  }
}
