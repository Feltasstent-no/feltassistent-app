import { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { CompactFigureSelector } from '../CompactFigureSelector';
import { getFieldFigures } from '../../lib/field-assistant';
import { addMatchHold, recalculateHoldClicks } from '../../lib/match-service';
import type { FieldFigure } from '../../types/database';

interface AddHoldModalProps {
  sessionId: string;
  competitionType: 'grovfelt' | 'finfelt';
  onClose: () => void;
  onSaved: (holdId: string) => void;
}

export function AddHoldModal({
  sessionId,
  competitionType,
  onClose,
  onSaved,
}: AddHoldModalProps) {
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);
  const [shotCount, setShotCount] = useState(6);
  const [shootingTime, setShootingTime] = useState(competitionType === 'finfelt' ? 120 : 60);
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

  const handleSave = async () => {
    if (!selectedFigureId || distance <= 0) return;
    setSaving(true);

    const { hold, error } = await addMatchHold({
      sessionId,
      shootingTimeSeconds: shootingTime,
      shotCount,
      fieldFigureId: selectedFigureId,
      distanceM: distance,
    });

    if (error || !hold) {
      setSaving(false);
      alert('Kunne ikke legge til hold: ' + (error?.message || 'Ukjent feil'));
      return;
    }

    if (competitionType !== 'finfelt') {
      await recalculateHoldClicks(sessionId, hold.id, distance);
    }

    setSaving(false);
    onSaved(hold.id);
  };

  const timeOptions = competitionType === 'finfelt'
    ? [30, 45, 60, 90, 120]
    : [30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            Legg til ekstra hold
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
              {timeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setShootingTime(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    shootingTime === t
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
                onClick={() => setShootingTime(Math.max(10, shootingTime - 5))}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Minus className="w-4 h-4 text-slate-600" />
              </button>
              <input
                type="number"
                value={shootingTime}
                onChange={(e) => setShootingTime(Math.max(10, parseInt(e.target.value) || 10))}
                className="flex-1 text-center text-xl font-bold border-2 border-slate-300 rounded-lg py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                onClick={() => setShootingTime(shootingTime + 5)}
                className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <Plus className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !selectedFigureId || distance <= 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
          >
            {saving ? 'Lagrer...' : 'Legg til hold'}
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
