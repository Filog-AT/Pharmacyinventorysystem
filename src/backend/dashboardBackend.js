/**
 * Backend logic for Dashboard component.
 * Contains data processing and calculation functions.
 */

export const getStats = (medicines) => {
  const today = new Date();
  const uniqueKey = (m) => `${(m.name || '').toLowerCase()}|${(m.dosageForm || '').toLowerCase()}|${(m.strength || '').toLowerCase()}`;
  const totalMedicines = new Set(medicines.map(uniqueKey)).size;
  
  const totalStock = medicines.reduce((sum, m) => sum + (m.totalQuantity || 0), 0);

  const lowStock = medicines.filter(m => {
    const qty = m.totalQuantity || 0;
    const threshold = m.minStockLevel || 50;
    return qty > 0 && qty <= threshold;
  }).length;

  const expiringSoon = medicines.filter(m => {
    if (m.batches && m.batches.length > 0) {
      return m.batches.some(b => {
        const exp = b.expiryDate ? new Date(b.expiryDate) : null;
        if (!exp || isNaN(exp.getTime())) return false;
        const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 90 && days > 0;
      });
    }
    return false;
  }).length;

  const expired = medicines.filter(m => {
    if (m.batches && m.batches.length > 0) {
      return m.batches.some(b => {
        const exp = b.expiryDate ? new Date(b.expiryDate) : null;
        return exp && !isNaN(exp.getTime()) && exp < today;
      });
    }
    return false;
  }).length;

  const totalValue = medicines.reduce((sum, m) => sum + ((m.totalQuantity || 0) * (m.price || 0)), 0);

  return { totalMedicines, lowStock, expiringSoon, expired, totalValue };
};

export const getCategoryStockData = (medicines) => {
  const map = new Map();
  medicines.forEach(m => {
    const key = m.category || 'Uncategorized';
    const prev = map.get(key) || 0;
    map.set(key, prev + (m.totalQuantity || 0));
  });
  return Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity }));
};

export const getStatusDistribution = (medicines) => {
  let healthy = 0, low = 0, outOfStock = 0, expired = 0;
  const today = new Date();

  medicines.forEach(m => {
    const qty = m.totalQuantity || 0;
    const minStock = m.minStockLevel || 50;

    const hasExpiredBatch = m.batches?.some(b => {
      const exp = b.expiryDate ? new Date(b.expiryDate) : null;
      return exp && !isNaN(exp.getTime()) && exp < today;
    });

    if (hasExpiredBatch) {
      expired += 1;
    } else if (qty === 0) {
      outOfStock += 1;
    } else if (qty <= minStock) {
      low += 1;
    } else {
      healthy += 1;
    }
  });

  return [
    { name: 'Healthy', value: healthy, color: '#22c55e' },
    { name: 'Low Stock', value: low, color: '#f59e0b' },
    { name: 'Out of Stock', value: outOfStock, color: '#ef4444' },
    { name: 'Expired', value: expired, color: '#991b1b' },
  ];
};

export const getSalesAggregates = (receipts) => {
  const now = new Date();
  let todayTotal = 0;
  const monthsBack = 12;
  const monthKeys = [];
  const monthTotals = new Map();
  const yearlyTotals = new Map();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push({ key, date: d });
    monthTotals.set(key, 0);
  }
  (receipts || []).forEach(r => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    const amount = Number(r.grandTotal || r.total || r.subtotal || 0);
    if (ts.toDateString() === now.toDateString()) {
      todayTotal += amount;
    }
    const mkey = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
    if (monthTotals.has(mkey)) {
      monthTotals.set(mkey, (monthTotals.get(mkey) || 0) + amount);
    }
    yearlyTotals.set(ts.getFullYear(), (yearlyTotals.get(ts.getFullYear()) || 0) + amount);
  });
  const yearlyData = Array.from(yearlyTotals.entries()).map(([year, total]) => ({ year, total }));
  const monthlyData = monthKeys.map(({ key, date }) => ({
    month: date.getMonth() + 1,
    total: monthTotals.get(key) || 0
  }));
  return { todayTotal, monthlyData, yearlyData };
};

export const getLowStockMeds = (medicines) => {
  return medicines.filter(m => {
    const qty = Number(m.totalQuantity || 0);
    const threshold = Number(m.minStockLevel || 50);
    return qty > 0 && qty <= threshold;
  });
};

export const getOutOfStockMeds = (medicines) => {
  return medicines.filter(m => Number(m.totalQuantity || 0) <= 0);
};

export const getExpiringSoonItems = (medicines, statusModalWindow) => {
  const today = new Date();
  const result = [];
  medicines.forEach(m => {
    (m.batches || []).forEach(b => {
      const exp = b.expiryDate ? new Date(b.expiryDate) : null;
      if (!exp || isNaN(exp.getTime())) return;
      const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0 && days <= statusModalWindow) {
        result.push({ medId: m.id, medName: m.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantity: b.quantity });
      }
    });
  });
  return result.slice(0, 10);
};

