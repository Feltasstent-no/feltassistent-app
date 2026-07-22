import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { StepShooterClass } from '../components/onboarding/StepShooterClass';
import { StepCaliber } from '../components/onboarding/StepCaliber';
import { StepUsageIntent } from '../components/onboarding/StepUsageIntent';
import { StepSetupGuide } from '../components/onboarding/StepSetupGuide';
import { ApertureIconBadge } from '../components/ApertureIconBadge';
import { createOnboardingSetup, type SightChoice } from '../lib/onboarding-setup-service';
import type { ShooterClassSetup } from '../lib/dfs-class-config';
import type { ShootingType } from '../types/database';

type Step = 'shooter_class' | 'caliber' | 'usage_intent' | 'setup' | 'complete';

interface SetupResultSummary {
  weapon: boolean;
  barrel: boolean;
  ammo: boolean;
  profile: boolean;
  clickTable: boolean;
  caliberType: string | null;
  sightChoice: SightChoice | null;
}

function getSteps(shootingType: ShootingType | null): Step[] {
  if (shootingType === 'finfelt') {
    return ['shooter_class', 'caliber', 'setup', 'complete'];
  }
  return ['shooter_class', 'caliber', 'usage_intent', 'setup', 'complete'];
}

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, setState, completeOnboarding, skipOnboarding } = useOnboarding();
  const { refreshActiveSetup } = useActiveSetup();
  const [currentStep, setCurrentStep] = useState<Step>('shooter_class');
  const [saving, setSaving] = useState(false);
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(state.shooterClassCode);
  const [classSetup, setClassSetup] = useState<ShooterClassSetup | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResultSummary | null>(null);

  const steps = getSteps(state.shootingType);
  const stepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  const canProceed = () => {
    switch (currentStep) {
      case 'shooter_class': return !!selectedClassCode && !!state.shootingType;
      case 'caliber': return !!state.caliberType;
      case 'usage_intent': return !!state.usageIntent;
      default: return true;
    }
  };

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < totalSteps) setCurrentStep(steps[nextIdx]);
  };

  const goBack = () => {
    if (currentStep === 'usage_intent' && state.usageIntent === 'knepp_vind') {
      setState({ usageIntent: null });
    }
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(steps[prevIdx]);
  };

  const handleClassSelect = (classCode: string, setup: ShooterClassSetup) => {
    setSelectedClassCode(classCode);
    setClassSetup(setup);
    const derivedType: ShootingType = setup.field_type === 'finfelt' ? 'finfelt' : 'grovfelt';
    setState({ shootingType: derivedType, shooterClassCode: classCode, caliberType: null });
  };

  const handleSkip = async () => {
    setSaving(true);
    await skipOnboarding();
    navigate('/weapons', { replace: true, state: { fromOnboarding: true } });
  };

  const handleSetupComplete = async (weaponName: string, sightChoice: SightChoice | null) => {
    if (!user) return;
    setSaving(true);

    const result = await createOnboardingSetup({
      userId: user.id,
      weaponName,
      caliberType: state.caliberType!,
      sightChoice,
      baneDistances: classSetup?.bane_distances || [200, 300],
    });

    await refreshActiveSetup();
    await completeOnboarding();

    setSetupResult({
      ...result,
      caliberType: state.caliberType,
      sightChoice,
    });
    setSaving(false);
    setCurrentStep('complete');
  };

  const handleFinish = () => {
    navigate('/match', { replace: true, state: { fromOnboarding: true, setupResult } });
  };

  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ApertureIconBadge size="sm" />
          <span className="font-bold text-slate-900">Feltassistent</span>
        </div>
        <button
          onClick={handleSkip}
          disabled={saving}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Hopp over</span>
        </button>
      </header>

      {currentStep !== 'complete' && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Steg {stepIndex + 1} av {totalSteps - 1}</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md">
          {currentStep === 'shooter_class' && (
            <StepShooterClass
              value={selectedClassCode}
              onChange={handleClassSelect}
            />
          )}

          {currentStep === 'caliber' && (
            <StepCaliber
              value={state.caliberType}
              shootingType={state.shootingType}
              classSetup={classSetup}
              onChange={v => setState({ caliberType: v })}
            />
          )}

          {currentStep === 'usage_intent' && (
            <StepUsageIntent
              value={state.usageIntent}
              shootingType={state.shootingType}
              onChange={v => setState({ usageIntent: v })}
            />
          )}

          {currentStep === 'setup' && (
            <StepSetupGuide
              classSetup={classSetup}
              caliberType={state.caliberType}
              onComplete={handleSetupComplete}
              saving={saving}
            />
          )}

          {currentStep === 'complete' && setupResult && (
            <CompletionScreen result={setupResult} onFinish={handleFinish} />
          )}

          {currentStep !== 'setup' && currentStep !== 'complete' && (
            <div className="flex items-center justify-between mt-8 gap-3">
              <button
                onClick={goBack}
                disabled={stepIndex === 0}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  stepIndex === 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Tilbake
              </button>
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  canProceed()
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Neste
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CompletionScreen({ result, onFinish }: { result: SetupResultSummary; onFinish: () => void }) {
  const is22 = result.caliberType === '.22 LR';
  const is65Busk = result.caliberType === '6.5x55' && result.sightChoice && result.sightChoice !== 'annet_sikte';
  const is65AnnetSikte = result.caliberType === '6.5x55' && result.sightChoice === 'annet_sikte';

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Feltassistent har opprettet:</h2>
      </div>

      <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-3">
        <ResultRow done={result.weapon} label="Vapen" />
        <ResultRow done={result.barrel} label="Lop" />
        {is22 && <ResultRow done={result.ammo} label="Standard .22 LR-oppsett" />}
        {!is22 && <ResultRow done={result.ammo} label="Standard ammunisjon" />}
        {is65Busk && <ResultRow done={result.profile} label="Startprofil" />}
        {is65Busk && <ResultRow done={result.clickTable} label="Starttabell" />}
      </div>

      {/* Contextual message */}
      {is65Busk && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 leading-relaxed">
            Starttabellen er generert fra standard DFS-data. Kontroller alltid verdiene mot egen innskyting eller egen knepptabell.
          </p>
        </div>
      )}

      {is65AnnetSikte && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800 leading-relaxed">
            Knepptabell kan opprettes senere nar siktet er konfigurert.
          </p>
        </div>
      )}

      {is22 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-800 leading-relaxed">
            Du er klar til trening og stevner.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        Alle opplysninger kan endres senere.
      </p>

      <button
        onClick={onFinish}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors shadow-md"
      >
        Kom i gang
      </button>
    </div>
  );
}

function ResultRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-emerald-500' : 'bg-slate-200'
      }`}>
        {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>
      <span className={`text-sm ${done ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}
