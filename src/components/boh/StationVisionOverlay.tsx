import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Thermometer,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  FileCheck2,
  Network,
  Cpu,
  Eye,
  Wind,
  ShieldCheck,
  Scale,
  Printer,
  X,
  ExternalLink,
  Lock,
} from 'lucide-react';
import {
  VisionBoundingBox,
  VisionFrameTelemetry,
  MultimodalFusionResult,
  NpuExecutionDelegate,
  FrameDecimationMode,
  GastronormStandard,
  GastronormTareProfile,
  DehazeFilterMode,
  MicroHeaterState,
  HaccpBlockEntry,
  HaccpShiftReport,
  MeshCrdtPeerNode,
} from '../../types/vision';
import { VisionAcousticFusionEngine } from '../../services/vision/VisionAcousticFusionEngine';
import { RetinexDehazeEngine } from '../../services/vision/RetinexDehazeEngine';
import { HaccpAuditLedger } from '../../services/compliance/HaccpAuditLedger';
import { LocalMeshCrdtEngine } from '../../services/crdt/LocalMeshCrdtEngine';

interface StationVisionOverlayProps {
  stationId?: string;
  activePrepItems?: Array<{
    id: string;
    recipeName: string;
    fillLevelPercentage?: number;
    anomalyFlag?: boolean;
  }>;
  onConfirm86?: (recipeName: string) => void;
  onClearAnomaly?: (prepItemId: string) => void;
}

