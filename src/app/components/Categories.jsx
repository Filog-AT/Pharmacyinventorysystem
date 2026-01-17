import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

export function Categories({ medicines }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const categoryStats = useMemo(() => {
    const stats = new Map();
    
    medicines.forEach(med => {
      if (!stats.has(med.category)) {
        stats.set(med.category, { count: 0, totalValue: 0, lowStock: 0 });
      }
      const cat = stats.get(med.category);
      cat.count += med.quantity;
      cat.totalValue += med.quantity * med.price;
      if (med.quantity <= med.minStockLevel) {
        cat.lowStock += 1;
      }
    });

    return Array.from(stats.entries()).map(([name, data]) => ({
      name,
      ...data,
      items: medicines.filter(m => m.category === name).length
    }));
  }, [medicines]);

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (newCategory.trim()) {
      // In a real app, this would add to a categories list
      setNewCategory('');
      setShowAddForm(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
          <p className="text-gray-600">Manage product categories and organize inventory</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryStats.map(category => (
          <div key={category.name} className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.items} products</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Stock:</span>
                <span className="font-semibold text-gray-900">{category.count} units</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Value:</span>
                <span className="font-semibold text-green-600">${category.totalValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Low Stock Items:</span>
                <span className={`font-semibold ${category.lowStock > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {category.lowStock}
                </span>
              </div>
            </div>

            <button className="w-full mt-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium">
              View Products
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {categoryStats.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No categories yet</p>
          <p className="text-gray-400 text-sm mt-2">Add medicines to create categories</p>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Category</h2>
            <form onSubmit={handleAddCategory}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
