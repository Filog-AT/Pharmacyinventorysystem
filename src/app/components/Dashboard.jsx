import { useState, useMemo } from 'react';
import { Plus, Search, Package, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { MedicineCard } from '@/app/components/MedicineCard';
import { MedicineForm } from '@/app/components/MedicineForm';
import { StatsCard } from '@/app/components/StatsCard';
import { auditService } from '@/services/auditService';

export function Dashboard({ medicines, onAddMedicine, onUpdateMedicine, onDeleteMedicine, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(undefined);

  const categories = useMemo(() => {
    const cats = new Set(medicines.map(m => m.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(medicine => {
      const matchesSearch = (medicine.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (medicine.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || medicine.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    const totalItems = medicines.reduce((sum, m) => sum + (m.quantity || 0), 0);
    const lowStock = medicines.filter(m => m.quantity && m.minStockLevel && m.quantity <= m.minStockLevel).length;
    const expiringSoon = medicines.filter(m => {
      if (!m.expiryDate) return false;
      const today = new Date();
      const expiryDate = new Date(m.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    }).length;
    const totalValue = medicines.reduce((sum, m) => sum + ((m.quantity || 0) * (m.price || 0)), 0);

    return { totalItems, lowStock, expiringSoon, totalValue };
  }, [medicines]);

  const handleAddMedicine = async (medicineData) => {
    onAddMedicine(medicineData);
    setShowForm(false);
    
    // Log to audit trail
    try {
      await auditService.logAction({
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.name || 'Unknown User',
        userRole: currentUser?.role || 'unknown',
        action: 'MEDICINE_ADD',
        entityType: 'medicine',
        entityName: medicineData.name,
        details: medicineData,
      });
    } catch (error) {
      console.error('[Dashboard] Failed to log medicine add:', error);
    }
  };

  const handleUpdateMedicine = async (medicineData) => {
    if (editingMedicine) {
      onUpdateMedicine(editingMedicine.id, medicineData);
      setEditingMedicine(undefined);
      setShowForm(false);
      
      // Log to audit trail
      try {
        await auditService.logAction({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.name || 'Unknown User',
          userRole: currentUser?.role || 'unknown',
          action: 'MEDICINE_EDIT',
          entityType: 'medicine',
          entityId: editingMedicine.id,
          entityName: medicineData.name,
          details: medicineData,
          changes: {
            before: editingMedicine,
            after: medicineData,
          },
        });
      } catch (error) {
        console.error('[Dashboard] Failed to log medicine edit:', error);
      }
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Items"
          value={stats.totalItems}
          icon={Package}
          color="bg-blue-100 text-blue-800 border-blue-200"
        />
        <StatsCard
          title="Low Stock Items"
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
          title="Inventory Value"
          value={`$${stats.totalValue.toFixed(2)}`}
          icon={TrendingUp}
          color="bg-green-100 text-green-800 border-green-200"
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search medicines or suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
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

      {/* Medicine Grid */}
      {filteredMedicines.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No medicines found</p>
          <p className="text-gray-400 text-sm mt-2">
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
                const medicineToDelete = medicines.find(m => m.id === id);
                if (medicineToDelete) {
                  onDeleteMedicine(id);
                  
                  // Log to audit trail
                  try {
                    await auditService.logAction({
                      userId: currentUser?.uid || 'unknown',
                      userName: currentUser?.name || 'Unknown User',
                      userRole: currentUser?.role || 'unknown',
                      action: 'MEDICINE_DELETE',
                      entityType: 'medicine',
                      entityId: id,
                      entityName: medicineToDelete.name,
                      details: medicineToDelete,
                    });
                  } catch (error) {
                    console.error('[Dashboard] Failed to log medicine delete:', error);
                  }
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MedicineForm
          medicine={editingMedicine}
          onSubmit={editingMedicine ? handleUpdateMedicine : handleAddMedicine}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
