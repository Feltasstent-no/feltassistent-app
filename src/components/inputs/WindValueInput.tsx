import { Wind } from 'lucide-react';

interface WindValueInputProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function WindValueInput({ value, onChange, compact = false }: WindValueInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        <span className="flex items-center gap-1.5">
          {!compact && <Wind className="w-4 h-4 text-slate-400" />}
          Vindverdi (m/s, valgfritt)
        </span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={(e) => e.target.select()}
        placeholder="F.eks. 3"
        className={`w-full bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
          compact ? 'text-center text-base font-bold py-1.5' : 'px-4 py-3 text-lg font-semibold'
        }`}
      />
      <p className="mt-1.5 text-xs text-slate-500">
        Retning vurderes av skytteren.
      </p>
    </div>
  );
}
