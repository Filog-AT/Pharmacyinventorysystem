import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { Reports } from './components/Reports';
import { Receipts } from './components/Receipts';
import { SalesPOS } from './components/SalesPOS';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrdersSuppliers } from './components/OrdersSuppliers';
import { useMedicineStore } from '@/store/medicineStore';
import { medicineService } from '@/services/medicineService';
import { categoryService } from '@/services/categoryService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

type CurrentUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
} | null;

// Sample data removed to avoid structure mismatch with the new batch system.
const initialMedicines: any[] = [];

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setAppError] = useState<string | null>(null);
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

  // Load categories from Firestore on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const firebaseCategories = await categoryService.getCategories();
        if (firebaseCategories.length === 0) {
          const defaults = [
            'Antibiotic','Painkiller','Antiviral','Antihistamine','Cardiovascular','Diabetes','Respiratory','Gastrointestinal','Dermatological','Vitamins & Supplements'
          ];
          for (const name of defaults) {
            try { await categoryService.addCategory(name); } catch {}
          }
          const populated = await categoryService.getCategories();
          setCategories(populated.map(c => c.name));
        } else {
          setCategories(firebaseCategories.map(c => c.name));
        }
      } catch (e) {
        console.warn('[App] Failed to load categories from Firestore:', e);
        // keep default local categories
      }
    };
    loadCategories();
  }, []);

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
        setMedicines(firebaseMedicines);
      } catch (error) {
        console.error('[App] Failed to load medicines from Firebase:', error);
        setError('Failed to load medicines from Firebase');
      }
    };

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
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      setCurrentUser(null);
      setActivePage('dashboard');
    }
  };

  const handleAddCategory = async (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      try {
        await categoryService.addCategory(newCategory);
        setCategories(prev => [...prev, newCategory]);
      } catch (e) {
        console.error('Failed to add category:', e);
      }
    }
  };
  const handleDeleteCategory = async (categoryName: string) => {
    try {
      await categoryService.deleteCategoryByName(categoryName);
      setCategories(prev => prev.filter(c => c !== categoryName));
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  };

  const handleAddMedicine = async (medicineData: any) => {
    try {
      const id = await medicineService.addMedicine(medicineData);
      // Fetch full medicine with calculated totalQuantity
      const medicines = await medicineService.getMedicines();
      setMedicines(medicines);
    } catch (error: any) {
      console.error('Failed to add medicine:', error);
      alert(error.message || 'Failed to add medicine');
      setError('Failed to add medicine');
    }
  };

  const handleUpdateMedicine = async (id: string, medicineData: any) => {
    try {
      await medicineService.updateMedicine(id, medicineData);
      const updatedMedicines = await medicineService.getMedicines();
      setMedicines(updatedMedicines);
    } catch (error) {
      console.error('Failed to update medicine:', error);
      setError('Failed to update medicine');
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (confirm('Are you sure you want to delete this medicine? All batch data will be lost.')) {
      try {
        await medicineService.deleteMedicine(id);
        deleteMedicine(id);
      } catch (error) {
        console.error('Failed to delete medicine:', error);
        setError('Failed to delete medicine');
      }
    }
  };

  const handleAddBatch = async (medicineId: string, batchData: any) => {
    try {
      await medicineService.addBatch(medicineId, batchData);
      const updatedMedicines = await medicineService.getMedicines();
      setMedicines(updatedMedicines);
    } catch (error) {
      console.error('Failed to add batch:', error);
      setError('Failed to add batch');
    }
  };

  const handleUpdateBatch = async (medicineId: string, batchId: string, batchData: any) => {
    try {
      await medicineService.updateBatch(medicineId, batchId, batchData);
      const updatedMedicines = await medicineService.getMedicines();
      setMedicines(updatedMedicines);
    } catch (error) {
      console.error('Failed to update batch:', error);
      setError('Failed to update batch');
    }
  };

  const handleDeleteBatch = async (medicineId: string, batchId: string) => {
    try {
      await medicineService.deleteBatch(medicineId, batchId);
      const updatedMedicines = await medicineService.getMedicines();
      setMedicines(updatedMedicines);
    } catch (error) {
      console.error('Failed to delete batch:', error);
      setError('Failed to delete batch');
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
            onAddBatch={handleAddBatch}
            onUpdateBatch={handleUpdateBatch}
            onDeleteBatch={handleDeleteBatch}
            currentUser={currentUser}
          />
        );
      case 'customers':
        return <Customers />;
      case 'receipts':
        return (
          <SalesPOS
            medicines={medicines}
            currentUser={currentUser}
          />
        );
      case 'reports':
        return <Reports medicines={medicines} />;
      case 'notifications':
        return <Notifications medicines={medicines} />;
      case 'settings':
        return <Settings userRole={currentUser?.role} onNavigateToTab={setActivePage} />;
      case 'orders':
        return <OrdersSuppliers />;
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
        <ErrorBoundary>
          {renderPage()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
