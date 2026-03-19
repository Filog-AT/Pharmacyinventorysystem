/**
 * Backend logic for Receipts component.
 * Contains formatting, calculations, and document generation logic.
 */
import * as salesBackend from './salesBackend';

export const filterMedicines = (medicines, searchTerm) => {
  return medicines
    .filter(m => (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const da = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const db = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return da - db;
    });
};

export const isBottle = (m) => {
  const form = String(m?.dosageForm || '').toLowerCase().trim();
  const unit = String(m?.unit || '').toLowerCase().trim();
  const bottleForms = new Set(['bottle']);
  const bottleUnits = new Set(['bottle', 'bottles']);
  return bottleForms.has(form) || bottleUnits.has(unit);
};

export const calculateTotals = (cart) => {
  const subtotal = cart.reduce((sum, item) => {
    return sum + ((item.unitPrice || (item.medicine.price || 0)) * item.quantity);
  }, 0);
  const vatRate = 0.12;
  const tax = subtotal * vatRate;
  const grandTotal = subtotal + tax;
  return { subtotal, tax, grandTotal };
};

export const formatMoney = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

export const buildReceiptHtml = (r, formatMoney) => {
  const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp || Date.now());
  const label = `${ts.toLocaleString()}${r.customerName && r.customerName !== 'Walk-in' ? ' - ' + r.customerName : ''}`;
  const itemsRows = (Array.isArray(r.items) ? r.items : [])
    .map(it => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0);
      const total = qty * price;
      return `<tr><td>${it.name}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${formatMoney(price)}</td><td style="text-align:right">${formatMoney(total)}</td></tr>`;
    })
    .join('');
  const subtotal = Number(r.subtotal || 0);
  const tax = Number(r.tax || 0);
  const grand = Number(r.grandTotal || subtotal + tax);
  const received = Number(r.amountReceived || 0);
  const change = Number(r.change || 0);
  const rid = r.id || '';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${rid}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #6b7280; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { text-align: left; background: #f9fafb; }
    .totals { margin-top: 12px; width: 100%; }
    .totals td { padding: 6px; font-size: 14px; }
    .totals .label { color: #374151; }
    .totals .value { text-align: right; font-weight: 600; }
    .footer { margin-top: 16px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="title">Pharmacy Inventory System</div>
  <div class="subtitle">Receipt ${rid ? '#'+rid : ''} • ${label}</div>
  <table>
    <thead>
      <tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>
  <table class="totals">
    <tr><td class="label">Subtotal</td><td class="value">${formatMoney(subtotal)}</td></tr>
    <tr><td class="label">VAT (12%)</td><td class="value">${formatMoney(tax)}</td></tr>
    <tr><td class="label">Total</td><td class="value" style="font-size: 16px; color: #3b82f6;">${formatMoney(grand)}</td></tr>
    ${received > 0 ? `
    <tr><td class="label">Cash Received</td><td class="value">${formatMoney(received)}</td></tr>
    <tr><td class="label">Change</td><td class="value">${formatMoney(change)}</td></tr>
    ` : ''}
  </table>
  <div class="footer">Cashier: ${r.userName || 'Unknown'} • Customer: ${r.customerName || 'Walk-in'}</div>
</body>
</html>`;
};

export const generateReceiptsCSV = (receipts) => {
  const headers = [
    'receipt_id',
    'timestamp',
    'customer_name',
    'user_name',
    'user_id',
    'item_medicine_id',
    'item_name',
    'item_quantity',
    'item_price',
    'item_total',
    'subtotal',
    'grand_total'
  ];
  const lines = [headers.join(',')];
  receipts.forEach((r) => {
    const ts = r?.timestamp && typeof r.timestamp.toDate === 'function'
      ? r.timestamp.toDate()
      : new Date(r.timestamp);
    const base = {
      id: r.id || '',
      tsISO: ts.toISOString(),
      customer: r.customerName || 'Walk-in',
      userName: r.userName || 'Unknown',
      userId: r.userId || '',
      subtotal: Number(r.subtotal || 0),
      grand: Number(r.grandTotal || Number(r.subtotal || 0)),
    };
    const items = Array.isArray(r.items) ? r.items : [];
    if (items.length === 0) {
      lines.push([
        base.id,
        base.tsISO,
        base.customer,
        base.userName,
        base.userId,
        '',
        '',
        '',
        '',
        '',
        base.subtotal,
        base.grand
      ].join(','));
    } else {
      items.forEach((it) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.price || 0);
        const total = qty * price;
        lines.push([
          base.id,
          base.tsISO,
          base.customer,
          base.userName,
          base.userId,
          it.medicineId || '',
          (it.name || '').replace(/[,\\n]/g, ' '),
          qty,
          price,
          total,
          base.subtotal,
          base.grand
        ].join(','));
      });
    }
  });
  return lines.join('\n');
};
