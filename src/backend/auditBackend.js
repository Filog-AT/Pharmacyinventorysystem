/**
 * Backend logic for AuditLog component.
 * Contains data normalization and filtering functions.
 */

export const normalizeLogs = (fetched) => {
  return fetched.map(l => {
    const ts = l.timestamp;
    const date =
      ts && typeof ts.toDate === 'function'
        ? ts.toDate()
        : ts instanceof Date
        ? ts
        : ts
        ? new Date(ts)
        : new Date();
    return { ...l, timestamp: date };
  });
};

export const filterLogs = (logs, filters) => {
  // Exclude MEDICINE_SOLD and SALE_COMPLETED actions
  let filtered = logs.filter(
    (log) => log.action !== 'MEDICINE_SOLD' && log.action !== 'SALE_COMPLETED'
  );

  if (filters.action) {
    filtered = filtered.filter((log) => log.action === filters.action);
  }

  if (filters.userId) {
    filtered = filtered.filter(log => log.userId === filters.userId);
  }

  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter(log => {
      try {
        const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
        return logDate >= startDate;
      } catch {
        return false;
      }
    });
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(log => {
      try {
        const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
        return logDate <= endDate;
      } catch {
        return false;
      }
    });
  }

  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(log =>
      (log.userName || '').toLowerCase().includes(term) ||
      (log.entityName || '').toLowerCase().includes(term) ||
      (log.details?.customerName || '').toLowerCase().includes(term)
    );
  }

  return filtered;
};

export const getTimestampString = (timestamp) => {
  try {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return '';
  }
};

export const generateCSV = (filteredLogs, actionColors) => {
  if (filteredLogs.length === 0) return null;
  
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'Details'];
  const rows = filteredLogs.map(log => [
    getTimestampString(log.timestamp),
    log.userName || '',
    (actionColors[log.action]?.label || log.action || ''),
    log.entityType || '',
    log.entityName || '—',
    JSON.stringify(log.details || {}),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
};
