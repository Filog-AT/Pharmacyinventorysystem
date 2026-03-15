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
import { Toaster } from '@/app/components/ui/sonner';

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

type CurrentUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
} | null;

function AppSimple() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);

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
  const [categories, setCategories] = useState([
    'Antibiotic',
    'Painkiller',
    'Antiviral',
    'Antihistamine',
    'Cardiovascular',
    'Diabetes',
    'Respiratory',
    'Gastrointestinal',
    'Dermatological',
    'Vitamins & Supplements'
  ]);
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
        if (confirm('Going back will sign you out. Continue?')) {
          handleLogoutAction();
        } else {
          // Re-push current state to prevent going back
          window.history.pushState(null, '', `#${activePage}`);
        }
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
    const syncCategories = async () => {
      try {
        const services = await loadFirebaseAsync();
        if (!services || !services.categoryService) {
          console.log('[AppSimple] Category service not available, using defaults');
          return;
        }
        const firebaseCategories = await services.categoryService.getCategories();
        if (firebaseCategories && firebaseCategories.length > 0) {
          setCategories(firebaseCategories.map((c: any) => c.name));
        } else {
          const defaults = [
            'Antibiotic','Painkiller','Antiviral','Antihistamine','Cardiovascular','Diabetes','Respiratory','Gastrointestinal','Dermatological','Vitamins & Supplements'
          ];
          for (const name of defaults) {
            try { await services.categoryService.addCategory(name); } catch {}
          }
          const populated = await services.categoryService.getCategories();
          setCategories(populated.map((c: any) => c.name));
        }
      } catch (error) {
        console.warn('[AppSimple] Failed to sync categories:', error);
      }
    };
    const timer = setTimeout(syncCategories, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = async () => {
      try {
        const services = await loadFirebaseAsync();
        if (services?.medicineService) {
          const updated = await services.medicineService.getMedicines();
          setMedicines(updated);
        }
      } catch (e) {
        console.warn('[AppSimple] refresh-medicines failed:', e);
      }
    };
    window.addEventListener('refresh-medicines', handler as any);
    return () => window.removeEventListener('refresh-medicines', handler as any);
  }, []);

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
    return () => window.removeEventListener('local-sale', handler as any);
  }, []);

  // Load Firebase data in background (after UI renders)
  useEffect(() => {
    const syncFirebaseData = async () => {
      try {
        const services = await loadFirebaseAsync();
        if (!services || !services.medicineService) {
          console.log('[AppSimple] Using local-only mode');
          setFirebaseReady(false);
          return;
        }

        console.log('[AppSimple] Syncing with Firebase...');
        const firebaseMedicines = await services.medicineService.getMedicines();
        console.log('[AppSimple] Firestore medicines received:', firebaseMedicines);
        
        // Always update from Firebase if successful, even if empty
        console.log('[AppSimple] Updated from Firebase:', (firebaseMedicines || []).length, 'medicines');
        
        // Deduplicate based on ID just in case
        const uniqueMedicines = Array.from(
          new Map((firebaseMedicines || []).map(m => [m.id, m])).values()
        );
        
        setMedicines(uniqueMedicines);
        setFirebaseReady(true);
      } catch (error) {
        console.warn('[AppSimple] Firebase sync failed, using local data:', error);
        setFirebaseReady(false);
      }
    };

    // Delay Firebase sync to let UI render first
    const timer = setTimeout(syncFirebaseData, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: any) => {
    // Ensure user has all required properties
    const appUser: CurrentUser = {
      uid: user.uid || user.username || 'mock-uid',
      email: user.email || (user.username ? `${user.username}@example.com` : null),
      name: user.name,
      role: user.role
    };
    setCurrentUser(appUser);
    setActivePage('dashboard');
    try {
      sessionStorage.removeItem(`pharmacy_low_toasts_shown_${appUser.uid}`);
    } catch {}
    (async () => {
      try {
        await auditService.logAction({
          userId: appUser?.uid || 'unknown',
          userName: appUser?.name || 'Unknown User',
          userRole: appUser?.role || 'unknown',
          action: 'LOGIN',
          entityType: 'auth',
          entityName: 'User Login',
          details: {},
        });
      } catch (e) {
        console.warn('[AppSimple] Failed to log login:', e);
      }
    })();
  };

  const handleLogoutAction = () => {
    const user = currentUser;
    (async () => {
      try {
        await auditService.logAction({
          userId: user?.uid || 'unknown',
          userName: user?.name || 'Unknown User',
          userRole: user?.role || 'unknown',
          action: 'LOGOUT',
          entityType: 'auth',
          entityName: 'User Logout',
          details: {},
        });
      } catch (e) {
        console.warn('[AppSimple] Failed to log logout:', e);
      }
    })();
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      handleLogoutAction();
    }
  };

  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory]);
      // Also save to Firebase if available
      (async () => {
        try {
          const services = await loadFirebaseAsync();
          if (services?.categoryService) {
            await services.categoryService.addCategory(newCategory);
          }
        } catch (e) {
          console.warn('[AppSimple] Failed to add category to Firebase:', e);
        }
      })();
    }
  };
  const handleDeleteCategory = (categoryName: string) => {
    setCategories(prev => prev.filter(c => c !== categoryName));
    // Also delete from Firebase if available
    (async () => {
      try {
        const services = await loadFirebaseAsync();
        if (services?.categoryService) {
          await services.categoryService.deleteCategoryByName(categoryName);
        }
      } catch (e) {
        console.warn('[AppSimple] Failed to delete category from Firebase:', e);
      }
    })();
  };

  const handleAddMedicine = async (medicineData: any) => {
    const baseId = Date.now().toString();
    const normName = (medicineData.name || '').trim().toLowerCase();
    const normForm = (medicineData.dosageForm || '').trim().toLowerCase();
    const normStrength = String(medicineData.strength || '').replace(/\s+/g, '').toLowerCase();

    const existing = medicines.find(m =>
      (m.name || '').trim().toLowerCase() === normName &&
      (m.dosageForm || '').trim().toLowerCase() === normForm &&
      String(m.strength || '').replace(/\s+/g, '').toLowerCase() === normStrength
    );

    const buildBatchPayload = (payload: any) => {
      const unit = payload.unit || 'units';
      const isBoxes = unit === 'boxes';
      const qty = Number(payload.quantity || 0);
      const blisters = Number(payload.blisterCount || 1);
      const perBlister = Number(payload.tabletCount || 1);
      // Normalize to boxes/blisters/units triple
      const boxesReceived = isBoxes ? qty : 1;
      const blistersPerBox = isBoxes ? blisters : 1;
      const unitsPerBlister = isBoxes ? perBlister : qty;
      return {
        batchNumber: `BN-${baseId.slice(-6)}`,
        expiryDate: payload.expiryDate || '',
        supplier: payload.supplier || '',
        boxesReceived,
        blistersPerBox,
        unitsPerBlister,
      };
    };

    if (existing) {
      const batchData = buildBatchPayload(medicineData);
      await handleAddBatch(existing.id, batchData);
      return;
    }

    // Create new medicine with initial batch aligned to batch schema
    const batchData = buildBatchPayload(medicineData);
    const totalUnits = Number(batchData.boxesReceived || 0) * Number(batchData.blistersPerBox || 1) * Number(batchData.unitsPerBlister || 1);
    const initialBatch = {
      ...batchData,
      id: `bn-${baseId}`,
      quantity: totalUnits,
      initialQuantity: totalUnits,
      createdAt: new Date().toISOString(),
    };

    const newMedicine = {
      ...medicineData,
      id: baseId,
      name: (medicineData.name || '').trim(),
      totalQuantity: totalUnits,
      unit: medicineData.subUnitType || medicineData.unit || 'units',
      batches: [initialBatch]
    };
    setMedicines(prev => [...prev, newMedicine]);
    (async () => {
      try {
        await auditService.logAction({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'MEDICINE_ADD',
          entityType: 'medicine',
          entityId: newMedicine.id,
          entityName: newMedicine.name,
          details: newMedicine,
        });
      } catch (e) {}
    })();
    if (firebaseReady) {
      try {
        const services = await loadFirebaseAsync();
        if (services?.medicineService) {
          const { id, ...dataWithoutId } = newMedicine;
          const firebaseId = await services.medicineService.addMedicine(dataWithoutId);
          setMedicines(prev => prev.map(m => m.id === newMedicine.id ? { ...m, id: firebaseId } : m));
        }
      } catch {}
    }
  };

  const handleAddBatch = async (medicineId: string, batchData: any) => {
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        await services.medicineService.addBatch(medicineId, batchData);
        // Refresh medicines
        const updatedMedicines = await services.medicineService.getMedicines();
        setMedicines(updatedMedicines);
      }
    } catch (error) {
      console.error('[AppSimple] Failed to add batch:', error);
    }
  };

  const handleUpdateBatch = async (medicineId: string, batchId: string, batchData: any) => {
    try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        await services.medicineService.updateBatch(medicineId, batchId, batchData);
        // Refresh medicines
        const updatedMedicines = await services.medicineService.getMedicines();
        setMedicines(updatedMedicines);
      }
    } catch (error) {
      console.error('[AppSimple] Failed to update batch:', error);
    }
  };

  const handleUpdateMedicine = async (id: string, medicineData: any) => {
    const updatedMedicine = { ...medicineData, id };
    setMedicines(prev =>
      prev.map(m => m.id === id ? updatedMedicine : m)
    );
    (async () => {
      try {
        await auditService.logAction({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'MEDICINE_EDIT',
          entityType: 'medicine',
          entityId: id,
          entityName: medicineData.name,
          details: updatedMedicine,
          changes: { before: medicines.find(m => m.id === id), after: updatedMedicine },
        });
      } catch (e) {
        console.warn('[AppSimple] Failed to log medicine edit:', e);
      }
    })();
    
    // Also update in Firebase if available
    if (firebaseReady) {
      try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
        await services.medicineService.updateMedicine(id, medicineData);
          console.log('[AppSimple] Medicine updated in Firebase:', id);
        }
      } catch (error) {
        console.error('[AppSimple] Failed to update medicine in Firebase:', error);
      }
    }
  };

  const performDeleteMedicine = async (id: string) => {
    const toDelete = medicines.find(m => m.id === id);
    setMedicines(prev => prev.filter(m => m.id !== id));
    (async () => {
      try {
        await auditService.logAction({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'MEDICINE_DELETE',
          entityType: 'medicine',
          entityId: id,
          entityName: toDelete?.name || 'Unknown',
          details: toDelete || {},
        });
      } catch (e) {
        console.warn('[AppSimple] Failed to log medicine delete:', e);
      }
    })();
    
    // Also delete from Firebase if available
    if (firebaseReady) {
      try {
        const services = await loadFirebaseAsync();
        if (services?.medicineService) {
          await services.medicineService.deleteMedicine(id);
          console.log('[AppSimple] Medicine deleted from Firebase:', id);
        }
      } catch (error) {
        console.error('[AppSimple] Failed to delete medicine from Firebase:', error);
      }
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
            onDeleteBatch={handleDeleteMedicine}
            currentUser={currentUser}
          />
        );
      case 'customers':
        return <Customers />;
      case 'reports':
        return <Reports medicines={medicines} />;
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
          />
        );
      case 'analytics':
        if (currentUser?.role !== 'manager') {
          return <div className="p-6">Unauthorized</div>;
        }
        return <Analytics medicines={medicines} categories={categories} />;
      case 'orders':
        return <OrdersSuppliers />;
      case 'activity':
        return <AuditLog />;
      case 'receipts':
        if (currentUser?.role !== 'staff') {
          return <div className="p-6">Unauthorized</div>;
        }
        return <Receipts medicines={medicines} currentUser={currentUser} />;
      default:
        if (currentUser?.role === 'staff') {
          return <StaffDashboard medicines={medicines} />;
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

  // Show login page if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} pharmacyName={settings.pharmacyName} />;
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
      />
      <main className="lg:ml-64 min-h-screen flex flex-col">
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
