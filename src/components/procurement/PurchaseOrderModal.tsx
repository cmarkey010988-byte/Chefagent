import React, { useState } from 'react';
import { useChef } from '../../context/ChefContext';
import { PurchaseOrder, POStatus, PurchaseOrderItem } from '../../types';
import {
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  DollarSign,
  AlertTriangle,
  Receipt,
  X,
  Sparkles,
  Layers,
  Code,
  Send,
  ShieldCheck,
} from 'lucide-react';

export const PurchaseOrderView: React.FC = () => {
  const {
    purchaseOrders,
    createPurchaseOrder,
    updatePOStatus,
    receiveInvoicePO,
    inventoryItems,
    establishmentProfile,
    activeDraftPOForReview,
    setActiveDraftPOForReview,
    isPurchaseOrderModalOpen,
    setIsPurchaseOrderModalOpen,
    setIsEdiInspectorOpen,
    setActivePOForEdiInspect,
    transmitPOViaEDI,
  } = useChef();

  const [selectedPOForReceiving, setSelectedPOForReceiving] = useState<PurchaseOrder | null>(null);
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);

  // Receiving state
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [receivedItemsState, setReceivedItemsState] = useState<
    Array<{ inventoryItemId: string; receivedQty: number; actualCost: number }>
  >([]);

  // New PO state
  const [newVendor, setNewVendor] = useState('Sysco Metro Foodservice');
  const [newVendorContact, setNewVendorContact] = useState('orders@syscometro.com');
  const [expectedDays, setExpectedDays] = useState(1);
  const [selectedInventoryItemsForPO, setSelectedInventoryItemsForPO] = useState<
    Array<{ id: string; name: string; qty: number; unit: string; cost: number }>
  >([]);
  const [poNotes, setPoNotes] = useState('');

  // Sync with AI Executive Workflow triggers
  React.useEffect(() => {
    if (activeDraftPOForReview) {
      setNewVendor(activeDraftPOForReview.vendorName);
      setNewVendorContact(activeDraftPOForReview.vendorContact || 'orders@vendor.com');
      setSelectedInventoryItemsForPO(
        activeDraftPOForReview.items.map((i) => ({
          id: i.inventoryItemId,
          name: i.itemName,
          qty: i.quantityOrdered,
          unit: i.unitOfMeasure,
          cost: i.agreedUnitCost,
        }))
      );
      setPoNotes(activeDraftPOForReview.notes || '');
      setIsNewPOModalOpen(true);
    }
  }, [activeDraftPOForReview]);

  React.useEffect(() => {
    if (isPurchaseOrderModalOpen) {
      setIsNewPOModalOpen(true);
    }
  }, [isPurchaseOrderModalOpen]);

  // Auto-generate items below reorder point
  const lowStockItems = inventoryItems.filter(
    (item) => !item.isArchived && item.currentOnHandQuantity <= item.reorderPointQuantity
  );

  const handleOpenAutoPO = () => {
    const itemsToAdd = lowStockItems.map((item) => ({
      id: item.id,
      name: item.ingredientName,
      qty: Math.max(1, Math.round(item.parLevelQuantity - item.currentOnHandQuantity)),
      unit: item.unitOfMeasure,
      cost: item.unitCost,
    }));
    setSelectedInventoryItemsForPO(itemsToAdd);
    setIsNewPOModalOpen(true);
  };

  const handleCreatePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInventoryItemsForPO.length === 0) return;

    const totalCost = selectedInventoryItemsForPO.reduce((acc, i) => acc + i.qty * i.cost, 0);

    createPurchaseOrder({
      vendorName: newVendor,
      vendorContact: newVendorContact,
      orderDate: Date.now(),
      expectedDeliveryDate: Date.now() + expectedDays * 86400000,
      status: 'SUBMITTED',
      totalCost: Math.round(totalCost * 100) / 100,
      notes: poNotes.trim() || undefined,
      items: selectedInventoryItemsForPO.map((item) => ({
        inventoryItemId: item.id,
        itemName: item.name,
        quantityOrdered: item.qty,
        unitOfMeasure: item.unit,
        agreedUnitCost: item.cost,
      })),
    });

    closeNewPOModal();
    setSelectedInventoryItemsForPO([]);
    setPoNotes('');
  };

  const closeNewPOModal = () => {
    setIsNewPOModalOpen(false);
    setIsPurchaseOrderModalOpen(false);
    setActiveDraftPOForReview(null);
  };

  const handleOpenReceivingModal = (po: PurchaseOrder) => {
    setSelectedPOForReceiving(po);
    setInvoiceNumberInput(po.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
    setReceivedItemsState(
      po.items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        receivedQty: i.quantityReceived !== undefined ? i.quantityReceived : i.quantityOrdered,
        actualCost: i.actualUnitCost !== undefined ? i.actualUnitCost : i.agreedUnitCost,
      }))
    );
  };

  const handleConfirmReceivingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForReceiving) return;

    receiveInvoicePO(
      selectedPOForReceiving.id,
      invoiceNumberInput.trim() || 'INV-PENDING',
      receivedItemsState
    );

    setSelectedPOForReceiving(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Procurement KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending POs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Purchase Orders</span>
            <span className="font-mono text-indigo-700 font-bold">In-Flight Logistics</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {purchaseOrders.filter((p) => p.status === 'SUBMITTED' || p.status === 'DRAFT').length}
              <span className="text-sm font-sans font-normal text-slate-400"> active orders</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {purchaseOrders.filter((p) => p.status === 'RECEIVED').length} received this cycle
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            ✓ Supplier accounts: US Foods, Sysco, EcoLab, Local Co-ops
          </div>
        </div>

        {/* Low Stock Replenishment Alert */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Reorder Threshold
            </span>
            <span className="font-mono text-xs text-amber-600 font-bold">{lowStockItems.length} Low Par</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {lowStockItems.length} <span className="text-sm font-sans font-normal text-slate-400">SKUs below par</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Items require immediate purchase orders.
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAutoPO}
            disabled={lowStockItems.length === 0}
            className="w-full min-h-[38px] px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Draft Supplier PO</span>
          </button>
        </div>

        {/* Total Cycle Spend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Committed PO Spend</span>
            <span className="font-mono text-xs text-slate-500">All Vendors</span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {establishmentProfile.currencySymbol}
              {purchaseOrders
                .reduce((acc, p) => acc + p.totalCost, 0)
                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Food & non-food facility replenishment
            </div>
          </div>
          <div className="text-[11px] text-slate-500">Invoice reconciliation status: 100% matched</div>
        </div>

        {/* Create Manual PO Action */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Vendor Procurement
          </div>
          <div className="my-2 text-xs text-slate-600 leading-relaxed">
            Generate customized supplier POs and check in dock delivery invoices.
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedInventoryItemsForPO([]);
              setIsNewPOModalOpen(true);
            }}
            className="w-full min-h-[44px] px-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Active Supplier Purchase Orders & Deliveries
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track vendor fulfillment, dock receiving audits, and live inventory cost updates.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            {purchaseOrders.length} POs Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4">Line Items</th>
                <th className="py-3 px-4">PO Status</th>
                <th className="py-3 px-4">EDI Transmission</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{po.vendorName}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                      {po.vendorContact || '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(po.orderDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800 text-[11px]">
                    {new Date(po.expectedDeliveryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-medium text-slate-800">{po.items.length} items</span>
                    <div className="text-[10px] text-slate-400 truncate max-w-xs">
                      {po.items.map((i) => i.itemName).join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {po.status === 'RECEIVED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> RECEIVED
                      </span>
                    ) : po.status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                        <Truck className="w-3.5 h-3.5" /> SUBMITTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
                        DRAFT
                      </span>
                    )}
                  </td>
                  {/* EDI Transmission Status & Tracking */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border w-fit ${
                          po.transmissionStatus === 'SHIPPED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : po.transmissionStatus === 'ACKNOWLEDGED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : po.transmissionStatus === 'TRANSMITTED'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {po.transmissionStatus || 'DRAFT'}
                      </span>
                      {po.distributorTrackingId && (
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]" title={po.distributorTrackingId}>
                          Trk: {po.distributorTrackingId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {establishmentProfile.currencySymbol}{po.totalCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* Transmit via EDI Webhook Button */}
                      {(!po.transmissionStatus || po.transmissionStatus === 'DRAFT' || po.transmissionStatus === 'FAILED') && (
                        <button
                          type="button"
                          onClick={async () => {
                            await transmitPOViaEDI(po.id, 'ANSI_X12_850');
                          }}
                          className="min-h-[36px] px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition-all shadow-xs inline-flex items-center gap-1"
                          title="Transmit via EDI Webhook (ANSI X12 850)"
                        >
                          <Send className="w-3 h-3" />
                          <span>EDI Transmit</span>
                        </button>
                      )}

                      {/* Inspect X12 Envelope */}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePOForEdiInspect(po);
                          setIsEdiInspectorOpen(true);
                        }}
                        className="min-h-[36px] px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all inline-flex items-center gap-1"
                        title="Inspect raw ANSI X12 850 envelope & ASN reconciliation"
                      >
                        <Code className="w-3 h-3 text-indigo-700" />
                        <span>X12 EDI</span>
                      </button>

                      {/* Check In Invoice */}
                      {po.status !== 'RECEIVED' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReceivingModal(po)}
                          className="min-h-[36px] px-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Check In</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded">
                          Matched
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Receiving Audit Modal */}
      {selectedPOForReceiving && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-700" />
                  <h3 className="text-base font-black text-slate-900">
                    Loading Dock Invoice Receiving Audit
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPOForReceiving.poNumber} · {selectedPOForReceiving.vendorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPOForReceiving(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceivingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor Invoice / BOL Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-USF-99201"
                  value={invoiceNumberInput}
                  onChange={(e) => setInvoiceNumberInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Received Quantity & Invoice Unit Cost Reconciliation
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Ordered</th>
                        <th className="py-2.5 px-3">Actual Received</th>
                        <th className="py-2.5 px-3">Actual Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPOForReceiving.items.map((item, idx) => {
                        const stateItem = receivedItemsState.find(
                          (r) => r.inventoryItemId === item.inventoryItemId
                        );
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.itemName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {item.quantityOrdered} {item.unitOfMeasure}
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.1"
                                value={stateItem?.receivedQty || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setReceivedItemsState((prev) =>
                                    prev.map((r) =>
                                      r.inventoryItemId === item.inventoryItemId
                                        ? { ...r, receivedQty: val }
                                        : r
                                    )
                                  );
                                }}
                                className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
                                required
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1 font-mono">
                                <span>{establishmentProfile.currencySymbol}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={stateItem?.actualCost || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setReceivedItemsState((prev) =>
                                      prev.map((r) =>
                                        r.inventoryItemId === item.inventoryItemId
                                          ? { ...r, actualCost: val }
                                          : r
                                      )
                                    );
                                  }}
                                  className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
                                  required
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                <span>Atomic Inventory Action:</span>
                <span className="font-bold">
                  On-hand counts will increment & wholesale unit costs will update dynamically.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPOForReceiving(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all"
                >
                  Confirm Dock Check-In & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Draft Supplier Purchase Order
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send replenishment request to broadline or specialty vendors.
                </p>
              </div>
              <button
                type="button"
                onClick={closeNewPOModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePOSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Partner
                  </label>
                  <select
                    value={newVendor}
                    onChange={(e) => {
                      setNewVendor(e.target.value);
                      if (e.target.value.includes('EcoLab')) {
                        setNewVendorContact('support@ecolab.com · 1-800-352-5326');
                      } else if (e.target.value.includes('Seafood')) {
                        setNewVendorContact('orders@pacseafood.com · (555) 782-4110');
                      } else {
                        setNewVendorContact('rep.dave@usfoods.com · (555) 234-9988');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value="US Foods Broadline">US Foods Broadline</option>
                    <option value="Sysco Food Services">Sysco Food Services</option>
                    <option value="EcoLab Facility Chemicals">EcoLab Facility Chemicals</option>
                    <option value="Pacific Seafood & Catch">Pacific Seafood & Catch</option>
                    <option value="Local Produce Co-op">Local Produce Co-op</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Contact / Rep
                  </label>
                  <input
                    type="text"
                    value={newVendorContact}
                    onChange={(e) => setNewVendorContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono text-xs focus:outline-hidden focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Delivery (Days from today)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={expectedDays}
                  onChange={(e) => setExpectedDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              {/* Line items picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Order Line Items ({selectedInventoryItemsForPO.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const firstAvailable = inventoryItems.find(
                        (i) => !selectedInventoryItemsForPO.some((s) => s.id === i.id)
                      );
                      if (firstAvailable) {
                        setSelectedInventoryItemsForPO((prev) => [
                          ...prev,
                          {
                            id: firstAvailable.id,
                            name: firstAvailable.ingredientName,
                            qty: 5,
                            unit: firstAvailable.unitOfMeasure,
                            cost: firstAvailable.unitCost,
                          },
                        ]);
                      }
                    }}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Inventory SKU
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Order Qty</th>
                        <th className="py-2 px-3">Agreed Cost</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInventoryItemsForPO.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSelectedInventoryItemsForPO((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, qty: val } : p))
                                  );
                                }}
                                className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs font-mono"
                              />
                              <span className="text-[11px] text-slate-500">{item.unit}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {establishmentProfile.currencySymbol}{item.cost.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedInventoryItemsForPO((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedInventoryItemsForPO.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            No items added yet. Click "+ Add Inventory SKU" or auto-draft from low stock.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes / Dock Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning delivery before 09:30, check temp on meat PSMO"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedInventoryItemsForPO.length === 0}
                  className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all"
                >
                  Transmit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
