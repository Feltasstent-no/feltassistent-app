import { Minus, Plus } from 'lucide-react';

const SHOT_PRESETS = [5, 6, 10, 12];

interface ShotCountInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  compact?: boolean;
}

export function ShotCountInput({ value, onChange, label = 'Antall skudd', compact = false }: ShotCountInputProps) {
  const btnSize = compact ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = compact ? 'w-3 h-3' : 'w-4 h-4';
  const valueSize = compact ? 'text-lg' : 'text-xl';

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {SHOT_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition active:scale-95 ${
              value === n
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className={`${btnSize} rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition active:scale-95`}
        >
          <Minus className={`${iconSize} text-slate-600`} />
        </button>
        <div className={`flex-1 text-center ${valueSize} font-bold text-slate-900`}>
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={`${btnSize} rounded-lg border-2 border-slate-300 hover:bg-slate-100 flex items-center justify-center transition active:scale-95`}
        >
          <Plus className={`${iconSize} text-slate-600`} />
        </button>
      </div>
    </div>
  );
}
