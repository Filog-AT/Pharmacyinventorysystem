import { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';

export function MedicineForm({ medicine, categories, medicines = [], onSubmit, onClose }) {
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
    tag: 'Non-Prescription',
    // Variation fields
    dosageForm: 'tablet',
    strengthValue: '',
    strengthUnit: 'mg',
    price: 0,
    blisterCount: 1,
    tabletCount: 1,
    unit: 'boxes',
    subUnitType: 'tablets',
    minStockLevel: 50,
  });

  // Derived duplicate check
  const duplicateError = useMemo(() => {
    if (!formData.name) return null;
    
    const sv = String(formData.strengthValue || '').trim();
    const su = String(formData.strengthUnit || 'mg').trim();
    const strength = sv ? `${sv}${su}`.toLowerCase() : '';
    
    const name = formData.name.trim().toLowerCase();
    const brand = (formData.brandName || '').trim().toLowerCase();
    const form = formData.dosageForm.trim().toLowerCase();

    // Check against medicines list
    const isDuplicate = medicines.some(m => 
      m.id !== medicine?.id && // Don't match self if editing
      String(m.name || '').trim().toLowerCase() === name &&
      String(m.brandName || '').trim().toLowerCase() === brand &&
      String(m.dosageForm || '').trim().toLowerCase() === form &&
      String(m.strength || '').trim().toLowerCase() === strength
    );

    if (isDuplicate) {
      return `"${formData.name}" with this brand and variation already exists in your inventory.`;
    }
    return null;
  }, [formData.name, formData.brandName, formData.dosageForm, formData.strengthValue, formData.strengthUnit, medicines, medicine?.id]);

  // Sync unit and subUnitType with dosageForm
  useEffect(() => {
    const formPlural = formData.dosageForm === 'tablet' ? 'tablets' : 
                       formData.dosageForm === 'capsule' ? 'capsules' : 
                       formData.dosageForm === 'syrup' ? 'bottles' : 
                       formData.dosageForm === 'injection' ? 'vials' : 
                       formData.dosageForm === 'ointment' ? 'tubes' : 'units';
    
    setFormData(prev => ({
      ...prev,
      subUnitType: formPlural
    }));
  }, [formData.dosageForm]);

  useEffect(() => {
    if (medicine && !formData.name) {
      setFormData({
        name: medicine.name,
        brandName: medicine.brandName || '',
        category: medicine.category || 'Antibiotic',
        tag: medicine.tag || 'Non-Prescription',
        dosageForm: medicine.dosageForm || 'tablet',
        strengthValue: (() => {
          const m = String(medicine.strength || '').trim().match(/(\d+(?:\.\d+)?)/);
          return m ? m[1] : '';
        })(),
        strengthUnit: (() => {
          const m = String(medicine.strength || '').trim().toLowerCase().match(/(mg|ml|g)$/);
          return m ? m[1] : 'mg';
        })(),
        price: medicine.price || 0,
        unit: 'boxes',
        blisterCount: medicine.blisterCount || medicine.defaultBlistersPerBox || 1,
        tabletCount: medicine.tabletCount || medicine.defaultUnitsPerBlister || 1,
        subUnitType: medicine.subUnitType || 'tablets',
        minStockLevel: Math.max(50, Number(medicine.minStockLevel || 0)),
      });
    }
  }, [medicine]);

  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duplicateError) return; // Prevent submission if duplicate
    setSubmitting(true);
    
    let payload = { ...formData };
    payload.name = (payload.name || '').trim();
    payload.brandName = (payload.brandName || '').trim();
    const sv = String(payload.strengthValue || '').trim();
    const su = String(payload.strengthUnit || 'mg').trim();
    payload.strength = sv ? `${sv}${su}` : '';
    payload.dosageForm = (payload.dosageForm || 'tablet').trim();
    
    const blisters = Number(payload.blisterCount || 1);
    const perBlister = Number(payload.tabletCount || 1);

    if (!payload.strength) {
      alert('Please enter dosage/strength');
      setSubmitting(false);
      return;
    }
    if (blisters <= 0 || perBlister <= 0) {
      alert('Blister and per-blister counts must be greater than 0');
      setSubmitting(false);
      return;
    }
    
    payload.defaultBlistersPerBox = blisters;
    payload.defaultUnitsPerBlister = perBlister;
    payload.unit = 'boxes';

    if (payload.category === 'new') {
      const newCat = (customCategory || '').trim();
      if (!newCat) {
        alert('Please enter a category name');
        setSubmitting(false);
        return;
      }
      payload.category = newCat;
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
            {duplicateError && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 font-medium">
                  {duplicateError}
                  <p className="mt-1 text-xs text-red-600 font-normal">Please use a different name/brand or update the existing product.</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  disabled={!!medicine?.id || medicine?.isVariation}
                />
              </div>

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
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  disabled={!!medicine?.id || medicine?.isVariation}
                >
                  <option value="Non-Prescription">Non-Prescription</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Vitamins">Vitamins</option>
                </select>
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
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    disabled={!!medicine?.id || medicine?.isVariation}
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
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Variation Details</h3>
              <div className="grid grid-cols-2 gap-4">
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
                    />
                    <select
                      name="strengthUnit"
                      value={formData.strengthUnit}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>

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

                <div>
                  <label htmlFor="minStockLevel" className="block text-sm font-medium mb-1">
                    Min Stock Level (Units)
                  </label>
                  <input
                    type="number"
                    id="minStockLevel"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2 bg-gray-50/50 p-4 rounded-lg border border-dashed border-gray-200">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Inventory Setup (Boxes)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-blue-800 font-bold">
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
                    <div>
                      <label className="block text-sm font-medium mb-1 text-blue-800 font-bold">
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
                      <div className="text-xs text-blue-800 italic">
                        Selling unit is automatically set to <strong>Boxes</strong>.
                      </div>
                      <div className="text-xs font-bold text-blue-700">
                        1 Box = {Number(formData.blisterCount || 1) * Number(formData.tabletCount || 1)} {formData.subUnitType || 'units'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
              {medicine?.isVariation ? 'Add Variation' : (medicine?.id ? 'Save Changes' : 'Save Medicine')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
