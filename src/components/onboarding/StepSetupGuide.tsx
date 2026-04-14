import { Target, Cylinder } from 'lucide-react';
import type { ShootingType, CaliberType, UsageIntent } from '../../types/database';

interface Props {
  shootingType: ShootingType | null;
  caliberType: CaliberType | null;
  usageIntent: UsageIntent | null;
  onComplete: () => void;
}

export function StepSetupGuide({ onComplete }: Props) {
  const steps = [
    {
      key: 'weapon',
      label: 'Opprett våpen',
      desc: 'Registrer våpenet ditt',
      icon: Target,
    },
    {
      key: 'barrel',
      label: 'Legg til løp',
      desc: 'Legg til løpet på våpenet',
      icon: Cylinder,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Sett opp utstyret ditt</h2>
        <p className="text-slate-600 mt-2 max-w-sm mx-auto">
          Registrer våpen og løp for å komme i gang.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-slate-100 text-slate-600">
              <span className="text-sm font-bold">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900">{step.label}</p>
              <p className="text-xs mt-0.5 text-slate-500">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Du starter med å registrere våpen og løp etter dette steget.
      </p>

      <button
        onClick={onComplete}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
      >
        Fullfør og registrer våpen
      </button>
    </div>
  );
}
