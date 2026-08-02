import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Lightbulb, Activity } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip as RTooltip } from 'recharts';
import { PrescriptiveRecommendations } from '@/app/components/PrescriptiveRecommendations';
import * as analyticsBackend from '@/backend/analyticsBackend';

export function Analytics({ medicines = [], categories = [], currentUser }) {
  const [receipts, setReceipts] = useState([]);
  const [timeScale, setTimeScale] = useState('month'); 
  const [topBottomTimeScale, setTopBottomTimeScale] = useState('month'); 
  const [topSoldTimeScale, setTopSoldTimeScale] = useState('month');
  const [leastSoldTimeScale, setLeastSoldTimeScale] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMedicine, setFilterMedicine] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [forecastData, setForecastData] = useState({ dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0 });

  const topBottomData = useMemo(() => {
    return {
      top: analyticsBackend.getTopBottomSold(receipts, medicines, topSoldTimeScale).top10,
      least: analyticsBackend.getTopBottomSold(receipts, medicines, leastSoldTimeScale).bottom10
    };
  }, [receipts, medicines, topSoldTimeScale, leastSoldTimeScale]);

  const topSoldData = topBottomData.top;
  const leastSoldData = topBottomData.least;

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
    if (!currentUser?.pharmacyId) return;
    const load = async () => {
      const svc = await loadReceiptService();
      try {
        if (svc) {
          const data = await svc.getReceipts(currentUser.pharmacyId, 0);
          setReceipts(data || []);
        }
      } catch (err) {
        console.error('[Analytics] Error fetching receipts:', err);
        setReceipts([]);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.pharmacyId]);

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
    return analyticsBackend.getStockByCategory(medicines, filterCategory);
  }, [medicines, filterCategory]);

  const stockPerMedicine = useMemo(() => {
    return analyticsBackend.getStockPerMedicine(medicines, filterCategory);
  }, [medicines, filterCategory]);

  const nearingExpiryBuckets = useMemo(() => {
    return analyticsBackend.getNearingExpiryBuckets(medicines, filterCategory);
  }, [medicines, filterCategory]);

  const availabilityCards = useMemo(() => {
    return analyticsBackend.getAvailabilityCards(medicines);
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
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!selectedMedicineId || !currentUser?.pharmacyId) {
          setSelectedSeries([]);
          setForecastData({ dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0 });
          return;
        }
        const svc = await import('@/services/medicineService');
        const med = medicines.find(m => m.id === selectedMedicineId);
        const sales = await svc.medicineService.getSalesLastNDays(currentUser.pharmacyId, selectedMedicineId, 180, med?.name);
        if (!mounted) return;
        const byKey = new Map();
        const bucketKey = (d) => {
          const dt = new Date(d);
          if (timeScale === 'week') {
            const weekStart = new Date(dt);
            const day = weekStart.getDay() || 7;
            weekStart.setDate(weekStart.getDate() - (day - 1));
            weekStart.setHours(0,0,0,0);
            const y = weekStart.getFullYear();
            const m = String(weekStart.getMonth()+1).padStart(2,'0');
            const dd = String(weekStart.getDate()).padStart(2,'0');
            return `${y}-${m}-${dd}`;
          } else if (timeScale === 'month') {
            return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
          } else if (timeScale === 'yearly') {
            return `${dt.getFullYear()}`;
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
          series = series.slice(-7);
        } else if (timeScale === 'week') {
          series = series.slice(-8);
        } else if (timeScale === 'month') {
          series = series.slice(-12);
        }
        setSelectedSeries(series);
        const today = new Date();
        const last30Cutoff = new Date(today); last30Cutoff.setDate(today.getDate()-30);
        const last30 = (sales || []).filter(rec => {
          const dt = rec?.date_sold && typeof rec.date_sold.toDate === 'function' ? rec.date_sold.toDate() : new Date(rec.date_sold);
          return dt >= last30Cutoff;
        });
        const total30 = last30.reduce((sum, r) => sum + Number(r.quantity_sold || 0), 0);
        const dailyUsage = total30 / 30;
        const predicted30 = dailyUsage * 30;
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
    const t = setInterval(load, 60000);
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
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Analytics</h1>
        <p className="text-sm text-muted-foreground">Monitor performance, demand patterns, and prescriptive recommendations.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <PrescriptiveRecommendations medicines={medicines} />
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Usage & Sales Summary</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Sales Performance
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Historical sales volume for selected medicine</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                  {[
                    { id: 'day', label: 'Daily' },
                    { id: 'week', label: 'Weekly' },
                    { id: 'month', label: 'Monthly' },
                    { id: 'yearly', label: 'Yearly' }
                  ].map((ts) => (
                    <button
                      key={ts.id}
                      onClick={() => setTimeScale(ts.id)}
                      className={`px-3 py-1 text-[10px] rounded-md transition-all ${
                        timeScale === ts.id 
                          ? 'bg-white shadow-sm text-blue-600 font-bold' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {ts.label}
                    </button>
                  ))}
                </div>
                <select
                  value={selectedMedicineId}
                  onChange={(e) => setSelectedMedicineId(e.target.value)}
                  className="px-3 py-1.5 border rounded-md text-sm bg-white w-full max-w-[200px]"
                >
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[280px]">
              {selectedSeries.length > 0 && selectedSeries.some(d => d.units > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:10}} />
                    <RTooltip 
                      cursor={{fill:'#f8fafc'}}
                      content={({active, payload, label}) => {
                        if (active && payload?.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border p-3 rounded-lg shadow-xl">
                              <p className="font-bold text-gray-900 border-b pb-1 mb-2">{label}</p>
                              <div className="space-y-1">
                                <p className="text-blue-600 font-bold text-lg">{data.units} Units</p>
                                <p className="text-gray-500 text-xs font-semibold">Total Sold</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                  No sales activity recorded.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border-2 border-emerald-100 p-6 relative shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <h3 className="font-black text-emerald-800 text-lg uppercase tracking-tight">Fast-Moving Items</h3>
                <p className="text-xs text-emerald-600 font-medium">Highest sales volume items this {topSoldTimeScale}</p>
              </div>
              <div className="flex bg-emerald-50 p-1 rounded-lg scale-95 border border-emerald-100">
                {[
                  { id: 'weekly', label: 'Wk' },
                  { id: 'month', label: 'Mo' },
                  { id: 'yearly', label: 'Yr' }
                ].map((ts) => (
                  <button
                    key={ts.id}
                    onClick={() => setTopSoldTimeScale(ts.id)}
                    className={`px-3 py-1.5 text-[11px] rounded-md transition-all ${
                      topSoldTimeScale === ts.id 
                        ? 'bg-white shadow-sm text-emerald-700 font-bold' 
                        : 'text-emerald-500 hover:text-emerald-700'
                    }`}
                  >
                    {ts.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSoldData} layout="vertical" margin={{ left: 10, right: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ecfdf5" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    fontSize={11} 
                    width={100} 
                    tick={{fill: '#065f46', fontWeight: 600}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <RTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border border-emerald-100 rounded-lg shadow-xl text-xs">
                            <p className="font-bold text-emerald-900">{payload[0].payload.name}</p>
                            <p className="text-emerald-600">{payload[0].value} units sold</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="sales" 
                    fill="#10b981" 
                    radius={[0, 6, 6, 0]} 
                    barSize={16}
                    label={{ 
                      position: 'right', 
                      fontSize: 12, 
                      fontWeight: 800, 
                      fill: '#065f46',
                      formatter: (val) => `${val} sold`
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border-2 border-rose-100 p-6 relative shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <h3 className="font-black text-rose-800 text-lg uppercase tracking-tight">Slow-Moving Items</h3>
                <p className="text-xs text-rose-600 font-medium">Items with lowest sales activity this {leastSoldTimeScale}</p>
              </div>
              <div className="flex bg-rose-50 p-1 rounded-lg scale-95 border border-rose-100">
                {[
                  { id: 'weekly', label: 'Wk' },
                  { id: 'month', label: 'Mo' },
                  { id: 'yearly', label: 'Yr' }
                ].map((ts) => (
                  <button
                    key={ts.id}
                    onClick={() => setLeastSoldTimeScale(ts.id)}
                    className={`px-3 py-1.5 text-[11px] rounded-md transition-all ${
                      leastSoldTimeScale === ts.id 
                        ? 'bg-white shadow-sm text-rose-700 font-bold' 
                        : 'text-rose-500 hover:text-rose-700'
                    }`}>
                    {ts.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leastSoldData} layout="vertical" margin={{ left: 10, right: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fff1f2" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    fontSize={11} 
                    width={100} 
                    tick={{fill: '#9f1239', fontWeight: 600}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <RTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border border-rose-100 rounded-lg shadow-xl text-xs">
                            <p className="font-bold text-rose-900">{payload[0].payload.name}</p>
                            <p className="text-rose-600">{payload[0].value} units sold</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="sales" 
                    fill="#f43f5e" 
                    radius={[0, 6, 6, 0]} 
                    barSize={16}
                    label={{ 
                      position: 'right', 
                      fontSize: 12, 
                      fontWeight: 800, 
                      fill: '#9f1239',
                      formatter: (val) => `${val} sold`
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Inventory Status</h2>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-medium mb-3">Total Stock per Medicine (Top 20)</h3>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={stockPerMedicine}
                layout="vertical"
                margin={{ left: 150, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  fontSize={11} 
                  fontWeight={700}
                  tick={{ fill: '#4b5563' }}
                  tickLine={false} 
                  axisLine={false} 
                  width={140}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </section>

    </div>
  );
}

export default Analytics;
