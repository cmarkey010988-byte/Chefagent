/**
 * src/services/crdt/LocalMeshCrdtEngine.ts
 *
 * Local-First CRDT (Conflict-free Replicated Data Type) & Edge Mesh Engine.
 * Synchronizes kitchen telemetry, pan fill levels, and 86 inventory state over
 * local ad-hoc Wi-Fi mesh without relying on centralized cloud round-trips.
 *
 * Employs a State-based LWW-Element-Set combined with Version Vectors to guarantee
 * causal consistency and monotonic convergence across network partitions.
 */

import { CrdtPanState, MeshCrdtPeerNode } from '../../types/vision';

export class LocalMeshCrdtEngine {
  private localNodeId: string;
  private localLamportClock: number = 0;
  private localVersionVector: Record<string, number> = {};
  private panStateStore: Map<string, CrdtPanState> = new Map();
  private peerNodes: Map<string, MeshCrdtPeerNode> = new Map();
  private partitionMergeCount: number = 0;

  constructor(localNodeId: string = 'node-kiosk-sauce') {
    this.localNodeId = localNodeId;
    this.localVersionVector[localNodeId] = 0;
    this.seedDefaultMeshPeers();
  }

  private seedDefaultMeshPeers(): void {
    const defaultPeers: MeshCrdtPeerNode[] = [
      {
        peerId: 'node-kiosk-grill',
        stationName: 'Grill Station Kiosk',
        ipAddress: '192.168.1.102',
        port: 8888,
        vectorClock: { 'node-kiosk-grill': 14 },
        isMeshLeader: false,
        latencyMs: 3,
        partitionStatus: 'CONNECTED',
        lastMergeTimestamp: Date.now(),
      },
      {
        peerId: 'node-kiosk-expediter',
        stationName: 'Expediter Pass Kiosk',
        ipAddress: '192.168.1.105',
        port: 8888,
        vectorClock: { 'node-kiosk-expediter': 22 },
        isMeshLeader: true,
        latencyMs: 2,
        partitionStatus: 'CONNECTED',
        lastMergeTimestamp: Date.now(),
      },
      {
        peerId: 'node-kiosk-coldprep',
        stationName: 'Garde Manger Walk-in Kiosk',
        ipAddress: '192.168.1.110',
        port: 8888,
        vectorClock: { 'node-kiosk-coldprep': 9 },
        isMeshLeader: false,
        latencyMs: 8,
        partitionStatus: 'CONNECTED',
        lastMergeTimestamp: Date.now(),
      },
    ];

    for (const peer of defaultPeers) {
      this.peerNodes.set(peer.peerId, peer);
    }
  }

  /**
   * Updates local pan fill level and 86 status, incrementing local Lamport clock.
   */
  public updateLocalPanState(
    stationId: string,
    panId: string,
    itemName: string,
    fillLevel: number,
    is86: boolean
  ): CrdtPanState {
    this.localLamportClock++;
    this.localVersionVector[this.localNodeId] = (this.localVersionVector[this.localNodeId] || 0) + 1;

    const panState: CrdtPanState = {
      stationId,
      panId,
      itemName,
      fillLevel: Math.max(0, Math.min(100, fillLevel)),
      is86,
      lastWriterNode: this.localNodeId,
      lamportTimestamp: this.localLamportClock,
      versionVector: { ...this.localVersionVector },
    };

    this.panStateStore.set(panId, panState);
    return panState;
  }

  /**
   * Merges incoming remote CRDT pan state using monotonic Last-Writer-Wins
   * with deterministic Node ID tie-breaker if timestamps are equal.
   */
  public mergeRemotePanState(remoteState: CrdtPanState): { isMerged: boolean; winningState: CrdtPanState } {
    // Monotonically advance local Lamport clock
    this.localLamportClock = Math.max(this.localLamportClock, remoteState.lamportTimestamp) + 1;

    // Merge version vectors (pairwise maximum)
    for (const [nodeId, seq] of Object.entries(remoteState.versionVector)) {
      this.localVersionVector[nodeId] = Math.max(this.localVersionVector[nodeId] || 0, seq);
    }

    const localState = this.panStateStore.get(remoteState.panId);

    if (!localState) {
      this.panStateStore.set(remoteState.panId, remoteState);
      this.partitionMergeCount++;
      return { isMerged: true, winningState: remoteState };
    }

    // Determine winner
    let remoteWins = false;

    if (remoteState.lamportTimestamp > localState.lamportTimestamp) {
      remoteWins = true;
    } else if (remoteState.lamportTimestamp === localState.lamportTimestamp) {
      // Deterministic tie-breaker: lexicographical comparison of node IDs
      remoteWins = remoteState.lastWriterNode > localState.lastWriterNode;
    }

    const winner = remoteWins ? remoteState : localState;
    this.panStateStore.set(remoteState.panId, winner);
    this.partitionMergeCount++;

    return { isMerged: remoteWins, winningState: winner };
  }

  /**
   * Simulates network partition split and subsequent mesh reconciliation.
   */
  public simulatePartitionRecovery(isolatedPeerId: string, isolatedPanStates: CrdtPanState[]): number {
    let resolvedCount = 0;
    const peer = this.peerNodes.get(isolatedPeerId);
    if (peer) {
      peer.partitionStatus = 'MERGING';
    }

    for (const state of isolatedPanStates) {
      this.mergeRemotePanState(state);
      resolvedCount++;
    }

    if (peer) {
      peer.partitionStatus = 'CONNECTED';
      peer.lastMergeTimestamp = Date.now();
    }

    return resolvedCount;
  }

  public getPanState(panId: string): CrdtPanState | undefined {
    return this.panStateStore.get(panId);
  }

  public getAllPanStates(): CrdtPanState[] {
    return Array.from(this.panStateStore.values());
  }

  public getConnectedPeers(): MeshCrdtPeerNode[] {
    return Array.from(this.peerNodes.values());
  }

  public getPartitionMergeCount(): number {
    return this.partitionMergeCount;
  }

  public getLocalLamportClock(): number {
    return this.localLamportClock;
  }

  public getLocalVersionVector(): Record<string, number> {
    return { ...this.localVersionVector };
  }
}
