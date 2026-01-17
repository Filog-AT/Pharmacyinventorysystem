export function StatsCard({ title, value, icon: Icon, color }) {
  return (
    <div className={`rounded-lg p-6 ${color} border-2`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-75 mb-1">{title}</p>
          <p className="text-3xl font-semibold">{value}</p>
        </div>
        <div className="p-3 bg-white/50 rounded-lg">
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
