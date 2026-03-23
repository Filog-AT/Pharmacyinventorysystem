import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import * as reportsBackend from '@/backend/reportsBackend';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Reports({ medicines, currentUser }) {
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    if (!currentUser?.pharmacyId) return;
    const loadData = async () => {
      try {
        const { receiptService } = await import('@/services/receiptService');
        const data = await receiptService.getRecentReceipts(currentUser.pharmacyId, 1000);
        setReceipts(data || []);
      } catch (e) {
        console.warn('[Reports] Failed to load receipts:', e);
      }
    };
    loadData();
  }, [currentUser?.pharmacyId]);

  // Process sales data for the trend chart
  const salesTrendData = useMemo(() => {
    return reportsBackend.getSalesTrendData(receipts);
  }, [receipts]);

  const categoryData = useMemo(() => {
    return reportsBackend.getCategoryData(medicines);
  }, [medicines]);

  // Calculate real metrics from medicines and receipts
  const { totalRevenue, totalSales, avgOrderValue } = useMemo(() => {
    return reportsBackend.calculateMetrics(receipts);
  }, [receipts]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">View sales performance and inventory insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-1">+12.5% from last month</p>
        </div>
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Sales</p>
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
          <p className="text-xs text-green-600 mt-1">+8.3% from last month</p>
        </div>
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Order Value</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(avgOrderValue)}</p>
          <p className="text-xs text-green-600 mt-1">+3.8% from last month</p>
        </div>
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Medicines</p>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
          <p className="text-xs text-gray-500 mt-1">Active medicines</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue (₱)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Chart */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#10B981" name="Number of Sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="text-gray-600">{item.value} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
