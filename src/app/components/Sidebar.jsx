import { useState } from 'react';
import { LayoutDashboard, FolderTree, Users, FileText, Bell, Settings, Menu, X, LogOut, UserCircle, ShoppingCart, TrendingUp } from 'lucide-react';
import { SidebarItem } from '@/app/components/SidebarItem';

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'staff'] },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, roles: ['manager'] },
  { id: 'inventory', label: 'Inventory', icon: FolderTree, roles: ['manager'] },
  { id: 'receipts', label: 'Sales', icon: ShoppingCart, roles: ['staff'] },
  { id: 'activity', label: 'Activity Logs', icon: FileText, roles: ['manager'] },
  { id: 'orders', label: 'Orders & Suppliers', icon: FileText, roles: [] },
  { id: 'customers', label: 'Customers', icon: Users, roles: [] },
  { id: 'reports', label: 'Reports', icon: FileText, roles: [] },
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: [] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['manager'] }
];

const roleColors = {
  manager: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-500' },
  staff: { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-500' }
};

export function Sidebar({ 
  activePage, 
  onPageChange, 
  isOpen, 
  onToggle, 
  userRole, 
  userName, 
  onLogout, 
  pharmacyName,
  logoUrl,
  sidebarColor 
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));
  const roleColor = roleColors[userRole] || roleColors.staff;

  // Calculate text contrast based on sidebarColor
  const getContrastColor = (hexcolor) => {
    if (!hexcolor) return '';
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'text-gray-900' : 'text-white';
  };

  const contrastClass = sidebarColor ? getContrastColor(sidebarColor) : 'text-card-foreground';
  const mutedContrastClass = sidebarColor ? (getContrastColor(sidebarColor) === 'text-white' ? 'text-blue-100' : 'text-gray-500') : 'text-muted-foreground';

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  return (
    <>
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Sign Out</h3>
              <p className="text-gray-500 mb-6">Are you sure you want to sign out of the system? Any unsaved changes may be lost.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-100 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full border-r z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 ${!sidebarColor ? 'bg-card' : ''}`}
        style={sidebarColor ? { backgroundColor: sidebarColor } : {}}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 border-b flex flex-col gap-4 ${sidebarColor ? 'border-white/10' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${contrastClass}`}>{pharmacyName || 'PharmaCare'}</h2>
                <p className={`text-xs ${mutedContrastClass}`}>Inventory System</p>
              </div>
              <button
                onClick={onToggle}
                className={`lg:hidden p-2 rounded-md ${sidebarColor ? 'hover:bg-white/10' : 'hover:bg-muted'}`}
              >
                <X className={`w-5 h-5 ${contrastClass}`} />
              </button>
            </div>

            {/* Logo Display */}
            {logoUrl && (
              <div className="w-full flex justify-center py-4 animate-in fade-in zoom-in duration-500">
                <div className="w-40 h-40 rounded-2xl bg-white/90 p-3 shadow-inner flex items-center justify-center overflow-hidden border border-white/20">
                  <img src={logoUrl} alt="Pharmacy Logo" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className={`p-4 border-b ${sidebarColor ? 'border-white/10 bg-black/10' : roleColor.bg}`}>
            <div className="flex items-start gap-3">
              <div className={`${roleColor.badge} rounded-full p-2 text-white shadow-sm`}>
                <UserCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                  sidebarColor 
                    ? 'bg-white/20 text-white border-white/30' 
                    : `${roleColor.text} ${roleColor.bg} border-current`
                }`}>
                  {userRole}
                </span>
                <p className={`text-sm font-medium mt-1 truncate ${contrastClass}`}>{userName}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activePage === item.id}
                sidebarColor={sidebarColor}
                contrastClass={contrastClass}
                onClick={() => {
                  onPageChange(item.id);
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t ${sidebarColor ? 'border-white/10' : 'border-gray-100'} space-y-2`}>
            <button
              onClick={handleLogoutClick}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all font-bold text-sm border shadow-sm ${
                sidebarColor
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-100'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden bg-card p-2 rounded-md shadow-lg border"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}
