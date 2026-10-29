/**
 * src/components/pos/POSGatewayModal.tsx
 *
 * Bi-Directional Legacy POS & KDS Gateway Terminal with ESC/POS Thermal Printing Visualizer:
 * - Strategy selection: Toast POS vs Lightspeed Restaurant vs Generic REST
 * - Inbound guest check ingestion with automatic TableStatus & PrepItem mapping
 * - Real-Time ESC/POS Virtual Kitchen Thermal Slip Visualizer with raw hex stream inspector
 * - Outbound 86'd synchronization broadcaster
 * - Optimistic Locking (@Version) race condition simulation
 */
import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import {
  X,
  CreditCard,
  Printer,
  Bell,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  Send,
  Radio,
  FileText,
  Volume2,
} from 'lucide-react';
import {
  POSProvider,
  POSOrderPayload,
  ThermalSlipTicket,
} from '../../types';
import { LegacyPOSGatewayAdapter } from '../../services/pos/LegacyPOSGatewayAdapter';
import { EscPosPrinterDriver } from '../../services/printer/EscPosPrinterDriver';

export const POSGatewayModal: React.FC = () => {
  const {
    isPosGatewayModalOpen,
    setIsPosGatewayModalOpen,
    posProvider,
    setPosProvider,
    ingestPOSOrderCheck,
    recentThermalSlips,
    activeThermalSlipForPreview,
    setActiveThermalSlipForPreview,
    eightySixList,
  } = useChef();

  const [activeTab, setActiveTab] = useState<'INGESTION' | 'PRINTER_SLIP' | 'EIGHTY_SIX' | 'OPTIMISTIC_LOCK'>('INGESTION');
  const [selectedStationForPrint, setSelectedStationForPrint] = useState<string>('Sauce/Sauté');
  const [custom86Item, setCustom86Item] = useState('');
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Optimistic lock simulation states
  const [conflictResult, setConflictResult] = useState<any | null>(null);

  if (!isPosGatewayModalOpen) return null;

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Sample Toast Order Check
  const sampleToastOrder: POSOrderPayload = {
    checkId: `chk-toast-${Date.now().toString().slice(-4)}`,
    orderNumber: `TOAST-${Math.floor(1000 + Math.random() * 9000)}`,
    tableNumber: '02',
    tableId: 'tbl-02',
    diningSection: 'Main Dining Room',
    guestCount: 4,
    serverName: 'Chloe M.',
    openedTimestamp: Date.now() - 25 * 60 * 1000,
    status: 'IN_KITCHEN',
    subtotal: 212.0,
    tax: 16.96,
    total: 228.96,
    version: 2,
    items: [
      {
        id: 'toast-item-1',
        menuItemId: 'rec-1',
        name: 'Prime Tenderloin Au Poivre',
        quantity: 2,
        price: 58.0,
        seatNumber: 1,
        course: 'ENTREE',
        targetStation: 'Butchery',
        modifiers: ['Medium-Rare', 'Extra Cognac Demi'],
        allergenAlerts: [],
        fireStatus: 'FIRED',
      },
      {
        id: 'toast-item-2',
        menuItemId: 'rec-2',
        name: 'Pan-Roasted Pacific Halibut',
        quantity: 2,
        price: 48.0,
        seatNumber: 2,
        course: 'ENTREE',
        targetStation: 'Sauce/Sauté',
        modifiers: ['Skin Crisped', 'Beurre Blanc on Side'],
        allergenAlerts: ['GLUTEN_FREE requested'],
        fireStatus: 'FIRED',
      },
    ],
  };

  // Sample Lightspeed Order Check
  const sampleLightspeedOrder: POSOrderPayload = {
    checkId: `chk-ls-${Date.now().toString().slice(-4)}`,
    orderNumber: `LS-${Math.floor(2000 + Math.random() * 8000)}`,
    tableNumber: 'PDR Boardroom',
    tableId: 'tbl-pdr1',
    diningSection: 'Private Dining Room',
    guestCount: 12,
    serverName: 'Sam T.',
    openedTimestamp: Date.now() - 45 * 60 * 1000,
    status: 'IN_KITCHEN',
    subtotal: 552.0,
    tax: 44.16,
    total: 596.16,
    version: 1,
    items: [
      {
        id: 'ls-item-1',
        menuItemId: 'rec-4',
        name: 'Governors Roast Prime Rib of Beef',
        quantity: 12,
        price: 46.0,
        course: 'ENTREE',
        targetStation: 'Butchery',
        modifiers: ['12oz Cut', 'Marrow Jus'],
        allergenAlerts: ['SHELLFISH_FREE table-wide'],
        fireStatus: 'FIRED',
      },
    ],
  };

  const handleIngestOrder = (order: POSOrderPayload) => {
    ingestPOSOrderCheck(order);
    showNotification(
      `Ingested Check #${order.orderNumber}: Mapped to Table ${order.tableNumber}, generated station tickets and auto-routed to ESC/POS thermal printers!`
    );
    setActiveTab('PRINTER_SLIP');
  };

  const handleManual86Broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custom86Item.trim()) return;
    await LegacyPOSGatewayAdapter.broadcast86Update(
      custom86Item.trim(),
      true,
      'Manual BOH 86 Toggle via Gateway'
    );
    showNotification(`Broadcasted 86 update for "${custom86Item.trim()}" to ${posProvider} POS API.`);
    setCustom86Item('');
  };

  const handleTestOptimisticConflict = () => {
    const res = LegacyPOSGatewayAdapter.resolveOptimisticLockCollision(
      'PREP_ITEM',
      'prep-item-conflict-101',
      2, // local version (cook tapped complete on screen)
      3, // incoming version from external POS webhook
      { isCompleted: true, completedQuantity: 2, targetQuantity: 2, status: 'ENTREE_PHASE' },
      { isCompleted: false, completedQuantity: 0, targetQuantity: 2, status: 'SEATED' }
    );
    setConflictResult(res);
    showNotification(`Simulated optimistic collision: Resolved with ${res.conflictRecord.resolutionStrategy}`);
  };

  const currentSlip = activeThermalSlipForPreview || recentThermalSlips[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  Bi-Directional Legacy POS & KDS Gateway
                </h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{posProvider} POS Connected</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Toast & Lightspeed check ingestion, real-time ESC/POS thermal printing, and 86'd menu synchronization
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPosGatewayModalOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusNotification && (
          <div className="px-5 py-2.5 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>{statusNotification}</span>
            <button onClick={() => setStatusNotification(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Tabs */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('INGESTION')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'INGESTION'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Inbound Check Ingestion
          </button>
          <button
            onClick={() => setActiveTab('PRINTER_SLIP')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'PRINTER_SLIP'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ESC/POS Slip Visualizer</span>
            {recentThermalSlips.length > 0 && (
              <span className="text-[10px] bg-black/30 px-1 rounded">{recentThermalSlips.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('EIGHTY_SIX')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'EIGHTY_SIX'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>86'd Synchronization</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">
              {eightySixList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('OPTIMISTIC_LOCK')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'OPTIMISTIC_LOCK'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Optimistic Concurrency (@Version)
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'INGESTION' && (
            <div className="space-y-4">
              {/* POS Provider Strategy Selector */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 font-mono block">
                    Active POS Integration Strategy
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Selects webhook parser & delta polling client for legacy dining room systems
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['TOAST', 'LIGHTSPEED', 'GENERIC_REST'] as POSProvider[]).map((prov) => (
                    <button
                      key={prov}
                      onClick={() => setPosProvider(prov)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        posProvider === prov
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inbound Check Ingestion Triggers */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-300 font-mono block">
                  Simulate Live POS Webhook Inbound Ingestion
                </span>
                <p className="text-xs text-slate-400">
                  Triggers realistic multi-item guest check injection, maps dining room table status, and generates station routing slips.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleIngestOrder(sampleToastOrder)}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-900/90 hover:border-amber-400 hover:bg-slate-800/90 text-left transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400">Toast Check #TOAST-5521</span>
                      <span className="text-[10px] font-mono text-slate-400">Table 02 · 4 Covers</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      2x Tenderloin Au Poivre (Med-Rare) + 2x Halibut (Gluten-Free Allergy Alert)
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold pt-1">
                      <span>Ingest Toast Order</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleIngestOrder(sampleLightspeedOrder)}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-900/90 hover:border-sky-400 hover:bg-slate-800/90 text-left transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-400">Lightspeed Check #LS-9014</span>
                      <span className="text-[10px] font-mono text-slate-400">PDR Boardroom · 12 Covers</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      12x Governors Roast Prime Rib + Shellfish-Free Table Alert
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-sky-300 font-semibold pt-1">
                      <span>Ingest Lightspeed Order</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PRINTER_SLIP' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Slip Selector & Station Routing (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-400 font-mono block">
                    Recent Routed Slips ({recentThermalSlips.length})
                  </span>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {recentThermalSlips.map((slip) => (
                      <button
                        key={slip.ticketId}
                        onClick={() => setActiveThermalSlipForPreview(slip)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all text-xs ${
                          currentSlip?.ticketId === slip.ticketId
                            ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{slip.destinationStation}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Tbl: {slip.tableName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {slip.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </button>
                    ))}
                    {recentThermalSlips.length === 0 && (
                      <p className="text-xs text-slate-500 italic p-2">
                        No slips printed yet. Ingest an order from the first tab!
                      </p>
                    )}
                  </div>
                </div>

                {/* Thermal Hardware Parameters */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Protocol:</span>
                    <strong className="text-white">Raw ESC/POS (Port 9100)</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cutter:</span>
                    <strong className="text-emerald-400">GS V 66 0 (Partial Cut)</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Acoustic Buzzer:</span>
                    <strong className="text-amber-400">BEL (0x07) / ESC B 2 2</strong>
                  </div>
                </div>
              </div>

              {/* Thermal Paper Slip Rendering (7 cols) */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono uppercase text-slate-400 font-semibold">
                    80mm Thermal Receipt Simulation
                  </span>
                  {currentSlip?.buzzerTriggered && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Buzzer Actuated</span>
                    </span>
                  )}
                </div>

                {currentSlip ? (
                  <div className="space-y-3">
                    {/* Visual White Thermal Receipt Paper Layout */}
                    <div className="bg-amber-50 text-slate-950 rounded-xl p-5 shadow-2xl font-mono text-xs border border-amber-200 select-all leading-relaxed">
                      <div className="text-center font-bold text-sm border-b-2 border-dashed border-slate-800 pb-2 mb-2">
                        *** {currentSlip.destinationStation.toUpperCase()} ***
                        <br />
                        <span className="text-[10px] font-normal">CHEFAGENT HOSPITALITY KDS</span>
                      </div>

                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span>TBL: {currentSlip.tableName}</span>
                        <span>CHK: #{currentSlip.orderNumber}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-700 mb-2 border-b border-dashed border-slate-400 pb-2">
                        <span>SECT: {currentSlip.diningSection}</span>
                        <span>SRV: {currentSlip.serverName}</span>
                      </div>

                      <div className="space-y-2 py-1">
                        {currentSlip.items.map((item, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="font-bold text-sm flex justify-between">
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                            </div>
                            {item.modifiers.map((mod, mIdx) => (
                              <div key={mIdx} className="text-xs pl-3 text-slate-700">
                                &gt;&gt; {mod}
                              </div>
                            ))}
                            {item.allergenAlerts.map((alt, aIdx) => (
                              <div
                                key={aIdx}
                                className="bg-slate-950 text-white font-black text-xs px-2 py-1 rounded my-1 uppercase"
                              >
                                ! ALLERGY ALERT !: {alt}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      <div className="border-t-2 border-dashed border-slate-800 pt-2 mt-3 text-center text-[10px] text-slate-600">
                        {new Date(currentSlip.timestamp).toLocaleString()}
                        <br />
                        - - - - - - - - - - - - - - - - - - [CUT]
                      </div>
                    </div>

                    {/* Raw ESC/POS Hex Stream Inspector */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        Raw ESC/POS Hexadecimal Command Stream
                      </span>
                      <pre className="bg-black/90 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-sky-400 overflow-x-auto whitespace-pre leading-relaxed select-all">
                        {currentSlip.rawHexStream}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    No active slip to preview.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'EIGHTY_SIX' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-300 font-mono block">
                  Broadcast 86'd Menu Item to Legacy POS Ecosystems
                </span>
                <p className="text-xs text-slate-400">
                  When inventory drops below par, ChefAgent broadcasts an 86 update payload to disable menu items in Toast & Lightspeed in real time.
                </p>

                <form onSubmit={handleManual86Broadcast} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={custom86Item}
                    onChange={(e) => setCustom86Item(e.target.value)}
                    placeholder="Enter depleted ingredient (e.g. Wild Pacific Halibut, Prime Filet)..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast 86 to POS</span>
                  </button>
                </form>
              </div>

              {/* Active 86-list summary */}
              <div className="border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold uppercase text-slate-400 font-mono block">
                  Active Depleted Lines ({eightySixList.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eightySixList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-300 flex items-center justify-between"
                    >
                      <span>{item}</span>
                      <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                        DISABLED ON POS
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'OPTIMISTIC_LOCK' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-300 font-mono block">
                  Simulate Concurrency Collision & Optimistic Lock Resolution
                </span>
                <p className="text-xs text-slate-400">
                  Tests simultaneous write collision: external POS webhook updates a check while a line-cook simultaneously marks the prep item complete on a touchscreen terminal (@Version column).
                </p>

                <button
                  onClick={handleTestOptimisticConflict}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Simulated Race Condition Test</span>
                </button>
              </div>

              {conflictResult && (
                <div className="border border-slate-700 bg-slate-950 rounded-xl p-4 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>ACID RESOLUTION: {conflictResult.conflictRecord.resolutionStrategy}</span>
                    <span>Version: {conflictResult.nextVersion}</span>
                  </div>
                  <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre bg-black/60 p-3 rounded-lg border border-slate-800">
                    {JSON.stringify(conflictResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>Integrated with Toast POS, Lightspeed, and raw ESC/POS socket stream.</span>
          <button
            onClick={() => setIsPosGatewayModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            Close POS Gateway
          </button>
        </div>
      </div>
    </div>
  );
};
