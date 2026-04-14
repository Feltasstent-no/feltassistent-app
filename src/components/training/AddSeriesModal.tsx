import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { ShotCountInput } from '../inputs/ShotCountInput';
import { ShootingTimeInput } from '../inputs/ShootingTimeInput';

interface AddSeriesModalProps {
  defaultShotCount?: number;
  defaultShootingTime?: number;
  defaultDistance?: number;
  onAdd: (params: { shotCount: number; shootingTimeSeconds: number | null; distanceM: number | null }) => Promise<void>;
  onClose: () => void;
}

export function AddSeriesModal({ defaultShotCount = 5, defaultShootingTime, defaultDistance, onAdd, onClose }: AddSeriesModalProps) {
  const [shotCount, setShotCount] = useState(defaultShotCount);
  const [shootingTime, setShootingTime] = useState(defaultShootingTime ? String(defaultShootingTime) : '');
  const [distance, setDistance] = useState(defaultDistance ? String(defaultDistance) : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    await onAdd({
      shotCount: shotCount || 5,
      shootingTimeSeconds: shootingTime ? parseInt(shootingTime) : null,
      distanceM: distance ? parseInt(distance) : null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Ny serie</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Avstand (m)</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="m"
              min="1"
              autoFocus
            />
          </div>

          <ShotCountInput value={shotCount} onChange={setShotCount} label="Skudd" />

          {shootingTime !== '' ? (
            <ShootingTimeInput
              value={shootingTime}
              onChange={setShootingTime}
              label="Skytetid (sek)"
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Skytetid (sek)</label>
              <button
                type="button"
                onClick={() => setShootingTime('60')}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-emerald-400 text-slate-500 hover:text-emerald-600 text-sm font-medium rounded-xl transition"
              >
                Legg til skytetid
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving || shotCount < 1}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {saving ? 'Legger til...' : 'Legg til serie'}
          </button>
        </div>
      </div>
    </div>
  );
}
