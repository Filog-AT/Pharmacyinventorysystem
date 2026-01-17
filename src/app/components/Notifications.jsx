import { AlertTriangle, Calendar, Package, CheckCircle, X } from 'lucide-react';

export function Notifications({ medicines }) {
  const generateNotifications = () => {
    const notifications = [];
    const today = new Date();

    medicines.forEach(med => {
      // Low stock notifications
      if (med.quantity <= med.minStockLevel) {
        notifications.push({
          id: `low-${med.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${med.name} is running low. Current stock: ${med.quantity} ${med.unit}`,
          time: '2 hours ago',
          read: false
        });
      }

      // Expiry notifications
      const expiryDate = new Date(med.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        notifications.push({
          id: `expired-${med.id}`,
          type: 'error',
          title: 'Expired Medicine',
          message: `${med.name} has expired. Please remove from inventory.`,
          time: '1 day ago',
          read: false
        });
      } else if (daysUntilExpiry <= 30) {
        notifications.push({
          id: `expiring-${med.id}`,
          type: 'warning',
          title: 'Expiring Soon',
          message: `${med.name} will expire in ${daysUntilExpiry} days.`,
          time: '3 hours ago',
          read: false
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

  const notifications = generateNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'error':
        return X;
      case 'success':
        return CheckCircle;
      default:
        return Package;
    }
  };

  const getColorClasses = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'success':
        return 'bg-green-100 border-green-200 text-green-800';
      default:
        return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Stay updated with important alerts and messages</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            {unreadCount} Unread
          </span>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Mark All Read
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
        </div>
        <div className="bg-red-100 border-2 border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-900">
            {notifications.filter(n => n.type === 'error').length}
          </p>
        </div>
        <div className="bg-yellow-100 border-2 border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-yellow-900">
            {notifications.filter(n => n.type === 'warning').length}
          </p>
        </div>
        <div className="bg-blue-100 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-1">Info</p>
          <p className="text-2xl font-bold text-blue-900">
            {notifications.filter(n => n.type === 'info' || n.type === 'success').length}
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map(notification => {
          const Icon = getIcon(notification.type);
          return (
            <div
              key={notification.id}
              className={`rounded-lg border-2 p-4 transition-all ${
                notification.read ? 'bg-gray-50 border-gray-200 opacity-60' : getColorClasses(notification.type)
              }`}
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
                    <button className="mt-2 text-sm font-medium hover:underline">
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
