/**
 * Backend logic for AddStockForm component.
 * Contains stock calculation and validation functions.
 */

export const calculateTotalUnits = (boxes, blisters, units) => {
  return (Number(boxes) || 0) * (Number(blisters) || 1) * (Number(units) || 1);
};

export const isBottle = (medicine) => {
  const form = String(medicine?.dosageForm || '').toLowerCase().trim();
  const unit = String(medicine?.unit || '').toLowerCase().trim();
  const bottleForms = new Set(['bottle']);
  const bottleUnits = new Set(['bottle', 'bottles']);
  return bottleForms.has(form) || bottleUnits.has(unit);
};

export const validateFormData = (formData) => {
  if (!formData.medicineId) return 'Please select a medicine';
  if (Number(formData.boxesReceived || 0) <= 0) return 'Boxes received must be greater than 0';
  return null;
};
