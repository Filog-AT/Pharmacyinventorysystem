import { useState } from 'react';
import { Search, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { medicineService } from '@/services/medicineService';
import * as salesBackend from '@/backend/salesBackend';

export function SalesPOS({ medicines, currentUser }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');

  const filteredMedicines = medicines.filter(m =>
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isBottle = (m) => {
    const form = String(m?.dosageForm || '').toLowerCase().trim();
    const unit = String(m?.unit || '').toLowerCase().trim();
    const bottleForms = new Set(['bottle']);
    const bottleUnits = new Set(['bottle', 'bottles']);
    return bottleForms.has(form) || bottleUnits.has(unit);
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

  const getMaxSaleQuantity = (m, unit) => {
    return salesBackend.getMaxSaleQuantity(m, unit);
  };

  const addToCart = (medicine) => {
    const defaultUnit = 'piece';
    const multiplier = getUnitMultiplier(medicine, defaultUnit);
    const unitPrice = (medicine.price || 0) * multiplier;
    const existing = cart.find(item => item.medicine.id === medicine.id && item.sellUnit === defaultUnit);
    if (existing) {
      const maxQ = getMaxSaleQuantity(medicine, defaultUnit);
      if (existing.quantity >= maxQ) {
        alert('Cannot add more than available stock');
        return;
      }
      setCart(cart.map(item =>
        item.medicine.id === medicine.id && item.sellUnit === defaultUnit
          ? { ...item, quantity: item.quantity + 1, unitPrice }
          : item
      ));
    } else {
      const maxQ = getMaxSaleQuantity(medicine, defaultUnit);
      if (maxQ <= 0) {
        alert('Out of stock');
        return;
      }
      setCart([...cart, { medicine, quantity: 1, sellUnit: defaultUnit, unitPrice }]);
    }
  };

  const updateQuantity = (medicineId, unit, delta) => {
    setCart(cart.map(item => {
      if (item.medicine.id === medicineId && item.sellUnit === unit) {
        const maxQ = getMaxSaleQuantity(item.medicine, unit);
        const newQty = item.quantity + delta;
        if (newQty > maxQ) {
          alert('Cannot exceed available stock');
          return item;
        }
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (medicineId, unit) => {
    setCart(cart.filter(item => !(item.medicine.id === medicineId && item.sellUnit === unit)));
  };

  const total = cart.reduce((sum, item) => sum + ((item.unitPrice || (item.medicine.price || 0)) * item.quantity), 0);
  const tax = total * 0.08; // 8% tax
  const grandTotal = total + tax;
  const change = Math.max(0, (Number(amountReceived) || 0) - grandTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if ((Number(amountReceived) || 0) < grandTotal) {
      alert('Insufficient amount received');
      return;
    }
    
    try {
      // Process stock reduction using FEFO
      const saleItems = cart.map(item => ({
        medicineId: item.medicine.id,
        categoryId: item.medicine.categoryId,
        quantity: item.quantity * getUnitMultiplier(item.medicine, item.sellUnit)
      }));

      await medicineService.processSale(currentUser.pharmacyId, saleItems);

      // Log sale completion to audit trail
      await auditService.logAction(currentUser.pharmacyId, {
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.name || 'Unknown User',
        userRole: currentUser?.role || 'unknown',
        action: 'SALE_COMPLETED',
        entityType: 'sale',
        entityId: 'POS-' + Date.now(),
        entityName: 'POS Sale',
        details: {
          itemsCount: cart.length,
          total: grandTotal,
          amountReceived: Number(amountReceived),
          change: change,
          customerName: customerName || 'Walk-in',
        },
      });

      alert(`Sale completed!\nCustomer: ${customerName || 'Walk-in'}\nTotal: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}\nChange: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(change)}`);
      setCart([]);
      setCustomerName('');
      setAmountReceived('');
      setShowCheckoutModal(false);
    } catch (error) {
      console.error('[SalesPOS] Checkout error:', error);
      alert(`Error processing sale: ${error.message}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales</h1>
        <p className="text-gray-600">Process sales and manage transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
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

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMedicines
              .sort((a, b) => {
                const da = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
                const db = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
                return da - db;
              })
              .map(medicine => (
              <button
                key={medicine.id}
                onClick={() => addToCart(medicine)}
                className="bg-card rounded-lg border p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
                disabled={(medicine.totalQuantity || 0) === 0}
              >
                <h3 className="font-semibold text-sm mb-1 truncate">{medicine.name || 'Unknown'}</h3>
                <p className="text-xs text-gray-500 mb-1">{medicine.category || 'N/A'}</p>
                <p className="text-[10px] text-gray-400 mb-2">{medicine.strength} - {medicine.dosageForm}</p>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-semibold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(medicine.price || 0)}</span>
                  <span className={`text-xs font-medium ${(medicine.totalQuantity || 0) <= (medicine.minStockLevel || 10) ? 'text-red-500' : 'text-gray-500'}`}>
                    {medicine.totalQuantity || 0} in stock
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Current Sale
            </h2>

            {/* Customer Name */}
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">Cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={`${item.medicine.id}-${item.sellUnit}`} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.medicine.name || 'Unknown'}</p>
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
                            <option value="piece">Unit</option>
                            {!isBottle(item.medicine) && getTabletCount(item.medicine) > 0 && (
                              <option value="blister">Blister</option>
                            )}
                            {!isBottle(item.medicine) && getBoxTabletCount(item.medicine) > 0 && (
                              <option value="box">Box</option>
                            )}
                          </select>
                          <p className="text-xs text-gray-500">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.unitPrice || (item.medicine.price || 0))} each</p>
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
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.sellUnit, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-semibold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format((item.unitPrice || (item.medicine.price || 0)) * item.quantity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t pt-4 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (8%):</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => setShowCheckoutModal(true)}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Checkout
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

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Complete Sale</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center mb-2 text-blue-800">
                  <span className="font-medium">Total Amount Due:</span>
                  <span className="text-2xl font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}</span>
                </div>
                <div className="text-xs text-blue-600 flex justify-between">
                  <span>Items: {cart.length}</span>
                  <span>Customer: {customerName || 'Walk-in'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Amount Received (PHP)</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-xl font-bold"
                  autoFocus
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center text-gray-800">
                  <span className="font-medium">Change:</span>
                  <span className={`text-2xl font-bold ${change > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(change)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCheckout}
                  disabled={!amountReceived || Number(amountReceived) < grandTotal}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-bold shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Confirm Sale
                </button>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-md hover:bg-gray-200 transition-colors font-bold"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
