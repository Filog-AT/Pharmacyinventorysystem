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
    const qty = m.totalQuantity || 0;
    const min = m.minStockLevel || 0;
    const reorderPoint = Math.max(1, min || 10);
    
    // Get earliest expiry from batches
    let earliestExpiry = null;
    if (m.batches && m.batches.length > 0) {
      const validBatches = m.batches.filter(b => b.expiryDate);
      if (validBatches.length > 0) {
        earliestExpiry = validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0].expiryDate;
      }
    }
    
    const daysToExpiry = earliestExpiry ? daysBetween(earliestExpiry) : Infinity;
    const supplier = m.batches?.[0]?.supplier || '';
    const price = Number(m.price || 0);
    const hasMultipleBatches = Array.isArray(m.batches) && m.batches.length > 1;

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
      recommendations.push({
        id: `${m.id}-reorder-now`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Reorder immediately — stock below reorder point`,
      });
      if (qty <= Math.ceil(reorderPoint / 3)) {
        recommendations.push({
          id: `${m.id}-emergency`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Order emergency quantity — stock may run out in 2–3 days`,
        });
      }
      const recommended = Math.ceil((min - qty) + Math.max(10, Math.round(min * 0.25)));
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Reorder +${recommended}`,
      });
      if (min < 20) {
        recommendations.push({
          id: `${m.id}-min`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Increase min stock level to ${Math.max(20, Math.ceil(min * 1.5))}`,
        });
      }
      recommendations.push({
        id: `${m.id}-increase-reorder`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Increase reorder quantity — fast-moving medicine`,
      });
      if (supplier) {
        recommendations.push({
          id: `${m.id}-order`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Create order with ${supplier}`,
        });
      }
    }

    // FEFO recommendation intentionally removed per requirements
    if (daysToExpiry <= 30 && daysToExpiry > 0) {
      recommendations.push({
        id: `${m.id}-discount`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Apply discount — expiring within 30 days`,
      });
      recommendations.push({
        id: `${m.id}-bundle`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Bundle with another product — move near-expiry stock`,
      });
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
      continue;
    }
 
    if (qty > (min || 1) * 6) {
      recommendations.push({
        id: `${m.id}-reduce-next-po`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Reduce next purchase order — current stock exceeds demand`,
      });
    }
    if (qty > (min || 1) * 9) {
      recommendations.push({
        id: `${m.id}-stop-reorder`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Temporarily stop reordering — stock sufficient for 2–3 months`,
      });
    }
    if (qty > (min || 1) * 3) {
      recommendations.push({
        id: m.id,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Promote high inventory item — slow-moving stock`,
      });
      if (price >= 500) {
        recommendations.push({
          id: `${m.id}-price-review`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Review pricing; consider small discount to improve turnover`,
        });
      }
    }

    if (qty > min && qty <= Math.ceil(min * 1.2)) {
      recommendations.push({
        id: `${m.id}-prepare-stock`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Prepare additional stock — demand increasing recently`,
      });
    } else if (qty > Math.ceil(min * 1.5) && qty <= Math.ceil(min * 3)) {
      recommendations.push({
        id: `${m.id}-maintain-reorder`,
        product: m.name,
        stock: `${qty} ${m.unit || ''}`.trim(),
        action: `Maintain current reorder level — usage stable`,
      });
    }

    if (qty <= min) {
      const alternatives = medicines.filter(x => x.id !== m.id && (x.category || '') === (m.category || '') && Number(x.totalQuantity || 0) > Math.max(1, Number(x.minStockLevel || 0)) * 2);
      if (alternatives.length > 0) {
        const alt = alternatives[0];
        recommendations.push({
          id: `${m.id}-alternative`,
          product: m.name,
          stock: `${qty} ${m.unit || ''}`.trim(),
          action: `Suggest alternative medicine — ${alt.name} available`,
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
              {top.map((r, i) => (
                <tr key={`${r.id}-${r.action}-${i}`} className="border-t">
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
