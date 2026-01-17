import { useState, useEffect, Suspense } from 'react';
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
import { useMedicineStore } from '@/store/medicineStore';
import { medicineService } from '@/services/medicineService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

type CurrentUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
} | null;

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

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setAppError] = useState<string | null>(null);

  // Get store functions
  const { medicines, setMedicines, addMedicine, updateMedicine, deleteMedicine, setError } = useMedicineStore();

  console.log('[App] Render. State:', { initializing, authenticated: !!currentUser, error });

  // Load medicines from Firebase on component mount
  useEffect(() => {
    console.log('[App] Loading medicines...');
    const loadMedicines = async () => {
      try {
        const firebaseMedicines = await medicineService.getMedicines();
        console.log('[App] Got medicines from Firebase:', firebaseMedicines.length);
        if (firebaseMedicines.length === 0) {
          console.log('[App] No medicines found, populating with sample data...');
          // If no medicines exist, populate with sample data
          for (const medicine of initialMedicines) {
            await medicineService.addMedicine(medicine);
          }
          const populatedMedicines = await medicineService.getMedicines();
          setMedicines(populatedMedicines);
        } else {
          setMedicines(firebaseMedicines);
        }
      } catch (error) {
        console.error('[App] Failed to load medicines from Firebase:', error);
        // Fallback to local initial data if Firebase fails
        console.log('[App] Using fallback data');
        setMedicines(initialMedicines);
      }
    };

    // Only load medicines if not already loading
    loadMedicines();
  }, [setMedicines]);

  // Listen to auth state changes
  useEffect(() => {
    console.log('[App] Setting up Firebase auth listener...');
    
    // Set a timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      console.warn('[App] Auth initialization timeout (3s), showing login');
      if (initializing) {
        setInitializing(false);
      }
    }, 3000);

    try {
      const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
        console.log('[App] Auth state changed:', { hasUser: !!user, email: user?.email });
        if (user) {
          console.log('[App] User authenticated:', user.email);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'User',
            role: 'pharmacy_staff'
          });
        }
        setInitializing(false);
        clearTimeout(authTimeout);
      });

      return () => {
        console.log('[App] Cleaning up auth listener');
        unsubscribe();
        clearTimeout(authTimeout);
      };
    } catch (err) {
      console.error('[App] Auth setup error:', err);
      setAppError(String(err));
      setInitializing(false);
      clearTimeout(authTimeout);
    }
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
    try {
      const id = await medicineService.addMedicine(medicineData);
      addMedicine({
        ...medicineData,
        id
      });
    } catch (error) {
      console.error('Failed to add medicine:', error);
      setError('Failed to add medicine');
    }
  };

  const handleUpdateMedicine = async (id: string, medicineData: any) => {
    try {
      await medicineService.updateMedicine(id, medicineData);
      updateMedicine(id, {
        ...medicineData,
        id
      });
    } catch (error) {
      console.error('Failed to update medicine:', error);
      setError('Failed to update medicine');
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      try {
        await medicineService.deleteMedicine(id);
        deleteMedicine(id);
      } catch (error) {
        console.error('Failed to delete medicine:', error);
        setError('Failed to delete medicine');
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

  // Show error state if there's an error
  if (error) {
    console.log('[App] Showing error state');
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error Loading Application</h1>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setAppError(null);
              window.location.reload();
            }}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!currentUser) {
    console.log('[App] Showing login/loading screen. Initializing:', initializing);
    if (initializing) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Initializing...</h2>
            <p className="text-blue-700">Setting up Pharmacy System</p>
          </div>
        </div>
      );
    }
    console.log('[App] Rendering Login component');
    return <Login onLogin={handleLogin} />;
  }

  console.log('[App] Rendering main dashboard');

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

export default App;
