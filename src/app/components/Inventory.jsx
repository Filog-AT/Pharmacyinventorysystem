import { useState, useMemo, useEffect, Fragment } from 'react';
import { toast } from 'sonner';
import { Search, Package, Plus, Pencil, Trash2, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { MedicineForm } from './MedicineForm';
import { ViewBatchesModal } from './ViewBatchesModal';
import { AddStockForm } from './AddStockForm';

export function Inventory({
  medicines = [],
  categories = [],
  onAddCategory,
  onDeleteCategory,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
  currentUser
}) {
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'categories'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingMedicine, setEditingMedicine] = useState(undefined);
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [preselectedMedicineId, setPreselectedMedicineId] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const { medicineId } = e.detail || {};
      if (medicineId) {
        setPreselectedMedicineId(medicineId);
        setShowAddStockForm(true);
      }
    };
    const viewBatchesHandler = (e) => {
      const { medicineId } = e.detail || {};
      if (medicineId) {
        const med = safeMedicines.find(x => x.id === medicineId);
        if (med) setViewingMedicine(med);
      }
    };
    window.addEventListener('open-add-stock', handler);
    window.addEventListener('open-view-batches', viewBatchesHandler);
    return () => {
      window.removeEventListener('open-add-stock', handler);
      window.removeEventListener('open-view-batches', viewBatchesHandler);
    };
  }, []);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const isStaff = (currentUser?.role === 'staff');

  const getStockStatus = (totalQuantity, minStockLevel) => {
    if (totalQuantity <= 0) return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm ring-1 ring-rose-400/20' };
    const effectiveMin = Math.max(50, Number(minStockLevel || 0));
    if (totalQuantity <= effectiveMin) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm ring-1 ring-amber-400/20' };
    return { label: 'Healthy', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const filteredMedicines = useMemo(() => {
    const effectiveCategoryFilter = (viewMode === 'categories' && selectedCategory) 
      ? selectedCategory 
      : categoryFilter;

    return safeMedicines
      .filter(m => {
        const matchesText =
          (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.strength || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = effectiveCategoryFilter === 'All' || (m.category || 'Uncategorized') === effectiveCategoryFilter;
        return matchesText && matchesCategory;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [safeMedicines, searchTerm, categoryFilter, viewMode, selectedCategory]);

  const groupedMedicines = useMemo(() => {
    const groups = new Map();
    const list = filteredMedicines;
    list.forEach(m => {
      const key = `${(m.name || '').toLowerCase()}|${(m.dosageForm || '').toLowerCase()}|${(m.strength || '').toLowerCase()}|${Number(m.price || 0)}`;
      const existing = groups.get(key);
      const totalQty = Number(m.totalQuantity || 0);
      if (existing) {
        existing.totalQuantity += totalQty;
        existing.batches = [...(existing.batches || []), ...(m.batches || [])];
        existing.ids.push(m.id);
      } else {
        groups.set(key, {
          ...m,
          totalQuantity: totalQty,
          ids: [m.id],
          batches: [...(m.batches || [])],
          groupKey: key,
          id: m.id,
        });
      }
    });
    return Array.from(groups.values());
  }, [filteredMedicines]);

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const categoryStats = useMemo(() => {
    const stats = new Map();
    safeCategories.forEach(cat => {
      stats.set(cat, { count: 0, totalValue: 0, lowStock: 0, itemCount: 0, expired: 0 });
    });
    
    safeMedicines.forEach(m => {
      const catName = m.category || 'Uncategorized';
      if (!stats.has(catName)) {
        stats.set(catName, { count: 0, totalValue: 0, lowStock: 0, itemCount: 0, expired: 0 });
      }
      const s = stats.get(catName);
      const totalQty = m.totalQuantity || 0;
      s.count += totalQty;
      s.totalValue += totalQty * Number(m.price || 0);
      s.itemCount += 1;
      const effectiveMin = Math.max(50, Number(m.minStockLevel || 0));
      if (totalQty <= effectiveMin) {
        s.lowStock += 1;
      }
      const today = new Date(); today.setHours(0,0,0,0);
      const expiredBatches = (m.batches || []).filter(b => {
        const d = b.expiryDate ? new Date(b.expiryDate) : null;
        if (!d || isNaN(d.getTime())) return false;
        d.setHours(0,0,0,0);
        return d < today && Number(b.quantity || 0) > 0;
      }).length;
      if (expiredBatches > 0) s.expired += 1;
    });
    return Array.from(stats.entries()).map(([name, data]) => ({ name, ...data }));
  }, [safeMedicines, safeCategories]);

  const handleAddCategory = (e) => {
    e.preventDefault();
    const value = newCategory.trim();
    if (!value) return;
    const exists = safeCategories.some(c => (c || '').toLowerCase() === value.toLowerCase());
    if (exists) {
      toast.warning(`Category "${value}" already exists`);
      return;
    }
    onAddCategory?.(value);
    setNewCategory('');
    setShowAddCategoryForm(false);
  };

  const handleAddProductClick = () => {
    setEditingMedicine(undefined);
    setShowMedicineForm(true);
  };

  const handleEditProductClick = (medicine) => {
    setEditingMedicine(medicine);
    setShowMedicineForm(true);
  };

  const handleViewBatchesClick = (medicine) => {
    setViewingMedicine(medicine);
  };

  const handleSubmitMedicine = (data) => {
    if (editingMedicine) {
      onUpdateMedicine?.(editingMedicine.id, data);
    } else {
      onAddMedicine?.(data);
    }
    setShowMedicineForm(false);
    setEditingMedicine(undefined);
  };

  const handleSubmitStock = (medicineId, batchData) => {
    onAddBatch?.(medicineId, batchData);
    setShowAddStockForm(false);
  };

  const handleUpdateBatch = (medicineId, batchId, batchData) => {
    onUpdateBatch?.(medicineId, batchId, batchData);
  };

  const handleDeleteBatch = (medicineId, batchId) => {
    onDeleteBatch?.(medicineId, batchId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Manage medicines and receive stock deliveries</p>
        </div>
        <div className="flex gap-3">
          {!isStaff && (
            <>
              <button
                onClick={handleAddProductClick}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Medicine
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              onClick={() => {
                setViewMode('all');
                setSelectedCategory(null);
              }}
              className={`px-4 py-2 transition-colors ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              All Products
            </button>
            <button
              onClick={() => {
                setViewMode('categories');
                setSelectedCategory(null);
                setCategoryFilter('All');
                setSearchTerm('');
              }}
              className={`px-4 py-2 border-l transition-colors ${viewMode === 'categories' ? 'bg-blue-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              Categories
            </button>
          </div>

          {viewMode === 'all' && (
            <>
              <div className="relative min-w-[300px] flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search medicines by name or strength..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input-background"
                />
              </div>
              {/* Category dropdown removed per request */}
            </>
          )}
        </div>
      </div>

      {viewMode === 'categories' && !selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryStats.map(cat => (
            <div key={cat.name} className="bg-card rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground">{cat.itemCount} medicines</p>
                </div>
                {!isStaff && onDeleteCategory && (
                  <button
                    onClick={() => {
                      if (cat.itemCount > 0) {
                        toast.error('Cannot delete category with medicines');
                        return;
                      }
                      if (confirm(`Delete category "${cat.name}"?`)) {
                        onDeleteCategory?.(cat.name);
                      }
                    }}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Medicines:</span>
                  <span className="font-semibold">{cat.itemCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Units:</span>
                  <span className="font-semibold">{cat.count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Low Stock:</span>
                  <span className={`font-semibold ${cat.lowStock > 0 ? 'text-orange-600' : ''}`}>{cat.lowStock}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expired:</span>
                  <span className={`font-semibold ${cat.expired > 0 ? 'text-red-600' : ''}`}>{cat.expired}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setCategoryFilter(cat.name);
                  setSelectedCategory(cat.name);
                  setViewMode('categories');
                }}
                className="w-full mt-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
              >
                View Medicines
              </button>
            </div>
          ))}
          {!isStaff && (
            <button
              onClick={() => setShowAddCategoryForm(true)}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-500 hover:text-blue-600"
            >
              <Plus className="w-8 h-8" />
              <span className="font-medium">Add New Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="w-10 p-4"></th>
                  <th className="text-left p-4 font-semibold">Medicine Name</th>
                  <th className="text-left p-4 font-semibold">Dosage Form</th>
                  <th className="text-left p-4 font-semibold">Strength</th>
                  <th className="text-left p-4 font-semibold">Strength Unit</th>
                  <th className="text-right p-4 font-semibold">Total Stock</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      No medicines found. Try adding some or adjusting your search.
                    </td>
                  </tr>
                ) : (
                  groupedMedicines.map((m) => {
                    const status = getStockStatus(m.totalQuantity, m.minStockLevel);
                    const isExpanded = expandedRows.has(m.id);
                    return (
                      <Fragment key={m.id}>
                        <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggleRow(m.id)}>
                          <td className="p-4">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-gray-900">{m.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{m.category}</div>
                          </td>
                          <td className="p-4 capitalize">{m.dosageForm}</td>
                          <td className="p-4">{m.strength}</td>
                          <td className="p-4 capitalize">
                            {(() => {
                              const unit = String(m.strength || '').replace(/\s+/g,'').toLowerCase().match(/(mg|ml|g)$/);
                              return unit ? unit[1] : '—';
                            })()}
                          </td>
                          <td className="p-4 text-right font-bold">
                            {m.totalQuantity || 0} <span className="text-xs font-normal text-muted-foreground ml-1">{m.unit}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleViewBatchesClick(safeMedicines.find(x => x.id === (m.ids?.[0] || m.id)) || m)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-white text-blue-600 hover:bg-blue-50 transition-colors font-medium shadow-sm"
                                title="View Batches"
                              >
                                <Eye className="w-4 h-4" />
                                View Batches
                              </button>
                              {!isStaff && (
                                <button
                                  onClick={() => {
                                    setPreselectedMedicineId(m.ids?.[0] || m.id);
                                    setShowAddStockForm(true);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-white text-green-600 hover:bg-green-50 transition-colors font-medium shadow-sm"
                                  title="Add Batch"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Batch
                                </button>
                              )}
                              {!isStaff && (
                                <>
                                  <button
                                    onClick={() => handleEditProductClick(safeMedicines.find(x => x.id === (m.ids?.[0] || m.id)) || m)}
                                    className="p-1.5 rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                                    title="Edit Product"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${m.name}? All batch data will be lost.`)) {
                                        onDeleteMedicine?.(m.ids?.[0] || m.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-md border bg-white text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50/30">
                            <td colSpan="7" className="p-0">
                              <div className="p-6 border-l-4 border-blue-500 bg-white shadow-inner animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <div className="bg-gray-50 p-4 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Pricing & Unit</p>
                                    <div className="space-y-1">
                                      <p className="text-lg font-bold text-gray-900">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(m.price || 0)}</p>
                                      <p className="text-sm text-gray-600">Per {m.unit || 'unit'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-50 p-4 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Stock Details</p>
                                    <div className="space-y-1">
                                      <p className="text-sm"><span className="text-gray-500">Min Level:</span> <span className="font-semibold">{Math.max(50, Number(m.minStockLevel || 0))}</span></p>
                                      <p className="text-sm"><span className="text-gray-500">Total Batches:</span> <span className="font-semibold">{m.batches?.length || 0}</span></p>
                                    </div>
                                  </div>

                                  {/* Product Description removed per request */}
                                </div>

                                <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                                  <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                      <span className="text-sm text-gray-600">Active Stock</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                      <span className="text-sm text-gray-600">Managed Inventory</span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => handleViewBatchesClick(m)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1 group"
                                  >
                                    Manage Batch Records
                                    <ChevronDown className="w-4 h-4 transform -rotate-90 group-hover:translate-x-1 transition-transform" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New Category</h2>
              <button onClick={() => setShowAddCategoryForm(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Category Name</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Antibiotics"
                  className="w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 transition-colors font-bold shadow-sm"
                >
                  Create Category
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-md hover:bg-gray-200 transition-colors font-bold"
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
          existingMedicines={safeMedicines}
          onSubmit={handleSubmitMedicine}
          onClose={() => setShowMedicineForm(false)}
        />
      )}

      {viewingMedicine && (
        <ViewBatchesModal
          medicine={viewingMedicine}
          currentUser={currentUser}
          onClose={() => setViewingMedicine(null)}
          onDeleteBatch={handleDeleteBatch}
          onUpdateBatch={handleUpdateBatch}
        />
      )}
      {showAddStockForm && (
        <AddStockForm
          medicines={safeMedicines}
          initialMedicineId={preselectedMedicineId}
          onSubmit={handleSubmitStock}
          onClose={() => {
            setShowAddStockForm(false);
            setPreselectedMedicineId(null);
          }}
        />
      )}
    </div>
  );
}
