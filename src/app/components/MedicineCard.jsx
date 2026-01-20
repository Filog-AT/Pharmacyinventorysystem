import { Package, Calendar, AlertTriangle, Edit, Trash2 } from 'lucide-react';

export function MedicineCard({ medicine, onEdit, onDelete }) {
  // Safety check for medicine object
  if (!medicine || !medicine.id) {
    return null;
  }

  const isExpiringSoon = () => {
    const today = new Date();
    const expiryDate = new Date(medicine.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    const today = new Date();
    const expiryDate = new Date(medicine.expiryDate);
    return expiryDate < today;
  };

  const isLowStock = medicine.quantity && medicine.minStockLevel && medicine.quantity <= medicine.minStockLevel;

  const getStockStatusColor = () => {
    if (isExpired()) return 'bg-red-100 text-red-800 border-red-200';
    if (isLowStock) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (isExpiringSoon()) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getStockStatusColor()}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{medicine.name}</h3>
          <p className="text-sm opacity-75">{medicine.category}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(medicine)}
            className="p-2 hover:bg-white/50 rounded-md transition-colors"
            aria-label="Edit medicine"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(medicine.id)}
            className="p-2 hover:bg-white/50 rounded-md transition-colors"
            aria-label="Delete medicine"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4" />
          <span className="font-medium">Stock: {medicine.quantity || 0} {medicine.unit || 'units'}</span>
          {isLowStock && (
            <span className="ml-auto flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              Low Stock
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4" />
          <span>Expires: {medicine.expiryDate ? formatDate(medicine.expiryDate) : 'N/A'}</span>
          {isExpired() && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              Expired
            </span>
          )}
          {isExpiringSoon() && !isExpired() && (
            <span className="ml-auto text-xs">Almost Expire</span>
          )}
        </div>

        <div className="text-sm pt-2 border-t border-current/20">
          <span className="opacity-75">Supplier:</span> <span className="font-medium">{medicine.supplier || 'N/A'}</span>
        </div>

        <div className="text-sm">
          <span className="opacity-75">Price:</span> <span className="font-medium">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(medicine.price || 0)}</span>
        </div>
      </div>
    </div>
  );
}
