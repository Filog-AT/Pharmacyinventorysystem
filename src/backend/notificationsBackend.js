/**
 * Backend logic for Notifications component.
 * Contains notification generation functions.
 */

export const generateNotifications = (medicines, today) => {
  const notifications = [];

  medicines.forEach(med => {
    if (!med || !med.id) return; // Skip invalid medicines

    // Low stock notifications
    const qty = Number(med.totalQuantity || 0);
    const lowStockThreshold = med.minStockLevel || 50;
    
    if (qty <= lowStockThreshold) {
      notifications.push({
        id: `low-${med.id}`,
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${med.name || 'Unknown medicine'} is running low. Current stock: ${qty} ${med.unit || 'units'}`,
        time: 'Recent',
        read: false
      });
    }

    // Expiry notifications from batches
    if (med.batches && Array.isArray(med.batches)) {
      med.batches.forEach(batch => {
        if (!batch.expiryDate) return;
        const expiryDate = new Date(batch.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          notifications.push({
            id: `expired-${med.id}-${batch.id}`,
            type: 'error',
            title: 'Expired Batch',
            message: `${med.name} (Batch: ${batch.batchNumber}) has expired. Please remove ${batch.quantity} units from inventory.`,
            time: 'Alert',
            read: false
          });
        } else if (daysUntilExpiry <= 90) { // Notify 3 months before
          notifications.push({
            id: `expiring-${med.id}-${batch.id}`,
            type: 'warning',
            title: 'Batch Expiring Soon',
            message: `${med.name} (Batch: ${batch.batchNumber}) will expire in ${daysUntilExpiry} days.`,
            time: 'Alert',
            read: false
          });
        }
      });
    }
  });

  return notifications;
};

export const isNotificationRead = (id, readSet) => {
  if (readSet.has(id)) return true;
  if (id.startsWith('expiring-')) {
    return readSet.has(id.replace('expiring-', 'expired-'));
  }
  if (id.startsWith('expired-')) {
    return readSet.has(id.replace('expired-', 'expiring-'));
  }
  return false;
};
