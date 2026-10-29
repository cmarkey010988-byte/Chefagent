/**
 * src/services/erp/ERPIntegrationService.test.ts
 *
 * Unit tests for ERP General Ledger mapping and CSV export formatting.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ERPIntegrationService } from './ERPIntegrationService';

test('ERP GL code mapping produces correct category and debit/credit distribution', () => {
  const payload = ERPIntegrationService.generateGLEntries('PROP-TEST-01', 100000, 25000, 3000, 30000);

  assert.equal(payload.propertyId, 'PROP-TEST-01');
  assert.equal(payload.totalRevenue, 100000);
  assert.equal(payload.totalCogs, 28000); // 25000 COGS + 3000 Waste
  assert.equal(payload.netMargin, 42000); // 100000 - 28000 - 30000 labor

  const revEntry = payload.entries.find((e) => e.accountCode === '4000-REV');
  assert.ok(revEntry);
  assert.equal(revEntry.credit, 100000);
  assert.equal(revEntry.category, 'REVENUE');

  const wasteEntry = payload.entries.find((e) => e.accountCode === '5200-WST');
  assert.ok(wasteEntry);
  assert.equal(wasteEntry.debit, 3000);
  assert.equal(wasteEntry.category, 'EXPENSE');
});

test('CSV export formatting generates valid header and rows', () => {
  const payload = ERPIntegrationService.generateGLEntries('PROP-CSV-01', 50000, 12000, 1500, 15000);
  const csv = ERPIntegrationService.exportToCSV(payload);

  assert.ok(csv.startsWith('Account Code,Account Name,Category'));
  assert.ok(csv.includes('4000-REV'));
  assert.ok(csv.includes('5100-EXP'));
  assert.ok(csv.includes('5200-WST'));
  assert.ok(csv.includes('6100-LAB'));
});
