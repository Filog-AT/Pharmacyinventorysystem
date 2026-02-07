import { useState } from 'react';
import { User, Building2, Bell, Lock, Globe, Palette, Shield, BookOpen } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { toast } from 'sonner';

export function Settings({ userRole, onNavigateToTab, settings, onUpdateSettings, currentUser }) {
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
                    toast.info('Generating demo sales...');
                    const svcModule = await import('@/services/receiptService');
                    const receiptService = svcModule.receiptService;
                    const dataModule = await import('@/data/sampleReceipts');
                    const gen = dataModule.generateSampleReceipts;
                    const all = gen(demoMonths);
                    const parsedCount = parseInt(demoCount || '0', 10);
                    const targetCount = isNaN(parsedCount) ? 100 : Math.max(50, Math.min(1000, parsedCount));
                    let target = [];
                    if (all.length >= targetCount) {
                      const step = Math.max(1, Math.floor(all.length / targetCount));
                      for (let i = 0; i < targetCount; i++) {
                        const idx = Math.min(all.length - 1, i * step);
                        target.push(all[idx]);
                      }
                    } else {
                      target = all.slice();
                      const need = targetCount - target.length;
                      const now = new Date();
                      for (let i = 0; i < need; i++) {
                        const base = all[Math.floor(Math.random() * all.length)];
                        const ts = new Date(
                          now.getFullYear(),
                          now.getMonth() - Math.floor(Math.random() * demoMonths),
                          Math.max(1, Math.floor(Math.random() * 28)),
                          Math.floor(Math.random() * 10) + 9,
                          Math.floor(Math.random() * 60)
                        );
                        target.push({ ...base, timestamp: ts });
                      }
                    }
                    let created = 0;
                    for (const r of target) {
                      const { id, ...payload } = r;
                      await receiptService.addReceipt(payload);
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
