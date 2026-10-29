/**
 * src/utils/voiceCommandParser.ts
 *
 * High-performance, offline-capable spoken grammar and intent parser for ChefAgent.
 * Handles:
 * 1. AI Executive Workflow Macros ("Put together a restocking order", "Generate a menu based on items about to expire")
 * 2. Front-of-House (FOH) Operations (Table seating, covers, phase changes, server assignment)
 * 3. Back-of-House (BOH) Inventory Audits (Set count, plus/down deltas, 86 toggles, stock queries)
 */
import { InventoryItem, TableStatus, ShiftRosterItem, VoiceParseResult, PrepItem } from '../types';

/**
 * Word to Number mapping for spoken digit normalization
 */
const WORD_TO_NUMBER: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  'eighty-six': 86,
  ninety: 90,
};

/**
 * Normalizes spoken English number words to numerical digits
 */
export function normalizeSpokenNumbers(text: string): string {
  let normalized = text.toLowerCase();

  // Handle compound words like "twenty four" -> 24
  normalized = normalized.replace(/\btwenty\s+(one|two|three|four|five|six|seven|eight|nine)\b/g, (_, unit) => {
    return String(20 + (WORD_TO_NUMBER[unit] || 0));
  });
  normalized = normalized.replace(/\bthirty\s+(one|two|three|four|five|six|seven|eight|nine)\b/g, (_, unit) => {
    return String(30 + (WORD_TO_NUMBER[unit] || 0));
  });
  normalized = normalized.replace(/\bforty\s+(one|two|three|four|five|six|seven|eight|nine)\b/g, (_, unit) => {
    return String(40 + (WORD_TO_NUMBER[unit] || 0));
  });
  normalized = normalized.replace(/\bfifty\s+(one|two|three|four|five|six|seven|eight|nine)\b/g, (_, unit) => {
    return String(50 + (WORD_TO_NUMBER[unit] || 0));
  });

  // Single word numbers
  Object.entries(WORD_TO_NUMBER).forEach(([word, num]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, String(num));
  });

  return normalized;
}

/**
 * Standard Levenshtein similarity (0.0 to 1.0)
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1.toLowerCase() : s2.toLowerCase();
  const shorter = s1.length > s2.length ? s2.toLowerCase() : s1.toLowerCase();

  if (longer.length === 0) return 1.0;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return (longer.length - costs[shorter.length]) / longer.length;
}

/**
 * Matches an item name against the active inventory catalog using fuzzy Levenshtein distance
 */
export function matchInventoryItem(
  target: string,
  catalog: InventoryItem[]
): { item: InventoryItem; score: number } | null {
  let bestMatch: InventoryItem | null = null;
  let highestScore = 0;

  const cleanTarget = target.toLowerCase().trim();

  for (const item of catalog) {
    const cleanName = item.ingredientName.toLowerCase();
    // Substring exact match boost
    if (cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName)) {
      return { item, score: 0.95 };
    }

    const score = calculateSimilarity(cleanTarget, cleanName);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return highestScore >= 0.55 && bestMatch ? { item: bestMatch, score: highestScore } : null;
}

/**
 * Matches a server name against active shift roster
 */
export function matchServerName(
  target: string,
  roster: ShiftRosterItem[]
): ShiftRosterItem | undefined {
  const cleanTarget = target.toLowerCase().trim();
  return roster.find(
    (r) =>
      r.employeeName.toLowerCase().includes(cleanTarget) ||
      cleanTarget.includes(r.employeeName.toLowerCase().split(' ')[0])
  );
}

/**
 * Main Spoken Grammar Intent Parser
 */
