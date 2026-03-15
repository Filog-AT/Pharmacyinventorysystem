import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function DeleteWarningModal({ isOpen, onClose, onConfirm, title, message, itemName }) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title || 'Confirm Delete'}</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              {message || 'Are you sure you want to delete this item?'}
            </p>
            {itemName && (
              <p className="mt-2 text-sm font-bold text-red-700">
                Item: {itemName}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold transition-colors shadow-sm"
            >
              Delete Item
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
