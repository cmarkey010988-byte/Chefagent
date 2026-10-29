import test from 'node:test';
import assert from 'node:assert/strict';
import { LegacyPOSGatewayAdapter } from './LegacyPOSGatewayAdapter';
import { EscPosPrinterDriver } from '../printer/EscPosPrinterDriver';
import { POSOrderPayload } from '../../types';

const sampleOrder: POSOrderPayload = {
  checkId: 'chk-toast-5521',
  orderNumber: 'TOAST-5521',
  tableNumber: '04',
  tableId: 'tbl-04',
  diningSection: 'Main Dining Room',
  guestCount: 2,
  serverName: 'Chloe M.',
  openedTimestamp: Date.now() - 10 * 60 * 1000,
  status: 'IN_KITCHEN',
  subtotal: 106.0,
  tax: 8.48,
  total: 114.48,
  version: 2,
  items: [
    {
      id: 'chk-item-1',
      menuItemId: 'rec-1',
      name: 'Prime Tenderloin Au Poivre',
      quantity: 1,
      price: 58.0,
      seatNumber: 1,
      course: 'ENTREE',
      targetStation: 'Butchery',
      modifiers: ['Rare', 'Extra Demi'],
      allergenAlerts: ['GLUTEN_FREE requested'],
      fireStatus: 'FIRED',
    },
    {
      id: 'chk-item-2',
      menuItemId: 'rec-2',
      name: 'Pan-Roasted Pacific Halibut',
      quantity: 1,
      price: 48.0,
      seatNumber: 2,
      course: 'ENTREE',
      targetStation: 'Sauce/Sauté',
      modifiers: ['Crispy Skin'],
      allergenAlerts: [],
      fireStatus: 'FIRED',
    },
  ],
};

test('POS check mapping transforms check into ChefAgent TableStatus and routed PrepItems', () => {
  const { tableStatusUpdate, prepItemsGenerated } =
    LegacyPOSGatewayAdapter.mapPOSToChefAgentDomain(sampleOrder);

  assert.equal(tableStatusUpdate.tableId, 'tbl-04');
  assert.equal(tableStatusUpdate.status, 'ENTREE_PHASE');
  assert.equal(tableStatusUpdate.currentCovers, 2);
  assert.ok(tableStatusUpdate.activeAlerts?.includes('GLUTEN_FREE requested'));

  assert.equal(prepItemsGenerated.length, 2);
  assert.equal(prepItemsGenerated[0].stationAssignment, 'Butchery');
  assert.equal(prepItemsGenerated[1].stationAssignment, 'Sauce/Sauté');
  assert.ok(prepItemsGenerated[0].recipeName.includes('Rare'));
  assert.equal(prepItemsGenerated[0].priorityLevel, 1); // Allergen alert elevates to critical priority
});

test('Optimistic locking resolves race conditions between POS webhook and cook tap', () => {
  const localState = {
    tableId: 'tbl-04',
    status: 'ENTREE_PHASE',
    isCompleted: true,
    targetQuantity: 1,
  };
  const incomingState = {
    tableId: 'tbl-04',
    status: 'SEATED',
    isCompleted: false,
    targetQuantity: 1,
  };

  const { resolvedState, nextVersion, conflictRecord } =
    LegacyPOSGatewayAdapter.resolveOptimisticLockCollision(
      'PREP_ITEM',
      'item-1',
      2, // local version
      3, // incoming version from POS
      localState,
      incomingState
    );

  // Line cook manual tap takes precedence over stale POS check status
  assert.equal(resolvedState.isCompleted, true);
  assert.equal(nextVersion, 4);
  assert.equal(conflictRecord.resolutionStrategy, 'LOCAL_LINE_WINS');
});

test('ESC/POS Printer Driver renders binary sequences with double-width allergen emphasis, cutter and buzzer', () => {
  const { ticket, binaryBytes, hexStream, formattedAsciiSlip } =
    EscPosPrinterDriver.generateKitchenTicketSlip(sampleOrder, 'Butchery', {
      triggerBuzzer: true,
      actuateCutter: true,
    });

  // Verify printer control codes in binary output:
  // 1. ESC @ (0x1B, 0x40) - Init
  assert.equal(binaryBytes[0], 0x1b);
  assert.equal(binaryBytes[1], 0x40);

  // 2. BEL (0x07) - Buzzer
  assert.ok(binaryBytes.includes(0x07));

  // 3. GS ! (0x1D, 0x21) - Size emphasis
  assert.ok(hexStream.includes('1D 21'));

  // 4. GS V (0x1D, 0x56, 0x42, 0x00) - Cutter actuation
  assert.ok(hexStream.includes('1D 56 42 00'));

  // Verify formatted text output
  assert.ok(formattedAsciiSlip.includes('*** BUTCHERY ***'));
  assert.ok(formattedAsciiSlip.includes('TBL: 04'));
  assert.ok(formattedAsciiSlip.includes('ALLERGY ALERT'));
  assert.ok(ticket.cutterActuated);
  assert.ok(ticket.buzzerTriggered);
});

test('Auto-routing correctly dispatches tickets to station printers and Expediter Pass', () => {
  const { routedTickets, summary } = EscPosPrinterDriver.autoRouteAndPrintOrder(sampleOrder);

  assert.equal(routedTickets.length, 3); // Butchery, Sauce/Sauté + Expediter Pass
  const stations = routedTickets.map((t) => t.destinationStation);
  assert.ok(stations.includes('Butchery'));
  assert.ok(stations.includes('Sauce/Sauté'));
  assert.ok(stations.includes('Expediter_Pass'));
  assert.ok(summary.includes('Auto-routed order'));
});
