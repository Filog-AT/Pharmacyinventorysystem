import { useState, useMemo, useEffect, Fragment } from 'react';
import { toast } from 'sonner';
import { Search, Package, Plus, Pencil, Trash2, X, Eye, ChevronDown, ChevronUp, ShieldAlert, Archive, RotateCcw } from 'lucide-react';
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
  const [archiveFilter, setArchiveFilter] = useState('brands');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [showArchiveView, setShowArchiveView] = useState(false);
  const [selectedArchiveItem, setSelectedArchiveItem] = useState(null);

  // Prevent background scrolling when archive modal is open
  useEffect(() => {
    if (showArchiveView) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showArchiveView]);

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

  const handleArchiveBatch = async (medicine, batch, reason = null) => {
    if (!medicine || !batch) return;
    const now = new Date().toISOString();

    // Auto-detect reason if not provided
    let archiveReason = reason;
    if (!archiveReason) {
      const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
      const isSoldOut = Number(batch.quantity || 0) === 0;
      if (isExpired) archiveReason = 'Expired';
      else if (isSoldOut) archiveReason = 'Out of Stock';
      else archiveReason = 'Manual';
    }

    const archivedBatch = {
      ...batch,
      isArchived: true,
      archivedAt: now,
      archiveReason,
      quantity: 0,
      depletedAt: batch.depletedAt || now,
    };
    const updatedActiveBatches = (medicine.batches || []).filter((item) => item.id !== batch.id);
    const updatedArchivedBatches = [...(medicine.archivedBatches || []), archivedBatch];
    const newTotal = updatedActiveBatches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
    try {
      await onUpdateMedicine?.(medicine.id, {
        archivedBatches: updatedArchivedBatches,
        batches: updatedActiveBatches,
        totalQuantity: newTotal,
        pharmacyId: medicine.pharmacyId,
        categoryId: medicine.categoryId,
      });
      toast.success(`Batch archived (${archiveReason})`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to archive batch');
    }
  };

  const handleRestoreArchivedBatch = async (medicine, batch) => {
    if (!medicine || !batch) return;
    // Build restored batch — use delete (not undefined) so Firestore doesn't reject nested objects
    const restoredBatch = { ...batch };
    restoredBatch.isArchived = false;
    restoredBatch.quantity = Number(batch.initialQuantity || batch.quantity || 0);
    delete restoredBatch.archivedAt;
    delete restoredBatch.archiveReason;
    delete restoredBatch.depletedAt;

    const updatedArchivedBatches = (medicine.archivedBatches || []).filter((item) => item.id !== batch.id);
    const updatedActiveBatches = [...(medicine.batches || []), restoredBatch];
    try {
      await onUpdateMedicine?.(medicine.id, {
        archivedBatches: updatedArchivedBatches,
        batches: updatedActiveBatches,
        totalQuantity: updatedActiveBatches.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        pharmacyId: medicine.pharmacyId,
        categoryId: medicine.categoryId,
      });
      toast.success(`${medicine.name} restored successfully`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to restore batch');
    }
  };

  const handleRestoreArchivedMedicine = async (medicine) => {
    if (!medicine) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only restore batches that were archived when the brand was deleted AND are not expired
      // Expired batches and individually-archived batches stay in archivedBatches
      const batchesToRestore = (medicine.archivedBatches || []).filter(b => {
        if (b.archiveReason !== 'Brand deleted') return false;
        if (!b.expiryDate) return true;
        const exp = new Date(b.expiryDate);
        exp.setHours(0, 0, 0, 0);
        return exp >= today; // skip expired
      });

      const batchesToKeepArchived = (medicine.archivedBatches || []).filter(b => {
        if (b.archiveReason !== 'Brand deleted') return true; // keep individually archived
        if (!b.expiryDate) return false;
        const exp = new Date(b.expiryDate);
        exp.setHours(0, 0, 0, 0);
        return exp < today; // keep expired brand-deleted batches in archive
      });

      // Clean restored batch objects — remove archive fields and any undefined values
      const restoredBatches = batchesToRestore.map((batch) => {
        const b = { ...batch };
        b.isArchived = false;
        b.quantity = Number(batch.initialQuantity || batch.quantity || 0);
        // Delete archive-specific keys entirely so no undefined reaches Firestore
        delete b.archivedAt;
        delete b.archiveReason;
        delete b.depletedAt;
        return b;
      });

      const payload = {
        batches: restoredBatches,
        archivedBatches: batchesToKeepArchived,
        totalQuantity: restoredBatches.reduce((sum, b) => sum + Number(b.quantity || 0), 0),
        isArchived: false,
        archivedAt: undefined,   // updateMedicine sanitizer turns this into deleteField()
        archiveReason: undefined,
        pharmacyId: medicine.pharmacyId,
        categoryId: medicine.categoryId,
      };
      await onUpdateMedicine?.(medicine.id, payload);

      const restoredCount = restoredBatches.length;
      const skippedCount = (medicine.archivedBatches || []).filter(b => b.archiveReason === 'Brand deleted').length - restoredCount;
      if (skippedCount > 0) {
        toast.success(`${medicine.name} restored — ${restoredCount} batch${restoredCount !== 1 ? 'es' : ''} active, ${skippedCount} expired batch${skippedCount !== 1 ? 'es' : ''} kept in archive`);
      } else {
        toast.success(`${medicine.name} restored to inventory`);
      }
    } catch (error) {
      console.error('[Inventory] Restore brand failed:', error);
      toast.error('Failed to restore brand');
    }
  };

  const handleSubmitStock = async (medicineId, batchData) => {
    // No setSubmitting(true) here because AddStockForm has its own loading screen
    try {
      await onAddBatch?.(medicineId, batchData);
      setShowAddStockForm(false);
      setPreselectedMedicineId(null);
    } catch (err) {
      console.error(err);
    }
  }; const handleUpdateBatch = (medicineId, batchId, batchData) => {
    onUpdateBatch?.(medicineId, batchId, batchData);
  };

  const handleDeleteBatch = (medicineId, batchId) => {
    onDeleteBatch?.(medicineId, batchId);
  };

  // DEBUG: Clear all archive data from every medicine in the store
  const handleClearArchive = async () => {
    if (!window.confirm('DEBUG: Clear ALL archive data from every medicine? This removes isArchived, archivedBatches, archivedAt, archiveReason fields.')) return;
    let count = 0;
    for (const m of safeMedicines) {
      const hasArchive = m.isArchived || (m.archivedBatches && m.archivedBatches.length > 0);
      if (!hasArchive) continue;
      try {
        await onUpdateMedicine?.(m.id, {
          isArchived: false,
          archivedAt: undefined,
          archiveReason: undefined,
          archivedBatches: [],
          pharmacyId: m.pharmacyId,
          categoryId: m.categoryId,
        });
        count++;
      } catch (err) {
        console.error('[Inventory] Failed to clear archive for', m.id, err);
      }
    }
    toast.success(`Archive cleared — reset ${count} medicine(s)`);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Manage medicines and receive stock deliveries</p>
        </div>
        <div className="flex gap-3">
          {!isStaff && (
            <>
              <button
                onClick={() => setShowArchiveView(true)}
                className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 transition-colors font-medium shadow-sm"
              >
                <Archive className="w-5 h-5" />
                Archive
              </button>
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
                      if (window.confirm(`Delete category "${cat.name}"?`)) {
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
                  <th className="text-right p-4 font-semibold">Total Brand</th>
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
                                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                                  title="Archive Brand"
                                                >
                                                  <Archive className="w-4 h-4" />
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

      {showArchiveView && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-600" />
                  Archive
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Archived brands and inactive batches — restore anytime.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors border border-red-200"
                  title="DEBUG: Clear all archive data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Archive (Debug)
                </button>
                <button onClick={() => setShowArchiveView(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab bar + Search */}
            <div className="flex items-center gap-3 px-6 py-3 border-b bg-gray-50 flex-shrink-0 flex-wrap">
              <div className="inline-flex rounded-lg border overflow-hidden bg-white shadow-sm">
                {[
                  { id: 'brands', label: 'Archived Brands', count: safeMedicines.filter(m => m.isArchived).length },
                  { id: 'batches', label: 'Archived Batches', count: safeMedicines.flatMap(m => m.archivedBatches || []).length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setArchiveFilter(tab.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                      archiveFilter === tab.id
                        ? 'bg-amber-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    } ${tab.id !== 'brands' ? 'border-l' : ''}`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      archiveFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder={archiveFilter === 'brands' ? 'Search brands…' : 'Search batches…'}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6">

              {/* ── ARCHIVED BRANDS ─────────────────────────────────────── */}
              {archiveFilter === 'brands' && (() => {
                const archivedBrands = safeMedicines
                  .filter(m => m.isArchived)
                  .filter(m => {
                    const q = archiveSearch.toLowerCase();
                    return !q ||
                      (m.name || '').toLowerCase().includes(q) ||
                      (m.brandName || '').toLowerCase().includes(q) ||
                      (m.category || '').toLowerCase().includes(q) ||
                      (m.archiveReason || '').toLowerCase().includes(q);
                  });

                if (archivedBrands.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Archive className="w-12 h-12 mb-3 opacity-30" />
                      <p className="font-medium">No archived brands yet.</p>
                      <p className="text-sm mt-1">Brands you archive will appear here.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {archivedBrands.map(medicine => {
                      const batches = medicine.archivedBatches || [];
                      return (
                        <div key={medicine.id} className="border rounded-xl overflow-hidden shadow-sm">
                          {/* Brand header */}
                          <div className="flex items-start justify-between gap-4 p-4 bg-amber-50 border-b border-amber-100">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 text-base">{medicine.name}</h3>
                                {medicine.brandName && medicine.brandName !== medicine.name && (
                                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">{medicine.brandName}</span>
                                )}
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{medicine.category || 'Uncategorized'}</span>
                                {medicine.dosageForm && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{medicine.dosageForm} · {medicine.strength}</span>
                                )}
                              </div>
                              <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
                                <span>Archived: <strong className="text-gray-700">{medicine.archivedAt ? new Date(medicine.archivedAt).toLocaleDateString() : '—'}</strong></span>
                                <span>Reason: <strong className="text-gray-700">{medicine.archiveReason || 'Manual'}</strong></span>
                                <span>{batches.length} batch{batches.length !== 1 ? 'es' : ''} in history</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRestoreArchivedMedicine(medicine)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore Brand
                            </button>
                          </div>

                          {/* Batch history table */}
                          {batches.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                  <tr>
                                    <th className="px-4 py-2.5 text-left">Batch No.</th>
                                    <th className="px-4 py-2.5 text-left">Supplier</th>
                                    <th className="px-4 py-2.5 text-left">Expiry Date</th>
                                    <th className="px-4 py-2.5 text-right">Orig. Qty</th>
                                    <th className="px-4 py-2.5 text-left">Archive Reason</th>
                                    <th className="px-4 py-2.5 text-left">Date Archived</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {batches.map(batch => {
                                    const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                    return (
                                      <tr key={batch.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{batch.batchNumber || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{batch.supplier || '—'}</td>
                                        <td className="px-4 py-3">
                                          <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                                            {batch.expiryDate || '—'}
                                            {isExpired && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Expired</span>}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700 font-medium">{batch.initialQuantity || batch.quantity || 0}</td>
                                        <td className="px-4 py-3">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                            {batch.archiveReason || 'Manual'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{batch.archivedAt ? new Date(batch.archivedAt).toLocaleDateString() : '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="px-4 py-3 text-sm text-gray-400 italic">No batch history recorded for this brand.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── ARCHIVED BATCHES ─────────────────────────────────────── */}
              {archiveFilter === 'batches' && (() => {
                const allArchivedBatches = safeMedicines.flatMap(medicine =>
                  (medicine.archivedBatches || []).map(batch => ({ medicine, batch }))
                ).filter(({ medicine, batch }) => {
                  const q = archiveSearch.toLowerCase();
                  return !q ||
                    (medicine.name || '').toLowerCase().includes(q) ||
                    (medicine.brandName || '').toLowerCase().includes(q) ||
                    (batch.batchNumber || '').toLowerCase().includes(q) ||
                    (batch.archiveReason || '').toLowerCase().includes(q) ||
                    (batch.supplier || '').toLowerCase().includes(q);
                });

                if (allArchivedBatches.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Archive className="w-12 h-12 mb-3 opacity-30" />
                      <p className="font-medium">No archived batches yet.</p>
                      <p className="text-sm mt-1">Depleted, expired, or manually archived batches appear here.</p>
                    </div>
                  );
                }

                return (
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Batch No.</th>
                          <th className="px-4 py-3 text-left">Medicine</th>
                          <th className="px-4 py-3 text-left">Brand</th>
                          <th className="px-4 py-3 text-right">Qty (Final)</th>
                          <th className="px-4 py-3 text-left">Expiry Date</th>
                          <th className="px-4 py-3 text-left">Archive Reason</th>
                          <th className="px-4 py-3 text-left">Date Archived</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allArchivedBatches.map(({ medicine, batch }) => {
                          const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                          const reasonColor = {
                            'Out of Stock': 'bg-gray-100 text-gray-600',
                            'Expired': 'bg-red-100 text-red-600',
                            'Recalled': 'bg-orange-100 text-orange-700',
                            'Damaged': 'bg-yellow-100 text-yellow-700',
                            'Brand deleted': 'bg-amber-100 text-amber-700',
                            'Manual': 'bg-blue-50 text-blue-600',
                          }[batch.archiveReason] || 'bg-gray-100 text-gray-600';

                          return (
                            <tr key={`${medicine.id}-${batch.id}`} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{batch.batchNumber || '—'}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{medicine.name}</td>
                              <td className="px-4 py-3 text-blue-700 font-medium">{medicine.brandName || '—'}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{batch.initialQuantity ?? batch.quantity ?? 0}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                                  {batch.expiryDate || '—'}
                                  {isExpired && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Expired</span>}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${reasonColor}`}>
                                  {batch.archiveReason || 'Manual'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{batch.archivedAt ? new Date(batch.archivedAt).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 text-right">
                                {medicine.isArchived ? (
                                  <span className="text-xs text-gray-400 italic">Brand archived</span>
                                ) : isExpired ? (
                                  <span className="text-xs text-red-400 italic flex items-center gap-1 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
                                    Expired — cannot restore
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleRestoreArchivedBatch(medicine, batch)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 text-xs font-semibold hover:bg-emerald-100 transition-colors ml-auto"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Restore
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {selectedArchiveItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedArchiveItem.type === 'batch' ? 'Archived Batch Details' : 'Archived Brand Details'}</h3>
                <p className="text-sm text-gray-500">{selectedArchiveItem.medicine?.name || 'Archive item'}</p>
              </div>
              <button onClick={() => setSelectedArchiveItem(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl relative overflow-hidden">
            {/* Submitting Overlay */}
            {submitting && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-[60] flex flex-col items-center justify-center animate-in fade-in duration-200">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-900 font-bold">Processing...</p>
              </div>
            )}
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
          onArchiveBatch={(batch) => handleArchiveBatch(viewingMedicine, batch)}
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
        title="Archive Brand"
        message="Archive this brand and its associated batches instead of deleting it permanently. This keeps the history available for future review."
        itemName={deleteModal.name}
      />
    </div>
  );
}
