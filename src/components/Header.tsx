import React from 'react';
import { useChef } from '../context/ChefContext';
import {
  Flame,
  LayoutDashboard,
  Sparkles,
  Image as ImageIcon,
  Wifi,
  RefreshCw,
  Maximize2,
  Lock,
  ChevronRight,
  ShieldCheck,
  Settings,
  AlertTriangle,
  Camera,
  ScanBarcode,
  CreditCard,
} from 'lucide-react';
import { EstablishmentSettingsModal } from './settings/EstablishmentSettingsModal';
import { ARCHETYPE_METADATA } from '../utils/terminologyMapper';
import { VoiceSettingsToolbar } from './voice/VoiceSettingsToolbar';

export const Header: React.FC = () => {
  const {
    activeProfile,
    requestProfileSwitch,
    copilotOpen,
    setCopilotOpen,
    selectedModel,
    setImageModalOpen,
    syncEventsCount,
    syncStatus,
    syncNow,
    setIsSyncHudOpen,
    isKioskMode,
    toggleKioskMode,
    establishmentProfile,
    terminology,
    setIsSettingsModalOpen,
    eightySixList,
    setIsVisionScanModalOpen,
    scannerDevice,
    setIsBarcodeModalOpen,
    setIsPosGatewayModalOpen,
    posProvider,
  } = useChef();

  const isBOH = activeProfile === 'BOH_KITCHEN';

  return (
    <header
      className={`border-b transition-colors duration-200 select-none w-full shrink-0 ${
        isBOH
          ? 'bg-slate-950/95 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800 shadow-xs'
      }`}
    >
      {/* Surface Header Container: Fixed 64dp (h-16), fillMaxWidth (w-full), Arrangement.SpaceBetween (justify-between), 16dp padding (px-4) */}
      <div className="w-full px-4 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand & Terminal Identifier */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
              isBOH
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-indigo-900 text-white shadow-md'
            }`}
          >
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight font-display">
                ChefAgent
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                  isBOH
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                v2.4 Kiosk
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate max-w-[280px] sm:max-w-md">
              <span className="font-semibold text-slate-200 truncate">{establishmentProfile.name}</span>
              <span>·</span>
              <span className="font-mono text-[10px] text-amber-400/90 hidden sm:inline">
                {ARCHETYPE_METADATA[establishmentProfile.type]?.shortBadge || terminology.venueTypeLabel}
              </span>
              <span className="hidden md:inline">·</span>
              <span className="font-mono text-[10px] hidden md:inline">Station 04</span>
            </div>
          </div>
        </div>

        {/* Profile Switcher (BOH vs FOH) */}
        <div className="flex items-center">
          <div
            className={`p-1 rounded-xl flex items-center border transition-all ${
              isBOH
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => requestProfileSwitch('BOH_KITCHEN')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isBOH
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>BOH Line Mode</span>
              {isBOH && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => requestProfileSwitch('FOH_MANAGEMENT')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isBOH
                  ? 'bg-indigo-900 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isBOH ? <Lock className="w-3.5 h-3.5 text-amber-400/80" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>FOH Management</span>
              {!isBOH && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Action Controls & AI Triggers */}
        <div className="flex items-center gap-2">
          {/* Live 86 Indicator */}
          {eightySixList.length > 0 && (
            <div
              title={`Active 86 items: ${eightySixList.join(', ')}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                isBOH
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>86: {eightySixList.length}</span>
            </div>
          )}

          {/* P2P Offline WAL Sync Badge */}
          <button
            onClick={() => setIsSyncHudOpen(true)}
            title="Click to open Local-First SQLite WAL & P2P Mesh Sync Engine HUD"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              isBOH
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'ONLINE'
                  ? 'bg-emerald-400'
                  : syncStatus === 'SYNCING'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline">P2P WAL</span>
            {syncEventsCount > 0 && (
              <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded font-bold">
                +{syncEventsCount}
              </span>
            )}
            <RefreshCw className={`w-3 h-3 text-slate-400 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
          </button>

          {/* Barcode Scanner Active Telemetry Badge */}
          <button
            onClick={() => setIsBarcodeModalOpen(true)}
            title={`Active Barcode Scanner: ${scannerDevice.name}. Click to open Scanner Terminal.`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              isBOH
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <ScanBarcode className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline truncate max-w-[140px]">{scannerDevice.name.split(' ')[0]}</span>
            {scannerDevice.batteryLevel !== undefined && (
              <span className="text-[10px] opacity-80">{scannerDevice.batteryLevel}%</span>
            )}
          </button>

          {/* Bi-Directional Legacy POS Gateway Badge */}
          <button
            onClick={() => setIsPosGatewayModalOpen(true)}
            title={`Active POS Gateway: ${posProvider}. Click to inspect KDS & ESC/POS printers.`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              isBOH
                ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">{posProvider}</span>
          </button>

          {/* Multimodal AI Vision Shelf-Counting Scanner */}
          <button
            onClick={() => setIsVisionScanModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isBOH
                ? 'bg-slate-900 hover:bg-slate-800 border-sky-500/40 text-sky-300 hover:border-sky-400 shadow-sm'
                : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900 shadow-xs'
            }`}
            title="Multimodal AI Vision Shelf-Counting Scanner"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline font-bold">Scan Shelf</span>
          </button>

          {/* Tri-Mode Voice Operations Engine */}
          <VoiceSettingsToolbar />

          {/* High-Res Plating & Marketing Image Studio (1K, 2K, 4K affordance) */}
          <button
            onClick={() => setImageModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isBOH
                ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/40 text-amber-300 hover:border-amber-400 shadow-sm'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900 shadow-xs'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline font-bold">Plating Studio</span>
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-black/20 text-amber-400 font-bold">
              1K·2K·4K
            </span>
          </button>

          {/* Slide-out Gemini Culinary Copilot */}
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isBOH
                ? 'bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 hover:brightness-110'
                : 'bg-indigo-900 text-white shadow-md hover:bg-indigo-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Copilot</span>
            <span className="text-[10px] font-mono opacity-80 hidden lg:inline">
              ({selectedModel === 'gemini-4-argon' ? 'Argon' : selectedModel === 'gemini-3.1-flash-lite' ? 'Lite' : 'Flash'})
            </span>
          </button>

          {/* Establishment Settings */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            title="Establishment Profile & Dynamic Terminology Settings"
            className={`p-2 rounded-xl text-xs border transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
              isBOH
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-indigo-900'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Kiosk Fullscreen */}
          <button
            onClick={toggleKioskMode}
            title="Toggle Android Kiosk Mode"
            className={`p-2 rounded-xl text-xs border transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
              isBOH
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Establishment Profile & Terminology Modal */}
      <EstablishmentSettingsModal />
    </header>
  );
};
