import { useMemo, useEffect, useState } from 'react';
import { Package, TrendingUp, ShoppingBag, CreditCard, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import * as staffDashboardBackend from '@/backend/staffDashboardBackend';

let receiptServiceModule = null;

export function StaffDashboard({ medicines = [], currentUser }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReceiptService = async () => {
    if (receiptServiceModule) return receiptServiceModule;
    try {
      const mod = await import('@/services/receiptService');
      receiptServiceModule = mod.receiptService;
      return receiptServiceModule;
    } catch (e) {
      console.warn('[StaffDashboard] Failed to load receiptService:', e);
      return null;
    }
  };

  const loadData = async () => {
    if (!currentUser?.pharmacyId) return;
    try {
      const svc = await loadReceiptService();
      if (svc) {
        const data = await svc.getRecentReceipts(currentUser.pharmacyId, 0);
        setReceipts(data || []);
      }
    } catch (err) {
      console.error('[StaffDashboard] Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    
    const handleRefresh = () => loadData();
    window.addEventListener('refresh-receipts', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-receipts', handleRefresh);
    };
  }, [currentUser?.pharmacyId]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    let sales = 0;
    let units = 0;
    let tx = 0;

    receipts.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (ts.toDateString() === todayStr) {
        sales += Number(r.grandTotal || 0);
        tx += 1;
        if (Array.isArray(r.items)) {
          r.items.forEach(it => {
            units += Number(it.quantity || 0);
          });
        }
      }
    });

    return { sales, units, tx };
  }, [receipts]);

  const hourlyData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i}:00`,
      sales: 0
    }));

    receipts.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (ts.toDateString() === todayStr) {
        const h = ts.getHours();
        hours[h].sales += Number(r.grandTotal || 0);
      }
    });

    const currentH = now.getHours();
    return hours.filter(h => h.sales > 0 || (h.hour >= 8 && h.hour <= Math.max(17, currentH)));
  }, [receipts]);

  const expiringSoon = useMemo(() => {
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);
    const items = [];
    medicines.forEach(m => {
      if (Array.isArray(m.batches)) {
        m.batches.forEach(b => {
          if (!b.expiryDate) return;
          const d = new Date(b.expiryDate);
          if (d >= today && d <= in30) {
            items.push({
              name: m.name,
              batch: b.batchNumber || b.id,
              expiry: d.toLocaleDateString(),
              days: Math.ceil((d.getTime() - today.getTime()) / 86400000)
            });
          }
        });
      }
    });
    return items.sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime()).slice(0, 5);
  }, [medicines]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  const formatPHP = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Real-time store performance for {new Date().toLocaleDateString()}</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-900">{formatPHP(stats.sales)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Units Sold</p>
            <p className="text-2xl font-bold text-gray-900">{stats.units}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.tx}</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Hourly Sales Performance
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            Sales Volume (PHP)
          </div>
        </div>
        <div className="h-[300px]">
          {hourlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
              No sales activity recorded for today.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:11}} tickFormatter={(v)=>`₱${v}`} />
                <RTooltip 
                  cursor={{fill:'#f8fafc'}}
                  content={({active, payload, label}) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-white border p-3 rounded-lg shadow-xl">
                          <p className="font-bold text-gray-900 border-b pb-1 mb-2">{label}</p>
                          <p className="text-blue-600 font-bold">{formatPHP(payload[0].value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Near Expiry Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Expiring Soon (30 Days)
        </h2>
        {expiringSoon.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No items expiring within the next 30 days.</p>
        ) : (
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3 text-left">Medicine</th>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-left">Expiry Date</th>
                  <th className="px-4 py-3 text-right">Countdown</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expiringSoon.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.batch}</td>
                    <td className="px-4 py-3 text-gray-600">{item.expiry}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.days <= 7 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.days} days left
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
