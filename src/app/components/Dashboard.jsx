import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Package, AlertTriangle, Calendar, TrendingUp, XCircle, Bell, CheckCircle, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { MedicineCard } from '@/app/components/MedicineCard';
import { MedicineForm } from '@/app/components/MedicineForm';
import { StatsCard } from '@/app/components/StatsCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip as RTooltip } from 'recharts';
import { PrescriptiveRecommendations } from '@/app/components/PrescriptiveRecommendations';
import { SalesByMedicineStats } from '@/app/components/SalesByMedicineStats';
import { auditService } from '@/services/auditService';
import * as dashboardBackend from '@/backend/dashboardBackend';
import * as analyticsBackend from '@/backend/analyticsBackend';

export function Dashboard({ medicines = [], categories = [], onAddMedicine, onUpdateMedicine, onDeleteMedicine, currentUser, onNavigateToTab }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(undefined);
  const [receipts, setReceipts] = useState([]);
  const [statusModal, setStatusModal] = useState({ open: false, type: null, window: 90 }); // Default to 90 days (3 months)
  const expSoonDays = statusModal.window;
  const setExpSoonDays = (days) => setStatusModal(prev => ({ ...prev, window: days }));
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyticsTimeScale, setAnalyticsTimeScale] = useState('day');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [analyticsFilterCategory, setAnalyticsFilterCategory] = useState('All');
  const [analyticsFilterMedicine, setAnalyticsFilterMedicine] = useState('All');
  const [revenueTimeScale, setRevenueTimeScale] = useState('month');
  const [dashboardCategory, setDashboardCategory] = useState('All');
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);
  const [tagModal, setTagModal] = useState({ open: false, tag: null });
  const [searchRecommendations, setSearchRecommendations] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const revenueData = useMemo(() => {
    return analyticsBackend.getRevenueData(receipts, revenueTimeScale);
  }, [receipts, revenueTimeScale]);

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
    if (!currentUser?.pharmacyId) return;
    const loadData = async () => {
      const svc = await loadReceiptService();
      try {
        if (svc) {
          console.log(`[Dashboard] Fetching receipts for pharmacy: ${currentUser.pharmacyId}`);
          // Pass 0 to remove limit and get all receipts for accurate historical trends
          const data = await svc.getReceipts(currentUser.pharmacyId, 0);
          console.log(`[Dashboard] Fetched ${data?.length || 0} receipts`);
          setReceipts(data || []);
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching receipts:', err);
        setReceipts([]);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 60000); // Manager dashboard refreshes every minute
    
    // Listen for local receipt updates
    window.addEventListener('refresh-receipts', loadData);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-receipts', loadData);
    };
  }, [currentUser?.pharmacyId]);

  // Ensure categories is always an array and unique
  const safeCategories = useMemo(() => {
    const arr = Array.isArray(categories) ? categories : [];
    return Array.from(new Set(arr.filter(Boolean)));
  }, [categories]);

  const allCategories = useMemo(() => {
    return ['All', ...safeCategories];
  }, [safeCategories]);

  const filteredMedicines = useMemo(() => {
    return (medicines || []).filter(m => {
      const matchSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (m.brandName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'All' || m.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [medicines, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    return dashboardBackend.getStats(medicines);
  }, [medicines]);

  const categoryStockData = useMemo(() => {
    return dashboardBackend.getCategoryStockData(medicines);
  }, [medicines]);
 
  const statusDistribution = useMemo(() => {
    return dashboardBackend.getStatusDistribution(medicines);
  }, [medicines]);

  const lowStockMeds = useMemo(() => {
    return dashboardBackend.getLowStockMeds(medicines);
  }, [medicines]);

  const outOfStockMeds = useMemo(() => {
    return dashboardBackend.getOutOfStockMeds(medicines);
  }, [medicines]);

  const expiringSoonItems = useMemo(() => {
    return dashboardBackend.getExpiringSoonItems(medicines, statusModal.window);
  }, [medicines, statusModal.window]);

  const stockStatusCounts = useMemo(() => {
    return dashboardBackend.getStockStatusCounts(medicines, statusModal.window);
  }, [medicines, statusModal.window]);

  const top10MedicinesByStock = useMemo(() => {
    return dashboardBackend.getTop10MedicinesByStock(medicines);
  }, [medicines]);

  const expiredItems = useMemo(() => {
    return dashboardBackend.getExpiredItems(medicines);
  }, [medicines]);

  const filteredExpiringSoonItems = useMemo(() => {
    return expiringSoonItems;
  }, [expiringSoonItems]);

  const filteredLowStockMeds = useMemo(() => {
    return lowStockMeds;
  }, [lowStockMeds]);

  const filteredOutOfStockMeds = useMemo(() => {
    return outOfStockMeds;
  }, [outOfStockMeds]);

  const filteredExpiredItems = useMemo(() => {
    return expiredItems;
  }, [expiredItems]);

  // Handle search and recommendations
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchRecommendations([]);
      setShowSearchDropdown(false);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matches = medicines.filter(m => 
      (m.name || '').toLowerCase().includes(term) ||
      (m.brandName || '').toLowerCase().includes(term) ||
      (m.supplier || '').toLowerCase().includes(term)
    ).slice(0, 8); // Limit recommendations

    setSearchRecommendations(matches);
    setShowSearchDropdown(true);
  }, [searchTerm, medicines]);

  const salesAggregates = useMemo(() => {
    return dashboardBackend.getSalesAggregates(receipts);
  }, [receipts]);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Medicine-specific forecast with dropdown (last month focus)
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [forecastSeries, setForecastSeries] = useState([]);
  const [forecastData, setForecastData] = useState({
    dailyUsage: 0,
    predicted30: 0,
    daysRemaining: null,
    stockoutDate: null,
    reorderPoint: 0,
    reorderAlert: false,
  });
  // New: recent audit logs
  const [recentLogs, setRecentLogs] = useState([]);
  useEffect(() => {
    if (!currentUser?.pharmacyId) return;
    (async () => {
      try {
        const logs = await auditService.getLogs(currentUser.pharmacyId, 20);
        setRecentLogs(Array.isArray(logs) ? logs : []);
      } catch {
        setRecentLogs([]);
      }
    })();
  }, [currentUser?.pharmacyId]);

  const last7DaysRevenueStrict = useMemo(() => {
    return dashboardBackend.getLast7DaysRevenueStrict(receipts);
  }, [receipts]);

  useEffect(() => {
    if (statusModal.open || showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [statusModal.open, showForm]);

  // New: navigation helpers to inventory + open modals
  const openAddStock = (medicineId) => {
    onNavigateToTab?.('inventory');
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('open-add-stock', { detail: { medicineId } }));
      } catch {}
    }, 250);
  };
  const openViewBatches = (medicineId) => {
    onNavigateToTab?.('inventory');
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('open-view-batches', { detail: { medicineId } }));
      } catch {}
    }, 300);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const med = medicines.find(m => m.id === selectedMedicineId);
        if (!med?.id) {
          setForecastSeries([]);
          setForecastData({
            dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0, reorderAlert: false
          });
          return;
        }
        const now = new Date();
        const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        // Fetch up to 60 days then filter to previous month
        const records = await (await import('@/services/medicineService')).medicineService.getSalesLastNDays(currentUser.pharmacyId, med.id, 60);
        if (!mounted) return;
        
        const { series, forecastData } = dashboardBackend.calculateMedicineForecast(records, med, startPrevMonth, endPrevMonth);
        setForecastSeries(series);
        setForecastData(forecastData);
      } catch {
        setForecastSeries([]);
        setForecastData({ dailyUsage: 0, predicted30: 0, daysRemaining: null, stockoutDate: null, reorderPoint: 0, reorderAlert: false });
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedMedicineId, medicines]);

  const revenueKPIs = useMemo(() => {
    return dashboardBackend.getRevenueKPIs(receipts, medicines);
  }, [receipts, medicines]);

  const monthlyCounts = useMemo(() => {
    return dashboardBackend.getMonthlyCounts(receipts, monthNames);
  }, [receipts]);

  const last7Revenue = useMemo(() => {
    const md = salesAggregates.monthlyData || [];
    const last = md.slice(-7);
    return last.map(d => ({ ...d, label: monthNames[(d.month - 1) % 12] }));
  }, [salesAggregates]);

  const last7Counts = useMemo(() => {
    return monthlyCounts.slice(-7);
  }, [monthlyCounts]);

  const categoryPieData = useMemo(() => {
    return dashboardBackend.getCategoryPieData(categoryStockData);
  }, [categoryStockData]);

  const categoryDetailedStats = useMemo(() => {
    return dashboardBackend.getCategoryDetailedStats(medicines, safeCategories);
  }, [medicines, safeCategories]);

  useEffect(() => {
    const uid = currentUser?.uid || 'unknown';
    const loadRead = () => {
      try {
        const raw = localStorage.getItem('pharmacy_read_notifications');
        return new Set(raw ? JSON.parse(raw) : []);
      } catch {
        return new Set();
      }
    };
    const read = loadRead();
    const shouldSuppressKey = `pharmacy_toasts_suppressed_${uid}`;
    let suppressed = false;
    try { suppressed = localStorage.getItem(shouldSuppressKey) === 'true'; } catch {}
    if (!suppressed) {
      medicines.forEach(m => {
        const qty = Number(m.totalQuantity || 0);
        if (qty > 0 && qty <= 50) {
          const id = `low-${m.id}`;
          if (read.has(id)) return;
          toast.warning(`Low stock: ${m.name} (${qty})`, {
            description: m.category || 'Uncategorized',
            action: {
              label: 'Dismiss',
              onClick: () => {
                try {
                  const raw = localStorage.getItem('pharmacy_read_notifications');
                  const set = new Set(raw ? JSON.parse(raw) : []);
                  set.add(id);
                  localStorage.setItem('pharmacy_read_notifications', JSON.stringify(Array.from(set)));
                } catch {}
              }
            }
          });
        }
      });
      try { localStorage.setItem(shouldSuppressKey, 'true'); } catch {}
    }
  }, [medicines, currentUser]);
  const analyticsMedicines = useMemo(() => {
    return (medicines || []).filter(m => {
      const catOk = analyticsFilterCategory === 'All' || (m.category || 'Uncategorized') === analyticsFilterCategory;
      const medOk = analyticsFilterMedicine === 'All' || m.id === analyticsFilterMedicine;
      return catOk && medOk;
    });
  }, [medicines, analyticsFilterCategory, analyticsFilterMedicine]);

  const notifications = useMemo(() => {
    return dashboardBackend.getNotifications(medicines, recentLogs, receipts);
  }, [medicines, recentLogs, receipts]);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const stockPerMedicineAnalytics = useMemo(() => {
    return dashboardBackend.getStockPerMedicineAnalytics(analyticsMedicines);
  }, [analyticsMedicines]);

  const categoryDistributionAnalytics = useMemo(() => {
    return dashboardBackend.getCategoryDistributionAnalytics(analyticsMedicines);
  }, [analyticsMedicines]);

  const nearingExpiryBuckets = useMemo(() => {
    return dashboardBackend.getNearingExpiryBucketsAnalytics(analyticsMedicines);
  }, [analyticsMedicines]);

  const receiptsByDateRange = useMemo(() => {
    return dashboardBackend.getReceiptsByDateRange(receipts, analyticsStartDate, analyticsEndDate);
  }, [receipts, analyticsStartDate, analyticsEndDate]);

  const usageOverTimeAnalytics = useMemo(() => {
    return dashboardBackend.getUsageOverTimeAnalytics(receiptsByDateRange, analyticsTimeScale, analyticsFilterMedicine, analyticsFilterCategory, medicines);
  }, [receiptsByDateRange, analyticsTimeScale, analyticsFilterMedicine, analyticsFilterCategory, medicines]);

  const demandForecastAnalytics = useMemo(() => {
    return dashboardBackend.getDemandForecastAnalytics(receiptsByDateRange, analyticsFilterMedicine, analyticsFilterCategory, medicines);
  }, [receiptsByDateRange, analyticsFilterMedicine, analyticsFilterCategory, medicines]);

  const stockOutPredictionsAnalytics = useMemo(() => {
    return dashboardBackend.getStockOutPredictionsAnalytics(medicines, receiptsByDateRange, analyticsFilterCategory, analyticsFilterMedicine);
  }, [medicines, receiptsByDateRange, analyticsFilterCategory, analyticsFilterMedicine]);

  const handleAddMedicine = async (medicineData) => {
    setSubmitting(true);
    try {
      await onAddMedicine(medicineData);
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMedicine = async (medicineData) => {
    if (editingMedicine) {
      setSubmitting(true);
      try {
        await onUpdateMedicine(editingMedicine.id, medicineData);
        setEditingMedicine(undefined);
        setShowForm(false);
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
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
    <div className="relative">
      {/* Submitting Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[1px] z-[100] flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-900 font-bold">Processing...</p>
        </div>
      )}
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your pharmacy inventory</p>
        </div>

        {/* Search Bar in Header */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            placeholder="Search generic, brand, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm && setShowSearchDropdown(true)}
          />

          {/* Search Recommendations Dropdown */}
          {showSearchDropdown && searchRecommendations.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSearchDropdown(false)}></div>
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">Recommended Medicines</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {searchRecommendations.map(m => (
                    <div
                      key={m.id}
                      className="p-3 border-b last:border-0 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between group"
                      onClick={() => {
                        setSearchTerm('');
                        setShowSearchDropdown(false);
                        onNavigateToTab?.('inventory');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('highlight-medicine', { detail: { id: m.id } }));
                        }, 100);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700">{m.brandName || m.name}</p>
                        <p className="text-xs text-gray-500 truncate">{m.name !== m.brandName ? m.name : ''} {m.strength} • {m.dosageForm}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-xs font-bold ${m.totalQuantity <= (m.minStockLevel || 50) ? 'text-amber-600' : 'text-blue-600'}`}>
                          {m.totalQuantity} {m.unit}
                        </p>
                        <ChevronRight className="w-4 h-4 text-gray-300 inline-block ml-1 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Category Filter Buttons */}
        <div className="hidden lg:flex items-center gap-2 overflow-x-auto pb-1 max-w-xl">
          {['Vitamins', 'Prescription', 'Non-Prescription'].map((tag) => (
            <button
              key={tag}
              onClick={() => setTagModal({ open: true, tag })}
              className="px-3 py-1.5 rounded-full text-xs font-bold border bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all whitespace-nowrap"
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex-shrink-0 flex items-center relative gap-4">
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="inline-flex items-center justify-center bg-blue-600 text-white w-11 h-11 rounded-md hover:bg-blue-700 relative z-50"
            aria-label="Open notifications"
            title="Notifications"
          >
            <Bell className="w-6 h-6" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">
                {Math.min(99, unreadNotifsCount)}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifDropdownOpen(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{unreadNotifsCount} Unread</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">All caught up!</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <div
                        key={n.id}
                        className={`p-4 border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          onNavigateToTab?.('notifications');
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 p-1.5 rounded-md ${
                            n.type === 'error' ? 'bg-red-100 text-red-600' : 
                            n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${!n.read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => {
                    setNotifDropdownOpen(false);
                    onNavigateToTab?.('notifications');
                  }}
                  className="w-full p-3 text-sm font-bold text-blue-600 hover:bg-gray-50 bg-gray-50 border-t transition-colors"
                >
                  Show all notifications
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Clean Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatsCard
          title="Total Medicines"
          value={stats.totalMedicines}
          icon={Package}
          color="bg-blue-100 text-blue-800 border-blue-200"
          onClick={() => setStatusModal({ open: true, type: 'total' })}
        />
        <StatsCard
          title="Total Stock Quantity"
          value={medicines.reduce((sum, m) => sum + (m.totalQuantity || 0), 0)}
          icon={Package}
          color="bg-indigo-100 text-indigo-800 border-indigo-200"
        />
        <StatsCard
          title="Inventory Value"
          value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(stats.totalValue)}
          icon={TrendingUp}
          color="bg-violet-100 text-violet-800 border-violet-200"
        />
        <StatsCard
          title="Today’s Sales (₱)"
          value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(salesAggregates.todayTotal)}
          icon={TrendingUp}
          color="bg-green-100 text-green-800 border-green-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Low Stock Card */}
        <div className="bg-card rounded-xl border-2 border-orange-100 shadow-sm overflow-hidden flex flex-col h-[320px]">
          <div className="p-4 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-gray-900">Low Stock</h3>
            </div>
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">{filteredLowStockMeds.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredLowStockMeds.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{m.strength} • {m.dosageForm}</p>
                </div>
                <span className="text-xs font-bold text-orange-600 ml-2">{m.totalQuantity} left</span>
              </div>
            ))}
            {filteredLowStockMeds.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No low stock items</p>}
          </div>
          <button 
            onClick={() => setStatusModal({ open: true, type: 'low' })}
            className="w-full p-3 text-sm font-bold text-orange-600 hover:bg-orange-50 border-t border-orange-100 transition-colors bg-white mt-auto"
          >
            Show all
          </button>
        </div>

        {/* Out of Stock Card */}
        <div className="bg-card rounded-xl border-2 border-red-100 shadow-sm overflow-hidden flex flex-col h-[320px]">
          <div className="p-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Out of Stock</h3>
            </div>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">{filteredOutOfStockMeds.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredOutOfStockMeds.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{m.strength} • {m.dosageForm}</p>
                </div>
                <span className="text-xs font-bold text-red-600 ml-2">OOS</span>
              </div>
            ))}
            {filteredOutOfStockMeds.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No out of stock items</p>}
          </div>
          <button 
            onClick={() => setStatusModal({ open: true, type: 'out' })}
            className="w-full p-3 text-sm font-bold text-red-600 hover:bg-red-50 border-t border-red-100 transition-colors bg-white mt-auto"
          >
            Show all
          </button>
        </div>

        {/* Expiring Soon Card */}
        <div className="bg-card rounded-xl border-2 border-yellow-100 shadow-sm overflow-hidden flex flex-col h-[320px]">
          <div className="p-4 bg-yellow-50/50 border-b border-yellow-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Expiring Soon</h3>
            </div>
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">{filteredExpiringSoonItems.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredExpiringSoonItems.slice(0, 5).map((it, idx) => (
              <div key={`${it.medId}-${it.batchNumber}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{it.medName}</p>
                  <p className="text-[11px] text-gray-500 truncate">Batch {it.batchNumber} • {it.expiryDate}</p>
                </div>
                <span className="text-xs font-bold text-yellow-600 ml-2">{it.quantity} qty</span>
              </div>
            ))}
            {filteredExpiringSoonItems.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No items expiring soon</p>}
          </div>
          <button 
            onClick={() => setStatusModal({ open: true, type: 'soon', window: statusModal.window })}
            className="w-full p-3 text-sm font-bold text-yellow-600 hover:bg-yellow-50 border-t border-yellow-100 transition-colors bg-white mt-auto"
          >
            Show all
          </button>
        </div>

        {/* Expired Card */}
        <div className="bg-card rounded-xl border-2 border-rose-100 shadow-sm overflow-hidden flex flex-col h-[320px]">
          <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-gray-900">Expired</h3>
            </div>
            <span className="bg-rose-100 text-rose-800 text-xs px-2 py-1 rounded-full font-bold">{filteredExpiredItems.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredExpiredItems.slice(0, 5).map((it, idx) => (
              <div key={`${it.medId}-${it.batchNumber}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{it.medName}</p>
                  <p className="text-[11px] text-red-500 truncate">Batch {it.batchNumber} • Expired {it.expiryDate}</p>
                </div>
                <span className="text-xs font-bold text-rose-600 ml-2">{it.quantity} qty</span>
              </div>
            ))}
            {filteredExpiredItems.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No expired items</p>}
          </div>
          <button 
            onClick={() => setStatusModal({ open: true, type: 'expired' })}
            className="w-full p-3 text-sm font-bold text-rose-600 hover:bg-rose-50 border-t border-rose-100 transition-colors bg-white mt-auto"
          >
            Show all
          </button>
        </div>
      </div>

      {/* Action Required removed */}
      {false && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">Low Stock</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {lowStockMeds.slice(0,10).map(m => (
              <div key={m.id} className="flex items-center justify-between border rounded-md p-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.strength} • {m.dosageForm}</div>
                </div>
                <button onClick={() => openAddStock(m.id)} className="text-sm px-2 py-1 border rounded-md hover:bg-green-50 text-green-700">
                  Add Stock
                </button>
              </div>
            ))}
            {lowStockMeds.length === 0 && <div className="text-sm text-muted-foreground">No low stock items.</div>}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Expiring Soon ({expSoonDays}d)</h3>
            <select
              value={String(expSoonDays)}
              onChange={(e) => setExpSoonDays(Number(e.target.value))}
              className="border rounded-md text-sm px-2 py-1"
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {expiringSoonItems.map(it => (
              <div key={`${it.medId}-${it.batchNumber}`} className="flex items-center justify-between border rounded-md p-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.medName}</div>
                  <div className="text-xs text-gray-500">Batch {it.batchNumber} • {it.expiryDate}</div>
                </div>
                <button onClick={() => openViewBatches(it.medId)} className="text-sm px-2 py-1 border rounded-md hover:bg-blue-50 text-blue-700">
                  View Batches
                </button>
              </div>
            ))}
            {expiringSoonItems.length === 0 && <div className="text-sm text-muted-foreground">No expiring batches in selected window.</div>}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">Out of Stock</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {outOfStockMeds.slice(0,10).map(m => (
              <div key={m.id} className="flex items-center justify-between border rounded-md p-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.strength} • {m.dosageForm}</div>
                </div>
                <button onClick={() => openAddStock(m.id)} className="text-sm px-2 py-1 border rounded-md hover:bg-red-50 text-red-700">
                  Restock
                </button>
              </div>
            ))}
            {outOfStockMeds.length === 0 && <div className="text-sm text-muted-foreground">No out-of-stock items.</div>}
          </div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stock Status Card (Now First) */}
        <div className="bg-card rounded-lg border p-6 shadow-sm h-[480px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900">Stock Status</h3>
            <span className="text-xs text-muted-foreground">Window: {expSoonDays}d</span>
          </div>
          <div className="flex flex-col items-center flex-1 justify-center">
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Normal', batches: stockStatusCounts.normal, color: '#22c55e' },
                    { name: 'Low', batches: stockStatusCounts.low, color: '#f59e0b' },
                    { name: 'Soon', batches: stockStatusCounts.expSoon, color: '#3b82f6' },
                    { name: 'Expired', batches: stockStatusCounts.expired, color: '#ef4444' },
                  ]}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RTooltip 
                    cursor={{ fill: 'transparent' }}
                    formatter={(value) => [`${value} Batches`, 'Count']}
                  />
                  <Bar dataKey="batches" radius={[4, 4, 0, 0]}>
                    {
                      [
                        { name: 'Normal', color: '#22c55e' },
                        { name: 'Low', color: '#f59e0b' },
                        { name: 'Soon', color: '#3b82f6' },
                        { name: 'Expired', color: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full max-w-sm mt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#22c55e' }}></span>
                  <span className="text-sm">Normal</span>
                </div>
                <span className="text-sm font-semibold">{stockStatusCounts.normal}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span className="text-sm">Low</span>
                </div>
                <span className="text-sm font-semibold">{stockStatusCounts.low}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></span>
                  <span className="text-sm">Soon</span>
                </div>
                <span className="text-sm font-semibold">{stockStatusCounts.expSoon}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }}></span>
                  <span className="text-sm">Expired</span>
                </div>
                <span className="text-sm font-semibold">{stockStatusCounts.expired}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend Section (Now Second) */}
        <section className="bg-white rounded-lg border p-6 shadow-sm flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenue Trend</h2>
              <p className="text-xs text-gray-500">Historical revenue and transaction volume</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-md">
              {[
                { id: 'weekly', label: 'Weekly' },
                { id: 'month', label: 'Monthly' },
                { id: 'yearly', label: 'Yearly' }
              ].map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => setRevenueTimeScale(ts.id)}
                  className={`px-4 py-1.5 text-xs rounded-md transition-all ${
                    revenueTimeScale === ts.id 
                      ? 'bg-white shadow-sm text-blue-600 font-bold' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {ts.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ChartContainer
              config={{ 
                total: { label: 'Revenue', color: '#3b82f6' },
                transactions: { label: 'Transactions', color: '#10b981' }
              }}
              className="h-full w-full"
            >
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="label" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={(val) => `₱${val.toLocaleString()}`}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
                          <p className="text-sm font-bold text-gray-900 mb-2 border-b pb-1">{data.label}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-xs text-gray-600">Revenue</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900">
                                ₱{data.total.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-xs text-gray-600">Transactions</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900">
                                {data.transactions}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="var(--color-total, #3b82f6)" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={60}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </section>
      </div>

      {/* Recent Activity removed */}
      {false && (
      <div className="bg-card rounded-lg border p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {recentLogs.map(log => (
            <div key={log.id} className="flex items-center justify-between border rounded-md p-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{log.userName} • {log.action}</div>
                <div className="text-xs text-gray-500">{log.entityName || log.entityType} • {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {recentLogs.length === 0 && <div className="text-sm text-muted-foreground">No recent activity.</div>}
        </div>
      </div>
      )}

      {statusModal.open && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setStatusModal({ open: false, type: null, window: 30 })}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">
                    {statusModal.type === 'low' && 'Low Stock Items'}
                    {statusModal.type === 'soon' && 'Expiring Soon Batches'}
                    {statusModal.type === 'out' && 'Out of Stock Items'}
                    {statusModal.type === 'total' && 'Top Stocked Medicines'}
                    {statusModal.type === 'expired' && 'Expired Batches'}
                  </h2>
                {statusModal.type === 'soon' && (
                  <select
                    value={statusModal.window}
                    onChange={(e) => setStatusModal(prev => ({ ...prev, window: parseInt(e.target.value) }))}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value={30}>30d</option>
                    <option value={60}>60d</option>
                    <option value={90}>90d</option>
                  </select>
                )}
              </div>
              <button
                onClick={() => setStatusModal({ open: false, type: null, window: 30 })}
                className="p-2 hover:bg-gray-100 rounded-md"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {statusModal.type === 'low' && (
                <div className="space-y-2">
                  {filteredLowStockMeds.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No low stock items.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left p-2">Medicine</th>
                          <th className="text-right p-2">Stock</th>
                          <th className="text-right p-2">Min Level</th>
                          <th className="text-right p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLowStockMeds.map((m) => (
                          <tr key={m.id} className="border-t">
                            <td className="p-2">{m.name} <span className="text-xs text-gray-500">({m.strength} • {m.dosageForm})</span></td>
                            <td className="p-2 text-right">{m.totalQuantity || 0}</td>
                            <td className="p-2 text-right">{Math.max(50, Number(m.minStockLevel || 0))}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => openAddStock(m.id)} className="px-2 py-1 border rounded-md text-sm hover:bg-green-50 text-green-700">
                                Add Stock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {statusModal.type === 'soon' && (
                <div className="space-y-2">
                  {filteredExpiringSoonItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No expiring batches in {statusModal.window} days.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left p-2">Medicine</th>
                          <th className="text-left p-2">Batch</th>
                          <th className="text-left p-2">Expiry</th>
                          <th className="text-right p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpiringSoonItems.map((it, idx) => (
                          <tr key={`${it.medId}-${it.batchNumber}-${idx}`} className="border-t">
                            <td className="p-2">{it.medName}</td>
                            <td className="p-2">{it.batchNumber}</td>
                            <td className="p-2">{it.expiryDate}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => openViewBatches(it.medId)} className="px-2 py-1 border rounded-md text-sm hover:bg-blue-50 text-blue-700">
                                View Batches
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {statusModal.type === 'out' && (
                <div className="space-y-2">
                  {filteredOutOfStockMeds.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No out-of-stock items.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left p-2">Medicine</th>
                          <th className="text-right p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOutOfStockMeds.map((m) => (
                          <tr key={m.id} className="border-t">
                            <td className="p-2">{m.name} <span className="text-xs text-gray-500">({m.strength} • {m.dosageForm})</span></td>
                            <td className="p-2 text-right">
                              <button onClick={() => openAddStock(m.id)} className="px-2 py-1 border rounded-md text-sm hover:bg-red-50 text-red-700">
                                Restock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {statusModal.type === 'expired' && (
                <div className="space-y-2">
                  {filteredExpiredItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No expired items.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left p-2">Medicine</th>
                          <th className="text-left p-2">Batch</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-left p-2">Expiry</th>
                          <th className="text-right p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpiredItems.map((it, idx) => (
                          <tr key={`${it.medId}-${it.batchNumber}-${idx}`} className="border-t">
                            <td className="p-2">{it.medName}</td>
                            <td className="p-2">{it.batchNumber}</td>
                            <td className="p-2 text-right">{it.quantity}</td>
                            <td className="p-2 text-red-600 font-medium">{it.expiryDate}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => openViewBatches(it.medId)} className="px-2 py-1 border rounded-md text-sm hover:bg-blue-50 text-blue-700">
                                View Batches
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {statusModal.type === 'total' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 mb-2 italic">Showing top 10 medicines by stock quantity.</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left p-2">Medicine</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10MedicinesByStock.map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="p-2">
                            <div className="font-medium text-gray-900">{m.name}</div>
                            <div className="text-xs text-gray-500">{m.strength} • {m.dosageForm}</div>
                          </td>
                          <td className="p-2 text-right font-bold text-gray-900">{m.totalQuantity || 0}</td>
                          <td className="p-2 text-right">
                            <button 
                              onClick={() => {
                                setStatusModal({ open: false, type: null, window: 30 });
                                openViewBatches(m.id);
                              }} 
                              className="text-blue-600 hover:underline font-medium"
                            >
                              View Batches
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={() => {
                      setStatusModal({ open: false, type: null, window: 30 });
                      onNavigateToTab?.('inventory');
                    }}
                    className="w-full py-3 mt-4 text-center text-blue-600 font-bold hover:bg-blue-50 border border-blue-100 rounded-lg transition-colors"
                  >
                    Show all medicine in inventory
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tagModal.open && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => setTagModal({ open: false, tag: null })}
        >
          <div 
            className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{tagModal.tag} Medicines</h2>
                  <p className="text-sm text-gray-500">List of products tagged as {tagModal.tag}</p>
                </div>
              </div>
              <button
                onClick={() => setTagModal({ open: false, tag: null })}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              {(() => {
                const taggedMeds = medicines.filter(m => 
                  String(m.tag || '').trim().toLowerCase() === String(tagModal.tag || '').trim().toLowerCase()
                );
                if (taggedMeds.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No medicines found with this tag.</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {taggedMeds.map(m => (
                      <div key={m.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-blue-700">{m.brandName || m.name}</h3>
                            <p className="text-xs text-gray-500">{m.name !== m.brandName ? m.name : ''} {m.strength}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            m.totalQuantity <= (m.minStockLevel || 50) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {m.totalQuantity} {m.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{m.category || 'Uncategorized'}</p>
                          <button 
                            onClick={() => {
                              setTagModal({ open: false, tag: null });
                              onNavigateToTab?.('inventory');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('highlight-medicine', { detail: { id: m.id } }));
                              }, 100);
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            View in Inventory
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Category Medicine List Modal */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedCategoryModal} Medicines</h2>
                <p className="text-sm text-gray-500">Showing all medicines under this category</p>
              </div>
              <button 
                onClick={() => setSelectedCategoryModal(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const categoryMeds = medicines.filter(m => 
                  (m.category || '').toLowerCase() === selectedCategoryModal.toLowerCase()
                );
                
                if (categoryMeds.length === 0) {
                  return (
                    <div className="text-center py-20">
                      <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No medicines found in this category.</p>
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryMeds.map(m => (
                      <div 
                        key={m.id} 
                        className="p-4 border rounded-xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                        onClick={() => {
                          setSelectedCategoryModal(null);
                          onNavigateToTab?.('inventory');
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('highlight-medicine', { detail: { id: m.id } }));
                          }, 100);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-700">{m.brandName || m.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{m.name !== m.brandName ? m.name : ''} {m.strength} • {m.dosageForm}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              m.totalQuantity <= (m.minStockLevel || 50) ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}>
                              {m.totalQuantity} {m.unit}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors ml-4" />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <div className="p-4 border-t bg-gray-50 text-center">
              <button 
                onClick={() => {
                  setSelectedCategoryModal(null);
                  onNavigateToTab?.('inventory');
                }}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                Go to full inventory
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sales last 7 days removed */}

      {/* Analytics Overview (moved to Analytics page) */}
      {false && (
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
            title="Sales Transactions"
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
              title="Unique Medicines"
            value={revenueKPIs.uniqueMedicinesCount}
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

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Demand Forecast</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Select Medicine</label>
              <select
                value={selectedMedicineId}
                onChange={(e) => setSelectedMedicineId(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm"
              >
                <option value="">-- Choose --</option>
                {medicines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.strength} - {m.dosageForm})</option>
                ))}
              </select>
            </div>
          </div>
          {selectedMedicineId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg border p-4">
                    <p className="text-xs text-gray-600">Avg Daily Sales</p>
                    <p className="text-xl font-bold">{forecastData.dailyUsage.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg border p-4">
                    <p className="text-xs text-gray-600">Predicted 30-day Demand</p>
                    <p className="text-xl font-bold">{Math.round(forecastData.predicted30)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg border p-4">
                    <p className="text-xs text-gray-600">Days Remaining</p>
                    <p className="text-xl font-bold">{forecastData.daysRemaining != null ? Math.max(0, forecastData.daysRemaining) : 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg border p-4">
                    <p className="text-xs text-gray-600">Stock-out Date</p>
                    <p className="text-xl font-bold">{forecastData.stockoutDate ? new Date(forecastData.stockoutDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Sales Trend (Last Month)</h4>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer>
                      <LineChart data={forecastSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="units" stroke="#3B82F6" name="Units sold" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Forecast (Next 30 days)</h4>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer>
                      <LineChart
                        data={[
                          ...forecastSeries.map(d => ({ label: d.label, actual: d.units, predicted: null })),
                          ...Array.from({ length: 30 }).map((_, i) => {
                            const future = new Date();
                            future.setDate(future.getDate() + i + 1);
                            return {
                              label: `${future.getMonth()+1}/${future.getDate()}`,
                              actual: null,
                              predicted: forecastData.dailyUsage,
                            };
                          }),
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="actual" stroke="#374151" name="Actual" dot={false} />
                        <Line type="monotone" dataKey="predicted" stroke="#10B981" name="Predicted/day" strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Stock vs Reorder</h4>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={[
                          { name: 'Current Stock', value: Number((medicines.find(m => m.id === selectedMedicineId)?.totalQuantity) || 0) },
                          { name: 'Reorder Point', value: Math.round(forecastData.reorderPoint) },
                          { name: 'Predicted 30-day', value: Math.round(forecastData.predicted30) },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value">
                          <Cell fill="#22c55e" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#ef4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: '#22c55e' }}></span>Safe
                    <span className="inline-block w-3 h-3 rounded-sm mx-2" style={{ backgroundColor: '#f59e0b' }}></span>Near reorder
                    <span className="inline-block w-3 h-3 rounded-sm mx-2" style={{ backgroundColor: '#ef4444' }}></span>Stock-out soon
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a medicine to view forecast.</p>
          )}
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
      )}

      {false && (
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
      )}
      {/* Low Stock Alerts List (removed in clean dashboard) */}
      {false && (() => {
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

      {/* Status Modal (legacy duplicate removed) */}

      {false && (
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
      })()}
            </div>
          )}
        </div>

        {/* Right Column: Charts & Recommendations */}
        <div className="space-y-6"></div>
      </div>
      )}

      {/* Category Overview removed */}

      
      {/* Form Modal */}
      {showForm && (
        <MedicineForm
          medicine={editingMedicine}
          categories={categories}
          existingMedicines={medicines}
          onSubmit={editingMedicine ? handleUpdateMedicine : handleAddMedicine}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
