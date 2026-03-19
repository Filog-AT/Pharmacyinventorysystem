import { useMemo, useEffect, useState } from 'react';
import { Search, Package } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { SalesByMedicineStats } from '@/app/components/SalesByMedicineStats';
import * as staffDashboardBackend from '@/backend/staffDashboardBackend';

export function StaffDashboard({ medicines = [] }) {
  const [receipts, setReceipts] = useState([]);

  let receiptServiceModule;
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

  useEffect(() => {
    (async () => {
      const svc = await loadReceiptService();
      if (svc) {
        const data = await svc.getRecentReceipts(200);
        setReceipts(data || []);
      }
    })();
  }, []);

  const { todaySales, todayUnitsSold, todayTransactions } = useMemo(() => {
    return staffDashboardBackend.calculateTodayStats(receipts);
  }, [receipts]);

  const categoryStockData = useMemo(() => {
    return staffDashboardBackend.getCategoryStockData(medicines);
  }, [medicines]);

  const expiringSoon = useMemo(() => {
    return staffDashboardBackend.getExpiringSoon(medicines);
  }, [medicines]);

  const CategoryTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const cat = payload[0]?.payload?.name;
    const catMeds = (medicines || [])
      .filter(m => (m.category || 'Uncategorized') === cat)
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Staff overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Today's Sales</h2>
          <div className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(todaySales || 0)}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Units Sold Today</h2>
          <div className="text-2xl font-bold text-emerald-600">
            {todayUnitsSold}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Transactions Today</h2>
          <div className="text-2xl font-bold text-indigo-600">
            {todayTransactions}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SalesByMedicineStats receipts={receipts} onlyDaily />
      </div>

      <div className="bg-card rounded-lg border p-4 mb-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-3">Near-Expiring Batches (30 days)</h2>
        {expiringSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches expiring within 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left p-2">Medicine</th>
                  <th className="text-left p-2">Batch</th>
                  <th className="text-left p-2">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {expiringSoon.map((e, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{e.name}</td>
                    <td className="p-2">{e.batch}</td>
                    <td className="p-2">{e.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(medicines || []).length === 0 && (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No medicines found</p>
          <p className="text-muted-foreground text-sm mt-2">Inventory will appear here</p>
        </div>
      )}
    </div>
  );
}
