import { Target, Crosshair } from 'lucide-react';
import type { ShootingType } from '../../types/database';

interface Props {
  value: ShootingType | null;
  onChange: (v: ShootingType) => void;
}

const options: { value: ShootingType; label: string; desc: string; icon: typeof Target }[] = [
  {
    value: 'finfelt',
    label: 'Finfelt',
    desc: 'Feltskyting med enten .22 LR eller 6,5x55 på 100m',
    icon: Target,
  },
  {
    value: 'grovfelt',
    label: 'Grovfelt',
    desc: 'Feltskyting med grovkaliber på lengre avstander',
    icon: Crosshair,
  },
];

export function StepShootingType({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Hvilken skytegren?</h2>
        <p className="text-slate-600 mt-2">Velg din hovedgren for å tilpasse oppsettet</p>
      </div>

      <div className="space-y-3">
        {options.map(opt => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                selected
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 transition-colors ${
                selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-base ${selected ? 'text-emerald-900' : 'text-slate-900'}`}>
                  {opt.label}
                </p>
                <p className={`text-sm mt-0.5 ${selected ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {opt.desc}
                </p>
              </div>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
              }`}>
                {selected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
