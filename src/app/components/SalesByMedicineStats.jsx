import { useState, useMemo } from 'react';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

export function SalesByMedicineStats({ receipts = [], medicines = [] }) {
  const [timeFilter, setTimeFilter] = useState('day'); // 'day', 'month', 'year'

  const stockMap = useMemo(() => {
    const map = new Map();
    (medicines || []).forEach(m => {
      if (m.id) map.set(m.id, m.totalQuantity || 0);
      if (m.name) map.set(m.name, m.totalQuantity || 0);
    });
    return map;
  }, [medicines]);

  const avgDailyByMedicine = useMemo(() => {
    // Compute average daily sold over the last 30 days for each medicine
    const dayMap = new Map(); // id -> Map(day, qty)
    const today = new Date();
    const cutoff = new Date(today.getTime() - 30 * 86400000);
    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (isNaN(ts.getTime()) || ts < cutoff) return;
      const dayKey = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}`;
      if (!Array.isArray(r.items)) return;
      r.items.forEach(it => {
        const id = it.medicineId || it.name;
        if (!id) return;
        const map = dayMap.get(id) || new Map();
        map.set(dayKey, (map.get(dayKey) || 0) + Number(it.quantity || 0));
        dayMap.set(id, map);
      });
    });
    const avgMap = new Map();
    dayMap.forEach((map, id) => {
      const values = Array.from(map.values());
      const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      avgMap.set(id, avg);
    });
    return avgMap;
  }, [receipts]);

  const aggregatedData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.toDateString();

    const salesMap = new Map();

    receipts.forEach(receipt => {
      const timestamp = receipt?.timestamp && typeof receipt.timestamp.toDate === 'function' 
        ? receipt.timestamp.toDate() 
        : new Date(receipt.timestamp);
      
      let include = false;

      if (timeFilter === 'day') {
        if (timestamp.toDateString() === currentDate) include = true;
      } else if (timeFilter === 'month') {
        if (timestamp.getFullYear() === currentYear && timestamp.getMonth() === currentMonth) include = true;
      } else if (timeFilter === 'year') {
        if (timestamp.getFullYear() === currentYear) include = true;
      }

      if (include && Array.isArray(receipt.items)) {
        receipt.items.forEach(item => {
          const key = item.medicineId || item.name; // Fallback to name if id missing
          if (!key) return;

          const existing = salesMap.get(key) || { 
            name: item.name, 
            quantity: 0, 
            revenue: 0,
            unit: item.unitSold,
            lastSoldAt: null
          };

          // Normalize quantity based on unit if needed, but for now just sum raw quantity
          // Or better, just display the raw count and maybe the unit if consistent
          // If a medicine is sold in different units (piece vs box), this might be tricky.
          // For simple stats, let's sum the "quantity" field from the receipt item.
          // Note: The receipt item quantity is "number of units sold" (e.g. 2 boxes).
          // Ideally we should track base units, but the prompt asks "how many specific medicines".
          
          salesMap.set(key, {
            key, // Store key for lookup
            name: item.name,
            quantity: existing.quantity + (Number(item.quantity) || 0),
            revenue: existing.revenue + ((Number(item.price) || 0) * (Number(item.quantity) || 0)),
            unit: existing.unit, // This might vary, but keep simple for now
            lastSoldAt: existing.lastSoldAt && existing.lastSoldAt > timestamp ? existing.lastSoldAt : timestamp
          });
        });
      }
    });

    return Array.from(salesMap.values())
      .sort((a, b) => b.quantity - a.quantity);
  }, [receipts, timeFilter]);

  const previousAggregates = useMemo(() => {
    const now = new Date();
    const prevSalesMap = new Map();
    receipts.forEach(receipt => {
      const timestamp = receipt?.timestamp && typeof receipt.timestamp.toDate === 'function' 
        ? receipt.timestamp.toDate() 
        : new Date(receipt.timestamp);
      let includePrev = false;
      if (timeFilter === 'day') {
        const prevDay = new Date(now);
        prevDay.setDate(now.getDate() - 1);
        includePrev = timestamp.toDateString() === prevDay.toDateString();
      } else if (timeFilter === 'month') {
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        includePrev = timestamp.getFullYear() === prevMonth.getFullYear() && timestamp.getMonth() === prevMonth.getMonth();
      } else if (timeFilter === 'year') {
        includePrev = timestamp.getFullYear() === (now.getFullYear() - 1);
      }
      if (includePrev && Array.isArray(receipt.items)) {
        receipt.items.forEach(item => {
          const key = item.medicineId || item.name;
          if (!key) return;
          const existing = prevSalesMap.get(key) || { quantity: 0, revenue: 0 };
          prevSalesMap.set(key, {
            quantity: existing.quantity + (Number(item.quantity) || 0),
            revenue: existing.revenue + ((Number(item.price) || 0) * (Number(item.quantity) || 0)),
          });
        });
      }
    });
    return prevSalesMap;
  }, [receipts, timeFilter]);

  const getTitle = () => {
    switch(timeFilter) {
      case 'day': return "Today's Top Selling Medicines";
      case 'month': return "This Month's Top Selling Medicines";
      case 'year': return "This Year's Top Selling Medicines";
      default: return "Sales by Medicine";
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Sales by Medicine
        </h2>
        
        <div className="flex bg-muted p-1 rounded-md">
          <button
            onClick={() => setTimeFilter('day')}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${
              timeFilter === 'day' 
                ? 'bg-background text-foreground shadow-sm font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${
              timeFilter === 'month' 
                ? 'bg-background text-foreground shadow-sm font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeFilter('year')}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${
              timeFilter === 'year' 
                ? 'bg-background text-foreground shadow-sm font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {aggregatedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No sales data for this period
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left rounded-tl-md">Medicine</th>
                <th className="px-3 py-2 text-right">Sold</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Trend</th>
                <th className="px-3 py-2 text-right">Last Sale</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right rounded-tr-md">Est. Days</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {aggregatedData.map((item, idx) => {
                const stock = stockMap.get(item.key) ?? stockMap.get(item.name) ?? 0;
                const velocity = avgDailyByMedicine.get(item.key) ?? avgDailyByMedicine.get(item.name) ?? 0;
                const daysLeft = velocity > 0 ? Math.floor(stock / velocity) : null;
                return (
                  <tr key={idx} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium truncate max-w-[150px]" title={item.name}>
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.quantity} <span className="text-xs text-muted-foreground">{item.unit || 'units'}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-blue-600">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.revenue)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(() => {
                        const prev = previousAggregates.get(item.name) || { quantity: 0 };
                        const prevQty = prev.quantity || 0;
                        const currQty = item.quantity || 0;
                        if (prevQty === 0) return '—';
                        const diff = ((currQty - prevQty) / prevQty) * 100;
                        const sign = diff > 0 ? '+' : '';
                        return `${sign}${diff.toFixed(0)}%`;
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.lastSoldAt ? new Date(item.lastSoldAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {stock}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {daysLeft !== null ? daysLeft : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
