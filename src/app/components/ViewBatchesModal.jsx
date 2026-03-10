import { X, Trash2, Calendar, Package, Tag, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { medicineService } from '@/services/medicineService';

export function ViewBatchesModal({ medicine, currentUser, onClose, onDeleteBatch, onUpdateBatch }) {
  const [editingBatch, setEditingBatch] = useState(null);
  const [editFormData, setEditFormData] = useState({
    batchNumber: '',
    expiryDate: '',
    supplier: '',
    boxesReceived: 0,
    blistersPerBox: 1,
    unitsPerBlister: 1,
    purchasePrice: 0
  });
  const [salesSeries, setSalesSeries] = useState([]);
  const [forecast, setForecast] = useState({
    dailyUsage: 0,
    predicted30: 0,
    daysRemaining: null,
    stockoutDate: null,
    reorderPoint: 0,
    reorderAlert: false,
  });

  if (!medicine) return null;

  const today = new Date();
  const formatDateLabel = (d) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  const buildLast30DaysSeries = (records) => {
    const series = [];
    const map = new Map();
    (records || []).forEach(r => {
      const d = r?.date_sold && typeof r.date_sold.toDate === 'function' ? r.date_sold.toDate() : new Date(r.date_sold);
      const key = new Date(d);
      key.setHours(0, 0, 0, 0);
      const kStr = key.toISOString();
      const prev = map.get(kStr) || 0;
      map.set(kStr, prev + Number(r.quantity_sold || 0));
    });
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const kStr = new Date(d).toISOString();
      const units = map.get(kStr) || 0;
      series.push({ date: new Date(d), label: formatDateLabel(d), units });
    }
    return series;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!medicine?.id) return;
        const records = await medicineService.getSalesLastNDays(medicine.id, 30);
        if (!mounted) return;
        const series = buildLast30DaysSeries(records);
        setSalesSeries(series);
        const totalLast30 = series.reduce((sum, d) => sum + (Number(d.units) || 0), 0);
        const dailyUsage = totalLast30 / 30;
        const predicted30 = dailyUsage * 30;
        const currentStock = Number(medicine.totalQuantity || 0);
        const daysRemaining = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : null;
        const stockoutDate = daysRemaining != null ? new Date(today.getTime() + daysRemaining * 24 * 60 * 60 * 1000) : null;
        const reorderPoint = dailyUsage * 10;
        const reorderAlert = dailyUsage > 0 ? currentStock <= reorderPoint : false;
        setForecast({
          dailyUsage,
          predicted30,
          daysRemaining,
          stockoutDate,
          reorderPoint,
          reorderAlert,
        });
      } catch (e) {
        setSalesSeries([]);
        setForecast({
          dailyUsage: 0,
          predicted30: 0,
          daysRemaining: null,
          stockoutDate: null,
          reorderPoint: 0,
          reorderAlert: false,
        });
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [medicine?.id]);
  
  const getBatchStatus = (expiryDate, quantity) => {
    const exp = new Date(expiryDate);
    const isExpired = exp < today;
    const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isSoon = daysUntilExpiry <= 90 && daysUntilExpiry > 0;

    if (isExpired) return { label: 'Expired', color: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm ring-1 ring-rose-400/20' };
    if (isSoon) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm ring-1 ring-amber-400/20' };
    if (quantity === 0) return { label: 'Out of Stock', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    return { label: 'Healthy', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const handleEditClick = (batch) => {
    setEditingBatch(batch);
    setEditFormData({
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      supplier: batch.supplier,
      boxesReceived: batch.boxesReceived || 0,
      blistersPerBox: batch.blistersPerBox || 1,
      unitsPerBlister: batch.unitsPerBlister || 1,
      purchasePrice: batch.purchasePrice || 0
    });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (editingBatch) {
      onUpdateBatch(medicine.id, editingBatch.id, editFormData);
      setEditingBatch(null);
      try { window.dispatchEvent(new Event('refresh-medicines')); } catch {}
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{medicine.name}</h2>
            <div className="flex gap-3 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {medicine.strength}</span>
              <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {medicine.dosageForm}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {editingBatch ? (
            <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mb-6">
              <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit Batch: {editingBatch.batchNumber}
              </h3>
              <form onSubmit={handleUpdateSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number</label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={editFormData.batchNumber}
                    onChange={handleEditChange}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={editFormData.expiryDate}
                    onChange={handleEditChange}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={editFormData.supplier}
                    onChange={handleEditChange}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Boxes</label>
                  <input
                    type="number"
                    name="boxesReceived"
                    value={editFormData.boxesReceived}
                    onChange={handleEditChange}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                    min="0"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Blisters/Box</label>
                  <input
                    type="number"
                    name="blistersPerBox"
                    value={editFormData.blistersPerBox}
                    onChange={handleEditChange}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                    min="1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Units/Blister</label>
                  <input
                    type="number"
                    name="unitsPerBlister"
                    value={editFormData.unitsPerBlister}
                    onChange={handleEditChange}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                    min="1"
                  />
                </div>
                <div className="col-span-4 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBatch(null)}
                    className="px-4 py-1.5 border bg-white rounded-md text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Batch Records</h3>
              <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                Total Stock: {medicine.totalQuantity || 0} {medicine.unit}
              </span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="text-left p-3 font-semibold">Batch Number</th>
                  <th className="text-left p-3 font-semibold">Expiry Date</th>
                  <th className="text-right p-3 font-semibold">Remaining Stock</th>
                  <th className="text-right p-3 font-semibold">Total Stock</th>
                  <th className="text-left p-3 font-semibold">Supplier</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  {currentUser?.role !== 'staff' && (
                    <th className="text-right p-3 font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(!medicine.batches || medicine.batches.length === 0) ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No batch records found for this product.
                    </td>
                  </tr>
                ) : (
                  medicine.batches.map((batch) => {
                    const status = getBatchStatus(batch.expiryDate, batch.quantity);
                    const totalUnits = batch.initialQuantity != null
                      ? Number(batch.initialQuantity)
                      : (
                        (Number(batch.boxesReceived || 0) * Number(batch.blistersPerBox || 1) * Number(batch.unitsPerBlister || 1)) ||
                        (Number(batch.quantity || 0)) ||
                        null
                      );
                    return (
                      <tr key={batch.id} className={`hover:bg-gray-50 transition-colors ${editingBatch?.id === batch.id ? 'bg-blue-50' : ''}`}>
                        <td className="p-3 font-medium text-gray-900">{batch.batchNumber}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {batch.expiryDate}
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {batch.quantity} {medicine.unit}
                        </td>
                        <td className="p-3 text-right">
                          {totalUnits != null ? `${totalUnits} ${medicine.unit}` : '—'}
                        </td>
                        <td className="p-3 text-gray-600">{batch.supplier || 'N/A'}</td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                        {currentUser?.role !== 'staff' && (
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleEditClick(batch)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Batch"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete batch ${batch.batchNumber}?`)) {
                                    onDeleteBatch(medicine.id, batch.id);
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Batch"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Sales Trend (Last 30 days) */}
          <div className="mt-6 bg-white rounded-lg border p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Sales Trend (Last 30 days)</h4>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={salesSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="units" stroke="#3B82F6" name="Units sold" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors font-medium shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
