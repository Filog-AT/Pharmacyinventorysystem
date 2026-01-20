import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { Reports } from './components/Reports';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrdersSuppliers } from './components/OrdersSuppliers';
import { AuditLog } from './components/AuditLog';
import { auditService } from '@/services/auditService';

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

// Sample data
const initialMedicines = [
  {
    id: '1',
    name: 'Amoxicillin',
    category: 'Antibiotic',
    quantity: 150,
    unit: 'tablets',
    minStockLevel: 50,
    expiryDate: '2026-08-15',
    supplier: 'PharmaCorp',
    price: 12.99
  },
  {
    id: '2',
    name: 'Ibuprofen',
    category: 'Painkiller',
    quantity: 25,
    unit: 'bottles',
    minStockLevel: 30,
    expiryDate: '2025-12-20',
    supplier: 'MediSupply Inc',
    price: 8.50
  },
  {
    id: '3',
    name: 'Lisinopril',
    category: 'Cardiovascular',
    quantity: 200,
    unit: 'tablets',
    minStockLevel: 100,
    expiryDate: '2026-03-10',
    supplier: 'HeartMed Solutions',
    price: 15.75
  },
  {
    id: '4',
    name: 'Metformin',
    category: 'Diabetes',
    quantity: 5,
    unit: 'boxes',
    minStockLevel: 20,
    expiryDate: '2026-01-25',
    supplier: 'DiabetesCare Ltd',
    price: 22.00
  },
  {
    id: '5',
    name: 'Cetirizine',
    category: 'Antihistamine',
    quantity: 80,
    unit: 'tablets',
    minStockLevel: 40,
    expiryDate: '2025-11-30',
    supplier: 'AllergyRelief Co',
    price: 9.25
  },
  {
    id: '6',
    name: 'Omeprazole',
    category: 'Gastrointestinal',
    quantity: 120,
    unit: 'capsules',
    minStockLevel: 60,
    expiryDate: '2026-06-18',
    supplier: 'GastroHealth',
    price: 18.50
  }
];

type CurrentUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
} | null;

function AppSimple() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [medicines, setMedicines] = useState(initialMedicines);
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
    'Vitamins & Supplements',
    'Other'
  ]);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_settings');
      return saved ? JSON.parse(saved) : { pharmacyName: 'PharmaCare', theme: 'Light', language: 'English' };
    } catch {
      return { pharmacyName: 'PharmaCare', theme: 'Light', language: 'English' };
    }
  });

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

  useEffect(() => {
    const root = document.documentElement;
    const lang = settings.language?.toLowerCase().startsWith('en')
      ? 'en'
      : settings.language?.toLowerCase().startsWith('span')
      ? 'es'
      : settings.language?.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en';
    root.setAttribute('lang', lang);
  }, [settings.language]);

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
            'Antibiotic','Painkiller','Antiviral','Antihistamine','Cardiovascular','Diabetes','Respiratory','Gastrointestinal','Dermatological','Vitamins & Supplements','Other'
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
        
        if (firebaseMedicines && firebaseMedicines.length > 0) {
          console.log('[AppSimple] Updated from Firebase:', firebaseMedicines.length, 'medicines');
          setMedicines(firebaseMedicines);
        } else {
          console.log('[AppSimple] Populating Firebase with sample data...');
          for (const medicine of initialMedicines) {
            try {
              await services.medicineService.addMedicine(medicine);
            } catch (e) {
              console.warn('[AppSimple] Could not add medicine to Firebase:', e);
            }
          }
        }
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
    setActivePage(appUser?.role === 'manager' ? 'dashboard' : 'inventory');
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

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
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
    const newMedicine = {
      ...medicineData,
      id: Date.now().toString()
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
      } catch (e) {
        console.warn('[AppSimple] Failed to log medicine add:', e);
      }
    })();
    
    // Also save to Firebase if available
    if (firebaseReady) {
      try {
      const services = await loadFirebaseAsync();
      if (services?.medicineService) {
          // Firebase will generate the ID, so don't pass it
          const { id, ...dataWithoutId } = newMedicine;
        const firebaseId = await services.medicineService.addMedicine(dataWithoutId);
          console.log('[AppSimple] Medicine added to Firebase:', firebaseId);
          // Update local state with Firebase ID
          setMedicines(prev => prev.map(m => m.id === newMedicine.id ? { ...m, id: firebaseId } : m));
        }
      } catch (error) {
        console.error('[AppSimple] Failed to add medicine to Firebase:', error);
      }
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

  const handleDeleteMedicine = async (id: string) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
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
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            medicines={medicines}
            categories={categories}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            currentUser={currentUser}
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
            currentUser={currentUser}
          />
        );
      case 'customers':
        return <Customers />;
      case 'reports':
        return <Reports medicines={medicines} />;
      case 'notifications':
        return <Notifications medicines={medicines} />;
      case 'settings':
        return (
          <Settings
            userRole={currentUser?.role}
            onNavigateToTab={setActivePage}
            settings={settings}
            onUpdateSettings={setSettings}
            currentUser={currentUser}
          />
        );
      case 'orders':
        return <OrdersSuppliers />;
      case 'activity':
        return <AuditLog />;
      default:
        return (
          <Dashboard
            medicines={medicines}
            categories={categories}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            currentUser={currentUser}
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
      <main className="lg:ml-64 p-6">
        <ErrorBoundary>
          {renderPage()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default AppSimple;
