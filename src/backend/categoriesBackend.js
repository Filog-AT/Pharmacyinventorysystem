/**
 * Backend logic for Categories component.
 * Contains data aggregation and statistics calculation functions.
 */

export const getCategoryStats = (safeMedicines, safeCategories) => {
  // Start with explicitly defined categories
  const stats = new Map();
  
  // Initialize stats for all defined categories
  safeCategories.forEach(cat => {
    stats.set(cat, { count: 0, totalValue: 0, lowStock: 0, items: [] });
  });
  
  // Aggregate medicine data
  safeMedicines.forEach(med => {
    const category = med.category || 'Uncategorized';
    // If we encounter a category not in our list, add it dynamically
    if (!stats.has(category)) {
      stats.set(category, { count: 0, totalValue: 0, lowStock: 0, items: [] });
    }
    
    const cat = stats.get(category);
    const qty = Number(med.totalQuantity || 0);
    cat.count += qty;
    cat.totalValue += qty * (med.price || 0);
    cat.items.push(med);
    
    if (qty <= (med.minStockLevel || 0)) {
      cat.lowStock += 1;
    }
  });

  return Array.from(stats.entries()).map(([name, data]) => ({
    name,
    ...data,
    itemCount: data.items.length
  }));
};
