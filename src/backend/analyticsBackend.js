/**
 * Backend logic for Analytics component.
 * Contains data processing and calculation functions.
 */

export const getRevenueData = (receipts, timeScale) => {
  const now = new Date();
  const data = [];
  const totals = new Map();
  const counts = new Map();

  if (timeScale === 'weekly') {
    // Last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - (day - 1)); // Monday
      const key = d.toISOString().slice(0, 10);
      data.push({ key, label: `Wk ${d.getMonth() + 1}/${d.getDate()}` });
      totals.set(key, 0);
      counts.set(key, 0);
    }
    receipts.forEach(r => {
      const ts = r?.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      const day = ts.getDay() || 7;
      const d = new Date(ts);
      d.setDate(d.getDate() - (day - 1));
      d.setHours(0, 0, 0, 0);
      const k = d.toISOString().slice(0, 10);
      if (totals.has(k)) {
        totals.set(k, totals.get(k) + Number(r.grandTotal || 0));
        counts.set(k, counts.get(k) + 1);
      }
    });
  } else if (timeScale === 'yearly') {
    // Last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      const key = String(year);
      data.push({ key, label: key });
      totals.set(key, 0);
      counts.set(key, 0);
    }
    receipts.forEach(r => {
      const ts = r?.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      const k = String(ts.getFullYear());
      if (totals.has(k)) {
        totals.set(k, totals.get(k) + Number(r.grandTotal || 0));
        counts.set(k, counts.get(k) + 1);
      }
    });
  } else {
    // Monthly (default) - Last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      data.push({ key, label: d.toLocaleString(undefined, { month: 'short' }) });
      totals.set(key, 0);
      counts.set(key, 0);
    }
    receipts.forEach(r => {
      const ts = r?.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      const k = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      if (totals.has(k)) {
        totals.set(k, totals.get(k) + Number(r.grandTotal || 0));
        counts.set(k, counts.get(k) + 1);
      }
    });
  }

  return data.map(d => ({ 
    label: d.label, 
    total: totals.get(d.key) || 0,
    transactions: counts.get(d.key) || 0
  }));
};

export const getTopBottomSold = (receipts, medicines, timeScale = 'month') => {
  const medSales = new Map();
  const now = new Date();
  
  const filteredReceipts = receipts.filter(r => {
    const ts = r?.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
    if (timeScale === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return ts >= sevenDaysAgo;
    } else if (timeScale === 'yearly') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return ts >= oneYearAgo;
    } else {
      // Monthly (default)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return ts >= thirtyDaysAgo;
    }
  });

  filteredReceipts.forEach(r => {
    if (Array.isArray(r.items)) {
      r.items.forEach(it => {
        const qty = Number(it.quantity || 0);
        medSales.set(it.medicineId, (medSales.get(it.medicineId) || 0) + qty);
      });
    }
  });

  const sorted = medicines.map(m => ({
    name: m.name,
    sales: medSales.get(m.id) || 0
  })).sort((a, b) => b.sales - a.sales);

  return {
    top10: sorted.slice(0, 10),
    bottom10: sorted.filter(m => m.sales >= 0).reverse().slice(0, 10)
  };
};

export const getSeasonalDemand = (medicines) => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11

  const seasons = [
    {
      name: 'Winter',
      months: 'December-February',
      monthIndices: [11, 0, 1],
      reason: 'High incidence of influenza, common colds, and respiratory infections.',
      categories: ['cough', 'cold', 'respiratory', 'flu', 'painkiller', 'antibiotic']
    },
    {
      name: 'Spring/Summer',
      months: 'March-May',
      monthIndices: [2, 3, 4],
      reason: 'Increase in allergies, skin conditions, and need for vitamins due to heat.',
      categories: ['allergy', 'antihistamine', 'dermatological', 'vitamin', 'supplement', 'sun']
    },
    {
      name: 'Rainy Season',
      months: 'June-September',
      monthIndices: [5, 6, 7, 8],
      reason: 'Peak season for water-borne diseases, dengue, and flu outbreaks.',
      categories: ['flu', 'gastrointestinal', 'diarrhea', 'antibiotic', 'painkiller']
    },
    {
      name: 'Transition',
      months: 'October-November',
      monthIndices: [9, 10],
      reason: 'General wellness and preparation for the holiday/cold season.',
      categories: ['vitamin', 'supplement', 'painkiller']
    }
  ];

  // Filter to only include the current season
  const currentSeason = seasons.find(s => s.monthIndices.includes(currentMonth)) || seasons[0];

  const demandData = medicines
    .filter(m => 
      currentSeason.categories.some(cat => (m.category || '').toLowerCase().includes(cat))
    )
    .map(m => ({
      name: m.name,
      demand: Math.floor(Math.random() * 40) + 60 // Assign a high random demand
    }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 5);

  return [{
    ...currentSeason,
    medicines: demandData
  }];
};

export const getStockByCategory = (medicines, filterCategory) => {
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
};

export const getStockPerMedicine = (medicines, filterCategory) => {
  return medicines
    .filter(m => (filterCategory === 'All' || m.category === filterCategory))
    .map(m => ({
      name: `${m.name}${m.strength ? ' ' + m.strength : ''}${m.dosageForm ? ' • ' + m.dosageForm : ''}`,
      quantity: Number(m.totalQuantity || 0)
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
};

export const getNearingExpiryBuckets = (medicines, filterCategory) => {
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
};

export const getAvailabilityCards = (medicines) => {
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
};
