import { useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Dashboard } from '@/app/components/Dashboard';
import { Categories } from '@/app/components/Categories';
import { SalesPOS } from '@/app/components/SalesPOS';
import { Customers } from '@/app/components/Customers';
import { Reports } from '@/app/components/Reports';
import { Notifications } from '@/app/components/Notifications';
import { Settings } from '@/app/components/Settings';

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
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [medicines, setMedicines] = useState(initialMedicines);

  const handleAddMedicine = (medicineData) => {
    const newMedicine = {
      ...medicineData,
      id: Date.now().toString()
    };
    setMedicines(prev => [...prev, newMedicine]);
  };

  const handleUpdateMedicine = (id, medicineData) => {
    setMedicines(prev =>
      prev.map(m => m.id === id ? { ...medicineData, id } : m)
    );
  };

  const handleDeleteMedicine = (id) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      setMedicines(prev => prev.filter(m => m.id !== id));
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
          />
        );
      case 'categories':
        return <Categories medicines={medicines} />;
      case 'sales':
        return <SalesPOS medicines={medicines} />;
      case 'customers':
        return <Customers />;
      case 'reports':
        return <Reports medicines={medicines} />;
      case 'notifications':
        return <Notifications medicines={medicines} />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard
            medicines={medicines}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="lg:ml-64 p-6">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
