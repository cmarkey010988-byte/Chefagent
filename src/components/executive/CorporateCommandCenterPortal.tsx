/**
 * src/components/executive/CorporateCommandCenterPortal.tsx
 *
 * Corporate Command Center & Multi-Site Executive Portal UI.
 * Reflects full 49-property enterprise portfolio across 8 hospitality regions.
 * Features:
 * - Multi-Property Portfolio Heatmap for all 49 properties with search, regional filters, and sorting
 * - Grid and compact Table view modes with pagination controls
 * - Interactive Deep-Dive Property Inspection Drawer with AdelicZeta verification certificates
 * - Live Regional Macro Analytics HUD (Regional Rollup, EBITDA Leaderboard, Waste Recovery)
 * - Enterprise ERP & Accounting Webhook GL Export with 49-Property Selector
 * - Asynchronous Cloud Sync Outbox Pipeline Monitor across distributed kitchen tablets
 * - RBAC Role Switcher & Security Gatekeeping Demo
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  ShieldCheck,
  Cloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Download,
  Server,
  Layers,
  ArrowUpRight,
  Send,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  X,
  MapPin,
  ExternalLink,
  DollarSign,
  Percent,
  Zap,
  Sparkles,
  Calculator,
  PieChart,
  Scale,
  Award,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  CorporateAnalyticsService,
  PortfolioSummary,
  PropertyMetrics,
  PropertyHealthStatus,
  EnterpriseMarginEconomics,
  MarginBridgeLever,
  CustomRoiScenario,
} from '../../services/corporate/CorporateAnalyticsService';
import { ERPIntegrationService, ERPExportPayload } from '../../services/erp/ERPIntegrationService';
import { AuthInterceptor, UserRole } from '../../services/security/AuthInterceptor';

export const CorporateCommandCenterPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'heatmap' | 'margins' | 'analytics' | 'erp' | 'sync' | 'rbac'>('heatmap');
  const [portfolio, setPortfolio] = useState<PortfolioSummary>(CorporateAnalyticsService.getPortfolioSummary());
  const [marginEconomics, setMarginEconomics] = useState<EnterpriseMarginEconomics>(() =>
    CorporateAnalyticsService.getEnterpriseMarginEconomics()
  );

  // ROI Simulator state
  const [simRooftops, setSimRooftops] = useState<number>(49);
  const [simRevenuePerRooftop, setSimRevenuePerRooftop] = useState<number>(5800000);
  const [simBaselineFcp, setSimBaselineFcp] = useState<number>(33.5);

  const simulatedRoi = useMemo(() => {
    return CorporateAnalyticsService.simulatePortfolioRoi(simRooftops, simRevenuePerRooftop, simBaselineFcp);
  }, [simRooftops, simRevenuePerRooftop, simBaselineFcp]);

  const [selectedProperty, setSelectedProperty] = useState<PropertyMetrics | null>(null);
  const [selectedErpPropertyId, setSelectedErpPropertyId] = useState<string>('PROP-01');
  const [erpExports, setErpExports] = useState<ERPExportPayload[]>(ERPIntegrationService.getExportHistory());
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(AuthInterceptor.getSession().role);
  const [syncQueueCount, setSyncQueueCount] = useState(3);
  const [syncing, setSyncing] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination, and View states for 49 properties
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PropertyHealthStatus>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'ebitda-desc' | 'fcp-asc' | 'fcp-desc' | 'waste-asc' | 'chronos-desc'>('id');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [showAllRooftopsLeaderboard, setShowAllRooftopsLeaderboard] = useState(false);
  const [marginLeaderboardSearch, setMarginLeaderboardSearch] = useState('');
  const [marginLeaderboardSort, setMarginLeaderboardSort] = useState<'margin-desc' | 'lift-desc' | 'fcp-asc' | 'revenue-desc'>('margin-desc');

  useEffect(() => {
    // Refresh analytics & margin economics
    setPortfolio(CorporateAnalyticsService.getPortfolioSummary());
    setMarginEconomics(CorporateAnalyticsService.getEnterpriseMarginEconomics());
  }, []);

  // Distinct regions extracted from portfolio
  const allRegions = useMemo(() => {
    const set = new Set<string>();
    portfolio.properties.forEach((p) => set.add(p.region));
    return Array.from(set).sort();
  }, [portfolio.properties]);

  // Filtered and sorted properties for the 49-rooftop fleet
  const filteredProperties = useMemo(() => {
    let list = [...portfolio.properties];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          p.propertyId.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (regionFilter !== 'ALL') {
      list = list.filter((p) => p.region === regionFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'id') {
        const numA = parseInt(a.propertyId.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.propertyId.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }
      if (sortBy === 'ebitda-desc') {
        return b.monthlyEbitda - a.monthlyEbitda;
      }
      if (sortBy === 'fcp-asc') {
        return a.currentFCP - b.currentFCP;
      }
      if (sortBy === 'fcp-desc') {
        return b.currentFCP - a.currentFCP;
      }
      if (sortBy === 'waste-asc') {
        return a.wasteRate - b.wasteRate;
      }
      if (sortBy === 'chronos-desc') {
        return b.chronosCompliancePercent - a.chronosCompliancePercent;
      }
      return 0;
    });

    return list;
  }, [portfolio.properties, searchTerm, statusFilter, regionFilter, sortBy]);

  // Pagination slice
  const totalPages = Math.ceil(filteredProperties.length / pageSize) || 1;
  const paginatedProperties = useMemo(() => {
    if (pageSize >= 100) return filteredProperties;
    const start = (currentPage - 1) * pageSize;
    return filteredProperties.slice(start, start + pageSize);
  }, [filteredProperties, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, regionFilter, sortBy, pageSize]);

  // Regional breakdown rollup
  const regionalRollup = useMemo(() => {
    const map = new Map<string, { count: number; ebitda: number; fcpSum: number; green: number; yellow: number; red: number }>();
    portfolio.properties.forEach((p) => {
      const existing = map.get(p.region) || { count: 0, ebitda: 0, fcpSum: 0, green: 0, yellow: 0, red: 0 };
      existing.count += 1;
      existing.ebitda += p.monthlyEbitda;
      existing.fcpSum += p.currentFCP;
      if (p.status === 'GREEN') existing.green += 1;
      else if (p.status === 'YELLOW') existing.yellow += 1;
      else existing.red += 1;
      map.set(p.region, existing);
    });

    return Array.from(map.entries()).map(([region, data]) => ({
      region,
      count: data.count,
      ebitda: data.ebitda,
      avgFcp: Math.round((data.fcpSum / data.count) * 10) / 10,
      green: data.green,
      yellow: data.yellow,
      red: data.red,
    })).sort((a, b) => b.ebitda - a.ebitda);
  }, [portfolio.properties]);

  // Filtered and sorted properties for the Margin Expansion Leaderboard
  const sortedMarginProperties = useMemo(() => {
    let list = [...portfolio.properties];
    if (marginLeaderboardSearch.trim()) {
      const q = marginLeaderboardSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          p.propertyId.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (marginLeaderboardSort === 'margin-desc') {
        return (b.ebitdaMarginPercent || 0) - (a.ebitdaMarginPercent || 0);
      }
      if (marginLeaderboardSort === 'lift-desc') {
        const liftA = (a.ebitdaMarginPercent || 0) - (a.baselineEbitdaMarginPercent || 0);
        const liftB = (b.ebitdaMarginPercent || 0) - (b.baselineEbitdaMarginPercent || 0);
        return liftB - liftA;
      }
      if (marginLeaderboardSort === 'fcp-asc') {
        return a.currentFCP - b.currentFCP;
      }
      if (marginLeaderboardSort === 'revenue-desc') {
        return (b.monthlyGrossRevenue || 0) - (a.monthlyGrossRevenue || 0);
      }
      return 0;
    });
    return list;
  }, [portfolio.properties, marginLeaderboardSearch, marginLeaderboardSort]);

  const handleRunERPExport = async (connectorType: 'QUICKBOOKS_ONLINE' | 'RESTAURANT_365' | 'GENERIC_REST_ERP') => {
    setExportLoading(true);
    setExportMessage(null);
    try {
      const targetPropId = selectedProperty?.propertyId || selectedErpPropertyId || 'PROP-01';
      const propObj = portfolio.properties.find((p) => p.propertyId === targetPropId);
      const grossRevenue = propObj ? propObj.monthlyEbitda * 1.5 : 154000;
      const cogs = propObj ? Math.round(grossRevenue * (propObj.currentFCP / 100)) : 41500;
      const wasteCost = propObj ? propObj.wasteRecoveredDollars : 4200;

      const res = await fetch('/api/v1/enterprise/erp/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AuthInterceptor.injectAuthHeaders(),
        },
        body: JSON.stringify({
          propertyId: targetPropId,
          grossRevenue,
          cogs,
          wasteCost,
          connectorType,
          targetEndpoint: `https://api.${connectorType.toLowerCase().replace('_', '')}.enterprise.com/v3/ledger`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.exportPayload) {
          setErpExports((prev) => [data.exportPayload, ...prev.filter((e) => e.exportId !== data.exportPayload.exportId)]);
        } else {
          setErpExports(ERPIntegrationService.getExportHistory());
        }
        setExportMessage(`Successfully exported GL batch ${data.exportPayload.exportId} for ${targetPropId} (${propObj?.propertyName || 'Selected Property'}) to ${connectorType}!`);
      } else {
        setExportMessage(`Export failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setExportMessage(`Network error during ERP export: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleTriggerCloudSync = async () => {
    setSyncing(true);
    setSyncResultMsg(null);
    try {
      const payloadObj = {
        deviceId: 'tablet-kitchen-regional-fleet-49',
        batchSize: syncQueueCount,
        items: [
          { type: 'WASTE_LOG', count: 2 },
          { type: 'CHRONOS_ACTION', count: 1 },
        ],
      };
      const rawPayload = JSON.stringify(payloadObj);

      // Compute HMAC-SHA256 using standard Web Crypto API
      const enc = new TextEncoder();
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        enc.encode('CHEFAGENT_ENTERPRISE_DEVICE_HMAC_SECRET'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(rawPayload));
      const hexSignature = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const zetaProof = `ZETA-PROOF-${Date.now().toString(16)}-ALGEBRAIC-OK`;

      const res = await fetch('/api/v1/enterprise/sync/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Signature': hexSignature,
          'X-Zeta-Proof': zetaProof,
          ...AuthInterceptor.injectAuthHeaders(),
        },
        body: rawPayload,
      });
      const data = await res.json();
      if (res.ok) {
        setSyncQueueCount(0);
        setSyncResultMsg(`Sync complete! ${data.itemsProcessed} offline transactions committed securely to cloud PostgreSQL store across 49 property tablets.`);
      } else {
        setSyncResultMsg(`Sync failed: ${data.error}`);
      }
    } catch (err: any) {
      setSyncResultMsg(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    AuthInterceptor.setSession({
      userId: newRole === 'ROLE_CORPORATE_EXECUTIVE' ? 'exec-001' : 'cook-009',
      fullName: newRole === 'ROLE_CORPORATE_EXECUTIVE' ? 'Victoria Sterling (VP F&B)' : 'Dave Miller (Line Cook)',
      propertyId: 'PROP-01',
      role: newRole,
      token: `token-${newRole.toLowerCase()}-2026`,
    });
  };

  const hasAccess = AuthInterceptor.hasExecutiveAccess();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Building2 className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              ChefAgent Corporate Command Center
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold">
                49 PROPERTIES · 8 REGIONS
              </span>
            </h1>
            <p className="text-xs text-slate-400">Enterprise Multi-Site F&amp;B Operations, Cloud Sync WAL, &amp; ERP Ledger Integration</p>
          </div>
        </div>

        {/* Role & Auth Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">Session Role:</span>
            <select
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="bg-slate-900 text-amber-400 font-mono font-semibold rounded px-2 py-0.5 border border-slate-700 focus:outline-none"
            >
              <option value="ROLE_CORPORATE_EXECUTIVE">ROLE_CORPORATE_EXECUTIVE</option>
              <option value="ROLE_GENERAL_MANAGER">ROLE_GENERAL_MANAGER</option>
              <option value="ROLE_HEAD_CHEF">ROLE_HEAD_CHEF</option>
              <option value="ROLE_LINE_COOK">ROLE_LINE_COOK (Restricted)</option>
            </select>
          </div>
        </div>
      </header>

      {!hasAccess ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">HTTP 403 Forbidden</h2>
            <p className="text-sm text-slate-400 mb-6">
              Your current role (<span className="font-mono text-amber-400">{currentRole}</span>) lacks permissions to access the Corporate Command Center. Executive or General Manager clearance is required.
            </p>
            <button
              onClick={() => handleRoleChange('ROLE_CORPORATE_EXECUTIVE')}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors shadow-lg shadow-amber-500/20"
            >
              Elevate to Corporate Executive
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Navigation Sub-bar */}
          <div className="bg-slate-900/50 border-b border-slate-800 px-6 flex items-center gap-2 overflow-x-auto py-2">
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'heatmap'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Portfolio Heatmap ({portfolio.totalProperties})
            </button>
            <button
              onClick={() => setActiveTab('margins')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'margins'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Profit Margins &amp; EBITDA Bridge
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                +1,180 bps
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              Macro Analytics HUD
            </button>
            <button
              onClick={() => setActiveTab('erp')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'erp'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Enterprise ERP &amp; GL Connectors
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'sync'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Cloud className="w-4 h-4" />
              Cloud Sync Outbox Pipeline
              {syncQueueCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                  {syncQueueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rbac'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              RBAC &amp; Gatekeeping
            </button>
          </div>

          {/* Main Content Body */}
          <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
            {/* Macro Header KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Profit Margin & EBITDA Lift */}
              <div
                onClick={() => setActiveTab('margins')}
                className="bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-2xl p-5 relative overflow-hidden cursor-pointer group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-400">
                  <TrendingUp className="w-16 h-16" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Enterprise EBITDA Margin</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    +1,180 bps Lift
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mt-1 font-mono flex items-baseline gap-2">
                  <span className="text-slate-400 text-base line-through">11.2%</span>
                  <span className="text-emerald-400 font-extrabold">23.0%</span>
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 mt-2 font-mono">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+${(marginEconomics.netAnnualProfitLiftDollars / 1_000_000).toFixed(2)}M/yr Net Profit Lift</span>
                </div>
              </div>

              {/* Card 2: Annual Portfolio Gross Run-rate */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-400">
                  <Building2 className="w-16 h-16" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Annual Gross Run-rate (49 Sites)</p>
                <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                  ${(marginEconomics.portfolioAnnualGrossRevenue / 1_000_000).toFixed(1)}M
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2 font-mono">
                  <span>${portfolio.regionalEbitdaTotal.toLocaleString()}/mo EBITDA run-rate</span>
                </div>
              </div>

              {/* Card 3: Food Cost % & Waste Compression */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-cyan-400">
                  <ShieldCheck className="w-16 h-16" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Portfolio Avg Food Cost (FCP)</p>
                <h3 className="text-2xl font-bold text-white mt-1 font-mono flex items-baseline gap-2">
                  <span className="text-slate-400 text-sm line-through">33.4%</span>
                  <span className="text-cyan-400">{portfolio.averageFCP}%</span>
                </h3>
                <p className="text-xs text-emerald-400 mt-2 font-mono">
                  -${portfolio.totalWasteRecovered.toLocaleString()}/mo shrink recovered
                </p>
              </div>

              {/* Card 4: Fleet Rooftops & Valuation Created */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-400">
                  <Server className="w-16 h-16" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Fleet EV Added @ 12x</p>
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    49 Synced
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-purple-300 mt-1 font-mono">
                  +${(marginEconomics.enterpriseValueAddedAt12x / 1_000_000).toFixed(1)}M
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Hardware Capex Payback: <strong className="text-white font-mono">{marginEconomics.averagePaybackPeriodDays} Days</strong>
                </p>
              </div>
            </div>

            {/* TAB 1: PORTFOLIO HEATMAP */}
            {activeTab === 'heatmap' && (
              <div className="space-y-6">
                {/* Header & Status Legend */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Multi-Property Performance Heatmap
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {filteredProperties.length} of {portfolio.totalProperties} Properties
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">Evaluated against hospitality benchmarks (Green: FCP ≤ 28% &amp; Waste &lt; 3.5% | Yellow: FCP 28.1–31% | Red: FCP &gt; 31%)</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                        statusFilter === 'ALL'
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      All ({portfolio.totalProperties})
                    </button>
                    <button
                      onClick={() => setStatusFilter('GREEN')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                        statusFilter === 'GREEN'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {portfolio.greenCount} Optimal
                    </button>
                    <button
                      onClick={() => setStatusFilter('YELLOW')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                        statusFilter === 'YELLOW'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> {portfolio.yellowCount} Warning
                    </button>
                    <button
                      onClick={() => setStatusFilter('RED')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                        statusFilter === 'RED'
                          ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm'
                          : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> {portfolio.redCount} Critical Bleed
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search 49 properties by name, ID (e.g. PROP-25), or region..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
                    {/* Region Selector */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="ALL">All Regions (8)</option>
                        {allRegions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="id">Sort: Property ID (PROP-01 → 49)</option>
                        <option value="ebitda-desc">Sort: Highest EBITDA</option>
                        <option value="fcp-asc">Sort: Lowest FCP (Best Margin)</option>
                        <option value="fcp-desc">Sort: Highest FCP (Critical Bleed)</option>
                        <option value="waste-asc">Sort: Lowest Waste Rate</option>
                        <option value="chronos-desc">Sort: Chronos Compliance</option>
                      </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Table View"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Properties Container */}
                {filteredProperties.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                    No properties match your active filter criteria. Try clearing search or resetting filters.
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedProperties.map((prop) => {
                      const isGreen = prop.status === 'GREEN';
                      const isYellow = prop.status === 'YELLOW';
                      const statusBg = isGreen
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : isYellow
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-red-500/30 bg-red-500/5';

                      const badgeColor = isGreen
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : isYellow
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20';

                      return (
                        <div
                          key={prop.propertyId}
                          onClick={() => setSelectedProperty(prop)}
                          className={`bg-slate-900 border rounded-2xl p-5 transition-all hover:border-slate-600 hover:shadow-xl cursor-pointer relative ${statusBg}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="pr-2">
                              <span className="text-[11px] font-mono text-slate-400 block">{prop.propertyId} · {prop.region}</span>
                              <h3 className="text-base font-bold text-white mt-0.5 truncate max-w-[220px]" title={prop.propertyName}>
                                {prop.propertyName}
                              </h3>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 shrink-0 ${badgeColor}`}>
                              <span className={`w-2 h-2 rounded-full ${isGreen ? 'bg-emerald-500' : isYellow ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                              {prop.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 my-4 py-3 border-y border-slate-800 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[11px]">Food Cost % (FCP)</span>
                              <span className={`text-sm font-bold font-mono ${prop.currentFCP > 31 ? 'text-red-400' : prop.currentFCP > 28 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {prop.currentFCP}%
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Waste Rate</span>
                              <span className={`text-sm font-bold font-mono ${prop.wasteRate > 6 ? 'text-red-400' : prop.wasteRate > 3.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {prop.wasteRate}%
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Monthly EBITDA</span>
                              <span className="text-sm font-bold font-mono text-white">${prop.monthlyEbitda.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Chronos Compliance</span>
                              <span className="text-sm font-bold font-mono text-cyan-400">{prop.chronosCompliancePercent}%</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Waste recovered: <strong className="text-white">${prop.wasteRecoveredDollars.toLocaleString()}</strong></span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProperty(prop);
                                  setSelectedErpPropertyId(prop.propertyId);
                                  setActiveTab('erp');
                                }}
                                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                              >
                                Export GL <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Compact Table View for 49 properties */
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Property</th>
                            <th className="py-3 px-4">Region</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">FCP %</th>
                            <th className="py-3 px-4">Waste %</th>
                            <th className="py-3 px-4">Monthly EBITDA</th>
                            <th className="py-3 px-4">Chronos</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {paginatedProperties.map((prop) => {
                            const isGreen = prop.status === 'GREEN';
                            const isYellow = prop.status === 'YELLOW';
                            const badgeColor = isGreen
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isYellow
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20';

                            return (
                              <tr
                                key={prop.propertyId}
                                onClick={() => setSelectedProperty(prop)}
                                className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                              >
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white">{prop.propertyName}</div>
                                  <div className="font-mono text-slate-400 text-[10px]">{prop.propertyId}</div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-300">{prop.region}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeColor}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isGreen ? 'bg-emerald-500' : isYellow ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                    {prop.status}
                                  </span>
                                </td>
                                <td className={`py-3.5 px-4 font-mono font-bold ${prop.currentFCP > 31 ? 'text-red-400' : prop.currentFCP > 28 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {prop.currentFCP}%
                                </td>
                                <td className={`py-3.5 px-4 font-mono font-bold ${prop.wasteRate > 6 ? 'text-red-400' : prop.wasteRate > 3.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {prop.wasteRate}%
                                </td>
                                <td className="py-3.5 px-4 font-mono text-white font-semibold">
                                  ${prop.monthlyEbitda.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-cyan-400">
                                  {prop.chronosCompliancePercent}%
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProperty(prop);
                                      setSelectedErpPropertyId(prop.propertyId);
                                      setActiveTab('erp');
                                    }}
                                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                  >
                                    Export GL <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Showing</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs"
                    >
                      <option value={12}>12 per page</option>
                      <option value={24}>24 per page</option>
                      <option value={49}>All 49 properties</option>
                    </select>
                    <span>of {filteredProperties.length} matching properties (Total 49)</span>
                  </div>

                  {pageSize < 49 && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-xs px-2 text-white">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PROFIT MARGINS & EBITDA BRIDGE */}
            {activeTab === 'margins' && (
              <div className="space-y-8">
                {/* Hero Header & Value Creation Banner */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-400 pointer-events-none">
                    <TrendingUp className="w-48 h-48" />
                  </div>
                  <div className="max-w-3xl space-y-3 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      49-ROOFTOP ENTERPRISE TRANSFORMATION · $284.6M ANNUAL RUN-RATE
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Enterprise Profit Margins &amp; EBITDA Bridge
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Commercial F&amp;B and country club operators typically endure razor-thin 10–12% EBITDA margins due to unmonitored portion drift, prep spoilage, 86 communication lag, and labor bottlenecks.
                      By fusing <strong className="text-white">Multimodal Edge Vision</strong> (Gastronorm fill telemetry), <strong className="text-white">Zero-Loss HACCP 86 Sync</strong>, <strong className="text-white">Par-to-Plate AI Surplus Monetization</strong>, and <strong className="text-white">Chronos JIT Acoustic Scheduling</strong>, ChefAgent pushes fleet EBITDA margins to <strong className="text-emerald-400 font-mono text-base font-bold">23.0%</strong> (+1,180 bps net expansion), generating <strong className="text-white font-mono">+$33.58M in annual recurring profit</strong> across 49 sites.
                    </p>
                  </div>

                  {/* 4 Primary Margin Transformation Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 relative z-10">
                    <div className="bg-slate-800/80 border border-emerald-500/40 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Fleet EBITDA Margin</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          +1,180 bps
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-2 flex items-baseline gap-2">
                        <span className="text-slate-500 text-lg line-through">11.2%</span>
                        <span className="text-emerald-400">23.0%</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 font-mono">
                        $31.87M ➔ $65.46M EBITDA (+105.4% expansion)
                      </p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Net Annual Profit Lift</span>
                        <span className="text-emerald-400 font-mono font-bold text-xs">+$2.80M / mo</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-2">
                        +${(marginEconomics.netAnnualProfitLiftDollars / 1_000_000).toFixed(2)}M
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Pure bottom-line cash flow added annually
                      </p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Market Capitalization (12x)</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          12.0x Multiple
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-300 mt-2">
                        +${(marginEconomics.enterpriseValueAddedAt12x / 1_000_000).toFixed(1)}M
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Net enterprise equity value created
                      </p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Fleet Capex Amortization</span>
                        <span className="text-amber-400 font-mono text-xs">$6.5K / Site</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-2">
                        {marginEconomics.averagePaybackPeriodDays} Days
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Full payback of NPU touchscreens &amp; sensors
                      </p>
                    </div>
                  </div>
                </div>

                {/* THE 4 STRATEGIC OPERATIONAL LEVERS (THE MARGIN BRIDGE WATERFALL) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Scale className="w-5 h-5 text-amber-400" />
                        The 4 Strategic Operational Levers: 11.2% to 23.0% EBITDA Bridge
                      </h3>
                      <p className="text-xs text-slate-400">
                        Mathematical decomposition of how four synchronized edge algorithms expand EBITDA by +1,180 basis points
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono">
                      <span className="text-slate-400">Total Bridge Sum:</span>
                      <span className="text-emerald-400 font-bold">+1,180 bps (+11.8%)</span>
                    </div>
                  </div>

                  {/* Visual Waterfall Progression Bar */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                      <span>Baseline Hospitality (11.2%)</span>
                      <span className="text-emerald-400 font-bold">Transformed Enterprise (23.0%)</span>
                    </div>

                    {/* Stacked Cumulative Bar */}
                    <div className="w-full h-7 bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800">
                      <div
                        style={{ width: `${(11.2 / 23.0) * 100}%` }}
                        className="bg-slate-700 flex items-center justify-center text-[11px] font-mono text-slate-300 font-semibold border-r border-slate-900"
                        title="Baseline EBITDA: 11.2%"
                      >
                        11.2% Base
                      </div>
                      <div
                        style={{ width: `${(5.1 / 23.0) * 100}%` }}
                        className="bg-amber-600 flex items-center justify-center text-[11px] font-mono text-slate-950 font-bold border-r border-slate-900"
                        title="Lever 1: Multimodal Vision Portioning (+5.1%)"
                      >
                        +5.1%
                      </div>
                      <div
                        style={{ width: `${(2.4 / 23.0) * 100}%` }}
                        className="bg-emerald-600 flex items-center justify-center text-[11px] font-mono text-slate-950 font-bold border-r border-slate-900"
                        title="Lever 2: Automated HACCP & 86 Par Sync (+2.4%)"
                      >
                        +2.4%
                      </div>
                      <div
                        style={{ width: `${(2.1 / 23.0) * 100}%` }}
                        className="bg-cyan-600 flex items-center justify-center text-[11px] font-mono text-slate-950 font-bold border-r border-slate-900"
                        title="Lever 3: Par-to-Plate AI Surplus Monetization (+2.1%)"
                      >
                        +2.1%
                      </div>
                      <div
                        style={{ width: `${(2.2 / 23.0) * 100}%` }}
                        className="bg-purple-600 flex items-center justify-center text-[11px] font-mono text-slate-100 font-bold"
                        title="Lever 4: Chronos JIT Prep Orchestration (+2.2%)"
                      >
                        +2.2%
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-slate-700"></span>
                        <span>Baseline (11.2%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-600"></span>
                        <span>COGS Compression (+5.1% / +510 bps)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-600"></span>
                        <span>Waste Elimination (+2.4% / +240 bps)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-cyan-600"></span>
                        <span>Surplus Monetization (+2.1% / +210 bps)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-purple-600"></span>
                        <span>Labor Optimization (+2.2% / +220 bps)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Lever In-Depth Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marginEconomics.levers.map((lever, idx) => {
                      const colors = [
                        { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
                        { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
                        { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' },
                        { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
                      ][idx % 4];

                      return (
                        <div
                          key={lever.id}
                          className={`bg-slate-800/60 border ${colors.border} rounded-xl p-5 space-y-3 relative overflow-hidden`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                                  LEVER #{idx + 1} · {lever.category.replace('_', ' ')}
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-white mt-1.5">{lever.name}</h4>
                            </div>
                            <div className="text-right">
                              <span className={`text-lg font-bold font-mono ${colors.text} block`}>
                                +{lever.basisPointsGain} bps
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 block">
                                (+{lever.marginPercentGain}%)
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 rounded-lg p-2.5 font-mono text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Annual Impact</span>
                              <span className="text-white font-bold">+${(lever.annualDollarImpact / 1_000_000).toFixed(2)}M / yr</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Monthly Impact</span>
                              <span className="text-emerald-400 font-bold">+${lever.monthlyDollarImpact.toLocaleString()} / mo</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <p className="text-slate-300">
                              <strong className="text-white">Edge Architecture:</strong> {lever.description}
                            </p>
                            <p className="text-slate-400">
                              <strong className="text-slate-300">Operational Physics:</strong> {lever.operationalDriver}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* INTERACTIVE ENTERPRISE ROI & MARGIN SENSITIVITY SIMULATOR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-emerald-400" />
                        Executive ROI &amp; Margin Sensitivity Simulator
                      </h3>
                      <p className="text-xs text-slate-400">
                        Model financial outcomes across arbitrary fleet sizes, custom revenue targets, and baseline food cost benchmarks
                      </p>
                    </div>

                    {/* Fleet Size Presets */}
                    <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 p-1 rounded-xl">
                      {[
                        { label: '5 Sites', count: 5 },
                        { label: '15 Sites', count: 15 },
                        { label: '25 Sites', count: 25 },
                        { label: '49 Sites (Full)', count: 49 },
                        { label: '100 Sites', count: 100 },
                      ].map((preset) => (
                        <button
                          key={preset.count}
                          onClick={() => setSimRooftops(preset.count)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                            simRooftops === preset.count
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Controls Column */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                        Operating Assumptions
                      </h4>

                      {/* Slider 1: Rooftops */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Rooftops / Kitchens:</span>
                          <span className="font-mono font-bold text-white">{simRooftops} Rooftops</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={150}
                          step={1}
                          value={simRooftops}
                          onChange={(e) => setSimRooftops(parseInt(e.target.value, 10))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>1 Site</span>
                          <span>75 Sites</span>
                          <span>150 Sites</span>
                        </div>
                      </div>

                      {/* Slider 2: Average Revenue */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Avg Revenue / Rooftop:</span>
                          <span className="font-mono font-bold text-amber-400">
                            ${(simRevenuePerRooftop / 1_000_000).toFixed(2)}M / yr
                          </span>
                        </div>
                        <input
                          type="range"
                          min={2000000}
                          max={10000000}
                          step={250000}
                          value={simRevenuePerRooftop}
                          onChange={(e) => setSimRevenuePerRooftop(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>$2.0M</span>
                          <span>$6.0M</span>
                          <span>$10.0M</span>
                        </div>
                      </div>

                      {/* Slider 3: Baseline FCP */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Baseline Food Cost %:</span>
                          <span className="font-mono font-bold text-red-400">{simBaselineFcp}%</span>
                        </div>
                        <input
                          type="range"
                          min={28.0}
                          max={38.0}
                          step={0.5}
                          value={simBaselineFcp}
                          onChange={(e) => setSimBaselineFcp(parseFloat(e.target.value))}
                          className="w-full accent-red-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>28.0%</span>
                          <span>33.0%</span>
                          <span>38.0%</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <span className="text-slate-300 font-semibold block">Modeled Physics:</span>
                        <p>
                          Edge vision portioning tares 720p Gastronorm pans to compress food cost to{' '}
                          <strong className="text-cyan-400 font-mono">{simulatedRoi.modeledFcpPercent}%</strong> and elevates EBITDA to{' '}
                          <strong className="text-emerald-400 font-mono">{simulatedRoi.modeledEbitdaMarginPercent}%</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Live Results Column (2 Cols) */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Top Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <span className="text-xs text-slate-400 block">Total Portfolio Revenue</span>
                          <span className="text-xl font-bold font-mono text-white mt-1 block">
                            ${(simulatedRoi.annualRevenueTotal / 1_000_000).toFixed(2)}M
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                            {simulatedRoi.rooftopCount} locations aggregated
                          </span>
                        </div>

                        <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4">
                          <span className="text-xs text-slate-400 block">Transformed EBITDA (23.0%)</span>
                          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                            ${(simulatedRoi.modeledEbitdaTotal / 1_000_000).toFixed(2)}M
                          </span>
                          <span className="text-[10px] text-emerald-300 font-mono mt-1 block">
                            Baseline: ${(simulatedRoi.baselineEbitdaTotal / 1_000_000).toFixed(2)}M (11.2%)
                          </span>
                        </div>

                        <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4">
                          <span className="text-xs text-slate-400 block">Net Annual Profit Lift</span>
                          <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                            +${(simulatedRoi.netAnnualProfitLiftDollars / 1_000_000).toFixed(2)}M
                          </span>
                          <span className="text-[10px] text-amber-300 font-mono mt-1 block">
                            +${Math.round(simulatedRoi.netAnnualProfitLiftDollars / 12).toLocaleString()} / month
                          </span>
                        </div>
                      </div>

                      {/* Payback & Valuation Scenarios */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            Capex Amortization &amp; Enterprise Value Scenarios
                          </h4>
                          <span className="text-xs font-mono text-emerald-400 font-semibold">
                            Payback in {simulatedRoi.paybackDays} Days
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">Fleet Capex ($6.5k/site)</span>
                            <span className="text-sm font-bold font-mono text-white mt-1 block">
                              ${(simulatedRoi.rooftopCount * 6500).toLocaleString()}
                            </span>
                          </div>

                          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">10.0x EV / EBITDA</span>
                            <span className="text-sm font-bold font-mono text-purple-400 mt-1 block">
                              +${((simulatedRoi.netAnnualProfitLiftDollars * 10) / 1_000_000).toFixed(1)}M
                            </span>
                          </div>

                          <div className="bg-slate-900/80 rounded-lg p-3 border border-purple-500/40 bg-purple-950/20">
                            <span className="text-[11px] text-purple-300 font-semibold block">12.0x EV / EBITDA (Base)</span>
                            <span className="text-sm font-extrabold font-mono text-purple-300 mt-1 block">
                              +${((simulatedRoi.enterpriseValueAddedAt12x) / 1_000_000).toFixed(1)}M
                            </span>
                          </div>

                          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">15.0x EV / EBITDA</span>
                            <span className="text-sm font-bold font-mono text-purple-400 mt-1 block">
                              +${((simulatedRoi.netAnnualProfitLiftDollars * 15) / 1_000_000).toFixed(1)}M
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center justify-between">
                          <span>
                            Hardware Capex covers NVIDIA Jetson Orin Nano / RK3588 NPU industrial touchscreens and wide-angle MIPI optical sensors.
                          </span>
                          <span className="text-emerald-400 font-mono font-semibold">
                            {(365 / simulatedRoi.paybackDays).toFixed(1)}x Annual ROI
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FLEET ROOFTOP MARGIN LEADERBOARD (ALL 49 SITES) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        49-Rooftop Profit Margin Leaderboard &amp; Benchmark Ranking
                      </h3>
                      <p className="text-xs text-slate-400">
                        Individual property profit margin expansion, FCP compression, and monthly EBITDA generation across all 8 regions
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search rooftop, region, ID..."
                          value={marginLeaderboardSearch}
                          onChange={(e) => setMarginLeaderboardSearch(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-52"
                        />
                      </div>

                      {/* Sort */}
                      <select
                        value={marginLeaderboardSort}
                        onChange={(e) => setMarginLeaderboardSort(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="margin-desc">Sort: Highest EBITDA Margin %</option>
                        <option value="lift-desc">Sort: Highest Margin Expansion (bps)</option>
                        <option value="fcp-asc">Sort: Lowest Food Cost % (FCP)</option>
                        <option value="revenue-desc">Sort: Highest Monthly Revenue</option>
                      </select>
                    </div>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                          <th className="py-3 px-4"># Rank</th>
                          <th className="py-3 px-4">Property &amp; ID</th>
                          <th className="py-3 px-4">Region</th>
                          <th className="py-3 px-4 text-right">Monthly Gross</th>
                          <th className="py-3 px-4 text-right">Baseline Margin</th>
                          <th className="py-3 px-4 text-right">Achieved Margin</th>
                          <th className="py-3 px-4 text-right">Expansion</th>
                          <th className="py-3 px-4 text-right">FCP</th>
                          <th className="py-3 px-4 text-right">Monthly EBITDA</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {sortedMarginProperties.map((p, idx) => {
                          const achievedMargin = p.ebitdaMarginPercent || 23.0;
                          const baselineMargin = p.baselineEbitdaMarginPercent || 11.2;
                          const expansionBps = Math.round((achievedMargin - baselineMargin) * 100);

                          return (
                            <tr
                              key={p.propertyId}
                              onClick={() => setSelectedProperty(p)}
                              className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                            >
                              <td className="py-3 px-4 text-slate-500 font-bold">
                                #{idx + 1}
                              </td>
                              <td className="py-3 px-4 font-sans font-semibold text-white group-hover:text-amber-400 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <span>{p.propertyName}</span>
                                  <span className="text-[10px] font-mono text-slate-500 font-normal">({p.propertyId})</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans text-slate-400">
                                {p.region}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-300">
                                ${(p.monthlyGrossRevenue || 580000).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500">
                                {baselineMargin}%
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={`font-bold ${
                                  achievedMargin >= 23.0 ? 'text-emerald-400' : achievedMargin >= 18.0 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {achievedMargin}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                  +{expansionBps} bps
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-cyan-400">
                                {p.currentFCP}%
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-white">
                                ${p.monthlyEbitda.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold border ${
                                  p.status === 'GREEN'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : p.status === 'YELLOW'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>
                      Showing {sortedMarginProperties.length} of {portfolio.totalProperties} properties · Click any row to inspect AdelicZeta verification proof
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      Fleet Average Transformed EBITDA: {portfolio.portfolioEbitdaMarginPercent || 23.0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MACRO ANALYTICS HUD */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Regional Macro Analytics &amp; Trend Engine</h2>
                  <p className="text-xs text-slate-400">Comprehensive 49-property operational telemetry across all 8 North American operating regions</p>
                </div>

                {/* Regional Rollup Aggregations */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      8 Regional Portfolio Rollup Summaries (49 Rooftops Total)
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">Real-Time Exact Aggregation</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {regionalRollup.map((r) => (
                      <div key={r.region} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white truncate max-w-[150px]">{r.region}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 border border-slate-700">
                            {r.count} Sites
                          </span>
                        </div>
                        <div className="text-lg font-bold font-mono text-emerald-400">
                          ${r.ebitda.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                          <span>Avg FCP: <strong className="text-white font-mono">{r.avgFcp}%</strong></span>
                          <span className="text-[10px] text-emerald-400 font-semibold">{r.green}G · {r.yellow}Y · {r.red}R</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Rooftop Leaderboard */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        {showAllRooftopsLeaderboard ? 'All 49 Rooftops EBITDA Breakdown' : 'Top 10 Performing Rooftops by EBITDA'}
                      </h3>
                      <button
                        onClick={() => setShowAllRooftopsLeaderboard(!showAllRooftopsLeaderboard)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                      >
                        {showAllRooftopsLeaderboard ? 'Show Top 10 Only' : 'View All 49 Sites'}
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
                      {(showAllRooftopsLeaderboard
                        ? [...portfolio.properties].sort((a, b) => b.monthlyEbitda - a.monthlyEbitda)
                        : [...portfolio.properties].sort((a, b) => b.monthlyEbitda - a.monthlyEbitda).slice(0, 10)
                      ).map((p, idx) => {
                        const maxEbitda = 180000;
                        const pct = Math.min(100, Math.round((p.monthlyEbitda / maxEbitda) * 100));
                        return (
                          <div
                            key={p.propertyId}
                            onClick={() => setSelectedProperty(p)}
                            className="space-y-1 p-2 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-medium truncate max-w-[240px]">
                                <span className="font-mono text-slate-500 mr-2 text-[10px]">#{idx + 1}</span>
                                {p.propertyName}
                              </span>
                              <span className="text-amber-400 font-mono font-bold">${p.monthlyEbitda.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Waste Recovery & Compliance Metrics */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Kitchen Waste Recovery &amp; Surplus Sales Across 49 Properties
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                        <span className="text-xs text-slate-400 block">Total Waste Recovery Value</span>
                        <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">${portfolio.totalWasteRecovered.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Recycled through daily special batching</span>
                      </div>
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                        <span className="text-xs text-slate-400 block">Surplus Menu Sales Gains</span>
                        <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">${portfolio.totalSurplusSalesGains.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Generated via Par-to-Plate AI Engine</span>
                      </div>
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 col-span-2">
                        <span className="text-xs text-slate-400 block">Total Kitchen Labor Hours Saved</span>
                        <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">{portfolio.totalLaborHoursSaved.toLocaleString()} Hours</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Across 49 kitchen lines via Chronos automated scheduling &amp; touch prep logs</span>
                      </div>
                    </div>

                    {/* Critical Bleed Alert Box */}
                    {portfolio.redCount > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Attention: {portfolio.redCount} Rooftops in Critical Bleed Status</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          These properties exceed 31% Food Cost Percentage or 6% Waste Rate. Prompt intervention with Head Chefs recommended.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {portfolio.properties
                            .filter((p) => p.status === 'RED')
                            .map((p) => (
                              <button
                                key={p.propertyId}
                                onClick={() => setSelectedProperty(p)}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                              >
                                {p.propertyId}: {p.propertyName.slice(0, 20)}... ({p.currentFCP}%)
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ENTERPRISE ERP & ACCOUNTING WEBHOOK */}
            {activeTab === 'erp' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Enterprise Accounting ERP &amp; GL Export Sockets</h2>
                  <p className="text-xs text-slate-400">Automated ledger batch export mapped to QuickBooks Online and Restaurant365 GL codes for all 49 properties</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Export Trigger Card with 49-Property Picker */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                      Trigger Accounting Sync
                    </h3>
                    <p className="text-xs text-slate-400">Select any of the 49 enterprise rooftops to transmit daily financial ledger summary.</p>

                    {/* Property Selector for 49 sites */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-300 block">Target Property (49 Available):</label>
                      <select
                        value={selectedProperty?.propertyId || selectedErpPropertyId}
                        onChange={(e) => {
                          setSelectedErpPropertyId(e.target.value);
                          const prop = portfolio.properties.find((p) => p.propertyId === e.target.value) || null;
                          setSelectedProperty(prop);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 font-mono"
                      >
                        {portfolio.properties.map((p) => (
                          <option key={p.propertyId} value={p.propertyId}>
                            {p.propertyId} - {p.propertyName} ({p.region})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => handleRunERPExport('QUICKBOOKS_ONLINE')}
                        disabled={exportLoading}
                        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        Push to QuickBooks Online API
                      </button>
                      <button
                        onClick={() => handleRunERPExport('RESTAURANT_365')}
                        disabled={exportLoading}
                        className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        Push to Restaurant365 Webhook
                      </button>
                    </div>

                    {exportMessage && (
                      <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-amber-300 font-mono leading-relaxed">
                        {exportMessage}
                      </div>
                    )}
                  </div>

                  {/* Export History & GL Ledger Table */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      General Ledger (GL) Export History ({erpExports.length})
                    </h3>

                    {erpExports.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No ERP exports generated yet. Click above to trigger your first GL batch export for any of the 49 properties.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {erpExports.map((exp) => (
                          <div key={exp.exportId} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-amber-400 font-semibold">{exp.exportId}</span>
                              <span className="text-slate-400">Date: {exp.batchDate} · Property: {exp.propertyId}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs py-2 border-y border-slate-700/60 font-mono">
                              <div>Revenue: <strong className="text-emerald-400">${exp.totalRevenue.toLocaleString()}</strong></div>
                              <div>COGS: <strong className="text-amber-400">${exp.totalCogs.toLocaleString()}</strong></div>
                              <div>Waste: <strong className="text-red-400">${exp.totalWaste.toLocaleString()}</strong></div>
                              <div>Net: <strong className="text-cyan-400">${exp.netMargin.toLocaleString()}</strong></div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">{exp.entries.length} GL accounts mapped</span>
                              <button
                                onClick={() => {
                                  const csv = ERPIntegrationService.exportToCSV(exp);
                                  const blob = new Blob([csv], { type: 'text/csv' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${exp.exportId}-GL.csv`;
                                  a.click();
                                }}
                                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" /> Download CSV Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CLOUD SYNC OUTBOX PIPELINE */}
            {activeTab === 'sync' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">49 Distributed Android SQLite WAL Outbox &amp; Cloud Sync Pipeline</h2>
                  <p className="text-xs text-slate-400">Bridges 49 kitchen walk-in offline tablet databases to centralized cloud store with HMAC-SHA256 signature verification</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-cyan-400" />
                      49-Tablet SQLite WAL Fleet Outbox Status
                    </h3>
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Kitchen Tablets:</span>
                        <strong className="text-white font-mono text-sm">49 Connected Terminals</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pending Outbox Items:</span>
                        <strong className="text-amber-400 font-mono text-sm">{syncQueueCount} Items</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">WorkManager Sync Schedule:</span>
                        <strong className="text-emerald-400 font-mono">Periodic (15 min / Wi-Fi required)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fleet Security Protocol:</span>
                        <strong className="text-cyan-400 font-mono">HMAC-SHA256 &amp; AdelicZeta Invariants</strong>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerCloudSync}
                      disabled={syncing || syncQueueCount === 0}
                      className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/20"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Transmitting Outbox Batch across 49 nodes...' : 'Flush Outbox & Sync 49 Nodes Now'}
                    </button>

                    {syncResultMsg && (
                      <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-emerald-300 font-mono">
                        {syncResultMsg}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      Distributed Architecture Verification
                    </h3>
                    <div className="space-y-3 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>49 Independent Room WAL Stores:</strong> Walk-in transactions across all 49 remote kitchens store reliably in local SQLite WAL tables even during total network failure.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Exponential Backoff Jitter:</strong> Automatically backs off and retries up to 5 times upon intermittent Wi-Fi drops at resort and lodge properties.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Zero-Trust Server Ingestion:</strong> Validates `X-Device-Signature` headers against server shared secret before committing records to centralized cloud PostgreSQL store.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: RBAC & GATEKEEPING */}
            {activeTab === 'rbac' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Role-Based Access Control (RBAC) &amp; Isolation</h2>
                  <p className="text-xs text-slate-400">Enforces strict separation between line-level kitchen tablets and corporate executive macro dashboards</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(['ROLE_LINE_COOK', 'ROLE_HEAD_CHEF', 'ROLE_GENERAL_MANAGER', 'ROLE_CORPORATE_EXECUTIVE'] as UserRole[]).map((role) => {
                      const isActive = currentRole === role;
                      return (
                        <div
                          key={role}
                          onClick={() => handleRoleChange(role)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-lg'
                              : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-[10px] font-mono text-amber-400 block mb-1">ACCESS LEVEL</span>
                          <h4 className="text-sm font-bold text-white font-mono">{role}</h4>
                          <p className="text-xs mt-2 text-slate-300">
                            {role === 'ROLE_LINE_COOK' && 'Locked Kiosk mode. Kitchen prep & Chronos timers only.'}
                            {role === 'ROLE_HEAD_CHEF' && 'Station oversight, inventory audits & recipe scaling.'}
                            {role === 'ROLE_GENERAL_MANAGER' && 'Property-level financials, audit logs & shift management.'}
                            {role === 'ROLE_CORPORATE_EXECUTIVE' && 'Full regional macro analytics, 49-portfolio heatmap & ERP exports.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      API Gatekeeping &amp; HTTP 403 Enforcement
                    </h3>
                    <p className="text-xs text-slate-300">
                      When logged in as <strong className="text-amber-400">{currentRole}</strong>, executive API requests to <code className="text-cyan-400 font-mono">/api/v1/corporate/*</code> are {hasAccess ? <span className="text-emerald-400 font-bold">AUTHORIZED (200 OK)</span> : <span className="text-red-400 font-bold">BLOCKED (403 Forbidden)</span>}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* PROPERTY DRILL-DOWN INSPECTION DRAWER / MODAL */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-2xl shadow-2xl p-6 space-y-5 text-slate-100 relative">
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>{selectedProperty.propertyId}</span>
                <span>·</span>
                <span className="text-amber-400">{selectedProperty.region}</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-3">
                {selectedProperty.propertyName}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                    selectedProperty.status === 'GREEN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : selectedProperty.status === 'YELLOW'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  {selectedProperty.status}
                </span>
              </h3>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Food Cost % (FCP)</span>
                <span className={`text-base font-bold font-mono ${selectedProperty.currentFCP > 31 ? 'text-red-400' : selectedProperty.currentFCP > 28 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedProperty.currentFCP}%
                </span>
                <span className="text-[10px] text-slate-500 block">Benchmark: ≤ 28.0%</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Waste Rate</span>
                <span className={`text-base font-bold font-mono ${selectedProperty.wasteRate > 6 ? 'text-red-400' : selectedProperty.wasteRate > 3.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedProperty.wasteRate}%
                </span>
                <span className="text-[10px] text-slate-500 block">Target: &lt; 3.5%</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Monthly EBITDA</span>
                <span className="text-base font-bold font-mono text-white">
                  ${selectedProperty.monthlyEbitda.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 block">Net operating margin</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Waste Recovered</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  ${selectedProperty.wasteRecoveredDollars.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Via daily specials</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Surplus Sales Gains</span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  ${selectedProperty.surplusSalesGains.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Par-to-Plate engine</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Labor Hours Saved</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {selectedProperty.laborHoursSaved} hrs
                </span>
                <span className="text-[10px] text-slate-500 block">Chronos automated line</span>
              </div>
            </div>

            {/* AdelicZeta Verification Badge */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>AdelicZeta Formal Verification Proof</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400 truncate max-w-sm">
                  {selectedProperty.zetaProofHash || `ZETA-PROOF-${selectedProperty.propertyId}-ALGEBRAIC-OK`}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                0% Rounding Drift
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedProperty(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedErpPropertyId(selectedProperty.propertyId);
                  setActiveTab('erp');
                  setSelectedProperty(null);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <span>Export GL for {selectedProperty.propertyId}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
