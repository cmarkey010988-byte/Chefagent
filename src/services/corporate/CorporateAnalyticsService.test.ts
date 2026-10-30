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

test('Enterprise margin economics calculates realistic 23% EBITDA and +1,180 bps bridge', () => {
  const economics = CorporateAnalyticsService.getEnterpriseMarginEconomics();
  assert.ok(economics.portfolioAnnualGrossRevenue > 250_000_000, 'Portfolio gross revenue should exceed $250M for 49 sites');
  assert.equal(economics.baselineEbitdaMarginPercent, 11.2, 'Baseline EBITDA should be realistic hospitality standard 11.2%');
  assert.equal(economics.achievedEbitdaMarginPercent, 23.0, 'Transformed EBITDA margin should reach 23.0%');
  assert.equal(economics.netEbitdaExpansionBps, 1180, 'Net margin expansion should be +1,180 bps');
  assert.ok(economics.netAnnualProfitLiftDollars > 30_000_000, 'Annual profit lift should exceed $30M across 49 sites');
  assert.equal(economics.levers.length, 4, 'Should have exactly 4 strategic operational levers');
  
  // Sum of levers
  const totalBpsFromLevers = economics.levers.reduce((sum, l) => sum + l.basisPointsGain, 0);
  assert.equal(totalBpsFromLevers, 1180, 'Operational levers must sum up to exact 1,180 bps net expansion');
  assert.ok(economics.enterpriseValueAddedAt12x > 350_000_000, 'Enterprise value added at 12x EV/EBITDA should exceed $350M');
  assert.ok(economics.averagePaybackPeriodDays <= 45, 'Hardware kiosk payback period should be under 45 days');
});

test('Custom Portfolio ROI & Margin Sensitivity Simulator works across arbitrary fleet sizes', () => {
  // Test 10 rooftops @ $5.5M avg rev
  const sim10 = CorporateAnalyticsService.simulatePortfolioRoi(10, 5_500_000, 33.5);
  assert.equal(sim10.annualRevenueTotal, 55_000_000);
  assert.equal(sim10.baselineEbitdaTotal, Math.round(55_000_000 * 0.112));
  assert.equal(sim10.modeledEbitdaTotal, Math.round(55_000_000 * 0.23));
  assert.equal(sim10.netAnnualProfitLiftDollars, sim10.modeledEbitdaTotal - sim10.baselineEbitdaTotal);
  assert.ok(sim10.paybackDays <= 40, 'Payback period should be fast');

  // Test 100 rooftops @ $6.0M avg rev
  const sim100 = CorporateAnalyticsService.simulatePortfolioRoi(100, 6_000_000, 34.0);
  assert.equal(sim100.annualRevenueTotal, 600_000_000);
  assert.ok(sim100.netAnnualProfitLiftDollars > 70_000_000);
});
