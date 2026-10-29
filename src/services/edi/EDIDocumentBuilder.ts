/**
 * src/services/edi/EDIDocumentBuilder.ts
 *
 * Production-grade ANSI X12 EDI 850 Purchase Order Generation,
 * AST Parser & Validator, and Fallback Distributor REST API Adapter.
 */
import crypto from 'node:crypto';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  X12EnvelopeHeaderConfig,
  X12LineItem,
  X12850AST,
  EDITransmissionType,
} from '../../types';

export class EDIDocumentBuilder {
  private static readonly ELEMENT_DELIMITER = '*';
  private static readonly SEGMENT_DELIMITER = '~';
  private static readonly REPETITION_SEPARATOR = '^';
  private static readonly COMPONENT_SEPARATOR = ':';

  /**
   * Builds default X12 interchange header configuration for a vendor
   */
  static getDefaultHeaderConfig(
    vendorName: string,
    controlNumberSeq: number = 1001
  ): X12EnvelopeHeaderConfig {
    const paddedCtrl = controlNumberSeq.toString().padStart(9, '0');
    const groupCtrl = controlNumberSeq.toString();

    let receiverQualifier = '01';
    let receiverId = 'SYSCOCORP      ';

    const lower = vendorName.toLowerCase();
    if (lower.includes('us foods') || lower.includes('usfoods')) {
      receiverQualifier = '01';
      receiverId = 'USFOODSCORP    ';
    } else if (lower.includes('ecolab')) {
      receiverQualifier = 'ZZ';
      receiverId = 'ECOLABFACILITY ';
    } else if (lower.includes('seafood') || lower.includes('ocean')) {
      receiverQualifier = 'ZZ';
      receiverId = 'OCEANCATCHSEAFD';
    }

    return {
      senderIdQualifier: '01',
      senderId: 'CHEFAGENTCLUB  '.slice(0, 15).padEnd(15, ' '),
      receiverIdQualifier: receiverQualifier,
      receiverId: receiverId.slice(0, 15).padEnd(15, ' '),
      interchangeControlNumber: paddedCtrl,
      groupControlNumber: groupCtrl,
      testIndicator: 'P',
    };
  }

