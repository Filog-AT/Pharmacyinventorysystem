/**
 * Backend logic for Categories component.
 * Contains data aggregation and statistics calculation functions.
 */

export const getCategoryStats = (safeMedicines, safeCategories) => {
  const stats = new Map();
  
  // Initialize with safeCategories which are now {id, name} objects
  safeCategories.forEach(cat => {
    const name = typeof cat === 'string' ? cat : cat.name;
    stats.set(name, { count: 0, totalValue: 0, lowStock: 0, items: [], id: cat.id || name });
  });
  
  // Aggregate medicine data
  safeMedicines.forEach(med => {
    const category = med.category || 'Uncategorized';
    if (!stats.has(category)) {
      stats.set(category, { count: 0, totalValue: 0, lowStock: 0, items: [], id: med.categoryId || category });
    }
    
    const cat = stats.get(category);
    const qty = Number(med.totalQuantity || 0);
    cat.count += qty;
    cat.totalValue += qty * (med.price || 0);
    cat.items.push(med);
    
    const minStock = Number(med.minStockLevel || 50);
    if (qty <= minStock) {
      cat.lowStock += 1;
    }
  });

  return Array.from(stats.entries()).map(([name, data]) => ({
    name,
    ...data,
    itemCount: data.items.length
  }));
};
