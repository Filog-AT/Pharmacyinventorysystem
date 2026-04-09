/**
 * Backend logic for PrescriptiveRecommendations component.
 * Contains smart recommendation generation functions.
 */

export const getRecommendations = (medicines, today) => {
  const medRecommendations = new Map();

  const daysBetween = (dateStr) => {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const addRecommendation = (m, data) => {
    // Generate a unique ID based on brandName (or name), strength, and dosage form to avoid duplicates
    const displayName = m.brandName || m.name;
    const uniqueId = `${displayName}|${m.strength}|${m.dosageForm}`.toLowerCase();
    
    if (!medRecommendations.has(uniqueId)) {
      medRecommendations.set(uniqueId, {
        id: uniqueId,
        product: `${displayName} ${m.strength} (${m.dosageForm})`,
        stock: `${m.totalQuantity || 0} ${m.unit || ''}`.trim(),
        status: 'Normal',
        priority: 'LOW',
        actions: [],
        reason: ''
      });
    }
    const entry = medRecommendations.get(uniqueId);
    
    if (data.status) entry.status = data.status;
    if (data.priority) {
      const priorityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
      if (priorityOrder[data.priority] > priorityOrder[entry.priority]) {
        entry.priority = data.priority;
      }
    }
    if (data.action && !entry.actions.includes(data.action)) {
      entry.actions.push(data.action);
    }
    if (data.reason) {
      entry.reason = entry.reason ? `${entry.reason} + ${data.reason}` : data.reason;
    }
  };

  for (const m of medicines) {
    const qty = m.totalQuantity || 0;
    const min = m.minStockLevel || 0;
    const reorderPoint = Math.max(1, min || 10);
    
    let earliestExpiry = null;
    if (m.batches && m.batches.length > 0) {
      const validBatches = m.batches.filter(b => b.expiryDate);
      if (validBatches.length > 0) {
        earliestExpiry = validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0].expiryDate;
      }
    }
    
    const daysToExpiry = earliestExpiry ? daysBetween(earliestExpiry) : Infinity;
    const supplier = m.batches?.[0]?.supplier || '';
    const price = Number(m.price || 0);

    // 1. Critical Stock Logic
    if (qty <= 0) {
      addRecommendation(m, {
        status: 'Critical',
        priority: 'CRITICAL',
        action: `Emergency reorder (${Math.max(50, min || 50)} units) immediately`,
        reason: 'Out of stock'
      });
    } else if (qty <= Math.ceil(reorderPoint / 3)) {
      addRecommendation(m, {
        status: 'Critical Low Stock',
        priority: 'HIGH',
        action: `Emergency reorder (${Math.ceil(min * 1.5)} units)`,
        reason: 'Stock may run out in 2–3 days'
      });
    } else if (qty <= min) {
      addRecommendation(m, {
        status: 'Warning',
        priority: 'HIGH',
        action: `Reorder ${Math.ceil((min - qty) + min * 0.25)} units`,
        reason: 'Below reorder point'
      });
    }

    // 2. Expiry Logic
    if (daysToExpiry <= 0) {
      addRecommendation(m, {
        status: 'Expired',
        priority: 'CRITICAL',
        action: 'Remove from shelf immediately',
        reason: 'Product has expired'
      });
    } else if (daysToExpiry <= 30) {
      addRecommendation(m, {
        status: 'Expiring Soon',
        priority: 'HIGH',
        action: `Apply discount / Move to front display`,
        reason: `Expires in ${daysToExpiry} days`
      });
      if (supplier) {
        addRecommendation(m, { action: `Check return policy with ${supplier}` });
      }
    } else if (daysToExpiry <= 90) {
      addRecommendation(m, {
        status: 'Near Expiry',
        priority: 'MEDIUM',
        action: 'Bundle with related medicine',
        reason: 'Expires within 3 months'
      });
    }

    // 3. Overstock Logic
    if (qty > (min || 1) * 6) {
      addRecommendation(m, {
        status: 'Overstock',
        priority: 'LOW',
        action: 'Reduce next purchase order',
        reason: 'Current stock exceeds demand'
      });
    }
    if (qty > (min || 1) * 3 && price >= 500) {
      addRecommendation(m, {
        status: 'Slow Moving',
        priority: 'LOW',
        action: 'Review pricing / Consider discount',
        reason: 'High inventory value + slow turnover'
      });
    }

    // 4. Smart/Predictive Add-ons
    if (qty <= min) {
      if (min < 20) {
        addRecommendation(m, { action: `Increase min stock level to ${Math.max(20, Math.ceil(min * 1.5))}` });
      }
      if (supplier) {
        addRecommendation(m, { action: `Place order to ${supplier}` });
      }
      
      const alternatives = medicines.filter(x => 
        x.id !== m.id && 
        (x.name || '').toLowerCase() === (m.name || '').toLowerCase() && 
        (x.brandName || '').toLowerCase() !== (m.brandName || '').toLowerCase() &&
        Number(x.totalQuantity || 0) > Math.max(1, Number(x.minStockLevel || 0))
      );
      if (alternatives.length > 0) {
        const altBrand = alternatives[0].brandName || alternatives[0].name;
        addRecommendation(m, { action: `Suggest alternative: ${altBrand}` });
      }
    }
  }

  return Array.from(medRecommendations.values())
    .filter(r => r.status !== 'Normal' || r.actions.length > 0)
    .sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
};
