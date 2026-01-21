import { useState, useMemo } from 'react';
import { Plus, Search, Package, AlertTriangle, Calendar, TrendingUp, XCircle } from 'lucide-react';
import { MedicineCard } from '@/app/components/MedicineCard';
import { MedicineForm } from '@/app/components/MedicineForm';
import { StatsCard } from '@/app/components/StatsCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { PrescriptiveRecommendations } from '@/app/components/PrescriptiveRecommendations';

export function Dashboard({ medicines = [], categories = [], onAddMedicine, onUpdateMedicine, onDeleteMedicine, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(undefined);

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  const allCategories = useMemo(() => {
    return ['All', ...safeCategories];
  }, [safeCategories]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(medicine => {
      const matchesSearch = (medicine.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (medicine.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || medicine.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    const totalMedicines = medicines.length;
    const lowStock = medicines.filter(m => m.quantity && m.minStockLevel && m.quantity <= m.minStockLevel).length;
    const expiringSoon = medicines.filter(m => {
      if (!m.expiryDate) return false;
      const today = new Date();
      const expiryDate = new Date(m.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    }).length;
    const expired = medicines.filter(m => {
      if (!m.expiryDate) return false;
      const today = new Date();
      const expiryDate = new Date(m.expiryDate);
      return expiryDate < today;
    }).length;
    const totalValue = medicines.reduce((sum, m) => sum + ((m.quantity || 0) * (m.price || 0)), 0);

    return { totalMedicines, lowStock, expiringSoon, expired, totalValue };
  }, [medicines]);

  const categoryStockData = useMemo(() => {
    const map = new Map();
    medicines.forEach(m => {
      const key = m.category || 'Uncategorized';
      const prev = map.get(key) || 0;
      map.set(key, prev + (m.quantity || 0));
    });
    return Array.from(map.entries()).map(([name, qty]) => ({ name, quantity: qty }));
  }, [medicines]);

  const handleAddMedicine = async (medicineData) => {
    onAddMedicine(medicineData);
    setShowForm(false);
  };

  const handleUpdateMedicine = async (medicineData) => {
    if (editingMedicine) {
      onUpdateMedicine(editingMedicine.id, medicineData);
      setEditingMedicine(undefined);
      setShowForm(false);
      
    }
  };

  const handleEditClick = (medicine) => {
    setEditingMedicine(medicine);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMedicine(undefined);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your pharmacy inventory</p>
      </div>
      
      {/* Search */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="Total Medicines"
          value={stats.totalMedicines}
          icon={Package}
          color="bg-blue-100 text-blue-800 border-blue-200"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={stats.lowStock}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-800 border-orange-200"
        />
        <StatsCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          icon={Calendar}
          color="bg-yellow-100 text-yellow-800 border-yellow-200"
        />
        <StatsCard
          title="Expired Medicines"
          value={stats.expired}
          icon={XCircle}
          color="bg-red-100 text-red-800 border-red-200"
        />
        <StatsCard
          title="Inventory Value"
          value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(stats.totalValue)}
          icon={TrendingUp}
          color="bg-green-100 text-green-800 border-green-200"
        />
      </div>

      {/* Prescriptive Recommendations */}
      <PrescriptiveRecommendations medicines={medicines} />

      {/* Controls */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
          >
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* Stock by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels by Category</h2>
          <ChartContainer
            config={{
              quantity: { label: 'Quantity', color: '#3b82f6' }
            }}
            className="aspect-[16/9]"
          >
            <ResponsiveContainer>
              <BarChart data={categoryStockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity, #3b82f6)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>

      {/* Medicine Grid */}
      {filteredMedicines.length === 0 ? (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No medicines found</p>
          <p className="text-muted-foreground text-sm mt-2">
            {searchTerm || filterCategory !== 'All' 
              ? 'Try adjusting your search or filters'
              : 'Add your first medicine to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMedicines.map(medicine => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              onEdit={handleEditClick}
              onDelete={async (id) => {
                onDeleteMedicine(id);
              }}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MedicineForm
          medicine={editingMedicine}
          categories={categories}
          onSubmit={editingMedicine ? handleUpdateMedicine : handleAddMedicine}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
