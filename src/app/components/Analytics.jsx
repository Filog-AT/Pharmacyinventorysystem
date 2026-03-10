import { useEffect, useMemo, useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip as RTooltip } from 'recharts';
import { SalesByMedicineStats } from '@/app/components/SalesByMedicineStats';

export function Analytics({ medicines = [], categories = [] }) {
  const [receipts, setReceipts] = useState([]);
  const [timeScale, setTimeScale] = useState('day'); // day|week|month
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMedicine, setFilterMedicine] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [forecastData, setForecastData] = useState({ dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0 });
  const CategoryTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const cat = payload[0]?.name || payload[0]?.payload?.name;
    const catMeds = medicines
      .filter(m => (filterCategory === 'All' || m.category === filterCategory) && (m.category || 'Uncategorized') === cat)
      .map(m => ({ name: m.name, qty: Number(m.totalQuantity || 0) }));
    const totalQty = catMeds.reduce((s, it) => s + it.qty, 0);
    const items = catMeds.sort((a, b) => b.qty - a.qty).slice(0, 8);
    return (
      <div className="bg-white border rounded-md p-3 shadow-sm text-sm">
        <div className="font-semibold mb-1">{cat}</div>
        {items.length === 0 ? (
          <div className="text-xs text-gray-500">No items</div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((it, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span className="truncate max-w-[180px]" title={it.name}>{it.name}</span>
                <span className="font-medium">{it.qty}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 pt-2 border-t text-xs flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold">{totalQty}</span>
        </div>
      </div>
    );
  };

  let receiptServiceModule;
  const loadReceiptService = async () => {
    if (receiptServiceModule) return receiptServiceModule;
    try {
      const mod = await import('@/services/receiptService');
      receiptServiceModule = mod.receiptService;
      return receiptServiceModule;
    } catch (e) {
      console.warn('[Analytics] Failed to load receiptService:', e);
      return null;
    }
  };

  useEffect(() => {
    const load = async () => {
      const svc = await loadReceiptService();
      try {
        if (svc) {
          const data = await svc.getRecentReceipts(2000);
          setReceipts(data || []);
        }
      } catch {
        setReceipts([]);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const keys = [];
    const totals = new Map();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      keys.push({ key, label: d.toLocaleString(undefined, { month: 'short' }) });
      totals.set(key, 0);
    }
    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const k = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      if (totals.has(k)) totals.set(k, (totals.get(k) || 0) + Number(r.grandTotal || r.subtotal || 0));
    });
    return keys.map(k => ({ label: k.label, total: totals.get(k.key) || 0 }));
  }, [receipts]);

  const monthlyCounts = useMemo(() => {
    const now = new Date();
    const keys = [];
    const counts = new Map();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      keys.push({ key, label: d.toLocaleString(undefined, { month: 'short' }) });
      counts.set(key, 0);
    }
    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const k = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      if (counts.has(k)) counts.set(k, (counts.get(k) || 0) + 1);
    });
    return keys.map(k => ({ label: k.label, count: counts.get(k.key) || 0 }));
  }, [receipts]);

  const stockByCategory = useMemo(() => {
    const map = new Map();
    medicines
      .filter(m => filterCategory === 'All' || m.category === filterCategory)
      .forEach(m => {
        const key = m.category || 'Uncategorized';
        map.set(key, (map.get(key) || 0) + (m.totalQuantity || 0));
      });
    const palette = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'];
    return Array.from(map.entries()).map(([name, value], idx) => ({
      name, value, color: palette[idx % palette.length]
    }));
  }, [medicines, filterCategory]);

  const stockPerMedicine = useMemo(() => {
    return medicines
      .filter(m => (filterCategory === 'All' || m.category === filterCategory))
      .map(m => ({
        name: `${m.name}${m.strength ? ' ' + m.strength : ''}${m.dosageForm ? ' • ' + m.dosageForm : ''}`,
        quantity: Number(m.totalQuantity || 0)
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
  }, [medicines, filterCategory]);

  const nearingExpiryBuckets = useMemo(() => {
    const buckets = new Map([
      ['0-7d', { count: 0, items: [] }],
      ['8-14d', { count: 0, items: [] }],
      ['15-30d', { count: 0, items: [] }],
      ['31-60d', { count: 0, items: [] }],
      ['61-90d', { count: 0, items: [] }],
    ]);
    const today = new Date();
    medicines
      .filter(m => filterCategory === 'All' || m.category === filterCategory)
      .forEach(m => {
        (m.batches || []).forEach(b => {
          const exp = b.expiryDate ? new Date(b.expiryDate) : null;
          if (!exp || isNaN(exp.getTime())) return;
          const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          let key = null;
          if (days <= 7 && days >= 0) key = '0-7d';
          else if (days <= 14 && days > 7) key = '8-14d';
          else if (days <= 30 && days > 14) key = '15-30d';
          else if (days <= 60 && days > 30) key = '31-60d';
          else if (days <= 90 && days > 60) key = '61-90d';
          if (key) {
            const entry = buckets.get(key);
            entry.count += 1;
            entry.items.push({
              medicine: m.name || 'Unknown',
              batchNumber: b.batchNumber || '—',
              quantity: Number(b.quantity || 0),
              expiryDate: b.expiryDate || '',
            });
            buckets.set(key, entry);
          }
        });
      });
    return Array.from(buckets.entries()).map(([label, data]) => ({ label, value: data.count, items: data.items }));
  }, [medicines, filterCategory]);

  const availabilityCards = useMemo(() => {
    const uniqueSKU = new Set(medicines.map(m => `${(m.name||'').toLowerCase()}|${(m.dosageForm||'').toLowerCase()}|${(m.strength||'').toLowerCase()}`)).size;
    const totalUnits = medicines.reduce((sum, m) => sum + Number(m.totalQuantity || 0), 0);
    const lowStock = medicines.filter(m => Number(m.totalQuantity || 0) <= Number(m.minStockLevel || 50)).length;
    const today = new Date(); today.setHours(0,0,0,0);
    const expired = medicines.reduce((count, m) => {
      return count + (m.batches || []).filter(b => {
        const d = new Date(b.expiryDate); d.setHours(0,0,0,0);
        return !isNaN(d.getTime()) && d < today && Number(b.quantity || 0) > 0;
      }).length;
    }, 0);
    return { uniqueSKU, totalUnits, lowStock, expired };
  }, [medicines]);

  const NearingTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const label = p?.payload?.label;
      const value = p?.payload?.value;
      const items = Array.isArray(p?.payload?.items) ? p.payload.items : [];
      const rows = items.slice(0, 6);
      return (
        <div className="rounded-md border bg-white p-2 text-xs shadow-sm">
          <div className="font-medium">{label}</div>
          <div className="text-muted-foreground mb-1">{value} batches</div>
          {rows.length > 0 && (
            <div className="space-y-0.5">
              {rows.map((it, idx) => (
                <div key={idx} className="flex justify-between gap-2">
                  <span className="truncate max-w-[160px]">{it.medicine}</span>
                  <span className="text-muted-foreground">Batch {it.batchNumber}</span>
                </div>
              ))}
              {items.length > rows.length && (
                <div className="text-muted-foreground">+{items.length - rows.length} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  // Usage Trend and Forecast for selected medicine
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!selectedMedicineId) {
          setSelectedSeries([]);
          setForecastData({ dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0 });
          return;
        }
        const svc = await import('@/services/medicineService');
        const sales = await svc.medicineService.getSalesLastNDays(selectedMedicineId, 180);
        if (!mounted) return;
        const byKey = new Map();
        const bucketKey = (d) => {
          const dt = new Date(d);
          if (timeScale === 'week') {
            // Use week start date (Monday) as label YYYY-MM-DD
            const weekStart = new Date(dt);
            const day = weekStart.getDay() || 7; // Sunday=7
            weekStart.setDate(weekStart.getDate() - (day - 1));
            weekStart.setHours(0,0,0,0);
            const y = weekStart.getFullYear();
            const m = String(weekStart.getMonth()+1).padStart(2,'0');
            const dd = String(weekStart.getDate()).padStart(2,'0');
            return `${y}-${m}-${dd}`;
          } else if (timeScale === 'month') {
            return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
          }
          return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        };
        const inRange = (d) => {
          if (startDate) {
            const sd = new Date(startDate); sd.setHours(0,0,0,0);
            if (d < sd) return false;
          }
          if (endDate) {
            const ed = new Date(endDate); ed.setHours(23,59,59,999);
            if (d > ed) return false;
          }
          return true;
        };
        (sales || []).forEach(rec => {
          const dt = rec?.date_sold && typeof rec.date_sold.toDate === 'function' ? rec.date_sold.toDate() : new Date(rec.date_sold);
          if (isNaN(dt.getTime()) || !inRange(dt)) return;
          const key = bucketKey(dt);
          byKey.set(key, (byKey.get(key) || 0) + Number(rec.quantity_sold || 0));
        });
        let series = Array.from(byKey.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([label, units]) => ({ label, units }));
        if (timeScale === 'day') {
          series = series.slice(-30);
        }
        setSelectedSeries(series);
        // Predictive metrics using last 30 days moving average
        const today = new Date();
        const last30Cutoff = new Date(today); last30Cutoff.setDate(today.getDate()-30);
        const last30 = (sales || []).filter(rec => {
          const dt = rec?.date_sold && typeof rec.date_sold.toDate === 'function' ? rec.date_sold.toDate() : new Date(rec.date_sold);
          return dt >= last30Cutoff;
        });
        const total30 = last30.reduce((sum, r) => sum + Number(r.quantity_sold || 0), 0);
        const dailyUsage = total30 / 30;
        const predicted30 = dailyUsage * 30;
        const med = medicines.find(m => m.id === selectedMedicineId);
        const currentStock = Number(med?.totalQuantity || 0);
        const daysRemaining = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : null;
        const stockoutDate = daysRemaining != null ? new Date(today.getTime() + daysRemaining * 86400000) : null;
        const reorderPoint = dailyUsage * 10;
        setForecastData({ dailyUsage, predicted30, daysRemaining, stockoutDate, reorderPoint });
      } catch {
        setSelectedSeries([]);
        setForecastData({ dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0 });
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, [selectedMedicineId, timeScale, startDate, endDate, medicines]);

  useEffect(() => {
    if (!selectedMedicineId && medicines && medicines.length > 0) {
      setSelectedMedicineId(medicines[0].id);
    }
  }, [medicines, selectedMedicineId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground">Reporting and data analysis</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            <option value="All">All</option>
            {Array.from(new Set((categories || []).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Medicine</label>
          <select value={filterMedicine} onChange={e => setFilterMedicine(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            <option value="">All</option>
            {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Inventory Availability Summary */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Inventory Availability Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600">Total Medicines</p>
            <p className="text-2xl font-bold text-gray-900">{availabilityCards.uniqueSKU}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600">Total Units in Stock</p>
            <p className="text-2xl font-bold text-gray-900">{availabilityCards.totalUnits}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600">Low Stock Count</p>
            <p className="text-2xl font-bold text-gray-900">{availabilityCards.lowStock}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600">Expired Stock Count</p>
            <p className="text-2xl font-bold text-gray-900">{availabilityCards.expired}</p>
          </div>
        </div>
      </section>

      {/* Usage & Sales Summary */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Usage & Sales Summary</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">Revenue Trend (Monthly)</h3>
            <ChartContainer
              config={{ total: { label: 'Revenue', color: '#3b82f6' } }}
              className="aspect-[16/9]"
            >
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total, #3b82f6)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">Sales Volume (Monthly)</h3>
            <ChartContainer
              config={{ count: { label: 'Transactions', color: '#10b981' } }}
              className="aspect-[16/9]"
            >
              <BarChart data={monthlyCounts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count, #10b981)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
        <div className="mt-6">
          <SalesByMedicineStats receipts={receipts} medicines={medicines} />
        </div>
      </section>

      {/* Inventory Status */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Inventory Status</h2>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-medium mb-3">Total Stock per Medicine (Top 20)</h3>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={stockPerMedicine}
                layout="vertical"
                margin={{ left: 120, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                  interval={0}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="#3B82F6" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fontWeight: 600 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </section>

      {/* Forecasting removed */}
    </div>
  );
}

export default Analytics;
