import { useState, useMemo, Fragment } from 'react';
import { Search, Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import { MedicineForm } from './MedicineForm';

export function Inventory({
  medicines = [],
  categories = [],
  onAddCategory,
  onDeleteCategory,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
  currentUser
}) {
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'categories'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingMedicine, setEditingMedicine] = useState(undefined);
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const isStaff = (currentUser?.role === 'staff');

  const getRowClass = (expiryStr, unit, quantity) => {
    const today = new Date();
    const exp = expiryStr ? new Date(expiryStr) : null;
    const expired = exp && !isNaN(exp.getTime()) && exp < today;
    const daysUntilExpiry = exp && !isNaN(exp.getTime())
      ? Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const soon = daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    const u = (unit || '').toLowerCase();
    const pillUnit = u === 'tablets' || u === 'capsules';
    const lowThreshold = pillUnit ? 30 : 0;
    const low = lowThreshold > 0 && Number(quantity || 0) <= lowThreshold;
    if (expired) return 'bg-red-50';
    if (soon) return 'bg-yellow-50';
    if (low) return 'bg-orange-50';
    return 'bg-green-50';
  };

  const filteredMedicines = useMemo(() => {
    const effectiveCategoryFilter = (viewMode === 'categories' && selectedCategory) 
      ? selectedCategory 
      : categoryFilter;

    return safeMedicines
      .filter(m => {
        const matchesText =
          (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = effectiveCategoryFilter === 'All' || (m.category || 'Uncategorized') === effectiveCategoryFilter;
        return matchesText && matchesCategory;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [safeMedicines, searchTerm, categoryFilter, viewMode, selectedCategory]);

  const categoryStats = useMemo(() => {
    const stats = new Map();
    // initialize from provided categories
    safeCategories.forEach(cat => {
      stats.set(cat, { count: 0, totalValue: 0, lowStock: 0, itemCount: 0 });
    });
    // aggregate from medicines
    safeMedicines.forEach(m => {
      const catName = m.category || 'Uncategorized';
      if (!stats.has(catName)) {
        stats.set(catName, { count: 0, totalValue: 0, lowStock: 0, itemCount: 0 });
      }
      const s = stats.get(catName);
      const totalQty = Array.isArray(m.batches)
        ? m.batches.reduce((sum, b) => sum + Number(b?.quantityPieces || 0), 0)
        : Number(m.quantity || 0);
      s.count += totalQty;
      s.totalValue += totalQty * Number(m.price || 0);
      s.itemCount += 1;
      if ((m.minStockLevel || 0) > 0 && (m.quantity || 0) <= (m.minStockLevel || 0)) {
        s.lowStock += 1;
      }
    });
    return Array.from(stats.entries()).map(([name, data]) => ({ name, ...data }));
  }, [safeMedicines, safeCategories]);

  const groupedByName = useMemo(() => {
    const groups = new Map();
    filteredMedicines.forEach((m) => {
      const key = (m.name || 'Unknown').trim().toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          name: m.name || 'Unknown',
          category: m.category || 'Uncategorized',
          price: Number(m.price || 0),
          supplier: m.supplier || 'N/A',
          originalIds: new Set(),
          batches: [],
        });
      }
      const g = groups.get(key);
      g.originalIds.add(m.id);
      if (Array.isArray(m.batches) && m.batches.length > 0) {
        m.batches.forEach((b) => {
          g.batches.push({
            ...b,
            sourceMedicineId: m.id,
            name: m.name,
            category: m.category,
            price: Number(m.price || 0),
            supplier: m.supplier || 'N/A',
          });
        });
      } else {
        g.batches.push({
          batchId: `${m.id}-single`,
          expiryDate: m.expiryDate || '',
          unit: m.unit || 'units',
          blisterCount: Number(m.blisterCount || 0),
          tabletCount: Number(m.tabletCount || 0),
          quantityPieces: Number(m.quantity || 0),
          sourceUnit: m.unit || 'units',
          sourceMedicineId: m.id,
          name: m.name,
          category: m.category,
          price: Number(m.price || 0),
          supplier: m.supplier || 'N/A',
        });
      }
    });
    return Array.from(groups.values()).map((g) => {
      const totalQty = g.batches.reduce((sum, b) => sum + Number(b?.quantityPieces || 0), 0);
      const validDates = g.batches
        .map((b) => new Date(b?.expiryDate || ''))
        .filter((d) => !isNaN(d.getTime()));
      const earliest =
        validDates.length > 0 ? new Date(Math.min(...validDates.map((d) => d.getTime()))) : null;
      return {
        ...g,
        totalQty,
        earliestExpiry:
          earliest
            ? `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}-${String(
                earliest.getDate()
              ).padStart(2, '0')}`
            : g.batches.length > 1
            ? 'Multiple'
            : (g.batches[0]?.expiryDate || 'N/A'),
      };
    });
  }, [filteredMedicines]);

  const handleAddCategory = (e) => {
    e.preventDefault();
    const value = newCategory.trim();
    if (!value) return;
    onAddCategory?.(value);
    setNewCategory('');
    setShowAddForm(false);
  };

  const handleAddClick = () => {
    setEditingMedicine(undefined);
    setShowMedicineForm(true);
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

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventory</h1>
          <p className="text-muted-foreground">Manage and review stock levels</p>
        </div>
        {viewMode === 'categories' && !selectedCategory ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            style={{ display: isStaff || !onAddCategory ? 'none' : undefined }}
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        ) : (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            style={{ display: isStaff ? 'none' : undefined }}
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
              onClick={() => {
                setViewMode('all');
                setSelectedCategory(null);
              }}
              className={`px-4 py-2 ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              All Medicines
            </button>
            <button
              onClick={() => {
                setViewMode('categories');
                setSelectedCategory(null);
                setCategoryFilter('All');
                setSearchTerm('');
              }}
              className={`px-4 py-2 border-l ${viewMode === 'categories' ? 'bg-blue-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              Categories
            </button>
          </div>

          {viewMode === 'all' && (
            <>
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
              >
                {['All', ...safeCategories.filter(Boolean), 'Uncategorized'].filter((v, i, arr) => arr.indexOf(v) === i).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {viewMode === 'categories' && !selectedCategory ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map(cat => (
              <div key={cat.name} className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{cat.itemCount} products</p>
                  </div>
                  {!isStaff && onDeleteCategory && (
                    <button
                      onClick={() => {
                        if (cat.itemCount > 0) {
                          alert('Cannot delete a category that contains products. Remove or reassign products first.');
                          return;
                        }
                        if (confirm(`Delete category "${cat.name}"?`)) {
                          onDeleteCategory?.(cat.name);
                        }
                      }}
                      className="p-2 hover:bg-muted rounded-md transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Stock:</span>
                    <span className="font-semibold text-card-foreground">{cat.count} units</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold text-green-600">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cat.totalValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Low Stock Items:</span>
                    <span className={`font-semibold ${cat.lowStock > 0 ? 'text-orange-600' : 'text-card-foreground'}`}>{cat.lowStock}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                  setCategoryFilter(cat.name);
                  setSelectedCategory(cat.name);
                  setViewMode('categories');
                  setSearchTerm('');
                }}
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
      ) : (
        <>
          {viewMode === 'categories' && selectedCategory && (
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setCategoryFilter('All');
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium"
              >
                <span className="text-lg">←</span> Back to Categories
              </button>
              <div className="h-6 w-px bg-border"></div>
              <h2 className="text-xl font-bold">{selectedCategory}</h2>
            </div>
          )}
          {filteredMedicines.length === 0 ? (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No medicines found</p>
          <p className="text-muted-foreground text-sm mt-2">
            {searchTerm ? 'Try adjusting your search' : 'Add your first medicine to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="text-left p-3">NAME</th>
                <th className="text-left p-3">CATEGORY</th>
                <th className="text-right p-3">QUANTITY</th>
                <th className="text-left p-3">UNIT</th>
                <th className="text-right p-3">PRICE</th>
                <th className="text-left p-3">SUPPLIER</th>
                <th className="text-left p-3">EXPIRY DATE</th>
                <th className="text-right p-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {groupedByName.map((g) => {
                const hasMultiple = (g.batches || []).length > 1;
                const rowClass = getRowClass(g.earliestExpiry, hasMultiple ? (g.batches[0]?.unit || 'units') : (g.batches[0]?.unit || 'units'), g.totalQty);
                const isExpanded = !!expandedGroups[g.name];
                return (
                  <Fragment key={`${g.name}-summary`}>
                    <tr className={`border-t ${rowClass}`}>
                      <td className="p-3 font-medium text-card-foreground">
                        {hasMultiple ? (
                          <button
                            onClick={() =>
                              setExpandedGroups((prev) => ({ ...prev, [g.name]: !prev[g.name] }))
                            }
                            className="mr-2 px-2 py-1 border rounded-md hover:bg-muted"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? '▾' : '▸'}
                          </button>
                        ) : null}
                        {g.name}
                      </td>
                      <td className="p-3">{g.category}</td>
                      <td className="p-3 text-right">{g.totalQty}</td>
                      <td className="p-3">
                        {hasMultiple ? 'Mixed' : (g.batches[0]?.unit || 'units')}
                      </td>
                      <td className="p-3 text-right">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
                          Number(g.price || 0)
                        )}
                      </td>
                      <td className="p-3">{g.supplier}</td>
                      <td className="p-3">{g.earliestExpiry}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          {!isStaff && !hasMultiple && (
                            <>
                              <button
                                onClick={() =>
                                  handleEditClick({
                                    id: Array.from(g.originalIds)[0],
                                    name: g.name,
                                    category: g.category,
                                    quantity: g.totalQty,
                                    unit: g.batches[0]?.unit || 'units',
                                    price: g.price,
                                    supplier: g.supplier,
                                    expiryDate: g.earliestExpiry,
                                  })
                                }
                                className="px-2 py-1 rounded-md border text-blue-600 hover:bg-muted"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteMedicine?.(Array.from(g.originalIds)[0])}
                                className="px-2 py-1 rounded-md border text-red-600 hover:bg-muted"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {hasMultiple && isExpanded &&
                      g.batches.map((b) => {
                        const batchRowClass = getRowClass(b.expiryDate, b.unit, Number(b.quantityPieces || 0));
                        return (
                          <tr key={`${g.name}-${b.batchId}`} className={`border-t ${batchRowClass}`}>
                            <td className="p-3 pl-10 text-card-foreground">{g.name}</td>
                            <td className="p-3">{g.category}</td>
                            <td className="p-3 text-right">{Number(b.quantityPieces || 0)}</td>
                            <td className="p-3">{b.unit || 'units'}</td>
                            <td className="p-3 text-right">
                              {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
                                Number(g.price || 0)
                              )}
                            </td>
                            <td className="p-3">{g.supplier}</td>
                            <td className="p-3">{b.expiryDate || 'N/A'}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                {!isStaff && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditClick({
                                          id: b.sourceMedicineId,
                                          name: g.name,
                                          category: g.category,
                                          quantity: Number(b.quantityPieces || 0),
                                          unit: b.unit || 'units',
                                          price: g.price,
                                          supplier: g.supplier,
                                          expiryDate: b.expiryDate || '',
                                        })
                                      }
                                      className="px-2 py-1 rounded-md border text-blue-600 hover:bg-muted"
                                      title="Edit Batch"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteMedicine?.(b.sourceMedicineId, b.batchId)}
                                      className="px-2 py-1 rounded-md border text-red-600 hover:bg-muted"
                                      title="Delete Batch"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
                  disabled={!onAddCategory}
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
