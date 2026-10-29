import test from 'node:test';
import assert from 'node:assert/strict';
import { EDIDocumentBuilder } from './EDIDocumentBuilder';
import { PurchaseOrder } from '../../types';

test('ANSI X12 850 EDI generation produces valid interchange envelope', () => {
  const mockPO: PurchaseOrder = {
    id: 'po-test-101',
    poNumber: 'PO-2026-101',
    vendorName: 'Sysco Food Services',
    vendorContact: 'rep@sysco.com',
    orderDate: 1793280000000,
    expectedDeliveryDate: 1793366400000,
    status: 'SUBMITTED',
    totalCost: 1142.5,
    items: [
      {
        inventoryItemId: 'inv-1',
        itemName: 'Prime Beef Tenderloin (PSMO)',
        quantityOrdered: 20,
        unitOfMeasure: 'LB',
        agreedUnitCost: 24.5,
      },
      {
        inventoryItemId: 'inv-4',
        itemName: 'Grade A Heavy Cream 40%',
        quantityOrdered: 10,
        unitOfMeasure: 'GAL',
        agreedUnitCost: 14.25,
      },
      {
        inventoryItemId: 'inv-6',
        itemName: 'Carnaroli Risotto Rice (Aged)',
        quantityOrdered: 25,
        unitOfMeasure: 'LB',
        agreedUnitCost: 4.2,
      },
    ],
  };

  const { ediDocument, ast, controlNumber } = EDIDocumentBuilder.buildX12850Document(mockPO, {
    interchangeControlNumber: '000001001',
    groupControlNumber: '1001',
  });

  // Verify Segments Present
  assert.ok(ediDocument.includes('ISA*00*'));
  assert.ok(ediDocument.includes('GS*PO*'));
  assert.ok(ediDocument.includes('ST*850*0001~'));
  assert.ok(ediDocument.includes('BEG*00*NE*PO-2026-101'));
  assert.ok(ediDocument.includes('PO1*1*20*LB*24.50*PE*VN*'));
  assert.ok(ediDocument.includes('CTT*3*55~'));
  assert.ok(ediDocument.includes('GE*1*1001~'));
  assert.ok(ediDocument.includes('IEA*1*000001001~'));

  assert.equal(ast.poNumber, 'PO-2026-101');
  assert.equal(ast.totalQuantity, 55);
  assert.equal(ast.lineItems.length, 3);
  assert.equal(controlNumber, '000001001');

  // Verify AST Parser validates generated document cleanly
  const parseResult = EDIDocumentBuilder.parseX12850Document(ediDocument);
  assert.equal(parseResult.isValid, true);
  assert.equal(parseResult.errors.length, 0);
  assert.equal(parseResult.ast?.poNumber, 'PO-2026-101');
  assert.equal(parseResult.ast?.isaControlNumber, '000001001');
});

test('X12 Parser rejects invalid or tampered envelopes', () => {
  const tamperedEDI = 'ISA*00*...*000001001*0*P*>~GS*PO*...*1001*X*004010~ST*850*0001~BEG*00*NE*PO-1**20261029~SE*5*0001~GE*1*9999~IEA*1*888888888~';
  const parseResult = EDIDocumentBuilder.parseX12850Document(tamperedEDI);
  assert.equal(parseResult.isValid, false);
  assert.ok(parseResult.errors.length > 0);
});

test('HMAC-SHA256 signature verification authenticates valid webhooks and rejects invalid signatures', () => {
  const secret = 'TEST_SECRET_KEY_12345';
  const body = JSON.stringify({ poNumber: 'PO-2026-101', ackType: 'ACCEPTED' });

  const validSig = EDIDocumentBuilder.generateHmacSignature(body, secret);
  assert.equal(EDIDocumentBuilder.verifyHmacSignature(body, validSig, secret), true);
  assert.equal(EDIDocumentBuilder.verifyHmacSignature(body, `sha256=${validSig}`, secret), true);

  // Altered body must be rejected
  const tamperedBody = JSON.stringify({ poNumber: 'PO-2026-101', ackType: 'REJECTED' });
  assert.equal(EDIDocumentBuilder.verifyHmacSignature(tamperedBody, validSig, secret), false);

  // Invalid signature string must be rejected
  assert.equal(EDIDocumentBuilder.verifyHmacSignature(body, 'bad_signature_00000', secret), false);
});

test('Fallback REST JSON payload compiles correctly for modern distributor APIs', () => {
  const mockPO: PurchaseOrder = {
    id: 'po-test-102',
    poNumber: 'PO-2026-102',
    vendorName: 'US Foods Broadline',
    orderDate: Date.now(),
    expectedDeliveryDate: Date.now() + 86400000,
    status: 'DRAFT',
    totalCost: 500.0,
    items: [
      {
        inventoryItemId: 'inv-beef',
        itemName: 'Beef Tenderloin',
        quantityOrdered: 10,
        unitOfMeasure: 'LB',
        agreedUnitCost: 25.0,
      },
    ],
  };

  const restPayload: any = EDIDocumentBuilder.buildRestJsonFallbackPayload(mockPO);
  assert.equal(restPayload.purchaseOrderMetadata.orderNumber, 'PO-2026-102');
  assert.equal(restPayload.lines.length, 1);
  assert.equal(restPayload.lines[0].sku, 'inv-beef');
});
