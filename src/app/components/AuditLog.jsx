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
  const [showDetails, setShowDetails] = useState({});
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    searchTerm: '',
  });

  // Mock loading logs - replace with actual Firebase call later
  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // TODO: Call auditService.getLogs()
      console.log('[AuditLog] Loading logs from Firebase');
      // For now, just set empty
      setLogs([]);
    } catch (error) {
      console.error('[AuditLog] Error loading logs:', error);
    } finally {
      setLoading(false);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Audit Log</h2>
        <p className="text-gray-600">Track all actions performed in the system</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {Object.entries(actionColors).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder="User, entity, customer..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No activity logs yet</p>
            <p className="text-gray-400 text-sm mt-2">Activities will appear here as they happen</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log) => {
                  const actionConfig = actionColors[log.action];
                  const isDetailsShown = showDetails[log.id];

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getTimestampString(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <div>{log.userName}</div>
                        <div className="text-xs text-gray-500 capitalize">{log.userRole}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${actionConfig?.bg} ${actionConfig?.text}`}>
                          {actionConfig?.label || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{log.entityName || '—'}</div>
                        <div className="text-xs text-gray-500 capitalize">{log.entityType}</div>
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
                <div key={`details-${log.id}`} className="border-t bg-blue-50 p-6">
                  <div className="max-w-4xl">
                    <h4 className="font-semibold text-gray-900 mb-3">Details</h4>
                    
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Changes Made:</h5>
                        <div className="bg-white rounded border border-blue-200 p-3 text-sm">
                          <pre className="overflow-x-auto text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {log.changes && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Before & After:</h5>
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

      {/* Stats */}
      {filteredLogs.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Total Activities</p>
            <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Unique Users</p>
            <p className="text-2xl font-bold text-gray-900">{new Set(filteredLogs.map(l => l.userId)).size}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Medicines Sold</p>
            <p className="text-2xl font-bold text-gray-900">{filteredLogs.filter(l => l.action === 'MEDICINE_SOLD').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Changes Made</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredLogs.filter(l => ['MEDICINE_ADD', 'MEDICINE_EDIT', 'MEDICINE_DELETE'].includes(l.action)).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
