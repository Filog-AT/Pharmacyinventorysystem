import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { LayoutDashboard, FolderTree, Users, FileText, Bell, Settings as SettingsIcon, Menu, X, LogOut, UserCircle, ShoppingCart, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from '@/app/components/Dashboard';
import { StaffDashboard } from '@/app/components/StaffDashboard';
import { Inventory } from './components/Inventory';
import { Analytics } from './components/Analytics';
import { Customers } from './components/Customers';
import { Reports } from './components/Reports';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrdersSuppliers } from './components/OrdersSuppliers';
import { AuditLog } from './components/AuditLog';
import { SalesPOS } from './components/SalesPOS';
import { Receipts } from './components/Receipts';
import { auditService } from '@/services/auditService';
import { Toaster, toast } from '@/app/components/ui/sonner';

// Import Firebase services (will load async)
let medicineService: any = null;
let firebaseLoaded = false;
let categoryService: any = null;

// Lazy load Firebase to avoid blocking render
const loadFirebaseAsync = async () => {
  if (firebaseLoaded) return { medicineService, categoryService };
  try {
    const module = await import('@/services/medicineService');
    medicineService = module.medicineService;
    const catModule = await import('@/services/categoryService');
    categoryService = catModule.categoryService;
    firebaseLoaded = true;
    console.log('[AppSimple] Firebase services loaded');
    return { medicineService, categoryService };
  } catch (error) {
    console.warn('[AppSimple] Firebase not available:', error);
    return null;
  }
};

import { userService, UserProfile } from '@/services/userService';

type CurrentUser = UserProfile | null;

