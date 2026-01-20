import { useState } from 'react';
import { User, Building2, Bell, Lock, Globe, Palette, Shield, BookOpen } from 'lucide-react';
import { auditService } from '@/services/auditService';

export function Settings({ userRole, onNavigateToTab, settings, onUpdateSettings, currentUser }) {
  const [localPharmacyName, setLocalPharmacyName] = useState(settings?.pharmacyName || '');
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
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Language</label>
              <select
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                value={settings?.language || 'English'}
                onChange={(e) => onUpdateSettings?.({ ...settings, language: e.target.value })}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
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
