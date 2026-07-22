import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { getFieldTypeDisplayName } from '../../lib/display-names';
import type { CaliberType, ShootingType } from '../../types/database';
import type { ShooterClassSetup } from '../../lib/dfs-class-config';

interface Props {
  value: CaliberType | null;
  shootingType: ShootingType | null;
  classSetup: ShooterClassSetup | null;
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
    disciplines: ['finfelt', 'grovfelt'],
  },
];

function getOptions(shootingType: ShootingType | null): CaliberOption[] {
  if (!shootingType) return allOptions;
  return allOptions.filter(o => o.disciplines.includes(shootingType));
}

function mapDefaultCaliberToType(defaultCaliber: string | null): CaliberType | null {
  if (!defaultCaliber) return null;
  const normalized = defaultCaliber.toLowerCase().trim();
  if (normalized === '.22 lr' || normalized === '.22lr') return '.22 LR';
  if (normalized === '6.5x55' || normalized === '6,5x55') return '6.5x55';
  return 'annet';
}

export function StepCaliber({ value, shootingType, classSetup, onChange }: Props) {
  const options = getOptions(shootingType);
  const recommendedCaliber = mapDefaultCaliberToType(classSetup?.default_caliber ?? null);
  const didAutoSelect = useRef(false);

  useEffect(() => {
    if (didAutoSelect.current) return;
    if (!recommendedCaliber) return;
    didAutoSelect.current = true;
    onChange(recommendedCaliber);
  }, [recommendedCaliber]);

  const classLabel = classSetup
    ? `${classSetup.class_name} \u00b7 ${getFieldTypeDisplayName(classSetup.field_type)}${
        classSetup.bane_distances.length > 0
          ? ` \u00b7 Bane ${classSetup.bane_distances.join('/')} m`
          : ''
      }`
    : null;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Hvilket kaliber bruker du?</h2>
        <p className="text-slate-600 mt-2">
          {recommendedCaliber
            ? 'Vi har forhåndsvalgt basert på klassen din'
            : 'Velg hovedkaliberet ditt'}
        </p>
      </div>

      {classLabel && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-2.5 text-center">
          <p className="text-sm text-slate-600">{classLabel}</p>
        </div>
      )}

      {recommendedCaliber && classSetup && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            Anbefalt for {classSetup.class_name}:{' '}
            <span className="font-semibold">{classSetup.default_caliber}</span>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {options.map(opt => {
          const selected = value === opt.value;
          const isRecommended = opt.value === recommendedCaliber;
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
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-base ${selected ? 'text-emerald-900' : 'text-slate-900'}`}>
                    {opt.label}
                  </p>
                  {isRecommended && !selected && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                      Anbefalt
                    </span>
                  )}
                </div>
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
