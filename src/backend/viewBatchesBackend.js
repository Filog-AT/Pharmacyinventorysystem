/**
 * Backend logic for ViewBatchesModal component.
 * Contains data series building and batch status calculation.
 */

export const formatDateLabel = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};

export const buildLast30DaysSeries = (records, formatDateLabel) => {
  const series = [];
  const map = new Map();
  (records || []).forEach(r => {
    const d = r?.date_sold && typeof r.date_sold.toDate === 'function' ? r.date_sold.toDate() : new Date(r.date_sold);
    const key = new Date(d);
    key.setHours(0, 0, 0, 0);
    const kStr = key.toISOString();
    const prev = map.get(kStr) || 0;
    map.set(kStr, prev + Number(r.quantity_sold || 0));
  });
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const kStr = new Date(d).toISOString();
    const units = map.get(kStr) || 0;
    series.push({ date: new Date(d), label: formatDateLabel(d), units });
  }
  return series;
};

export const getBatchStatus = (expiryDate, quantity, today) => {
  const exp = new Date(expiryDate);
  const isExpired = exp < today;
  const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isSoon = daysUntilExpiry <= 90 && daysUntilExpiry > 0;

  if (isExpired) return { label: 'Expired', color: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm ring-1 ring-rose-400/20' };
  if (isSoon) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm ring-1 ring-amber-400/20' };
  if (quantity === 0) return { label: 'Out of Stock', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  return { label: 'Healthy', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

export const calculateForecast = (series, currentStock, today) => {
  const totalLast30 = series.reduce((sum, d) => sum + (Number(d.units) || 0), 0);
  const dailyUsage = totalLast30 / 30;
  const predicted30 = dailyUsage * 30;
  const daysRemaining = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : null;
  const stockoutDate = daysRemaining != null ? new Date(today.getTime() + daysRemaining * 24 * 60 * 60 * 1000) : null;
  const reorderPoint = dailyUsage * 10;
  const reorderAlert = dailyUsage > 0 ? currentStock <= reorderPoint : false;

  return {
    dailyUsage,
    predicted30,
    daysRemaining,
    stockoutDate,
    reorderPoint,
    reorderAlert,
  };
};
