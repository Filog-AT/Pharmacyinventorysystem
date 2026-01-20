import { useEffect, useState } from 'react';
import { Plus, Pencil, CheckCircle, XCircle, Clock } from 'lucide-react';
import { orderService } from '@/services/orderService';
import { supplierService } from '@/services/supplierService';
import { ChartContainer } from '@/app/components/ui/chart';
 
export function OrdersSuppliers() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ orderNumber: '', itemName: '', quantity: 0, supplierName: '', status: 'Pending', date: new Date().toISOString().slice(0,10) });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '' });
 
  useEffect(() => {
    const load = async () => {
      try {
        const [o, s] = await Promise.all([orderService.getOrders(), supplierService.getSuppliers()]);
        if (o.length === 0 && s.length === 0) {
          await supplierService.addSupplier({ name: 'MediCorp Inc.', phone: '0917-123-4567' });
          await supplierService.addSupplier({ name: 'PharmaSupply Co.', phone: '0918-987-6543' });
          await supplierService.addSupplier({ name: 'HealthPlus', phone: '02-8555-1234' });
          await orderService.addOrder({
            orderNumber: 'ORD-001',
            items: [{ name: 'Amoxicillin', quantity: 100 }],
            supplierName: 'PharmaSupply Co.',
            status: 'Pending',
            date: new Date().toISOString().slice(0,10),
          });
          const [o2, s2] = await Promise.all([orderService.getOrders(), supplierService.getSuppliers()]);
          setOrders(o2);
          setSuppliers(s2);
        } else {
          setOrders(o);
          setSuppliers(s);
        }
      } catch (e) {
        console.error('[OrdersSuppliers] load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
 
  const statusBadge = (status) => {
    const base = 'px-2 py-1 rounded text-xs font-medium';
    if (status === 'Completed') return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
    if (status === 'Cancelled') return <span className={`${base} bg-red-100 text-red-700`}>Cancelled</span>;
    return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pending</span>;
  };
 
  const handleSetOrderStatus = async (order, status) => {
    try {
      const now = new Date().toISOString();
      const data =
        status === 'Completed'
          ? { status, deliveredOn: now }
          : status === 'Cancelled'
          ? { status, cancelledOn: now }
          : { status };
      await orderService.updateOrder(order.id, data);
      const o = await orderService.getOrders();
      setOrders(o);
    } catch (e) {
      console.error('[OrdersSuppliers] update order status error:', e);
    }
  };
 
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      await orderService.addOrder({
        orderNumber: orderForm.orderNumber || `ORD-${Math.floor(Math.random()*900+100)}`,
        items: [{ name: orderForm.itemName, quantity: Number(orderForm.quantity) || 0 }],
        supplierName: orderForm.supplierName,
        status: orderForm.status,
        date: orderForm.date,
      });
      const o = await orderService.getOrders();
      setOrders(o);
      setShowOrderForm(false);
      setOrderForm({ orderNumber: '', itemName: '', quantity: 0, supplierName: '', status: 'Pending', date: new Date().toISOString().slice(0,10) });
    } catch (e) {
      console.error('[OrdersSuppliers] add order error:', e);
    }
  };
 
  const handleSupplierEdit = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({ name: supplier.name, phone: supplier.phone || '' });
  };
  const handleSupplierSave = async () => {
    try {
      await supplierService.updateSupplier(editingSupplier.id, supplierForm);
      const s = await supplierService.getSuppliers();
      setSuppliers(s);
      setEditingSupplier(null);
    } catch (e) {
      console.error('[OrdersSuppliers] update supplier error:', e);
    }
  };
 
  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
 
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Supplier Orders</h2>
          <button onClick={() => setShowOrderForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            <Plus className="w-5 h-5" />
            New Order
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left p-3">ORDER ID</th>
                <th className="text-left p-3">ITEMS</th>
                <th className="text-left p-3">SUPPLIER</th>
                <th className="text-left p-3">STATUS</th>
                <th className="text-left p-3">Order Created</th>
                <th className="text-left p-3">Delivered/Cancelled On</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 text-gray-500">{o.orderNumber}</td>
                  <td className="p-3"><span className="font-semibold">{o.items?.[0]?.name || 'Item'}</span> x{o.items?.[0]?.quantity || 0}</td>
                  <td className="p-3">{o.supplierName}</td>
                  <td className="p-3">{statusBadge(o.status)}</td>
                  <td className="p-3">{o.date}</td>
                  <td className="p-3">
                    {o.status === 'Completed' && o.deliveredOn ? new Date(o.deliveredOn).toLocaleString() : o.status === 'Cancelled' && o.cancelledOn ? new Date(o.cancelledOn).toLocaleString() : ''}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded-md hover:bg-green-50"
                        onClick={() => handleSetOrderStatus(o, 'Completed')}
                        title="Mark Completed"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        className="p-2 rounded-md hover:bg-red-50"
                        onClick={() => handleSetOrderStatus(o, 'Cancelled')}
                        title="Mark Cancelled"
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td className="p-4 text-gray-500" colSpan={7}>No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Suppliers</h2>
        <div className="space-y-3">
          {suppliers.map(s => (
            <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-500">{s.phone || 'N/A'}</div>
              </div>
              <button onClick={() => handleSupplierEdit(s)} className="p-2 hover:bg-gray-100 rounded-md">
                <Pencil className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="text-gray-500">No suppliers yet</div>
          )}
        </div>
      </div>

      {showOrderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-lg font-semibold mb-4">New Supplier Order</div>
            <form onSubmit={handleOrderSubmit} className="space-y-3">
              <input className="w-full px-3 py-2 border rounded" placeholder="Order ID (optional)" value={orderForm.orderNumber} onChange={e => setOrderForm({ ...orderForm, orderNumber: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded" placeholder="Item name" value={orderForm.itemName} onChange={e => setOrderForm({ ...orderForm, itemName: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded" placeholder="Quantity" type="number" value={orderForm.quantity} onChange={e => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })} />
              <input className="w-full px-3 py-2 border rounded" placeholder="Supplier name" value={orderForm.supplierName} onChange={e => setOrderForm({ ...orderForm, supplierName: e.target.value })} />
              <select className="w-full px-3 py-2 border rounded" value={orderForm.status} onChange={e => setOrderForm({ ...orderForm, status: e.target.value })}>
                <option>Pending</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <input className="w-full px-3 py-2 border rounded" type="date" value={orderForm.date} onChange={e => setOrderForm({ ...orderForm, date: e.target.value })} />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Create Order</button>
                <button type="button" onClick={() => setShowOrderForm(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-lg font-semibold mb-4">Edit Supplier</div>
            <div className="space-y-3">
              <input className="w-full px-3 py-2 border rounded" placeholder="Name" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded" placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
              <div className="flex gap-3 pt-2">
                <button onClick={handleSupplierSave} className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Save</button>
                <button onClick={() => setEditingSupplier(null)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
