import { useState } from 'react';
import { Target, Circle, Crosshair, Info } from 'lucide-react';
import { getFieldTypeDisplayName } from '../../lib/display-names';
import type { CaliberType } from '../../types/database';
import type { ShooterClassSetup } from '../../lib/dfs-class-config';
import type { SightChoice } from '../../lib/onboarding-setup-service';

interface Props {
  classSetup: ShooterClassSetup | null;
  caliberType: CaliberType | null;
  onComplete: (weaponName: string, sightChoice: SightChoice | null) => void;
  saving: boolean;
}

export function StepSetupGuide({ classSetup, caliberType, onComplete, saving }: Props) {
  const [weaponName, setWeaponName] = useState('');
  const [sightChoice, setSightChoice] = useState<SightChoice | null>(null);

  const needs65Setup = caliberType === '6.5x55';
  const canSubmit = weaponName.trim().length >= 2 && (!needs65Setup || sightChoice !== null);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete(weaponName.trim(), needs65Setup ? sightChoice : null);
  };

  const baneLabel = classSetup?.bane_distances?.length
    ? classSetup.bane_distances.join('/') + ' m'
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Feltassistenten setter opp utstyret ditt</h2>
        <p className="text-slate-600 mt-2">
          Vi oppretter et startoppsett slik at du kan komme i gang med en gang.
        </p>
      </div>

      {/* Summary card */}
      {classSetup && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">Klasse</span>
              <p className="font-medium text-slate-900">{classSetup.class_name}</p>
            </div>
            <div>
              <span className="text-slate-500">Skytegren</span>
              <p className="font-medium text-slate-900">{getFieldTypeDisplayName(classSetup.field_type)}</p>
            </div>
            {baneLabel && (
              <div>
                <span className="text-slate-500">Bane</span>
                <p className="font-medium text-slate-900">{baneLabel}</p>
              </div>
            )}
            <div>
              <span className="text-slate-500">Kaliber</span>
              <p className="font-medium text-slate-900">{caliberType}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weapon name input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Hva vil du kalle våpenet ditt?
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Target className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={weaponName}
            onChange={e => setWeaponName(e.target.value)}
            placeholder="F.eks. Sauer 200 STR"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            maxLength={50}
          />
        </div>
        <p className="text-xs text-slate-500">
          Bruk det navnet du kjenner igjen. Kan endres senere.
        </p>
      </div>

      {/* Busk sight choice (only for 6.5x55) */}
      {needs65Setup && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Hvilket Busk-diopter bruker du?
          </label>

          <div className="space-y-2">
            <SightButton
              selected={sightChoice === 'busk_standard'}
              onClick={() => setSightChoice('busk_standard')}
              icon={<Circle className="w-5 h-5" />}
              label="Busk standard"
              desc="Grovknepp (1/12 mm per knepp)"
            />
            <SightButton
              selected={sightChoice === 'busk_finknepp'}
              onClick={() => setSightChoice('busk_finknepp')}
              icon={<Crosshair className="w-5 h-5" />}
              label="Busk finknepp"
              desc="Finknepp (1/24 mm per knepp)"
            />
            <SightButton
              selected={sightChoice === 'annet_sikte'}
              onClick={() => setSightChoice('annet_sikte')}
              icon={<Info className="w-5 h-5" />}
              label="Jeg bruker annet sikte"
              desc="Knepptabell kan opprettes senere"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || saving}
        className={`w-full font-semibold py-3.5 px-6 rounded-xl transition-all ${
          canSubmit && !saving
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {saving ? 'Oppretter oppsett...' : 'Fullfør og opprett oppsett'}
      </button>
    </div>
  );
}

function SightButton({ selected, onClick, icon, label, desc }: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
        selected
          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 transition-colors ${
        selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`font-medium text-sm ${selected ? 'text-emerald-900' : 'text-slate-900'}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 ${selected ? 'text-emerald-700' : 'text-slate-500'}`}>
          {desc}
        </p>
      </div>
      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
        selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
