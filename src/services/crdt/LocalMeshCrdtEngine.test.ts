import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalMeshCrdtEngine } from './LocalMeshCrdtEngine';

test('LocalMeshCrdtEngine - creates and stores local pan state with advancing Lamport clock', () => {
  const engine = new LocalMeshCrdtEngine('node-sauce');
  const state1 = engine.updateLocalPanState('Sauce/Sauté', 'pan-salmon', 'Atlantic Salmon Fillets', 45, false);

  assert.equal(state1.panId, 'pan-salmon');
  assert.equal(state1.fillLevel, 45);
  assert.equal(state1.is86, false);
  assert.equal(state1.lastWriterNode, 'node-sauce');
  assert.equal(state1.lamportTimestamp, 1);
  assert.equal(engine.getLocalLamportClock(), 1);
});

test('LocalMeshCrdtEngine - merges remote pan state with higher Lamport timestamp', () => {
  const engine = new LocalMeshCrdtEngine('node-sauce');
  engine.updateLocalPanState('Sauce/Sauté', 'pan-sauce', 'Hollandaise', 60, false); // Lamport = 1

  // Remote grill station marks sauce as 86 with Lamport = 4
  const remoteState = {
    stationId: 'Sauce/Sauté',
    panId: 'pan-sauce',
    itemName: 'Hollandaise',
    fillLevel: 0,
    is86: true,
    lastWriterNode: 'node-grill',
    lamportTimestamp: 4,
    versionVector: { 'node-grill': 4 },
  };

  const result = engine.mergeRemotePanState(remoteState);
  assert.equal(result.isMerged, true);
  assert.equal(result.winningState.fillLevel, 0);
  assert.equal(result.winningState.is86, true);
  assert.ok(engine.getLocalLamportClock() > 4);
});

test('LocalMeshCrdtEngine - resolves partition recovery without data loss', () => {
  const engine = new LocalMeshCrdtEngine('node-sauce');

  // Isolated walk-in cold prep station re-connects after 15 min Wi-Fi dead zone
  const isolatedStates = [
    {
      stationId: 'Garde Manger',
      panId: 'pan-oysters',
      itemName: 'Kumamoto Oysters',
      fillLevel: 10,
      is86: false,
      lastWriterNode: 'node-kiosk-coldprep',
      lamportTimestamp: 12,
      versionVector: { 'node-kiosk-coldprep': 12 },
    },
    {
      stationId: 'Garde Manger',
      panId: 'pan-caviar',
      itemName: 'Oscietra Caviar',
      fillLevel: 0,
      is86: true,
      lastWriterNode: 'node-kiosk-coldprep',
      lamportTimestamp: 15,
      versionVector: { 'node-kiosk-coldprep': 15 },
    },
  ];

  const resolved = engine.simulatePartitionRecovery('node-kiosk-coldprep', isolatedStates);
  assert.equal(resolved, 2);

  const mergedCaviar = engine.getPanState('pan-caviar');
  assert.equal(mergedCaviar?.is86, true);
  assert.equal(mergedCaviar?.fillLevel, 0);
});
