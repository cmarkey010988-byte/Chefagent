import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ProfileMode,
  Recipe,
  PrepItem,
  InventoryItem,
  BanquetEvent,
  ChatMessage,
  CopilotRole,
  GeneratedImageItem,
  ImageResolution,
  ImageStyle,
  AspectRatio,
  OnHandMenuProposal,
  KitchenEvent,
  EstablishmentType,
  EstablishmentProfile,
  StorageLocationConfig,
  TerminologyDictionary,
  TableStatus,
  TableServiceStatus,
  SanitationLog,
  PurchaseOrder,
  POStatus,
  WasteLog,
  WasteReason,
  ShiftRosterItem,
  PreShiftHandoff,
  ReconciliationDiffItem,
  ExecutiveToastState,
  ExpirationMenuProposal,
  RestockWorkflowResult,
  ExpirationWorkflowResult,
  VoiceParseResult,
  VoiceUndoAction,
  ScannerDeviceInfo,
  BarcodeSymbology,
  BarcodeResolutionResult,
  EDITransmissionStatus,
  EDIAuditLogEntry,
  POSOrderPayload,
  ThermalSlipTicket,
  POSProvider,
} from '../types';
import {
  INITIAL_RECIPES,
  INITIAL_PREP_ITEMS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_BANQUETS,
  SAMPLE_GENERATED_GALLERY,
  SAMPLE_ONHAND_PROPOSALS,
  INITIAL_KITCHEN_EVENTS,
  INITIAL_FLOOR_TABLES,
  INITIAL_SANITATION_LOGS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_WASTE_LOGS,
  INITIAL_SHIFT_ROSTER,
  INITIAL_PRE_SHIFT_HANDOFF,
} from '../data/seedData';
import { GoogleCalendarSyncService } from '../services/GoogleCalendarSyncService';
import {
  getTerminology,
  getDefaultProfileForType,
  getDefaultLocationsForType,
} from '../utils/terminologyMapper';
import {
  buildRestockingOrders,
  buildExpirationMenuProposal,
} from '../services/ExecutiveWorkflowEngine';
import { BarcodeScannerEngine } from '../services/barcode/BarcodeScannerEngine';
import { EDIIntegrationService, TransmissionResult } from '../services/edi/EDIIntegrationService';
import { EDIDocumentBuilder } from '../services/edi/EDIDocumentBuilder';
import { LegacyPOSGatewayAdapter } from '../services/pos/LegacyPOSGatewayAdapter';
import { EscPosPrinterDriver } from '../services/printer/EscPosPrinterDriver';

interface ChefContextType {
  activeProfile: ProfileMode;
  isPinModalOpen: boolean;
  setIsPinModalOpen: (open: boolean) => void;
  requestProfileSwitch: (mode: ProfileMode) => void;
  confirmPinAndSwitch: (pin: string) => boolean;
  forceSwitchProfile: (mode: ProfileMode) => void;

  // Executive AI Workflows
  executiveToast: ExecutiveToastState | null;
  dismissExecutiveToast: () => void;
  activeDraftPOForReview: PurchaseOrder | null;
  setActiveDraftPOForReview: (po: PurchaseOrder | null) => void;
  activeExpirationMenuProposal: ExpirationMenuProposal[] | null;
  setActiveExpirationMenuProposal: (proposals: ExpirationMenuProposal[] | null) => void;
  isPurchaseOrderModalOpen: boolean;
  setIsPurchaseOrderModalOpen: (open: boolean) => void;
  triggerRestockWorkflow: () => Promise<RestockWorkflowResult>;
  triggerExpirationMenuWorkflow: () => Promise<ExpirationWorkflowResult>;

  // AI Vision Shelf-Counting Pipeline
  isVisionScanModalOpen: boolean;
  setIsVisionScanModalOpen: (open: boolean) => void;
  activeVisionScanDiff: ReconciliationDiffItem[] | null;
  setActiveVisionScanDiff: (diff: ReconciliationDiffItem[] | null) => void;
  applyVisionAuditDiff: (diffs: ReconciliationDiffItem[]) => void;

  // Tri-Mode Voice Dispatcher
  handleVoiceCommand: (result: VoiceParseResult, registerUndo?: (action: VoiceUndoAction) => void) => void;

  // Prep items
  prepItems: PrepItem[];
  togglePrepItem: (id: string) => void;
  addPrepItem: (item: Omit<PrepItem, 'id' | 'shiftedDateTimestamp'>) => void;
  deletePrepItem: (id: string) => void;
  resetPrepItems: () => void;

  // Recipes
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;