function AppSimple() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState(() => {
    // If we're not authenticated, we should show the login page
    // The auth listener will handle setting the user once loaded
    return 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [pharmacyLogo, setPharmacyLogo] = useState<string>('');
  const [sidebarColor, setSidebarColor] = useState<string>('');
  const [contentColor, setContentColor] = useState<string>('');

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = userService.onAuthChanged(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user?.pharmacyId) {
        // Fetch pharmacy details
        try {
          const { pharmacyService } = await import('@/services/pharmacyService');
          const pharmacy = await pharmacyService.getPharmacy(user.pharmacyId);
          if (pharmacy) {
            setPharmacyLogo(pharmacy.logoUrl || '');
            setSidebarColor(pharmacy.sidebarColor || '');
            setContentColor(pharmacy.contentColor || '');
            setSettings(prev => ({ 
              ...prev, 
              pharmacyName: pharmacy.name || user.pharmacyName || prev.pharmacyName,
              logoUrl: pharmacy.logoUrl || '',
              sidebarColor: pharmacy.sidebarColor || '',
              contentColor: pharmacy.contentColor || ''
            }));
          }
        } catch (err) {
          console.error('[AppSimple] Error fetching pharmacy details:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for theme updates from Settings
  useEffect(() => {
    const handleThemeUpdate = (e: any) => {
      const { logoUrl, sidebarColor, contentColor } = e.detail;
      if (logoUrl !== undefined) setPharmacyLogo(logoUrl);
      if (sidebarColor !== undefined) setSidebarColor(sidebarColor);
      if (contentColor !== undefined) setContentColor(contentColor);
    };
    window.addEventListener('pharmacy-theme-updated', handleThemeUpdate);
    return () => window.removeEventListener('pharmacy-theme-updated', handleThemeUpdate);
  }, []);

  const notifications = useMemo(() => {
    const list: any[] = [];
    const today = new Date();
    const readRaw = localStorage.getItem('pharmacy_read_notifications');
    const readSet = new Set(readRaw ? JSON.parse(readRaw) : []);

    medicines.forEach(med => {
      const qty = Number(med.totalQuantity || 0);
      const lowStockThreshold = med.minStockLevel || 50;
      if (qty <= lowStockThreshold) {
        list.push({ id: `low-${med.id}`, type: 'warning', title: 'Low Stock', message: `${med.name} is low (${qty})`, time: 'Recent' });
      }
      (med.batches || []).forEach((b: any) => {
        if (!b.expiryDate) return;
        const exp = new Date(b.expiryDate);
        const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
        if (days < 0) {
          list.push({ id: `expired-${med.id}-${b.id}`, type: 'error', title: 'Expired', message: `${med.name} (Batch ${b.batchNumber}) expired`, time: 'Alert' });
        } else if (days <= 90) {
          list.push({ id: `expiring-${med.id}-${b.id}`, type: 'warning', title: 'Expiring Soon', message: `${med.name} expires in ${days}d`, time: 'Alert' });
        }
      });
    });

    return list.map(n => ({ ...n, read: readSet.has(n.id) }));
  }, [medicines]);

  const unreadNotifs = notifications.filter(n => !n.read);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_settings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        return { pharmacyName: parsed.pharmacyName || 'PharmaCare', theme: parsed.theme || 'Light' };
      }
      return { pharmacyName: 'PharmaCare', theme: 'Light' };
    } catch {
      return { pharmacyName: 'PharmaCare', theme: 'Light' };
    }
  });

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      try { window.scrollTo(0, 0); } catch {}
    }
    // Sync hash with activePage for browser history
    if (window.location.hash !== `#${activePage}`) {
      window.history.pushState(null, '', `#${activePage}`);
    }
  }, [activePage]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      
      // If user is logged in and tries to go back to an empty hash or login state
      if (currentUser && (!hash || hash === 'login')) {
        handleLogoutAction();
        return;
      }

      if (hash && hash !== activePage) {
        setActivePage(hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePage, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('pharmacy_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'Dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Language removed from settings; keep browser default

  // Load categories from Firestore in background
  useEffect(() => {
    if (!currentUser?.pharmacyId) return;
    const syncCategories = async () => {
      try {
        const services = await loadFirebaseAsync();
        if (!services || !services.categoryService) return;
        const firebaseCategories = await services.categoryService.getCategories(currentUser.pharmacyId);
        if (firebaseCategories && firebaseCategories.length > 0) {
          setCategories(firebaseCategories);
        }
      } catch (error) {
        console.warn('[AppSimple] Failed to sync categories:', error);
      }
    };
    syncCategories();
  }, [currentUser?.pharmacyId]);

  useEffect(() => {
    if (!currentUser?.pharmacyId) return;
    const handler = async () => {
      try {
        const services = await loadFirebaseAsync();
        if (services?.medicineService) {
          const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
          setMedicines(updated);
        }
      } catch (e) {
        console.warn('[AppSimple] refresh-medicines failed:', e);
      }
    };
    window.addEventListener('refresh-medicines', handler as any);
    return () => window.removeEventListener('refresh-medicines', handler as any);
  }, [currentUser?.pharmacyId]);

  useEffect(() => {
    const handler = (e: any) => {
      try {
        const items: Array<{ medicineId: string; quantity: number }> = e?.detail?.items || [];
        if (!Array.isArray(items) || items.length === 0) return;
        setMedicines(prev => {
          const today = new Date();
          today.setHours(0,0,0,0);
          const next = prev.map(m => ({ ...m, batches: Array.isArray(m.batches) ? m.batches.map(b => ({ ...b })) : [] }));
          for (const item of items) {
            const idx = next.findIndex(m => m.id === item.medicineId);
            if (idx < 0) continue;
            let remaining = Number(item.quantity || 0);
            const med = next[idx];
            const batches = Array.isArray(med.batches) ? med.batches : [];
            const order = batches
              .map((b, i) => ({ b, i }))
              .filter(x => {
                const exp = new Date(x.b.expiryDate);
                exp.setHours(0,0,0,0);
                return exp >= today && Number(x.b.quantity || 0) > 0;
              })
              .sort((a, b) => new Date(a.b.expiryDate).getTime() - new Date(b.b.expiryDate).getTime())
              .map(x => x.i);
            for (const bi of order) {
              if (remaining <= 0) break;
              const b = batches[bi];
              const q = Number(b.quantity || 0);
              if (q >= remaining) {
                b.quantity = q - remaining;
                remaining = 0;
              } else {
                remaining -= q;
                b.quantity = 0;
              }
            }
            if (remaining > 0) {
              // Fallback: consume from any non-expired batch
              for (let i = 0; i < batches.length && remaining > 0; i++) {
                const b = batches[i];
                const exp = new Date(b.expiryDate); exp.setHours(0,0,0,0);
                if (exp < today) continue;
                const q = Number(b.quantity || 0);
                if (q >= remaining) {
                  b.quantity = q - remaining;
                  remaining = 0;
                } else {
                  remaining -= q;
                  b.quantity = 0;
                }
              }
            }
            const totalQty = batches.reduce((sum, b) => {
              const exp = new Date(b.expiryDate); exp.setHours(0,0,0,0);
              return exp < today ? sum : sum + Number(b.quantity || 0);
            }, 0);
            med.batches = batches;
            med.totalQuantity = totalQty;
          }
          return next;
        });
      } catch (e) {
        console.warn('[AppSimple] local-sale failed:', e);
      }
    };
    window.addEventListener('local-sale', handler as any);
    
    const refreshHandler = async () => {
      if (!currentUser?.pharmacyId) return;
      try {
        const services = await loadFirebaseAsync();
        if (services?.medicineService) {
          const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
          setMedicines(updated || []);
        }
      } catch (e) {
        console.warn('[AppSimple] refresh-medicines failed:', e);
      }
    };
    window.addEventListener('refresh-medicines', refreshHandler);

    return () => {
      window.removeEventListener('local-sale', handler as any);
      window.removeEventListener('refresh-medicines', refreshHandler);
    };
  }, [currentUser?.pharmacyId]);

  // Load Firebase data in background (after UI renders)
  useEffect(() => {
    if (!currentUser?.pharmacyId) return;
    const syncFirebaseData = async () => {
      try {
        const services = await loadFirebaseAsync();
        if (!services || !services.medicineService) {
          setFirebaseReady(false);
          return;
        }

        const firebaseMedicines = await services.medicineService.getMedicines(currentUser.pharmacyId);
        const uniqueMedicines = Array.from(
          new Map((firebaseMedicines || []).map(m => [m.id, m])).values()
        );
        
        const firebaseCategories = await services.categoryService.getCategories(currentUser.pharmacyId);
        
        setMedicines(uniqueMedicines);
        setCategories(firebaseCategories || []);
        setFirebaseReady(true);
      } catch (error) {
        console.warn('[AppSimple] Firebase sync failed:', error);
        setFirebaseReady(false);
      }
    };
    syncFirebaseData();
  }, [currentUser?.pharmacyId]);

  const handleLogin = (profile: UserProfile) => {
    setCurrentUser(profile);
    setActivePage('dashboard');
    
    // Update settings with pharmacy name
    if (profile.pharmacyName) {
      setSettings(prev => ({ ...prev, pharmacyName: profile.pharmacyName || prev.pharmacyName }));
    }

    try {
      sessionStorage.removeItem(`pharmacy_low_toasts_shown_${profile.uid}`);
    } catch {}
    (async () => {
      try {
        await auditService.logAction(profile.pharmacyId, {
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'LOGIN',
          entityType: 'auth',
          entityName: 'User Login',
          details: {},
        });
      } catch (e) {}
    })();
  };

  const handleLogoutAction = async () => {
    const user = currentUser;
    if (user) {
      try {
        await auditService.logAction(user.pharmacyId, {
          userId: user.uid,
          userName: user.name,
          userRole: user.role,
          action: 'LOGOUT',
          entityType: 'auth',
          entityName: 'User Logout',
          details: {},
        });
      } catch (e) {}
    }
    await userService.signOut();
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    handleLogoutAction();
  };

  const handleAddCategory = (newCategory: string) => {
    if (!currentUser?.pharmacyId) return;
    if (!categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory]);
      // Also save to Firebase if available
      (async () => {
        try {
          const services = await loadFirebaseAsync();
          if (services?.categoryService) {
            await services.categoryService.addCategory(currentUser.pharmacyId, newCategory);
          }
        } catch (e) {
          console.warn('[AppSimple] Failed to add category to Firebase:', e);
        }
      })();
    }
  };
  const handleDeleteCategory = (categoryName: string) => {
    if (!currentUser?.pharmacyId) return;
    setCategories(prev => prev.filter(c => c !== categoryName));
    // Also delete from Firebase if available
    (async () => {
      try {
        const services = await loadFirebaseAsync();
        if (services?.categoryService) {
          await services.categoryService.deleteCategoryByName(currentUser.pharmacyId, categoryName);
        }
      } catch (e) {
        console.warn('[AppSimple] Failed to delete category from Firebase:', e);
      }
    })();
  };

  const handleAddMedicine = async (medicineData: any) => {
    if (!currentUser?.pharmacyId) return;
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        const categoryObj = categories.find(c => c.name === medicineData.category);
        if (!categoryObj) throw new Error('Category not found');

        const medicineId = await services.medicineService.addMedicine(
          currentUser.pharmacyId,
          categoryObj.id,
          medicineData
        );
        
        const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
        setMedicines(updated || []);
        
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'ADD',
          entityType: 'medicine',
          entityName: medicineData.name,
          details: { id: medicineId, ...medicineData }
        });
      }
    } catch (error: any) {
      console.error('Error adding medicine:', error);
    }
  };

  const handleAddBatch = async (medicineId: string, batchData: any) => {
    if (!currentUser?.pharmacyId) return;
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        const medicine = medicines.find(m => m.id === medicineId);
        if (!medicine) throw new Error('Medicine not found');

        await services.medicineService.addBatch(
          currentUser.pharmacyId,
          medicine.categoryId,
          medicineId,
          batchData
        );
        
        const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
        setMedicines(updated || []);
        
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'ADD_BATCH',
          entityType: 'medicine',
          entityName: medicine.name,
          details: { medicineId, ...batchData }
        });
      }
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error('Failed to add batch');
    }
  };

  const handleUpdateBatch = async (medicineId: string, batchId: string, batchData: any) => {
    if (!currentUser?.pharmacyId) return;
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        const medicine = medicines.find(m => m.id === medicineId);
        if (!medicine) throw new Error('Medicine not found');

        await services.medicineService.updateBatch(
          currentUser.pharmacyId,
          medicine.categoryId,
          medicineId,
          batchId,
          batchData
        );
        
        const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
        setMedicines(updated || []);
        
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'UPDATE_BATCH',
          entityType: 'medicine',
          entityName: medicine.name,
          details: { medicineId, batchId, ...batchData }
        });
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      toast.error('Failed to update batch');
    }
  };

  const handleDeleteBatch = async (medicineId: string, batchId: string) => {
    if (!currentUser?.pharmacyId) return;
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        const medicine = medicines.find(m => m.id === medicineId);
        if (!medicine) throw new Error('Medicine not found');

        await services.medicineService.deleteBatch(
          currentUser.pharmacyId,
          medicine.categoryId,
          medicineId,
          batchId
        );
        
        const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
        setMedicines(updated || []);
        
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'DELETE_BATCH',
          entityType: 'medicine',
          entityName: medicine.name,
          details: { medicineId, batchId }
        });
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  };

  const handleUpdateMedicine = async (id: string, medicineData: any) => {
    if (!currentUser?.pharmacyId) return;
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        const medicine = medicines.find(m => m.id === id);
        if (!medicine) throw new Error('Medicine not found');

        await services.medicineService.updateMedicine(
          currentUser.pharmacyId,
          medicine.categoryId,
          id,
          medicineData
        );
        
        const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
        setMedicines(updated || []);
        
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'UPDATE',
          entityType: 'medicine',
          entityName: medicine.name,
          details: { id, ...medicineData }
        });
      }
    } catch (error: any) {
      console.error('Error updating medicine:', error);
    }
  };

  const performDeleteMedicine = async (id: string) => {
    if (!currentUser?.pharmacyId) return;
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        const medicine = medicines.find(m => m.id === id);
        if (!medicine) throw new Error('Medicine not found');

        await services.medicineService.deleteMedicine(
          currentUser.pharmacyId,
          medicine.categoryId,
          id
        );
        
        const updated = await services.medicineService.getMedicines(currentUser.pharmacyId);
        setMedicines(updated || []);
        
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'DELETE',
          entityType: 'medicine',
          entityName: medicine.name,
          details: { id }
        });
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
    }
  };

  const handleDeleteMedicine = async (id: string, batchId?: string) => {
    if (batchId) {
      const medicine = medicines.find(m => m.id === id);
      if (!medicine) return;

      // Handle legacy single batch case
      if ((!medicine.batches || medicine.batches.length === 0) && batchId === `${id}-single`) {
        await performDeleteMedicine(id);
        return;
      }

      // Handle specific batch deletion
      const currentBatches = medicine.batches || [];
      const newBatches = currentBatches.filter((b: any) => b.batchId !== batchId);
      
      // If no batches left, update quantity to 0 but keep medicine
      const newQty = newBatches.reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0);
      
      const updated = {
        ...medicine,
        totalQuantity: newQty,
        batches: newBatches
      };

      setMedicines(prev => prev.map(m => m.id === id ? updated : m));

      // Audit log for batch deletion
      (async () => {
        try {
          await auditService.logAction({
            userId: currentUser?.uid || 'unknown',
            userName: currentUser?.name || 'Unknown User',
            userRole: currentUser?.role || 'unknown',
            action: 'MEDICINE_BATCH_DELETE',
            entityType: 'medicine',
            entityId: id,
            entityName: medicine.name,
            details: { deletedBatchId: batchId, remainingQty: newQty }
          });
        } catch (e) {}
      })();

      // Firebase update
      if (firebaseReady) {
        try {
          const services = await loadFirebaseAsync();
          if (services?.medicineService) {
            await services.medicineService.updateMedicine(id, updated);
          }
        } catch (error) {
          console.error('[AppSimple] Failed to update medicine batches in Firebase:', error);
        }
      }
    } else {
      await performDeleteMedicine(id);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        if (currentUser?.role === 'staff') {
          return (
            <StaffDashboard
              medicines={medicines}
              currentUser={currentUser}
            />
          );
        }
        return (
          <Dashboard
            medicines={medicines}
            categories={categories}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            currentUser={currentUser}
            onNavigateToTab={setActivePage}
          />
        );
      case 'inventory':
        return (
          <Inventory
            medicines={medicines}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            onAddBatch={handleAddBatch}
            onUpdateBatch={handleUpdateBatch}
            onDeleteBatch={handleDeleteBatch}
            currentUser={currentUser}
          />
        );
      case 'customers':
        return <Customers />;
      case 'reports':
        return <Reports medicines={medicines} currentUser={currentUser} />;
      case 'notifications':
        return <Notifications medicines={medicines} onNavigateToTab={setActivePage} />;
      case 'settings':
        return (
          <Settings
            userRole={currentUser?.role}
            onNavigateToTab={setActivePage}
            settings={settings}
            onUpdateSettings={setSettings}
            currentUser={currentUser}
            medicines={medicines}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'analytics':
        if (currentUser?.role !== 'manager') {
          return <div className="p-6">Unauthorized</div>;
        }
        return <Analytics medicines={medicines} categories={categories} currentUser={currentUser} />;
      case 'orders':
        return <OrdersSuppliers />;
      case 'activity':
        return <AuditLog currentUser={currentUser} />;
      case 'receipts':
        if (currentUser?.role !== 'staff') {
          return <div className="p-6">Unauthorized</div>;
        }
        return <SalesPOS medicines={medicines} currentUser={currentUser} />;
      default:
        if (currentUser?.role === 'staff') {
          return <StaffDashboard medicines={medicines} currentUser={currentUser} />;
        }
        return (
          <Dashboard
            medicines={medicines}
            categories={categories}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            currentUser={currentUser}
            onNavigateToTab={setActivePage}
          />
        );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} pharmacyName={settings.pharmacyName} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userRole={currentUser.role}
        userName={currentUser.name}
        onLogout={handleLogout}
        pharmacyName={settings.pharmacyName}
        logoUrl={pharmacyLogo}
        sidebarColor={sidebarColor}
      />
      <main 
        className="lg:ml-64 min-h-screen flex flex-col transition-colors duration-500"
        style={contentColor ? { backgroundColor: `${contentColor}20` } : {}} // 20 is hex for ~12% opacity for a more visible tint
      >
        <div className="p-6 flex-1">
          <Toaster richColors position="top-right" />
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default AppSimple;
