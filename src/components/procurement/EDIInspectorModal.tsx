/**
 * src/components/procurement/EDIInspectorModal.tsx
 *
 * Interactive Enterprise EDI Inspector & Outbox Queue Modal for ChefAgent:
 * - Displays raw ANSI X12 850 interchange envelope with segment syntax explorer (ISA, GS, ST, BEG, PO1, CTT, SE, GE, IEA)
 * - Fallback distributor OpenAPI/REST JSON payload toggle
 * - Pre-flight par-level deficit validation pass
 * - Action buttons: "Transmit via X12 850", "Transmit via REST API", "Simulate 855 ACK", "Simulate 856 ASN"
 * - Inbound 856 ASN fill-rate, tracking number, and delta anomaly audit trail
 */
import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { EDIDocumentBuilder } from '../../services/edi/EDIDocumentBuilder';
import { EDIIntegrationService } from '../../services/edi/EDIIntegrationService';
import {
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  X,
  Code,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const EDIInspectorModal: React.FC = () => {
  const {
    isEdiInspectorOpen,
    setIsEdiInspectorOpen,
    activePOForEdiInspect,
    transmitPOViaEDI,
    simulate855Acknowledgment,
    simulate856ASN,
    ediAuditLogs,
    inventoryItems,
    establishmentProfile,
  } = useChef();

  const [activeFormatTab, setActiveFormatTab] = useState<'X12_850' | 'REST_JSON' | 'AUDIT_LOGS' | 'OUTBOX'>('X12_850');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isEdiInspectorOpen || !activePOForEdiInspect) return null;

  const po = activePOForEdiInspect;

  // Pre-flight deficit validation
  const preFlight = EDIIntegrationService.validatePreFlightDeficits(po, inventoryItems);

  // Generate real X12 document & AST
  const { ediDocument, ast, controlNumber } = EDIDocumentBuilder.buildX12850Document(po);
  const restPayload = EDIDocumentBuilder.buildRestJsonFallbackPayload(po);

  const handleTransmit = async (format: 'ANSI_X12_850' | 'REST_FALLBACK') => {
    setIsTransmitting(true);
    setStatusMessage(null);
    try {
      const res = await transmitPOViaEDI(po.id, format);
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleTrigger855 = () => {
    simulate855Acknowledgment(po.id, 'ACCEPTED');
    setStatusMessage(`Processed X12 855 Acknowledgment: PO transitioned to ACKNOWLEDGED / CONFIRMED.`);
  };

  const handleTrigger856 = () => {
    simulate856ASN(po.id);
    setStatusMessage(`Processed X12 856 ASN: PO transitioned to SHIPPED with dock delivery tracking.`);
  };

  const poAuditLogs = ediAuditLogs.filter(
    (log) => log.controlNumber === po.ediControlNumber || log.details.includes(po.poNumber)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  B2B Distributor EDI Pipeline Inspector
                </h3>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                    po.transmissionStatus === 'SHIPPED'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : po.transmissionStatus === 'ACKNOWLEDGED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : po.transmissionStatus === 'TRANSMITTED'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {po.transmissionStatus || 'DRAFT'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {po.poNumber} · {po.vendorName} · Total: {establishmentProfile.currencySymbol}
                {po.totalCost.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEdiInspectorOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pre-Flight Validation Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              <strong>Pre-Flight Par Deficit Pass:</strong> {preFlight.matchedDeficitCount} of{' '}
              {po.items.length} line items confirmed below par levels.
            </span>
          </div>
          {po.distributorTrackingId && (
            <div className="flex items-center gap-1.5 font-mono text-sky-300 bg-sky-950/60 px-2.5 py-1 rounded border border-sky-800/50">
              <Truck className="w-3.5 h-3.5" />
              <span>Tracking: {po.distributorTrackingId}</span>
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveFormatTab('X12_850')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeFormatTab === 'X12_850'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ANSI X12 850 Envelope
          </button>
          <button
            onClick={() => setActiveFormatTab('REST_JSON')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeFormatTab === 'REST_JSON'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Distributor REST Fallback (OpenAPI)
          </button>
          <button
            onClick={() => setActiveFormatTab('AUDIT_LOGS')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeFormatTab === 'AUDIT_LOGS'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>EDI Audit Trail</span>
            <span className="text-[10px] bg-black/20 px-1 rounded">{poAuditLogs.length}</span>
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeFormatTab === 'X12_850' && (
            <div className="space-y-4">
              {/* Segment Explorer Ribbon */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">ISA Control #</span>
                  <span className="font-bold text-amber-400">{ast.isaControlNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">GS Group #</span>
                  <span className="font-bold text-slate-200">{ast.gsControlNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">ST / SE Count</span>
                  <span className="font-bold text-slate-200">{ast.segmentCount} segments</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Line Qty</span>
                  <span className="font-bold text-emerald-400">{ast.totalQuantity} units</span>
                </div>
              </div>

              {/* Raw ANSI X12 850 Interchange Terminal Code View */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                  Raw Interchange Document (ISA* ... ~ IEA*)
                </span>
                <pre className="bg-black/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-amber-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                  {ediDocument}
                </pre>
              </div>

              {/* Parsed Line Item AST Table */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                  PO1 Segment Line Items Breakdown
                </span>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 font-mono text-[10px] text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 px-3">Line #</th>
                        <th className="py-2 px-3">Product Description</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">X12 UOM</th>
                        <th className="py-2 px-3">Unit Price</th>
                        <th className="py-2 px-3">Vendor Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {ast.lineItems.map((line) => (
                        <tr key={line.lineId}>
                          <td className="py-2 px-3">{line.lineNumber}</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">
                            {line.description}
                          </td>
                          <td className="py-2 px-3 font-bold text-amber-400">{line.quantity}</td>
                          <td className="py-2 px-3">{line.unitOfMeasure}</td>
                          <td className="py-2 px-3">${line.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-400">{line.productCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeFormatTab === 'REST_JSON' && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                OpenAPI / REST JSON Adapter Translation (Sysco / US Foods Direct)
              </span>
              <pre className="bg-black/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-sky-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
                {JSON.stringify(restPayload, null, 2)}
              </pre>
            </div>
          )}

          {activeFormatTab === 'AUDIT_LOGS' && (
            <div className="space-y-3">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                Audit Trail & Anomaly Verification Logs
              </span>
              {poAuditLogs.length === 0 ? (
                <div className="p-8 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                  No transmission audit events logged for this purchase order yet.
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {poAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-400">
                          [{log.action}] Doc: {log.documentType} (Ctrl: {log.controlNumber})
                        </span>
                        <span className="text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="font-sans text-slate-300 text-xs">{log.details}</p>
                      {log.payloadExcerpt && (
                        <div className="text-[10px] text-slate-500 truncate bg-black/40 p-1.5 rounded">
                          {log.payloadExcerpt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls & Simulation Toolbar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Simulation triggers for async distributor webhooks */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Vendor Inbound:</span>
            <button
              onClick={handleTrigger855}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition-colors"
              title="Simulate vendor sending 855 Acknowledgment webhook"
            >
              Simulate 855 ACK
            </button>
            <button
              onClick={handleTrigger856}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Simulate vendor sending 856 Advanced Shipping Notice webhook"
            >
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Simulate 856 ASN</span>
            </button>
          </div>

          {/* Outbound Transmit Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTransmit('REST_FALLBACK')}
              disabled={isTransmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 transition-colors"
            >
              Transmit REST API
            </button>
            <button
              onClick={() => handleTransmit('ANSI_X12_850')}
              disabled={isTransmitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Transmit via ANSI X12 850</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
