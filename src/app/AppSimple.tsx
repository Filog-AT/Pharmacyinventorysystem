import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Categories } from './components/Categories';
import { SalesPOS } from './components/SalesPOS';
import { Customers } from './components/Customers';
import { Reports } from './components/Reports';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { AuditLog } from './components/AuditLog';

// Import Firebase services (will load async)
let medicineService: any = null;
let firebaseLoaded = false;

// Lazy load Firebase to avoid blocking render
const loadFirebaseAsync = async () => {
  if (firebaseLoaded) return medicineService;
  try {
    const module = await import('@/services/medicineService');
    medicineService = module.medicineService;
    firebaseLoaded = true;
    console.log('[AppSimple] Firebase services loaded');
    return medicineService;
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

  // Load Firebase data in background (after UI renders)
  useEffect(() => {
    const syncFirebaseData = async () => {
      try {
        const service = await loadFirebaseAsync();
        if (!service) {
          console.log('[AppSimple] Using local-only mode');
          setFirebaseReady(false);
          return;
        }

        console.log('[AppSimple] Syncing with Firebase...');
        const firebaseMedicines = await service.getMedicines();
        
        if (firebaseMedicines && firebaseMedicines.length > 0) {
          console.log('[AppSimple] Updated from Firebase:', firebaseMedicines.length, 'medicines');
          setMedicines(firebaseMedicines);
        } else {
          console.log('[AppSimple] Populating Firebase with sample data...');
          for (const medicine of initialMedicines) {
            try {
              await service.addMedicine(medicine);
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

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      setCurrentUser(null);
      setActivePage('dashboard');
    }
  };

  const handleAddMedicine = async (medicineData: any) => {
    const newMedicine = {
      ...medicineData,
      id: Date.now().toString()
    };
    setMedicines(prev => [...prev, newMedicine]);
    
    // Also save to Firebase if available
    if (firebaseReady) {
      try {
        const service = await loadFirebaseAsync();
        if (service) {
          // Firebase will generate the ID, so don't pass it
          const { id, ...dataWithoutId } = newMedicine;
          const firebaseId = await service.addMedicine(dataWithoutId);
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
    
    // Also update in Firebase if available
    if (firebaseReady) {
      try {
        const service = await loadFirebaseAsync();
        if (service) {
          await service.updateMedicine(id, medicineData);
          console.log('[AppSimple] Medicine updated in Firebase:', id);
        }
      } catch (error) {
        console.error('[AppSimple] Failed to update medicine in Firebase:', error);
      }
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      setMedicines(prev => prev.filter(m => m.id !== id));
      
      // Also delete from Firebase if available
      if (firebaseReady) {
        try {
          const service = await loadFirebaseAsync();
          if (service) {
            await service.deleteMedicine(id);
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
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            currentUser={currentUser}
          />
        );
      case 'categories':
        return <Categories medicines={medicines} />;
      case 'sales':
        return <SalesPOS medicines={medicines} currentUser={currentUser} />;
      case 'customers':
        return <Customers />;
      case 'reports':
        return <Reports medicines={medicines} />;
      case 'notifications':
        return <Notifications medicines={medicines} />;
      case 'settings':
        return <Settings userRole={currentUser?.role} onNavigateToTab={setActivePage} />;
      case 'user-management':
        return currentUser?.role === 'owner' ? <UserManagement currentUser={currentUser} /> : null;
      case 'audit-log':
        return currentUser?.role === 'owner' ? <AuditLog /> : null;
      default:
        return (
          <Dashboard
            medicines={medicines}
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
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userRole={currentUser.role}
        userName={currentUser.name}
        onLogout={handleLogout}
      />
      <main className="lg:ml-64 p-6">
        {renderPage()}
      </main>
    </div>
  );
}

export default AppSimple;
