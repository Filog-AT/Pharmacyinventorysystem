import { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, Download, Eye, EyeOff, User, ChevronDown, ChevronUp, ShoppingBag, Box, Settings, LogIn, LogOut, FileText, Trash2, Search } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { receiptService } from '@/services/receiptService';
import * as auditBackend from '@/backend/auditBackend';

const actionColors = {
  MEDICINE_ADD: { bg: 'bg-green-100', text: 'text-green-700', label: 'Medicine Added', icon: Box },
  MEDICINE_EDIT: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medicine Edited', icon: Box },
  MEDICINE_DELETE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Medicine Deleted', icon: Box },
  USER_ADD: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'User Added', icon: User },
  USER_EDIT: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'User Edited', icon: User },
  USER_DELETE: { bg: 'bg-red-100', text: 'text-red-700', label: 'User Deleted', icon: User },
  ADD_BATCH: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Batch Added', icon: Box },
  UPDATE_PRICE: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Price Updated', icon: Settings },
  DELETE_BATCH: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Batch Removed', icon: Box },
  LOGIN: { bg: 'bg-green-100', text: 'text-green-700', label: 'Login', icon: LogIn },
  LOGOUT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Logout', icon: LogOut },
  SALE_COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Sale Completed', icon: ShoppingBag },
  PHARMACY_EDIT: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Settings Updated', icon: Settings },
};