export function parseSpokenCommand(
  rawTranscript: string,
  context: {
    inventory: InventoryItem[];
    tables: TableStatus[];
    roster: ShiftRosterItem[];
    prepList?: PrepItem[];
    activeDomain?: 'AUTO' | 'BOH' | 'FOH';
  }
): VoiceParseResult {
  const normalized = normalizeSpokenNumbers(rawTranscript.trim());
  const cleanText = normalized.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');

  // --------------------------------------------------------------------------
  // 1. EXECUTIVE WORKFLOW MACROS
  // --------------------------------------------------------------------------

  // A. Restocking Order Macro: "Put together a restocking order", "create restocking order"
  if (
    /(put together|generate|create|build|make)\s+(a\s+)?restock(ing)?\s+order/i.test(cleanText) ||
    /order\s+low\s+stock(\s+items)?/i.test(cleanText)
  ) {
    return {
      rawTranscript,
      cleanedCommand: cleanText,
      intent: 'GENERATE_RESTOCK_ORDER',
      domain: 'EXECUTIVE_MACRO',
      confidence: 0.98,
      spokenFeedback: 'Analyzing stock levels against par to draft purchase orders.',
    };
  }

  // B. Expiration Menu Macro: "Generate a menu based on items about to expire", "menu for expiring items"
  if (
    /(generate|create|build|make)\s+(a\s+)?menu\s+(based on|using|from)\s+(items\s+)?(about to expire|expiring|surplus|waste)/i.test(
      cleanText
    ) ||
    /specials\s+(from|using)\s+(expiring|surplus)\s+items/i.test(cleanText)
  ) {
    return {
      rawTranscript,
      cleanedCommand: cleanText,
      intent: 'GENERATE_EXPIRATION_MENU',
      domain: 'EXECUTIVE_MACRO',
      confidence: 0.98,
      spokenFeedback: 'Scanning shelf-life dates to craft waste-mitigation daily specials.',
    };
  }

  // --------------------------------------------------------------------------
  // 2. FRONT-OF-HOUSE (FOH) TABLE & FLOOR COMMANDS
  // --------------------------------------------------------------------------

  // A. Seating & Covers: "Seat table 4, 4 covers, server Dave"
  const seatMatch = cleanText.match(
    /seat\s+table\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(\d+)\s+covers?(\s+server\s+([a-zA-Z]+))?/i
  );
  if (seatMatch) {
    const rawTblNum = seatMatch[1];
    const tblFormatted = rawTblNum.length === 1 ? `0${rawTblNum}` : rawTblNum;
    const matchedTable = context.tables.find(
      (t) => (t.tableName && t.tableName.endsWith(tblFormatted)) || t.tableId.endsWith(tblFormatted)
    );
    const covers = parseInt(seatMatch[2], 10) || 2;
    const serverWord = seatMatch[4] ? seatMatch[4].trim() : undefined;
    const matchedServer = serverWord ? matchServerName(serverWord, context.roster) : undefined;
    const serverName = matchedServer ? matchedServer.employeeName : serverWord || 'Floor Server';

    return {
      rawTranscript,
      cleanedCommand: cleanText,
      intent: 'SEAT_TABLE',
      domain: 'FOH_FLOOR',
      confidence: 0.95,
      tableId: matchedTable?.tableId || `tbl-${tblFormatted}`,
      tableNumber: matchedTable?.tableName || `Table ${tblFormatted}`,
      covers,
      serverName,
      spokenFeedback: `Table ${tblFormatted} seated with ${covers} covers assigned to ${serverName}.`,
    };
  }

  // B. Service Phase Changes: "Table 12 entree phase", "Table 4 check dropped", "Table 6 dirty", "Table 6 vacant"
  const tableStatusMatch = cleanText.match(
    /table\s+(\d+)\s+(vacant|ready|seated|entree phase|entree|check dropped|check|dropped|dirty|bus|bussed)/i
  );
  if (tableStatusMatch) {
    const rawTblNum = tableStatusMatch[1];
    const tblFormatted = rawTblNum.length === 1 ? `0${rawTblNum}` : rawTblNum;
    const rawStatus = tableStatusMatch[2].toLowerCase();

    let targetStatus: 'VACANT' | 'SEATED' | 'ENTREE_PHASE' | 'CHECK_DROPPED' | 'DIRTY' = 'VACANT';
    if (rawStatus.includes('entree')) targetStatus = 'ENTREE_PHASE';
    else if (rawStatus.includes('check') || rawStatus.includes('dropped')) targetStatus = 'CHECK_DROPPED';
    else if (rawStatus.includes('dirty') || rawStatus.includes('bus')) targetStatus = 'DIRTY';
    else if (rawStatus.includes('seated')) targetStatus = 'SEATED';
    else if (rawStatus.includes('vacant') || rawStatus.includes('ready')) targetStatus = 'VACANT';

    const matchedTable = context.tables.find(
      (t) => (t.tableName && t.tableName.endsWith(tblFormatted)) || t.tableId.endsWith(tblFormatted)
    );

    return {
      rawTranscript,
      cleanedCommand: cleanText,
      intent: 'UPDATE_TABLE_STATUS',
      domain: 'FOH_FLOOR',
      confidence: 0.92,
      tableId: matchedTable?.tableId || `tbl-${tblFormatted}`,
      tableNumber: matchedTable?.tableName || `Table ${tblFormatted}`,
      tableStatus: targetStatus,
      spokenFeedback: `Table ${tblFormatted} updated to ${targetStatus.replace('_', ' ').toLowerCase()}.`,
    };
  }

  // --------------------------------------------------------------------------
  // 3. BACK-OF-HOUSE (BOH) 86 & STOCK QUERIES
  // --------------------------------------------------------------------------

  // A. 86 / Out of Stock: "86 the duck breast", "eighty-six halibut"
  const eightySixMatch = cleanText.match(/(86|eighty-six|out of stock|depleted)\s+(the\s+)?([a-zA-Z\s]+)/i);
  if (eightySixMatch) {
    const itemQuery = eightySixMatch[3].trim();
    const match = matchInventoryItem(itemQuery, context.inventory);
    return {
      rawTranscript,
      cleanedCommand: cleanText,
      intent: 'MARK_86',
      domain: 'BOH_INVENTORY',
      confidence: match ? match.score : 0.8,
      targetItemId: match?.item.id,
      targetItemName: match ? match.item.ingredientName : itemQuery,
      quantity: 0,
      spokenFeedback: match
        ? `86 confirmed for ${match.item.ingredientName}. Broadcasted to service floor.`
        : `Flagged ${itemQuery} as eighty-six.`,
    };
  }

  // B. Stock Query: "How many ribeyes left?", "What is our halibut stock?"
  const stockQueryMatch = cleanText.match(
    /(how many|how much|what is our|check stock for|stock on)\s+([a-zA-Z\s]+?)(left|in stock|on hand)?$/i
  );
  if (stockQueryMatch) {
    const itemQuery = stockQueryMatch[2].replace(/(the|our)/gi, '').trim();
    const match = matchInventoryItem(itemQuery, context.inventory);
    if (match) {
      return {
        rawTranscript,
        cleanedCommand: cleanText,
        intent: 'QUERY_STOCK',
        domain: 'BOH_INVENTORY',
        confidence: match.score,
        targetItemId: match.item.id,
        targetItemName: match.item.ingredientName,
        quantity: match.item.currentOnHandQuantity,
        unit: match.item.unitOfMeasure,
        spokenFeedback: `${match.item.ingredientName}: ${match.item.currentOnHandQuantity} ${match.item.unitOfMeasure} currently on hand in ${match.item.storageLocation}.`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // 4. BOH INVENTORY AUDIT INCREMENTS, DECREMENTS & COUNTS
  // --------------------------------------------------------------------------

  // A. Increment: "shallots plus 5", "beef add 3"
  const incMatch = cleanText.match(/([a-zA-Z\s]+)\s+(plus|add|up)\s+(\d+(?:\.\d+)?)/i);
  if (incMatch) {
    const itemName = incMatch[1].trim();
    const delta = parseFloat(incMatch[3]);
    const match = matchInventoryItem(itemName, context.inventory);
    if (match) {
      return {
        rawTranscript,
        cleanedCommand: cleanText,
        intent: 'INCREMENT',
        domain: 'BOH_INVENTORY',
        confidence: match.score,
        targetItemId: match.item.id,
        targetItemName: match.item.ingredientName,
        quantity: delta,
        unit: match.item.unitOfMeasure,
        spokenFeedback: `Added ${delta} ${match.item.unitOfMeasure} to ${match.item.ingredientName}.`,
      };
    }
  }

  // B. Decrement: "filet mignon down 4", "halibut minus 2"
  const decMatch = cleanText.match(/([a-zA-Z\s]+)\s+(down|minus|drop|subtract)\s+(\d+(?:\.\d+)?)/i);
  if (decMatch) {
    const itemName = decMatch[1].trim();
    const delta = parseFloat(decMatch[3]);
    const match = matchInventoryItem(itemName, context.inventory);
    if (match) {
      return {
        rawTranscript,
        cleanedCommand: cleanText,
        intent: 'DECREMENT',
        domain: 'BOH_INVENTORY',
        confidence: match.score,
        targetItemId: match.item.id,
        targetItemName: match.item.ingredientName,
        quantity: delta,
        unit: match.item.unitOfMeasure,
        spokenFeedback: `Subtracted ${delta} ${match.item.unitOfMeasure} from ${match.item.ingredientName}.`,
      };
    }
  }

  // C. Absolute Set: "Heavy duty liners, 6 boxes", "Tenderloin 14 pounds", "Halibut 12"
  const setMatch = cleanText.match(/([a-zA-Z\s]+?)\s+(\d+(?:\.\d+)?)(?:\s+([a-zA-Z]+))?$/i);
  if (setMatch) {
    const itemName = setMatch[1].trim();
    const qty = parseFloat(setMatch[2]);
    const spokenUnit = setMatch[3];
    const match = matchInventoryItem(itemName, context.inventory);
    if (match) {
      return {
        rawTranscript,
        cleanedCommand: cleanText,
        intent: 'SET_COUNT',
        domain: 'BOH_INVENTORY',
        confidence: match.score,
        targetItemId: match.item.id,
        targetItemName: match.item.ingredientName,
        quantity: qty,
        unit: spokenUnit || match.item.unitOfMeasure,
        spokenFeedback: `Set ${match.item.ingredientName} count to ${qty} ${match.item.unitOfMeasure}.`,
      };
    }
  }

  // Fallback: Unknown or unrecognized phrase
  return {
    rawTranscript,
    cleanedCommand: cleanText,
    intent: 'UNKNOWN',
    domain: 'GENERAL_QUERY',
    confidence: 0.2,
    spokenFeedback: "Command not recognized. Say 'Chef, put together a restocking order' or 'Table 4 seated'.",
  };
}
