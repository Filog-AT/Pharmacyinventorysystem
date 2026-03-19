/**
 * Backend logic for Reports component.
 * Contains data processing for charts and metrics.
 */

export const getSalesTrendData = (receipts) => {
  const groups = {};
  receipts.forEach(r => {
    const date = r.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    const month = date.toLocaleString('default', { month: 'short' });
    if (!groups[month]) groups[month] = { month, revenue: 0, sales: 0 };
    groups[month].revenue += (r.grandTotal || 0);
    groups[month].sales += 1;
  });
  
  return Object.values(groups).reverse();
};

export const getCategoryData = (medicines) => {
  return medicines.reduce((acc, med) => {
    const category = med.category || 'Uncategorized';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += (med.totalQuantity || 0);
    } else {
      acc.push({ name: category, value: (med.totalQuantity || 0) });
    }
    return acc;
  }, []);
};

export const calculateMetrics = (receipts) => {
  const totalRevenue = receipts.reduce((sum, r) => sum + (r.grandTotal || 0), 0);
  const totalSales = receipts.length;
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  return { totalRevenue, totalSales, avgOrderValue };
};
