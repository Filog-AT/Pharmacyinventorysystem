import { useState, useEffect, useMemo } from 'react';
import { Lightbulb, AlertTriangle, Package, TrendingUp, CheckCircle, X } from 'lucide-react';
import * as recommendationsBackend from '@/backend/recommendationsBackend';
 
export function PrescriptiveRecommendations({ medicines = [] }) {
  const today = useMemo(() => new Date(), []);
  const [showAllModal, setShowAllModal] = useState(false);
 
  const recommendations = useMemo(() => {
    return recommendationsBackend.getRecommendations(medicines, today);
  }, [medicines, today]);

  // Handle body scroll lock
  useEffect(() => {
    if (showAllModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showAllModal]);

  return (
    <>
      {/* Compact Grid View */}
      <div className="bg-card rounded-xl border-2 border-yellow-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
        <div className="p-5 bg-yellow-50/50 border-b border-yellow-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Lightbulb className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Prescriptive Recommendations</h3>
              <p className="text-[10px] text-gray-500 font-medium">Actionable predictive insights</p>
            </div>
          </div>
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-black border border-yellow-200">{recommendations.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 9).map((rec) => (
              <div key={rec.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
                rec.priority === 'CRITICAL' ? 'border-red-200' : 
                rec.priority === 'HIGH' ? 'border-orange-200' : 'border-blue-100'
              }`}>
                <div className={`p-2 border-b flex items-center justify-between ${
                  rec.priority === 'CRITICAL' ? 'bg-red-50' : 
                  rec.priority === 'HIGH' ? 'bg-orange-50' : 'bg-blue-50/50'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      rec.priority === 'CRITICAL' ? 'bg-red-600 text-white' : 
                      rec.priority === 'HIGH' ? 'bg-orange-500 text-white' : 
                      rec.priority === 'MEDIUM' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {rec.priority}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      rec.priority === 'CRITICAL' ? 'text-red-700' : 
                      rec.priority === 'HIGH' ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                  <div className="text-[9px] font-bold text-gray-500">
                    Stock: {rec.stock}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    {rec.product}
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5" /> Actions
                      </p>
                      <ul className="space-y-0.5">
                        {rec.actions.slice(0, 1).map((action, idx) => (
                          <li key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5 leading-tight">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Reason
                      </p>
                      <p className="text-[10px] text-gray-600 italic leading-relaxed line-clamp-1">
                        {rec.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {recommendations.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold text-gray-500">Inventory looks great!</p>
              <p className="text-xs text-gray-400">All systems within healthy range.</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowAllModal(true)}
          className="w-full p-4 text-sm font-black text-yellow-700 hover:bg-yellow-50 border-t border-yellow-100 transition-all bg-white mt-auto flex items-center justify-center gap-2 group"
        >
          VIEW ALL RECOMMENDATIONS
          <TrendingUp className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Full Grid Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-50 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-white border-b flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Prescriptive Recommendations</h2>
                  <p className="text-sm text-gray-500 italic">Actionable insights based on stock, expiry, and sales trends</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAllModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((rec) => (
                  <div key={rec.id} className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
                    rec.priority === 'CRITICAL' ? 'border-red-200' : 
                    rec.priority === 'HIGH' ? 'border-orange-200' : 'border-blue-100'
                  }`}>
                    <div className={`p-3 border-b flex items-center justify-between ${
                      rec.priority === 'CRITICAL' ? 'bg-red-50' : 
                      rec.priority === 'HIGH' ? 'bg-orange-50' : 'bg-blue-50/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          rec.priority === 'CRITICAL' ? 'bg-red-600 text-white' : 
                          rec.priority === 'HIGH' ? 'bg-orange-500 text-white' : 
                          rec.priority === 'MEDIUM' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                        }`}>
                          {rec.priority}
                        </span>
                        <span className={`text-xs font-bold ${
                          rec.priority === 'CRITICAL' ? 'text-red-700' : 
                          rec.priority === 'HIGH' ? 'text-orange-700' : 'text-blue-700'
                        }`}>
                          {rec.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-gray-500">
                        Stock: {rec.stock}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        {rec.product}
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Recommended Actions
                          </p>
                          <ul className="space-y-1.5">
                            {rec.actions.map((action, idx) => (
                              <li key={idx} className="text-xs text-gray-700 flex items-start gap-2 leading-tight">
                                <span className="text-blue-500 mt-0.5">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Reason
                          </p>
                          <p className="text-[11px] text-gray-600 italic leading-relaxed">
                            {rec.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {recommendations.length === 0 && (
                <div className="text-center py-24">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-gray-900">All systems healthy</h3>
                  <p className="text-gray-500 mt-2">No urgent inventory recommendations at this time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
