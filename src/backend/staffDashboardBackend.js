/**
 * Backend logic for StaffDashboard component.
 * Contains data aggregation and filtering functions.
 */

export const calculateTodayStats = (receipts) => {
  const now = new Date();
  const todayStr = now.toDateString();
  let todaySales = 0;
  let todayUnitsSold = 0;
  let todayTransactions = 0;

  console.log(`[StaffDashboardBackend] Calculating stats for ${receipts?.length || 0} receipts. Today is: ${todayStr}`);

  (receipts || []).forEach(r => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    if (isNaN(ts.getTime())) {
      console.warn(`[StaffDashboardBackend] Invalid timestamp for receipt:`, r);
      return;
    }

    if (ts.toDateString() === todayStr) {
      const amount = Number(r.grandTotal || r.total || r.subtotal || 0);
      todaySales += amount;
      todayTransactions += 1;
      if (Array.isArray(r.items)) {
        todayUnitsSold += r.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
      }
    }
  });

  console.log(`[StaffDashboardBackend] Results: Sales=${todaySales}, Units=${todayUnitsSold}, Tx=${todayTransactions}`);
  return { todaySales, todayUnitsSold, todayTransactions };
};

export const getTodayHourlySales = (receipts) => {
  const now = new Date();
  const todayStr = now.toDateString();
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i}:00`,
    sales: 0,
    transactions: 0
  }));

  (receipts || []).forEach(r => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    if (isNaN(ts.getTime())) return;

    if (ts.toDateString() === todayStr) {
      const hour = ts.getHours();
      const amount = Number(r.grandTotal || r.total || r.subtotal || 0);
      hours[hour].sales += amount;
      hours[hour].transactions += 1;
    }
  });

  // Filter to show only hours with sales or from 8 AM to current hour
  const currentHour = now.getHours();
  return hours.filter(h => h.sales > 0 || (h.hour >= 8 && h.hour <= Math.max(17, currentHour)));
};

export const getSalesPerformance = (receipts, timeScale = 'daily') => {
  const now = new Date();
  const data = [];

  if (timeScale === 'daily') {
    // Past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      const key = d.toDateString();
      data.push({ key, label, sales: 0, transactions: 0 });
    }

    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (isNaN(ts.getTime())) return;
      const key = ts.toDateString();
      const item = data.find(d => d.key === key);
      if (item) {
        item.sales += Number(r.grandTotal || r.total || r.subtotal || 0);
        item.transactions += 1;
      }
    });
  } else if (timeScale === 'weekly') {
    // Past 8 weeks
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      // Go to Monday of that week
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - (day - 1));
      const label = `Wk ${d.getMonth() + 1}/${d.getDate()}`;
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
      data.push({ start, end, label, sales: 0, transactions: 0 });
    }

    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (isNaN(ts.getTime())) return;
      const item = data.find(d => ts >= d.start && ts <= d.end);
      if (item) {
        item.sales += Number(r.grandTotal || r.total || r.subtotal || 0);
        item.transactions += 1;
      }
    });
  } else if (timeScale === 'monthly') {
    // Past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      const month = d.getMonth();
      const year = d.getFullYear();
      data.push({ month, year, label, sales: 0, transactions: 0 });
    }

    (receipts || []).forEach(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      if (isNaN(ts.getTime())) return;
      const item = data.find(d => ts.getMonth() === d.month && ts.getFullYear() === d.year);
      if (item) {
        item.sales += Number(r.grandTotal || r.total || r.subtotal || 0);
        item.transactions += 1;
      }
    });
  }

  return data;
};

export const getCategoryStockData = (medicines) => {
  const map = new Map();
  (medicines || []).forEach(m => {
    const key = m.category || 'Uncategorized';
    const prev = map.get(key) || 0;
    map.set(key, prev + (m.totalQuantity || 0));
  });
  return Array.from(map.entries()).map(([name, qty]) => ({ name, quantity: qty }));
};

export const getExpiringSoon = (medicines) => {
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000);
  const items = [];
  (medicines || []).forEach(m => {
    if (Array.isArray(m.batches)) {
      m.batches.forEach(b => {
        if (!b.expiryDate) return;
        const d = new Date(b.expiryDate);
        if (d >= today && d <= in30) {
          items.push({
            medId: m.id,
            name: m.name,
            batch: b.batchNumber || b.id,
            expiry: d.toISOString().slice(0, 10),
          });
        }
      });
    }
  });
  items.sort((a, b) => a.expiry.localeCompare(b.expiry));
  return items.slice(0, 8);
};