export const getStockStatusCounts = (medicines, statusModalWindow) => {
  const today = new Date();
  let expired = 0, low = 0, expSoon = 0, normal = 0;
  
  (medicines || []).forEach(m => {
    const min = Number(m.minStockLevel || 50);
    
    (m.batches || []).forEach(b => {
      const qty = Number(b.quantity || 0);
      if (qty <= 0) return; // Skip empty batches for status counts

      const d = b.expiryDate ? new Date(b.expiryDate) : null;
      if (!d || isNaN(d.getTime())) return;
      
      const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      
      if (d < today) {
        expired += 1;
      } else if (days > 0 && days <= statusModalWindow) {
        expSoon += 1;
      } else if (qty <= min) {
        low += 1;
      } else {
        normal += 1;
      }
    });
  });
  
  return { expired, low, expSoon, normal };
};

export const getRevenueKPIs = (receipts, medicines) => {
  const totalRevenue = (receipts || []).reduce((sum, r) => sum + (r.grandTotal || r.subtotal || 0), 0);
  const totalSales = (receipts || []).length;
  const avgOrderValue = totalSales ? totalRevenue / totalSales : 0;
  const uniqueKey = (m) => `${(m.name || '').toLowerCase()}|${(m.dosageForm || '').toLowerCase()}|${(m.strength || '').toLowerCase()}`;
  const uniqueMedicinesCount = new Set(medicines.map(uniqueKey)).size;
  return { totalRevenue, totalSales, avgOrderValue, uniqueMedicinesCount };
};

export const getMonthlyCounts = (receipts, monthNames) => {
  const now = new Date();
  const monthsBack = 12;
  const monthKeys = [];
  const countsMap = new Map();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push({ key, date: d });
    countsMap.set(key, 0);
  }
  (receipts || []).forEach(r => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
    if (countsMap.has(key)) {
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    }
  });
  return monthKeys.map(({ key, date }) => ({
    month: date.getMonth() + 1,
    count: countsMap.get(key) || 0,
    label: monthNames[date.getMonth()]
  }));
};

export const getCategoryPieData = (categoryStockData) => {
  const palette = ['#3b82f6','#22c55e','#f59e0b','#eab308','#ef4444','#a855f7','#14b8a6','#f472b6','#0ea5e9','#84cc16'];
  return categoryStockData.map((d, i) => ({ name: d.name, value: d.quantity, color: palette[i % palette.length] }));
};

export const getCategoryDetailedStats = (medicines, safeCategories) => {
  const stats = new Map();
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
    s.stock += (m.totalQuantity || 0);
    s.value += (m.totalQuantity || 0) * (m.price || 0);
  });
  
  return Array.from(stats.values()).sort((a, b) => b.value - a.value);
};

export const getNotifications = (medicines, recentLogs, receipts) => {
  const list = [];
  const today = new Date();
  const readRaw = localStorage.getItem('pharmacy_read_notifications');
  const readSet = new Set(readRaw ? JSON.parse(readRaw) : []);

  const LOG_THRESHOLD = 500;
  const RECEIPT_THRESHOLD = 500;

  if (recentLogs.length >= LOG_THRESHOLD) {
    list.push({
      id: 'system-logs-threshold',
      type: 'info',
      title: 'System Cleanup',
      message: `Activity logs have reached ${recentLogs.length} entries. Consider clearing history to maintain performance.`,
      time: 'System'
    });
  }

  if (receipts.length >= RECEIPT_THRESHOLD) {
    list.push({
      id: 'system-receipts-threshold',
      type: 'info',
      title: 'System Cleanup',
      message: `Receipt history has reached ${receipts.length} entries. Consider archiving or clearing old records.`,
      time: 'System'
    });
  }

  medicines.forEach(med => {
    const qty = Number(med.totalQuantity || 0);
    const lowStockThreshold = med.minStockLevel || 50;
    if (qty <= lowStockThreshold) {
      list.push({ id: `low-${med.id}`, type: 'warning', title: 'Low Stock', message: `${med.name} is low (${qty})`, time: 'Recent' });
    }
    (med.batches || []).forEach((b) => {
      if (!b.expiryDate) return;
      const exp = new Date(b.expiryDate);
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      if (days < 0) {
        list.push({ id: `expired-${med.id}-${b.id}`, type: 'error', title: 'Expired', message: `${med.name} (Batch ${b.batchNumber}) expired`, time: 'Alert' });
      } else if (days <= 90) {
        list.push({ id: `expiring-${med.id}-${b.id}`, type: 'warning', title: 'Expiring Soon', message: `${med.name} expires in ${days}d`, time: 'Alert' });
      }
    });
  });

  return list.map(n => ({ ...n, read: readSet.has(n.id) }));
};

