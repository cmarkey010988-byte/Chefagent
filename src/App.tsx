/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { ChefProvider, useChef } from './context/ChefContext';
import { Header } from './components/Header';
import { PinModal } from './components/PinModal';
import { StationPrepBoard } from './components/boh/StationPrepBoard';
import { BOHRecipeScaler } from './components/boh/BOHRecipeScaler';
import { SanitationLogView } from './components/boh/SanitationLogView';
import { FloorPlanView } from './components/foh/FloorPlanView';
import { ShiftManagementView } from './components/foh/ShiftManagementView';
import { PurchaseOrderView } from './components/procurement/PurchaseOrderModal';
import { FOHInventoryAudit } from './components/foh/FOHInventoryAudit';
import { FOHMarginDashboard } from './components/foh/FOHMarginDashboard';
import { EventScheduleView } from './components/events/EventScheduleView';
import { OnHandMenuGeneratorView } from './components/menu/OnHandMenuGeneratorView';
import { CulinaryCopilotDrawer } from './components/copilot/CulinaryCopilotDrawer';
import { PlatingMediaStudioModal } from './components/media/PlatingMediaStudioModal';
import { ExecutiveWorkflowHUD } from './components/executive/ExecutiveWorkflowHUD';
import { ExpirationMenuModal } from './components/executive/ExpirationMenuModal';
import { VisionScanModal } from './components/inventory/VisionScanModal';
import { AuditDiffModal } from './components/inventory/AuditDiffModal';
import { EDIInspectorModal } from './components/procurement/EDIInspectorModal';
import { BarcodeTerminalModal } from './components/barcode/BarcodeTerminalModal';
import { POSGatewayModal } from './components/pos/POSGatewayModal';
import { FOHVoiceOverlay } from './components/foh/FOHVoiceOverlay';
import { CorporateCommandCenterPortal } from './components/executive/CorporateCommandCenterPortal';
import { P2PMeshSyncHUD } from './components/sync/P2PMeshSyncHUD';
import {
  Building2,
  Flame,
  Scale,
  TrendingUp,
  ClipboardList,
  Sparkles,
  LayoutGrid,
  ShieldCheck,
  Calendar,
  Truck,
  Users,
  Thermometer,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeProfile, terminology, isSyncHudOpen, setIsSyncHudOpen } = useChef();
  const isBOH = activeProfile === 'BOH_KITCHEN';

  // Sub-tabs for BOH
  const [bohTab, setBohTab] = useState<'prep' | 'scaling' | 'sanitation' | 'onhand'>('prep');

  // Sub-tabs for FOH
  const [fohTab, setFohTab] = useState<
    'floor' | 'shifts' | 'procurement' | 'inventory' | 'margin' | 'events' | 'onhand'
  >('floor');

  const [showCorporatePortal, setShowCorporatePortal] = useState(false);

  if (showCorporatePortal) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-mono text-amber-400 font-bold">CHEFAGENT ENTERPRISE REGIONAL COMMAND</span>
          <button
            onClick={() => setShowCorporatePortal(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-colors"
          >
            Exit to Single-Property Terminal
          </button>
        </div>
        <CorporateCommandCenterPortal />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-250 ${
        isBOH ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Universal App Bar */}
      <Header />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Corporate Command Center Banner Toggle */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Multi-Site Corporate Command Center & Regional Analytics
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black font-mono">49 ROOFTOPS</span>
              </h2>
              <p className="text-xs text-slate-400">Manage 49-property portfolio heatmap, cloud sync WAL outbox, and ERP GL export across 8 regions.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCorporatePortal(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span>Launch Corporate Command Center (49 Sites)</span>
            <Building2 className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Context Banner & Sub-Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isBOH
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                }`}
              >
                {isBOH ? 'BOH Kitchen Line' : 'FOH Operations & Control'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {isBOH
                  ? 'High-Contrast OLED Touch Terminal (Chef Bruce & Line Station Stewards)'
                  : 'Executive Service Management & Floor Logistics (Manager Ashley)'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {isBOH ? (
                bohTab === 'prep'
                  ? 'Line Station Prep & Mise en Place'
                  : bohTab === 'scaling'
                  ? 'Yield & Sub-Recipe Engineering'
                  : bohTab === 'sanitation'
                  ? 'Warewash, Sanitation & Chemical Logs'
                  : 'Smart On-Hand Menu Generator'
              ) : (
                fohTab === 'floor'
                  ? 'Floor Plan, Table Pacing & 86 Sync'
                  : fohTab === 'shifts'
                  ? 'Labor Roster & Pre-Shift Handoff'
                  : fohTab === 'procurement'
                  ? 'Procurement & Supplier PO Generator (EDI X12)'
                  : fohTab === 'inventory'
                  ? 'Inventory Par Reconciliation & Barcode Engine'
                  : fohTab === 'margin'
                  ? 'Food Cost % & Menu Margins'
                  : fohTab === 'events'
                  ? `${terminology.eventLabel} Event Schedule`
                  : 'Par-to-Plate Surplus Menu Optimization'
              )}
            </h1>
          </div>

          {/* Sub-view Segmented Tabs */}
          <div
            className={`p-1 rounded-xl flex items-center border transition-colors overflow-x-auto scrollbar-none max-w-full ${
              isBOH
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            {isBOH ? (
              <>
                <button
                  type="button"
                  onClick={() => setBohTab('prep')}
                  className={`min-h-[42px] px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    bohTab === 'prep'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Station Prep</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBohTab('scaling')}
                  className={`min-h-[42px] px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    bohTab === 'scaling'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Recipe Scaler</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBohTab('sanitation')}
                  className={`min-h-[42px] px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    bohTab === 'sanitation'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Sanitation & Temps</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBohTab('onhand')}
                  className={`min-h-[42px] px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    bohTab === 'onhand'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Par-to-Plate AI</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFohTab('floor')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'floor'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Floor Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFohTab('shifts')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'shifts'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Shift Brief</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFohTab('procurement')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'procurement'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Procurement & EDI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFohTab('inventory')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'inventory'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Inventory & Barcode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFohTab('margin')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'margin'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Margins (28%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFohTab('events')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'events'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Events</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFohTab('onhand')}
                  className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    fohTab === 'onhand'
                      ? 'bg-indigo-900 text-white font-black shadow-md'
                      : 'text-indigo-700 hover:text-indigo-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Par-to-Plate</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Body Content */}
        {isBOH ? (
          bohTab === 'prep' ? (
            <StationPrepBoard />
          ) : bohTab === 'scaling' ? (
            <BOHRecipeScaler />
          ) : bohTab === 'sanitation' ? (
            <SanitationLogView />
          ) : (
            <OnHandMenuGeneratorView />
          )
        ) : fohTab === 'floor' ? (
          <FloorPlanView />
        ) : fohTab === 'shifts' ? (
          <ShiftManagementView />
        ) : fohTab === 'procurement' ? (
          <PurchaseOrderView />
        ) : fohTab === 'inventory' ? (
          <FOHInventoryAudit />
        ) : fohTab === 'margin' ? (
          <FOHMarginDashboard />
        ) : fohTab === 'events' ? (
          <EventScheduleView />
        ) : (
          <OnHandMenuGeneratorView />
        )}
      </main>

      {/* Slide-out Gemini Culinary Copilot Drawer */}
      <CulinaryCopilotDrawer />

      {/* High-Resolution Plating & Marketing Studio Modal */}
      <PlatingMediaStudioModal />

      {/* FOH Access Security PIN Keypad Modal */}
      <PinModal />

      {/* AI Executive Workflow HUD Banner */}
      <ExecutiveWorkflowHUD />

      {/* AI Vision Shelf-Counting Scanner & Viewfinder Modal */}
      <VisionScanModal />

      {/* AI Vision Side-by-Side Reconciliation Diff Modal */}
      <AuditDiffModal />

      {/* AI Expiration-Driven Daily Specials & Banquet Proposals Modal */}
      <ExpirationMenuModal />

      {/* EDI Inspector & Outbox Queue Modal */}
      <EDIInspectorModal />

      {/* Barcode Scanner Terminal & Simulator Modal */}
      <BarcodeTerminalModal />

      {/* Bi-Directional POS Gateway & Thermal Printer Slip Modal */}
      <POSGatewayModal />

      {/* Voice Assistant Overlay & Undo Banner */}
      <FOHVoiceOverlay />

      {/* Local-First SQLite WAL & P2P Mesh Delta-Sync Engine HUD */}
      <P2PMeshSyncHUD isOpen={isSyncHudOpen} onClose={() => setIsSyncHudOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ChefProvider>
      <AppContent />
    </ChefProvider>
  );
}
