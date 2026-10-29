/**
 * src/types/voice.ts
 *
 * Tri-Mode Voice Engine, Wake-Word, and Intent Parsing Contracts
 */

export type VoiceTriggerMode = 'MANUAL' | 'WAKE_WORD' | 'CONTINUOUS';

export type VoiceListeningState = 'IDLE' | 'WAKE_STANDBY' | 'LISTENING' | 'PROCESSING' | 'CONFIRMED' | 'ERROR';

export type VoiceDomain = 'BOH_INVENTORY' | 'FOH_FLOOR' | 'EXECUTIVE_MACRO' | 'GENERAL_QUERY';

export type VoiceIntentType =
  // Executive Macros
  | 'GENERATE_RESTOCK_ORDER'
  | 'GENERATE_EXPIRATION_MENU'
  // BOH Inventory Audits
  | 'SET_COUNT'
  | 'INCREMENT'
  | 'DECREMENT'
  | 'MARK_86'
  | 'QUERY_STOCK'
  | 'TOGGLE_PREP'
  // FOH Floor & Tables
  | 'SEAT_TABLE'
  | 'UPDATE_TABLE_STATUS'
  | 'UNKNOWN';

export interface VoiceConfig {
  mode: VoiceTriggerMode;
  wakeWord: string; // e.g. "Chef", "Ashley", or Venue Name
  isWakeChimeEnabled: boolean;
  isTtsEnabled: boolean;
  activeDomainContext: 'AUTO' | 'BOH' | 'FOH';
}

export interface VoiceParseResult {
  rawTranscript: string;
  cleanedCommand: string;
  intent: VoiceIntentType;
  domain: VoiceDomain;
  confidence: number;
  // BOH Payload
  targetItemId?: string;
  targetItemName?: string;
  quantity?: number;
  unit?: string;
  // FOH Payload
  tableId?: string;
  tableNumber?: string;
  covers?: number;
  serverName?: string;
  tableStatus?: 'VACANT' | 'SEATED' | 'ENTREE_PHASE' | 'CHECK_DROPPED' | 'DIRTY';
  // Audio & Feedback
  spokenFeedback?: string;
}

export interface VoiceUndoAction {
  id: string;
  timestamp: number;
  description: string;
  revert: () => void;
  expiresAt: number;
}
