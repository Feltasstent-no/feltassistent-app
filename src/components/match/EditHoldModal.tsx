import { useState, useEffect } from 'react';
import { X, AlertTriangle, Minus, Plus } from 'lucide-react';
import { CompactFigureSelector } from '../CompactFigureSelector';
import { getFieldFigures } from '../../lib/field-assistant';
import { updateMatchHold, recalculateHoldClicks } from '../../lib/match-service';
import type { MatchHoldWithFigure } from '../../lib/match-service';
import type { FieldFigure } from '../../types/database';

interface EditHoldModalProps {
  hold: MatchHoldWithFigure;
  sessionId: string;
  competitionType: 'grovfelt' | 'finfelt';
  onClose: () => void;
  onSaved: () => void;
}

export function EditHoldModal({
  hold,
  sessionId,
  competitionType,
  onClose,
  onSaved,
}: EditHoldModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(hold.field_figure_id);
  const [distance, setDistance] = useState(hold.distance_m || 0);
  const [shotCount, setShotCount] = useState(hold.shot_count || 0);
  // String state so user can freely clear and retype on mobile
  const [shootingTimeInput, setShootingTimeInput] = useState(String(hold.shooting_time_seconds || 60));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFieldFigures().then((data) => {
      const filtered = data.filter((f) => f.category === competitionType);
      setFigures(filtered);
    });
  }, [competitionType]);

  const handleFigureSelect = (figureId: string) => {
    setSelectedFigureId(figureId);
    const fig = figures.find((f) => f.id === figureId);
    if (fig?.normal_distance_m) {
      setDistance(fig.normal_distance_m);
    }
  };

  const parsedShootingTime = parseInt(shootingTimeInput) || 0;
  const timeInvalid = parsedShootingTime < 10;

  const handleSave = async () => {
    if (timeInvalid) return;
    setSaving(true);

    const distanceChanged = distance !== (hold.distance_m || 0);
    const figureChanged = selectedFigureId !== hold.field_figure_id;
    const shotCountChanged = shotCount !== (hold.shot_count || 0);
    const timeChanged = parsedShootingTime !== (hold.shooting_time_seconds || 60);

    if (figureChanged || shotCountChanged || distanceChanged || timeChanged) {
      await updateMatchHold({
        holdId: hold.id,
        fieldFigureId: selectedFigureId || undefined,
        distanceM: distance,
        shotCount: shotCount,
        shootingTimeSeconds: parsedShootingTime,
      });
    }

    if (distanceChanged && competitionType !== 'finfelt') {
      await recalculateHoldClicks(sessionId, hold.id, distance);
    }

    setSaving(false);
    onSaved();
  };

  if (!confirmed) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
            Redigere hold?
          </h3>
          <p className="text-sm text-slate-600 text-center mb-6">
            Dette b{'\u00f8'}r kun gj{'\u00f8'}res ved feil.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
            >
              Avbryt
            </button>
            <button
              onClick={() => setConfirmed(true)}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition"
            >
              Rediger
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            Rediger hold {hold.order_index + 1}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Figur</label>
            <CompactFigureSelector
              figures={figures}
              selectedFigureId={selectedFigureId}
              onSelect={handleFigureSelect}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Avstand (m)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDistance(Math.max(0, distance - 50))}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Minus className="w-4 h-4 text-slate-600" />
              </button>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 text-center text-xl font-bold border-2 border-slate-300 rounded-lg py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                onClick={() => setDistance(distance + 50)}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Plus className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Antall skudd</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShotCount(Math.max(1, shotCount - 1))}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Minus className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex-1 text-center text-xl font-bold text-slate-900">
                {shotCount}
              </div>
              <button
                onClick={() => setShotCount(shotCount + 1)}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Plus className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skytetid (sek)</label>
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 90, 120].map((t) => (
                <button
                  key={t}
                  onClick={() => setShootingTimeInput(String(t))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    parsedShootingTime === t
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShootingTimeInput(String(Math.max(10, parsedShootingTime - 5)))}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Minus className="w-4 h-4 text-slate-600" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={shootingTimeInput}
                onChange={(e) => setShootingTimeInput(e.target.value)}
                className={`flex-1 text-center text-xl font-bold border-2 rounded-lg py-2 outline-none transition ${
                  timeInvalid && shootingTimeInput !== ''
                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                }`}
              />
              <button
                onClick={() => setShootingTimeInput(String(parsedShootingTime + 5))}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Plus className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            {timeInvalid && shootingTimeInput !== '' && (
              <p className="text-xs text-red-500 mt-1">Minimum 10 sekunder</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !selectedFigureId || distance <= 0 || timeInvalid}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
          >
            {saving ? 'Lagrer...' : 'Lagre endringer'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
