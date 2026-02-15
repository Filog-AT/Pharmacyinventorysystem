import { Package, Calendar, AlertTriangle, Edit, Trash2 } from 'lucide-react';

export function MedicineCard({ medicine, onEdit, onDelete }) {
  // Safety check for medicine object
  if (!medicine || !medicine.id) {
    return null;
  }

  const getEarliestExpiry = () => {
    if (!medicine.batches || medicine.batches.length === 0) return null;
    const today = new Date();
    // Prefer non-expired batches first
    const nonExpired = medicine.batches
      .filter(b => b.expiryDate && new Date(b.expiryDate) >= today)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
    if (nonExpired.length > 0) return nonExpired[0].expiryDate;
    
    // If all expired, return the latest one
    return medicine.batches
      .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0]?.expiryDate;
  };

  const isExpiringSoon = () => {
    const today = new Date();
    const earliestExpiry = getEarliestExpiry();
    if (!earliestExpiry) return false;
    const expiryDate = new Date(earliestExpiry);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    const today = new Date();
    const earliestExpiry = getEarliestExpiry();
    if (!earliestExpiry) return false;
    const expiryDate = new Date(earliestExpiry);
    return expiryDate < today;
  };

  const isLowStock = (() => {
    const qty = Number(medicine.totalQuantity || 0);
    const threshold = medicine.minStockLevel || 50;
    return qty <= threshold;
  })();

  const getStockStatusColor = () => {
    if (isExpired()) return 'bg-red-200 text-red-900 border-red-300 font-medium';
    if (isExpiringSoon()) return 'bg-yellow-200 text-yellow-900 border-yellow-300 font-medium';
    if (isLowStock) return 'bg-orange-200 text-orange-900 border-orange-300 font-medium';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const displayExpiry = getEarliestExpiry();

  return (
    <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-lg ${getStockStatusColor()}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">
            {medicine.name}
            {medicine.strength && (
              <span className="ml-2 text-sm font-normal text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{medicine.strength}</span>
            )}
            {medicine.dosageForm && (
              <span className="ml-1 text-xs font-normal text-gray-500 uppercase">{medicine.dosageForm}</span>
            )}
          </h3>
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
          <span className="font-medium">Stock: {medicine.totalQuantity || 0} {medicine.unit || 'units'}</span>
          {isLowStock && (
            <span className="ml-auto flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              Low Stock
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4" />
          <span>Expires: {displayExpiry ? formatDate(displayExpiry) : 'N/A'}</span>
          {isExpired() && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              Expired
            </span>
          )}
          {isExpiringSoon() && !isExpired() && (
            <span className="ml-auto text-xs font-medium">Expiring Soon</span>
          )}
        </div>

        <div className="text-sm pt-2 border-t border-current/20">
          <span className="opacity-75">Supplier:</span> <span className="font-medium">{medicine.batches?.[0]?.supplier || 'N/A'}</span>
        </div>

        <div className="text-sm">
          <span className="opacity-75">Price:</span> <span className="font-medium">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(medicine.price || 0)}</span>
        </div>
      </div>
    </div>
  );
}