  /**
   * Generates a fully compliant ANSI X12 850 Purchase Order document string
   */
  static buildX12850Document(
    po: PurchaseOrder,
    headerConfig?: Partial<X12EnvelopeHeaderConfig>,
    options?: {
      buyerName?: string;
      buyerAddress?: string;
      buyerCity?: string;
      buyerState?: string;
      buyerZip?: string;
    }
  ): { ediDocument: string; ast: X12850AST; controlNumber: string } {
    const config: X12EnvelopeHeaderConfig = {
      ...this.getDefaultHeaderConfig(po.vendorName),
      ...headerConfig,
    };

    const d = new Date(po.orderDate || Date.now());
    const year2 = d.getFullYear().toString().slice(-2);
    const year4 = d.getFullYear().toString();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    const dateYYMMDD = `${year2}${month}${day}`;
    const dateYYYYMMDD = `${year4}${month}${day}`;
    const timeHHMM = `${hours}${minutes}`;

    const stControl = '0001';
    const buyer = options?.buyerName || 'CHEFAGENT COUNTRY CLUB';
    const street = options?.buyerAddress || '1100 S CLUB RUN WAY';
    const city = options?.buyerCity || 'PORTLAND';
    const state = options?.buyerState || 'OR';
    const zip = options?.buyerZip || '97219';

    const segments: string[] = [];

    // 1. ISA: Interchange Control Header (Exactly 106 characters fixed format)
    const isaSegment = [
      'ISA',
      '00',
      '          ', // Auth Info (10 spaces)
      '00',
      '          ', // Security Info (10 spaces)
      config.senderIdQualifier.padEnd(2, ' '),
      config.senderId.slice(0, 15).padEnd(15, ' '),
      config.receiverIdQualifier.padEnd(2, ' '),
      config.receiverId.slice(0, 15).padEnd(15, ' '),
      dateYYMMDD,
      timeHHMM,
      'U', // Standards ID
      '00401', // Version
      config.interchangeControlNumber.padStart(9, '0'),
      '0', // Ack Not Requested
      config.testIndicator,
      '>', // Sub-element separator
    ].join(this.ELEMENT_DELIMITER);
    segments.push(isaSegment);

    // 2. GS: Functional Group Header
    const gsSegment = [
      'GS',
      'PO', // Purchase Order
      config.senderId.trim(),
      config.receiverId.trim(),
      dateYYYYMMDD,
      timeHHMM,
      config.groupControlNumber,
      'X', // Accredited Standards Committee X12
      '004010', // Release 4010
    ].join(this.ELEMENT_DELIMITER);
    segments.push(gsSegment);

    // 3. ST: Transaction Set Header (Transaction Set count begins at ST)
    let transactionSetSegmentCount = 1; // ST is segment #1
    segments.push(['ST', '850', stControl].join(this.ELEMENT_DELIMITER));

    // 4. BEG: Beginning Segment for Purchase Order
    transactionSetSegmentCount++;
    segments.push(
      [
        'BEG',
        '00', // Original
        'NE', // New Order
        po.poNumber,
        '', // Release number
        dateYYYYMMDD,
      ].join(this.ELEMENT_DELIMITER)
    );

    // 5. N1 Loops: Buyer (BY) and Seller (SE)
    transactionSetSegmentCount++;
    segments.push(['N1', 'BY', buyer, '91', 'CLUB001'].join(this.ELEMENT_DELIMITER));
    transactionSetSegmentCount++;
    segments.push(['N3', street].join(this.ELEMENT_DELIMITER));
    transactionSetSegmentCount++;
    segments.push(['N4', city, state, zip, 'USA'].join(this.ELEMENT_DELIMITER));

    transactionSetSegmentCount++;
    segments.push(['N1', 'SE', po.vendorName.toUpperCase(), '92', 'VEND901'].join(this.ELEMENT_DELIMITER));

    // 6. PO1 Line Item Segments
    let totalQty = 0;
    const lineItemASTs: X12LineItem[] = [];

    po.items.forEach((item, index) => {
      const lineNum = index + 1;
      const uomCode = this.mapUnitToX12UOM(item.unitOfMeasure);
      const unitPriceFormatted = (item.agreedUnitCost || 0).toFixed(2);
      const qty = item.quantityOrdered || 1;
      totalQty += qty;

      const vendorItemCode = `SKU-${item.inventoryItemId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

      transactionSetSegmentCount++;
      segments.push(
        [
          'PO1',
          lineNum.toString(),
          qty.toString(),
          uomCode,
          unitPriceFormatted,
          'PE', // Price per each/unit
          'VN', // Vendor Item Number qualifier
          vendorItemCode,
          'IN', // Buyer Item internal code
          item.inventoryItemId,
        ].join(this.ELEMENT_DELIMITER)
      );

      // PID: Product Item Description
      transactionSetSegmentCount++;
      segments.push(
        ['PID', 'F', '', '', '', item.itemName.replace(/[*~]/g, '')].join(this.ELEMENT_DELIMITER)
      );

      lineItemASTs.push({
        lineId: `line-${lineNum}`,
        lineNumber: lineNum,
        quantity: qty,
        unitOfMeasure: uomCode,
        unitPrice: item.agreedUnitCost || 0,
        productQualifier: 'VN',
        productCode: vendorItemCode,
        description: item.itemName,
      });
    });

    // 7. CTT: Transaction Totals
    transactionSetSegmentCount++;
    segments.push(['CTT', po.items.length.toString(), totalQty.toString()].join(this.ELEMENT_DELIMITER));

    // 8. SE: Transaction Set Trailer
    transactionSetSegmentCount++; // includes SE itself
    segments.push(['SE', transactionSetSegmentCount.toString(), stControl].join(this.ELEMENT_DELIMITER));

    // 9. GE: Functional Group Trailer
    segments.push(['GE', '1', config.groupControlNumber].join(this.ELEMENT_DELIMITER));

    // 10. IEA: Interchange Control Trailer
    segments.push(['IEA', '1', config.interchangeControlNumber.padStart(9, '0')].join(this.ELEMENT_DELIMITER));

    const ediDocument = segments.map((s) => `${s}${this.SEGMENT_DELIMITER}`).join('\n');

    const ast: X12850AST = {
      isaControlNumber: config.interchangeControlNumber.padStart(9, '0'),
      gsControlNumber: config.groupControlNumber,
      stControlNumber: stControl,
      poNumber: po.poNumber,
      poDate: dateYYYYMMDD,
      buyerName: buyer,
      vendorName: po.vendorName,
      vendorCode: config.receiverId.trim(),
      lineItems: lineItemASTs,
      totalQuantity: totalQty,
      totalCost: po.totalCost,
      segmentCount: segments.length,
    };

    return {
      ediDocument,
      ast,
      controlNumber: config.interchangeControlNumber.padStart(9, '0'),
    };
  }

  /**
   * Parses an ANSI X12 850 string into an Abstract Syntax Tree (AST),
   * strictly validating envelope delimiters, control numbers, and segment totals.
   */
  static parseX12850Document(rawEDI: string): {
    isValid: boolean;
    ast?: X12850AST;
    errors: string[];
  } {
    const errors: string[] = [];
    if (!rawEDI || typeof rawEDI !== 'string') {
      return { isValid: false, errors: ['Raw EDI payload is empty or invalid.'] };
    }

    // Identify segment delimiter
    const delimiter = rawEDI.includes('~') ? '~' : '\n';
    const rawSegments = rawEDI
      .split(delimiter)
      .map((s) => s.trim().replace(/\r/g, ''))
      .filter((s) => s.length > 0);

    if (rawSegments.length < 5) {
      return { isValid: false, errors: ['Document contains fewer than minimum required X12 segments.'] };
    }

    let isaCtrl = '';
    let ieaCtrl = '';
    let gsCtrl = '';
    let geCtrl = '';
    let stCtrl = '';
    let seCtrl = '';
    let seSegmentCount = 0;
    let poNumber = '';
    let poDate = '';
    let buyerName = '';
    let vendorName = '';
    let vendorCode = '';
    const lineItems: X12LineItem[] = [];
    let totalQty = 0;
    let totalCost = 0;

    let inTransactionSet = false;
    let countedSegments = 0;

    for (const rawSeg of rawSegments) {
      const elements = rawSeg.split('*');
      const tag = elements[0];

      if (tag === 'ISA') {
        isaCtrl = elements[13] || '';
      } else if (tag === 'IEA') {
        ieaCtrl = elements[2] || '';
      } else if (tag === 'GS') {
        gsCtrl = elements[6] || '';
        vendorCode = elements[3] || '';
      } else if (tag === 'GE') {
        geCtrl = elements[2] || '';
      } else if (tag === 'ST') {
        inTransactionSet = true;
        stCtrl = elements[2] || '';
        countedSegments = 1;
      } else if (tag === 'SE') {
        inTransactionSet = false;
        countedSegments++;
        seSegmentCount = parseInt(elements[1], 10) || 0;
        seCtrl = elements[2] || '';
      } else if (inTransactionSet) {
        countedSegments++;
        if (tag === 'BEG') {
          poNumber = elements[3] || '';
          poDate = elements[5] || '';
        } else if (tag === 'N1') {
          if (elements[1] === 'BY') buyerName = elements[2] || '';
          if (elements[1] === 'SE') vendorName = elements[2] || '';
        } else if (tag === 'PO1') {
          const lineNum = parseInt(elements[1], 10) || lineItems.length + 1;
          const qty = parseFloat(elements[2]) || 1;
          const uom = (elements[3] || 'EA') as any;
          const price = parseFloat(elements[4]) || 0;
          const code = elements[7] || elements[9] || `LINE-${lineNum}`;

          totalQty += qty;
          totalCost += qty * price;

          lineItems.push({
            lineId: `line-${lineNum}`,
            lineNumber: lineNum,
            quantity: qty,
            unitOfMeasure: uom,
            unitPrice: price,
            productQualifier: (elements[6] as any) || 'VN',
            productCode: code,
            description: `Item line ${lineNum}`,
          });
        }
      }
    }

    // Validate Envelope Controls
    if (isaCtrl !== ieaCtrl) {
      errors.push(`ISA control number (${isaCtrl}) does not match IEA control number (${ieaCtrl}).`);
    }
    if (gsCtrl !== geCtrl) {
      errors.push(`GS control number (${gsCtrl}) does not match GE control number (${geCtrl}).`);
    }
    if (stCtrl !== seCtrl) {
      errors.push(`ST control number (${stCtrl}) does not match SE control number (${seCtrl}).`);
    }
    if (seSegmentCount > 0 && seSegmentCount !== countedSegments) {
      errors.push(`SE segment count (${seSegmentCount}) does not match counted transaction segments (${countedSegments}).`);
    }
    if (!poNumber) {
      errors.push('BEG segment missing PO number.');
    }

    const ast: X12850AST = {
      isaControlNumber: isaCtrl,
      gsControlNumber: gsCtrl,
      stControlNumber: stCtrl,
      poNumber,
      poDate,
      buyerName: buyerName || 'CHEFAGENT MEMBER ESTATE',
      vendorName: vendorName || 'BROADLINE DISTRIBUTOR',
      vendorCode,
      lineItems,
      totalQuantity: totalQty,
      totalCost: Math.round(totalCost * 100) / 100,
      segmentCount: rawSegments.length,
    };

    return {
      isValid: errors.length === 0,
      ast,
      errors,
    };
  }

  /**
   * Transforms internal PurchaseOrder entity state into a standard Distributor REST/OpenAPI payload
   * (Sysco / US Foods REST JSON fallback adapter)
   */
  static buildRestJsonFallbackPayload(
    po: PurchaseOrder,
    clubMetadata?: { customerAccountNo?: string; deliveryDockNotes?: string }
  ): object {
    return {
      purchaseOrderMetadata: {
        orderNumber: po.poNumber,
        orderDate: new Date(po.orderDate).toISOString(),
        expectedDeliveryDate: new Date(po.expectedDeliveryDate).toISOString(),
        customerAccountCode: clubMetadata?.customerAccountNo || 'CLUB-WA-4819',
        vendorName: po.vendorName,
        totalCommittedValue: po.totalCost,
        currency: 'USD',
        deliveryInstructions: clubMetadata?.deliveryDockNotes || po.notes || 'Deliver to Kitchen Dock A before 09:00',
        systemSource: 'ChefAgent B2B EDI Gateway v2.4',
      },
      lines: po.items.map((item, idx) => ({
        lineNumber: idx + 1,
        sku: item.inventoryItemId,
        vendorItemCode: `VN-${item.inventoryItemId.slice(-6).toUpperCase()}`,
        productDescription: item.itemName,
        quantityOrdered: item.quantityOrdered,
        unitOfMeasure: item.unitOfMeasure,
        agreedUnitPrice: item.agreedUnitCost,
        extendedTotal: Math.round(item.quantityOrdered * item.agreedUnitCost * 100) / 100,
      })),
      auditEnvelope: {
        protocolVersion: '2.0.0-REST',
        idempotencyKey: `idemp-${po.id}-${po.orderDate}`,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Generates HMAC-SHA256 signature for raw webhook request buffers
   */
  static generateHmacSignature(rawBody: string | Buffer, secret: string): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  /**
   * Verifies incoming webhook HMAC-SHA256 signature against shared vendor secret
   */
  static verifyHmacSignature(
    rawBody: string | Buffer,
    receivedSignature: string,
    secret: string
  ): boolean {
    if (!receivedSignature || !secret) return false;
    const computed = this.generateHmacSignature(rawBody, secret);
    try {
      const cleanedReceived = receivedSignature.replace(/^sha256=/, '').trim();
      return crypto.timingSafeEqual(
        Buffer.from(computed, 'hex'),
        Buffer.from(cleanedReceived, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Maps internal ChefAgent units of measure to standard ANSI X12 EDI unit codes
   */
  private static mapUnitToX12UOM(unit: string): 'CA' | 'BX' | 'GA' | 'EA' | 'LB' | 'OZ' | 'PK' | 'QT' {
    const u = (unit || '').toUpperCase().trim();
    switch (u) {
      case 'CASE':
      case 'CS':
        return 'CA';
      case 'BOX':
      case 'BX':
        return 'BX';
      case 'GAL':
      case 'GALLON':
        return 'GA';
      case 'LB':
      case 'LBS':
      case 'POUND':
        return 'LB';
      case 'OZ':
      case 'OUNCE':
        return 'OZ';
      case 'PACK':
      case 'PK':
        return 'PK';
      case 'QT':
      case 'QUART':
        return 'QT';
      default:
        return 'EA';
    }
  }
}
