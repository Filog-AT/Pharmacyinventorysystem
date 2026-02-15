import { useState } from 'react';
import { User, Building2, Bell, Lock, Globe, Palette, Shield, BookOpen } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { toast } from 'sonner';

export function Settings({ userRole, onNavigateToTab, settings, onUpdateSettings, currentUser, medicines = [] }) {
  const [localPharmacyName, setLocalPharmacyName] = useState(settings?.pharmacyName || '');
  const [demoCount, setDemoCount] = useState('100');
  const [demoMonths, setDemoMonths] = useState(6);
  const [generating, setGenerating] = useState(false);
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your pharmacy system preferences</p>
      </div>

      <div className="space-y-6">
        {/* Pharmacy Information */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Pharmacy Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Pharmacy Name</label>
              <input
                type="text"
                value={localPharmacyName}
                onChange={(e) => setLocalPharmacyName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">License Number</label>
              <input
                type="text"
                defaultValue="PH-123456"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
              <input
                type="tel"
                defaultValue="(555) 123-4567"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                defaultValue="contact@pharmacare.com"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
              <textarea
                rows={2}
                defaultValue="123 Healthcare Avenue, Medical District, State 12345"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
          </div>
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            onClick={async () => {
              const beforeName = settings?.pharmacyName || '';
              const afterName = localPharmacyName || '';
              onUpdateSettings?.({ ...settings, pharmacyName: afterName });
              if (beforeName !== afterName) {
                try {
                  await auditService.logAction({
                    userId: currentUser?.uid || 'unknown',
                    userName: currentUser?.name || 'Unknown User',
                    userRole: currentUser?.role || 'unknown',
                    action: 'PHARMACY_EDIT',
                    entityType: 'pharmacy',
                    entityName: 'Pharmacy Information',
                    details: {},
                    changes: { before: { pharmacyName: beforeName }, after: { pharmacyName: afterName } },
                  });
                } catch {}
              }
            }}
          >
            Save Changes
          </button>
        </div>

        {/* User Profile */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-card-foreground">User Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
              <input
                type="text"
                defaultValue="Dr. John Smith"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
              <select className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background">
                <option>Pharmacist</option>
                <option>Manager</option>
                <option>Staff</option>
                <option>Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                defaultValue="john.smith@pharmacare.com"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
              <input
                type="tel"
                defaultValue="(555) 987-6543"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Update Profile
          </button>
        </div>

        {/* Security */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Change Password
          </button>
        </div>


      {/* Demo Data (Manager Only) */}
      {userRole !== 'staff' && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Demo Sales Generator</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Generate synthetic sales receipts to populate analytics. Writes directly to your receipts database.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Number of sales</label>
              <input
                type="number"
                min="50"
                max="1000"
                value={demoCount}
                onChange={(e) => setDemoCount(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Months span</label>
              <select
                value={demoMonths}
                onChange={(e) => setDemoMonths(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              >
                <option value={6}>6 months</option>
                <option value={7}>7 months</option>
                <option value={8}>8 months</option>
                <option value={9}>9 months</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                disabled={generating}
                onClick={async () => {
                  setGenerating(true);
                  try {
                    toast.info('Generating demo sales using current medicines...');
                    const { receiptService } = await import('@/services/receiptService');
                    const { medicineService } = await import('@/services/medicineService');
                    const parsedCount = parseInt(demoCount || '0', 10);
                    const targetCount = isNaN(parsedCount) ? 100 : Math.max(50, Math.min(1000, parsedCount));
                    if (!Array.isArray(medicines) || medicines.length === 0) {
                      toast.error('No medicines found. Add products before generating demo sales.');
                      setGenerating(false);
                      return;
                    }
                    const pickUnit = (m) => {
                      const hasBatches = Array.isArray(m.batches) && m.batches.length > 0;
                      if (!hasBatches) return 'piece';
                      const today = new Date();
                      const anyBatch = m.batches.find(b => new Date(b.expiryDate) >= today && Number(b.quantity || 0) > 0) || m.batches[0];
                      const canBlister = Number(anyBatch?.unitsPerBlister || 0) > 0;
                      const canBox = (Number(anyBatch?.blistersPerBox || 0) * Number(anyBatch?.unitsPerBlister || 0)) > 0;
                      const opts = ['piece'].concat(canBlister ? ['blister'] : []).concat(canBox ? ['box'] : []);
                      return opts[Math.floor(Math.random() * opts.length)];
                    };
                    const unitMultiplier = (m, unit) => {
                      const b = (Array.isArray(m.batches) && m.batches.length > 0) ? m.batches[0] : null;
                      const bl = Number(b?.blistersPerBox || 1);
                      const upb = Number(b?.unitsPerBlister || 1);
                      if (unit === 'blister') return upb;
                      if (unit === 'box') return bl * upb;
                      return 1;
                    };
                    let created = 0;
                    for (let i = 0; i < targetCount; i++) {
                      const itemsCount = Math.max(1, Math.floor(Math.random() * 4));
                      const chosen = [];
                      const shuffled = medicines.slice().sort(() => Math.random() - 0.5);
                      for (let j = 0; j < itemsCount && j < shuffled.length; j++) {
                        const m = shuffled[j];
                        const unit = pickUnit(m);
                        const mult = unitMultiplier(m, unit);
                        const maxQ = mult > 0 ? Math.max(1, Math.floor((Number(m.totalQuantity || 0) || 50) / mult)) : 1;
                        const qty = Math.max(1, Math.min(maxQ, Math.floor(Math.random() * 5) + 1));
                        chosen.push({ m, unit, mult, qty });
                      }
                      const now = new Date();
                      let ts = new Date(
                        now.getFullYear(),
                        now.getMonth() - Math.floor(Math.random() * demoMonths),
                        Math.max(1, Math.floor(Math.random() * 28)),
                        Math.floor(Math.random() * 10) + 9,
                        Math.floor(Math.random() * 60)
                      );
                      if (ts > now) {
                        // Clamp to a recent past time to avoid future-dated sales
                        const backDays = Math.floor(Math.random() * 7) + 1;
                        ts = new Date(now.getTime() - backDays * 86400000);
                        ts.setHours(Math.floor(Math.random() * 10) + 9, Math.floor(Math.random() * 60), 0, 0);
                      }
                      const receiptPayload = {
                        timestamp: ts,
                        customerName: Math.random() < 0.2 ? 'Walk-in' : 'Customer ' + Math.floor(Math.random() * 1000),
                        items: chosen.map(({ m, unit, qty }) => ({
                          medicineId: m.id,
                          name: m.name,
                          quantity: qty,
                          unitSold: unit,
                          price: Math.min(Number(m.price || 0), 49),
                        })),
                        subtotal: chosen.reduce((s, { m, mult, qty }) => s + (Math.min(Number(m.price || 0), 49) * mult * qty), 0),
                        tax: 0,
                        grandTotal: 0, // will compute below
                        userId: currentUser?.uid || 'unknown',
                        userName: currentUser?.name || 'Unknown User',
                      };
                      receiptPayload.grandTotal = receiptPayload.subtotal;
                      await receiptService.addReceipt(receiptPayload);
                      // Also add sales records for forecasting
                      for (const { m, mult, qty } of chosen) {
                        await medicineService.addSaleRecord(m.id, mult * qty, ts);
                      }
                      created += 1;
                    }
                    toast.success(`Generated ${created} demo sales across ${demoMonths} months`);
                    try {
                      await auditService.logAction({
                        userId: currentUser?.uid || 'unknown',
                        userName: currentUser?.name || 'Unknown User',
                        userRole: currentUser?.role || 'unknown',
                        action: 'DEMO_SALES_GENERATE',
                        entityType: 'receipts',
                        entityId: 'bulk',
                        entityName: 'Demo Sales Generator',
                        details: { count: targetCount, months: demoMonths },
                      });
                    } catch {}
                  } catch (e) {
                    toast.error('Failed to generate demo sales');
                    console.error(e);
                  } finally {
                    setGenerating(false);
                  }
                }}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate Demo Sales'}
              </button>
            </div>
          </div>
          <div className="mt-4">
            <button
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  const { medicineService } = await import('@/services/medicineService');
                  const catalog = [
                    { name: 'Amoxicillin', dosageForm: 'capsule', strength: '500 mg', unit: 'capsules', category: 'Antibiotic' },
                    { name: 'Paracetamol', dosageForm: 'tablet', strength: '500 mg', unit: 'tablets', category: 'Analgesic' },
                    { name: 'Ibuprofen', dosageForm: 'tablet', strength: '400 mg', unit: 'tablets', category: 'NSAID' },
                    { name: 'Cough Syrup', dosageForm: 'syrup', strength: '100 mg/5 ml', unit: 'ml', category: 'Cough & Cold' },
                    { name: 'Loperamide', dosageForm: 'capsule', strength: '2 mg', unit: 'capsules', category: 'GI' },
                    { name: 'Cetirizine', dosageForm: 'tablet', strength: '10 mg', unit: 'tablets', category: 'Allergy' },
                    { name: 'Losartan', dosageForm: 'tablet', strength: '50 mg', unit: 'tablets', category: 'Cardio' },
                    { name: 'Amlodipine', dosageForm: 'tablet', strength: '5 mg', unit: 'tablets', category: 'Cardio' },
                    { name: 'Omeprazole', dosageForm: 'capsule', strength: '20 mg', unit: 'capsules', category: 'GI' },
                    { name: 'Vitamin C', dosageForm: 'tablet', strength: '500 mg', unit: 'tablets', category: 'Vitamins' }
                  ];
                  let created = 0;
                  for (let idx = 0; idx < catalog.length; idx++) {
                    const item = catalog[idx];
                    try {
                      const price = Math.round((Math.random() * 18 + 2) * 100) / 100;
                      const minStockLevel = 50;
                      // Normalize bottle item to strict 'bottle' unit/form for compatibility
                      const isLiquid = item.unit === 'ml' || String(item.dosageForm).toLowerCase() === 'syrup';
                      const medId = await medicineService.addMedicine({
                        name: item.name,
                        dosageForm: isLiquid ? 'bottle' : item.dosageForm,
                        strength: item.strength,
                        unit: isLiquid ? 'bottle' : item.unit,
                        category: item.category,
                        price,
                        minStockLevel,
                        batches: [],
                        totalQuantity: 0
                      });
                      const batchesToAdd = Math.random() < 0.5 ? 1 : 2;
                      for (let i = 0; i < batchesToAdd; i++) {
                        const guaranteeNearLow = idx === 0 && i === 0;
                        const nearExpiry = guaranteeNearLow || Math.random() < 0.25;
                        // Force stock in base units only (tablets, capsules, bottles), not boxes
                        let boxes = 0, blisters = 1, units = 1;
                        if (item.unit === 'ml') {
                          // Treat liquids as bottles
                          boxes = guaranteeNearLow ? 1 : Math.floor(Math.random() * 6) + 2; // bottles count
                        } else {
                          // Tablets/Capsules as pieces
                          const pieces = guaranteeNearLow ? Math.floor(Math.random() * 12) + 1 : Math.floor(Math.random() * 150) + 30;
                          boxes = pieces; // interpret as base unit count
                          blisters = 1;
                          units = 1;
                        }
                        const exp = new Date();
                        if (nearExpiry) {
                          exp.setDate(exp.getDate() + (guaranteeNearLow ? 10 : Math.floor(Math.random() * 14) + 7));
                        } else {
                          exp.setMonth(exp.getMonth() + (i === 0 ? 6 : 12));
                        }
                        await medicineService.addBatch(medId, {
                          batchNumber: `${item.name.slice(0,3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}-${i + 1}`,
                          expiryDate: exp.toISOString().slice(0, 10),
                          supplier: '',
                          boxesReceived: boxes,
                          blistersPerBox: blisters,
                          unitsPerBlister: units,
                          purchasePrice: Math.max(1, price * 0.6)
                        });
                      }
                      created += 1;
                    } catch {}
                  }
                  toast.success(`Generated ${created} demo medicines with initial batches`);
                  try {
                    window.dispatchEvent(new Event('refresh-medicines'));
                  } catch {}
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to generate demo medicines');
                } finally {
                  setGenerating(false);
                }
              }}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50"
            >
              {generating ? 'Generating...' : 'Generate Demo Medicines'}
            </button>
          </div>
        </div>
      )}

        {/* Display Settings */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Display Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Theme</label>
              <select
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                value={settings?.theme || 'Light'}
                onChange={(e) => onUpdateSettings?.({ ...settings, theme: e.target.value })}
              >
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
