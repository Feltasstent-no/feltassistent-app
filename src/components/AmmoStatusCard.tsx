import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, AlertTriangle, History, Plus, Minus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import {
  getAmmoInventoryWithLatestLog,
  addAmmoToInventory,
  deductAmmoFromInventory,
  type AmmoInventoryLogEntry,
} from '../lib/ammo-inventory-service';
import type { AmmoInventory } from '../types/database';
import { AmmoHistoryModal } from './AmmoHistoryModal';

const REASON_LABELS: Record<string, string> = {
  match: 'stevne',
  manual: 'manuell',
  purchase: 'pafyll',
  adjustment: 'justering',
};

function formatLastChange(log: AmmoInventoryLogEntry): string {
  const sign = log.quantity_change > 0 ? '+' : '';
  const label = REASON_LABELS[log.reason] || log.reason;
  return `Sist: ${sign}${log.quantity_change} fra ${label}`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'na' : `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t siden`;
  const days = Math.floor(hours / 24);
  return `${days}d siden`;
}

function getDefaultLabel(inv: AmmoInventory): string | null {
  const labels: string[] = [];
  if (inv.is_default_felt) labels.push('Felt');
  if (inv.is_default_bane) labels.push('Bane');
  if (inv.is_default_trening) labels.push('Trening');
  if (labels.length === 0) return null;
  return `Standard for ${labels.join(', ')}`;
}

export function AmmoStatusCard() {
  const { user } = useAuth();
  const { activeSetup } = useActiveSetup();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<AmmoInventory | null>(null);
  const [latestLog, setLatestLog] = useState<AmmoInventoryLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add');

  const weaponId = activeSetup?.weapon_id;
  const barrelId = activeSetup?.barrel_id;

  useEffect(() => {
    loadInventory();
  }, [user, weaponId, barrelId]);

  const loadInventory = async () => {
    if (!user || !weaponId) {
      setInventory(null);
      setLatestLog(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await getAmmoInventoryWithLatestLog(user.id, weaponId, barrelId);
    if (result) {
      setInventory(result.inventory);
      setLatestLog(result.latestLog);
    } else {
      setInventory(null);
      setLatestLog(null);
    }
    setLoading(false);
  };

  const handleQuickAdjust = async (amount: number) => {
    if (!user || !inventory) return;
    if (amount > 0) {
      await addAmmoToInventory({
        inventoryId: inventory.id,
        userId: user.id,
        quantity: amount,
      });
    } else {
      await deductAmmoFromInventory({
        inventoryId: inventory.id,
        userId: user.id,
        quantity: Math.abs(amount),
      });
    }
    loadInventory();
  };

  const handleCustomSubmit = async () => {
    const qty = parseInt(customAmount);
    if (isNaN(qty) || qty <= 0 || !user || !inventory) return;
    const actual = adjustMode === 'add' ? qty : -qty;
    await handleQuickAdjust(actual);
    setShowCustomInput(false);
    setCustomAmount('');
  };

  if (loading || !activeSetup?.weapon_id) return null;

  if (!inventory) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Ammunisjon</h2>
            <button
              onClick={() => navigate('/weapons')}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              Administrer
            </button>
          </div>
        </div>
        <button
          onClick={() => navigate('/weapons')}
          className="w-full p-6 hover:bg-amber-50/30 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-amber-100 rounded-lg flex items-center justify-center transition">
              <Package className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-600">Ingen lagersporing aktiv</p>
              <p className="text-xs text-slate-400">Sett opp ammunisjonslager for ditt våpen</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition" />
          </div>
        </button>
      </div>
    );
  }

  const isLow = inventory.stock_quantity <= 20 && inventory.stock_quantity > 0;
  const isEmpty = inventory.stock_quantity === 0;
  const defaultLabel = getDefaultLabel(inventory);

  const statusColor = isEmpty
    ? 'text-red-600'
    : isLow
      ? 'text-amber-600'
      : 'text-emerald-600';

  const statusBg = isEmpty
    ? 'bg-red-50 border-red-200'
    : isLow
      ? 'bg-amber-50 border-amber-200'
      : 'bg-emerald-50 border-emerald-200';

  const statusText = isEmpty ? 'Tom' : isLow ? 'Lavt lager' : 'På lager';

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Ammunisjon</h2>
            <button
              onClick={() => navigate('/weapons')}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              Administrer
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isEmpty ? 'bg-red-100' : isLow ? 'bg-amber-100' : 'bg-slate-100'
              }`}>
                <Package className={`w-5 h-5 ${
                  isEmpty ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{inventory.name}</h3>
                {inventory.caliber && (
                  <p className="text-sm text-slate-500">{inventory.caliber}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusBg} ${statusColor}`}>
                    {(isEmpty || isLow) && <AlertTriangle className="w-3 h-3" />}
                    {statusText}
                  </span>
                  {defaultLabel && (
                    <span className="text-[10px] font-medium text-slate-400">{defaultLabel}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold tabular-nums ${
                isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'
              }`}>
                {inventory.stock_quantity}
              </p>
              <p className="text-xs text-slate-500">på lager</p>
            </div>
          </div>

          {latestLog && (
            <div className="flex items-center justify-between mb-4 text-[11px] text-slate-400">
              <p>
                {formatLastChange(latestLog)}
                <span> &middot; {formatTimeAgo(latestLog.created_at)}</span>
              </p>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition"
              >
                <History className="w-3.5 h-3.5" />
                Historikk
              </button>
            </div>
          )}

          {!latestLog && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition"
              >
                <History className="w-3.5 h-3.5" />
                Historikk
              </button>
            </div>
          )}

          {showCustomInput ? (
            <div className="flex space-x-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Antall skudd"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
                min="1"
              />
              <button
                onClick={handleCustomSubmit}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${
                  adjustMode === 'add'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {adjustMode === 'add' ? 'Legg til' : 'Trekk fra'}
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomAmount('');
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickAdjust(10)}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
              >
                +10
              </button>
              <button
                onClick={() => handleQuickAdjust(20)}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
              >
                +20
              </button>
              <button
                onClick={() => handleQuickAdjust(50)}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
              >
                +50
              </button>
              <button
                onClick={() => {
                  setAdjustMode('add');
                  setShowCustomInput(true);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Egendefinert
              </button>
              <button
                onClick={() => {
                  setAdjustMode('remove');
                  setShowCustomInput(true);
                }}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showHistory && inventory && (
        <AmmoHistoryModal
          inventoryId={inventory.id}
          inventoryName={inventory.name}
          currentStock={inventory.stock_quantity}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
