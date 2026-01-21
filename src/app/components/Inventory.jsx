import { useState, useMemo } from 'react';
import { Search, Package, Plus, X, ChevronRight, Trash2 } from 'lucide-react';
import { MedicineCard } from './MedicineCard';
import { MedicineForm } from './MedicineForm';
 
export function Inventory({ medicines = [], categories = [], onAddCategory, onDeleteCategory, onAddMedicine, onUpdateMedicine, onDeleteMedicine, currentUser }) {
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'categories'
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(undefined);
  const [showMedicineForm, setShowMedicineForm] = useState(false);
 
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
 
  const filteredMedicines = useMemo(() => {
    if (viewMode !== 'all') return [];
    return safeMedicines.filter(m =>
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeMedicines, searchTerm, viewMode]);
 
  const categoryStats = useMemo(() => {
    const stats = new Map();
    safeCategories.forEach(cat => {
      stats.set(cat, { count: 0, totalValue: 0, lowStock: 0, items: [] });
    });
    safeMedicines.forEach(med => {
      const category = med.category || 'Uncategorized';
      if (!stats.has(category)) {
        stats.set(category, { count: 0, totalValue: 0, lowStock: 0, items: [] });
      }
      const cat = stats.get(category);
      cat.count += (med.quantity || 0);
      cat.totalValue += (med.quantity || 0) * (med.price || 0);
      cat.items.push(med);
      if ((med.quantity || 0) <= (med.minStockLevel || 0)) {
        cat.lowStock += 1;
      }
    });
    return Array.from(stats.entries()).map(([name, data]) => ({
      name,
      ...data,
      itemCount: data.items.length
    }));
  }, [safeMedicines, safeCategories]);
 
  const handleAddCategory = (e) => {
    e.preventDefault();
    const value = newCategory.trim();
    if (value) {
      onAddCategory?.(value);
      setNewCategory('');
      setShowAddForm(false);
    }
  };
  const handleEditClick = (medicine) => {
    setEditingMedicine(medicine);
    setShowMedicineForm(true);
  };
  const handleCloseMedicineForm = () => {
    setShowMedicineForm(false);
    setEditingMedicine(undefined);
  };
  const handleSubmitMedicine = (data) => {
    if (editingMedicine) {
      onUpdateMedicine?.(editingMedicine.id, data);
    } else {
      onAddMedicine?.(data);
    }
    handleCloseMedicineForm();
  };
 
  if (viewMode === 'categories' && selectedCategory) {
    const categoryData = categoryStats.find(c => c.name === selectedCategory);
    return (
      <div>
        <div className="mb-6 flex items-center gap-2">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            Categories
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900">{selectedCategory}</h1>
        </div>
        {categoryData?.items && categoryData.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categoryData.items.map(medicine => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                onEdit={handleEditClick}
                onDelete={(id) => onDeleteMedicine?.(id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No products in this category</p>
            <button 
              onClick={() => setSelectedCategory(null)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Categories
            </button>
          </div>
        )}
      </div>
    );
  }
 
  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventory</h1>
          <p className="text-muted-foreground">Browse all medicines or view by category</p>
        </div>
        {viewMode === 'categories' ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        ) : (
          <button
            onClick={() => {
              setEditingMedicine(undefined);
              setShowMedicineForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Medicine
          </button>
        )}
      </div>
 
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              All Medicines
            </button>
            <button
              onClick={() => setViewMode('categories')}
              className={`px-4 py-2 border-l ${viewMode === 'categories' ? 'bg-blue-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              Categories
            </button>
          </div>
 
          {viewMode === 'all' && (
            <div className="flex-1 relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              />
            </div>
          )}
        </div>
      </div>
 
      {viewMode === 'all' ? (
        filteredMedicines.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No medicines found</p>
            <p className="text-muted-foreground text-sm mt-2">
              {searchTerm ? 'Try adjusting your search' : 'Add your first medicine to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground">NAME</th>
                  <th className="text-left py-2 text-muted-foreground">CATEGORY</th>
                  <th className="text-left py-2 text-muted-foreground">STOCK</th>
                  <th className="text-left py-2 text-muted-foreground">UNIT</th>
                  <th className="text-left py-2 text-muted-foreground">EXPIRY DATE</th>
                  <th className="text-left py-2 text-muted-foreground">OPERATIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map(m => {
                  const qty = m.quantity || 0;
                  const unit = m.unit || '';
                  const expiry = m.expiryDate || '';
                  const expired = expiry ? new Date(expiry) < new Date() : false;
                  return (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="py-2">{m.name}</td>
                      <td className="py-2">{m.category || 'Uncategorized'}</td>
                      <td className="py-2">{qty}</td>
                      <td className="py-2">{unit}</td>
                      <td className={`py-2 ${expired ? 'text-red-600' : ''}`}>
                        {expiry}
                        {expired && <span className="ml-2 text-red-600 font-semibold">EXPIRED</span>}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => handleEditClick(m)}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                            onClick={() => onDeleteMedicine?.(m.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map(category => (
              <div key={category.name} className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.itemCount} products</p>
                  </div>
                  <button
                    onClick={() => {
                      if (category.itemCount > 0) {
                        alert('Cannot delete a category that contains products. Remove or reassign products first.');
                        return;
                      }
                      if (confirm(`Delete category "${category.name}"?`)) {
                        onDeleteCategory?.(category.name);
                      }
                    }}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Stock:</span>
                    <span className="font-semibold text-card-foreground">{category.count} units</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold text-green-600">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(category.totalValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Low Stock Items:</span>
                    <span className={`font-semibold ${category.lowStock > 0 ? 'text-orange-600' : 'text-card-foreground'}`}>
                      {category.lowStock}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCategory(category.name)}
                  className="w-full mt-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-muted transition-colors font-medium"
                >
                  View Products
                </button>
              </div>
            ))}
          </div>
          {categoryStats.length === 0 && (
            <div className="bg-card rounded-lg border p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No categories yet</p>
              <p className="text-muted-foreground text-sm mt-2">Add medicines to create categories</p>
            </div>
          )}
        </>
      )}
 
      {showAddForm && viewMode === 'categories' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Category</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-muted text-card-foreground py-2 rounded-md hover:bg-muted transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showMedicineForm && (
        <MedicineForm
          medicine={editingMedicine}
          categories={categories}
          onSubmit={handleSubmitMedicine}
          onClose={handleCloseMedicineForm}
        />
      )}
    </div>
  );
}
