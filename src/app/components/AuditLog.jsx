import { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Eye, EyeOff } from 'lucide-react';
import { auditService } from '@/services/auditService';

const actionColors = {
  MEDICINE_ADD: { bg: 'bg-green-100', text: 'text-green-700', label: 'Medicine Added' },
  MEDICINE_EDIT: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medicine Edited' },
  MEDICINE_DELETE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Medicine Deleted' },
  MEDICINE_SOLD: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Medicine Sold' },
  USER_ADD: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'User Added' },
  USER_EDIT: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'User Edited' },
  USER_DELETE: { bg: 'bg-red-100', text: 'text-red-700', label: 'User Deleted' },
  LOGIN: { bg: 'bg-green-100', text: 'text-green-700', label: 'Login' },
  LOGOUT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Logout' },
};

export function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showDetails, setShowDetails] = useState({});
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    searchTerm: '',
  });

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const fetched = await auditService.getLogs({ limit: 200 });
      const normalized = fetched.map(l => {
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
      setLogs(normalized);
    } catch (error) {
      console.error('[AuditLog] Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Clear all activity logs? This cannot be undone.')) return;
    setClearing(true);
    try {
      await auditService.clearAllLogs();
      await loadLogs();
    } catch (error) {
      console.error('[AuditLog] Error clearing logs:', error);
    } finally {
      setClearing(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
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

    setFilteredLogs(filtered);
  };

  const toggleDetails = (logId) => {
    setShowDetails(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const getTimestampString = (timestamp) => {
    try {
      if (!timestamp) return '';
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return '';
    }
  };

  const downloadCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'Details'];
    const rows = filteredLogs.map(log => [
      getTimestampString(log.timestamp),
      log.userName || '',
      (actionColors[log.action]?.label || log.action || ''),
      log.entityType || '',
      log.entityName || '—',
      JSON.stringify(log.details || {}),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Activity Audit Log</h2>
        <p className="text-muted-foreground">Track all actions performed in the system</p>
      </div>

      {/* Top Stats */}
      {filteredLogs.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Activities</p>
            <p className="text-2xl font-bold text-card-foreground">{filteredLogs.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">Medicines Sold</p>
            <p className="text-2xl font-bold text-card-foreground">{filteredLogs.filter(l => l.action === 'MEDICINE_SOLD').length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">Changes Made</p>
            <p className="text-2xl font-bold text-card-foreground">
              {filteredLogs.filter(l => ['MEDICINE_ADD', 'MEDICINE_EDIT', 'MEDICINE_DELETE', 'PHARMACY_EDIT'].includes(l.action)).length}
            </p>
          </div>
        </div>
      )
      }

      {/* Filters */}
      <div className="mb-6 bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-card-foreground">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
            >
              <option value="">All Actions</option>
              {Object.entries(actionColors).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={downloadCSV}
              disabled={filteredLogs.length === 0 || loading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50"
              title="Download as CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={clearLogs}
              disabled={loading || clearing}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
              title="Clear all logs"
            >
              {clearing ? 'Clearing…' : 'Clear Logs'}
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No activity logs yet</p>
            <p className="text-muted-foreground text-sm mt-2">Activities will appear here as they happen</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-card-foreground">Timestamp</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-card-foreground">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-card-foreground">Action</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-card-foreground">Entity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-card-foreground">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log) => {
                  const actionConfig = actionColors[log.action];
                  const isDetailsShown = showDetails[log.id];

                  return (
                    <tr key={log.id} className="hover:bg-muted transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {getTimestampString(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-card-foreground">
                        <div>{log.userName}</div>
                        <div className="text-xs text-muted-foreground capitalize">{log.userRole}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${actionConfig?.bg} ${actionConfig?.text}`}>
                          {actionConfig?.label || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div>{log.entityName || '—'}</div>
                        <div className="text-xs text-muted-foreground capitalize">{log.entityType}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => toggleDetails(log.id)}
                          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          {isDetailsShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {isDetailsShown ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Details Rows */}
            {filteredLogs.map((log) => (
              showDetails[log.id] && (
                <div key={`details-${log.id}`} className="border-t bg-muted p-6">
                  <div className="max-w-4xl">
                    <h4 className="font-semibold text-card-foreground mb-3">Details</h4>
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Changes Made:</h5>
                        <div className="bg-card rounded border p-3 text-sm">
                          <pre className="overflow-x-auto text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {log.changes && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Before & After:</h5>
                        <div className="grid grid-cols-2 gap-4">
                          {log.changes.before && (
                            <div className="bg-red-50 rounded border border-red-200 p-3">
                              <div className="text-xs font-semibold text-red-700 mb-2">BEFORE</div>
                              <pre className="overflow-x-auto text-xs">
                                {JSON.stringify(log.changes.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.changes.after && (
                            <div className="bg-green-50 rounded border border-green-200 p-3">
                              <div className="text-xs font-semibold text-green-700 mb-2">AFTER</div>
                              <pre className="overflow-x-auto text-xs">
                                {JSON.stringify(log.changes.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Bottom stats removed as per request */}
    </div>
  );
}
