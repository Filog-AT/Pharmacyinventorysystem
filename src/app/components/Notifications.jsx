import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, CheckCircle, X, Bell } from 'lucide-react';

export function Notifications({ medicines, onNavigateToTab }) {
  const loadRead = () => {
    try {
      const raw = localStorage.getItem('pharmacy_read_notifications');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };
  const saveRead = (ids) => {
    try {
      localStorage.setItem('pharmacy_read_notifications', JSON.stringify(Array.from(ids)));
    } catch {}
  };

  const generateNotifications = () => {
    const notifications = [];
    const today = new Date();

    medicines.forEach(med => {
      if (!med || !med.id) return; // Skip invalid medicines

      // Low stock notifications
      const qty = Number(med.totalQuantity || 0);
      const lowStockThreshold = med.minStockLevel || 50;
      
      if (qty <= lowStockThreshold) {
        notifications.push({
          id: `low-${med.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${med.name || 'Unknown medicine'} is running low. Current stock: ${qty} ${med.unit || 'units'}`,
          time: 'Recent',
          read: false
        });
      }

      // Expiry notifications from batches
      if (med.batches && Array.isArray(med.batches)) {
        med.batches.forEach(batch => {
          if (!batch.expiryDate) return;
          const expiryDate = new Date(batch.expiryDate);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0) {
            notifications.push({
              id: `expired-${med.id}-${batch.id}`,
              type: 'error',
              title: 'Expired Batch',
              message: `${med.name} (Batch: ${batch.batchNumber}) has expired. Please remove ${batch.quantity} units from inventory.`,
              time: 'Alert',
              read: false
            });
          } else if (daysUntilExpiry <= 90) { // Notify 3 months before
            notifications.push({
              id: `expiring-${med.id}-${batch.id}`,
              type: 'warning',
              title: 'Batch Expiring Soon',
              message: `${med.name} (Batch: ${batch.batchNumber}) will expire in ${daysUntilExpiry} days.`,
              time: 'Alert',
              read: false
            });
          }
        });
      }
    });

    // Add some general notifications
    notifications.push(
      {
        id: 'general-1',
        type: 'success',
        title: 'New Order Received',
        message: 'Order #1234 has been successfully placed with PharmaCorp.',
        time: '5 hours ago',
        read: true
      },
      {
        id: 'general-2',
        type: 'info',
        title: 'System Update',
        message: 'The inventory system will be updated tonight at 2 AM.',
        time: '1 day ago',
        read: true
      }
    );

    return notifications;
  };

  const [notifications, setNotifications] = useState(() => {
    const base = generateNotifications();
    const read = loadRead();
    const isRead = (id) => {
      if (read.has(id)) return true;
      if (id.startsWith('expiring-')) {
        return read.has(id.replace('expiring-', 'expired-'));
      }
      if (id.startsWith('expired-')) {
        return read.has(id.replace('expired-', 'expiring-'));
      }
      return false;
    };
    return base.map(n => ({ ...n, read: isRead(n.id) ? true : n.read }));
  });
  useEffect(() => {
    const base = generateNotifications();
    const read = loadRead();
    const isRead = (id) => {
      if (read.has(id)) return true;
      if (id.startsWith('expiring-')) return read.has(id.replace('expiring-', 'expired-'));
      if (id.startsWith('expired-')) return read.has(id.replace('expired-', 'expiring-'));
      return false;
    };
    setNotifications(base.map(n => ({ ...n, read: isRead(n.id) ? true : n.read })));
  }, [medicines]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [filterType, setFilterType] = useState('all'); // 'all' | 'error' | 'warning' | 'info' | 'success'
  const visibleNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    return n.type === filterType || (filterType === 'info' && (n.type === 'info' || n.type === 'success'));
  });

  const getIcon = (type) => {
    return Bell;
  };

  const getColorClasses = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm ring-1 ring-amber-400/20';
      case 'error':
        return 'bg-rose-100 border-rose-300 text-rose-900 shadow-sm ring-1 ring-rose-400/20';
      case 'success':
        return 'bg-emerald-100 border-emerald-300 text-emerald-900';
      default:
        return 'bg-sky-100 border-sky-300 text-sky-900';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab?.('dashboard')}
            className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm"
            aria-label="Back"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">Stay updated with important alerts and messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 border rounded-full px-3 py-1 bg-white select-none">
            {unreadCount} unread
          </span>
          <button
            onClick={() => {
              const allIds = new Set(notifications.map(n => n.id));
              saveRead(allIds);
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`text-left rounded-lg border-2 p-4 ${filterType==='all' ? 'bg-gray-200 border-gray-300' : 'bg-white border-gray-200'}`}
        >
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
        </button>
        <button
          onClick={() => setFilterType('error')}
          className={`text-left rounded-lg border-2 p-4 ${filterType==='error' ? 'bg-red-200 border-red-300' : 'bg-red-100 border-red-200'}`}
        >
          <p className="text-sm text-red-800 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-900">
            {notifications.filter(n => n.type === 'error').length}
          </p>
        </button>
        <button
          onClick={() => setFilterType('warning')}
          className={`text-left rounded-lg border-2 p-4 ${filterType==='warning' ? 'bg-yellow-200 border-yellow-300' : 'bg-yellow-100 border-yellow-200'}`}
        >
          <p className="text-sm text-yellow-800 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-yellow-900">
            {notifications.filter(n => n.type === 'warning').length}
          </p>
        </button>
        <button
          onClick={() => setFilterType('info')}
          className={`text-left rounded-lg border-2 p-4 ${filterType==='info' ? 'bg-blue-200 border-blue-300' : 'bg-blue-100 border-blue-200'}`}
        >
          <p className="text-sm text-blue-800 mb-1">Info</p>
          <p className="text-2xl font-bold text-blue-900">
            {notifications.filter(n => n.type === 'info' || n.type === 'success').length}
          </p>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {visibleNotifications.map(notification => {
          const Icon = getIcon(notification.type);
          return (
            <div
              key={notification.id}
              className={`rounded-lg border-2 p-4 transition-all ${
                notification.read ? 'bg-gray-50 border-gray-200 opacity-60' : getColorClasses(notification.type)
              }`}
              onClick={() => {
                // Mark as read when clicked
                if (!notification.read) {
                  const read = loadRead();
                  read.add(notification.id);
                  saveRead(read);
                  setNotifications(prev => prev.map(n => 
                    n.id === notification.id ? { ...n, read: true } : n
                  ));
                }

                if (notification.type === 'error' || notification.type === 'warning') {
                  onNavigateToTab?.('inventory');
                } else {
                  onNavigateToTab?.('dashboard');
                }
              }}
            >
              <div className="flex gap-4">
                <div className={`flex-shrink-0 p-2 rounded-lg ${notification.read ? 'bg-gray-200' : 'bg-white/50'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-lg">{notification.title}</h3>
                    <span className="text-xs opacity-75">{notification.time}</span>
                  </div>
                  <p className="text-sm opacity-90">{notification.message}</p>
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const read = loadRead();
                        read.add(notification.id);
                        saveRead(read);
                        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                      }}
                      className="mt-2 text-sm font-medium hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No notifications</p>
          <p className="text-gray-400 text-sm mt-2">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
