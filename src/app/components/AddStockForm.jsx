import { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';

export function AddStockForm({ medicines, onSubmit, onClose, initialMedicineId }) {
  const [formData, setFormData] = useState({
    medicineId: initialMedicineId || '',
    batchNumber: '',
    expiryDate: '',
    supplier: '',
    boxesReceived: 0,
    blistersPerBox: 1,
    unitsPerBlister: 1,
  });

  const [totalUnits, setTotalUnits] = useState(0);

  useEffect(() => {
    const total = (formData.boxesReceived || 0) * (formData.blistersPerBox || 1) * (formData.unitsPerBlister || 1);
    setTotalUnits(total);
  }, [formData.boxesReceived, formData.blistersPerBox, formData.unitsPerBlister]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.medicineId) {
      alert('Please select a medicine');
      return;
    }
    
    // Convert string inputs to numbers where appropriate
    const boxes = Number(formData.boxesReceived || 0);
    const blisters = Number(formData.blistersPerBox || 1);
    const units = Number(formData.unitsPerBlister || 1);

    if (boxes <= 0) {
      alert('Boxes received must be greater than 0');
      return;
    }

    onSubmit(formData.medicineId, {
      batchNumber: (formData.batchNumber || '').trim(),
      expiryDate: formData.expiryDate,
      supplier: (formData.supplier || '').trim(),
      boxesReceived: boxes,
      blistersPerBox: blisters,
      unitsPerBlister: units,
    });
  };

  const selectedMedicine = medicines.find(m => m.id === formData.medicineId);
  const isBottle = (() => {
    const form = String(selectedMedicine?.dosageForm || '').toLowerCase().trim();
    const unit = String(selectedMedicine?.unit || '').toLowerCase().trim();
    const bottleForms = new Set(['bottle']);
    const bottleUnits = new Set(['bottle', 'bottles']);
    return bottleForms.has(form) || bottleUnits.has(unit);
  })();

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

            <div className="col-span-2">
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

            <div className="border-t col-span-2 pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Stock Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="boxesReceived" className="block text-xs font-medium mb-1">
                    {isBottle ? 'Bottles Received' : 'Boxes Received'}
                  </label>
                  <input
                    type="number"
                    id="boxesReceived"
                    name="boxesReceived"
                    value={formData.boxesReceived}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {!isBottle && (
                  <>
                    <div>
                      <label htmlFor="blistersPerBox" className="block text-xs font-medium mb-1">
                        Blisters per Box
                      </label>
                      <input
                        type="number"
                        id="blistersPerBox"
                        name="blistersPerBox"
                        value={formData.blistersPerBox}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="unitsPerBlister" className="block text-xs font-medium mb-1">
                        Units per Blister
                      </label>
                      <input
                        type="number"
                        id="unitsPerBlister"
                        name="unitsPerBlister"
                        value={formData.unitsPerBlister}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
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
