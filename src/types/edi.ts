/**
 * src/types/edi.ts
 *
 * Data contracts for Automated B2B Distributor EDI (ANSI X12 850/855/856)
 * and Vendor-native REST API Adapters (Sysco, US Foods).
 */

export type EDITransmissionStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'TRANSMITTED'
  | 'ACKNOWLEDGED'
  | 'SHIPPED'
  | 'FAILED';

export type EDITransmissionType = 'ANSI_X12_850' | 'REST_FALLBACK' | 'SFTP_ENVELOPE';

export interface EDIAuditLogEntry {
  id: string;
  timestamp: number;
  action: 'GENERATED' | 'QUEUED' | 'TRANSMITTED' | 'RETRY' | 'ACK_855' | 'ASN_856' | 'ERROR' | 'ANOMALY_RECORDED';
  documentType: '850' | '855' | '856' | 'REST_API';
  controlNumber: string;
  status: EDITransmissionStatus;
  details: string;
  payloadExcerpt?: string;
}

export interface X12EnvelopeHeaderConfig {
  senderIdQualifier: string;  // e.g., '01' (DUNS) or 'ZZ' (Mutually Defined)
  senderId: string;           // e.g., 'CHEFAGENTCLUB ' (15 chars fixed in ISA)
  receiverIdQualifier: string;// e.g., '01'
  receiverId: string;         // e.g., 'SYSCOCORP      '
  interchangeControlNumber: string; // 9 digits, e.g. '000001001'
  groupControlNumber: string;       // 1-9 digits, e.g. '1001'
  testIndicator: 'T' | 'P';         // 'T' for Test, 'P' for Production
}

export interface X12LineItem {
  lineId: string;
  lineNumber: number;
  quantity: number;
  unitOfMeasure: 'CA' | 'BX' | 'GA' | 'EA' | 'LB' | 'OZ' | 'PK' | 'QT';
  unitPrice: number;
  productQualifier: 'VN' | 'UP' | 'IN'; // Vendor Item #, UPC, Buyer Item #
  productCode: string;
  description: string;
}

export interface X12850AST {
  isaControlNumber: string;
  gsControlNumber: string;
  stControlNumber: string;
  poNumber: string;
  poDate: string; // YYYYMMDD
  buyerName: string;
  vendorName: string;
  vendorCode: string;
  lineItems: X12LineItem[];
  totalQuantity: number;
  totalCost: number;
  segmentCount: number;
}

export interface X12855AcknowledgmentPayload {
  poNumber: string;
  ediControlNumber: string;
  ackType: 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
  vendorTrackingId?: string;
  ackDate: string; // YYYYMMDD
  vendorNotes?: string;
  itemStatuses?: Array<{
    lineItemId: string;
    itemCode: string;
    status: 'ACCEPTED' | 'BACKORDERED' | 'SUBSTITUTED' | 'DELETED';
    acknowledgedQty: number;
    substituteItemCode?: string;
  }>;
}

export interface ASNLineItemRecord {
  lineId: string;
  itemCode: string;
  description: string;
  quantityOrdered: number;
  quantityShipped: number;
  unitOfMeasure: string;
  fillRatePercent: number;
  isSubstitute: boolean;
  substituteItemCode?: string;
}

export interface X12856ASNPayload {
  asnNumber: string;
  poNumber: string;
  ediControlNumber: string;
  shipmentDate: string;
  expectedDockDeliveryTimestamp: number;
  carrierName: string;
  trackingNumber: string;
  billOfLading: string;
  items: ASNLineItemRecord[];
  overallFillRatePercent: number;
}

export interface VendorRestAdapterConfig {
  vendorId: string;
  vendorName: string;
  apiBaseUrl: string;
  authType: 'BEARER_TOKEN' | 'API_KEY' | 'HMAC_SIGNATURE';
  apiKey?: string;
  sharedSecret?: string;
  supportsX12: boolean;
  supportsRestJson: boolean;
}

export interface EDITransmissionQueueItem {
  id: string;
  poId: string;
  poNumber: string;
  vendorName: string;
  format: EDITransmissionType;
  rawPayload: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptTimestamp?: number;
  nextRetryTimestamp: number;
  status: 'PENDING' | 'IN_FLIGHT' | 'COMPLETED' | 'CIRCUIT_BROKEN' | 'FAILED';
  circuitBreakerTripped: boolean;
  errorLog?: string;
}
