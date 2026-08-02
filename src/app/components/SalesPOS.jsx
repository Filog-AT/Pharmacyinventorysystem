import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, ShoppingCart, X, AlertCircle, FileText, Trash2, Download } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { medicineService } from '@/services/medicineService';
import { receiptService } from '@/services/receiptService';
import * as salesBackend from '@/backend/salesBackend';

export function SalesPOS({ medicines, currentUser, settings }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('input'); // 'input' | 'processing' | 'success'
  const [lastCompletedSale, setLastCompletedSale] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [receipts, setReceipts] = useState([]);

  const loadReceipts = async () => {
    if (!currentUser?.pharmacyId) return;
    try {
      const data = await receiptService.getReceipts(currentUser.pharmacyId, 50);
      setReceipts(data || []);
    } catch (e) {
      console.warn('[SalesPOS] Failed to load receipts:', e);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [currentUser?.pharmacyId]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const search = searchTerm.toLowerCase();
      const name = (m.name || '').toLowerCase();
      const brand = (m.brandName || '').toLowerCase();
      return name.includes(search) || brand.includes(search);
    }).sort((a, b) => {
      const da = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const db = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return da - db;
    });
  }, [medicines, searchTerm]);

  const isBottle = (m) => {
    const form = String(m?.dosageForm || '').toLowerCase().trim();
    const unit = String(m?.unit || '').toLowerCase().trim();
    const bottleForms = new Set(['bottle']);
    const bottleUnits = new Set(['bottle', 'bottles']);
    return bottleForms.has(form) || bottleUnits.has(unit);
  };

  const getUnitMultiplier = (m, unit) => {
    return salesBackend.getUnitMultiplier(m, unit);
  };

  const getTabletCount = (m) => {
    return salesBackend.getTabletCount(m);
  };

  const getBoxTabletCount = (m) => {
    return salesBackend.getBoxTabletCount(m);
  };

  const getMaxSaleQuantity = (m, unit) => {
    return salesBackend.getMaxSaleQuantity(m, unit);
  };

  const addToCart = (medicine) => {
    // Get the latest data from the medicines prop to ensure multipliers are correct
    const latestMedicine = medicines.find(m => m.id === medicine.id) || medicine;
    const defaultUnit = 'piece';
    const multiplier = getUnitMultiplier(latestMedicine, defaultUnit);
    const unitPrice = Number(((Number(latestMedicine.price || 0)) * multiplier).toFixed(2));
    const existing = cart.find(item => item.medicine.id === latestMedicine.id && item.sellUnit === defaultUnit);
    if (existing) {
      const maxQ = getMaxSaleQuantity(latestMedicine, defaultUnit);
      if ((existing.quantity + (existing.extraPieces || 0)) >= maxQ) {
        alert('Cannot add more than available stock');
        return;
      }
      setCart(cart.map(item =>
        item.medicine.id === latestMedicine.id && item.sellUnit === defaultUnit
          ? { ...item, quantity: item.quantity + 1, unitPrice }
          : item
      ));
    } else {
      const maxQ = getMaxSaleQuantity(latestMedicine, defaultUnit);
      if (maxQ <= 0) {
        alert('Out of stock');
        return;
      }
      setCart([...cart, { medicine: latestMedicine, quantity: 1, extraPieces: 0, sellUnit: defaultUnit, unitPrice }]);
    }
  };

  const setQuantity = (medicineId, unit, val) => {
    // If empty string, set it as empty string so user can type freely
    if (val === '') {
      setCart(cart.map(item => {
        if (item.medicine.id === medicineId && item.sellUnit === unit) {
          return { ...item, quantity: '' };
        }
        return item;
      }));
      return;
    }

    const num = parseInt(val);
    if (isNaN(num)) return;

    setCart(cart.map(item => {
      if (item.medicine.id === medicineId && item.sellUnit === unit) {
        const multiplier = getUnitMultiplier(item.medicine, unit);
        const totalStockInPcs = getMaxSaleQuantity(item.medicine, 'piece');
        const extraPcs = Number(item.extraPieces || 0);
        const availableForUnits = Math.floor((totalStockInPcs - extraPcs) / multiplier);
        
        const validatedQty = Math.max(0, Math.min(num, availableForUnits));
        return { ...item, quantity: validatedQty };
      }
      return item;
    }));
  };

  const handleQuantityBlur = (medicineId, unit) => {
    setCart(cart.map(item => {
      if (item.medicine.id === medicineId && item.sellUnit === unit) {
        if (item.quantity === '' || item.quantity === 0) {
          // If empty or 0, check if we have extra pieces
          if (Number(item.extraPieces || 0) === 0) {
            // Both empty, default back to 1 if it was just added, or remove if user wants
            // User requested "it should go to 1"
            return { ...item, quantity: 1 };
          }
          return { ...item, quantity: 0 };
        }
      }
      return item;
    }));
  };

  const setExtraPieces = (medicineId, unit, val) => {
    if (val === '') {
      setCart(cart.map(item => {
        if (item.medicine.id === medicineId && item.sellUnit === unit) {
          return { ...item, extraPieces: '' };
        }
        return item;
      }));
      return;
    }

    const num = parseInt(val);
    if (isNaN(num)) return;

    setCart(cart.map(item => {
      if (item.medicine.id === medicineId && item.sellUnit === unit) {
        const multiplier = getUnitMultiplier(item.medicine, unit);
        const totalStockInPcs = getMaxSaleQuantity(item.medicine, 'piece');
        const consumedByUnits = (Number(item.quantity || 0)) * multiplier;
        const availableForExtra = totalStockInPcs - consumedByUnits;
        
        const validatedExtra = Math.max(0, Math.min(num, availableForExtra));
        return { ...item, extraPieces: validatedExtra };
      }
      return item;
    }));
  };

  const handleExtraBlur = (medicineId, unit) => {
    setCart(cart.map(item => {
      if (item.medicine.id === medicineId && item.sellUnit === unit) {
        if (item.extraPieces === '') {
          return { ...item, extraPieces: 0 };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (medicineId, unit) => {
    setCart(cart.filter(item => !(item.medicine.id === medicineId && item.sellUnit === unit)));
  };

  const total = useMemo(() => {
    const sum = cart.reduce((acc, item) => {
      const mainTotal = Number(item.unitPrice || 0) * item.quantity;
      const extraTotal = (Number(item.medicine.price || 0)) * (item.extraPieces || 0);
      return acc + mainTotal + extraTotal;
    }, 0);
    return Number(sum.toFixed(2));
  }, [cart]);

  const tax = useMemo(() => {
    return Number((total * 0.12).toFixed(2));
  }, [total]);

  const subtotal = useMemo(() => {
    return Number((total - tax).toFixed(2));
  }, [total, tax]);

  const grandTotal = useMemo(() => {
    return Number((subtotal + tax).toFixed(2));
  }, [subtotal, tax]);

  const change = useMemo(() => {
    const val = (Number(amountReceived) || 0) - grandTotal;
    return val > 0 ? Number(val.toFixed(2)) : 0;
  }, [amountReceived, grandTotal]);

  const hasPrescriptionMed = useMemo(() => {
    return cart.some(item => {
      const tag = String(item.medicine.tag || '').toLowerCase();
      return tag.includes('prescription') && !tag.includes('non');
    });
  }, [cart]);

  const handleCheckout = async (shouldPrint = false) => {
    if (cart.length === 0) return;
    if ((Number(amountReceived) || 0) < grandTotal) {
      alert('Insufficient amount received');
      return;
    }
    
    setCheckoutStep('processing');
    try {
      // Process stock reduction using FEFO
      const saleItems = cart.map(item => ({
        medicineId: item.medicine.id,
        categoryId: item.medicine.categoryId,
        quantity: (item.quantity * getUnitMultiplier(item.medicine, item.sellUnit)) + (item.extraPieces || 0)
      }));

      await medicineService.processSale(currentUser.pharmacyId, saleItems);

      // Create a receipt
      const receiptData = {
        items: cart.map(item => {
          const multiplier = getUnitMultiplier(item.medicine, item.sellUnit);
          const totalUnitsInPcs = (item.quantity * multiplier) + (item.extraPieces || 0);
          const basePrice = Number(item.medicine.price || 0);
          const itemSubtotal = (Number(item.unitPrice || 0) * item.quantity) + (basePrice * (item.extraPieces || 0));
          
          return {
            medicineId: item.medicine.id,
            categoryId: item.medicine.categoryId,
            name: item.medicine.name,
            quantity: item.quantity,
            extraPieces: item.extraPieces || 0,
            sellUnit: item.sellUnit,
            price: Number(item.unitPrice || item.medicine.price || 0),
            subtotal: Number(itemSubtotal.toFixed(2)),
            unitSold: item.sellUnit,
            totalQuantityPcs: totalUnitsInPcs
          };
        }),
        total: Number(total),
        tax: Number(tax),
        grandTotal: Number(grandTotal),
        amountReceived: Number(amountReceived),
        change: Number(change),
        customerName: customerName || 'Walk-in',
        timestamp: new Date(),
        pharmacyId: currentUser.pharmacyId,
        processedBy: currentUser.uid,
        processedByName: currentUser.name || currentUser.username || 'System'
      };

      const receiptId = await receiptService.addReceipt(currentUser.pharmacyId, receiptData);
      const finalReceipt = { ...receiptData, id: receiptId };

      // Log sale completion to audit trail
      await auditService.logAction(currentUser.pharmacyId, {
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.name || currentUser?.username || 'Unknown User',
        userRole: currentUser?.role || 'unknown',
        action: 'SALE_COMPLETED',
        entityType: 'sale',
        entityId: 'POS-' + Date.now(),
        entityName: 'POS Sale',
        details: {
          itemsCount: cart.length,
          total: grandTotal,
          amountReceived: Number(amountReceived),
          change: change,
          customerName: customerName || 'Walk-in',
          items: cart.map(it => ({
            name: it.medicine?.name || 'Unknown Item',
            quantity: it.quantity,
            extraPieces: it.extraPieces || 0,
            unit: it.sellUnit || 'pc',
            price: Number(it.unitPrice || it.medicine?.price || 0)
          }))
        },
      });

      if (shouldPrint) {
        handlePrintReceipt(finalReceipt);
      }
      
      setLastCompletedSale(finalReceipt);
      setCheckoutStep('success');
      
      // Reload receipts history
      loadReceipts();
      
      // Notify components to refresh data (like Dashboard and Inventory)
      window.dispatchEvent(new CustomEvent('refresh-receipts'));
      window.dispatchEvent(new CustomEvent('refresh-medicines'));
      
      setCart([]);
      setCustomerName('');
    } catch (error) {
      console.error('[SalesPOS] Checkout error:', error);
      alert(`Error processing sale: ${error.message}`);
      setCheckoutStep('input');
    }
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
    const formatMoney = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

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
          <div class="center subheader">CUSTOMER INVOICE</div>
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
                    <span style="font-size: 9px; color: #444;">@ ${formatMoney(it.price)}/${it.sellUnit || 'pc'}</span>
                    ${it.extraPieces ? `<br><span style="font-size: 9px; color: #444;">+ ${it.extraPieces} pcs</span>` : ''}
                  </td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${formatMoney(it.subtotal || (it.price * it.quantity))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatMoney(r.total || 0)}</span>
            </div>
            <div class="total-row">
              <span>VAT (12%):</span>
              <span>${formatMoney(r.tax || 0)}</span>
            </div>
            <div class="total-row bold grand-total">
              <span>GRAND TOTAL:</span>
              <span>${formatMoney(grand)}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="total-row">
            <span>CASH RECEIVED:</span>
            <span>${formatMoney(r.amountReceived || 0)}</span>
          </div>
          <div class="total-row bold">
            <span>CHANGE:</span>
            <span>${formatMoney(r.change || 0)}</span>
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

  const handleDownloadReceipt = async (r) => {
    if (!r) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const formatMoney = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
      
      let y = 50;
      doc.setFontSize(20);
      doc.text('CUSTOMER INVOICE', 300, y, { align: 'center' });
      
      y += 40;
      doc.setFontSize(10);
      doc.text(`Date: ${ts.toLocaleString()}`, 40, y);
      doc.text(`Receipt ID: ${r.id}`, 40, y + 15);
      doc.text(`Customer: ${r.customerName || 'Walk-in'}`, 40, y + 30);
      
      y += 60;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Item Description', 40, y);
      doc.text('Qty', 350, y, { align: 'right' });
      doc.text('Price', 450, y, { align: 'right' });
      doc.text('Subtotal', 550, y, { align: 'right' });
      
      y += 10;
      doc.line(40, y, 550, y);
      
      doc.setFont('helvetica', 'normal');
      const items = Array.isArray(r.items) ? r.items : [];
      items.forEach(it => {
        y += 20;
        doc.text(it.name, 40, y);
        doc.text(String(it.quantity), 350, y, { align: 'right' });
        doc.text(formatMoney(it.price), 450, y, { align: 'right' });
        doc.text(formatMoney(it.subtotal || (it.price * it.quantity)), 550, y, { align: 'right' });
      });
      
      y += 30;
      doc.line(350, y, 550, y);
      
      y += 20;
      doc.text('Subtotal:', 450, y, { align: 'right' });
      doc.text(formatMoney(r.total || 0), 550, y, { align: 'right' });
      
      y += 15;
      doc.text('VAT (12%):', 450, y, { align: 'right' });
      doc.text(formatMoney(r.tax || 0), 550, y, { align: 'right' });
      
      y += 25;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('GRAND TOTAL:', 450, y, { align: 'right' });
      doc.text(formatMoney(r.grandTotal || (r.total + r.tax)), 550, y, { align: 'right' });
      
      y += 30;
      doc.setFontSize(11);
      doc.text('Payment Details:', 40, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.text(`Cash Received: ${formatMoney(r.amountReceived || 0)}`, 40, y);
      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.text(`Change: ${formatMoney(r.change || 0)}`, 40, y);
      
      y += 50;
      doc.setFontSize(10);
      doc.text('Thank you for your purchase!', 300, y, { align: 'center' });
      doc.text(`Processed by: ${r.processedByName || 'System'}`, 300, y + 15, { align: 'center' });
      
      doc.save(`Receipt_${r.id?.slice(-8)}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Error generating PDF');
    }
  };

  const handleDownloadAllCSV = () => {
    if (receipts.length === 0) return;
    
    const headers = ['Date', 'Receipt ID', 'Customer', 'Items', 'Subtotal', 'VAT', 'Total', 'Payment Method'];
    const rows = receipts.map(r => {
      const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
      const itemsList = Array.isArray(r.items) ? r.items.map(it => `${it.name} (x${it.quantity})`).join('; ') : '';
      return [
        ts.toLocaleString(),
        r.id,
        r.customerName || 'Walk-in',
        `"${itemsList}"`,
        r.total || 0,
        r.tax || 0,
        r.grandTotal || 0,
        r.paymentMethod || 'Cash'
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Receipts_History_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all receipts history? This action cannot be undone.')) return;
    
    try {
      setCheckoutStep('processing'); // Use existing processing state for loading
      for (const r of receipts) {
        await receiptService.deleteReceipt(currentUser.pharmacyId, r.id);
      }
      await loadReceipts();
      alert('History cleared successfully');
    } catch (err) {
      console.error('Error clearing history:', err);
      alert('Failed to clear history');
    } finally {
      setCheckoutStep('input');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales</h1>
        <p className="text-gray-600">Process sales and manage transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="bg-card rounded-lg border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMedicines.map(medicine => {
              const stock = medicine.totalQuantity || 0;
              const isLowStock = stock < 50;
              const isPrescription = String(medicine.tag || '').toLowerCase().includes('prescription') && !String(medicine.tag || '').toLowerCase().includes('non');
              const isNonPrescription = String(medicine.tag || '').toLowerCase().includes('non-prescription');
              const isVitamin = String(medicine.tag || '').toLowerCase().includes('vitamin');
              
              return (
                <button
                  key={medicine.id}
                  onClick={() => addToCart(medicine)}
                  className={`rounded-lg border p-4 hover:shadow-md transition-all text-left relative overflow-hidden group border-transparent ${
                    stock === 0 ? 'bg-gray-100 opacity-60' :
                    isLowStock ? 'bg-red-50 hover:border-red-400 border-red-100' : 'bg-green-50 hover:border-green-400 border-green-100'
                  }`}
                  disabled={stock === 0}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 truncate pr-2">
                      <h3 className={`font-bold text-sm truncate ${
                        stock === 0 ? 'text-gray-500' :
                        isLowStock ? 'text-red-900' : 'text-green-900'
                      }`}>{medicine.brandName || 'Unknown Brand'}</h3>
                      <p className={`text-[10px] truncate ${stock === 0 ? 'text-gray-400' : isLowStock ? 'text-red-700' : 'text-green-700'}`}>
                        {medicine.name || 'Generic Name'}
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight shrink-0 ${
                      isPrescription ? 'bg-red-200 text-red-800' : 
                      isVitamin ? 'bg-blue-200 text-blue-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {medicine.tag || (isPrescription ? 'Prescription' : 'Non-Prescription')}
                    </span>
                  </div>
                  <p className={`text-[10px] mb-2 ${stock === 0 ? 'text-gray-400' : isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                    {medicine.category} • {medicine.strength} - {medicine.dosageForm}
                  </p>
                  <div className="flex justify-between items-center mt-auto">
                    <span className={`font-bold ${stock === 0 ? 'text-gray-400' : isLowStock ? 'text-red-800' : 'text-green-800'}`}>
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(medicine.price || 0)}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-t w-full text-center ${
                        stock === 0 ? 'bg-gray-300 text-gray-600' :
                        isLowStock ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                      }`}>
                        {stock === 0 ? 'OUT' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-b border-x border-b w-full text-center ${
                        stock === 0 ? 'bg-gray-200 text-gray-500 border-gray-300' :
                        isLowStock ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'
                      }`}>
                        {stock} units
                      </span>
                    </div>
                  </div>
                  
                  {isPrescription && (
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Current Sale
            </h2>

            {hasPrescriptionMed && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1 uppercase tracking-wider">Prescription Required</p>
                  <p>This sale contains a prescription medicine. Please ensure you have verified the physical prescription from the customer.</p>
                </div>
              </div>
            )}

            {/* Customer Name */}
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">Cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={`${item.medicine.id}-${item.sellUnit}`} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 truncate pr-2">
                        <p className="font-bold text-sm truncate">{item.medicine.brandName || 'Unknown Brand'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{item.medicine.name || 'Generic Name'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={item.sellUnit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              // Always get the latest medicine data from the prop to ensure we have current multipliers
                              const latestMedicine = medicines.find(m => m.id === item.medicine.id) || item.medicine;
                              const currentSellUnit = item.sellUnit;
                              
                              const multiplier = getUnitMultiplier(latestMedicine, newUnit);
                              const basePrice = Number(latestMedicine.price || 0);
                              const newUnitPrice = Number((basePrice * multiplier).toFixed(2));
                              const maxQ = getMaxSaleQuantity(latestMedicine, newUnit);
                              
                              console.log(`[SalesPOS] Unit changed: ${newUnit}, Multiplier: ${multiplier}, New Price: ${newUnitPrice}`);
                              
                              setCart(prev => prev.map(ci => {
                                if (ci.medicine.id === latestMedicine.id && ci.sellUnit === currentSellUnit) {
                                  return { 
                                    ...ci, 
                                    medicine: latestMedicine, // Update with latest data
                                    sellUnit: newUnit, 
                                    unitPrice: newUnitPrice, 
                                    quantity: Math.min(ci.quantity, Math.max(1, maxQ)) 
                                  };
                                }
                                return ci;
                              }));
                            }}
                            className="text-xs border rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="piece">Unit (1 pc)</option>
                            {!isBottle(item.medicine) && getTabletCount(item.medicine) > 0 && (
                              <option value="blister">Blister ({getUnitMultiplier(item.medicine, 'blister')} pcs)</option>
                            )}
                            {!isBottle(item.medicine) && getBoxTabletCount(item.medicine) > 0 && (
                              <option value="box">Box ({getUnitMultiplier(item.medicine, 'box')} pcs)</option>
                            )}
                          </select>
                          <p className="text-xs text-gray-500">
                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.unitPrice || (item.medicine.price || 0))} each
                            {item.sellUnit !== 'piece' && (
                              <span className="ml-1 text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                (Multiplier: {getUnitMultiplier(item.medicine, item.sellUnit)} pcs • Total: {item.quantity * getUnitMultiplier(item.medicine, item.sellUnit)} pcs)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.medicine.id, item.sellUnit)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">Qty ({item.sellUnit})</label>
                            <div className="relative group">
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => setQuantity(item.medicine.id, item.sellUnit, e.target.value)}
                                onBlur={() => handleQuantityBlur(item.medicine.id, item.sellUnit)}
                                className="w-20 text-center font-black text-gray-900 border-2 border-white rounded-xl py-2 shadow-sm bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                              />
                            </div>
                          </div>
                          
                          {item.sellUnit !== 'piece' && (
                            <div className="flex flex-col">
                              <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">Pcs</label>
                              <div className="relative group">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.extraPieces || 0}
                                  onChange={(e) => setExtraPieces(item.medicine.id, item.sellUnit, e.target.value)}
                                  onBlur={() => handleExtraBlur(item.medicine.id, item.sellUnit)}
                                  className="w-16 text-center font-black text-gray-900 border-2 border-white rounded-xl py-2 shadow-sm bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Total Pcs:</span>
                            <span className="text-[11px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              {(Number(item.quantity || 0) * getUnitMultiplier(item.medicine, item.sellUnit)) + Number(item.extraPieces || 0)}
                            </span>
                          </div>
                          <span className="text-lg font-black text-blue-700 tracking-tight">
                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
                              Number(((Number(item.unitPrice || 0) * Number(item.quantity || 0)) + (Number(item.medicine.price || 0) * Number(item.extraPieces || 0))).toFixed(2))
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t pt-4 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>VAT:</span>
                <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => setShowCheckoutModal(true)}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Checkout
              </button>
              <button
                onClick={() => setCart([])}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {checkoutStep === 'input' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
                  <button 
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setAmountReceived('');
                    }} 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-700 font-medium">Total Amount Due:</span>
                      <span className="text-3xl font-black text-blue-900">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(grandTotal)}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 flex justify-between font-medium">
                      <span>{cart.length} items in cart</span>
                      <span>Customer: {customerName || 'Walk-in'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 uppercase tracking-wider">Amount Received (PHP)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">₱</span>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-gray-50 text-3xl font-black transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-bold uppercase tracking-wider">Change:</span>
                      <span className={`text-3xl font-black ${change > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(change)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCheckout(false)}
                        disabled={!amountReceived || Number(amountReceived) < grandTotal}
                        className="flex-1 bg-emerald-600 text-white py-4 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-100 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Confirm Sale
                      </button>
                      <button
                        onClick={() => handleCheckout(true)}
                        disabled={!amountReceived || Number(amountReceived) < grandTotal}
                        className="flex-1 bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Confirm & Print
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setAmountReceived('');
                      }}
                      className="w-full bg-white text-gray-500 py-3 rounded-xl hover:bg-gray-50 transition-all font-bold border-2 border-gray-100"
                    >
                      Back to Cart
                    </button>
                  </div>
                </div>
              </div>
            )}

            {checkoutStep === 'processing' && (
              <div className="p-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 border-8 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                  <ShoppingCart className="w-8 h-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Transaction</h3>
                  <p className="text-gray-500 animate-pulse">Updating inventory and generating receipt...</p>
                </div>
              </div>
            )}

            {checkoutStep === 'success' && lastCompletedSale && (
              <div className="p-0">
                <div className="bg-emerald-600 p-6 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
                    <Plus className="w-10 h-10 rotate-45" /> {/* This is a checkmark surrogate or use custom icon */}
                  </div>
                  <h2 className="text-3xl font-black mb-1">Sale Completed</h2>
                  <p className="opacity-90 font-medium">Customer: {lastCompletedSale.customerName || 'Walk-in'}</p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-2 border-b pb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(lastCompletedSale.total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>VAT (12%)</span>
                      <span className="font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(lastCompletedSale.tax)}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span className="text-blue-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(lastCompletedSale.grandTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="flex justify-between text-gray-600">
                      <span>Cash Received</span>
                      <span className="font-bold text-gray-900">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(lastCompletedSale.amountReceived)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-emerald-600 pt-1 border-t border-gray-200 mt-1">
                      <span>Change</span>
                      <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(lastCompletedSale.change)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Purchased Items</h3>
                    <div className="max-h-48 overflow-y-auto pr-2">
                      <table className="w-full text-sm">
                        <thead className="text-gray-400 border-b">
                          <tr>
                            <th className="text-left py-2 font-medium">Name</th>
                            <th className="text-center py-2 font-medium">Qty</th>
                            <th className="text-right py-2 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lastCompletedSale.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-3 font-bold text-gray-800">{it.name}</td>
                              <td className="py-3 text-center text-gray-600">{it.quantity}</td>
                              <td className="py-3 text-right font-medium text-gray-900">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(it.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setCheckoutStep('input');
                      setAmountReceived('');
                      setLastCompletedSale(null);
                    }}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl hover:bg-black transition-all font-black uppercase tracking-widest shadow-lg shadow-gray-200"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipts History */}
      <div className="mt-8 bg-card rounded-lg border p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Receipts History
          </h2>
        </div>
        
        {receipts.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">No receipts recorded yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map((r) => {
              const ts = r?.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date(r.timestamp);
              const label = ts.toLocaleString();
              const items = Array.isArray(r.items) ? r.items : [];
              const subtotal = r.total || 0;
              const tax = r.tax || 0;
              const grand = r.grandTotal || (subtotal + tax);
              const formatMoney = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
              
              return (
                <div key={r.id} className="bg-gray-50 rounded-lg border p-4 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-semibold text-sm">Customer: {r.customerName || 'Walk-in'}</p>
                    </div>
                    <span className="text-blue-600 font-bold text-sm">
                      {formatMoney(grand)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {items.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-gray-600">
                        <span className="truncate pr-2">
                          {it.name} 
                          {it.extraPieces > 0 
                            ? ` (${it.quantity} ${it.sellUnit} + ${it.extraPieces} pcs)` 
                            : ` x${it.quantity} ${it.sellUnit}`}
                        </span>
                        <span>{formatMoney(it.subtotal || (it.price * it.quantity))}</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[10px] text-gray-400">+{items.length - 3} more items</p>
                    )}
                  </div>

                  <div className="bg-white/50 rounded p-2 mb-3 text-[10px] space-y-1 border border-gray-100">
                    <div className="flex justify-between text-gray-500">
                      <span>Cash Received:</span>
                      <span className="font-bold text-gray-700">{formatMoney(r.amountReceived || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Seller:</span>
                      <span className="font-medium italic">{r.processedByName || 'System'}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 border-t pt-3">
                    <button
                      onClick={() => handlePrintReceipt(r)}
                      className="flex-1 text-[11px] bg-white border py-1.5 rounded hover:bg-gray-100 transition-colors font-medium"
                    >
                      Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
