/**
 * Backend logic for Inventory component.
 * Contains data processing and calculation functions.
 */

export const getStockStatus = (totalQuantity, minStockLevel) => {
  const qty = Number(totalQuantity || 0);
  const min = Number(minStockLevel || 50);
  if (qty === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
  if (qty <= min) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Normal', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

export const getFilteredMedicines = (safeMedicines, searchTerm, categoryFilter, viewMode, selectedCategory) => {
  const effectiveCategoryFilter = (viewMode === 'categories' && selectedCategory) 
    ? selectedCategory 
    : categoryFilter;

  return safeMedicines
    .filter(m => {
      if (m.isArchived) return false;
      const matchesText =
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.strength || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = effectiveCategoryFilter === 'All' || (m.category || 'Uncategorized') === effectiveCategoryFilter;
      return matchesText && matchesCategory;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

export const getGroupedMedicines = (filteredMedicines) => {
  const groups = new Map();
  filteredMedicines.forEach(m => {
    const nameKey = (m.name || '').trim().toLowerCase();
    if (!groups.has(nameKey)) {
      groups.set(nameKey, {
        name: m.name,
        category: m.category,
        variations: [],
        totalQuantity: 0,
        id: nameKey,
        minStockLevel: m.minStockLevel || 50
      });
    }
    const group = groups.get(nameKey);
    group.variations.push(m);
    group.totalQuantity += Number(m.totalQuantity || 0);
    if (m.minStockLevel && m.minStockLevel > group.minStockLevel) {
      group.minStockLevel = m.minStockLevel;
    }
  });
  return Array.from(groups.values());
};

export const getCategoryStats = (safeMedicines, safeCategories) => {
  const stats = new Map();
  // Initialize with safeCategories which are now {id, name} objects
  safeCategories.forEach(cat => {
    const name = typeof cat === 'string' ? cat : cat.name;
    stats.set(name, { count: 0, totalValue: 0, lowStock: 0, itemCount: 0, expired: 0, id: cat.id || name });
  });
  
  safeMedicines.forEach(m => {
    const catName = m.category || 'Uncategorized';
    if (!stats.has(catName)) {
      stats.set(catName, { count: 0, totalValue: 0, lowStock: 0, itemCount: 0, expired: 0, id: m.categoryId || catName });
    }
    const s = stats.get(catName);
    const totalQty = Number(m.totalQuantity || 0);
    s.count += totalQty;
    s.totalValue += totalQty * Number(m.price || 0);
    s.itemCount += 1;
    const effectiveMin = Math.max(50, Number(m.minStockLevel || 0));
    if (totalQty <= effectiveMin) {
      s.lowStock += 1;
    }
    const today = new Date(); 
    today.setHours(0,0,0,0);
    const expiredBatches = (m.batches || []).filter(b => {
      const d = b.expiryDate ? new Date(b.expiryDate) : null;
      if (!d || isNaN(d.getTime())) return false;
      d.setHours(0,0,0,0);
      return d < today && Number(b.quantity || 0) > 0;
    }).length;
    if (expiredBatches > 0) s.expired += 1;
  });
  return Array.from(stats.entries()).map(([name, data]) => ({ name, ...data }));
};
