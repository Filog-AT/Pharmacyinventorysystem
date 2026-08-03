import { useState, useEffect } from 'react';
import { Search, ShoppingCart, X, Minus, Plus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { auditService } from '@/services/auditService';
import { medicineService } from '@/services/medicineService';
import * as salesBackend from '@/backend/salesBackend';
import * as receiptsBackend from '@/backend/receiptsBackend';

let receiptServiceModule = null;
const loadReceiptService = async () => {
  if (receiptServiceModule) return receiptServiceModule;
  try {
    const mod = await import('@/services/receiptService');
    receiptServiceModule = mod.receiptService;
    return receiptServiceModule;
  } catch (e) {
    console.warn('[Receipts] Failed to load receiptService:', e);
    return null;
  }
};
 
export function Receipts({ medicines, currentUser, onUpdateMedicine }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState({});
  const [amountReceived, setAmountReceived] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);
 
  useEffect(() => {
    if (!currentUser?.pharmacyId) return;
    (async () => {
      const svc = await loadReceiptService();
      if (svc) {
        const data = await svc.getReceipts(currentUser.pharmacyId, 100);
        setReceipts(data);
      }
    })();
  }, [currentUser?.pharmacyId]);
 
  const filteredMedicines = receiptsBackend.filterMedicines(medicines, searchTerm);

  const isBottle = (m) => {
    return receiptsBackend.isBottle(m);
  };
 
  const getUnitMultiplier = (m, unit) => {
    return salesBackend.getUnitMultiplier(m, unit);
  };
  const getTabletCount = (m) => {
    return salesBackend.getTabletCount(m);
  };
  const getBoxTabletCount = (m) => {
    return salesBackend.getBoxTabletCount(m);
  };
  const getAvailablePieces = (m) => {
    return Number(m.totalQuantity || 0);
  };
  const getMaxSaleQuantity = (m, unit) => {
    return salesBackend.getMaxSaleQuantity(m, unit);
  };

  const addToCart = (medicine) => {
    const defaultUnit = 'piece';
    const multiplier = getUnitMultiplier(medicine, defaultUnit);
    const unitPrice = (medicine.price || 0) * multiplier;
    const existing = cart.find(item => item.medicine.id === medicine.id && item.sellUnit === defaultUnit);
    if (existing) {
      setCart(prev => prev.map(item =>
        item.medicine.id === medicine.id && item.sellUnit === defaultUnit
          ? { ...item, quantity: item.quantity + 1, unitPrice }
          : item
      ));
    } else {
      setCart(prev => [...prev, { medicine, quantity: 1, sellUnit: defaultUnit, unitPrice }]);
    }
  };
 
  const updateQuantity = (medicineId, unit, delta) => {
    setCart(prev => prev.map(item => {
      if (item.medicine.id === medicineId && item.sellUnit === unit) {
        const maxQ = getMaxSaleQuantity(item.medicine, unit);
        const next = Math.max(1, item.quantity + delta);
        return { ...item, quantity: Math.min(next, Math.max(1, maxQ)) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };
 
  const removeFromCart = (medicineId, unit) => {
    setCart(cart.filter(item => !(item.medicine.id === medicineId && item.sellUnit === unit)));
  };
 
  const { subtotal, tax, grandTotal } = receiptsBackend.calculateTotals(cart);
 
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);

    try {
      // Process stock reduction using FEFO
      const saleItems = cart.map(item => ({
        medicineId: item.medicine.id,
        categoryId: item.medicine.categoryId,
        quantity: item.quantity * getUnitMultiplier(item.medicine, item.sellUnit)
      }));

      try {
        await medicineService.processSale(currentUser.pharmacyId, saleItems);
      } catch (err) {
        try {
          window.dispatchEvent(new CustomEvent('local-sale', { detail: { items: saleItems } }));
        } catch {}
      }

      const svc = await loadReceiptService();
      if (svc) {
        const payload = {
          timestamp: new Date(),
          customerName: customerName || 'Walk-in',
          items: cart.map((ci) => ({
            medicineId: ci.medicine.id,
            categoryId: ci.medicine.categoryId,
            name: ci.medicine.name,
            quantity: ci.quantity,
            unitSold: ci.sellUnit,
            price: ci.medicine.price || 0,
          })),
          subtotal: subtotal,
          tax: tax,
          grandTotal: grandTotal,
          amountReceived: Number(amountReceived),
          change: Number(amountReceived) - grandTotal,
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
        };
        const receiptId = await svc.addReceipt(currentUser.pharmacyId, payload);
        
        // Log general sale completion
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'SALE_COMPLETED',
          entityType: 'sale',
          entityId: receiptId,
          entityName: 'Receipt',
          details: {
            itemsCount: cart.length,
            subtotal: subtotal,
            tax: tax,
            grandTotal: grandTotal,
            amountReceived: Number(amountReceived),
            change: Number(amountReceived) - grandTotal,
            customerName: customerName || 'Walk-in',
          },
        });

        const data = await svc.getReceipts(currentUser.pharmacyId, 100);
        setReceipts(data);
        const createdReceipt = { id: receiptId, ...payload };
        try { await medicineService.getMedicines(currentUser.pharmacyId); } catch {}
        try { window.dispatchEvent(new Event('refresh-medicines')); } catch {}
        try { window.dispatchEvent(new Event('refresh-receipts')); } catch {}
        setSaleSuccess(createdReceipt);
        setCart([]);
        setCustomerName('');
        setAmountReceived('');
        return createdReceipt;
      }
    } catch (error) {
      console.error('[Receipts] Checkout error:', error);
      toast.error(`Error processing sale: ${error.message}`);
    } finally {
      setProcessing(false);
    }

    return null;
  };
 
  const formatMoney = (n) => receiptsBackend.formatMoney(n);
  const printHtml = (html) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 500);
        }
      };
    } catch (e) {
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      w.onload = () => {
        try { w.print(); } catch {}
      };
    }
  };
  const buildReceiptHtml = (r) => {
    return receiptsBackend.buildReceiptHtml(r, formatMoney);
  };
  const handlePrintReceipt = (r) => {
    const html = buildReceiptHtml(r);
    printHtml(html);
  };
  const handleDownloadReceipt = (r) => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp || Date.now());
    const safeTs = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 48;
    doc.setFontSize(16);
    doc.text('PharmaTrack', 40, y);
    y += 8;
    doc.setFontSize(10);
    doc.text('Customer Invoice', 40, y);
    y += 22;
    doc.setFontSize(12);
    doc.text(`Invoice ${r.id ? '#'+r.id : ''}`, 40, y);
    y += 16;
    doc.text(`Date: ${ts.toLocaleString()}`, 40, y);
    y += 16;
    doc.text(`Customer: ${r.customerName || 'Walk-in'}`, 40, y);
    y += 24;
    doc.setFontSize(12);
    doc.text('Item', 40, y);
    doc.text('Qty', 300, y, { align: 'right' });
    doc.text('Price', 400, y, { align: 'right' });
    doc.text('Total', 520, y, { align: 'right' });
    y += 10;
    doc.setLineWidth(0.5);
    doc.line(40, y, 540, y);
    y += 16;
    const items = Array.isArray(r.items) ? r.items : [];
    doc.setFontSize(11);
    items.forEach((it) => {
      const lineHeight = 16;
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0);
      const total = qty * price;
      const name = String(it.name || '');
      doc.text(name.length > 40 ? name.slice(0, 40) + '…' : name, 40, y);
      doc.text(String(qty), 300, y, { align: 'right' });
      doc.text(formatMoney(price), 400, y, { align: 'right' });
      doc.text(formatMoney(total), 520, y, { align: 'right' });
      y += lineHeight;
    });
    y += 8;
    doc.line(360, y, 540, y);
    y += 18;
    const subtotal = Number(r.subtotal || 0);
    const tax = Number(r.tax || 0);
    const grand = Number(r.grandTotal || subtotal + tax);
    const received = Number(r.amountReceived || 0);
    const change = Number(r.change || 0);
    doc.setFontSize(12);
    doc.text('Subtotal', 400, y);
    doc.text(formatMoney(subtotal), 540, y, { align: 'right' });
    y += 18;
    doc.text('VAT (12%)', 400, y);
    doc.text(formatMoney(tax), 540, y, { align: 'right' });
    y += 18;
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('Total', 400, y);
    doc.text(formatMoney(grand), 540, y, { align: 'right' });
    doc.setTextColor(17, 24, 39); // Back to black
    
    if (received > 0) {
      y += 18;
      doc.setFontSize(12);
      doc.text('Cash Received', 400, y);
      doc.text(formatMoney(received), 540, y, { align: 'right' });
      y += 18;
      doc.text('Change', 400, y);
      doc.text(formatMoney(change), 540, y, { align: 'right' });
    }
    
    y += 24;
    doc.setFontSize(10);
    doc.text(`Cashier: ${r.userName || 'Unknown'}`, 40, y);
    const filename = `receipt-${r.id || safeTs}.pdf`;
    doc.save(filename);
  };
  const buildCurrentSaleReceipt = () => {
    return {
      id: undefined,
      timestamp: new Date(),
      customerName: customerName || 'Walk-in',
      items: cart.map(ci => ({
        medicineId: ci.medicine.id,
        name: ci.medicine.name,
        quantity: ci.quantity,
        price: ci.medicine.price || 0
      })),
      subtotal: subtotal,
      tax: tax,
      grandTotal: grandTotal,
      userId: currentUser?.uid || 'unknown',
      userName: currentUser?.name || 'Unknown User',
    };
  };
  const handlePrintAndComplete = async () => {
    setCheckoutModalOpen(false);
    const receiptObj = await handleCheckout();
    if (receiptObj) {
      handlePrintReceipt(receiptObj);
    }
  };
  const handleCompleteSaleOnly = async () => {
    setCheckoutModalOpen(false);
    await handleCheckout();
  };
 
  return (
    <div className="space-y-6">
      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">Processing Sale</h2>
          <p className="text-gray-500">Please wait while we finalize the transaction...</p>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales</h1>
        <p className="text-gray-600">Process sales and manage transactions</p>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
          </div>
 
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMedicines.map(medicine => (
              <button
                key={medicine.id}
                onClick={() => addToCart(medicine)}
                className="bg-card rounded-lg border p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
                disabled={(medicine.totalQuantity || 0) === 0}
              >
                <h3 className="font-semibold text-sm mb-1 truncate">{medicine.name || 'Unknown'}</h3>
                {medicine.strength && (
                  <p className="text-[10px] text-gray-400 -mt-1">{medicine.strength} • {medicine.dosageForm}</p>
                )}
                <p className="text-xs text-gray-500 mb-2">{medicine.category || 'N/A'}</p>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-semibold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(medicine.price || 0)}</span>
                  <span className="text-xs text-gray-500">{medicine.totalQuantity || 0} in stock</span>
                </div>
              </button>
            ))}
          </div>
        </div>
 
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Current Sale
            </h2>
 
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
 
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">Cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={`${item.medicine.id}-${item.sellUnit}`} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.medicine.name || 'Unknown'} 
                          <span className="text-[10px] text-gray-400 ml-1">({item.medicine.strength})</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <select
                            value={item.sellUnit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              setCart(prev => prev.map(ci => {
                                if (ci.medicine.id === item.medicine.id && ci.sellUnit === item.sellUnit) {
                                  const m = getUnitMultiplier(ci.medicine, newUnit);
                                  const up = (ci.medicine.price || 0) * m;
                                  const maxQ = getMaxSaleQuantity(ci.medicine, newUnit);
                                  const qty = Math.min(ci.quantity, Math.max(1, maxQ));
                                  return { ...ci, sellUnit: newUnit, unitPrice: up, quantity: qty };
                                }
                                return ci;
                              }));
                            }}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="piece">{item.medicine.unit === 'capsules' ? 'Capsule' : item.medicine.unit === 'tablets' ? 'Tablet' : 'Unit'}</option>
                            {!isBottle(item.medicine) && getTabletCount(item.medicine) > 0 && (
                              <option value="blister">Blister/Strip</option>
                            )}
                            {!isBottle(item.medicine) && getBoxTabletCount(item.medicine) > 0 && (
                              <option value="box">Box</option>
                            )}
                          </select>
                          <p className="text-xs text-gray-500">
                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
                              item.unitPrice || ((item.medicine.price || 0) * getUnitMultiplier(item.medicine, item.sellUnit))
                            )} per {item.sellUnit}
                          </p>
                          {item.sellUnit === 'blister' && getTabletCount(item.medicine) > 0 && (
                            <span className="text-xs text-gray-500">
                              ({getTabletCount(item.medicine)} tablets)
                            </span>
                          )}
                          {item.sellUnit === 'box' && getBoxTabletCount(item.medicine) > 0 && (
                            <span className="text-xs text-gray-500">
                              ({getBoxTabletCount(item.medicine)} tablets)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.medicine.id, item.sellUnit)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-md">
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.sellUnit, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={
                            quantityInputs[`${item.medicine.id}-${item.sellUnit}`] !== undefined
                              ? quantityInputs[`${item.medicine.id}-${item.sellUnit}`]
                              : String(item.quantity)
                          }
                          onChange={(e) => {
                            const key = `${item.medicine.id}-${item.sellUnit}`;
                            const val = e.target.value;
                            setQuantityInputs(prev => ({ ...prev, [key]: val }));
                          }}
                          onBlur={(e) => {
                            const key = `${item.medicine.id}-${item.sellUnit}`;
                            const raw = e.target.value;
                            const parsed = parseInt(raw, 10);
                            setQuantityInputs(prev => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                            if (!isNaN(parsed)) {
                              setCart(prev => prev.map(ci => {
                                if (ci.medicine.id === item.medicine.id && ci.sellUnit === item.sellUnit) {
                                  const maxQ = getMaxSaleQuantity(ci.medicine, ci.sellUnit);
                                  const v = Math.max(1, Math.min(parsed, Math.max(1, maxQ)));
                                  return { ...ci, quantity: v };
                                }
                                return ci;
                              }));
                            }
                          }}
                          className="w-16 text-center font-medium bg-white border rounded"
                        />
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.sellUnit, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-semibold">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
                          (item.unitPrice || (item.medicine.price || 0)) * item.quantity
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
 
            <div className="space-y-2 border-t pt-4 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (12%):</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}</span>
              </div>
            </div>
 
            <div className="space-y-2">
              <button
                onClick={() => setCheckoutModalOpen(true)}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Complete Sale
              </button>
              <button
                onClick={() => setCart([])}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
 
      <div className="bg-card rounded-lg border p-4 mt-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-2">Receipts History</h2>
        <div className="mb-2">
          <button
            onClick={async () => {
              const svc = await loadReceiptService();
              if (svc) {
                if (!window.confirm('Clear all receipts?')) return;
                await svc.clearAllReceipts();
                setReceipts([]);
              }
            }}
            className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Clear Receipts History
          </button>
          <button
            onClick={() => {
              if (!Array.isArray(receipts) || receipts.length === 0) {
                toast.error('No receipts to download');
                return;
              }
              const csv = receiptsBackend.generateReceiptsCSV(receipts);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'receipts-history.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="ml-2 px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            Download All (CSV)
          </button>
        </div>
        <div className="space-y-2">
          {receipts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No receipts recorded</p>
          ) : (
            receipts.map((r) => {
              const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
              const label = `${ts.toLocaleString()}${r.customerName && r.customerName !== 'Walk-in' ? ' - ' + r.customerName : ''}`;
              const subtotal = r.subtotal || 0;
              const tax = r.tax || 0;
              const grand = r.grandTotal || (subtotal + tax);
              return (
                <details key={r.id || label} className="bg-card rounded-md border p-2">
                  <summary className="cursor-pointer text-sm font-medium">{label}</summary>
                  <div className="mt-2 space-y-2">
                    <div className="space-y-1">
                      {Array.isArray(r.items) && r.items.map((it, idx) => (
                        <div key={(it.medicineId || '') + '-' + idx} className="flex justify-between text-sm">
                          <span>{it.name} x{it.quantity}</span>
                          <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format((it.price || 0) * (it.quantity || 0))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>VAT (12%)</span>
                        <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(tax)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grand)}</span>
                      </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handlePrintReceipt(r)}
                        className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                        aria-label="Print receipt"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(r)}
                        className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        aria-label="Download receipt"
                      >
                        Download
                      </button>
                    </div>
                    </div>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </div>
 
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Confirm Sale</h2>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600">Customer: {customerName || 'Walk-in'}</div>
              <div className="space-y-1">
                {cart.map((ci, idx) => (
                  <div key={ci.medicine.id + '-' + ci.sellUnit + '-' + idx} className="flex justify-between text-sm">
                    <span>{ci.medicine.name} ({ci.medicine.strength}) x{ci.quantity} {ci.sellUnit}</span>
                    <span>{formatMoney((ci.unitPrice || (ci.medicine.price || 0)) * ci.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (12%)</span>
                  <span>{formatMoney(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 text-blue-600">
                  <span>Total</span>
                  <span>{formatMoney(grandTotal)}</span>
                </div>
                
                <div className="pt-4 space-y-2 border-t">
                  <label htmlFor="cashReceived" className="block text-sm font-medium text-gray-700">
                    Cash Received (₱)
                  </label>
                  <input
                    type="number"
                    id="cashReceived"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Enter amount received"
                    className="w-full px-4 py-2 border-2 border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                    autoFocus
                  />
                  {amountReceived && Number(amountReceived) >= grandTotal && (
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200 mt-2">
                      <span className="text-sm font-medium text-green-700">Change:</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatMoney(Number(amountReceived) - grandTotal)}
                      </span>
                    </div>
                  )}
                  {amountReceived && Number(amountReceived) < grandTotal && (
                    <p className="text-sm text-red-500 font-medium">Insufficient amount</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintAndComplete}
                    disabled={processing || !amountReceived || Number(amountReceived) < grandTotal}
                    className="flex-1 px-3 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-bold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : 'Print & Complete Sale'}
                  </button>
                  <button
                    onClick={handleCompleteSaleOnly}
                    disabled={processing || !amountReceived || Number(amountReceived) < grandTotal}
                    className="flex-1 px-3 py-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-bold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : 'Complete Sale'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setCheckoutModalOpen(false);
                    setAmountReceived('');
                  }}
                  className="w-full px-3 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {saleSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Sale Completed</h3>
              <p className="text-sm text-gray-600">Customer: {saleSuccess.customerName || 'Walk-in'}</p>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(saleSuccess.subtotal || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (12%)</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(saleSuccess.tax || 0))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-1">
                <span>Total</span>
                <span className="text-blue-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(saleSuccess.grandTotal || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cash Received</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(saleSuccess.amountReceived || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Change</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(saleSuccess.change || 0))}</span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Items</div>
                <div className="max-h-40 overflow-y-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">Name</th>
                        <th className="px-2 py-1 text-right">Qty</th>
                        <th className="px-2 py-1 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(saleSuccess.items || []).map((it, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1">{it.name}</td>
                          <td className="px-2 py-1 text-right">{Number(it.quantity || 0)}</td>
                          <td className="px-2 py-1 text-right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(it.price || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  try {
                    const html = buildReceiptHtml(saleSuccess);
                    printHtml(html);
                  } catch {}
                }}
                className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setSaleSuccess(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
