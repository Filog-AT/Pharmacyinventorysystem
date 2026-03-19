/**
 * Backend logic for SalesPOS component.
 * Contains data processing and calculation functions.
 */

export const getUnitMultiplier = (m, unit) => {
  // Get multipliers from the first batch if available, otherwise default to 1
  let blistersPerBox = 1;
  let unitsPerBlister = 1;

  if (Array.isArray(m.batches) && m.batches.length > 0) {
    const b = m.batches[0];
    blistersPerBox = Number(b?.blistersPerBox || 1);
    unitsPerBlister = Number(b?.unitsPerBlister || 1);
  }

  if (unit === 'blister') {
    return unitsPerBlister;
  }
  if (unit === 'box') {
    return blistersPerBox * unitsPerBlister;
  }
  return 1; // 'piece' or 'unit'
};

export const getTabletCount = (m) => {
  if (Array.isArray(m.batches) && m.batches.length > 0) {
    const today = new Date();
    const validBatch = m.batches.find(b => new Date(b.expiryDate) >= today && b.quantity > 0) || m.batches[0];
    return Number(validBatch?.unitsPerBlister || 0);
  }
  return 0;
};

export const getBoxTabletCount = (m) => {
  if (Array.isArray(m.batches) && m.batches.length > 0) {
    const today = new Date();
    const validBatch = m.batches.find(b => new Date(b.expiryDate) >= today && b.quantity > 0) || m.batches[0];
    return Number(validBatch?.blistersPerBox || 0) * Number(validBatch?.unitsPerBlister || 0);
  }
  return 0;
};

export const getMaxSaleQuantity = (m, unit) => {
  const available = Number(m.totalQuantity || 0);
  const mult = getUnitMultiplier(m, unit);
  if (mult <= 0) return 0;
  return Math.floor(available / mult);
};
