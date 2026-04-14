import type { CaliberType, ShootingType } from '../../types/database';

interface Props {
  value: CaliberType | null;
  shootingType: ShootingType | null;
  onChange: (v: CaliberType) => void;
}

interface CaliberOption {
  value: CaliberType;
  label: string;
  desc: string;
  icon: string;
  disciplines: ShootingType[];
}

const allOptions: CaliberOption[] = [
  {
    value: '.22 LR',
    label: '.22 LR',
    desc: 'Vanlig kaliber for finfelt',
    icon: '.22',
    disciplines: ['finfelt'],
  },
  {
    value: '6.5x55',
    label: '6.5x55',
    desc: 'Standardkaliber for DFS-skyting',
    icon: '6.5',
    disciplines: ['finfelt', 'grovfelt'],
  },
  {
    value: 'annet',
    label: 'Annet',
    desc: 'Jeg bruker et annet kaliber (f.eks. HK416, 5.56 eller tilsvarende)',
    icon: '?',
    disciplines: ['grovfelt'],
  },
];

function getOptions(shootingType: ShootingType | null): CaliberOption[] {
  if (!shootingType) return allOptions;
  return allOptions.filter(o => o.disciplines.includes(shootingType));
}

export function StepCaliber({ value, shootingType, onChange }: Props) {
  const options = getOptions(shootingType);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Hvilket kaliber bruker du?</h2>
        <p className="text-slate-600 mt-2">Velg hovedkaliberet ditt</p>
      </div>

      <div className="space-y-3">
        {options.map(opt => {
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
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 font-bold text-sm transition-colors ${
                selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {opt.icon}
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
                {selected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
