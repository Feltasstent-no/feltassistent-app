import { useState } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { ShotCountInput } from './ShotCountInput';
import { ShootingTimeInput } from './ShootingTimeInput';

export interface SeriesValues {
  shotCount: number;
  shootingTimeSeconds: number | null;
  distanceM: number | null;
}

export interface SeriesEditorProps {
  mode: 'create' | 'edit';

  initialValues?: Partial<SeriesValues>;

  features: {
    shootingTime: 'required' | 'optional' | 'hidden';
    distance: 'required' | 'optional' | 'hidden';
  };


  submitLabel?: string;
  isSaving?: boolean;

  onSave: (values: SeriesValues) => Promise<void> | void;
  onCancel?: () => void;

  compact?: boolean;
  darkMode?: boolean;
}

export function SeriesEditor({
  mode,
  initialValues,
  features,
  submitLabel,
  isSaving = false,
  onSave,
  onCancel,
  compact = false,
  darkMode = false,
}: SeriesEditorProps) {
  const [shotCount, setShotCount] = useState(initialValues?.shotCount ?? 5);
  const [showTime, setShowTime] = useState(
    features.shootingTime === 'hidden'
      ? false
      : features.shootingTime === 'required'
        ? true
        : initialValues?.shootingTimeSeconds != null
  );
  const [shootingTime, setShootingTime] = useState(
    initialValues?.shootingTimeSeconds != null ? String(initialValues.shootingTimeSeconds) : ''
  );
  const [distance, setDistance] = useState(
    initialValues?.distanceM != null ? String(initialValues.distanceM) : ''
  );
  const [saving, setSaving] = useState(false);

  const parsedTime = parseInt(shootingTime) || 0;
  const parsedDistance = parseInt(distance) || 0;

  const timeInvalid = showTime && shootingTime !== '' && parsedTime < 10;
  const timeRequired = features.shootingTime === 'required' && (!showTime || !shootingTime || parsedTime < 10);
  const distanceRequired = features.distance === 'required' && (!distance || parsedDistance < 1);

  const isValid = shotCount >= 1 && !timeInvalid && !timeRequired && !distanceRequired;
  const busy = saving || isSaving;

  const handleSubmit = async () => {
    if (busy || !isValid) return;
    setSaving(true);
    try {
      await onSave({
        shotCount,
        shootingTimeSeconds: features.shootingTime === 'hidden'
          ? null
          : showTime && shootingTime
            ? parsedTime
            : null,
        distanceM: features.distance === 'hidden'
          ? null
          : distance
            ? parsedDistance
            : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const defaultSubmitLabel = mode === 'edit' ? 'Lagre endringer' : 'Legg til serie';
  const savingLabel = mode === 'edit' ? 'Lagrer...' : 'Legger til...';

  const labelClass = darkMode
    ? 'block text-xs font-medium text-gray-400 mb-1'
    : 'block text-xs font-medium text-slate-600 mb-1';
  const inputClass = darkMode
    ? 'w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-center font-semibold text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
    : 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

  return (
    <div className={`space-y-4 ${compact ? 'space-y-3' : ''}`}>
      {features.distance !== 'hidden' && (
        <div>
          <label className={labelClass}>
            Avstand (m){features.distance === 'optional' ? '' : ' *'}
          </label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className={inputClass}
            placeholder="m"
            min="1"
            autoFocus
          />
          {distanceRequired && distance !== '' && (
            <p className="text-xs text-red-500 mt-1">Angi en gyldig avstand</p>
          )}
        </div>
      )}

      <ShotCountInput
        value={shotCount}
        onChange={setShotCount}
        label="Skudd"
        compact={compact}
      />

      {features.shootingTime !== 'hidden' && (
        <>
          {showTime ? (
            <div>
              <ShootingTimeInput
                value={shootingTime}
                onChange={setShootingTime}
                label="Skytetid (sek)"
              />
              {features.shootingTime === 'optional' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTime(false);
                    setShootingTime('');
                  }}
                  className={`mt-2 text-xs ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-700'} transition`}
                >
                  Fjern skytetid
                </button>
              )}
            </div>
          ) : (
            <div>
              <label className={darkMode ? 'block text-sm font-medium text-gray-300 mb-2' : 'block text-sm font-medium text-slate-700 mb-2'}>
                Skytetid (sek)
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowTime(true);
                  setShootingTime('60');
                }}
                className={`w-full py-2.5 border-2 border-dashed rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                  darkMode
                    ? 'border-gray-600 hover:border-emerald-500 text-gray-400 hover:text-emerald-400'
                    : 'border-slate-300 hover:border-emerald-400 text-slate-500 hover:text-emerald-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                Legg til skytetid
              </button>
            </div>
          )}
        </>
      )}

      <div className={`flex gap-2 ${compact ? 'pt-2' : 'pt-3'}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${
              darkMode
                ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Avbryt
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !isValid}
          className={`flex-1 py-2.5 font-bold rounded-lg transition flex items-center justify-center gap-2 ${
            busy || !isValid
              ? darkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? savingLabel : (submitLabel || defaultSubmitLabel)}
        </button>
      </div>
    </div>
  );
}
