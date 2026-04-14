import { Trophy, Crosshair, Layers, AlertTriangle, ListOrdered } from 'lucide-react';
import type { ShootingType, UsageIntent } from '../../types/database';

interface Props {
  value: UsageIntent | null;
  shootingType: ShootingType | null;
  onChange: (v: UsageIntent) => void;
}

type OptionDef = { value: UsageIntent; label: string; desc: string; icon: typeof Trophy };

const finfeltOptions: OptionDef[] = [
  {
    value: 'trening',
    label: 'Stevne, trening og logging',
    desc: 'Bruk appen til stevnegjennomføring, trening og logging',
    icon: Trophy,
  },
  {
    value: 'alt',
    label: 'Alt',
    desc: 'Jeg vil bruke alle funksjoner',
    icon: Layers,
  },
];

const grovfeltOptions: OptionDef[] = [
  {
    value: 'alt',
    label: 'Anbefalt oppsett',
    desc: 'Våpen og løp, deretter ballistikk og knepptabell',
    icon: Crosshair,
  },
  {
    value: 'knepp_vind',
    label: 'Gå direkte til knepptabell',
    desc: 'Våpen og løp, deretter knepptabell uten ballistikk',
    icon: ListOrdered,
  },
];

function getOptions(shootingType: ShootingType | null): OptionDef[] {
  if (shootingType === 'finfelt') return finfeltOptions;
  return grovfeltOptions;
}

export function StepUsageIntent({ value, shootingType, onChange }: Props) {
  const options = getOptions(shootingType);
  const isGrovfelt = shootingType === 'grovfelt';
  const showSkipWarning = isGrovfelt && value === 'knepp_vind';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          {isGrovfelt ? 'Hvordan vil du komme i gang?' : 'Hva vil du bruke appen til?'}
        </h2>
        <p className="text-slate-600 mt-2">
          {isGrovfelt ? 'Velg oppsettmetode' : 'Velg ditt hovedbruksområde'}
        </p>
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
                {selected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {showSkipWarning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in duration-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm leading-relaxed">
            Merk: Hvis du hopper over ballistikk, mister du grunnlaget for bedre vindanbefalinger senere.
          </p>
        </div>
      )}
    </div>
  );
}
