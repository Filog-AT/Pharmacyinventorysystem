import { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, Download, Eye, EyeOff, User, ChevronDown, ChevronUp, ShoppingBag, Box, Settings, LogIn, LogOut, FileText, Trash2, Search, Archive, RotateCcw, X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { auditService } from '@/services/auditService';
import { receiptService } from '@/services/receiptService';
import * as auditBackend from '@/backend/auditBackend';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';

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

export function AuditLog({ currentUser, settings, medicines = [], onArchiveBatch, onRestoreArchivedBatch, onArchiveMedicine, onRestoreMedicine }) {
  const [logs, setLogs] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [archivedReceipts, setArchivedReceipts] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [viewMode, setViewMode] = useState('audit'); // 'audit' | 'receipts' | 'archive'
  const [archiveFilter, setArchiveFilter] = useState('current');  // 'current' | 'archived'
  const [archiveSearch, setArchiveSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null); // receipt detail view modal
  const [archivePeriodMonths, setArchivePeriodMonths] = useState(6);
  const [autoArchiving, setAutoArchiving] = useState(false);
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(false);
  const [expandedSessions, setExpandedExpandedSessions] = useState({});
  const [receiptPage, setReceiptPage] = useState(1);
  const receiptsPerPage = 6;
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
      } else if (viewMode === 'receipts') {
        loadReceipts();
      } else if (viewMode === 'archive') {
        loadReceipts();        // current receipts for the Current tab
        loadArchivedReceipts(); // archived receipts for the Archived tab
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

  useEffect(() => {
    setReceiptPage(1);
  }, [viewMode, filters.searchTerm, filters.startDate, filters.endDate]);

  // Re-run archive whenever the period changes while the toggle is enabled
  useEffect(() => {
    if (autoArchiveEnabled && !autoArchiving) {
      runAutoArchive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivePeriodMonths]);

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

  const loadArchivedReceipts = async () => {
    if (!currentUser?.pharmacyId) return;
    setLoading(true);
    try {
      const fetched = await receiptService.getArchivedReceipts(currentUser.pharmacyId);
      setArchivedReceipts(fetched);
    } catch (error) {
      console.error('[AuditLog] Error loading archived receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Move receipts older than N months from 'receipts' to 'receiptArchive'
  const runAutoArchive = async () => {
    if (!currentUser?.pharmacyId) return;
    setAutoArchiving(true);
    try {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - archivePeriodMonths);
      const all = await receiptService.getReceipts(currentUser.pharmacyId, 0);
      const toArchive = all.filter(r => {
        const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
        return ts < cutoff;
      });
      let count = 0;
      for (const r of toArchive) {
        try {
          await receiptService.archiveReceipt(currentUser.pharmacyId, r);
          count++;
        } catch (err) {
          console.error('[AuditLog] Failed to archive receipt', r.id, err);
        }
      }
      if (count > 0) {
        await loadReceipts();
        await loadArchivedReceipts();
        toast.success(`${count} receipt${count !== 1 ? 's' : ''} archived successfully`);
      } else {
        toast.success('No receipts to archive — all are within the retention period');
      }
    } catch (err) {
      console.error('[AuditLog] Auto-archive error:', err);
      toast.error('Auto-archive failed');
    } finally {
      setAutoArchiving(false);
    }
  };

  const clearLogs = async () => {
    if (!currentUser?.pharmacyId) return;
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
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
    if (!window.confirm('Clear all receipt history? This cannot be undone and will delete all sale records.')) return;
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
    if (!window.confirm('Delete this receipt?')) return;
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
    setReceiptPage(1);
  };

  const downloadAllReceiptsCSV = () => {
    if (filteredReceipts.length === 0) return;
    
    const headers = ['Invoice #', 'Date', 'Customer', 'Staff', 'Items', 'Total Amount', 'Amount Received', 'Change'];
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
          <div class="flex"><span>Invoice #:</span> <span class="bold">${r.invoiceNumber || ('INV-' + (r.id?.slice(-8).toUpperCase() || 'N/A'))}</span></div>
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
            <div>Please keep this invoice for your records.</div>
            <div style="margin-top: 5px;">This serves as your Customer Invoice.</div>
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
      ['Invoice #', r.invoiceNumber || r.id],
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
    a.download = `invoice-${r.invoiceNumber || r.id}.csv`;
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

  const printReceiptFromArchive = (r) => {
    if (!r) return;
    const ts = r?.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp || r.archivedAt || Date.now());
    const label = ts.toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const items = Array.isArray(r.items) ? r.items : [];
    const grand = r.grandTotal || (r.total || 0) + (r.tax || 0);
    const fm = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
    const html = `<html><head><title>Receipt</title><style>
      body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:8mm 4mm;font-size:11px;line-height:1.4}
      .c{text-align:center}.b{font-weight:bold}.div{border-bottom:1px dashed #000;margin:6px 0}
      .row{display:flex;justify-content:space-between;margin:2px 0}
    </style></head><body>
      <div class="c b" style="font-size:15px">${settings?.pharmacyName || 'PHARMATRACK'}</div>
      <div class="c" style="font-size:9px;margin-bottom:10px">${settings?.address || ''}</div>
      <div class="div"></div>
      <div class="row"><span>Date:</span><span>${label}</span></div>
      <div class="row"><span>Invoice #:</span><span class="b">${r.invoiceNumber || ('INV-' + (r.id || '').slice(-8).toUpperCase())}</span></div>
      <div class="row"><span>Customer:</span><span>${r.customerName || 'Walk-in'}</span></div>
      <div class="row"><span>Cashier:</span><span>${r.processedByName || 'System'}</span></div>
      <div class="div"></div>
      ${items.map(it => `<div class="row"><span>${it.name} x${it.quantity}</span><span>${fm(it.subtotal || it.price * it.quantity)}</span></div>`).join('')}
      <div class="div"></div>
      <div class="row"><span>Subtotal:</span><span>${fm(r.total || 0)}</span></div>
      <div class="row"><span>VAT (12%):</span><span>${fm(r.tax || 0)}</span></div>
      <div class="row b"><span>GRAND TOTAL:</span><span>${fm(grand)}</span></div>
      <div class="div"></div>
      <div class="row"><span>Cash Received:</span><span>${fm(r.amountReceived || 0)}</span></div>
      <div class="row b"><span>Change:</span><span>${fm(r.change || 0)}</span></div>
      <div class="div"></div>
      <div class="c" style="margin-top:12px;font-size:9px">THANK YOU FOR YOUR PURCHASE!</div>
    </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe); }, 400);
  };

  // current receipts = those still in the main collection (shown in 'receipts' tab)
  // archiveRows = older receipts already moved to receiptArchive
  const archiveRows = useMemo(() => {
    return (archivedReceipts || []).filter((receipt) => {
      const q = archiveSearch.toLowerCase();
      if (!q) return true;
      const haystack = `${receipt?.id || ''} ${receipt?.customerName || ''} ${receipt?.processedByName || ''} ${(receipt?.items || []).map(item => item?.name || '').join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [archivedReceipts, archiveSearch]);

  // "current" receipts filtered by search (for the Current tab inside archive view)
  const currentReceiptsRows = useMemo(() => {
    return (receipts || []).filter((receipt) => {
      const q = archiveSearch.toLowerCase();
      if (!q) return true;
      const haystack = `${receipt?.id || ''} ${receipt?.customerName || ''} ${receipt?.processedByName || ''} ${(receipt?.items || []).map(item => item?.name || '').join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [receipts, archiveSearch]);

  const totalReceiptPages = Math.max(1, Math.ceil(filteredReceipts.length / receiptsPerPage));
  const paginatedReceipts = useMemo(() => {
    const startIndex = (receiptPage - 1) * receiptsPerPage;
    return filteredReceipts.slice(startIndex, startIndex + receiptsPerPage);
  }, [filteredReceipts, receiptPage, receiptsPerPage]);

  const receiptPageNumbers = useMemo(() => {
    if (totalReceiptPages <= 5) {
      return Array.from({ length: totalReceiptPages }, (_, index) => index + 1);
    }

    const pages = [];
    if (receiptPage > 3) pages.push(1, 'ellipsis-start');

    const start = Math.max(2, receiptPage - 1);
    const end = Math.min(totalReceiptPages - 1, receiptPage + 1);
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (receiptPage < totalReceiptPages - 2) pages.push('ellipsis-end');
    pages.push(totalReceiptPages);
    return pages;
  }, [receiptPage, totalReceiptPages]);

  return (
    <div className="max-w-6xl mx-auto">
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Archived Batch Details</h3>
                <p className="text-sm text-gray-500">{selectedBatch.medicine?.name || 'Medicine'} • {selectedBatch.batch?.batchNumber || 'N/A'}</p>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                <div><p className="text-gray-400 text-xs uppercase">Batch Number</p><p className="font-semibold">{selectedBatch.batch?.batchNumber || 'N/A'}</p></div>
                <div><p className="text-gray-400 text-xs uppercase">Expiry</p><p className="font-semibold">{selectedBatch.batch?.expiryDate || 'N/A'}</p></div>
                <div><p className="text-gray-400 text-xs uppercase">Quantity</p><p className="font-semibold">{selectedBatch.batch?.quantity || 0}</p></div>
                <div><p className="text-gray-400 text-xs uppercase">Reason</p><p className="font-semibold">{selectedBatch.batch?.archiveReason || 'Manual'}</p></div>
                <div><p className="text-gray-400 text-xs uppercase">Supplier</p><p className="font-semibold">{selectedBatch.batch?.supplier || 'N/A'}</p></div>
                <div><p className="text-gray-400 text-xs uppercase">Archived On</p><p className="font-semibold">{selectedBatch.batch?.archivedAt ? new Date(selectedBatch.batch.archivedAt).toLocaleString() : 'N/A'}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
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
            <button
              onClick={() => setViewMode('archive')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                viewMode === 'archive' 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Archive
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

      {viewMode === 'archive' ? (
        <div className="space-y-6">
          {/* Auto-archive controls */}
          <div className="bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-600" />
                  Auto-Archive
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, receipts older than the retention period are automatically moved to the archive.
                </p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Retention period selector — always visible so the user can configure before enabling */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-semibold text-amber-800 whitespace-nowrap">Archive after</span>
                  <select
                    value={archivePeriodMonths}
                    onChange={(e) => setArchivePeriodMonths(Number(e.target.value))}
                    className="text-sm font-bold text-amber-900 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 6, 12].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'month' : 'months'}</option>
                    ))}
                  </select>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={() => {
                    const next = !autoArchiveEnabled;
                    setAutoArchiveEnabled(next);
                    if (next) {
                      // Run immediately when turned on
                      runAutoArchive();
                    }
                  }}
                  disabled={autoArchiving}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
                    autoArchiveEnabled ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                  title={autoArchiveEnabled ? 'Auto-archive is ON — click to disable' : 'Click to enable auto-archive'}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      autoArchiveEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-bold ${autoArchiveEnabled ? 'text-amber-700' : 'text-gray-400'}`}>
                  {autoArchiving ? 'Archiving…' : autoArchiveEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          {/* Current / Archived sub-tabs */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b bg-gray-50/50 flex-wrap">
              <div className="inline-flex rounded-xl border overflow-hidden shadow-sm">
                <button
                  onClick={() => { setArchiveFilter('current'); setArchiveSearch(''); }}
                  className={`px-5 py-2.5 text-sm font-bold transition-colors ${archiveFilter === 'current' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Current Receipts
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${archiveFilter === 'current' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {receipts.length}
                  </span>
                </button>
                <button
                  onClick={() => { setArchiveFilter('archived'); setArchiveSearch(''); if (!archivedReceipts.length) loadArchivedReceipts(); }}
                  className={`px-5 py-2.5 text-sm font-bold border-l transition-colors ${archiveFilter === 'archived' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Archived Receipts
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${archiveFilter === 'archived' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {archivedReceipts.length}
                  </span>
                </button>
              </div>
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder={archiveFilter === 'current' ? 'Search current receipts…' : 'Search archived receipts…'}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Current Receipts tab */}
            {archiveFilter === 'current' && (
              <div>
                {loading ? (
                  <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
                ) : currentReceiptsRows.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No current receipts found.</p>
                    <p className="text-xs text-gray-400 mt-1">Completed sales appear here. Receipts older than {archivePeriodMonths} month{archivePeriodMonths !== 1 ? 's' : ''} can be archived.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice #.</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Staff</th>
                          <th className="px-4 py-3 text-right">Items</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Payment</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentReceiptsRows.slice(0, 50).map((r) => {
                          const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp || Date.now());
                          const isToday = ts.toDateString() === new Date().toDateString();
                          return (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{r.invoiceNumber || ('INV-' + (r.id || '').slice(-8).toUpperCase())}</td>
                              <td className="px-4 py-3 text-gray-700">
                                <div>{ts.toLocaleDateString()}</div>
                                {isToday && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">Today</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{r.processedByName || 'System'}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{(r.items || []).length}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(r.grandTotal || r.total || 0)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{formatMoney(r.amountReceived || 0)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedReceipt(r)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-xs font-semibold hover:bg-blue-100 transition-colors ml-auto"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Archived Receipts tab */}
            {archiveFilter === 'archived' && (
              <div>
                {loading ? (
                  <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
                ) : archiveRows.length === 0 ? (
                  <div className="p-12 text-center">
                    <Archive className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No archived receipts yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Run auto-archive to move receipts older than {archivePeriodMonths} month{archivePeriodMonths !== 1 ? 's' : ''} here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-amber-50/50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice #.</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Staff</th>
                          <th className="px-4 py-3 text-right">Items</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Payment</th>
                          <th className="px-4 py-3 text-left">Archived On</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {archiveRows.map((r) => {
                          const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp || Date.now());
                          const archivedAt = r.archivedAt || r.deletedAt;
                          return (
                            <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{r.invoiceNumber || ('INV-' + (r.id || '').slice(-8).toUpperCase())}</td>
                              <td className="px-4 py-3 text-gray-700">{ts.toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-gray-600">{r.processedByName || 'System'}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{(r.items || []).length}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(r.grandTotal || r.total || 0)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{formatMoney(r.amountReceived || 0)}</td>
                              <td className="px-4 py-3 text-xs text-amber-700">
                                <span className="bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                                  {archivedAt ? new Date(archivedAt).toLocaleDateString() : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedReceipt(r)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 text-xs font-semibold hover:bg-amber-100 transition-colors ml-auto"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'audit' ? (
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReceipts.length === 0 ? (
              <div className="col-span-full p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No receipts found</p>
              </div>
            ) : (
              paginatedReceipts.map((r) => {
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

          {totalReceiptPages > 1 && (
            <div className="flex justify-center">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-emerald-700">
                    Showing {(receiptPage - 1) * receiptsPerPage + 1}-{Math.min(receiptPage * receiptsPerPage, filteredReceipts.length)} of {filteredReceipts.length} receipts
                  </div>
                  <Pagination>
                    <PaginationContent className="flex-wrap rounded-full border border-emerald-200 bg-white p-1.5 shadow-sm">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={(event) => {
                            event.preventDefault();
                            setReceiptPage((page) => Math.max(1, page - 1));
                          }}
                          className={`rounded-full ${receiptPage === 1 ? 'pointer-events-none opacity-50' : 'hover:bg-emerald-50'}`}
                        />
                      </PaginationItem>
                      {receiptPageNumbers.map((page, index) => (
                        <PaginationItem key={`${page}-${index}`}>
                          {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                            <span className="px-2 text-sm font-semibold text-gray-400">…</span>
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={page === receiptPage}
                              onClick={(event) => {
                                event.preventDefault();
                                setReceiptPage(page);
                              }}
                              className={`min-w-9 rounded-full ${page === receiptPage ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-gray-700 hover:bg-emerald-50'}`}
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={(event) => {
                            event.preventDefault();
                            setReceiptPage((page) => Math.min(totalReceiptPages, page + 1));
                          }}
                          className={`rounded-full ${receiptPage === totalReceiptPages ? 'pointer-events-none opacity-50' : 'hover:bg-emerald-50'}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Detail View Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[80] backdrop-blur-sm"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Invoice #{selectedReceipt.invoiceNumber || ('INV-' + (selectedReceipt.id || '').slice(-8).toUpperCase())}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedReceipt.timestamp?.toDate
                    ? selectedReceipt.timestamp.toDate().toLocaleString('en-PH')
                    : new Date(selectedReceipt.timestamp || Date.now()).toLocaleString('en-PH')}
                  {' · '}
                  {selectedReceipt.processedByName || 'System'}
                  {(selectedReceipt.archivedAt || selectedReceipt.deletedAt) && (
                    <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">Archived</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printReceiptFromArchive(selectedReceipt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-semibold text-gray-800">{selectedReceipt.customerName || 'Walk-in'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashier</p>
                  <p className="font-semibold text-gray-800">{selectedReceipt.processedByName || 'System'}</p>
                </div>
              </div>

              {/* Items table */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Medicine / Brand</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedReceipt.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 font-medium text-gray-900">{it.name}</td>
                          <td className="px-3 py-2.5 text-center text-gray-600">{it.quantity}{it.extraPieces > 0 ? ` +${it.extraPieces}` : ''}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{formatMoney(it.price || 0)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{formatMoney(it.subtotal || (it.price * it.quantity) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(selectedReceipt.total || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (12%)</span>
                  <span>{formatMoney(selectedReceipt.tax || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2 mt-1">
                  <span>Grand Total</span>
                  <span>{formatMoney(selectedReceipt.grandTotal || selectedReceipt.total || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600 border-t pt-2">
                  <span>Cash Received</span>
                  <span className="font-semibold">{formatMoney(selectedReceipt.amountReceived || 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Change</span>
                  <span>{formatMoney(selectedReceipt.change || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
