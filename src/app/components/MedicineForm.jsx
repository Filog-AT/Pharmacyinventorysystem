import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const categories = [
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

const units = ['tablets', 'capsules', 'bottles', 'boxes'];

export function MedicineForm({ medicine, categories, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Antibiotic',
    quantity: 0,
    unit: 'tablets',
    dosageAmount: 0,
    dosageUnit: 'mg',
    minStockLevel: 0,
    expiryDate: '',
    supplier: '',
    price: 0,
    blisterCount: 1,
    tabletCount: 1,
    subUnitType: 'tablets'
  });

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name,
        category: medicine.category,
        quantity: medicine.quantity,
        unit: medicine.unit,
        dosageAmount: Number(medicine.dosageAmount || 0),
        dosageUnit: medicine.dosageUnit || (medicine.dosage?.toLowerCase().includes('ml') ? 'ml' : 'mg'),
        minStockLevel: medicine.minStockLevel,
        expiryDate: medicine.expiryDate,
        supplier: medicine.supplier,
        price: medicine.price,
        blisterCount: 1,
        tabletCount: 1,
        subUnitType: (medicine.unit === 'capsules' ? 'capsules' : 'tablets')
      });
    }
  }, [medicine]);

  const [customCategory, setCustomCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = { ...formData };
    payload.name = (payload.name || '').trim();
    // Normalize dosage fields for compatibility
    if (!payload.dosage && Number(payload.dosageAmount || 0) > 0 && payload.dosageUnit) {
      payload.dosage = `${Number(payload.dosageAmount)}${payload.dosageUnit}`;
    }
    if (payload.category === 'new') {
      const newCat = (customCategory || '').trim();
      if (!newCat) {
        alert('Please enter a category name');
        return;
      }
      payload.category = newCat;
    }
    if (!medicine && payload.unit === 'boxes') {
      const totalPieces = (payload.quantity || 0) * (payload.blisterCount || 1) * (payload.tabletCount || 1);
      payload = {
        ...payload,
        quantity: totalPieces,
        unit: payload.subUnitType || 'tablets'
      };
    }
    onSubmit(payload);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
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

  const categoriesList = Array.isArray(categories) && categories.length > 0 ? categories : defaultCategories;

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
          <div>
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="supplier" className="block text-sm font-medium mb-1">
                Supplier
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Supplier name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                required
                min="0"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Dosage / Strength
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="dosageAmount"
                  value={formData.dosageAmount}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 500"
                />
                <select
                  name="dosageUnit"
                  value={formData.dosageUnit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                required
                min="0"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.unit === 'boxes' && !medicine && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
                    required
                    min="1"
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
                    required
                    min="1"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    <option value="tablets">tablets</option>
                    <option value="capsules">capsules</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-gray-600">
                    Total {formData.subUnitType}: {(formData.quantity || 0) * (formData.blisterCount || 1) * (formData.tabletCount || 1)}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            {medicine && (
              <div>
                <label htmlFor="minStockLevel" className="block text-sm font-medium mb-1">
                  Min Stock Level *
                </label>
                <input
                  type="number"
                  id="minStockLevel"
                  name="minStockLevel"
                  value={formData.minStockLevel}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              {medicine ? 'Update Medicine' : 'Add Medicine'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