  // Inventory
  inventoryItems: InventoryItem[];
  auditInventoryItem: (id: string, newQty: number, auditor?: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastAuditTimestamp' | 'auditedByProfile'>) => InventoryItem;
  updateInventoryItem: (item: InventoryItem) => void;
  archiveInventoryItem: (id: string) => void;
  restoreInventoryItem: (id: string) => void;

  // Banquets
  banquets: BanquetEvent[];
  updateBanquetStatus: (id: string, status: BanquetEvent['status']) => void;

  // Native Kitchen Events & Banquet Schedules
  events: KitchenEvent[];
  createEvent: (event: Omit<KitchenEvent, 'id' | 'createdTimestamp' | 'updatedTimestamp'>) => KitchenEvent;
  updateEvent: (event: KitchenEvent) => void;
  deleteEvent: (id: string) => void;
  updateGuestCount: (eventId: string, expected: number, guaranteed: number) => void;
  pushBanquetMenuToPrep: (eventId: string) => { success: boolean; createdCount: number };
  syncEventWithGoogle: (eventId: string, authToken?: string) => Promise<{ success: boolean; message: string }>;

  // Culinary Copilot
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  copilotRole: CopilotRole;
  setCopilotRole: (role: CopilotRole) => void;
  selectedModel: 'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-4-argon';
  setSelectedModel: (model: 'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-4-argon') => void;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  sendChatMessage: (content: string) => Promise<void>;
  clearChat: () => void;

  // Low latency line triage
  quickAssist: (query: string, station?: string) => Promise<{ answer: string; latencyMs: number }>;
  isQuickAssistLoading: boolean;

  // Image Generation
  imageModalOpen: boolean;
  setImageModalOpen: (open: boolean) => void;
  generatedImages: GeneratedImageItem[];
  isGeneratingImage: boolean;
  generatePlatingImage: (params: {
    prompt: string;
    imageSize: ImageResolution;
    aspectRatio: AspectRatio;
    style: ImageStyle;
  }) => Promise<GeneratedImageItem | null>;

  // Smart On-Hand Menu Generator ("Par-to-Plate AI Engine")
  onHandMenuProposals: OnHandMenuProposal[];
  isGeneratingOnHandMenu: boolean;
  generateOnHandMenu: () => Promise<void>;
  acceptAndPushToPrep: (proposal: OnHandMenuProposal) => { success: boolean; recipeId: string; prepCount: number };

  // P2P Sync status
  syncEventsCount: number;
  syncStatus: 'ONLINE' | 'SYNCING' | 'LOCAL';
  syncNow: () => Promise<void>;
  isSyncHudOpen: boolean;
  setIsSyncHudOpen: (open: boolean) => void;

  // Kiosk mode
  isKioskMode: boolean;
  toggleKioskMode: () => void;

  // Establishment Profile & Settings
  establishmentProfile: EstablishmentProfile;
  terminology: TerminologyDictionary;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  setEstablishmentType: (type: EstablishmentType, reloadDefaultLocations?: boolean) => void;
  updateEstablishmentProfile: (updates: Partial<EstablishmentProfile>) => void;
  addStorageLocation: (name: string, isNonFoodZone: boolean) => void;
  updateStorageLocation: (id: string, updates: Partial<StorageLocationConfig>) => void;
  deleteStorageLocation: (id: string) => void;
  resetStorageLocationsToDefault: () => void;

  // Restaurant Operating System (BOH & FOH)
  floorTables: TableStatus[];
  updateTableStatus: (tableId: string, status: TableServiceStatus) => void;
  seatTable: (tableId: string, covers: number, serverName?: string, notes?: string) => void;
  resetTable: (tableId: string) => void;

  sanitationLogs: SanitationLog[];
  logSanitationRecord: (record: Omit<SanitationLog, 'id' | 'timestamp'>) => void;

  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => PurchaseOrder;
  updatePOStatus: (poId: string, status: POStatus) => void;
  receiveInvoicePO: (
    poId: string,
    invoiceNumber: string,
    itemsReceived: Array<{ inventoryItemId: string; receivedQty: number; actualCost: number }>
  ) => void;

  wasteLogs: WasteLog[];
  logFoodWaste: (
    ingredientId: string,
    quantity: number,
    reason: WasteReason,
    loggedBy: string,
    notes?: string
  ) => void;

  shiftRoster: ShiftRosterItem[];
  toggleClockIn: (employeeId: string) => void;
  updateShiftRoster: (roster: ShiftRosterItem[]) => void;

  preShiftHandoff: PreShiftHandoff;
  updatePreShiftHandoff: (updates: Partial<PreShiftHandoff>) => void;

  eightySixList: string[];

  // Section 1: Automated B2B EDI & Webhook Engine
  transmitPOViaEDI: (poId: string, format?: 'ANSI_X12_850' | 'REST_FALLBACK') => Promise<TransmissionResult>;
  ediAuditLogs: EDIAuditLogEntry[];
  refreshEdiAuditLogs: () => void;
  simulate855Acknowledgment: (poId: string, ackType?: 'ACCEPTED' | 'REJECTED') => void;
  simulate856ASN: (poId: string) => void;
  isEdiInspectorOpen: boolean;
  setIsEdiInspectorOpen: (open: boolean) => void;
  activePOForEdiInspect: PurchaseOrder | null;
  setActivePOForEdiInspect: (po: PurchaseOrder | null) => void;

  // Section 2: Multi-Device Bluetooth Barcode Engine
  scannerDevice: ScannerDeviceInfo;
  isBarcodeModalOpen: boolean;
  setIsBarcodeModalOpen: (open: boolean) => void;
  lastScannedBarcodeResult: BarcodeResolutionResult | null;
  scanBarcode: (rawCode: string) => BarcodeResolutionResult;
  connectBluetoothScanner: () => Promise<void>;
  unmappedBarcodeForAssociation: { barcode: string; symbology: BarcodeSymbology } | null;
  setUnmappedBarcodeForAssociation: (data: { barcode: string; symbology: BarcodeSymbology } | null) => void;
  associateBarcodeWithItem: (barcode: string, itemId: string) => void;
  createNewItemWithBarcode: (barcode: string, itemData: any) => void;

  // Section 3: Bi-Directional POS Gateway & Thermal Printer Driver
  isPosGatewayModalOpen: boolean;
  setIsPosGatewayModalOpen: (open: boolean) => void;
  ingestPOSOrderCheck: (order: POSOrderPayload) => void;
  printThermalSlip: (order: POSOrderPayload, station?: string) => ThermalSlipTicket;
  posProvider: POSProvider;
  setPosProvider: (p: POSProvider) => void;
  recentThermalSlips: ThermalSlipTicket[];
  isThermalPreviewModalOpen: boolean;
  setIsThermalPreviewModalOpen: (open: boolean) => void;
  activeThermalSlipForPreview: ThermalSlipTicket | null;
  setActiveThermalSlipForPreview: (slip: ThermalSlipTicket | null) => void;
}

const ChefContext = createContext<ChefContextType | undefined>(undefined);

export const ChefProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Profiles
  const [activeProfile, setActiveProfile] = useState<ProfileMode>(() => {
    const saved = localStorage.getItem('chefagent_profile');
    return (saved as ProfileMode) || 'BOH_KITCHEN';
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingTargetProfile, setPendingTargetProfile] = useState<ProfileMode | null>(null);

  // Core Data
  const [prepItems, setPrepItems] = useState<PrepItem[]>(() => {
    const saved = localStorage.getItem('chefagent_prep_items');
    return saved ? JSON.parse(saved) : INITIAL_PREP_ITEMS;
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('chefagent_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('chefagent_inventory');
    if (!saved) return INITIAL_INVENTORY_ITEMS;
    try {
      const parsed: InventoryItem[] = JSON.parse(saved);
      const updatedExisting = parsed.map((item) => ({
        ...item,
        itemType: item.itemType || 'FOOD_INGREDIENT',
      }));
      const existingIds = new Set(updatedExisting.map((i) => i.id));
      const missingInitial = INITIAL_INVENTORY_ITEMS.filter((i) => !existingIds.has(i.id));
      return [...updatedExisting, ...missingInitial];
    } catch {
      return INITIAL_INVENTORY_ITEMS;
    }
  });

  const [banquets, setBanquets] = useState<BanquetEvent[]>(() => {
    const saved = localStorage.getItem('chefagent_banquets');
    return saved ? JSON.parse(saved) : INITIAL_BANQUETS;
  });

  const [events, setEvents] = useState<KitchenEvent[]>(() => {
    const saved = localStorage.getItem('chefagent_events');
    return saved ? JSON.parse(saved) : INITIAL_KITCHEN_EVENTS;
  });

  // Copilot State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotRole, setCopilotRole] = useState<CopilotRole>('SOUS_CHEF');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-init',
        role: 'model',
        content: `Good day, Chef Bruce & Management Team. ChefAgent Copilot is online.
• BOH Line: Ask about batch scaling, meat temperatures, emulsion stability, or station timing.
• FOH Operations: Inquire about Food Cost % benchmarks (target 28%), trim yield loss math, and banquet cover planning.
Select your preferred Gemini model above (Lite for sub-second line answers, Flash for general culinary tasks, or Argon for deep financial/banquet calculations).`,
        modelUsed: 'gemini-3.8-flash',
        timestamp: Date.now(),
      },
    ];
  });
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isQuickAssistLoading, setIsQuickAssistLoading] = useState(false);

  // Image Generation State
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>(() => {
    const saved = localStorage.getItem('chefagent_gallery');
    return saved ? JSON.parse(saved) : SAMPLE_GENERATED_GALLERY;
  });

  // On-Hand Menu Generator ("Par-to-Plate AI Engine")
  const [onHandMenuProposals, setOnHandMenuProposals] = useState<OnHandMenuProposal[]>(() => {
    const saved = localStorage.getItem('chefagent_onhand_proposals');
    return saved ? JSON.parse(saved) : SAMPLE_ONHAND_PROPOSALS;
  });
  const [isGeneratingOnHandMenu, setIsGeneratingOnHandMenu] = useState(false);

  // Sync state
  const [syncEventsCount, setSyncEventsCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'ONLINE' | 'SYNCING' | 'LOCAL'>('ONLINE');
  const [isSyncHudOpen, setIsSyncHudOpen] = useState(false);

  // Kiosk
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Establishment Profile & Settings
  const [establishmentProfile, setEstablishmentProfile] = useState<EstablishmentProfile>(() => {
    const saved = localStorage.getItem('chefagent_establishment_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.type && Array.isArray(parsed.primaryLocations)) {
          return parsed;
        }
      } catch {
        // Fall back to default
      }
    }
    return getDefaultProfileForType('BANQUET_COUNTRY_CLUB');
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Derived dynamic terminology dictionary
  const terminology = getTerminology(establishmentProfile.type);

  // Local storage persistence
  useEffect(() => {
    localStorage.setItem('chefagent_profile', activeProfile);
  }, [activeProfile]);

  useEffect(() => {
    localStorage.setItem('chefagent_establishment_profile', JSON.stringify(establishmentProfile));
  }, [establishmentProfile]);

  useEffect(() => {
    localStorage.setItem('chefagent_prep_items', JSON.stringify(prepItems));
  }, [prepItems]);

  useEffect(() => {
    localStorage.setItem('chefagent_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('chefagent_inventory', JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    localStorage.setItem('chefagent_banquets', JSON.stringify(banquets));
  }, [banquets]);

  useEffect(() => {
    localStorage.setItem('chefagent_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('chefagent_gallery', JSON.stringify(generatedImages));
  }, [generatedImages]);

  useEffect(() => {
    localStorage.setItem('chefagent_onhand_proposals', JSON.stringify(onHandMenuProposals));
  }, [onHandMenuProposals]);

  // Restaurant Operating System State (BOH & FOH)
  const [floorTables, setFloorTables] = useState<TableStatus[]>(() => {
    const saved = localStorage.getItem('chefagent_floor_tables');
    return saved ? JSON.parse(saved) : INITIAL_FLOOR_TABLES;
  });

  const [sanitationLogs, setSanitationLogs] = useState<SanitationLog[]>(() => {
    const saved = localStorage.getItem('chefagent_sanitation_logs');
    return saved ? JSON.parse(saved) : INITIAL_SANITATION_LOGS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('chefagent_purchase_orders');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
  });

  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() => {
    const saved = localStorage.getItem('chefagent_waste_logs');
    return saved ? JSON.parse(saved) : INITIAL_WASTE_LOGS;
  });

  const [shiftRoster, setShiftRoster] = useState<ShiftRosterItem[]>(() => {
    const saved = localStorage.getItem('chefagent_shift_roster');
    return saved ? JSON.parse(saved) : INITIAL_SHIFT_ROSTER;
  });

  const [preShiftHandoff, setPreShiftHandoff] = useState<PreShiftHandoff>(() => {
    const saved = localStorage.getItem('chefagent_preshift_handoff');
    return saved ? JSON.parse(saved) : INITIAL_PRE_SHIFT_HANDOFF;
  });

  // Reactive 86-list computed dynamically from low stock / depleted items
  const eightySixList = inventoryItems
    .filter(
      (item) =>
        item.itemType === 'FOOD_INGREDIENT' &&
        !item.isArchived &&
        (item.currentOnHandQuantity <= item.reorderPointQuantity || item.currentOnHandQuantity <= 0)
    )
    .map((item) => `${item.ingredientName} (${item.currentOnHandQuantity} ${item.unitOfMeasure} left)`);

  useEffect(() => {
    localStorage.setItem('chefagent_floor_tables', JSON.stringify(floorTables));
  }, [floorTables]);

  useEffect(() => {
    localStorage.setItem('chefagent_sanitation_logs', JSON.stringify(sanitationLogs));
  }, [sanitationLogs]);

  useEffect(() => {
    localStorage.setItem('chefagent_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('chefagent_waste_logs', JSON.stringify(wasteLogs));
  }, [wasteLogs]);

  useEffect(() => {
    localStorage.setItem('chefagent_shift_roster', JSON.stringify(shiftRoster));
  }, [shiftRoster]);

  useEffect(() => {
    localStorage.setItem('chefagent_preshift_handoff', JSON.stringify(preShiftHandoff));
  }, [preShiftHandoff]);

  // Executive AI Workflow States
  const [executiveToast, setExecutiveToast] = useState<ExecutiveToastState | null>(null);
  const [activeDraftPOForReview, setActiveDraftPOForReview] = useState<PurchaseOrder | null>(null);
  const [activeExpirationMenuProposal, setActiveExpirationMenuProposal] = useState<ExpirationMenuProposal[] | null>(null);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);

  // AI Vision Shelf-Counting Pipeline States
  const [isVisionScanModalOpen, setIsVisionScanModalOpen] = useState(false);
  const [activeVisionScanDiff, setActiveVisionScanDiff] = useState<ReconciliationDiffItem[] | null>(null);

  // SECTION 1: Automated B2B EDI & Outbox Pipeline States
  const [ediAuditLogs, setEdiAuditLogs] = useState<EDIAuditLogEntry[]>(() => {
    return EDIIntegrationService.getAuditLogs();
  });
  const [isEdiInspectorOpen, setIsEdiInspectorOpen] = useState(false);
  const [activePOForEdiInspect, setActivePOForEdiInspect] = useState<PurchaseOrder | null>(null);

  // SECTION 2: Multi-Device Bluetooth Barcode Engine States
  const [scannerDevice, setScannerDevice] = useState<ScannerDeviceInfo>(() =>
    BarcodeScannerEngine.getActiveDevice()
  );
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [lastScannedBarcodeResult, setLastScannedBarcodeResult] = useState<BarcodeResolutionResult | null>(null);
  const [unmappedBarcodeForAssociation, setUnmappedBarcodeForAssociation] = useState<{
    barcode: string;
    symbology: BarcodeSymbology;
  } | null>(null);

  // SECTION 3: Bi-Directional POS Gateway & ESC/POS Thermal Printing States
  const [isPosGatewayModalOpen, setIsPosGatewayModalOpen] = useState(false);
  const [posProvider, setPosProviderState] = useState<POSProvider>('TOAST');
  const [recentThermalSlips, setRecentThermalSlips] = useState<ThermalSlipTicket[]>(() => {
    const saved = localStorage.getItem('chefagent_slips');
    return saved ? JSON.parse(saved) : [];
  });
  const [isThermalPreviewModalOpen, setIsThermalPreviewModalOpen] = useState(false);
  const [activeThermalSlipForPreview, setActiveThermalSlipForPreview] = useState<ThermalSlipTicket | null>(null);

  useEffect(() => {
    localStorage.setItem('chefagent_slips', JSON.stringify(recentThermalSlips));
  }, [recentThermalSlips]);

  // Global Hardware Barcode Wedge & BLE listener registration
  useEffect(() => {
    const cleanup = BarcodeScannerEngine.initialize({
      onScanResolved: (result) => {
        setLastScannedBarcodeResult(result);
        if (result.isMapped && result.matchedItem) {
          // Atomic counter mutation
          auditInventoryItem(result.matchedItem.id, result.newQuantity, 'BARCODE_SCANNER');
        }
      },
      onUnmappedDetected: (barcode, symbology) => {
        setUnmappedBarcodeForAssociation({ barcode, symbology });
        setIsBarcodeModalOpen(true);
      },
      onDeviceStatusChanged: (device) => {
        setScannerDevice(device);
      },
    });

    return () => {
      cleanup();
    };
  }, [inventoryItems]);

  const dismissExecutiveToast = () => setExecutiveToast(null);

  /**
   * Commits verified counts from AI Vision Scanner diff modal
   */
  const applyVisionAuditDiff = (diffs: ReconciliationDiffItem[]) => {
    const acceptedDiffs = diffs.filter((d) => d.isAccepted);
    const auditorName = activeProfile === 'BOH_KITCHEN' ? 'Chef Bruce (Vision Scan)' : 'GM Ashley (Vision Scan)';

    setInventoryItems((prev) => {
      const updated = [...prev];
      acceptedDiffs.forEach((diff) => {
        const idx = updated.findIndex((i) => i.id === diff.itemId);
        const finalCount = diff.editedCount !== undefined ? diff.editedCount : diff.detectedCount;
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            currentOnHandQuantity: Math.max(0, finalCount),
            lastAuditTimestamp: Date.now(),
            auditedByProfile: auditorName,
          };
        }
      });
      return updated;
    });

    setActiveVisionScanDiff(null);
    setIsVisionScanModalOpen(false);

    setExecutiveToast({
      id: `toast-${Date.now()}`,
      title: 'Vision Shelf Counts Committed',
      subtitle: `Successfully synchronized ${acceptedDiffs.length} inventory line${acceptedDiffs.length > 1 ? 's' : ''} to local storage.`,
      stage: 'COMPLETED',
      autoDismissMs: 4000,
    });
  };

  /**
   * Voice Macro: "Put together a restocking order"
   */
  const triggerRestockWorkflow = async (): Promise<RestockWorkflowResult> => {
    setExecutiveToast({
      id: `toast-restock-${Date.now()}`,
      title: 'Analyzing Inventory Stock & Par Levels...',
      subtitle: 'Scanning all supplier lines to calculate replenishment deficits...',
      stage: 'ANALYZING',
    });

    // Short UX breathing space
    await new Promise((resolve) => setTimeout(resolve, 600));

    const result = buildRestockingOrders(inventoryItems);

    if (result.vendorGroups.length > 0) {
      // Add new draft POs to purchase orders state
      const newDraftPOs = result.vendorGroups.map((g) => g.draftPurchaseOrder);
      setPurchaseOrders((prev) => {
        // Keep non-draft or previous POs and append new ones
        const nonDrafts = prev.filter((p) => p.status !== 'DRAFT');
        return [...newDraftPOs, ...nonDrafts];
      });

      // Set primary PO for review and open modal
      setActiveDraftPOForReview(result.vendorGroups[0].draftPurchaseOrder);
      setIsPurchaseOrderModalOpen(true);

      setExecutiveToast({
        id: `toast-restock-done-${Date.now()}`,
        title: `Draft Restocking Orders Ready`,
        subtitle: result.summaryMessage,
        stage: 'COMPLETED',
        actionLabel: 'Review Primary PO',
        onAction: () => {
          setActiveDraftPOForReview(result.vendorGroups[0].draftPurchaseOrder);
          setIsPurchaseOrderModalOpen(true);
        },
      });
    } else {
      setExecutiveToast({
        id: `toast-restock-none-${Date.now()}`,
        title: 'Inventory Healthy',
        subtitle: 'All items are currently above reorder thresholds. No purchase orders required.',
        stage: 'COMPLETED',
        autoDismissMs: 4000,
      });
    }

    return result;
  };

  /**
   * Voice Macro: "Generate a menu based on items about to expire"
   */
  const triggerExpirationMenuWorkflow = async (): Promise<ExpirationWorkflowResult> => {
    setExecutiveToast({
      id: `toast-exp-${Date.now()}`,
      title: 'Scanning Shelf-Life & Near-Expiry Items...',
      subtitle: 'Filtering ingredients <= 72h expiration to draft 28% food cost specials...',
      stage: 'ANALYZING',
    });

    const result = await buildExpirationMenuProposal(inventoryItems);

    if (result.proposals.length > 0) {
      setActiveExpirationMenuProposal(result.proposals);
      setExecutiveToast({
        id: `toast-exp-done-${Date.now()}`,
        title: `AI Daily Specials Drafted`,
        subtitle: result.summaryMessage,
        stage: 'COMPLETED',
        actionLabel: 'View Specials',
        onAction: () => setActiveExpirationMenuProposal(result.proposals),
      });
    } else {
      setExecutiveToast({
        id: `toast-exp-none-${Date.now()}`,
        title: 'No Expiring Ingredients',
        subtitle: 'No items are nearing expiration within 72 hours.',
        stage: 'COMPLETED',
        autoDismissMs: 4000,
      });
    }

    return result;
  };

  /**
   * Universal Voice Command Dispatcher with 5-second Undo stack
   */
  const handleVoiceCommand = (
    result: VoiceParseResult,
    registerUndo?: (action: VoiceUndoAction) => void
  ) => {
    switch (result.intent) {
      case 'GENERATE_RESTOCK_ORDER':
        triggerRestockWorkflow();
        break;

      case 'GENERATE_EXPIRATION_MENU':
        triggerExpirationMenuWorkflow();
        break;

      case 'SEAT_TABLE':
        if (result.tableId) {
          const prevTable = floorTables.find((t) => t.tableId === result.tableId);
          seatTable(result.tableId, result.covers || 2, result.serverName);

          if (registerUndo && prevTable) {
            registerUndo({
              id: `undo-${Date.now()}`,
              timestamp: Date.now(),
              description: `Undo seating Table ${result.tableNumber}`,
              expiresAt: Date.now() + 5000,
              revert: () => {
                setFloorTables((prev) =>
                  prev.map((t) => (t.tableId === prevTable.tableId ? prevTable : t))
                );
              },
            });
          }
        }
        break;

      case 'UPDATE_TABLE_STATUS':
        if (result.tableId && result.tableStatus) {
          const prevTable = floorTables.find((t) => t.tableId === result.tableId);
          updateTableStatus(result.tableId, result.tableStatus);

          if (registerUndo && prevTable) {
            registerUndo({
              id: `undo-${Date.now()}`,
              timestamp: Date.now(),
              description: `Undo status change on Table ${result.tableNumber}`,
              expiresAt: Date.now() + 5000,
              revert: () => {
                setFloorTables((prev) =>
                  prev.map((t) => (t.tableId === prevTable.tableId ? prevTable : t))
                );
              },
            });
          }
        }
        break;

      case 'SET_COUNT':
        if (result.targetItemId && result.quantity !== undefined) {
          const prevItem = inventoryItems.find((i) => i.id === result.targetItemId);
          auditInventoryItem(result.targetItemId, result.quantity);

          if (registerUndo && prevItem) {
            registerUndo({
              id: `undo-${Date.now()}`,
              timestamp: Date.now(),
              description: `Undo count for ${prevItem.ingredientName}`,
              expiresAt: Date.now() + 5000,
              revert: () => {
                auditInventoryItem(prevItem.id, prevItem.currentOnHandQuantity);
              },
            });
          }
        }
        break;

      case 'INCREMENT':
        if (result.targetItemId && result.quantity !== undefined) {
          const target = inventoryItems.find((i) => i.id === result.targetItemId);
          if (target) {
            const prevQty = target.currentOnHandQuantity;
            const newQty = Math.round((prevQty + result.quantity) * 10) / 10;
            auditInventoryItem(target.id, newQty);

            if (registerUndo) {
              registerUndo({
                id: `undo-${Date.now()}`,
                timestamp: Date.now(),
                description: `Undo add to ${target.ingredientName}`,
                expiresAt: Date.now() + 5000,
                revert: () => auditInventoryItem(target.id, prevQty),
              });
            }
          }
        }
        break;

      case 'DECREMENT':
        if (result.targetItemId && result.quantity !== undefined) {
          const target = inventoryItems.find((i) => i.id === result.targetItemId);
          if (target) {
            const prevQty = target.currentOnHandQuantity;
            const newQty = Math.max(0, Math.round((prevQty - result.quantity) * 10) / 10);
            auditInventoryItem(target.id, newQty);

            if (registerUndo) {
              registerUndo({
                id: `undo-${Date.now()}`,
                timestamp: Date.now(),
                description: `Undo subtraction from ${target.ingredientName}`,
                expiresAt: Date.now() + 5000,
                revert: () => auditInventoryItem(target.id, prevQty),
              });
            }
          }
        }
        break;

      case 'MARK_86':
        if (result.targetItemId) {
          const target = inventoryItems.find((i) => i.id === result.targetItemId);
          if (target) {
            const prevQty = target.currentOnHandQuantity;
            auditInventoryItem(target.id, 0);

            if (registerUndo) {
              registerUndo({
                id: `undo-${Date.now()}`,
                timestamp: Date.now(),
                description: `Undo 86 on ${target.ingredientName}`,
                expiresAt: Date.now() + 5000,
                revert: () => auditInventoryItem(target.id, prevQty),
              });
            }
          }
        }
        break;

      default:
        break;
    }
  };

  const setEstablishmentType = (type: EstablishmentType, reloadDefaultLocations: boolean = true) => {
    setEstablishmentProfile((prev) => {
      const defaultProf = getDefaultProfileForType(type);
      return {
        ...prev,
        type,
        name: prev.name === getDefaultProfileForType(prev.type).name ? defaultProf.name : prev.name,
        primaryLocations: reloadDefaultLocations ? defaultProf.primaryLocations : prev.primaryLocations,
      };
    });
  };

  const updateEstablishmentProfile = (updates: Partial<EstablishmentProfile>) => {
    setEstablishmentProfile((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const addStorageLocation = (name: string, isNonFoodZone: boolean) => {
    setEstablishmentProfile((prev) => {
      const trimmed = name.trim();
      if (!trimmed) return prev;
      if (prev.primaryLocations.some((loc) => loc.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const newLoc: StorageLocationConfig = {
        id: `loc-custom-${Date.now()}`,
        name: trimmed,
        isNonFoodZone,
        displayOrder: prev.primaryLocations.length + 1,
      };
      return {
        ...prev,
        primaryLocations: [...prev.primaryLocations, newLoc],
      };
    });
  };

  const updateStorageLocation = (id: string, updates: Partial<StorageLocationConfig>) => {
    setEstablishmentProfile((prev) => ({
      ...prev,
      primaryLocations: prev.primaryLocations.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc)),
    }));
  };

  const deleteStorageLocation = (id: string) => {
    setEstablishmentProfile((prev) => ({
      ...prev,
      primaryLocations: prev.primaryLocations.filter((loc) => loc.id !== id),
    }));
  };

  const resetStorageLocationsToDefault = () => {
    setEstablishmentProfile((prev) => ({
      ...prev,
      primaryLocations: getDefaultLocationsForType(prev.type),
    }));
  };

  // Profile Switching & PIN Verification
  const requestProfileSwitch = (mode: ProfileMode) => {
    if (mode === activeProfile) return;
    if (mode === 'FOH_MANAGEMENT') {
      setPendingTargetProfile('FOH_MANAGEMENT');
      setIsPinModalOpen(true);
    } else {
      setActiveProfile('BOH_KITCHEN');
    }
  };

  const confirmPinAndSwitch = (pin: string): boolean => {
    // Default master PIN "1234"
    if (pin === '1234') {
      if (pendingTargetProfile) {
        setActiveProfile(pendingTargetProfile);
      } else {
        setActiveProfile('FOH_MANAGEMENT');
      }
      setIsPinModalOpen(false);
      setPendingTargetProfile(null);
      return true;
    }
    return false;
  };

  const forceSwitchProfile = (mode: ProfileMode) => {
    setActiveProfile(mode);
    setIsPinModalOpen(false);
    setPendingTargetProfile(null);
  };

  // Prep Item Handlers
  const togglePrepItem = (id: string) => {
    setPrepItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.isCompleted;
          return {
            ...item,
            isCompleted: nextState,
            completedQuantity: nextState ? item.targetQuantity : 0,
          };
        }
        return item;
      })
    );
    setSyncEventsCount((c) => c + 1);
  };

  const addPrepItem = (item: Omit<PrepItem, 'id' | 'shiftedDateTimestamp'>) => {
    const newItem: PrepItem = {
      ...item,
      id: `prep-${Date.now()}`,
      shiftedDateTimestamp: Date.now(),
    };
    setPrepItems((prev) => [newItem, ...prev]);
    setSyncEventsCount((c) => c + 1);
  };

  const deletePrepItem = (id: string) => {
    setPrepItems((prev) => prev.filter((item) => item.id !== id));
    setSyncEventsCount((c) => c + 1);
  };

  const resetPrepItems = () => {
    setPrepItems(INITIAL_PREP_ITEMS);
    setSyncEventsCount((c) => c + 1);
  };

  // Recipe Handlers
  const addRecipe = (recipe: Recipe) => {
    setRecipes((prev) => [...prev, recipe]);
    setSyncEventsCount((c) => c + 1);
  };

  // Inventory Handlers
  const auditInventoryItem = (id: string, newQty: number, auditor = 'FOH_MANAGER') => {
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            currentOnHandQuantity: Math.max(0, newQty),
            lastAuditTimestamp: Date.now(),
            auditedByProfile: auditor,
          };
        }
        return item;
      })
    );
    setSyncEventsCount((c) => c + 1);
  };

  const addInventoryItem = (
    itemData: Omit<InventoryItem, 'id' | 'lastAuditTimestamp' | 'auditedByProfile'>
  ): InventoryItem => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
      lastAuditTimestamp: Date.now(),
      auditedByProfile: activeProfile === 'FOH_MANAGEMENT' ? 'FOH_MANAGER' : 'BOH_CHEF',
      isArchived: false,
    };
    setInventoryItems((prev) => [newItem, ...prev]);
    setSyncEventsCount((c) => c + 1);
    return newItem;
  };

  const updateInventoryItem = (updated: InventoryItem) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? {
              ...updated,
              lastAuditTimestamp: Date.now(),
              auditedByProfile: activeProfile === 'FOH_MANAGEMENT' ? 'FOH_MANAGER' : 'BOH_CHEF',
            }
          : item
      )
    );
    setSyncEventsCount((c) => c + 1);
  };

  const archiveInventoryItem = (id: string) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isArchived: true,
              archivedTimestamp: Date.now(),
            }
          : item
      )
    );
    setSyncEventsCount((c) => c + 1);
  };

  const restoreInventoryItem = (id: string) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isArchived: false,
              archivedTimestamp: undefined,
            }
          : item
      )
    );
    setSyncEventsCount((c) => c + 1);
  };

  // Banquet Handlers
  const updateBanquetStatus = (id: string, status: BanquetEvent['status']) => {
    setBanquets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
    setSyncEventsCount((c) => c + 1);
  };

  // Native Kitchen Events & Banquet Schedules Handlers
  const createEvent = (
    eventData: Omit<KitchenEvent, 'id' | 'createdTimestamp' | 'updatedTimestamp'>
  ): KitchenEvent => {
    const now = Date.now();
    const newEvent: KitchenEvent = {
      ...eventData,
      id: `evt-${now}-${Math.random().toString(36).substring(2, 6)}`,
      createdTimestamp: now,
      updatedTimestamp: now,
    };
    setEvents((prev) => [newEvent, ...prev]);
    setSyncEventsCount((c) => c + 1);

    if (newEvent.isSyncedToGoogle) {
      syncEventWithGoogle(newEvent.id);
    }
    return newEvent;
  };

  const updateEvent = (updated: KitchenEvent) => {
    const now = Date.now();
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...updated, updatedTimestamp: now } : e))
    );
    setSyncEventsCount((c) => c + 1);

    if (updated.isSyncedToGoogle) {
      syncEventWithGoogle(updated.id);
    }
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSyncEventsCount((c) => c + 1);
  };

  const updateGuestCount = (eventId: string, expected: number, guaranteed: number) => {
    const now = Date.now();
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              expectedGuestCount: expected,
              guaranteedHeadcount: guaranteed,
              updatedTimestamp: now,
            }
          : e
      )
    );
    setSyncEventsCount((c) => c + 1);
  };

  const pushBanquetMenuToPrep = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event || !event.menuPlan || event.menuPlan.length === 0) {
      return { success: false, createdCount: 0 };
    }

    const newPrepItems: PrepItem[] = event.menuPlan.map((item, idx) => {
      let station: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Pastry' =
        item.stationAssignment || 'Sauce/Sauté';
      if (!item.stationAssignment) {
        if (item.course === 'DESSERT') station = 'Pastry';
        else if (item.course === 'APPETIZER' || item.course === 'SALAD') station = 'Garde Manger';
        else if (
          item.course === 'ENTREE' &&
          (item.itemName.toLowerCase().includes('beef') ||
            item.itemName.toLowerCase().includes('tenderloin') ||
            item.itemName.toLowerCase().includes('carvery'))
        )
          station = 'Butchery';
        else station = 'Sauce/Sauté';
      }

      const suggestedCook =
        station === 'Butchery'
          ? 'Chef Bruce'
          : station === 'Sauce/Sauté'
          ? 'Cook Marco'
          : station === 'Garde Manger'
          ? 'Cook Leo'
          : 'Pastry Chef Elena';

      return {
        id: `prep-banquet-${event.id}-${idx}-${Date.now()}`,
        recipeId: item.recipeOrIngredientId || `banquet-${event.id}`,
        recipeName: `[${event.title}] ${item.itemName}`,
        targetQuantity: item.targetPortions,
        completedQuantity: 0,
        unitOfMeasure: 'Portions',
        stationAssignment: station,
        priorityLevel: 1 as const, // Banquet Critical Priority
        isCompleted: false,
        assignedCookName: suggestedCook,
        shiftedDateTimestamp: event.startTime,
      };
    });

    setPrepItems((prev) => [...newPrepItems, ...prev]);

    // Advance event status to IN_PREP
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, status: 'IN_PREP' as const, updatedTimestamp: Date.now() }
          : e
      )
    );

    setSyncEventsCount((c) => c + 1);
    return { success: true, createdCount: newPrepItems.length };
  };

  const syncEventWithGoogle = async (eventId: string, authToken?: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return { success: false, message: 'Event not found' };

    try {
      const result = await GoogleCalendarSyncService.syncEventToGoogle(event, authToken);
      if (result.success) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  isSyncedToGoogle: true,
                  googleCalendarEventId: result.googleEventId,
                  lastSyncedTimestamp: result.timestamp,
                  updatedTimestamp: result.timestamp,
                }
              : e
          )
        );
        setSyncEventsCount((c) => c + 1);
        return { success: true, message: result.message };
      }
      return { success: false, message: 'Sync failed' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Sync error' };
    }
  };

  // Chatbot Handlers
  const sendChatMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const newThread = [...chatMessages, userMsg];
    setChatMessages(newThread);
    setIsChatLoading(true);

    const startTime = Date.now();

    // Prepare system instruction according to role
    let roleInstruction = '';
    if (copilotRole === 'SOUS_CHEF') {
      roleInstruction = `You are Chef Bruce's Senior Back-of-House Line Sous-Chef. Focus on prep efficiency, line safety, knife cuts, sauce finishing, searing temperatures, and batch scaling.`;
    } else if (copilotRole === 'FOH_CONTROLLER') {
      roleInstruction = `You are General Manager Ashley's F&B Financial Controller. Focus on food cost percentage (target 28%), gross margin dollars, par level reconciliation, and vendor price audits.`;
    } else {
      roleInstruction = `You are the Executive Banquet Planning Master. Focus on high-volume production (100-500+ covers), service timing, holding temperatures, and banquet prep staging.`;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newThread.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          systemInstruction: roleInstruction,
        }),
      });

      const data = await res.json();
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        throw new Error(data.error || 'Server error generating reply');
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-res`,
        role: 'model',
        content: data.reply || 'No response returned.',
        modelUsed: data.modelUsed || selectedModel,
        timestamp: Date.now(),
        latencyMs,
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        content: `Error: ${err.message || 'Unable to connect to AI server. Please check your network or API keys.'}`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  // Low latency quick line triage
  const quickAssist = async (query: string, station?: string): Promise<{ answer: string; latencyMs: number }> => {
    setIsQuickAssistLoading(true);
    try {
      const res = await fetch('/api/quick-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, station }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Quick assist failed');
      }

      return {
        answer: data.answer,
        latencyMs: data.latencyMs || 250,
      };
    } catch (err: any) {
      return {
        answer: `Notice: Quick triage offline. Line recommendation: Check standard chef temp charts or consult head chef.`,
        latencyMs: 150,
      };
    } finally {
      setIsQuickAssistLoading(false);
    }
  };

  // High-Resolution Image Generator with gemini-3-pro-image-preview
  const generatePlatingImage = async (params: {
    prompt: string;
    imageSize: ImageResolution;
    aspectRatio: AspectRatio;
    style: ImageStyle;
  }): Promise<GeneratedImageItem | null> => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image generation failed');
      }

      const newImage: GeneratedImageItem = {
        id: `gen-${Date.now()}`,
        prompt: params.prompt,
        imageUrl: data.imageUrl,
        resolution: params.imageSize,
        style: params.style,
        aspectRatio: params.aspectRatio,
        timestamp: Date.now(),
        modelUsed: data.modelUsed || 'gemini-3-pro-image-preview',
      };

      setGeneratedImages((prev) => [newImage, ...prev]);
      return newImage;
    } catch (err: any) {
      console.error('Failed to generate image:', err);
      alert(`Image Generation Alert: ${err.message || 'Error communicating with image model'}`);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Smart On-Hand Menu Generator ("Par-to-Plate AI Engine")
  const generateOnHandMenu = async () => {
    setIsGeneratingOnHandMenu(true);
    try {
      const res = await fetch('/api/generate-onhand-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: inventoryItems }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate on-hand menu');
      }
      if (Array.isArray(data.proposals) && data.proposals.length > 0) {
        setOnHandMenuProposals(data.proposals);
      }
    } catch (err: any) {
      console.error('Error generating on-hand menu:', err);
      alert(`Par-to-Plate Engine Alert: ${err.message || 'Error communicating with AI engine.'}`);
    } finally {
      setIsGeneratingOnHandMenu(false);
    }
  };

  const acceptAndPushToPrep = (proposal: OnHandMenuProposal) => {
    const recipeId = `rec-onhand-${Date.now()}`;
    const portionCount = proposal.category === 'Banquet Buffet Option' ? 40 : 10;

    // Step 1: Create Recipe in Catalog
    const newRecipe: Recipe = {
      id: recipeId,
      name: proposal.name,
      category: proposal.category === 'Banquet Buffet Option' ? 'Banquet Entree' : 'A La Carte',
      standardYieldQuantity: portionCount,
      yieldUnit: 'Portions',
      laborMinutesRequired: 30,
      targetFoodCostPercentage: proposal.foodCostPercentage,
      isBanquetCompatible: proposal.category === 'Banquet Buffet Option',
      targetMenuPrice: proposal.targetMenuPrice,
      platingDescription: `${proposal.platingNotes}. Pairing: ${proposal.winePairing}`,
      ingredients: proposal.utilizedSurplusIngredients.map((u, i) => ({
        id: `ing-used-${Date.now()}-${i}`,
        name: u.name,
        quantity: Math.round(u.quantity * portionCount * 10) / 10,
        unit: u.unit,
        unitCost: u.unitCost,
        wastePct: 5.0,
      })),
    };

    // Step 2: Atomic linked Prep Items for Station Line Cooks
    const newPrepItems: PrepItem[] = proposal.stationBreakdown.map((t, idx) => ({
      id: `prep-onhand-${Date.now()}-${idx}`,
      recipeId: recipeId,
      recipeName: `${t.taskName} (${proposal.name})`,
      targetQuantity: t.quantity,
      completedQuantity: 0,
      unitOfMeasure: t.unit,
      stationAssignment: t.station,
      priorityLevel: 1, // High priority special
      isCompleted: false,
      assignedCookName: t.suggestedCook || 'Chef Bruce',
      shiftedDateTimestamp: Date.now(),
    }));

    // Atomic update simulation
    setRecipes((prev) => [newRecipe, ...prev]);
    setPrepItems((prev) => [...newPrepItems, ...prev]);
    setSyncEventsCount((c) => c + 1);

    return {
      success: true,
      recipeId: newRecipe.id,
      prepCount: newPrepItems.length,
    };
  };

  // Restaurant Operating System Actions
  const updateTableStatus = (tableId: string, status: TableServiceStatus) => {
    setFloorTables((prev) =>
      prev.map((t) => {
        if (t.tableId === tableId) {
          const now = Date.now();
          return {
            ...t,
            status,
            lastStatusChangeTimestamp: now,
            currentCovers: status === 'VACANT' || status === 'DIRTY' ? 0 : t.currentCovers,
            orderTotal: status === 'VACANT' ? 0 : t.orderTotal,
          };
        }
        return t;
      })
    );
    setSyncEventsCount((c) => c + 1);
  };

  const seatTable = (tableId: string, covers: number, serverName?: string, notes?: string) => {
    const now = Date.now();
    setFloorTables((prev) =>
      prev.map((t) => {
        if (t.tableId === tableId) {
          return {
            ...t,
            status: 'SEATED',
            currentCovers: covers,
            serverName: serverName || t.serverName || 'Server',
            seatedTimestamp: now,
            lastStatusChangeTimestamp: now,
            notes: notes !== undefined ? notes : t.notes,
          };
        }
        return t;
      })
    );
    setSyncEventsCount((c) => c + 1);
  };

  const resetTable = (tableId: string) => {
    const now = Date.now();
    setFloorTables((prev) =>
      prev.map((t) => {
        if (t.tableId === tableId) {
          return {
            ...t,
            status: 'VACANT',
            currentCovers: 0,
            seatedTimestamp: undefined,
            lastStatusChangeTimestamp: now,
            notes: undefined,
            orderTotal: 0,
            activeAlerts: [],
          };
        }
        return t;
      })
    );
    setSyncEventsCount((c) => c + 1);
  };

  const logFoodWaste = (
    ingredientId: string,
    quantity: number,
    reason: WasteReason,
    loggedBy: string,
    notes?: string
  ) => {
    const invItem = inventoryItems.find((i) => i.id === ingredientId || i.ingredientId === ingredientId);
    const ingredientName = invItem ? invItem.ingredientName : 'Ingredient';
    const unit = invItem ? invItem.unitOfMeasure : 'Units';
    const unitCost = invItem ? invItem.unitCost : 0;
    const costImpact = Math.round(quantity * unitCost * 100) / 100;

    const newLog: WasteLog = {
      id: `wst-${Date.now()}`,
      timestamp: Date.now(),
      ingredientId,
      ingredientName,
      quantity,
      unit,
      costImpact,
      reason,
      loggedBy,
      notes,
    };

    setWasteLogs((prev) => [newLog, ...prev]);

    // Atomically decrement inventory
    if (invItem) {
      setInventoryItems((prev) =>
        prev.map((item) => {
          if (item.id === invItem.id) {
            return {
              ...item,
              currentOnHandQuantity: Math.max(0, Math.round((item.currentOnHandQuantity - quantity) * 100) / 100),
              lastAuditTimestamp: Date.now(),
              auditedByProfile: 'WASTE_LOG_AUTO',
            };
          }
          return item;
        })
      );
    }

    setSyncEventsCount((c) => c + 1);
  };

  const logSanitationRecord = (record: Omit<SanitationLog, 'id' | 'timestamp'>) => {
    const newLog: SanitationLog = {
      ...record,
      id: `san-${Date.now()}`,
      timestamp: Date.now(),
    };
    setSanitationLogs((prev) => [newLog, ...prev]);

    // Auto-decrement dish detergent slightly to simulate chemical cycle usage
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.id === 'inv-chem-1' || item.ingredientName.toLowerCase().includes('dish detergent')) {
          return {
            ...item,
            currentOnHandQuantity: Math.max(0, Math.round((item.currentOnHandQuantity - 0.05) * 100) / 100),
          };
        }
        return item;
      })
    );

    setSyncEventsCount((c) => c + 1);
  };

  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'poNumber'>): PurchaseOrder => {
    const now = Date.now();
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${now}`,
      poNumber,
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    setSyncEventsCount((c) => c + 1);
    return newPO;
  };

  const updatePOStatus = (poId: string, status: POStatus) => {
    setPurchaseOrders((prev) => prev.map((po) => (po.id === poId ? { ...po, status } : po)));
    setSyncEventsCount((c) => c + 1);
  };

  const receiveInvoicePO = (
    poId: string,
    invoiceNumber: string,
    itemsReceived: Array<{ inventoryItemId: string; receivedQty: number; actualCost: number }>
  ) => {
    const now = Date.now();
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          return {
            ...po,
            status: 'RECEIVED' as const,
            invoiceNumber,
            receivedDate: now,
            items: po.items.map((item) => {
              const match = itemsReceived.find((r) => r.inventoryItemId === item.inventoryItemId);
              if (match) {
                return {
                  ...item,
                  quantityReceived: match.receivedQty,
                  actualUnitCost: match.actualCost,
                };
              }
              return item;
            }),
          };
        }
        return po;
      })
    );

    // Increment inventory items atomically & update unit costs
    setInventoryItems((prev) =>
      prev.map((invItem) => {
        const match = itemsReceived.find((r) => r.inventoryItemId === invItem.id);
        if (match) {
          return {
            ...invItem,
            currentOnHandQuantity: Math.round((invItem.currentOnHandQuantity + match.receivedQty) * 100) / 100,
            unitCost: match.actualCost > 0 ? match.actualCost : invItem.unitCost,
            lastAuditTimestamp: now,
            auditedByProfile: 'INVOICE_RECEIVE',
          };
        }
        return invItem;
      })
    );

    setSyncEventsCount((c) => c + 1);
  };

  const toggleClockIn = (employeeId: string) => {
    const now = Date.now();
    setShiftRoster((prev) =>
      prev.map((emp) => {
        if (emp.id === employeeId) {
          const nextClocked = !emp.isClockedIn;
          return {
            ...emp,
            isClockedIn: nextClocked,
            clockInTimestamp: nextClocked ? now : undefined,
          };
        }
        return emp;
      })
    );
    setSyncEventsCount((c) => c + 1);
  };

  const updateShiftRoster = (roster: ShiftRosterItem[]) => {
    setShiftRoster(roster);
    setSyncEventsCount((c) => c + 1);
  };

  const updatePreShiftHandoff = (updates: Partial<PreShiftHandoff>) => {
    setPreShiftHandoff((prev) => ({ ...prev, ...updates }));
    setSyncEventsCount((c) => c + 1);
  };

  // SECTION 1: Automated B2B EDI Implementation
  const refreshEdiAuditLogs = () => {
    setEdiAuditLogs(EDIIntegrationService.getAuditLogs());
  };

  const transmitPOViaEDI = async (
    poId: string,
    format: 'ANSI_X12_850' | 'REST_FALLBACK' = 'ANSI_X12_850'
  ): Promise<TransmissionResult> => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) {
      throw new Error(`Purchase order ${poId} not found.`);
    }

    // Pre-flight validation pass
    EDIIntegrationService.validatePreFlightDeficits(targetPO, inventoryItems);

    const result = await EDIIntegrationService.transmitPurchaseOrder(targetPO, format, {
      forceMockSuccess: true,
    });

    // Update PO state
    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? {
              ...po,
              status: result.success ? ('SUBMITTED' as const) : po.status,
              transmissionStatus: result.status,
              ediControlNumber: result.controlNumber,
              ediAuditLogs: [result.auditLog, ...(po.ediAuditLogs || [])],
              version: (po.version || 1) + 1,
            }
          : po
      )
    );

    refreshEdiAuditLogs();
    setSyncEventsCount((c) => c + 1);
    return result;
  };

  const simulate855Acknowledgment = (poId: string, ackType: 'ACCEPTED' | 'REJECTED' = 'ACCEPTED') => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) return;

    const result = EDIIntegrationService.reconcileX12855Acknowledgment(
      {
        poNumber: targetPO.poNumber,
        ediControlNumber: targetPO.ediControlNumber || '000001001',
        ackType,
        vendorTrackingId: `TRACK-${Date.now().toString().slice(-6)}`,
        ackDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        vendorNotes: 'Confirmed for warehouse dispatch.',
      },
      targetPO
    );

    setPurchaseOrders((prev) => prev.map((po) => (po.id === poId ? result.updatedPO : po)));
    refreshEdiAuditLogs();
    setSyncEventsCount((c) => c + 1);
  };

  const simulate856ASN = (poId: string) => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) return;

    const result = EDIIntegrationService.reconcileX12856ASN(
      {
        asnNumber: `ASN-${Date.now().toString().slice(-6)}`,
        poNumber: targetPO.poNumber,
        ediControlNumber: targetPO.ediControlNumber || '000001001',
        shipmentDate: new Date().toISOString(),
        expectedDockDeliveryTimestamp: Date.now() + 8 * 3600000,
        carrierName: `${targetPO.vendorName} Dedicated Logistics`,
        trackingNumber: `1Z999${targetPO.vendorName.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`,
        billOfLading: `BOL-${Date.now().toString().slice(-6)}`,
        items: targetPO.items.map((item, idx) => ({
          lineId: `line-${idx + 1}`,
          itemCode: `SKU-${item.inventoryItemId.slice(-6).toUpperCase()}`,
          description: item.itemName,
          quantityOrdered: item.quantityOrdered,
          quantityShipped: item.quantityOrdered,
          unitOfMeasure: item.unitOfMeasure,
          fillRatePercent: 100,
          isSubstitute: false,
        })),
        overallFillRatePercent: 100,
      },
      targetPO
    );

    setPurchaseOrders((prev) => prev.map((po) => (po.id === poId ? result.updatedPO : po)));
    refreshEdiAuditLogs();
    setSyncEventsCount((c) => c + 1);
  };

  // SECTION 2: Barcode Scanner Engine Implementation
  const scanBarcode = (rawCode: string): BarcodeResolutionResult => {
    const result = BarcodeScannerEngine.processIncomingBarcode(
      rawCode,
      'VIRTUAL_SIMULATOR',
      inventoryItems
    );
    setLastScannedBarcodeResult(result);
    if (result.isMapped && result.matchedItem) {
      auditInventoryItem(result.matchedItem.id, result.newQuantity, 'BARCODE_SCANNER');
    } else {
      setUnmappedBarcodeForAssociation({ barcode: result.barcode, symbology: result.symbology });
      setIsBarcodeModalOpen(true);
    }
    return result;
  };

  const connectBluetoothScanner = async () => {
    const res = await BarcodeScannerEngine.connectWebBluetoothScanner();
    setScannerDevice(BarcodeScannerEngine.getActiveDevice());
    if (!res.success && res.error) {
      alert(`Bluetooth Scanner Notice: ${res.error}`);
    }
  };

  const associateBarcodeWithItem = (barcode: string, itemId: string) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              barcode,
              sku: item.sku || `SKU-${barcode.slice(-6)}`,
              lastAuditTimestamp: Date.now(),
              auditedByProfile: 'BARCODE_MAPPING',
            }
          : item
      )
    );
    setUnmappedBarcodeForAssociation(null);
    setSyncEventsCount((c) => c + 1);
  };

  const createNewItemWithBarcode = (barcode: string, itemData: any) => {
    const newItem = addInventoryItem({
      ...itemData,
      barcode,
      sku: itemData.sku || `SKU-${barcode.slice(-6)}`,
    });
    setUnmappedBarcodeForAssociation(null);
    return newItem;
  };

  // SECTION 3: POS Gateway & Thermal Printer Driver Implementation
  const setPosProvider = (provider: POSProvider) => {
    setPosProviderState(provider);
    LegacyPOSGatewayAdapter.selectProvider(provider);
  };

  const ingestPOSOrderCheck = (order: POSOrderPayload) => {
    const { tableStatusUpdate, prepItemsGenerated } =
      LegacyPOSGatewayAdapter.mapPOSToChefAgentDomain(order);

    // 1. Update Floor Table
    if (tableStatusUpdate.tableId) {
      setFloorTables((prev) =>
        prev.map((t) => (t.tableId === tableStatusUpdate.tableId ? { ...t, ...tableStatusUpdate } : t))
      );
    }

    // 2. Add prep tickets
    if (prepItemsGenerated.length > 0) {
      setPrepItems((prev) => [...prepItemsGenerated, ...prev]);
    }

    // 3. Auto-route and print thermal kitchen tickets
    const { routedTickets } = EscPosPrinterDriver.autoRouteAndPrintOrder(order);
    if (routedTickets.length > 0) {
      setRecentThermalSlips((prev) => [...routedTickets, ...prev].slice(0, 20));
      setActiveThermalSlipForPreview(routedTickets[0]);
    }

    setSyncEventsCount((c) => c + 1);
  };

  const printThermalSlip = (order: POSOrderPayload, station: string = 'Sauce/Sauté'): ThermalSlipTicket => {
    const { ticket } = EscPosPrinterDriver.generateKitchenTicketSlip(order, station, {
      triggerBuzzer: true,
      actuateCutter: true,
    });
    setRecentThermalSlips((prev) => [ticket, ...prev].slice(0, 20));
    setActiveThermalSlipForPreview(ticket);
    return ticket;
  };

  // Sync trigger
  const syncNow = async () => {
    setSyncStatus('SYNCING');
    await new Promise((r) => setTimeout(r, 600));
    setSyncEventsCount(0);
    setSyncStatus('ONLINE');
  };

  // Kiosk mode toggle
  const toggleKioskMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsKioskMode(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsKioskMode(false);
      }
    }
  };

  return (
    <ChefContext.Provider
      value={{
        activeProfile,
        isPinModalOpen,
        setIsPinModalOpen,
        requestProfileSwitch,
        confirmPinAndSwitch,
        forceSwitchProfile,

        prepItems,
        togglePrepItem,
        addPrepItem,
        deletePrepItem,
        resetPrepItems,

        recipes,
        addRecipe,

        inventoryItems,
        auditInventoryItem,
        addInventoryItem,
        updateInventoryItem,
        archiveInventoryItem,
        restoreInventoryItem,

        banquets,
        updateBanquetStatus,

        events,
        createEvent,
        updateEvent,
        deleteEvent,
        updateGuestCount,
        pushBanquetMenuToPrep,
        syncEventWithGoogle,

        copilotOpen,
        setCopilotOpen,
        copilotRole,
        setCopilotRole,
        selectedModel,
        setSelectedModel,
        chatMessages,
        isChatLoading,
        sendChatMessage,
        clearChat,

        quickAssist,
        isQuickAssistLoading,

        imageModalOpen,
        setImageModalOpen,
        generatedImages,
        isGeneratingImage,
        generatePlatingImage,

        onHandMenuProposals,
        isGeneratingOnHandMenu,
        generateOnHandMenu,
        acceptAndPushToPrep,

        syncEventsCount,
        syncStatus,
        syncNow,
        isSyncHudOpen,
        setIsSyncHudOpen,

        isKioskMode,
        toggleKioskMode,

        establishmentProfile,
        terminology,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        setEstablishmentType,
        updateEstablishmentProfile,
        addStorageLocation,
        updateStorageLocation,
        deleteStorageLocation,
        resetStorageLocationsToDefault,

        // Restaurant Operating System (BOH & FOH)
        floorTables,
        updateTableStatus,
        seatTable,
        resetTable,

        sanitationLogs,
        logSanitationRecord,

        purchaseOrders,
        createPurchaseOrder,
        updatePOStatus,
        receiveInvoicePO,

        wasteLogs,
        logFoodWaste,

        shiftRoster,
        toggleClockIn,
        updateShiftRoster,

        preShiftHandoff,
        updatePreShiftHandoff,

        eightySixList,

        // Executive AI Workflows
        executiveToast,
        dismissExecutiveToast,
        activeDraftPOForReview,
        setActiveDraftPOForReview,
        activeExpirationMenuProposal,
        setActiveExpirationMenuProposal,
        isPurchaseOrderModalOpen,
        setIsPurchaseOrderModalOpen,
        triggerRestockWorkflow,
        triggerExpirationMenuWorkflow,

        // AI Vision Shelf-Counting Pipeline
        isVisionScanModalOpen,
        setIsVisionScanModalOpen,
        activeVisionScanDiff,
        setActiveVisionScanDiff,
        applyVisionAuditDiff,

        // Tri-Mode Voice Dispatcher
        handleVoiceCommand,

        // SECTION 1: Automated B2B EDI & Outbox Pipeline
        transmitPOViaEDI,
        ediAuditLogs,
        refreshEdiAuditLogs,
        simulate855Acknowledgment,
        simulate856ASN,
        isEdiInspectorOpen,
        setIsEdiInspectorOpen,
        activePOForEdiInspect,
        setActivePOForEdiInspect,

        // SECTION 2: Multi-Device Bluetooth Barcode Engine
        scannerDevice,
        isBarcodeModalOpen,
        setIsBarcodeModalOpen,
        lastScannedBarcodeResult,
        scanBarcode,
        connectBluetoothScanner,
        unmappedBarcodeForAssociation,
        setUnmappedBarcodeForAssociation,
        associateBarcodeWithItem,
        createNewItemWithBarcode,

        // SECTION 3: Bi-Directional POS Gateway & Thermal Printer Driver
        isPosGatewayModalOpen,
        setIsPosGatewayModalOpen,
        ingestPOSOrderCheck,
        printThermalSlip,
        posProvider,
        setPosProvider,
        recentThermalSlips,
        isThermalPreviewModalOpen,
        setIsThermalPreviewModalOpen,
        activeThermalSlipForPreview,
        setActiveThermalSlipForPreview,
      }}
    >
      {children}
    </ChefContext.Provider>
  );
};

export const useChef = () => {
  const context = useContext(ChefContext);
  if (!context) {
    throw new Error('useChef must be used within a ChefProvider');
  }
  return context;
};
