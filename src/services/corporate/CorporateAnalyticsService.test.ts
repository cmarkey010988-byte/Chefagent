/**
 * src/services/corporate/CorporateAnalyticsService.test.ts
 *
 * Unit tests for Portfolio Heatmap scoring thresholds and macro analytics regional aggregation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CorporateAnalyticsService } from './CorporateAnalyticsService';

test('Heatmap threshold evaluation: Green (Optimal)', () => {
  // FCP <= 28.0% and Waste Rate < 3.5%
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(27.0, 2.5), 'GREEN');
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(28.0, 3.4), 'GREEN');
});

test('Heatmap threshold evaluation: Yellow (Warning)', () => {
  // 28.1% <= FCP <= 31.0% or Waste Rate between 3.6% and 6.0%
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(29.5, 3.0), 'YELLOW');
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(27.5, 4.5), 'YELLOW');
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(31.0, 5.0), 'YELLOW');
});

test('Heatmap threshold evaluation: Red (Critical Bleed)', () => {
  // FCP > 31.0% or Waste Rate > 6.0%
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(32.5, 2.0), 'RED');
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(27.0, 6.5), 'RED');
  assert.equal(CorporateAnalyticsService.evaluateHealthStatus(33.0, 7.2), 'RED');
});

test('Portfolio summary aggregation computes totals correctly for 49 properties', () => {
  const summary = CorporateAnalyticsService.getPortfolioSummary();
  assert.equal(summary.totalProperties, 49, 'Expected exactly 49 properties in portfolio');
  assert.equal(summary.properties.length, 49);
  assert.equal(summary.greenCount + summary.yellowCount + summary.redCount, 49);
  assert.ok(summary.regionalEbitdaTotal > 0);
  assert.ok(summary.averageFCP > 0);
  assert.ok(summary.totalWasteRecovered > 0);
  assert.ok(summary.totalSurplusSalesGains > 0);
  assert.ok(summary.totalLaborHoursSaved > 0);
});

test('Property drill-down retrieves boundary properties accurately', () => {
  const prop1 = CorporateAnalyticsService.getPropertyMetrics('PROP-01');
  assert.ok(prop1);
  assert.equal(prop1?.propertyName, 'The Grand View Country Club');

  const prop49 = CorporateAnalyticsService.getPropertyMetrics('PROP-49');
  assert.ok(prop49);
  assert.equal(prop49?.propertyName, 'Lake Tahoe Vista Lodge');
  assert.equal(prop49?.region, 'Mountain West Region');

  const nonExistent = CorporateAnalyticsService.getPropertyMetrics('PROP-999');
  assert.equal(nonExistent, null);
});
