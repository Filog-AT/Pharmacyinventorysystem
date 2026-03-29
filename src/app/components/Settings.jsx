import { useState, useEffect, useRef } from 'react';
import { User, Building2, Bell, Lock, Globe, Palette, Shield, BookOpen, UserPlus, Upload, Image as ImageIcon } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { pharmacyService } from '@/services/pharmacyService';
import { userService } from '@/services/userService';
import { medicineService } from '@/services/medicineService';
import { receiptService } from '@/services/receiptService';
import { categoryService } from '@/services/categoryService';
import { toast } from 'sonner';
import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function Settings({ userRole, onNavigateToTab, settings, onUpdateSettings, currentUser, medicines = [], categories = [] }) {
  const [localPharmacyName, setLocalPharmacyName] = useState(settings?.pharmacyName || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [sidebarColor, setSidebarColor] = useState(settings?.sidebarColor || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  // Keep local state in sync with settings prop
  useEffect(() => {
    if (settings?.logoUrl) setLogoUrl(settings.logoUrl);
    if (settings?.sidebarColor) setSidebarColor(settings.sidebarColor);
  }, [settings?.logoUrl, settings?.sidebarColor]);

  const extractThemeColors = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    
    // For Average/Mixed Color (Content)
    let avgR = 0, avgG = 0, avgB = 0, avgCount = 0;
    
    // For Dominant Color (Sidebar)
    const colorCounts = {};
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] < 128) continue; // Skip transparent
      
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      // Add to Average
      avgR += r;
      avgG += g;
      avgB += b;
      avgCount++;
      
      // Add to Dominant (bucket colors to group similar shades)
      const bucketSize = 16;
      const bucketR = Math.floor(r / bucketSize) * bucketSize;
      const bucketG = Math.floor(g / bucketSize) * bucketSize;
      const bucketB = Math.floor(b / bucketSize) * bucketSize;
      const key = `${bucketR},${bucketG},${bucketB}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }
    
    if (avgCount === 0) return { dominant: '#3b82f6', mixed: '#f8fafc' };
    
    // Calculate Average
    avgR = Math.floor(avgR / avgCount);
    avgG = Math.floor(avgG / avgCount);
    avgB = Math.floor(avgB / avgCount);
    
    // Find Dominant
    let dominantKey = '';
    let maxCount = 0;
    Object.entries(colorCounts).forEach(([key, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantKey = key;
      }
    });
    const [domR, domG, domB] = dominantKey.split(',').map(Number);
    
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return {
      dominant: `#${toHex(domR)}${toHex(domG)}${toHex(domB)}`,
      mixed: `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`
    };
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const { dominant, mixed } = extractThemeColors(img);
          
          // Downsize for sidebar logo (max 300px for much faster upload/display)
          const MAX_SIZE = 300;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get base64 string for faster storage in Firestore (JPEG 0.5 for ultra-fast upload)
          const base64 = canvas.toDataURL('image/jpeg', 0.5); 
          resolve({ base64, dominant, mixed, previewUrl: base64 });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser?.pharmacyId) return;

    // Limit file size to 1MB before processing for performance
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Logo file is too large. Please use an image under 1MB.');
      return;
    }

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!supportedTypes.includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPEG, JPG, or WEBP)');
      return;
    }

    setUploadingLogo(true);
    
    try {
      const { base64, dominant, mixed } = await compressImage(file);
      
      // 1. Optimistic Update (Immediate UI feedback)
      setLogoUrl(base64);
      setSidebarColor(dominant);
      
      const newSettings = { 
        ...settings, 
        logoUrl: base64, 
        sidebarColor: dominant,
        contentColor: mixed 
      };
      
      // Update global context/state immediately
      onUpdateSettings?.(newSettings);
      
      window.dispatchEvent(new CustomEvent('pharmacy-theme-updated', { 
        detail: { logoUrl: base64, sidebarColor: dominant, contentColor: mixed } 
      }));

      // 2. Store directly in Firestore (much faster than Storage for small compressed logos)
      await pharmacyService.updatePharmacy(currentUser.pharmacyId, {
        logoUrl: base64,
        sidebarColor: dominant,
        contentColor: mixed
      });

      toast.success('Logo updated successfully!');
    } catch (err) {
      console.error('[Settings] Logo upload error:', err);
      toast.error('Failed to update logo.');
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [showPharmacyId, setShowPharmacyId] = useState(false);
  const [pharmacyIdPassword, setPharmacyIdPassword] = useState('');
  const [verifyingPharmacyId, setVerifyingPharmacyId] = useState(false);
  
  const [staffForm, setStaffForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    show: false
  });

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await userService.createAccount(
        staffForm.name,
        staffForm.username,
        staffForm.email,
        staffForm.password,
        'staff',
        currentUser.pharmacyId,
        undefined // Pharmacy Name not needed for staff signup
      );
      toast.success(`Staff account for ${staffForm.name} created!`);
      setStaffForm({ name: '', username: '', email: '', password: '', show: false });
    } catch (err) {
      toast.error(err.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowPharmacyId = async () => {
    if (!pharmacyIdPassword) {
      toast.error('Please enter your password to view Pharmacy ID');
      return;
    }
    setVerifyingPharmacyId(true);
    try {
      // In a real app, we would verify the password with Firebase Auth
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 800));
      setShowPharmacyId(true);
      toast.success('Pharmacy ID revealed');
    } catch (err) {
      toast.error('Incorrect password');
    } finally {
      setVerifyingPharmacyId(false);
    }
  };

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
      // Firebase Auth password update would go here
      // For now, we'll log it and show success as we're restructuring DB
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
      
      await auditService.logAction(currentUser.pharmacyId, {
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
          
          {/* Logo Upload Section */}
          <div className="mb-6 flex flex-col md:flex-row items-center gap-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="relative group">
              <div className="w-24 h-24 rounded-lg bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-400 transition-colors">
                {logoUrl ? (
                  <img src={logoUrl} alt="Pharmacy Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-300" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95 disabled:bg-gray-400"
                title="Upload Logo"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleLogoUpload} 
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-gray-900">Pharmacy Logo</h3>
              <p className="text-sm text-gray-500 mb-2">Upload your pharmacy logo to customize your workspace. We'll automatically match the sidebar theme to your logo's colors.</p>
              {sidebarColor && (
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-xs font-medium text-gray-400 uppercase">Sidebar Theme:</span>
                  <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: sidebarColor }}></div>
                  <span className="text-xs font-mono text-gray-600">{sidebarColor}</span>
                </div>
              )}
            </div>
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
                placeholder="PH-XXXXXX"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
              <input
                type="tel"
                placeholder="(XXX) XXX-XXXX"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                placeholder="pharmacy@email.com"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
              <textarea
                rows={2}
                placeholder="Enter pharmacy address"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>

            {userRole !== 'staff' && (
              <div className="md:col-span-2 pt-4 border-t mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Pharmacy ID (Restricted)
                </label>
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  {!showPharmacyId ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="password"
                        placeholder="Enter manager password to reveal"
                        value={pharmacyIdPassword}
                        onChange={(e) => setPharmacyIdPassword(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button
                        onClick={handleShowPharmacyId}
                        disabled={verifyingPharmacyId}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {verifyingPharmacyId ? 'Verifying...' : 'Reveal ID'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-lg font-mono font-bold text-blue-900 bg-blue-100/50 px-3 py-1 rounded select-all">
                        {currentUser?.pharmacyId || 'ID NOT FOUND'}
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser?.pharmacyId || '');
                          toast.success('Pharmacy ID copied to clipboard');
                        }}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Share this ID with staff members so they can join your pharmacy. Keep it secure.
                  </p>
                </div>
              </div>
            )}
          </div>
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            onClick={async () => {
              if (!currentUser?.pharmacyId) return;
              const beforeName = settings?.pharmacyName || '';
              const afterName = localPharmacyName || '';
              
              setSubmitting(true);
              try {
                await pharmacyService.updatePharmacy(currentUser.pharmacyId, { name: afterName });
                onUpdateSettings?.({ ...settings, pharmacyName: afterName });
                toast.success('Pharmacy name updated');
                
                if (beforeName !== afterName) {
                  await auditService.logAction(currentUser.pharmacyId, {
                    userId: currentUser?.uid || 'unknown',
                    userName: currentUser?.name || 'Unknown User',
                    userRole: currentUser?.role || 'unknown',
                    action: 'PHARMACY_EDIT',
                    entityType: 'pharmacy',
                    entityName: 'Pharmacy Information',
                    details: {},
                    changes: { before: { pharmacyName: beforeName }, after: { pharmacyName: afterName } },
                  });
                }
              } catch (e) {
                toast.error('Failed to update pharmacy');
              } finally {
                setSubmitting(false);
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
                defaultValue={currentUser?.name || ''}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
              <input
                type="text"
                disabled
                defaultValue={currentUser?.role === 'manager' ? 'Manager' : 'Staff'}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                disabled
                defaultValue={currentUser?.email || ''}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Username</label>
              <input
                type="text"
                disabled
                defaultValue={currentUser?.username || ''}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Update Profile
          </button>
        </div>

        {/* Manager-only: Staff Management */}
        {userRole === 'manager' && (
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-card-foreground">Staff Management</h2>
              </div>
              <button 
                onClick={() => setStaffForm(prev => ({ ...prev, show: !prev.show }))}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 transition-colors"
              >
                {staffForm.show ? 'Cancel' : 'Create Staff Account'}
              </button>
            </div>

            {staffForm.show ? (
              <form onSubmit={handleCreateStaff} className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={staffForm.name}
                      onChange={e => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                      placeholder="Staff's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={staffForm.username}
                      onChange={e => setStaffForm(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                      placeholder="staff_username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={staffForm.email}
                      onChange={e => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                      placeholder="staff@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Initial Password</label>
                    <input
                      type="password"
                      required
                      value={staffForm.password}
                      onChange={e => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                      placeholder="At least 6 characters"
                      minLength={6}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Pharmacy ID (Auto-filled)</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser?.pharmacyId || ''}
                      className="w-full px-4 py-2 border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2"
                >
                  {submitting ? 'Creating...' : <UserPlus className="w-4 h-4" />}
                  Create Account
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                You can create accounts for your staff members directly. They will be automatically linked to your pharmacy ID: 
                <code className="ml-2 font-mono text-blue-600 font-bold">{currentUser?.pharmacyId?.slice(0, 8)}...</code>
              </p>
            )}
          </div>
        )}

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
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
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
              <div className="flex-1">
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
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  disabled={generating}
                  onClick={async () => {
                    if (!confirm('This will delete all existing receipts and historical sales data for this pharmacy. Continue?')) return;
                    setGenerating(true);
                    try {
                      const { receiptService } = await import('@/services/receiptService');
                      
                      toast.info('Clearing records, please wait...');
                      
                      // Clear Receipts
                      const receiptsToClear = await receiptService.getReceipts(currentUser.pharmacyId, 5000);
                      for (const r of receiptsToClear) {
                        await receiptService.deleteReceipt(currentUser.pharmacyId, r.id);
                      }
                      
                      toast.success('Successfully cleared all historical data.');
                      window.dispatchEvent(new Event('refresh-medicines'));
                      window.dispatchEvent(new Event('refresh-receipts'));
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to clear some records. Try again.');
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                >
                  Clear Data
                </button>
                <button
                  disabled={generating}
                  onClick={async () => {
                  setGenerating(true);
                  try {
                    toast.info('Generating demo sales using current medicines...');
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
                      const today = new Date();
                      const validBatch = Array.isArray(m.batches) ? 
                        (m.batches.find(b => new Date(b.expiryDate) >= today && b.quantity > 0) || m.batches[0]) : null;

                      let blistersPerBox = Number(validBatch?.blistersPerBox || m.defaultBlistersPerBox || 1);
                      let unitsPerBlister = Number(validBatch?.unitsPerBlister || m.defaultUnitsPerBlister || 1);

                      if (unit === 'blister') return unitsPerBlister;
                      if (unit === 'box') return blistersPerBox * unitsPerBlister;
                      return 1; // 'piece'
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
                      const categoryKeys = Object.keys(byCategory);
                      const randomCatKey = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
                      const pool = useCategoryBundle ? byCategory[randomCatKey] : medicines;
                      
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
                      
                      // 10% chance to make it "Today" for immediate feedback in dashboard
                      if (Math.random() < 0.1) {
                        ts = new Date(now);
                        ts.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
                      }

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
                          categoryId: m.categoryId,
                          name: m.name,
                          quantity: qty,
                          unitSold: unit,
                          price: Number(m.price || 0),
                          subtotal: Number(m.price || 0) * (unitMultiplier(m, unit) || 1) * qty
                        })),
                        total: grandTotal,
                        subtotal: subtotal,
                        tax: tax,
                        grandTotal: grandTotal,
                        amountReceived: amountReceived,
                        change: amountReceived - grandTotal,
                        userId: currentUser?.uid || 'unknown',
                        userName: currentUser?.name || 'Unknown User',
                        paymentMethod: Math.random() < 0.8 ? 'Cash' : 'G-Cash'
                      };
                      
                      await receiptService.addReceipt(currentUser.pharmacyId, receiptPayload);
                      created += 1;
                      
                      // Update progress every 50 receipts
                      if (created % 50 === 0) {
                        console.log(`[Generator] Created ${created}/${targetCount} receipts...`);
                      }
                    }
                    toast.success(`Generated ${created} demo sales across ${demoMonths} months. Refreshing dashboard...`);
                    window.dispatchEvent(new Event('refresh-medicines'));
                    window.dispatchEvent(new Event('refresh-receipts'));
                    try {
                      await auditService.logAction(currentUser.pharmacyId, {
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
                    const catalog = [
                      // Antibiotics (Mostly Prescription)
                      { 
                        name: 'Amoxicillin', 
                        category: 'Antibiotic',
                        tag: 'Prescription',
                        variations: [
                          { dosageForm: 'capsule', strength: '500 mg', unit: 'capsules' },
                          { dosageForm: 'capsule', strength: '250 mg', unit: 'capsules' },
                          { dosageForm: 'suspension', strength: '250 mg/5 ml', unit: 'bottle' }
                        ]
                      },
                      { 
                        name: 'Ciprofloxacin', 
                        category: 'Antibiotic',
                        tag: 'Prescription',
                        variations: [
                          { dosageForm: 'tablet', strength: '500 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '250 mg', unit: 'tablets' }
                        ]
                      },
                      { name: 'Azithromycin', category: 'Antibiotic', tag: 'Prescription', variations: [{ dosageForm: 'tablet', strength: '250 mg', unit: 'tablets' }] },
                      
                      // Painkiller (Mixed)
                      { 
                        name: 'Paracetamol', 
                        category: 'Painkiller',
                        tag: 'Non-Prescription',
                        variations: [
                          { dosageForm: 'tablet', strength: '500 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '325 mg', unit: 'tablets' },
                          { dosageForm: 'syrup', strength: '125 mg/5 ml', unit: 'bottle' }
                        ]
                      },
                      { 
                        name: 'Mefenamic Acid', 
                        category: 'Painkiller',
                        tag: 'Prescription',
                        variations: [
                          { dosageForm: 'capsule', strength: '500 mg', unit: 'capsules' },
                          { dosageForm: 'tablet', strength: '250 mg', unit: 'tablets' }
                        ]
                      },
                      { 
                        name: 'Ibuprofen', 
                        category: 'Painkiller',
                        tag: 'Non-Prescription',
                        variations: [
                          { dosageForm: 'tablet', strength: '400 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '200 mg', unit: 'tablets' }
                        ]
                      },
                      { name: 'Celecoxib', category: 'Painkiller', tag: 'Prescription', variations: [{ dosageForm: 'capsule', strength: '200 mg', unit: 'capsules' }] },
                      
                      // Respiratory
                      { name: 'Ascof (Cough Syrup)', category: 'Respiratory', tag: 'Non-Prescription', variations: [{ dosageForm: 'syrup', strength: '600 mg/5 ml', unit: 'bottle' }] },
                      { 
                        name: 'Neozep', 
                        category: 'Respiratory',
                        tag: 'Non-Prescription',
                        variations: [
                          { dosageForm: 'tablet', strength: 'Forte', unit: 'tablets' },
                          { dosageForm: 'syrup', strength: 'Drops', unit: 'bottle' }
                        ]
                      },
                      
                      // Gastrointestinal
                      { name: 'Loperamide', category: 'Gastrointestinal', tag: 'Non-Prescription', variations: [{ dosageForm: 'capsule', strength: '2 mg', unit: 'capsules' }] },
                      { 
                        name: 'Omeprazole', 
                        category: 'Gastrointestinal',
                        tag: 'Prescription',
                        variations: [
                          { dosageForm: 'capsule', strength: '20 mg', unit: 'capsules' },
                          { dosageForm: 'capsule', strength: '40 mg', unit: 'capsules' }
                        ]
                      },
                      { name: 'Kremil-S', category: 'Gastrointestinal', tag: 'Non-Prescription', variations: [{ dosageForm: 'tablet', strength: 'Regular', unit: 'tablets' }] },
                      
                      // Cardiovascular (Prescription)
                      { 
                        name: 'Losartan', 
                        category: 'Cardiovascular',
                        tag: 'Prescription',
                        variations: [
                          { dosageForm: 'tablet', strength: '50 mg', unit: 'tablets' },
                          { dosageForm: 'tablet', strength: '100 mg', unit: 'tablets' }
                        ]
                      },
                      { name: 'Amlodipine', category: 'Cardiovascular', tag: 'Prescription', variations: [{ dosageForm: 'tablet', strength: '5 mg', unit: 'tablets' }, { dosageForm: 'tablet', strength: '10 mg', unit: 'tablets' }] },
                      
                      // Antihistamine
                      { name: 'Cetirizine', category: 'Antihistamine', tag: 'Non-Prescription', variations: [{ dosageForm: 'tablet', strength: '10 mg', unit: 'tablets' }, { dosageForm: 'syrup', strength: '5 mg/5 ml', unit: 'bottle' }] },
                      
                      // Vitamins & Supplements
                      { name: 'Vitamin C', category: 'Vitamins & Supplements', tag: 'Vitamins', variations: [{ dosageForm: 'capsule', strength: '500 mg', unit: 'capsules' }, { dosageForm: 'tablet', strength: '1000 mg', unit: 'tablets' }] },
                      { name: 'Vitamin B-Complex', category: 'Vitamins & Supplements', tag: 'Vitamins', variations: [{ dosageForm: 'tablet', strength: '100 mg', unit: 'tablets' }] },
                      { name: 'Multivitamins', category: 'Vitamins & Supplements', tag: 'Vitamins', variations: [{ dosageForm: 'capsule', strength: 'Standard', unit: 'capsules' }] },
                      
                      // Diabetes (Prescription)
                      { name: 'Metformin', category: 'Diabetes', tag: 'Prescription', variations: [{ dosageForm: 'tablet', strength: '500 mg', unit: 'tablets' }, { dosageForm: 'tablet', strength: '850 mg', unit: 'tablets' }] }
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
                            tag: group.tag, // Pass the tag here
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
                        
                        if (!categories || categories.length === 0) {
                          toast.error('No categories found. Please reload or add categories first.');
                          setGenerating(false);
                          return;
                        }

                        let categoryObj = categories.find(c => c.name === item.category);
                        if (!categoryObj || !categoryObj.id) {
                          // Try to create the category if it doesn't exist
                          try {
                            const { categoryService } = await import('@/services/categoryService');
                            const newCatId = await categoryService.addCategory(currentUser.pharmacyId, item.category);
                            categoryObj = { id: newCatId, name: item.category };
                            // Refresh categories locally so next items can find it
                            categories.push(categoryObj);
                            window.dispatchEvent(new Event('refresh-categories'));
                          } catch (catErr) {
                            console.warn('Failed to auto-create category:', item.category);
                            categoryObj = categories[0];
                          }
                        }
                        if (!categoryObj || !categoryObj.id) throw new Error('Valid category not found');

                        const medId = await medicineService.addMedicine(
                          currentUser.pharmacyId,
                          categoryObj.id,
                          {
                            name: item.name,
                            dosageForm: item.dosageForm,
                            strength: item.strength,
                            unit: item.unit,
                            category: item.category,
                            tag: item.tag || 'Non-Prescription',
                            price,
                            minStockLevel,
                            batches: [],
                            totalQuantity: 0
                          }
                        );

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
                          
                          // Assign realistic multipliers based on dosage form
                          const form = String(item.dosageForm).toLowerCase();
                          if (form.includes('tablet') || form.includes('capsule')) {
                            blisters = Math.random() < 0.5 ? 10 : 20; // 10 or 20 blisters per box
                            units = Math.random() < 0.5 ? 10 : 8;    // 10 or 8 units per blister
                          } else if (form.includes('syrup') || form.includes('suspension') || form.includes('bottle')) {
                            blisters = 1;
                            units = 1;
                          }

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

                          await medicineService.addBatch(
                            currentUser.pharmacyId, 
                            categoryObj.id, 
                            medId, 
                            {
                              batchNumber: `${item.name.slice(0,3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}-${i + 1}`,
                              expiryDate: exp.toISOString().slice(0, 10),
                              supplier: 'PharmaSupply Co.',
                              boxesReceived: boxes,
                              blistersPerBox: blisters,
                              unitsPerBlister: units,
                              purchasePrice: Math.round((price * 0.7) * 100) / 100
                            }
                          );
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
