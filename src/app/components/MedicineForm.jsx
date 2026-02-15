import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function MedicineForm({ medicine, categories, existingMedicines = [], onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Antibiotic',
    dosageForm: 'tablet',
    strength: '',
    strengthValue: '',
    strengthUnit: 'mg',
    unit: 'tablets',
    price: 0,
    supplier: '',
    quantity: 0,
    expiryDate: '',
    blisterCount: 1,
    tabletCount: 1,
    subUnitType: 'tablets',
    minStockLevel: 50,
  });

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name,
        category: medicine.category,
        dosageForm: medicine.dosageForm || 'tablet',
        strength: medicine.strength || '',
        strengthValue: (() => {
          const m = String(medicine.strength || '').trim().match(/(\d+(?:\.\d+)?)/);
          return m ? m[1] : '';
        })(),
        strengthUnit: (() => {
          const m = String(medicine.strength || '').trim().toLowerCase().match(/(mg|ml|g)$/);
          return m ? m[1] : 'mg';
        })(),
        unit: medicine.unit || 'tablets',
        price: medicine.price || 0,
        supplier: medicine.supplier || '',
        quantity: medicine.quantity || 0,
        expiryDate: medicine.expiryDate || '',
        blisterCount: medicine.blisterCount || 1,
        tabletCount: medicine.tabletCount || 1,
        subUnitType: medicine.subUnitType || medicine.unit || 'tablets',
        minStockLevel: Math.max(50, Number(medicine.minStockLevel || 0)),
      });
    }
  }, [medicine]);

  const [customCategory, setCustomCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = { ...formData };
    payload.name = (payload.name || '').trim();
    const sv = String(payload.strengthValue || '').trim();
    const su = String(payload.strengthUnit || 'mg').trim();
    const builtStrength = sv ? `${sv}${su}` : String(payload.strength || '').replace(/\s+/g, '');
    payload.strength = builtStrength;
    payload.dosageForm = (payload.dosageForm || 'tablet').trim();
    const qty = Number(payload.quantity || 0);
    const blisters = Number(payload.blisterCount || 1);
    const perBlister = Number(payload.tabletCount || 1);

    if (!medicine) {
      if (!payload.name) {
        alert('Please enter medicine name');
        return;
      }
      if (!payload.category) {
        alert('Please select a category');
        return;
      }
      if (!payload.strength) {
        alert('Please enter dosage/strength');
        return;
      }
      if (!payload.unit) {
        alert('Please select a unit');
        return;
      }
      if (!payload.expiryDate) {
        alert('Please select an expiry date');
        return;
      }
      if (qty <= 0) {
        alert('Quantity must be greater than 0');
        return;
      }
      if (payload.unit === 'boxes') {
        if (blisters <= 0 || perBlister <= 0) {
          alert('Blister and per-blister counts must be greater than 0');
          return;
        }
        payload.subUnitType = payload.subUnitType || 'tablets';
        payload.quantity = qty * blisters * perBlister;
      } else {
        payload.subUnitType = payload.unit;
      }
    }

    // Duplicate check for new medicines
    if (!medicine) {
      const normName = (payload.name || '').toLowerCase().trim();
      const normStrength = (payload.strength || '').toLowerCase().replace(/\s+/g, '');
      const normForm = (payload.dosageForm || '').toLowerCase().trim();
      const matched = existingMedicines.find(m =>
        (m.name || '').toLowerCase().trim() === normName &&
        (String(m.strength || '').toLowerCase().replace(/\s+/g, '')) === normStrength &&
        (m.dosageForm || '').toLowerCase().trim() === normForm
      );
      if (matched) {
        alert(`"${payload.name} ${sv}${su} (${payload.dosageForm})" already exists.\nRedirecting to Add Stock.`);
        try {
          window.dispatchEvent(new CustomEvent('open-add-stock', { detail: { medicineId: matched.id } }));
        } catch {}
        onClose?.();
        return;
      }
    }

    if (payload.category === 'new') {
      const newCat = (customCategory || '').trim();
      if (!newCat) {
        alert('Please enter a category name');
        return;
      }
      payload.category = newCat;
    }

    onSubmit(payload);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const defaultCategories = [
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
  ];

  const categoriesList = Array.isArray(categories) && categories.length > 0
    ? Array.from(new Set(categories.filter(Boolean)))
    : defaultCategories;

  const dosageForms = [
    'tablet',
    'capsule',
    'syrup',
    'injection',
    'ointment',
    'cream',
    'drops',
    'inhaler',
    'suppository',
    'other'
  ];

  const totalPieces =
    formData.unit === 'boxes'
      ? Number(formData.quantity || 0) * Number(formData.blisterCount || 1) * Number(formData.tabletCount || 1)
      : Number(formData.quantity || 0);
  const finalUnitLabel =
    formData.unit === 'boxes' ? (formData.subUnitType || 'tablets') : (formData.unit || 'units');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {medicine ? 'Edit Medicine' : 'Add New Medicine'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter medicine name"
                disabled={!!medicine}
              />
              {medicine && <p className="text-xs text-muted-foreground mt-1">Product name cannot be changed.</p>}
            </div>

            <div>
              <label htmlFor="supplier" className="block text-sm font-medium mb-1">
                Supplier (Optional)
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Supplier name"
                disabled={!!medicine}
              />
            </div>

            <div>
              <label htmlFor="dosageForm" className="block text-sm font-medium mb-1">
                Dosage Form *
              </label>
              <select
                id="dosageForm"
                name="dosageForm"
                value={formData.dosageForm}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                disabled={!!medicine}
              >
                {dosageForms.map(form => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Dosage / Strength *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  name="strengthValue"
                  value={formData.strengthValue}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="col-span-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 500"
                  disabled={!!medicine}
                />
                <select
                  name="strengthUnit"
                  value={formData.strengthUnit}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!medicine}
                >
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">
                Category *
              </label>
              <div className="space-y-2">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="new">+ Create New Category</option>
                </select>
                {formData.category === 'new' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required={!medicine}
                min="0"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!medicine}
              />
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-medium mb-1">
                Unit *
              </label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>

            {formData.unit === 'boxes' && !medicine && (
              <>
                <div>
                  <label htmlFor="blisterCount" className="block text-sm font-medium mb-1">
                    Blister Packs/Strips per Box *
                  </label>
                  <input
                    type="number"
                    id="blisterCount"
                    name="blisterCount"
                    value={formData.blisterCount}
                    onChange={handleChange}
                    min="1"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="tabletCount" className="block text-sm font-medium mb-1">
                    Tablets/Capsules per Blister/Strip *
                  </label>
                  <input
                    type="number"
                    id="tabletCount"
                    name="tabletCount"
                    value={formData.tabletCount}
                    onChange={handleChange}
                    min="1"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="subUnitType" className="block text-sm font-medium mb-1">
                    Final Unit Type *
                  </label>
                  <select
                    id="subUnitType"
                    name="subUnitType"
                    value={formData.subUnitType}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tablets">Tablets</option>
                    <option value="capsules">Capsules</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-blue-50 px-3 py-2 rounded-md border border-blue-100 text-blue-700 text-sm">
                    Total {formData.subUnitType || 'tablets'}: <span className="font-bold">{totalPieces}</span>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">
                Price (₱) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                required={!medicine}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!medicine}
              />
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              {medicine ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
