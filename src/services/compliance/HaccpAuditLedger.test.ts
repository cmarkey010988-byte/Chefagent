import test from 'node:test';
import assert from 'node:assert/strict';
import { HaccpAuditLedger } from './HaccpAuditLedger';

test('HaccpAuditLedger - initializes Genesis block with valid hash', () => {
  HaccpAuditLedger.resetForTesting();
  const chain = HaccpAuditLedger.getLedgerChain();
  assert.equal(chain.length, 1);
  assert.equal(chain[0].blockHeight, 0);
  assert.equal(chain[0].previousHash, HaccpAuditLedger.GENESIS_PREVIOUS_HASH);
  assert.ok(chain[0].currentHash.length === 64);
});

test('HaccpAuditLedger - appends incident block and verifies cryptographic integrity', () => {
  HaccpAuditLedger.resetForTesting();

  const block1 = HaccpAuditLedger.appendIncidentBlock({
    stationId: 'Sauce/Sauté',
    incidentType: 'TEMPERATURE_DANGER_ZONE',
    itemDescription: 'Hollandaise Holding Pan',
    measuredValue: '128°F',
    thresholdValue: '>= 140°F',
    actionTaken: 'Reheated sauce to 165°F and reset 2-hr discard timer',
  });

  assert.equal(block1.blockHeight, 1);
  assert.equal(block1.previousHash, HaccpAuditLedger.getLedgerChain()[0].currentHash);

  const integrity = HaccpAuditLedger.verifyLedgerIntegrity();
  assert.equal(integrity.isValid, true);
});

test('HaccpAuditLedger - detects tamper in block chain', () => {
  HaccpAuditLedger.resetForTesting();

  HaccpAuditLedger.appendIncidentBlock({
    stationId: 'Grill',
    incidentType: 'KNIFE_HAZARD',
    itemDescription: 'Carving Knife unattended on board',
    measuredValue: 'Hazard detected',
    thresholdValue: 'Sheathed / Magnetic Rack',
    actionTaken: 'Cook returned knife to sanitized magnetic bar',
  });

  const corruptedChain = HaccpAuditLedger.getLedgerChain();
  // Tamper with payload
  corruptedChain[1].measuredValue = 'No hazard here';

  const check = HaccpAuditLedger.verifyLedgerIntegrity(corruptedChain);
  assert.equal(check.isValid, false);
  assert.equal(check.corruptedBlockHeight, 1);
});

test('HaccpAuditLedger - evaluates danger zone excursions and creates shift compliance report', () => {
  HaccpAuditLedger.resetForTesting();

  // Test cold hold violation: 48°F (> 41°F)
  const coldCheck = HaccpAuditLedger.checkTemperatureDangerZone('Garde Manger', 'Oyster Station Ice Pan', 48, 'COLD_HOLD');
  assert.equal(coldCheck.isViolation, true);
  assert.equal(coldCheck.infraction, 'TEMPERATURE_DANGER_ZONE');

  // Test hot hold compliance: 155°F (>= 140°F)
  const hotCheck = HaccpAuditLedger.checkTemperatureDangerZone('Sauce/Sauté', 'Veal Demi-Glace', 155, 'HOT_HOLD');
  assert.equal(hotCheck.isViolation, false);

  const report = HaccpAuditLedger.generateShiftComplianceReport('Garde Manger');
  assert.equal(report.dangerZoneViolations, 1);
  assert.equal(report.ledgerIntegrityValid, true);
  assert.ok(report.complianceScorePercent < 100);
});
