import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function MedicineForm({ medicine, categories, existingMedicines = [], onSubmit, onClose }) {
  useEffect(() => {
    // Prevent background scrolling when form is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    category: 'Antibiotic',
    dosageForm: 'tablet',
    strength: '',
    tag: 'Non-Prescription', // Default tag
    strengthValue: '',
    strengthUnit: 'mg',
    unit: 'tablets',
    price: 0,
    supplier: '',
    quantity: 0,
    expiryDate: '',
    dateReceived: new Date().toISOString().split('T')[0],
    blisterCount: 1,
    tabletCount: 1,
    subUnitType: 'tablets',
    minStockLevel: 50,
  });

  // Sync unit and subUnitType with dosageForm
  useEffect(() => {
    if (!medicine || medicine.isVariation) {
      const formPlural = formData.dosageForm === 'tablet' ? 'tablets' : 
                         formData.dosageForm === 'capsule' ? 'capsules' : 
                         formData.dosageForm === 'syrup' ? 'bottles' : 
                         formData.dosageForm === 'injection' ? 'vials' : 
                         formData.dosageForm === 'ointment' ? 'tubes' : 'units';
      
      setFormData(prev => ({
        ...prev,
        unit: prev.unit === 'boxes' ? 'boxes' : formPlural,
        subUnitType: formPlural
      }));
    }
  }, [formData.dosageForm, !!medicine]);

  useEffect(() => {
    if (medicine && !formData.name) {
      setFormData({
        name: medicine.name,
        brandName: medicine.brandName || '',
        category: medicine.category || 'Antibiotic',
        dosageForm: medicine.dosageForm || 'tablet',
        strength: medicine.strength || '',
        tag: medicine.tag || 'Non-Prescription',
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
        dateReceived: medicine.dateReceived || new Date().toISOString().split('T')[0],
        blisterCount: medicine.blisterCount || medicine.defaultBlistersPerBox || 1,
        tabletCount: medicine.tabletCount || medicine.defaultUnitsPerBlister || 1,
        subUnitType: medicine.subUnitType || medicine.unit || 'tablets',
        minStockLevel: Math.max(50, Number(medicine.minStockLevel || 0)),
      });
    }
  }, [medicine]);

  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
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

    if (!medicine || medicine.isVariation) {
      if (!payload.name) {
        alert('Please enter medicine name');
        setSubmitting(false);
        return;
      }
      if (!payload.category) {
        alert('Please select a category');
        setSubmitting(false);
        return;
      }
      if (!payload.strength) {
        alert('Please enter dosage/strength');
        setSubmitting(false);
        return;
      }
      if (!payload.unit) {
        alert('Please select a unit');
        setSubmitting(false);
        return;
      }
      if (!payload.expiryDate) {
        alert('Please select an expiry date');
        setSubmitting(false);
        return;
      }
      if (qty <= 0) {
        alert('Quantity must be greater than 0');
        setSubmitting(false);
        return;
      }
      
      // Calculate real total pieces for the initial batch
      if (payload.unit === 'boxes') {
        if (blisters <= 0 || perBlister <= 0) {
          alert('Blister and per-blister counts must be greater than 0');
          setSubmitting(false);
          return;
        }
        const pluralForm = payload.dosageForm === 'tablet' ? 'tablets' : 
                           payload.dosageForm === 'capsule' ? 'capsules' : 'units';
        payload.subUnitType = payload.subUnitType || pluralForm;
        // Keep unit as 'boxes' for onSubmit so handleAddMedicine knows how to process it
      } else {
        payload.subUnitType = payload.unit;
      }
    }

    // Duplicate check for new medicines/variations
    if (!medicine || medicine.isVariation) {
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
        setSubmitting(false);
        onClose?.();
        return;
      }
    }

    if (payload.category === 'new') {
      const newCat = (customCategory || '').trim();
      if (!newCat) {
        alert('Please enter a category name');
        setSubmitting(false);
        return;
      }
      payload.category = newCat;
    }

    // Set defaults if creating a variation/new medicine
    if (!medicine || medicine.isVariation) {
      payload.defaultBlistersPerBox = Number(payload.blisterCount || 1);
      payload.defaultUnitsPerBlister = Number(payload.tabletCount || 1);
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {medicine?.isVariation 
              ? `Add Variation for ${medicine.name}` 
              : (medicine?.id ? 'Edit Medicine' : 'Add New Medicine')}
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
          {medicine?.isVariation && (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-2">
              <p className="text-sm text-blue-800">
                You are adding a new dosage or strength for <span className="font-bold">{medicine.name}</span>.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="brandName" className="block text-sm font-medium mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  id="brandName"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Panadol"
                  disabled={!!medicine?.id}
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Generic Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"
                  placeholder="e.g. Paracetamol"
                  disabled={!!medicine?.id}
                />
              </div>
              {(!!medicine?.id || medicine?.isVariation) && (
                <p className="col-span-2 text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                  {medicine?.isVariation ? 'Adding variation to this product' : 'Product name cannot be changed'}
                </p>
              )}
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
                disabled={!!medicine?.id}
              />
            </div>

            <div>
              <label htmlFor="tag" className="block text-sm font-medium mb-1">
                Tag *
              </label>
              <select
                id="tag"
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Non-Prescription">Non-Prescription</option>
                <option value="Prescription">Prescription</option>
                <option value="Vitamins">Vitamins</option>
              </select>
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
                disabled={!!medicine?.id}
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
                  disabled={!!medicine?.id}
                />
                <select
                  name="strengthUnit"
                  value={formData.strengthUnit}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!medicine?.id}
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
                  {categoriesList.map((cat) => (
                    <option key={cat.id || (cat.name || cat)} value={cat.name || cat}>
                      {cat.name || cat}
                    </option>
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

            {(!medicine || medicine.isVariation) && (
              <div className="col-span-2 bg-gray-50/50 p-4 rounded-lg border border-dashed border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Inventory Setup</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium mb-1">
                      Selling Unit *
                    </label>
                    <select
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="tablets">Tablets</option>
                      <option value="capsules">Capsules</option>
                      <option value="bottles">Bottles</option>
                      <option value="boxes">Boxes</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                      {formData.unit === 'boxes' ? 'Number of Boxes *' : 'Initial Quantity *'}
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder={formData.unit === 'boxes' ? "e.g., 10 boxes" : "e.g., 500 tablets"}
                    />
                  </div>

                  {formData.unit === 'boxes' && (
                    <>
                      <div className="col-span-1">
                        <label htmlFor="blisterCount" className="block text-sm font-medium mb-1 text-blue-800 font-bold">
                          Blisters per Box *
                        </label>
                        <input
                          type="number"
                          id="blisterCount"
                          name="blisterCount"
                          value={formData.blisterCount}
                          onChange={handleChange}
                          min="1"
                          required
                          className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <label htmlFor="tabletCount" className="block text-sm font-medium mb-1 text-blue-800 font-bold">
                          Units per Blister *
                        </label>
                        <input
                          type="number"
                          id="tabletCount"
                          name="tabletCount"
                          value={formData.tabletCount}
                          onChange={handleChange}
                          min="1"
                          required
                          className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between bg-blue-50 p-2 rounded-md border border-blue-100">
                        <div className="text-xs text-blue-800">
                          Final pieces (Inventory total):
                        </div>
                        <div className="font-bold text-blue-700">
                          {totalPieces} {formData.subUnitType || 'tablets'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium mb-1">
                  Selling Price (₱) *
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
                  placeholder="Price per unit"
                />
              </div>

              {(!medicine || medicine.isVariation) && (
                <>
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
                  <div>
                    <label htmlFor="dateReceived" className="block text-sm font-medium mb-1">
                      Date Received *
                    </label>
                    <input
                      type="date"
                      id="dateReceived"
                      name="dateReceived"
                      value={formData.dateReceived}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
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
              {medicine?.isVariation ? 'Add Variation' : (medicine?.id ? 'Save Changes' : 'Add Medicine')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
