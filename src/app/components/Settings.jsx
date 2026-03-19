import { useState, useEffect } from 'react';
import { User, Building2, Bell, Lock, Globe, Palette, Shield, BookOpen } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { toast } from 'sonner';

export function Settings({ userRole, onNavigateToTab, settings, onUpdateSettings, currentUser, medicines = [] }) {
  const [localPharmacyName, setLocalPharmacyName] = useState(settings?.pharmacyName || '');
  const [submitting, setSubmitting] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Get stored passwords or use defaults
      const storedUsers = JSON.parse(localStorage.getItem('pharmacy_users') || '[]');
      const username = currentUser?.uid || currentUser?.name?.toLowerCase().replace(/\s+/g, '') || 'manager';
      
      const userIdx = storedUsers.findIndex(u => u.username === username);
      if (userIdx >= 0) {
        storedUsers[userIdx].password = passwords.new;
      } else {
        storedUsers.push({ username, password: passwords.new });
      }
      
      localStorage.setItem('pharmacy_users', JSON.stringify(storedUsers));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
      
      await auditService.logAction({
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.name || 'Unknown User',
        userRole: currentUser?.role || 'unknown',
        action: 'PASSWORD_CHANGE',
        entityType: 'user',
        entityName: currentUser?.name || 'User',
        details: {},
      });
    } catch (err) {
      toast.error('Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  // Sync local state with prop settings if it changes externally
  useEffect(() => {
    setLocalPharmacyName(settings?.pharmacyName || '');
  }, [settings]);

  const [demoCount, setDemoCount] = useState('100');
  const [demoMedicineCount, setDemoMedicineCount] = useState('15');
  const [demoMonths, setDemoMonths] = useState(6);
  const [generating, setGenerating] = useState(false);
  return (
    <div className="relative">
      {/* Submitting Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[1px] z-[100] flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-900 font-bold">Processing...</p>
        </div>
      )}
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
              toast.success('Pharmacy name updated');
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
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-card-foreground">Security Settings</h2>
          </div>

          <h3 className="text-md font-semibold text-card-foreground mb-4">Change Password</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password *</label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                placeholder="Required"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">New Password *</label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                placeholder="Min. 6 chars"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password *</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <button 
            onClick={handleChangePassword}
            className="mt-4 bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium shadow-sm"
          >
            Update Password
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
                      if (!m.batches || m.batches.length === 0) return 1;
                      const b = m.batches[0];
                      const bl = Number(b.blistersPerBox || 1);
                      const upb = Number(b.unitsPerBlister || 1);
                      if (unit === 'blister') return upb;
                      if (unit === 'box') return bl * upb;
                      return 1;
                    };
                    const vatRate = 0.12;
                    let created = 0;
                    
                    // Group medicines by category for realistic bundles
                    const byCategory = medicines.reduce((acc, m) => {
                      const cat = m.category || 'General';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(m);
                      return acc;
                    }, {});

                    for (let i = 0; i < targetCount; i++) {
                      const itemsCount = Math.max(1, Math.floor(Math.random() * 5));
                      const chosen = [];
                      
                      // 70% chance to pick from same category (realistic prescription/bundle)
                      const useCategoryBundle = Math.random() < 0.7;
                      const categories = Object.keys(byCategory);
                      const randomCat = categories[Math.floor(Math.random() * categories.length)];
                      const pool = useCategoryBundle ? byCategory[randomCat] : medicines;
                      
                      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
                      for (let j = 0; j < itemsCount && j < shuffled.length; j++) {
                        const m = shuffled[j];
                        const unit = pickUnit(m);
                        const mult = unitMultiplier(m, unit);
                        
                        // Realistic quantities: 1-10 for units, 1-2 for boxes/blisters
                        let qty = 1;
                        if (unit === 'piece') qty = Math.floor(Math.random() * 10) + 1;
                        else qty = Math.floor(Math.random() * 2) + 1;
                        
                        const maxQ = mult > 0 ? Math.max(1, Math.floor((Number(m.totalQuantity || 0) || 50) / mult)) : 1;
                        qty = Math.min(qty, maxQ);
                        
                        if (qty > 0) chosen.push({ m, unit, mult, qty });
                      }

                      if (chosen.length === 0) continue;

                      const now = new Date();
                      // Realistic time distribution: 
                      // 40% Morning (9-12), 40% Afternoon (1-5), 20% Evening (6-9)
                      const timeRand = Math.random();
                      let hour = 9;
                      if (timeRand < 0.4) hour = 9 + Math.floor(Math.random() * 4);
                      else if (timeRand < 0.8) hour = 13 + Math.floor(Math.random() * 5);
                      else hour = 18 + Math.floor(Math.random() * 4);

                      let ts = new Date(
                        now.getFullYear(),
                        now.getMonth() - Math.floor(Math.random() * demoMonths),
                        Math.max(1, Math.floor(Math.random() * 28)),
                        hour,
                        Math.floor(Math.random() * 60)
                      );
                      if (ts > now) {
                        const backDays = Math.floor(Math.random() * 7) + 1;
                        ts = new Date(now.getTime() - backDays * 86400000);
                        ts.setHours(Math.floor(Math.random() * 10) + 9, Math.floor(Math.random() * 60), 0, 0);
                      }
                      const subtotal = chosen.reduce((s, { m, mult, qty }) => s + (Number(m.price || 0) * mult * qty), 0);
                      const tax = subtotal * vatRate;
                      const grandTotal = subtotal + tax;
                      const amountReceived = Math.ceil(grandTotal / 50) * 50;

                      const receiptPayload = {
                        timestamp: ts,
                        customerName: Math.random() < 0.2 ? 'Walk-in' : 'Customer ' + Math.floor(Math.random() * 1000),
                        items: chosen.map(({ m, unit, qty }) => ({
                          medicineId: m.id,
                          name: m.name,
                          quantity: qty,
                          unitSold: unit,
                          price: Number(m.price || 0),
                        })),
                        subtotal: subtotal,
                        tax: tax,
                        grandTotal: grandTotal,
                        amountReceived: amountReceived,
                        change: amountReceived - grandTotal,
                        userId: currentUser?.uid || 'unknown',
                        userName: currentUser?.name || 'Unknown User',
                      };
                      
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
          <div className="mt-6 border-t pt-4">
            <h3 className="text-md font-semibold text-card-foreground mb-2">Medicine Generator</h3>
            <p className="text-muted-foreground mb-4">
              Populate your inventory with a catalog of medicines across multiple categories. 
              Includes a mix of normal stock, low stock, expiring soon, and expired batches.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Number of Medicines</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={demoMedicineCount}
                  onChange={(e) => setDemoMedicineCount(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                />
              </div>
              <button
                disabled={generating}
                onClick={async () => {
                  setGenerating(true);
                  try {
                    const { medicineService } = await import('@/services/medicineService');
                    
                    const catalog = [
                      // Antibiotics
                      { 
                        name: 'Amoxicillin', 
                        category: 'Antibiotic',
                        variations: [
                          { dosageForm: 'capsule', strength: '500 mg', unit: 'capsules' },
                          { dosageForm: 'capsule', strength: '250 mg', unit: 'capsules' },
                          { dosageForm: 'suspension', strength: '250 mg/5 ml', unit: 'bottle' }
                        ]
                      },
                      { 
                        name: 'Ciprofloxacin', 
                        category: 'Antibiotic',
                        variations: [
                          { dosageForm: 'tablet', strength: '500 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '250 mg', unit: 'tablets' }
                        ]
                      },
                      { name: 'Azithromycin', category: 'Antibiotic', variations: [{ dosageForm: 'tablet', strength: '250 mg', unit: 'tablets' }] },
                      
                      // Analgesics / NSAIDs
                      { 
                        name: 'Paracetamol', 
                        category: 'Analgesic',
                        variations: [
                          { dosageForm: 'tablet', strength: '500 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '325 mg', unit: 'tablets' },
                          { dosageForm: 'syrup', strength: '125 mg/5 ml', unit: 'bottle' }
                        ]
                      },
                      { 
                        name: 'Mefenamic Acid', 
                        category: 'Analgesic',
                        variations: [
                          { dosageForm: 'capsule', strength: '500 mg', unit: 'capsules' },
                          { dosageForm: 'tablet', strength: '250 mg', unit: 'tablets' }
                        ]
                      },
                      { 
                        name: 'Ibuprofen', 
                        category: 'NSAID',
                        variations: [
                          { dosageForm: 'tablet', strength: '400 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '200 mg', unit: 'tablets' }
                        ]
                      },
                      { name: 'Celecoxib', category: 'NSAID', variations: [{ dosageForm: 'capsule', strength: '200 mg', unit: 'capsules' }] },
                      
                      // Cough & Cold
                      { name: 'Ascof (Cough Syrup)', category: 'Cough & Cold', variations: [{ dosageForm: 'syrup', strength: '600 mg/5 ml', unit: 'bottle' }] },
                      { 
                        name: 'Neozep', 
                        category: 'Cough & Cold',
                        variations: [
                          { dosageForm: 'tablet', strength: 'Forte', unit: 'tablets' },
                          { dosageForm: 'syrup', strength: 'Drops', unit: 'bottle' }
                        ]
                      },
                      
                      // Gastrointestinal
                      { name: 'Loperamide', category: 'GI', variations: [{ dosageForm: 'capsule', strength: '2 mg', unit: 'capsules' }] },
                      { 
                        name: 'Omeprazole', 
                        category: 'GI',
                        variations: [
                          { dosageForm: 'capsule', strength: '20 mg', unit: 'capsules' },
                          { dosageForm: 'capsule', strength: '40 mg', unit: 'capsules' }
                        ]
                      },
                      { name: 'Kremil-S', category: 'GI', variations: [{ dosageForm: 'tablet', strength: 'Regular', unit: 'tablets' }] },
                      
                      // Cardiovascular
                      { 
                        name: 'Losartan', 
                        category: 'Cardio',
                        variations: [
                          { dosageForm: 'tablet', strength: '50 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '100 mg', unit: 'tablets' }
                        ]
                      },
                      { name: 'Amlodipine', category: 'Cardio', variations: [{ dosageForm: 'tablet', strength: '5 mg', unit: 'tablets' }, { dosageForm: 'tablet', strength: '10 mg', unit: 'tablets' }] },
                      
                      // Allergy / Antihistamines
                      { name: 'Cetirizine', category: 'Allergy', variations: [{ dosageForm: 'tablet', strength: '10 mg', unit: 'tablets' }, { dosageForm: 'syrup', strength: '5 mg/5 ml', unit: 'bottle' }] },
                      
                      // Vitamins & Supplements
                      { name: 'Vitamin C', category: 'Vitamins', variations: [{ dosageForm: 'capsule', strength: '500 mg', unit: 'capsules' }, { dosageForm: 'tablet', strength: '1000 mg', unit: 'tablets' }] },
                      { name: 'Vitamin B-Complex', category: 'Vitamins', variations: [{ dosageForm: 'tablet', strength: '100 mg', unit: 'tablets' }] },
                      
                      // Diabetes
                      { name: 'Metformin', category: 'Diabetes', variations: [{ dosageForm: 'tablet', strength: '500 mg', unit: 'tablets' }, { dosageForm: 'tablet', strength: '850 mg', unit: 'tablets' }] }
                    ];

                    const parsedCount = parseInt(demoMedicineCount || '0', 10);
                    const targetCount = isNaN(parsedCount) ? 15 : Math.max(5, Math.min(50, parsedCount));
                    
                    // Shuffle catalog
                    const shuffledCatalog = catalog.sort(() => Math.random() - 0.5);
                    
                    let created = 0;
                    let medicinesToCreate = [];

                    // Collect variations until we hit targetCount
                    for (const group of shuffledCatalog) {
                      if (medicinesToCreate.length >= targetCount) break;
                      
                      // Decide how many variations of this group to add (1 to all)
                      const varsCount = Math.floor(Math.random() * group.variations.length) + 1;
                      const selectedVars = group.variations.slice(0, varsCount);
                      
                      selectedVars.forEach(v => {
                        if (medicinesToCreate.length < targetCount) {
                          medicinesToCreate.push({
                            name: group.name,
                            category: group.category,
                            ...v
                          });
                        }
                      });
                    }

                    for (let idx = 0; idx < medicinesToCreate.length; idx++) {
                      const item = medicinesToCreate[idx];
                      try {
                        const price = Math.round((Math.random() * 18 + 2) * 100) / 100;
                        const minStockLevel = 50;
                        const isLiquid = item.unit === 'ml' || String(item.dosageForm).toLowerCase() === 'syrup' || String(item.dosageForm).toLowerCase() === 'bottle';
                        
                        const medId = await medicineService.addMedicine({
                          name: item.name,
                          dosageForm: item.dosageForm,
                          strength: item.strength,
                          unit: item.unit,
                          category: item.category,
                          price,
                          minStockLevel,
                          batches: [],
                          totalQuantity: 0
                        });

                        // Determine status for this medicine
                        // Status mix: Normal (40%), Low Stock (20%), Expiring Soon (20%), Expired (20%)
                        const randStatus = Math.random();
                        let status = 'normal';
                        if (randStatus < 0.2) status = 'expired';
                        else if (randStatus < 0.4) status = 'low';
                        else if (randStatus < 0.6) status = 'soon';

                        const batchesToAdd = Math.random() < 0.3 ? 2 : 1;
                        for (let i = 0; i < batchesToAdd; i++) {
                          let boxes = 0, blisters = 1, units = 1;
                          
                          if (status === 'low') {
                            // Low stock: total quantity <= minStockLevel (50)
                            boxes = Math.floor(Math.random() * 40) + 5; 
                          } else {
                            // Normal/Expired/Soon: higher stock
                            boxes = Math.floor(Math.random() * 200) + 100;
                          }

                          const exp = new Date();
                          if (status === 'expired') {
                            // Expired: date in the past
                            exp.setMonth(exp.getMonth() - (Math.floor(Math.random() * 6) + 1));
                          } else if (status === 'soon') {
                            // Expiring Soon: within 30 days
                            exp.setDate(exp.getDate() + (Math.floor(Math.random() * 25) + 2));
                          } else if (status === 'low' || status === 'normal') {
                            // Future expiry
                            exp.setMonth(exp.getMonth() + (i === 0 ? 12 : 18));
                            exp.setDate(exp.getDate() + Math.floor(Math.random() * 28));
                          }

                          await medicineService.addBatch(medId, {
                            batchNumber: `${item.name.slice(0,3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}-${i + 1}`,
                            expiryDate: exp.toISOString().slice(0, 10),
                            supplier: 'PharmaSupply Co.',
                            boxesReceived: boxes,
                            blistersPerBox: blisters,
                            unitsPerBlister: units,
                            purchasePrice: Math.round((price * 0.7) * 100) / 100
                          });
                        }
                        created += 1;
                      } catch (err) {
                        console.error(`Failed to add medicine ${item.name}:`, err);
                      }
                    }
                    
                    toast.success(`Generated ${created} demo medicines with mixed stock statuses`);
                    window.dispatchEvent(new Event('refresh-medicines'));
                  } catch (e) {
                    console.error(e);
                    toast.error('Failed to generate demo medicines');
                  } finally {
                    setGenerating(false);
                  }
                }}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate Demo Medicines'}
              </button>
            </div>
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
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            onClick={() => {
              onUpdateSettings?.({ ...settings, pharmacyName: localPharmacyName, theme: settings.theme });
              toast.success('Display settings applied');
            }}
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
