import { LayoutDashboard, FolderTree, ShoppingCart, Users, FileText, Bell, Settings, Menu, X } from 'lucide-react';
import { SidebarItem } from '@/app/components/SidebarItem';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'sales', label: 'Sales/POS', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function Sidebar({ activePage, onPageChange, isOpen, onToggle }) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">PharmaCare</h2>
              <p className="text-xs text-gray-500">Inventory System</p>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activePage === item.id}
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
          <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Need Help?</p>
              <p className="text-xs text-blue-700">Contact support for assistance</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden bg-white p-2 rounded-md shadow-lg border border-gray-200"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}
