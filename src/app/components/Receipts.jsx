import { useState, useEffect } from 'react';
import { Search, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import { auditService } from '@/services/auditService';
 
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
 
  useEffect(() => {
    (async () => {
      const svc = await loadReceiptService();
      if (svc) {
        const data = await svc.getRecentReceipts(100);
        setReceipts(data);
      }
    })();
  }, []);
 
  const filteredMedicines = medicines.filter(m =>
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
 
  const addToCart = (medicine) => {
    const existing = cart.find(item => item.medicine.id === medicine.id);
    if (existing) {
      setCart(cart.map(item =>
        item.medicine.id === medicine.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { medicine, quantity: 1 }]);
    }
  };
 
  const updateQuantity = (medicineId, delta) => {
    setCart(cart.map(item =>
      item.medicine.id === medicineId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };
 
  const removeFromCart = (medicineId) => {
    setCart(cart.filter(item => item.medicine.id !== medicineId));
  };
 
  const total = cart.reduce((sum, item) => sum + ((item.medicine.price || 0) * item.quantity), 0);
  const tax = 0;
  const grandTotal = total;
 
  const handleCheckout = async () => {
    if (cart.length === 0) return;
 
    try {
      for (const item of cart) {
        await auditService.logAction({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'MEDICINE_SOLD',
          entityType: 'sale',
          entityId: item.medicine.id,
          entityName: item.medicine.name,
          details: {
            quantity: item.quantity,
            price: item.medicine.price,
            totalPrice: (item.medicine.price || 0) * item.quantity,
            customerName: customerName || 'Walk-in',
          },
        });
 
        const newQty = Math.max(0, (item.medicine.quantity || 0) - item.quantity);
        onUpdateMedicine?.(item.medicine.id, { ...item.medicine, quantity: newQty });
      }
 
      const svc = await loadReceiptService();
      if (svc) {
        const receiptId = await svc.addReceipt({
          timestamp: new Date(),
          customerName: customerName || 'Walk-in',
          items: cart.map((ci) => ({
            medicineId: ci.medicine.id,
            name: ci.medicine.name,
            quantity: ci.quantity,
            price: ci.medicine.price || 0,
          })),
          subtotal: total,
          tax: 0,
          grandTotal: total,
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
        });
        await auditService.logAction({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'SALE_COMPLETED',
          entityType: 'sale',
          entityId: receiptId,
          entityName: 'Receipt',
          details: {
            itemsCount: cart.length,
            subtotal: total,
            grandTotal: total,
            customerName: customerName || 'Walk-in',
          },
        });
        const data = await svc.getRecentReceipts(100);
        setReceipts(data);
      }
    } catch (error) {
      console.error('[Receipts] Checkout error:', error);
    }
 
    alert(`Sale completed!\nCustomer: ${customerName || 'Walk-in'}\nTotal: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}`);
    setCart([]);
    setCustomerName('');
  };
 
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Receipts</h1>
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
                disabled={(medicine.quantity || 0) === 0}
              >
                <h3 className="font-semibold text-sm mb-1 truncate">{medicine.name || 'Unknown'}</h3>
                <p className="text-xs text-gray-500 mb-2">{medicine.category || 'N/A'}</p>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-semibold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(medicine.price || 0)}</span>
                  <span className="text-xs text-gray-500">{medicine.quantity || 0} in stock</span>
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
                  <div key={item.medicine.id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.medicine.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.medicine.price || 0)} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.medicine.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-md">
                        <button
                          onClick={() => updateQuantity(item.medicine.id, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.medicine.id, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-semibold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format((item.medicine.price || 0) * item.quantity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
 
            <div className="space-y-2 border-t pt-4 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(total)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}</span>
              </div>
            </div>
 
            <div className="space-y-2">
              <button
                onClick={handleCheckout}
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
                const ok = confirm('Clear all receipts?');
                if (ok) {
                  await svc.clearAllReceipts();
                  setReceipts([]);
                }
              }
            }}
            className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Clear Receipts History
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
              const grand = r.grandTotal || subtotal;
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
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grand)}</span>
                      </div>
                    </div>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
