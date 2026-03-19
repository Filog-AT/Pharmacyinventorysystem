/**
 * Backend logic for Customers component.
 * Contains filtering and statistics calculation functions.
 */

export const filterCustomers = (customers, searchTerm) => {
  return customers.filter(customer =>
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone || '').includes(searchTerm)
  );
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

export const calculateCustomerStats = (customers) => {
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.totalPurchases) || 0), 0);
  const averagePurchase = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  
  return { totalCustomers, totalRevenue, averagePurchase };
};
