import { useState, useEffect } from 'react';
import { X, TrendingDown, TrendingUp, Package, Clock } from 'lucide-react';
import { getAmmoHistoryLogs, type AmmoInventoryLogEntry } from '../lib/ammo-inventory-service';

interface AmmoHistoryModalProps {
  inventoryId: string;
  inventoryName: string;
  currentStock: number;
  onClose: () => void;
}

const REASON_LABELS: Record<string, string> = {
  match: 'Stevne',
  manual: 'Manuell',
  purchase: 'Pafyll',
  adjustment: 'Justering',
};

const REASON_COLORS: Record<string, { bg: string; text: string }> = {
  match: { bg: 'bg-amber-100', text: 'text-amber-700' },
  manual: { bg: 'bg-slate-100', text: 'text-slate-600' },
  purchase: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  adjustment: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export function AmmoHistoryModal({ inventoryId, inventoryName, currentStock, onClose }: AmmoHistoryModalProps) {
  const [logs, setLogs] = useState<AmmoInventoryLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [inventoryId]);

  const loadLogs = async () => {
    setLoading(true);
    const data = await getAmmoHistoryLogs(inventoryId);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{inventoryName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm text-slate-500">{currentStock} på lager</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Ingen hendelser registrert enna</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isPositive = log.quantity_change > 0;
                const colors = REASON_COLORS[log.reason] || REASON_COLORS.manual;

                return (
                  <div key={log.id} className="px-4 py-3 hover:bg-slate-50/50 transition">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isPositive ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-base font-bold tabular-nums ${
                              isPositive ? 'text-emerald-700' : 'text-red-700'
                            }`}>
                              {isPositive ? '+' : ''}{log.quantity_change}
                            </span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                              {REASON_LABELS[log.reason] || log.reason}
                            </span>
                          </div>
                          {log.running_balance != null && (
                            <span className="text-sm font-medium text-slate-700 tabular-nums flex-shrink-0">
                              {log.running_balance}
                              <span className="text-xs text-slate-400 ml-0.5">stk</span>
                            </span>
                          )}
                        </div>

                        {log.notes && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{log.notes}</p>
                        )}

                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatDate(log.created_at)} kl. {formatTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
