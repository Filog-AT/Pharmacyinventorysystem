import { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import * as addStockBackend from '@/backend/addStockBackend';

export function AddStockForm({ medicines, onSubmit, onClose, initialMedicineId }) {
  const [formData, setFormData] = useState({
    medicineId: initialMedicineId || '',
    batchNumber: '',
    expiryDate: '',
    supplier: '',
    boxesReceived: 0,
    blistersPerBox: 1,
    unitsPerBlister: 1,
    dateReceived: new Date().toISOString().split('T')[0],
  });

  const [totalUnits, setTotalUnits] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const selectedMedicine = medicines.find(m => m.id === formData.medicineId);
  const isBottle = addStockBackend.isBottle(selectedMedicine);

  useEffect(() => {
    if (selectedMedicine) {
      setFormData(prev => ({
        ...prev,
        blistersPerBox: selectedMedicine.defaultBlistersPerBox || 1,
        unitsPerBlister: selectedMedicine.defaultUnitsPerBlister || 1,
        supplier: selectedMedicine.supplier || prev.supplier
      }));
    }
  }, [selectedMedicine?.id]);

  useEffect(() => {
    // Prevent background scrolling when form is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const total = addStockBackend.calculateTotalUnits(formData.boxesReceived, formData.blistersPerBox, formData.unitsPerBlister);
    setTotalUnits(total);
  }, [formData.boxesReceived, formData.blistersPerBox, formData.unitsPerBlister]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = addStockBackend.validateFormData(formData);
    if (error) {
      alert(error);
      return;
    }
    
    // Convert string inputs to numbers where appropriate
    const boxes = Number(formData.boxesReceived || 0);
    const blisters = Number(formData.blistersPerBox || 1);
    const units = Number(formData.unitsPerBlister || 1);

    setSubmitting(true);
    try {
      await onSubmit(formData.medicineId, {
        batchNumber: (formData.batchNumber || '').trim(),
        expiryDate: formData.expiryDate,
        dateReceived: formData.dateReceived,
        supplier: (formData.supplier || '').trim(),
        boxesReceived: boxes,
        blistersPerBox: blisters,
        unitsPerBlister: units,
      });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isBottle) {
      setFormData(prev => ({
        ...prev,
        blistersPerBox: 1,
        unitsPerBlister: 1,
      }));
    }
  }, [isBottle]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Submitting Overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-[60] flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-900 font-bold">Adding Stock...</p>
          </div>
        )}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Add Stock
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="medicineId" className="block text-sm font-medium mb-1">
                Select Medicine *
              </label>
              <select
                id="medicineId"
                name="medicineId"
                value={formData.medicineId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Medicine --</option>
                {medicines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.strength} - {m.dosageForm})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="batchNumber" className="block text-sm font-medium mb-1">
                Batch/Lot Number *
              </label>
              <input
                type="text"
                id="batchNumber"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter batch number"
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
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
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
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium mb-1">
                  Supplier *
                </label>
                <input
                  type="text"
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier name"
                />
              </div>
            </div>

            <div className="border-t col-span-2 pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Stock Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label htmlFor="boxesReceived" className="block text-sm font-medium mb-1">
                    {isBottle ? 'Bottles Received *' : 'Boxes Received *'}
                  </label>
                  <input
                    type="number"
                    id="boxesReceived"
                    name="boxesReceived"
                    value={formData.boxesReceived}
                    onChange={handleChange}
                    min="1"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                    placeholder="Enter quantity"
                  />
                </div>
                {/* Hidden manual inputs for blisters/units as they are now pulled from variation defaults */}
                <input type="hidden" name="blistersPerBox" value={formData.blistersPerBox} />
                <input type="hidden" name="unitsPerBlister" value={formData.unitsPerBlister} />
              </div>
              {!isBottle && (
                <p className="text-[10px] text-gray-500 mt-2 italic">
                  * Using saved variation defaults: {formData.blistersPerBox} blisters/box, {formData.unitsPerBlister} units/blister
                </p>
              )}
            </div>

            <div className="col-span-2 bg-blue-50 p-3 rounded-md flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Total Units to Add:</span>
              <span className="text-lg font-bold text-blue-600">
                {totalUnits} {isBottle ? 'bottles' : (selectedMedicine?.unit || 'units')}
              </span>
            </div>

            <div className="col-span-2 bg-gray-50 p-3 rounded-md border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Current Medicine Price</span>
                <span className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(selectedMedicine?.price || 0))}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Price is set in the Edit Medicine action.
              </p>
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
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Receive Delivery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
