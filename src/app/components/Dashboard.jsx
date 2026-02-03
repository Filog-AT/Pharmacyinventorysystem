import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Package, AlertTriangle, Calendar, TrendingUp, XCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { MedicineCard } from '@/app/components/MedicineCard';
import { MedicineForm } from '@/app/components/MedicineForm';
import { StatsCard } from '@/app/components/StatsCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { PrescriptiveRecommendations } from '@/app/components/PrescriptiveRecommendations';
import { SalesByMedicineStats } from '@/app/components/SalesByMedicineStats';

export function Dashboard({ medicines = [], categories = [], onAddMedicine, onUpdateMedicine, onDeleteMedicine, currentUser, onNavigateToTab }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(undefined);
  const [receipts, setReceipts] = useState([]);
  const [statusModal, setStatusModal] = useState({ open: false, type: null }); // 'low' | 'soon' | 'expired'
  const [analyticsTimeScale, setAnalyticsTimeScale] = useState('day');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [analyticsFilterCategory, setAnalyticsFilterCategory] = useState('All');
  const [analyticsFilterMedicine, setAnalyticsFilterMedicine] = useState('All');
 
  let receiptServiceModule;
  const loadReceiptService = async () => {
    if (receiptServiceModule) return receiptServiceModule;
    try {
      const mod = await import('@/services/receiptService');
      receiptServiceModule = mod.receiptService;
      return receiptServiceModule;
    } catch (e) {
      console.warn('[Dashboard] Failed to load receiptService:', e);
      return null;
    }
  };
 
  useEffect(() => {
    (async () => {
      const svc = await loadReceiptService();
      if (svc) {
        const data = await svc.getRecentReceipts(500);
        setReceipts(data || []);
      }
    })();
  }, []);

  // Ensure categories is always an array and unique
  const safeCategories = useMemo(() => {
    const arr = Array.isArray(categories) ? categories : [];
    return Array.from(new Set(arr.filter(Boolean)));
  }, [categories]);

  const allCategories = useMemo(() => {
    return ['All', ...safeCategories];
  }, [safeCategories]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(medicine => {
      const matchesSearch = (medicine.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (medicine.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || medicine.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    const totalMedicines = medicines.length;
    const lowStock = medicines.filter(m => {
      const qty = m.quantity || 0;
      const threshold = 50;
      return threshold > 0 && qty <= threshold;
    }).length;
    const expiringSoon = medicines.filter(m => {
      if (!m.expiryDate) return false;
      const today = new Date();
      const expiryDate = new Date(m.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    }).length;
    const expired = medicines.filter(m => {
      if (!m.expiryDate) return false;
      const today = new Date();
      const expiryDate = new Date(m.expiryDate);
      return expiryDate < today;
    }).length;
    const totalValue = medicines.reduce((sum, m) => sum + ((m.quantity || 0) * (m.price || 0)), 0);

    return { totalMedicines, lowStock, expiringSoon, expired, totalValue };
  }, [medicines]);

  const categoryStockData = useMemo(() => {
    const map = new Map();
    medicines.forEach(m => {
      const key = m.category || 'Uncategorized';
      const prev = map.get(key) || 0;
      map.set(key, prev + (m.quantity || 0));
    });
    return Array.from(map.entries()).map(([name, qty]) => ({ name, quantity: qty }));
  }, [medicines]);
 
  const statusDistribution = useMemo(() => {
    let normal = 0, low = 0, soon = 0, expired = 0;
    medicines.forEach(m => {
      const qty = m.quantity || 0;
      const lowThreshold = 50;
      const hasExpiry = !!m.expiryDate;
      const today = new Date();
      const exp = hasExpiry ? new Date(m.expiryDate) : null;
      const days = exp ? Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
      if (exp && exp < today) {
        expired += 1;
      } else if (days !== null && days <= 90) {
        soon += 1;
      } else if (lowThreshold > 0 && qty <= lowThreshold) {
        low += 1;
      } else {
        normal += 1;
      }
    });
    return [
      { name: 'Normal', value: normal, color: '#22c55e' },
      { name: 'Low Stock', value: low, color: '#f59e0b' },
      { name: 'Expiring Soon', value: soon, color: '#eab308' },
      { name: 'Expired', value: expired, color: '#ef4444' },
    ];
  }, [medicines]);
 
  const salesAggregates = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    let todayTotal = 0;
    const monthlyTotals = Array(12).fill(0);
    const yearlyTotals = new Map();
    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const amount = r.grandTotal || r.subtotal || 0;
      if (ts.toDateString() === now.toDateString()) {
        todayTotal += amount;
      }
      if (ts.getFullYear() === thisYear) {
        monthlyTotals[ts.getMonth()] += amount;
      }
      yearlyTotals.set(ts.getFullYear(), (yearlyTotals.get(ts.getFullYear()) || 0) + amount);
    });
    const yearlyData = Array.from(yearlyTotals.entries()).map(([year, total]) => ({ year, total }));
    const monthlyData = monthlyTotals.map((total, idx) => ({ month: idx + 1, total }));
    return { todayTotal, monthlyData, yearlyData };
  }, [receipts]);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const revenueKPIs = useMemo(() => {
    const totalRevenue = (receipts || []).reduce((sum, r) => sum + (r.grandTotal || r.subtotal || 0), 0);
    const totalSales = (receipts || []).length;
    const avgOrderValue = totalSales ? totalRevenue / totalSales : 0;
    const products = medicines.length;
    return { totalRevenue, totalSales, avgOrderValue, products };
  }, [receipts, medicines]);

  const monthlyCounts = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const counts = Array(12).fill(0);
    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (ts.getFullYear() === thisYear) {
        counts[ts.getMonth()] += 1;
      }
    });
    return counts.map((count, idx) => ({ month: idx + 1, count, label: monthNames[idx] }));
  }, [receipts]);

  const last7Revenue = useMemo(() => {
    const md = salesAggregates.monthlyData || [];
    return md.slice(-7).map(d => ({ ...d, label: monthNames[(d.month - 1) % 12] }));
  }, [salesAggregates, monthNames]);

  const last7Counts = useMemo(() => {
    return monthlyCounts.slice(-7);
  }, [monthlyCounts]);

  const categoryPieData = useMemo(() => {
    const palette = ['#3b82f6','#22c55e','#f59e0b','#eab308','#ef4444','#a855f7','#14b8a6','#f472b6','#0ea5e9','#84cc16'];
    return categoryStockData.map((d, i) => ({ name: d.name, value: d.quantity, color: palette[i % palette.length] }));
  }, [categoryStockData]);

  const categoryDetailedStats = useMemo(() => {
    const stats = new Map();
    // Initialize with safeCategories
    safeCategories.forEach(cat => {
      stats.set(cat, { name: cat, itemCount: 0, stock: 0, value: 0 });
    });
    
    medicines.forEach(m => {
      const cat = m.category || 'Uncategorized';
      if (!stats.has(cat)) {
        stats.set(cat, { name: cat, itemCount: 0, stock: 0, value: 0 });
      }
      const s = stats.get(cat);
      s.itemCount += 1;
      s.stock += (m.quantity || 0);
      s.value += (m.quantity || 0) * (m.price || 0);
    });
    
    return Array.from(stats.values()).sort((a, b) => b.value - a.value);
  }, [medicines, safeCategories]);

  useEffect(() => {
    const uid = currentUser?.uid || 'unknown';
    const key = `pharmacy_low_toasts_shown_${uid}`;
    let shown = false;
    try {
      shown = sessionStorage.getItem(key) === 'true';
    } catch {}
    if (!shown) {
      medicines.forEach(m => {
        const qty = Number(m.quantity || 0);
        if (qty <= 50) {
          toast.warning(`Low stock: ${m.name} (${qty})`, { description: m.category || 'Uncategorized' });
        }
      });
      try { sessionStorage.setItem(key, 'true'); } catch {}
    }
  }, [medicines, currentUser]);
  const analyticsMedicines = useMemo(() => {
    return (medicines || []).filter(m => {
      const catOk = analyticsFilterCategory === 'All' || (m.category || 'Uncategorized') === analyticsFilterCategory;
      const medOk = analyticsFilterMedicine === 'All' || m.id === analyticsFilterMedicine;
      return catOk && medOk;
    });
  }, [medicines, analyticsFilterCategory, analyticsFilterMedicine]);

  const stockPerMedicineAnalytics = useMemo(() => {
    return analyticsMedicines
      .map(m => ({
        name: m.name || 'Unknown',
        quantity: Array.isArray(m.batches) ? m.batches.reduce((s, b) => s + Number(b?.quantityPieces || 0), 0) : Number(m.quantity || 0)
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
  }, [analyticsMedicines]);

  const categoryDistributionAnalytics = useMemo(() => {
    const map = new Map();
    analyticsMedicines.forEach(m => {
      const name = m.category || 'Uncategorized';
      const qty = Array.isArray(m.batches) ? m.batches.reduce((s, b) => s + Number(b?.quantityPieces || 0), 0) : Number(m.quantity || 0);
      map.set(name, (map.get(name) || 0) + qty);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [analyticsMedicines]);

  const nearingExpiryBuckets = useMemo(() => {
    const today = new Date();
    const calc = (days) => {
      const cutoff = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      return analyticsMedicines.filter(m => {
        const exp = new Date(m.expiryDate || '');
        return !isNaN(exp.getTime()) && exp > today && exp <= cutoff;
      }).length;
    };
    return [
      { label: '30 days', value: calc(30) },
      { label: '60 days', value: calc(60) },
      { label: '90 days', value: calc(90) }
    ];
  }, [analyticsMedicines]);

  const receiptsByDateRange = useMemo(() => {
    const sd = analyticsStartDate ? new Date(analyticsStartDate) : null;
    const ed = analyticsEndDate ? new Date(analyticsEndDate) : null;
    return (receipts || []).filter(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (sd && ts < sd) return false;
      if (ed && ts > ed) return false;
      return true;
    });
  }, [receipts, analyticsStartDate, analyticsEndDate]);

  const usageOverTimeAnalytics = useMemo(() => {
    const bucket = (d) => {
      if (analyticsTimeScale === 'day') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (analyticsTimeScale === 'week') {
        const onejan = new Date(d.getFullYear(), 0, 1);
        const millis = d.getTime() - onejan.getTime();
        const week = Math.ceil(((millis / 86400000) + onejan.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const map = new Map();
    receiptsByDateRange.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const key = bucket(ts);
      let total = 0;
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const medOk = analyticsFilterMedicine === 'All' || it.medicineId === analyticsFilterMedicine;
          const catOk = analyticsFilterCategory === 'All' || ((medicines.find(m => m.id === it.medicineId)?.category) === analyticsFilterCategory);
          if (medOk && catOk) total += Number(it.quantity || 0);
        });
      }
      map.set(key, (map.get(key) || 0) + total);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }, [receiptsByDateRange, analyticsTimeScale, analyticsFilterMedicine, analyticsFilterCategory, medicines]);

  const demandForecastAnalytics = useMemo(() => {
    const dayCounts = new Map();
    receiptsByDateRange.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const day = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
      let total = 0;
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const medOk = analyticsFilterMedicine === 'All' || it.medicineId === analyticsFilterMedicine;
          const catOk = analyticsFilterCategory === 'All' || ((medicines.find(m => m.id === it.medicineId)?.category) === analyticsFilterCategory);
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
  }, [receiptsByDateRange, analyticsFilterMedicine, analyticsFilterCategory, medicines]);

  const stockOutPredictionsAnalytics = useMemo(() => {
    const avgPerMed = new Map();
    const dayMapByMed = new Map();
    medicines.forEach(m => dayMapByMed.set(m.id, new Map()));
    receiptsByDateRange.forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const day = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const medOk = analyticsFilterMedicine === 'All' || it.medicineId === analyticsFilterMedicine;
          const catOk = analyticsFilterCategory === 'All' || ((medicines.find(m => m.id === it.medicineId)?.category) === analyticsFilterCategory);
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
        const catOk = analyticsFilterCategory === 'All' || (m.category || 'Uncategorized') === analyticsFilterCategory;
        const medOk = analyticsFilterMedicine === 'All' || m.id === analyticsFilterMedicine;
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
  }, [medicines, receiptsByDateRange, analyticsFilterCategory, analyticsFilterMedicine]);

  const handleAddMedicine = async (medicineData) => {
    onAddMedicine(medicineData);
    setShowForm(false);
  };

  const handleUpdateMedicine = async (medicineData) => {
    if (editingMedicine) {
      onUpdateMedicine(editingMedicine.id, medicineData);
      setEditingMedicine(undefined);
      setShowForm(false);
      
    }
  };

  const handleEditClick = (medicine) => {
    setEditingMedicine(medicine);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMedicine(undefined);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your pharmacy inventory</p>
        </div>
        <div className="hidden md:flex items-center">
          <button
            onClick={() => onNavigateToTab?.('notifications')}
            className="inline-flex items-center justify-center bg-blue-600 text-white w-11 h-11 rounded-md hover:bg-blue-700 relative"
            aria-label="Open notifications"
            title="Notifications"
          >
            <Bell className="w-6 h-6" />
            {(stats.lowStock + stats.expiringSoon + stats.expired) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {Math.min(99, stats.lowStock + stats.expiringSoon + stats.expired)}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="bg-card rounded-lg border p-4 mb-6">
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

      {/* Advanced Analytics moved below Analytics Overview */}
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="Total Medicines"
          value={stats.totalMedicines}
          icon={Package}
          color="bg-blue-100 text-blue-800 border-blue-200"
          onClick={() => onNavigateToTab?.('inventory')}
        />
        <StatsCard
          title="Low Stock Alerts"
          value={stats.lowStock}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-800 border-orange-200"
          onClick={() => setStatusModal({ open: true, type: 'low' })}
        />
        <StatsCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          icon={Calendar}
          color="bg-yellow-100 text-yellow-800 border-yellow-200"
          onClick={() => setStatusModal({ open: true, type: 'soon' })}
        />
        <StatsCard
          title="Expired Medicines"
          value={stats.expired}
          icon={XCircle}
          color="bg-red-100 text-red-800 border-red-200"
          onClick={() => setStatusModal({ open: true, type: 'expired' })}
        />
        <StatsCard
          title="Inventory Value"
          value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(stats.totalValue)}
          icon={TrendingUp}
          color="bg-green-100 text-green-800 border-green-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <PrescriptiveRecommendations medicines={medicines} />
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Stock Status</h2>
          <ChartContainer
            config={{ value: { label: 'Count', color: '#3b82f6' } }}
            className="h-[180px] w-full"
          >
            <PieChart>
              <Pie 
                data={statusDistribution} 
                dataKey="value" 
                nameKey="name" 
                outerRadius={80} 
                innerRadius={60}
                paddingAngle={2}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="mt-4 space-y-2 text-sm">
            {statusDistribution.map(s => (
              <div key={s.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Revenue"
            value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(revenueKPIs.totalRevenue)}
            icon={TrendingUp}
            color="bg-sky-100 text-sky-800 border-sky-200"
          />
          <StatsCard
            title="Total Sales"
            value={revenueKPIs.totalSales}
            icon={Package}
            color="bg-emerald-100 text-emerald-800 border-emerald-200"
          />
          <StatsCard
            title="Avg Order Value"
            value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(revenueKPIs.avgOrderValue)}
            icon={TrendingUp}
            color="bg-violet-100 text-violet-800 border-violet-200"
          />
          <StatsCard
            title="Products"
            value={revenueKPIs.products}
            icon={Package}
            color="bg-indigo-100 text-indigo-800 border-indigo-200"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 7 Months)</h2>
            <ChartContainer
              config={{ total: { label: 'Revenue', color: '#3b82f6' } }}
              className="aspect-[16/9]"
            >
              <LineChart data={last7Revenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total, #3b82f6)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Volume</h2>
            <ChartContainer
              config={{ count: { label: 'Number of Sales', color: '#10b981' } }}
              className="aspect-[16/9]"
            >
              <BarChart data={last7Counts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count, #10b981)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

          <div className="mb-6">
            <SalesByMedicineStats receipts={receipts} medicines={medicines} />
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels by Category</h2>
            <ChartContainer
              config={{ quantity: { label: 'Quantity', color: '#3b82f6' } }}
              className="aspect-[16/9]"
            >
              <BarChart data={categoryStockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity, #3b82f6)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h2>
            <ChartContainer
              config={{ value: { label: 'Units', color: '#3b82f6' } }}
              className="aspect-[16/9]"
            >
              <PieChart>
                <Pie data={categoryPieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cat-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2 text-sm">
              {categoryPieData.map(c => (
                <div key={c.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value} units</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Advanced Analytics</h2>
        <div className="bg-card rounded-lg border p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Time Scale</label>
            <select value={analyticsTimeScale} onChange={(e) => setAnalyticsTimeScale(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={analyticsStartDate} onChange={(e) => setAnalyticsStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" value={analyticsEndDate} onChange={(e) => setAnalyticsEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={analyticsFilterCategory} onChange={(e) => setAnalyticsFilterCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="All">All</option>
              {safeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Medicine</label>
            <select value={analyticsFilterMedicine} onChange={(e) => setAnalyticsFilterMedicine(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="All">All</option>
              {analyticsMedicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <h2 className="text-lg font-semibold text-card-foreground mb-2">Total Stock per Medicine</h2>
            <ChartContainer config={{}}>
              <BarChart data={stockPerMedicineAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="#3B82F6" />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <h2 className="text-lg font-semibold text-card-foreground mb-2">Stock by Category</h2>
            <ChartContainer config={{}}>
              <PieChart>
                <Pie data={categoryDistributionAnalytics} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {categoryDistributionAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'][index % 8]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <h2 className="text-lg font-semibold text-card-foreground mb-2">Medicines Nearing Expiration</h2>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nearingExpiryBuckets}>
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
            <h2 className="text-lg font-semibold text-card-foreground mb-2">Usage Over Time</h2>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usageOverTimeAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Demand Forecast</h2>
          <ChartContainer config={{}}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" data={demandForecastAnalytics.history} dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" data={demandForecastAnalytics.forecast} dataKey="value" stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-3 text-sm text-muted-foreground">
            <span>Avg daily: {demandForecastAnalytics.avgDaily.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4 mt-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Stock-out Predictions & Reorders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockOutPredictionsAnalytics.map((p, idx) => {
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
      {/* Low Stock Alerts List */}
      {(() => {
        const lowStockItems = medicines.filter(m => {
          const qty = m.quantity || 0;
          const threshold = 50;
          return threshold > 0 && qty <= threshold;
        });

        if (lowStockItems.length === 0) return null;

        return (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-orange-800">Low Stock Alerts ({lowStockItems.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto pr-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="bg-white border border-orange-100 rounded p-3 flex justify-between items-center shadow-sm">
                  <div className="truncate pr-2">
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.supplier || item.category || 'No Category'}</div>
                  </div>
                    <div className="text-right whitespace-nowrap pl-2">
                      <div className="text-lg font-bold text-orange-600">
                        {(() => {
                          const effectiveMin = 50;
                          return (
                            <>
                              {item.quantity || 0} <span className="text-xs font-normal text-gray-400">/ {effectiveMin}</span>
                            </>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-orange-400">Qty / Min</div>
                    </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Status Modal */}
      {statusModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {statusModal.type === 'low' && 'Low Stock Medicines'}
                {statusModal.type === 'soon' && 'Expiring Soon Medicines'}
                {statusModal.type === 'expired' && 'Expired Medicines'}
              </h2>
              <button
                onClick={() => setStatusModal({ open: false, type: null })}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicines
                  .filter(m => {
                    const qty = m.quantity || 0;
                    const threshold = 50;
                    const today = new Date();
                    const exp = m.expiryDate ? new Date(m.expiryDate) : null;
                    const days = exp ? Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const isExpired = exp && exp < today;
                    const isSoon = days !== null && days <= 90 && days > 0;
                    if (statusModal.type === 'low') return threshold > 0 && qty <= threshold && !isExpired;
                    if (statusModal.type === 'soon') return isSoon;
                    if (statusModal.type === 'expired') return isExpired;
                    return false;
                  })
                  .map(m => (
                    <div key={m.id} className="rounded-lg border p-4 bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-card-foreground truncate pr-2">{m.name || 'Unknown'}</h3>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">{m.category || 'Uncategorized'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Stock</span>
                        <span className="font-medium text-card-foreground">{m.quantity || 0} {m.unit || 'units'}</span>
                        <span className="text-muted-foreground">Expiry</span>
                        <span className="font-medium text-card-foreground">{m.expiryDate || 'N/A'}</span>
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium text-card-foreground">
                          {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(m.price || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search, Filters, Medicine Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <div className="bg-card rounded-lg border p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Medicine
              </button>
            </div>
          </div>

          {/* Medicine Grid */}
          {filteredMedicines.length === 0 ? (
            <div className="bg-card rounded-lg border p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No medicines found</p>
              <p className="text-muted-foreground text-sm mt-2">
                {searchTerm || filterCategory !== 'All' 
                  ? 'Try adjusting your search or filters'
                  : 'Add your first medicine to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMedicines.map(m => {
                const today = new Date();
                const exp = m.expiryDate ? new Date(m.expiryDate) : null;
                const days = exp ? Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const isExpired = exp && exp < today;
                const isSoon = days !== null && days <= 90 && days > 0;
                const isLow = (m.minStockLevel || 0) > 0 && (m.quantity || 0) <= (m.minStockLevel || 0);
                const bg =
                  isExpired ? 'bg-red-50' :
                  isSoon ? 'bg-yellow-50' :
                  isLow ? 'bg-orange-50' : 'bg-card';
                const badge =
                  isExpired ? 'Expired' :
                  isSoon ? 'Expiring Soon' :
                  isLow ? 'Low Stock' : '';
                return (
                  <div key={m.id} className={`rounded-lg border p-4 ${bg} transition-shadow hover:shadow-md`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-card-foreground truncate pr-2">{m.name || 'Unknown'}</h3>
                      {badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                          isExpired ? 'bg-red-100 text-red-700' :
                          isSoon ? 'bg-yellow-100 text-yellow-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>{badge}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium text-card-foreground truncate">{m.category || 'Uncategorized'}</span>
                      <span className="text-muted-foreground">Stock</span>
                      <span className="font-medium text-card-foreground">{m.quantity || 0} {m.unit || 'units'}</span>
                      <span className="text-muted-foreground">Expiry</span>
                      <span className={`font-medium ${isExpired ? 'text-red-700' : 'text-card-foreground'}`}>{m.expiryDate || 'N/A'}</span>
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium text-card-foreground">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(m.price || 0)}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(m)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Charts & Recommendations */}
        <div className="space-y-6"></div>
      </div>

      {/* Category Overview */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Category Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryDetailedStats.map(cat => (
            <div key={cat.name} className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-card-foreground truncate pr-2" title={cat.name}>{cat.name}</h3>
                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">{cat.itemCount} items</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Stock:</span>
                  <span className="font-medium text-foreground">{cat.stock.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Value:</span>
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cat.value)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      
      {/* Form Modal */}
      {showForm && (
        <MedicineForm
          medicine={editingMedicine}
          categories={categories}
          onSubmit={editingMedicine ? handleUpdateMedicine : handleAddMedicine}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