export function AuditLog({ currentUser, settings }) {
  const [logs, setLogs] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [viewMode, setViewMode] = useState('audit'); // 'audit' or 'receipts'
  const [expandedSessions, setExpandedExpandedSessions] = useState({});
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    searchTerm: '',
  });

  // Group logs into sessions by user and time proximity (or LOGIN/LOGOUT pairs)
  const sessions = useMemo(() => {
    if (!filteredLogs.length) return [];
    
    const sorted = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);
    const result = [];
    let currentSession = null;

    // Very basic session grouping: logs from same user within 4 hours are grouped
    // unless a LOGIN/LOGOUT boundary is found
    sorted.forEach(log => {
      const isLogin = log.action === 'LOGIN';
      const isLogout = log.action === 'LOGOUT';

      if (!currentSession || currentSession.userId !== log.userId || (currentSession.startTime - log.timestamp > 4 * 60 * 60 * 1000) || isLogout) {
        if (currentSession) result.push(currentSession);
        currentSession = {
          id: `session-${log.id}`,
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole,
          startTime: log.timestamp,
          endTime: log.timestamp,
          actions: [log],
          hasSale: log.action === 'SALE_COMPLETED'
        };
      } else {
        currentSession.actions.push(log);
        currentSession.startTime = log.timestamp; // Since we are sorted DESC, startTime is the oldest
        if (log.action === 'SALE_COMPLETED') currentSession.hasSale = true;
      }

      if (isLogin) {
        result.push(currentSession);
        currentSession = null;
      }
    });

    if (currentSession) result.push(currentSession);
    return result;
  }, [filteredLogs]);

  useEffect(() => {
    if (currentUser?.pharmacyId) {
      if (viewMode === 'audit') {
        loadLogs();
      } else {
        loadReceipts();
      }
    }
  }, [currentUser?.pharmacyId, viewMode]);

  useEffect(() => {
    if (viewMode === 'audit') {
      filterLogs();
    } else {
      filterReceipts();
    }
  }, [logs, receipts, filters, viewMode]);

  const loadLogs = async () => {
    if (!currentUser?.pharmacyId) return;
    setLoading(true);
    try {
      const fetched = await auditService.getLogs(currentUser.pharmacyId, 500);
      const normalized = auditBackend.normalizeLogs(fetched);
      setLogs(normalized);
    } catch (error) {
      console.error('[AuditLog] Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReceipts = async () => {
    if (!currentUser?.pharmacyId) return;
    setLoading(true);
    try {
      const fetched = await receiptService.getReceipts(currentUser.pharmacyId, 0); // 0 to get all for filtering
      setReceipts(fetched);
    } catch (error) {
      console.error('[AuditLog] Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!currentUser?.pharmacyId) return;
    if (!confirm('Clear all activity logs? This cannot be undone.')) return;
    setClearing(true);
    try {
      await auditService.clearAllLogs(currentUser.pharmacyId);
      await loadLogs();
    } catch (error) {
      console.error('[AuditLog] Error clearing logs:', error);
    } finally {
      setClearing(false);
    }
  };

  const clearReceiptHistory = async () => {
    if (!currentUser?.pharmacyId) return;
    if (!confirm('Clear all receipt history? This cannot be undone and will delete all sale records.')) return;
    setClearing(true);
    try {
      await receiptService.clearAllReceipts(currentUser.pharmacyId);
      await loadReceipts();
    } catch (error) {
      console.error('[AuditLog] Error clearing receipts:', error);
    } finally {
      setClearing(false);
    }
  };

  const deleteIndividualReceipt = async (id) => {
    if (!currentUser?.pharmacyId || !id) return;
    if (!confirm('Delete this receipt?')) return;
    try {
      await receiptService.deleteReceipt(currentUser.pharmacyId, id);
      await loadReceipts();
    } catch (error) {
      console.error('[AuditLog] Error deleting receipt:', error);
    }
  };

  const filterLogs = () => {
    const filtered = auditBackend.filterLogs(logs, filters);
    setFilteredLogs(filtered);
  };

  const filterReceipts = () => {
    let filtered = [...receipts];
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.customerName || '').toLowerCase().includes(term) ||
        (r.processedByName || '').toLowerCase().includes(term) ||
        (r.id || '').toLowerCase().includes(term)
      );
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
        return d >= start;
      });
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
        return d <= end;
      });
    }

    setFilteredReceipts(filtered);
  };

  const downloadAllReceiptsCSV = () => {
    if (filteredReceipts.length === 0) return;
    
    const headers = ['Receipt ID', 'Date', 'Customer', 'Staff', 'Items', 'Total Amount', 'Amount Received', 'Change'];
    const rows = filteredReceipts.map(r => {
      const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      const itemsStr = r.items?.map(it => `${it.name}(x${it.quantity})`).join('; ');
      return [
        r.id,
        ts.toLocaleString(),
        r.customerName || 'Walk-in',
        r.processedByName || 'System',
        itemsStr,
        r.grandTotal || r.total,
        r.amountReceived || 0,
        r.change || 0
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-receipts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrintReceipt = (r) => {
    if (!r) return;
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
    const label = ts.toLocaleString('en-PH', { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    const items = Array.isArray(r.items) ? r.items : [];
    const grand = r.grandTotal || (r.total || 0) + (r.tax || 0);
    const formatMoneyLocal = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

    const html = `
      <html>
        <head>
          <title>Receipt - ${r.id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              margin: 0 auto; 
              padding: 10mm 5mm; 
              font-size: 11px; 
              color: #000;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { font-size: 16px; margin-bottom: 2px; text-transform: uppercase; }
            .subheader { font-size: 10px; margin-bottom: 10px; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; align-items: flex-start; }
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .items-table td { padding: 4px 0; vertical-align: top; }
            .total-section { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .grand-total { font-size: 14px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { margin-top: 20px; font-size: 9px; }
            .qr-placeholder { margin: 15px 0; font-size: 8px; border: 1px solid #eee; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="center bold header">${settings?.pharmacyName || 'PHARMATRACK'}</div>
          <div class="center subheader">PROFESSIONAL PHARMACY SYSTEM</div>
          <div class="center" style="font-size: 9px; margin-bottom: 15px;">
            ${settings?.address || 'Quality Healthcare & Medicine<br>Manila, Philippines'}<br>
            ${settings?.contact || ''}
          </div>
          
          <div class="divider"></div>
          
          <div class="flex"><span>Date:</span> <span>${label}</span></div>
          <div class="flex"><span>Receipt #:</span> <span class="bold">${r.id?.slice(-12).toUpperCase() || 'N/A'}</span></div>
          <div class="flex"><span>Customer:</span> <span>${r.customerName || 'Walk-in'}</span></div>
          <div class="flex"><span>Cashier:</span> <span>${r.processedByName || 'System'}</span></div>
          
          <div class="divider"></div>
          
          <table class="items-table">
            <thead>
              <tr class="bold">
                <th width="60%">Item Description</th>
                <th width="15%" style="text-align: center;">Qty</th>
                <th width="25%" style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td>
                    ${it.name}<br>
                    <span style="font-size: 9px; color: #444;">@ ${formatMoneyLocal(it.price)}/${it.sellUnit || 'pc'}</span>
                    ${it.extraPieces ? `<br><span style="font-size: 9px; color: #444;">+ ${it.extraPieces} pcs</span>` : ''}
                  </td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${formatMoneyLocal(it.subtotal || (it.price * it.quantity))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatMoneyLocal(r.total || 0)}</span>
            </div>
            <div class="total-row">
              <span>VAT (12%):</span>
              <span>${formatMoneyLocal(r.tax || 0)}</span>
            </div>
            <div class="total-row bold grand-total">
              <span>GRAND TOTAL:</span>
              <span>${formatMoneyLocal(grand)}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="total-row">
            <span>CASH RECEIVED:</span>
            <span>${formatMoneyLocal(r.amountReceived || 0)}</span>
          </div>
          <div class="total-row bold">
            <span>CHANGE:</span>
            <span>${formatMoneyLocal(r.change || 0)}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="center footer">
            <div class="bold">THANK YOU FOR YOUR PURCHASE!</div>
            <div>Please keep this receipt for your records.</div>
            <div style="margin-top: 5px;">This serves as your Official Receipt.</div>
          </div>
          
          <div class="center qr-placeholder">
            [ SYSTEM GENERATED TRANSACTION ]<br>
            ${r.id}
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const downloadIndividualReceiptCSV = (r) => {
    const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
    const headers = ['Item Name', 'Quantity', 'Unit Price', 'Subtotal'];
    const rows = r.items?.map(it => [
      it.name,
      it.quantity,
      it.price,
      it.subtotal
    ]);

    const info = [
      ['Receipt ID', r.id],
      ['Date', ts.toLocaleString()],
      ['Customer', r.customerName || 'Walk-in'],
      ['Processed By', r.processedByName || 'System'],
      [''],
      headers,
      ...rows,
      [''],
      ['Total', r.grandTotal || r.total],
      ['Cash Received', r.amountReceived || 0],
      ['Change', r.change || 0]
    ];

    const csvContent = info.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${r.id}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadActivityLogsCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Details'];
    const rows = filteredLogs.map(log => {
      const ts = getTimestampString(log.timestamp);
      let details = '';
      if (log.action === 'SALE_COMPLETED' && log.details) {
        details = `Total: ${log.details.grandTotal || log.details.total}, Customer: ${log.details.customerName || 'Walk-in'}`;
      } else if (log.changes) {
        const changedFields = Object.keys(log.changes.after || {}).join(', ');
        details = `Changed: ${changedFields}`;
      } else if (log.details) {
        details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
      }

      return [
        ts,
        log.userName,
        log.userRole,
        log.action,
        log.entityName || '—',
        details
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const toggleSession = (sessionId) => {
    setExpandedExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const getTimestampString = (timestamp) => {
    return auditBackend.getTimestampString(timestamp);
  };

  const formatMoney = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
            {viewMode === 'audit' ? 'Activity Logs' : 'Receipt History'}
          </h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">
            {viewMode === 'audit' ? 'System Audit & User Sessions' : 'Manage & Review Sales Records'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border-2 border-gray-100 p-1 rounded-xl shadow-sm flex gap-1">
            <button
              onClick={() => setViewMode('audit')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                viewMode === 'audit' 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Audit
            </button>
            <button
              onClick={() => setViewMode('receipts')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                viewMode === 'receipts' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Receipts
            </button>
          </div>
          <button
            onClick={viewMode === 'audit' ? loadLogs : loadReceipts}
            disabled={loading}
            className="bg-white border-2 border-gray-100 text-gray-600 px-6 py-2 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {viewMode === 'audit' && (
            <button
              onClick={downloadActivityLogsCSV}
              disabled={filteredLogs.length === 0}
              className="bg-blue-50 text-blue-700 border-2 border-blue-100 px-6 py-2 rounded-xl hover:bg-blue-100 transition-all font-bold text-sm shadow-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Logs
            </button>
          )}
          {viewMode === 'receipts' && (
            <>
              <button
                onClick={downloadAllReceiptsCSV}
                disabled={filteredReceipts.length === 0}
                className="bg-emerald-50 text-emerald-700 border-2 border-emerald-100 px-6 py-2 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={clearReceiptHistory}
                disabled={loading || clearing}
                className="bg-red-50 text-red-700 border-2 border-red-100 px-6 py-2 rounded-xl hover:bg-red-100 transition-all font-bold text-sm shadow-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {viewMode === 'audit' ? 'Search User/Customer' : 'Search Staff/Customer/ID'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-50 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 bg-gray-50/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 bg-gray-50/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 bg-gray-50/50 transition-all"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ action: '', userId: '', startDate: '', endDate: '', searchTerm: '' })}
              className="w-full bg-gray-900 text-white px-4 py-3.5 rounded-xl hover:bg-black transition-all font-black text-xs uppercase tracking-widest"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'audit' ? (
        /* Audit Sessions List */
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No activities found</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSession(session.id)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.userRole === 'manager' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-gray-900 uppercase tracking-tight">{session.userName}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${session.userRole === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {session.userRole}
                        </span>
                        <span className="text-gray-300 text-xs">•</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {session.actions.length} ACTIONS
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Session Period</p>
                      <p className="text-xs font-bold text-gray-600">
                        {getTimestampString(session.startTime)}
                      </p>
                    </div>
                    {expandedSessions[session.id] ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {expandedSessions[session.id] && (
                  <div className="border-t-2 border-gray-50 bg-gray-50/30 p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {session.actions.map((log, idx) => {
                        const config = actionColors[log.action];
                        const Icon = config?.icon || Box;
                        
                        return (
                          <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config?.bg || 'bg-gray-100'} ${config?.text || 'text-gray-600'}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                    {config?.label || log.action.replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {getTimestampString(log.timestamp)}
                                  </p>
                                </div>
                              </div>
                              {log.entityName && (
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity</p>
                                  <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">{log.entityName}</p>
                                </div>
                              )}
                            </div>

                            {/* Action Specific Content */}
                          {log.action === 'ADD_BATCH' && log.details && (
                            <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">New Inventory Added</p>
                                  <p className="text-sm font-black text-emerald-700">+{log.details.addedQuantity} Units</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Batch Number</p>
                                  <p className="text-xs font-bold text-gray-700">#{log.details.batchNumber || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {log.action === 'PHARMACY_EDIT' && log.details && (
                            <div className="bg-purple-50/50 rounded-xl border border-purple-100 p-4 space-y-3">
                              <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Settings Changes</p>
                              <div className="grid grid-cols-1 gap-2">
                                {Object.entries(log.details.changes || {}).map(([key, value]) => (
                                  <div key={key} className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-gray-400 uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="text-purple-700">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {log.action === 'UPDATE_PRICE' && log.details && (
                            <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Price Adjustment</p>
                                  <p className="text-xs font-bold text-gray-700">Changed from <span className="line-through text-gray-400">{formatMoney(log.details.oldPrice)}</span> to <span className="text-amber-700 font-black">{formatMoney(log.details.newPrice)}</span></p>
                                </div>
                              </div>
                            </div>
                          )}

                          {log.action === 'DELETE_BATCH' && log.details && (
                            <div className="bg-orange-50/50 rounded-xl border border-orange-100 p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Batch Removal Detail</p>
                                  <p className="text-xs font-bold text-gray-900">Batch #: {log.details.batchNumber || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Status at Removal</p>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${log.details.isExpired ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {log.details.reason || 'Manual'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-orange-100">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Quantity Removed:</span>
                                <span className="text-sm font-black text-gray-900">{log.details.quantity} units/pcs</span>
                              </div>
                            </div>
                          )}

                          {log.action === 'SALE_COMPLETED' && log.details && (
                              <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 space-y-4">
                                <div className="flex justify-between items-end border-b border-emerald-100 pb-3">
                                  <div>
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Customer Name</p>
                                    <p className="text-sm font-black text-gray-900">{log.details.customerName || 'Walk-in'}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Total Sale</p>
                                    <p className="text-lg font-black text-emerald-700">{formatMoney(log.details.grandTotal || log.details.total)}</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Items Sold</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {log.details.items?.map((it, i) => (
                                      <div key={i} className="bg-white px-3 py-2 rounded-lg border border-emerald-50 flex justify-between items-center shadow-sm">
                                        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[140px] uppercase">{it.name}</span>
                                        <span className="text-[11px] font-black text-emerald-600">x{it.quantity} {it.unit}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex justify-between pt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                  <span>Paid: {formatMoney(log.details.amountReceived || 0)}</span>
                                  <span>Change: {formatMoney(log.details.change || 0)}</span>
                                </div>
                              </div>
                            )}

                            {log.changes && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {log.changes.before && (
                                  <div className="p-3 bg-red-50/30 rounded-lg border border-red-100">
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Before Change</p>
                                    <pre className="text-[10px] text-red-700 font-mono whitespace-pre-wrap leading-tight">
                                      {Object.entries(log.changes.before).map(([k, v]) => `${k}: ${v}`).join('\n')}
                                    </pre>
                                  </div>
                                )}
                                {log.changes.after && (
                                  <div className="p-3 bg-green-50/30 rounded-lg border border-green-100">
                                    <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">After Change</p>
                                    <pre className="text-[10px] text-green-700 font-mono whitespace-pre-wrap leading-tight">
                                      {Object.entries(log.changes.after).map(([k, v]) => `${k}: ${v}`).join('\n')}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Enhanced Receipts View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReceipts.length === 0 ? (
            <div className="col-span-full p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No receipts found</p>
            </div>
          ) : (
            filteredReceipts.map((r) => {
              const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
              const label = ts.toLocaleString();
              const items = Array.isArray(r.items) ? r.items : [];
              const grand = r.grandTotal || (r.total || 0) + (r.tax || 0);
              
              return (
                <div key={r.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="p-5 border-b-2 border-gray-50 bg-gray-50/30 flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Receipt ID</p>
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{r.id?.slice(-12)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                      <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest">Paid</span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                        <p className="text-sm font-black text-gray-900">{r.customerName || 'Walk-in'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Seller</p>
                        <p className="text-sm font-bold text-gray-700">{r.processedByName || 'System'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items Detail</p>
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                        {items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-bold text-gray-600">
                            <span className="truncate pr-2 uppercase">{it.name}</span>
                            <div className="flex gap-4">
                              <span>x{it.quantity}</span>
                              <span className="text-gray-900 min-w-[70px] text-right">{formatMoney(it.subtotal || (it.price * it.quantity))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-gray-100 pt-4">
                      <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span>Grand Total</span>
                        <span className="text-blue-600 text-base font-black">{formatMoney(grand)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Cash Received</span>
                        <span>{formatMoney(r.amountReceived || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        <span>Change Returned</span>
                        <span>{formatMoney(r.change || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50/50 border-t-2 border-gray-50 flex gap-3">
                    <button
                      onClick={() => handlePrintReceipt(r)}
                      className="flex-1 bg-white border-2 border-gray-100 text-blue-600 py-2.5 rounded-xl hover:bg-blue-50 hover:border-blue-100 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Print
                    </button>
                    <button
                      onClick={() => downloadIndividualReceiptCSV(r)}
                      className="flex-1 bg-white border-2 border-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      onClick={() => deleteIndividualReceipt(r.id)}
                      className="w-12 h-10 bg-white border-2 border-red-50 text-red-400 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
