import { useState, useMemo, useEffect, Fragment } from 'react';
import { toast } from 'sonner';
import { Search, Package, Plus, Pencil, Trash2, X, Eye, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { MedicineForm } from './MedicineForm';
import { ViewBatchesModal } from './ViewBatchesModal';
import { AddStockForm } from './AddStockForm';
import { DeleteWarningModal } from './DeleteWarningModal';
import * as inventoryBackend from '@/backend/inventoryBackend';

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
  
  const isStaff = (currentUser?.role === 'staff');

  // Force viewMode to 'all' for staff
  useEffect(() => {
    if (isStaff) {
      setViewMode('all');
    }
  }, [isStaff]);
  const [editingMedicine, setEditingMedicine] = useState(undefined);
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [preselectedMedicineId, setPreselectedMedicineId] = useState(null);
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

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
    const highlightHandler = (e) => {
      const { id } = e.detail || {};
      if (id) {
        setSearchTerm('');
        setCategoryFilter('All');
        const med = safeMedicines.find(m => m.id === id);
        if (med) {
          const groupId = (med.name || '').trim().toLowerCase();
          setExpandedRows(prev => {
            const next = new Set(prev);
            next.add(groupId);
            return next;
          });
          // Scroll to the row after a short delay
          setTimeout(() => {
            const row = document.getElementById(`group-${groupId}`);
            if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
      }
    };
    window.addEventListener('open-add-stock', handler);
    window.addEventListener('open-view-batches', viewBatchesHandler);
    window.addEventListener('highlight-medicine', highlightHandler);
    return () => {
      window.removeEventListener('open-add-stock', handler);
      window.removeEventListener('open-view-batches', viewBatchesHandler);
      window.removeEventListener('highlight-medicine', highlightHandler);
    };
  }, [safeMedicines]);

  // Keep viewingMedicine in sync with latest data from medicines prop
  useEffect(() => {
    if (viewingMedicine) {
      const updated = safeMedicines.find(m => m.id === viewingMedicine.id);
      if (updated && updated !== viewingMedicine) {
        setViewingMedicine(updated);
      }
    }
  }, [safeMedicines, viewingMedicine?.id]);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [submitting, setSubmitting] = useState(false);

  const getStockStatus = (totalQuantity, minStockLevel) => {
    return inventoryBackend.getStockStatus(totalQuantity, minStockLevel);
  };

  const filteredMedicines = useMemo(() => {
    return inventoryBackend.getFilteredMedicines(safeMedicines, searchTerm, categoryFilter, viewMode, selectedCategory);
  }, [safeMedicines, searchTerm, categoryFilter, viewMode, selectedCategory]);

  const groupedMedicines = useMemo(() => {
    return inventoryBackend.getGroupedMedicines(filteredMedicines);
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
    return inventoryBackend.getCategoryStats(safeMedicines, safeCategories);
  }, [safeMedicines, safeCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const value = newCategory.trim();
    if (!value) return;
    const exists = safeCategories.some(c => (c || '').toLowerCase() === value.toLowerCase());
    if (exists) {
      toast.warning(`Category "${value}" already exists`);
      return;
    }
    setSubmitting(true);
    try {
      await onAddCategory?.(value);
      setNewCategory('');
      setShowAddCategoryForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVariationClick = (groupName) => {
    setEditingMedicine({ name: groupName, isVariation: true });
    setShowMedicineForm(true);
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

  const handleSubmitMedicine = async (data) => {
    setSubmitting(true);
    try {
      let result;
      if (editingMedicine && editingMedicine.id) {
        result = await onUpdateMedicine?.(editingMedicine.id, data);
      } else {
        result = await onAddMedicine?.(data);
      }
      setShowMedicineForm(false);
      setEditingMedicine(undefined);

      // Automatically trigger "Add Stock" after adding/updating a variation
      if (result?.id) {
        setPreselectedMedicineId(result.id);
        setShowAddStockForm(true);
      } else if (editingMedicine?.id) {
        setPreselectedMedicineId(editingMedicine.id);
        setShowAddStockForm(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBatchLocal = async (medId, batchId, data) => {
    setSubmitting(true);
    try {
      await onUpdateBatch?.(medId, batchId, data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatchLocal = async (medId, batchId) => {
    setSubmitting(true);
    try {
      await onDeleteBatch?.(medId, batchId);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitStock = async (medicineId, batchData) => {
    setSubmitting(true);
    try {
      await onAddBatch?.(medicineId, batchData);
      setShowAddStockForm(false);
      setPreselectedMedicineId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }; const handleUpdateBatch = (medicineId, batchId, batchData) => {
    onUpdateBatch?.(medicineId, batchId, batchData);
  };

  const handleDeleteBatch = (medicineId, batchId) => {
    onDeleteBatch?.(medicineId, batchId);
  };

  return (
    <div className="space-y-6 relative">
      {/* Submitting Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[1px] z-[100] flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-900 font-bold">Processing...</p>
        </div>
      )}
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
          {!isStaff && (
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
          )}

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
          {!isStaff && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input-background min-w-[150px]"
            >
              <option value="All">All Categories</option>
              {safeCategories.map(cat => (
                <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
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
                      // Use custom modal or just simple confirm for categories
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
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-right p-4 font-semibold">Total Variations</th>
                  <th className="text-right p-4 font-semibold">Total Stock</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="text-center p-4 font-semibold">Tag</th>
                  {!isStaff && <th className="text-right p-4 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={isStaff ? 7 : 8} className="p-8 text-center text-gray-500">
                      No medicines found. Try adding some or adjusting your search.
                    </td>
                  </tr>
                ) : (
                  groupedMedicines.map((group) => {
                    const status = getStockStatus(group.totalQuantity, group.minStockLevel);
                    const isExpanded = expandedRows.has(group.id);
                    // Get tag from the first variation
                    const tag = group.variations[0]?.tag || 'Non-Prescription';
                    return (
                      <Fragment key={group.id}>
                        <tr 
                          id={`group-${group.id}`}
                          className="hover:bg-gray-50/50 transition-colors cursor-pointer" 
                          onClick={() => toggleRow(group.id)}
                        >
                          <td className="p-4">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-gray-900 text-lg">{group.name}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{group.category}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{group.variations.length}</span>
                          </td>
                          <td className="p-4 text-right font-bold">
                            {group.totalQuantity || 0}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                tag === 'Prescription' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {tag}
                              </span>
                            </div>
                          </td>
                          {!isStaff && (
                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleAddVariationClick(group.name)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-white text-green-600 hover:bg-green-50 transition-colors font-medium shadow-sm"
                                  title="Add Variation"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Variation
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={isStaff ? 6 : 7} className="p-4">
                              <div className="bg-white rounded-lg border shadow-sm overflow-hidden ml-10">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                      <th className="p-3 text-left">Brand Name</th>
                                      <th className="p-3 text-left">Dosage & Strength</th>
                                      <th className="p-3 text-left">Expiry Date</th>
                                      <th className="p-3 text-right">Stock</th>
                                      <th className="p-3 text-right">Price</th>
                                      <th className="p-3 text-right">Min Level</th>
                                      {!isStaff && <th className="p-3 text-right">Actions</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {group.variations.map((v) => {
                                      const vStatus = getStockStatus(v.totalQuantity, v.minStockLevel);
                                      
                                      // Find closest expiry date from active batches
                                      const validBatches = (v.batches || [])
                                        .filter(b => Number(b.quantity || 0) > 0)
                                        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
                                      
                                      const closestExpiry = validBatches.length > 0 ? validBatches[0].expiryDate : 'N/A';
                                      const isExpired = closestExpiry !== 'N/A' && new Date(closestExpiry) < new Date();

                                      return (
                                        <tr 
                                          key={v.id} 
                                          className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                                          onClick={() => handleViewBatchesClick(v)}
                                        >
                                          <td className="p-3">
                                            <span className="font-bold text-blue-700">{v.brandName || 'Generic'}</span>
                                          </td>
                                          <td className="p-3">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-gray-900 capitalize">{v.dosageForm}</span>
                                              <span className="text-gray-500">•</span>
                                              <span className="text-gray-700">{v.strength}</span>
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <div className={`flex flex-col ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                                              <span className="font-medium">{closestExpiry}</span>
                                              {validBatches.length > 1 && (
                                                <span className="text-[10px] text-gray-400">+{validBatches.length - 1} more batches</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3 text-right font-medium">
                                            <div className="flex flex-col items-end">
                                              <span className={v.totalQuantity <= (v.minStockLevel || 50) ? 'text-amber-600' : 'text-gray-900'}>
                                                {v.totalQuantity} {v.unit}
                                              </span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${vStatus.color}`}>
                                                {vStatus.label}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="p-3 text-right text-gray-900 font-semibold">
                                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v.price || 0)}
                                          </td>
                                          <td className="p-3 text-right text-gray-500">
                                            {Math.max(50, Number(v.minStockLevel || 0))}
                                          </td>
                                          {!isStaff && (
                                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                              <div className="flex justify-end gap-2">
                                                <button
                                                  onClick={() => handleViewBatchesClick(v)}
                                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                  title="View Batches"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setPreselectedMedicineId(v.id);
                                                    setShowAddStockForm(true);
                                                  }}
                                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                  title="Add Batch"
                                                >
                                                  <Plus className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => handleEditProductClick(v)}
                                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                  title="Edit Variation"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => setDeleteModal({ isOpen: true, id: v.id, name: `${v.name} (${v.dosageForm} ${v.strength})` })}
                                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                  title="Delete Variation"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
          medicines={medicines}
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
          onDeleteBatch={handleDeleteBatchLocal}
          onUpdateBatch={handleUpdateBatchLocal}
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

      <DeleteWarningModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
        onConfirm={() => {
          onDeleteMedicine?.(deleteModal.id);
          setDeleteModal({ isOpen: false, id: null, name: '' });
        }}
        title="Delete Medicine Variation"
        message="Are you sure you want to delete this medicine variation? This will remove all associated batch records and history."
        itemName={deleteModal.name}
      />
    </div>
  );
}
