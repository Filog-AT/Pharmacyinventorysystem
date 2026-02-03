import { useEffect, useMemo, useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

let receiptServiceModule = null;
const loadReceiptService = async () => {
  if (receiptServiceModule) return receiptServiceModule;
  try {
    const mod = await import('@/services/receiptService');
    receiptServiceModule = mod.receiptService;
    return receiptServiceModule;
  } catch {
    return null;
  }
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function Analytics({ medicines = [], categories = [] }) {
  const [receipts, setReceipts] = useState([]);
  const [timeScale, setTimeScale] = useState('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMedicine, setFilterMedicine] = useState('All');

  useEffect(() => {
    (async () => {
      const svc = await loadReceiptService();
      if (svc) {
        const data = await svc.getRecentReceipts(365);
        setReceipts(data);
      }
    })();
  }, []);

  const filteredMedicines = useMemo(() => {
    return (medicines || []).filter(m => {
      const catOk = filterCategory === 'All' || (m.category || 'Uncategorized') === filterCategory;
      const medOk = filterMedicine === 'All' || m.id === filterMedicine;
      return catOk && medOk;
    });
  }, [medicines, filterCategory, filterMedicine]);

  const stockPerMedicine = useMemo(() => {
    return filteredMedicines
      .map(m => ({
        name: m.name || 'Unknown',
        quantity: Array.isArray(m.batches) ? m.batches.reduce((s, b) => s + Number(b?.quantityPieces || 0), 0) : Number(m.quantity || 0)
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
  }, [filteredMedicines]);

  const categoryDistribution = useMemo(() => {
    const map = new Map();
    filteredMedicines.forEach(m => {
      const name = m.category || 'Uncategorized';
      const qty = Array.isArray(m.batches) ? m.batches.reduce((s, b) => s + Number(b?.quantityPieces || 0), 0) : Number(m.quantity || 0);
      map.set(name, (map.get(name) || 0) + qty);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredMedicines]);

  const nearingExpiry = useMemo(() => {
    const today = new Date();
    const calc = (days) => {
      const cutoff = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      return filteredMedicines.filter(m => {
        const exp = new Date(m.expiryDate || '');
        return !isNaN(exp.getTime()) && exp > today && exp <= cutoff;
      }).length;
    };
    return [
      { label: '30 days', value: calc(30) },
      { label: '60 days', value: calc(60) },
      { label: '90 days', value: calc(90) }
    ];
  }, [filteredMedicines]);

  const timeFilteredReceipts = useMemo(() => {
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;
    return (receipts || []).filter(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (sd && ts < sd) return false;
      if (ed && ts > ed) return false;
      return true;
    });
  }, [receipts, startDate, endDate]);

  const usageOverTime = useMemo(() => {
    const bucket = (d) => {
      if (timeScale === 'day') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (timeScale === 'week') {
        const onejan = new Date(d.getFullYear(), 0, 1);
        const millis = d.getTime() - onejan.getTime();
        const week = Math.ceil(((millis / 86400000) + onejan.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const map = new Map();
    timeFilteredReceipts.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const key = bucket(ts);
      let total = 0;
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const medOk = filterMedicine === 'All' || it.medicineId === filterMedicine;
          const catOk = filterCategory === 'All' || ((medicines.find(m => m.id === it.medicineId)?.category) === filterCategory);
          if (medOk && catOk) total += Number(it.quantity || 0);
        });
      }
      map.set(key, (map.get(key) || 0) + total);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }, [timeFilteredReceipts, timeScale, filterMedicine, filterCategory, medicines]);

  const demandForecast = useMemo(() => {
    const dayCounts = new Map();
    timeFilteredReceipts.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const day = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
      let total = 0;
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const medOk = filterMedicine === 'All' || it.medicineId === filterMedicine;
          const catOk = filterCategory === 'All' || ((medicines.find(m => m.id === it.medicineId)?.category) === filterCategory);
          if (medOk && catOk) total += Number(it.quantity || 0);
        });
      }
      dayCounts.set(day, (dayCounts.get(day) || 0) + total);
    });
    const hist = Array.from(dayCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
    const last30 = hist.slice(-30);
    const avg = last30.length > 0 ? last30.reduce((s, d) => s + d.value, 0) / last30.length : 0;
    const futurePoints = [];
    if (hist.length > 0) {
      const last = new Date(hist[hist.length - 1].date);
      for (let i = 1; i <= 14; i++) {
        const nd = new Date(last.getTime() + i * 24 * 60 * 60 * 1000);
        const label = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
        futurePoints.push({ date: label, value: avg });
      }
    }
    return { history: hist, forecast: futurePoints, avgDaily: avg };
  }, [timeFilteredReceipts, filterMedicine, filterCategory, medicines]);

  const stockOutPredictions = useMemo(() => {
    const avgPerMed = new Map();
    const dayMapByMed = new Map();
    medicines.forEach(m => dayMapByMed.set(m.id, new Map()));
    timeFilteredReceipts.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const day = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const medOk = filterMedicine === 'All' || it.medicineId === filterMedicine;
          const catOk = filterCategory === 'All' || ((medicines.find(m => m.id === it.medicineId)?.category) === filterCategory);
          if (!medOk || !catOk) return;
          const map = dayMapByMed.get(it.medicineId) || new Map();
          map.set(day, (map.get(day) || 0) + Number(it.quantity || 0));
          dayMapByMed.set(it.medicineId, map);
        });
      }
    });
    dayMapByMed.forEach((map, id) => {
      const arr = Array.from(map.values());
      const avg = arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
      avgPerMed.set(id, avg);
    });
    return medicines
      .filter(m => {
        const catOk = filterCategory === 'All' || (m.category || 'Uncategorized') === filterCategory;
        const medOk = filterMedicine === 'All' || m.id === filterMedicine;
        return catOk && medOk;
      })
      .map(m => {
        const qty = Array.isArray(m.batches) ? m.batches.reduce((s, b) => s + Number(b?.quantityPieces || 0), 0) : Number(m.quantity || 0);
        const v = avgPerMed.get(m.id) || 0;
        const daysLeft = v > 0 ? qty / v : Infinity;
        const projectedDate = v > 0 ? new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000) : null;
        const reorderDays = 30;
        const reorderQty = Math.ceil(v * reorderDays);
        return { name: m.name, qty, avgDaily: v, daysLeft, projectedDate, reorderQty };
      })
      .sort((a, b) => (a.daysLeft === Infinity ? 1 : a.daysLeft) - (b.daysLeft === Infinity ? 1 : b.daysLeft))
      .slice(0, 20);
  }, [medicines, timeFilteredReceipts, filterCategory, filterMedicine]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">Descriptive and predictive insights</p>
      </div>

      <div className="bg-card rounded-lg border p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Time Scale</label>
          <select value={timeScale} onChange={(e) => setTimeScale(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            <option value="All">All</option>
            {(categories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Medicine</label>
          <select value={filterMedicine} onChange={(e) => setFilterMedicine(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            <option value="All">All</option>
            {filteredMedicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Total Stock per Medicine</h2>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockPerMedicine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Stock by Category</h2>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Medicines Nearing Expiration</h2>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={nearingExpiry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Usage Over Time</h2>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="bg-card rounded-lg border p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-2">Demand Forecast</h2>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" data={demandForecast.history} dataKey="value" name="History" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" data={demandForecast.forecast} dataKey="value" name="Forecast" stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-3 text-sm text-muted-foreground">
            <span>Avg daily: {demandForecast.avgDaily.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-2">Stock-out Predictions & Reorders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockOutPredictions.map((p, idx) => {
              const label = p.projectedDate ? `${p.projectedDate.getFullYear()}-${String(p.projectedDate.getMonth() + 1).padStart(2, '0')}-${String(p.projectedDate.getDate()).padStart(2, '0')}` : 'N/A';
              return (
                <div key={idx} className="border rounded-md p-3">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm">Qty: {p.qty}</div>
                  <div className="text-sm">Avg/day: {p.avgDaily.toFixed(2)}</div>
                  <div className="text-sm">Run-out: {label}</div>
                  <div className="text-sm">Reorder qty: {p.reorderQty}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
