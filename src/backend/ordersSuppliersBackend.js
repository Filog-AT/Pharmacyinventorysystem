/**
 * Backend logic for OrdersSuppliers component.
 * Contains status badge logic and other processing functions.
 */

export const getStatusBadgeConfig = (status) => {
  const base = 'px-2 py-1 rounded text-xs font-medium';
  if (status === 'Completed') return { className: `${base} bg-green-100 text-green-700`, label: 'Completed' };
  if (status === 'Cancelled') return { className: `${base} bg-red-100 text-red-700`, label: 'Cancelled' };
  return { className: `${base} bg-yellow-100 text-yellow-800`, label: 'Pending' };
};

export const formatOrderStatusDate = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString();
  } catch (e) {
    return '';
  }
};