export const getStockPerMedicineAnalytics = (analyticsMedicines) => {
  return analyticsMedicines
    .map(m => ({
      name: m.name || 'Unknown',
      quantity: m.totalQuantity || 0
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
};

export const getCategoryDistributionAnalytics = (analyticsMedicines) => {
  const map = new Map();
  analyticsMedicines.forEach(m => {
    const name = m.category || 'Uncategorized';
    const qty = m.totalQuantity || 0;
    map.set(name, (map.get(name) || 0) + qty);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

export const getNearingExpiryBucketsAnalytics = (analyticsMedicines) => {
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
};

export const getReceiptsByDateRange = (receipts, analyticsStartDate, analyticsEndDate) => {
  const sd = analyticsStartDate ? new Date(analyticsStartDate) : null;
  const ed = analyticsEndDate ? new Date(analyticsEndDate) : null;
  return (receipts || []).filter(r => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    if (sd && ts < sd) return false;
    if (ed && ts > ed) return false;
    return true;
  });
};

export const getUsageOverTimeAnalytics = (receiptsByDateRange, analyticsTimeScale, analyticsFilterMedicine, analyticsFilterCategory, medicines) => {
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
};

export const getDemandForecastAnalytics = (receiptsByDateRange, analyticsFilterMedicine, analyticsFilterCategory, medicines) => {
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
};

export const getStockOutPredictionsAnalytics = (medicines, receiptsByDateRange, analyticsFilterCategory, analyticsFilterMedicine) => {
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
      const qty = m.totalQuantity || 0;
      const v = avgPerMed.get(m.id) || 0;
      const daysLeft = v > 0 ? qty / v : Infinity;
      const projectedDate = v > 0 ? new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000) : null;
      const reorderDays = 30;
      const reorderQty = Math.ceil(v * reorderDays);
      return { name: m.name, qty, avgDaily: v, daysLeft, projectedDate, reorderQty };
    })
    .sort((a, b) => (a.daysLeft === Infinity ? 1 : a.daysLeft) - (b.daysLeft === Infinity ? 1 : b.daysLeft))
    .slice(0, 20);
};

export const getTop10MedicinesByStock = (medicines) => {
  return [...medicines]
    .sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
    .slice(0, 10);
};

export const getExpiredItems = (medicines) => {
  const today = new Date();
  const expiredItems = [];
  medicines.forEach(m => {
    (m.batches || []).forEach(b => {
      const d = new Date(b.expiryDate);
      if (d < today && Number(b.quantity || 0) > 0) {
        expiredItems.push({ medId: m.id, medName: m.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantity: b.quantity });
      }
    });
  });
  return expiredItems;
};

export const getLast7DaysRevenueStrict = (receipts) => {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);
    days.push({ key, label: `${d.getMonth()+1}/${d.getDate()}`, total: 0 });
  }
  const map = new Map(days.map(d => [d.key, d]));
  (receipts || []).forEach(r => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    const key = ts.toISOString().slice(0,10);
    if (map.has(key)) {
      const d = map.get(key);
      d.total += Number(r.grandTotal || r.subtotal || 0);
    }
  });
  return days;
};

export const calculateMedicineForecast = (records, med, startPrevMonth, endPrevMonth) => {
  const byDay = new Map();
  for (let d = new Date(startPrevMonth); d <= endPrevMonth; d.setDate(d.getDate() + 1)) {
    const k = new Date(d);
    k.setHours(0,0,0,0);
    byDay.set(k.toDateString(), 0);
  }
  records.forEach(r => {
    const dt = r?.date_sold && typeof r.date_sold.toDate === 'function' ? r.date_sold.toDate() : new Date(r.date_sold);
    const k = new Date(dt);
    k.setHours(0,0,0,0);
    if (k >= startPrevMonth && k <= endPrevMonth) {
      const key = k.toDateString();
      byDay.set(key, (byDay.get(key) || 0) + Number(r.quantity_sold || 0));
    }
  });
  const series = Array.from(byDay.entries()).map(([k, v]) => {
    const dt = new Date(k);
    return { label: `${dt.getMonth()+1}/${dt.getDate()}`, units: v };
  });
  const daysInMonth = series.length || (endPrevMonth.getDate());
  const totalMonth = series.reduce((sum, d) => sum + (Number(d.units) || 0), 0);
  const dailyUsage = daysInMonth > 0 ? totalMonth / daysInMonth : 0;
  const predicted30 = dailyUsage * 30;
  const currentStock = Number(med.totalQuantity || 0);
  const daysRemaining = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : null;
  const stockoutDate = daysRemaining != null ? new Date(Date.now() + daysRemaining*24*60*60*1000) : null;
  const reorderPoint = dailyUsage * 10;
  const reorderAlert = dailyUsage > 0 ? currentStock <= reorderPoint : false;

  return { series, forecastData: { dailyUsage, predicted30, daysRemaining, stockoutDate, reorderPoint, reorderAlert } };
};