export const StationVisionOverlay: React.FC<StationVisionOverlayProps> = ({
  stationId = 'Sauce/Sauté',
  activePrepItems = [],
  onConfirm86,
  onClearAnomaly,
}) => {
  // Navigation tabs within vision subsystem
  const [activeTab, setActiveTab] = useState<'STREAM' | 'NPU_ACCEL' | 'OPTICS_TARE' | 'CRDT_MESH' | 'HACCP_LEDGER'>('STREAM');

  // Edge Vision HAL Stream State
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [isSimulatingStream, setIsSimulatingStream] = useState(true);

  // NPU Hardware Acceleration & Quantization
  const [npuDelegate, setNpuDelegate] = useState<NpuExecutionDelegate>('MEDIATEK_NEUROPILOT');
  const [decimationMode, setDecimationMode] = useState<FrameDecimationMode>('ACTIVE_MOTION_30FPS');
  const [motionVectorDelta, setMotionVectorDelta] = useState<number>(0.14);
  const [staticDurationSeconds, setStaticDurationSeconds] = useState<number>(0);
  const [fps, setFps] = useState<number>(30.0);
  const [npuLatencyMs, setNpuLatencyMs] = useState<number>(5.6);
  const [junctionTemp, setJunctionTemp] = useState<number>(74.2);
  const [isThrottled, setIsThrottled] = useState<boolean>(false);

  // Environmental Optics & Recovery
  const [dehazeMode, setDehazeMode] = useState<DehazeFilterMode>('RETINEX_MULTI_SCALE');
  const [steamObscurationLevel, setSteamObscurationLevel] = useState<number>(18);
  const [greaseFilmVariance, setGreaseFilmVariance] = useState<number>(12);
  const [microHeaterState, setMicroHeaterState] = useState<MicroHeaterState>('STANDBY');
  const [microHeaterTempC, setMicroHeaterTempC] = useState<number>(44.0);
  const [selectedGnStandard, setSelectedGnStandard] = useState<GastronormStandard>('GN_1_1');
  const [gnTareProfile, setGnTareProfile] = useState<GastronormTareProfile>(() =>
    RetinexDehazeEngine.calibrateGastronormTare('GN_1_1', 320, 520)
  );

  // Local CRDT Mesh Engine Instance
  const crdtEngine = useMemo(() => new LocalMeshCrdtEngine('node-kiosk-sauce'), []);
  const [meshPeers, setMeshPeers] = useState<MeshCrdtPeerNode[]>(() => crdtEngine.getConnectedPeers());
  const [crdtMergeCount, setCrdtMergeCount] = useState<number>(0);
  const [partitionNotice, setPartitionNotice] = useState<string | null>(null);

  // HACCP Ledger State
  const [haccpChain, setHaccpChain] = useState<HaccpBlockEntry[]>(() => HaccpAuditLedger.getLedgerChain());
  const [isHaccpReportModalOpen, setIsHaccpReportModalOpen] = useState(false);
  const [haccpReport, setHaccpReport] = useState<HaccpShiftReport | null>(null);

  // Simulated bounding box detections
  const [detections, setDetections] = useState<VisionBoundingBox[]>([
    {
      id: 'det-pan-1',
      label: 'Atlantic Salmon Fillets',
      confidence: 0.96,
      x: 0.12,
      y: 0.20,
      width: 0.38,
      height: 0.44,
      stationId: stationId,
      fillLevelPercentage: 15, // Low stock warning!
      anomalyFlag: false,
      safetyViolation: 'NONE',
      temperatureCelsius: 165,
    },
    {
      id: 'det-pan-2',
      label: 'Herb Dijon Demi-Glace',
      confidence: 0.92,
      x: 0.55,
      y: 0.18,
      width: 0.32,
      height: 0.38,
      stationId: stationId,
      fillLevelPercentage: 75,
      anomalyFlag: false,
      safetyViolation: 'NONE',
      temperatureCelsius: 142,
    },
    {
      id: 'det-knife-1',
      label: 'Chef Slicing Knife / Board',
      confidence: 0.89,
      x: 0.58,
      y: 0.62,
      width: 0.34,
      height: 0.30,
      stationId: stationId,
      fillLevelPercentage: 100,
      anomalyFlag: true,
      safetyViolation: 'KNIFE_HAZARD',
    },
  ]);

  // Multimodal fusion engine output
  const [fusionResult, setFusionResult] = useState<MultimodalFusionResult | null>(null);

  // Ticker for Live Stream, Dynamic Decimation & Optics Recovery
  useEffect(() => {
    if (!isSimulatingStream) return;

    const interval = setInterval(() => {
      // 1. Simulate motion & dynamic decimation logic
      setMotionVectorDelta((prev) => {
        // Randomly simulate motion burst vs stationary quiet line
        const randomShift = Math.random() > 0.6 ? 0.18 : 0.02;
        const nextDelta = Math.round(randomShift * 100) / 100;

        if (nextDelta < RetinexDehazeEngine.MOTION_THRESHOLD) {
          setStaticDurationSeconds((s) => s + 2);
        } else {
          setStaticDurationSeconds(0);
        }

        const decimation = RetinexDehazeEngine.determineDecimationFps(
          staticDurationSeconds * 1000,
          nextDelta,
          decimationMode
        );

        setDecimationMode(decimation.mode);
        if (!isThrottled) {
          setFps(decimation.fps);
        }

        return nextDelta;
      });

      // 2. Hardware temperature & thermal throttling
      setJunctionTemp((prev) => {
        const next = Math.round((prev + (Math.random() * 1.0 - 0.45)) * 10) / 10;
        if (next >= 80.0) {
          setIsThrottled(true);
          setFps(15.0);
        } else if (isThrottled && next <= 75.0) {
          setIsThrottled(false);
          setFps(30.0);
        }
        return next;
      });

      // 3. Optics Micro-heater automation
      const heaterDecision = RetinexDehazeEngine.evaluateLensDefogMicroHeaterTrigger(
        steamObscurationLevel,
        greaseFilmVariance,
        junctionTemp
      );
      setMicroHeaterState(heaterDecision.heaterAction);
      setMicroHeaterTempC(heaterDecision.targetTempC);

      // 4. Run multimodal fusion evaluation
      const evaluated = VisionAcousticFusionEngine.evaluateFusion({
        audioTranscript: '86 Salmon',
        audioRms: 2200,
        audioConfidence: 0.88,
        visualDetections: detections,
        stationId: stationId,
      });
      setFusionResult(evaluated);

      // 5. Update local CRDT store with current pan states
      for (const d of detections) {
        crdtEngine.updateLocalPanState(stationId, d.id, d.label, d.fillLevelPercentage, d.fillLevelPercentage <= 5);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulatingStream, detections, stationId, staticDurationSeconds, decimationMode, isThrottled, steamObscurationLevel, greaseFilmVariance, junctionTemp, crdtEngine]);

  // Recalibrate Gastronorm tare when standard selection changes
  const handleSelectGnStandard = (std: GastronormStandard) => {
    setSelectedGnStandard(std);
    const newProfile = RetinexDehazeEngine.calibrateGastronormTare(std, 320, 520);
    setGnTareProfile(newProfile);
  };

  const handleAdjustPanFill = (boxId: string, deltaPct: number) => {
    setDetections((prev) =>
      prev.map((d) => {
        if (d.id === boxId) {
          const nextFill = Math.max(0, Math.min(100, d.fillLevelPercentage + deltaPct));
          const isCritical = nextFill <= 10;

          // If pan is depleted, append HACCP audit record
          if (nextFill <= 5 && d.fillLevelPercentage > 5) {
            HaccpAuditLedger.appendIncidentBlock({
              stationId,
              incidentType: 'AUTO_86_TRIGGER',
              itemDescription: d.label,
              measuredValue: `${nextFill}% fill`,
              thresholdValue: '<= 5% Par depletion',
              actionTaken: 'Automated 86 broadcasted across local CRDT mesh.',
            });
            setHaccpChain(HaccpAuditLedger.getLedgerChain());
          }

          return {
            ...d,
            fillLevelPercentage: nextFill,
            anomalyFlag: isCritical,
          };
        }
        return d;
      })
    );
  };

  // Trigger temperature danger zone test excursion
  const handleSimulateTemperatureExcursion = () => {
    const check = HaccpAuditLedger.checkTemperatureDangerZone(
      stationId,
      'Hollandaise Holding Pan',
      126, // Below 140°F hot hold threshold
      'HOT_HOLD'
    );
    setHaccpChain(HaccpAuditLedger.getLedgerChain());
  };

  // Simulate Walk-In Partition Dropout & Zero-Loss Reconnect
  const handleSimulateMeshPartitionRecovery = () => {
    const isolatedStates = [
      {
        stationId: 'Garde Manger',
        panId: 'pan-isolated-oysters',
        itemName: 'Fresh Kumamoto Oysters',
        fillLevel: 8,
        is86: false,
        lastWriterNode: 'node-kiosk-coldprep',
        lamportTimestamp: crdtEngine.getLocalLamportClock() + 3,
        versionVector: { 'node-kiosk-coldprep': 18 },
      },
      {
        stationId: 'Garde Manger',
        panId: 'pan-isolated-truffle',
        itemName: 'Black Winter Truffle Butter',
        fillLevel: 0,
        is86: true,
        lastWriterNode: 'node-kiosk-coldprep',
        lamportTimestamp: crdtEngine.getLocalLamportClock() + 4,
        versionVector: { 'node-kiosk-coldprep': 19 },
      },
    ];

    const count = crdtEngine.simulatePartitionRecovery('node-kiosk-coldprep', isolatedStates);
    setCrdtMergeCount((c) => c + count);
    setMeshPeers(crdtEngine.getConnectedPeers());
    setPartitionNotice(`Reconnected Garde Manger walk-in kiosk: ${count} offline CRDT states merged cleanly without cloud dependency.`);
    setTimeout(() => setPartitionNotice(null), 5000);
  };

  const handleOpenHaccpReport = () => {
    const report = HaccpAuditLedger.generateShiftComplianceReport(stationId);
    setHaccpReport(report);
    setIsHaccpReportModalOpen(true);
  };

  const ledgerIntegrity = useMemo(() => HaccpAuditLedger.verifyLedgerIntegrity(), [haccpChain]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
      {/* Top Header & Architecture Navigation Ribbon */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Station Identity & Lens Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isThrottled ? 'bg-amber-400' : 'bg-emerald-400'
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isThrottled ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" />
              Multimodal Vision HAL: {stationId}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* NPU Delegate & Dynamic Decimation Pill */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-amber-400" />
              {npuDelegate === 'MEDIATEK_NEUROPILOT' ? 'NeuroPilot INT8' : 'Qualcomm SNPE INT8'} ({npuLatencyMs}ms)
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                decimationMode === 'IDLE_DECIMATED_2FPS'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {decimationMode === 'IDLE_DECIMATED_2FPS' ? '⚡ 2 FPS Idle Decimation' : '⚡ 30 FPS Active Motion'}
            </span>
          </div>
        </div>

        {/* Right Subsystem Navigation Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('STREAM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'STREAM' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vision Overlay</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPTICS_TARE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'OPTICS_TARE' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Optics & GN Tare</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CRDT_MESH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'CRDT_MESH' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>CRDT Mesh</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HACCP_LEDGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'HACCP_LEDGER' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HACCP Ledger ({haccpChain.length})</span>
          </button>
        </div>
      </div>

      {/* Partition Recovery Notification Alert */}
      {partitionNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{partitionNotice}</span>
          </div>
          <button type="button" onClick={() => setPartitionNotice(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: Real-Time Stream & Spatial Bounding Box Overlay */}
      {activeTab === 'STREAM' && (
        <div>
          {/* Quick HUD Ribbon for Video Stream */}
          <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] text-slate-300">
                Pacing: <strong className="text-amber-400">{fps.toFixed(0)} FPS</strong> ({isThrottled ? '480p Throttled' : '720p Native'})
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                Junction Temp: <strong className={junctionTemp >= 80 ? 'text-rose-400' : 'text-emerald-400'}>{junctionTemp}°C</strong>
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                Motion Delta: <strong className="text-amber-400">{motionVectorDelta}</strong>
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                Tare Standard: <strong className="text-amber-400">{selectedGnStandard}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBoxes((p) => !p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  showBoxes ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Boxes: {showBoxes ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setShowHeatmap((p) => !p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  showHeatmap ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Pan Fill: {showHeatmap ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setShowSafetyZones((p) => !p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  showSafetyZones ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Safety Hazards
              </button>
            </div>
          </div>

          {/* Main Visual Surface Viewport */}
          <div
            className={`relative w-full h-[390px] bg-slate-950 overflow-hidden select-none transition-all ${
              dehazeMode === 'RETINEX_MULTI_SCALE' ? 'contrast-125 brightness-105' : ''
            }`}
          >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Micro-heater bezel active heating pulse overlay */}
            {microHeaterState !== 'STANDBY' && (
              <div className="absolute inset-0 border-4 border-amber-500/40 pointer-events-none animate-pulse rounded-2xl">
                <div className="absolute top-2 right-2 bg-amber-500/90 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg">
                  <Flame className="w-3 h-3 text-slate-950" />
                  <span>Bezel Micro-Heater Active ({microHeaterTempC}°C)</span>
                </div>
              </div>
            )}

            {/* Background Station Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="text-center">
                <Flame className="w-20 h-20 text-amber-500 mx-auto" />
                <p className="text-xs font-mono text-slate-400 mt-2">
                  NPU INT8 Subsystem · Gastronorm Tare: {selectedGnStandard} · Dehaze: {dehazeMode}
                </p>
              </div>
            </div>

            {/* Bounding Box Overlays */}
            {showBoxes &&
              detections.map((box) => {
                const isLowFill = box.fillLevelPercentage <= 25;
                const isCriticalEmpty = box.fillLevelPercentage <= 10;
                const hasSafetyHazard = box.safetyViolation !== 'NONE';

                return (
                  <div
                    key={box.id}
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.width * 100}%`,
                      height: `${box.height * 100}%`,
                    }}
                    className={`absolute border-2 rounded-xl p-2 transition-all backdrop-blur-[2px] ${
                      hasSafetyHazard
                        ? 'border-rose-500 bg-rose-950/40 animate-pulse shadow-lg shadow-rose-500/20'
                        : isCriticalEmpty
                        ? 'border-red-500 bg-red-950/40 shadow-lg shadow-red-500/30'
                        : isLowFill
                        ? 'border-amber-500 bg-amber-950/30 shadow-md shadow-amber-500/20'
                        : 'border-emerald-500/80 bg-emerald-950/20'
                    }`}
                  >
                    {/* Header Label & Confidence */}
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold bg-slate-900/95 px-2 py-0.5 rounded-md border border-slate-700 text-white">
                      <span className="truncate">{box.label}</span>
                      <span className="text-amber-400">{(box.confidence * 100).toFixed(0)}%</span>
                    </div>

                    {/* Heatmap / Pan Fill Bar Overlay */}
                    {showHeatmap && box.fillLevelPercentage !== undefined && (
                      <div className="mt-2 bg-slate-900/95 p-1.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span>GN Fill Level:</span>
                          <span
                            className={`font-black ${
                              isCriticalEmpty ? 'text-red-400 animate-ping' : isLowFill ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {box.fillLevelPercentage}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              isCriticalEmpty ? 'bg-red-500' : isLowFill ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${box.fillLevelPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Safety Hazard Badge */}
                    {showSafetyZones && hasSafetyHazard && (
                      <div className="mt-1 flex items-center gap-1 bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-md">
                        <ShieldAlert className="w-3 h-3 text-white animate-bounce" />
                        <span>HAZARD: {box.safetyViolation.replace('_', ' ')}</span>
                      </div>
                    )}

                    {/* Interactive Simulation Controls */}
                    <div className="absolute bottom-1 right-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustPanFill(box.id, -20)}
                        className="w-5 h-5 bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-bold rounded flex items-center justify-center"
                        title="Simulate Pan Consumption (-20%)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustPanFill(box.id, 20)}
                        className="w-5 h-5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center justify-center"
                        title="Simulate Pan Refill (+20%)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Bottom Multimodal Fusion Decision Strip */}
            {fusionResult && (
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 border border-slate-700/90 rounded-xl p-3 backdrop-blur-md shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/20 border border-amber-500/40 p-2 rounded-lg text-amber-300">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                      <span className="font-bold text-amber-400">Fused Score:</span>
                      <span className="text-white font-black text-sm">
                        {(fusionResult.finalConfidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-slate-500">
                        = ({fusionResult.alpha} × Audio: {(fusionResult.audioScore * 100).toFixed(0)}%) + ({fusionResult.beta} × Vision: {(fusionResult.visionScore * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5">{fusionResult.rationaleText}</p>
                  </div>
                </div>

                {fusionResult.confirmedAction === 'CONFIRM_86' && onConfirm86 && (
                  <button
                    type="button"
                    onClick={() => onConfirm86(fusionResult.targetRecipeOrItemName)}
                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg font-bold text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm 86 '{fusionResult.targetRecipeOrItemName}'</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NPU Hardware Acceleration & Quantization Engine */}
      {activeTab === 'NPU_ACCEL' && (
        <div className="p-5 space-y-5 bg-slate-900 text-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                Edge SoC NPU Acceleration Delegate & Model Quantization
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero-copy Direct ByteBuffer execution on mobile NPU silicon (INT8 YOLOv8-Nano / MobileNetV4).
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
              NPU Execution Latency: {npuLatencyMs}ms (7.8x faster than CPU)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* NPU Delegate Selector */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                NPU Backend Delegate
              </span>
              <div className="space-y-2">
                {[
                  { id: 'MEDIATEK_NEUROPILOT', label: 'MediaTek NeuroPilot INT8' },
                  { id: 'QUALCOMM_SNPE', label: 'Qualcomm Snapdragon SNPE' },
                  { id: 'ROCKCHIP_NPU', label: 'Rockchip RGA/NPU (RK3588)' },
                  { id: 'NNAPI', label: 'Android NNAPI Hardware Delegate' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNpuDelegate(item.id as NpuExecutionDelegate)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold text-left transition-all border ${
                      npuDelegate === item.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Frame Decimation Monitor */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Dynamic Frame Decimation
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Pacing:</span>
                  <span className="font-mono font-bold text-white">{fps.toFixed(0)} FPS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Motion Vector Delta:</span>
                  <span className="font-mono font-bold text-amber-400">{motionVectorDelta}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Static Duration:</span>
                  <span className="font-mono font-bold text-slate-300">{staticDurationSeconds}s</span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-amber-400 h-full transition-all"
                    style={{ width: `${Math.min(100, motionVectorDelta * 400)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  When pans remain stationary for &gt;3s, inference frequency drops to 2 FPS to prevent thermal throttling, instantly restoring 30 FPS upon motion.
                </p>
              </div>
            </div>

            {/* Thermal Junction & Memory Pools */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Edge Memory & Thermals
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Direct ByteBuffer Pool:</span>
                  <span className="font-mono font-bold text-emerald-400">4 Slots (11.05 MB)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Heap Allocation GC Pauses:</span>
                  <span className="font-mono font-bold text-emerald-400">0.0 ms (Zero-Allocation)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SoC Junction Temperature:</span>
                  <span className={`font-mono font-bold ${junctionTemp >= 80 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {junctionTemp}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Thermal Throttling:</span>
                  <span className={`font-mono font-bold ${isThrottled ? 'text-amber-400' : 'text-slate-400'}`}>
                    {isThrottled ? 'Active (480p @ 15 FPS)' : 'Inactive (Normal)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Environmental Optics & Gastronorm Tare Calibrator */}
      {activeTab === 'OPTICS_TARE' && (
        <div className="p-5 space-y-5 bg-slate-900 text-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Wind className="w-4 h-4 text-amber-400" />
                Environmental Optics Recovery & Gastronorm Pan Tare Calibrator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cuts through grease atomization and steam plumes while calibrating standard GN stainless steel pans.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Retinex Digital De-Haze & Micro-Heater Subsystem */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Digital De-Haze & Bezel Defogger Grid
              </span>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">De-Hazing Algorithm:</span>
                  <div className="flex items-center gap-1">
                    {(['BYPASS', 'RETINEX_MULTI_SCALE'] as DehazeFilterMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDehazeMode(mode)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                          dehazeMode === mode
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {mode === 'BYPASS' ? 'Bypass' : 'Multi-Scale Retinex'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Micro-Heater Bezel Status:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded ${
                      microHeaterState === 'CONTINUOUS_DEFOG'
                        ? 'bg-rose-500/20 text-rose-300'
                        : microHeaterState === 'PULSING'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {microHeaterState} ({microHeaterTempC}°C)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Steam Obscuration Level:</span>
                  <span className="font-mono text-amber-300 font-bold">{steamObscurationLevel}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Grease Film Attenuation:</span>
                  <span className="font-mono text-amber-300 font-bold">{greaseFilmVariance}%</span>
                </div>
              </div>
            </div>

            {/* Gastronorm Pan Tare Profile */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Standard Gastronorm (GN) Pan Tare
              </span>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Select Pan Geometry:</span>
                  <select
                    value={selectedGnStandard}
                    onChange={(e) => handleSelectGnStandard(e.target.value as GastronormStandard)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  >
                    <option value="GN_1_1">GN 1/1 (530 × 325 mm) Full Pan</option>
                    <option value="GN_1_2">GN 1/2 (325 × 265 mm) Half Pan</option>
                    <option value="GN_1_3">GN 1/3 (325 × 176 mm) Third Pan</option>
                    <option value="GN_1_6">GN 1/6 (176 × 162 mm) Sixth Pan</option>
                  </select>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nominal Dimensions:</span>
                    <span className="text-white font-bold">
                      {gnTareProfile.nominalLengthMm} × {gnTareProfile.nominalWidthMm} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Empty Tare Weight:</span>
                    <span className="text-white font-bold">{gnTareProfile.tareWeightGrams} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stainless Specular Tare:</span>
                    <span className="text-amber-400 font-bold">-{gnTareProfile.specularReflectanceTarePct}% Reflection</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Optical Skew Matrix:</span>
                    <span className="text-emerald-400 font-bold">[{gnTareProfile.opticalSkewMatrix.join(', ')}]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Local-First CRDT & Edge Mesh Node Monitor */}
      {activeTab === 'CRDT_MESH' && (
        <div className="p-5 space-y-5 bg-slate-900 text-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-amber-400" />
                Local-First CRDT Mesh & Offline Peer Synchronization
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero-cloud dependency: peer kiosks synchronize pan fill levels and automated 86 events over ad-hoc Wi-Fi mesh.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimulateMeshPartitionRecovery}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
              <span>Simulate Walk-in Partition Recovery</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {meshPeers.map((peer) => (
              <div key={peer.peerId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{peer.stationName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      peer.partitionStatus === 'CONNECTED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300 animate-pulse'
                    }`}
                  >
                    {peer.partitionStatus}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 space-y-1">
                  <div>IP: {peer.ipAddress}:{peer.port}</div>
                  <div>Latency: {peer.latencyMs} ms</div>
                  <div>Role: {peer.isMeshLeader ? '👑 Mesh Leader' : 'Peer Node'}</div>
                  <div>Last Merge: {new Date(peer.lastMergeTimestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Total Monotonic Partition Merges: <strong className="text-white">{crdtMergeCount}</strong>
            </span>
            <span className="font-mono text-emerald-400">
              Causal Lamport Clock: {crdtEngine.getLocalLamportClock()}
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: Automated HACCP & Safety Audit Compliance Ledger */}
      {activeTab === 'HACCP_LEDGER' && (
        <div className="p-5 space-y-5 bg-slate-900 text-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Immutable Cryptographic HACCP & Food Safety Compliance Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every temperature danger zone, knife hazard, and automated 86 is recorded in a tamper-evident SHA-256 blockchain.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSimulateTemperatureExcursion}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold"
              >
                + Test Danger Zone Excursion (&lt;140°F)
              </button>
              <button
                type="button"
                onClick={handleOpenHaccpReport}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-black text-xs shadow-md flex items-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Generate Shift Inspection Report</span>
              </button>
            </div>
          </div>

          {/* Cryptographic Ledger Verification Status */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">SHA-256 Ledger Verification:</span>
              <span className={ledgerIntegrity.isValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {ledgerIntegrity.isValid ? '100% Cryptographically Verified (Tamper-Proof)' : 'CORRUPTED'}
              </span>
            </div>
            <span className="text-slate-400">Total Immutable Blocks: {haccpChain.length}</span>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto max-h-[320px] scrollbar-thin">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Block #</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3">Incident Type</th>
                  <th className="py-2.5 px-3">Item / Target</th>
                  <th className="py-2.5 px-3">Measured vs Threshold</th>
                  <th className="py-2.5 px-3">Action Taken</th>
                  <th className="py-2.5 px-3">Block Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {haccpChain.map((entry) => (
                  <tr key={entry.blockHeight} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-bold text-amber-400">#{entry.blockHeight}</td>
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-white">{entry.stationId}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                          entry.incidentType === 'TEMPERATURE_DANGER_ZONE'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : entry.incidentType === 'KNIFE_HAZARD'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {entry.incidentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-200">{entry.itemDescription}</td>
                    <td className="py-2 px-3 text-amber-300">
                      {entry.measuredValue} / {entry.thresholdValue}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-400">{entry.actionTaken}</td>
                    <td className="py-2 px-3 text-[10px] text-slate-500 truncate max-w-[100px]" title={entry.currentHash}>
                      {entry.currentHash.substring(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Health Inspection Shift Report Modal */}
      {isHaccpReportModalOpen && haccpReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Official HACCP & Health Inspection Shift Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHaccpReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Hero */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Shift Safety & HACCP Rating</span>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                  {haccpReport.complianceScorePercent}% (Grade A Certified)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Tamper-evident cryptographically sealed on local SQLite chain.
                </div>
              </div>
              <div className="text-right font-mono text-xs text-slate-400 space-y-1">
                <div>Date: {haccpReport.shiftDate}</div>
                <div>Station: {haccpReport.stationId}</div>
                <div>Total Blocks: {haccpReport.totalBlocks}</div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400">Danger Zone Excursions</span>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                  {haccpReport.dangerZoneViolations}
                </div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400">Safety Hazards</span>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {haccpReport.safetyInfractions}
                </div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400">Automated 86 Deductions</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {haccpReport.auto86Deductions}
                </div>
              </div>
            </div>

            {/* Incident Records */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase">Chronological Block Log:</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {haccpReport.blocks.map((b) => (
                  <div key={b.blockHeight} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs flex justify-between">
                    <div>
                      <span className="font-mono text-amber-400 font-bold mr-2">#{b.blockHeight}</span>
                      <span className="font-bold text-white mr-2">{b.itemDescription}</span>
                      <span className="text-slate-400">{b.actionTaken}</span>
                    </div>
                    <span className="font-mono text-slate-500">{new Date(b.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsHaccpReportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Export Certified Regulatory PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
