export function StatsCard({ title, value, icon: Icon, color, onClick }) {
  // Handle NaN values
  const displayValue = typeof value === 'number' && isNaN(value) ? 0 : value;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg p-6 ${color} border-2 transition-colors ${onClick ? 'hover:opacity-90 cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-75 mb-1">{title}</p>
          <p className="text-3xl font-semibold">{displayValue}</p>
        </div>
        <div className="p-3 bg-white/50 rounded-lg">
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </button>
  );
}
