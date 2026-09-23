import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const TIME_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '50s', seconds: 50 },
  { label: '1:00', seconds: 60 },
  { label: '1:15', seconds: 75 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 },
];

interface ShootingTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  suffix?: string;
}

export function ShootingTimeInput({
  value,
  onChange,
  label = 'Skytetid (sek)',
  suffix,
}: ShootingTimeInputProps) {
  const parsed = parseInt(value) || 0;
  const isEmpty = value.trim() === '' || parsed === 0;
  const timeInvalid = parsed < 10;
  const showInvalid = isEmpty || timeInvalid;

  const [local, setLocal] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setLocal(value);
    }
  }, [value]);

  const commitLocal = () => {
    focusedRef.current = false;
    if (local !== value) {
      onChange(local);
    }
  };

  const commitImmediate = (next: string) => {
    setLocal(next);
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}{suffix ? ` ${suffix}` : ''}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {TIME_PRESETS.map((tp) => (
          <button
            key={tp.seconds}
            type="button"
            onClick={() => commitImmediate(String(tp.seconds))}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition active:scale-95 ${
              parsed === tp.seconds
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => commitImmediate(String(Math.max(10, parsed - 5)))}
          className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition active:scale-95"
        >
          <Minus className="w-4 h-4 text-slate-600" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={local}
          onFocus={(e) => {
            focusedRef.current = true;
            e.target.select();
          }}
          onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commitLocal}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className={`flex-1 text-center text-xl font-bold border-2 rounded-lg py-2 outline-none transition ${
            showInvalid
              ? 'bg-red-50 border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
          }`}
        />
        <button
          type="button"
          onClick={() => commitImmediate(String(parsed + 5))}
          className="w-10 h-10 rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-slate-600" />
        </button>
      </div>
      {showInvalid && (
        <p className="text-xs text-red-600 font-medium mt-1">
          {isEmpty ? 'Mangler skytetid' : 'Minimum 10 sekunder'}
        </p>
      )}
    </div>
  );
}
