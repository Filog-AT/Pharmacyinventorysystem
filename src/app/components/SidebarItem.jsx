export function SidebarItem({ icon: Icon, label, active, onClick, sidebarColor, contrastClass }) {
  const activeClass = sidebarColor 
    ? 'bg-white/20 text-white shadow-sm' 
    : 'bg-blue-600 text-white';
    
  const inactiveClass = sidebarColor
    ? `${contrastClass} hover:bg-white/10`
    : 'text-gray-700 hover:bg-gray-100';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
        active ? activeClass : inactiveClass
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'scale-110' : 'opacity-80'}`} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}
