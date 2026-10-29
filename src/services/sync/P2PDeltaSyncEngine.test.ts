import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteOutboxRepository } from './SqliteOutboxRepository';
import { LocalDatabaseEngine } from './LocalDatabaseEngine';
import { P2PDeltaSyncEngine } from './P2PDeltaSyncEngine';

test('SQLite WAL mode pragmas configure correctly', () => {
  const pragmas = SqliteOutboxRepository.configureWalPragmas('WAL', 'NORMAL');
  assert.equal(pragmas.journalMode, 'WAL');
  assert.equal(pragmas.synchronousMode, 'NORMAL');
});

test('Local 0ms inventory adjustment appends to mutation_outbox with UUIDv4 and monotonic seq_id', () => {
  SqliteOutboxRepository.resetStore();
  LocalDatabaseEngine.resetStores();

  const nodeId = SqliteOutboxRepository.getNodeId();
  const { item, outboxRecord } = LocalDatabaseEngine.updateInventoryQuantity(
    'item-halibut-99',
    -3.5,
    'Line Use Dinner Service'
  );

  assert.equal(item.currentOnHandQuantity, 0); // Max(0, 0 - 3.5)
  assert.equal(outboxRecord.seqId, 1001);
  assert.ok(outboxRecord.id.length >= 32);
  assert.equal(outboxRecord.tableName, 'inventory_items');
  assert.equal(outboxRecord.operation, 'UPDATE');
  assert.equal(outboxRecord.syncStatus, 'PENDING');
  assert.equal(outboxRecord.vectorClock[nodeId], 1);

  const stats = SqliteOutboxRepository.getOutboxStats();
  assert.equal(stats.pendingCount, 1);
  assert.equal(stats.maxSeqId, 1001);
});

test('Vector clock dominance evaluator accurately identifies dominance and concurrent split-brain states', () => {
  const clockA = { node_1: 5, node_2: 3 };
  const clockB = { node_1: 4, node_2: 2 };
  assert.equal(P2PDeltaSyncEngine.compareVectorClocks(clockA, clockB), 'A_DOMINATES');

  const clockC = { node_1: 5, node_2: 3 };
  const clockD = { node_1: 6, node_2: 4 };
  assert.equal(P2PDeltaSyncEngine.compareVectorClocks(clockC, clockD), 'B_DOMINATES');

  const clockE = { node_1: 5, node_2: 3 };
  const clockF = { node_1: 4, node_2: 4 }; // Split-brain!
  assert.equal(P2PDeltaSyncEngine.compareVectorClocks(clockE, clockF), 'CONCURRENT');
});

test('Deterministic LWW conflict resolver chooses highest timestamp or node ID tie-breaker during concurrent edits', () => {
  const localMutation = {
    vectorClock: { node_A: 4, node_B: 2 },
    updatedAt: 1000,
    payload: { currentOnHandQuantity: 12 },
    nodeId: 'node_A',
    seqId: 101,
    tableName: 'inventory_items',
    entityId: 'item-1',
  };

  const remoteMutationHigherTimestamp = {
    vectorClock: { node_A: 2, node_B: 5 }, // Concurrent
    updatedAt: 1050, // Higher!
    payload: { currentOnHandQuantity: 10 },
    nodeId: 'node_B',
    seqId: 102,
    tableName: 'inventory_items',
    entityId: 'item-1',
  };

  const resolution1 = P2PDeltaSyncEngine.resolveConflict(localMutation, remoteMutationHigherTimestamp);
  assert.equal(resolution1.winner, 'REMOTE');
  assert.equal(resolution1.strategy, 'LWW_REMOTE_TIMESTAMP');
  assert.equal(resolution1.winningPayload.currentOnHandQuantity, 10);

  // Equal timestamps -> Node ID lexicographical tie-breaker
  const remoteMutationEqualTimestamp = {
    ...remoteMutationHigherTimestamp,
    updatedAt: 1000, // Same as local
    nodeId: 'node_Z', // Higher string comparison
  };

  const resolution2 = P2PDeltaSyncEngine.resolveConflict(localMutation, remoteMutationEqualTimestamp);
  assert.equal(resolution2.winner, 'REMOTE');
  assert.equal(resolution2.strategy, 'TIEBREAKER_NODE_ID');
});

test('Exponential backoff algorithm calculates proper delay with capping', () => {
  const delay1 = P2PDeltaSyncEngine.calculateExponentialBackoff(1, 1000, 30000, 2.0, 0.0);
  assert.equal(delay1, 1000);

  const delay3 = P2PDeltaSyncEngine.calculateExponentialBackoff(3, 1000, 30000, 2.0, 0.0);
  assert.equal(delay3, 4000); // 1000 * 2^2

  const delay10 = P2PDeltaSyncEngine.calculateExponentialBackoff(10, 1000, 30000, 2.0, 0.0);
  assert.equal(delay10, 30000); // Capped at maxDelay
});
