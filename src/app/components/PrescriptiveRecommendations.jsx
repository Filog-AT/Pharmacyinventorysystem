import { Lightbulb, AlertTriangle } from 'lucide-react';
 
export function PrescriptiveRecommendations({ medicines = [] }) {
  const today = new Date();
  const daysBetween = (dateStr) => {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
 
  const recommendations = [];
  for (const m of medicines) {
    const qty = m.quantity || 0;
    const min = m.minStockLevel || 0;
    const daysToExpiry = daysBetween(m.expiryDate);
    const supplier = m.supplier || '';
    const price = Number(m.price || 0);
 
    if (qty <= 0) {
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Stock In +${Math.max(50, min || 50)} (Reorder urgently)`,
      });
      continue;
    }
 
    if (qty <= min) {
      const recommended = Math.ceil((min - qty) + Math.max(10, Math.round(min * 0.25)));
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Reorder +${recommended}`,
      });
      // Additional: suggest raising min stock if consistently low
      if (min < 20) {
        recommendations.push({
          id: `${m.id}-min`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Increase min stock level to ${Math.max(20, Math.ceil(min * 1.5))}`,
        });
      }
      // Additional: supplier-specific order
      if (supplier) {
        recommendations.push({
          id: `${m.id}-order`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Create order with ${supplier}`,
        });
      }
    }
 
    if (daysToExpiry <= 30 && daysToExpiry > 0) {
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Return to distributor/manufacturer (expires in ${daysToExpiry}d)`,
      });
      if (supplier) {
        recommendations.push({
          id: `${m.id}-return-policy`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Check return policy with ${supplier}`,
        });
      }
    }
 
    if (daysToExpiry <= 0) {
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Remove from shelf (expired)`,
      });
      // Skip excess stock suggestion when expired
      continue;
    }
 
    if (qty > (min || 1) * 3) {
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Promote or bundle to reduce excess stock`,
      });
      // Additional: price review for high-stock items
      if (price >= 500) {
        recommendations.push({
          id: `${m.id}-price-review`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Review pricing; consider small discount to improve turnover`,
        });
      }
    }
  }
 
  const top = recommendations.slice(0, 8);
 
  return (
    <div className="bg-card rounded-lg border p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-card-foreground">Prescriptive Recommendations</h2>
      </div>
      {top.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="w-4 h-4" />
          <span>No recommendations at the moment</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left p-3">PRODUCT</th>
                <th className="text-left p-3">STOCK</th>
                <th className="text-left p-3">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {top.map(r => (
                <tr key={`${r.id}-${r.action}`} className="border-t">
                  <td className="p-3 font-medium text-card-foreground">{r.product}</td>
                  <td className="p-3">{r.stock}</td>
                  <td className="p-3">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
