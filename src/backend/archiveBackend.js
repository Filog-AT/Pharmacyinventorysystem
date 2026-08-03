export const AUTO_ARCHIVE_DAYS = 30;

export const shouldAutoArchiveBatch = (batch, now = new Date()) => {
  if (!batch) return false;
  if (batch.isArchived || batch.archivedAt) return false;
  if (Number(batch.quantity || 0) > 0) return false;
  if (!batch.depletedAt) return false;

  const depletedAt = new Date(batch.depletedAt);
  if (Number.isNaN(depletedAt.getTime())) return false;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - AUTO_ARCHIVE_DAYS);
  return depletedAt <= cutoff;
};

export const getArchivedBatchRows = (medicines = []) => {
  return (medicines || [])
    .flatMap((medicine) => {
      const batches = Array.isArray(medicine?.archivedBatches) ? medicine.archivedBatches : [];
      return batches.map((batch) => ({
        medicineId: medicine.id,
        medicineName: medicine.name || 'Unknown',
        brandName: medicine.brandName || 'Unknown',
        batchNumber: batch.batchNumber || 'N/A',
        quantity: Number(batch.quantity || 0),
        expiryDate: batch.expiryDate || 'N/A',
        reason: batch.archiveReason || 'Manual',
        archivedAt: batch.archivedAt || batch.createdAt || '',
        batch,
      }));
    })
    .sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0));
};

export const getArchivedMedicineRows = (medicines = []) => {
  return (medicines || [])
    .filter((medicine) => medicine?.isArchived)
    .map((medicine) => ({
      medicineId: medicine.id,
      genericName: medicine.name || 'Unknown',
      brandName: medicine.brandName || 'Unknown',
      category: medicine.category || 'Uncategorized',
      archivedAt: medicine.archivedAt || medicine.createdAt || '',
      reason: medicine.archiveReason || 'Manual',
      medicine,
    }))
    .sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0));
};
