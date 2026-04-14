import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { StepShootingType } from '../components/onboarding/StepShootingType';
import { StepCaliber } from '../components/onboarding/StepCaliber';
import { StepUsageIntent } from '../components/onboarding/StepUsageIntent';
import { StepSetupGuide } from '../components/onboarding/StepSetupGuide';
import { ApertureIconBadge } from '../components/ApertureIconBadge';

type Step = 'shooting_type' | 'caliber' | 'usage_intent' | 'setup' | 'complete';

function getSteps(shootingType: string | null): Step[] {
  if (shootingType === 'finfelt') {
    return ['shooting_type', 'caliber', 'setup', 'complete'];
  }
  return ['shooting_type', 'caliber', 'usage_intent', 'setup', 'complete'];
}

export function Onboarding() {
  const navigate = useNavigate();
  const { state, setState, completeOnboarding, skipOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState<Step>('shooting_type');
  const [saving, setSaving] = useState(false);

  const steps = getSteps(state.shootingType);
  const stepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  const canProceed = () => {
    switch (currentStep) {
      case 'shooting_type': return !!state.shootingType;
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

  const handleSkip = async () => {
    setSaving(true);
    await skipOnboarding();
    navigate('/weapons', { replace: true, state: { fromOnboarding: true } });
  };

  const handleComplete = async () => {
    setSaving(true);
    await completeOnboarding();
    setSaving(false);
    setCurrentStep('complete');
  };

  const handleFinish = () => {
    navigate('/weapons', { replace: true, state: { fromOnboarding: true } });
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
          {currentStep === 'shooting_type' && (
            <StepShootingType
              value={state.shootingType}
              onChange={v => setState({ shootingType: v })}
            />
          )}

          {currentStep === 'caliber' && (
            <StepCaliber
              value={state.caliberType}
              shootingType={state.shootingType}
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
              shootingType={state.shootingType}
              caliberType={state.caliberType}
              usageIntent={state.usageIntent}
              onComplete={handleComplete}
            />
          )}

          {currentStep === 'complete' && (
            <CompletionScreen
              shootingType={state.shootingType}
              onFinish={handleFinish}
            />
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

function CompletionScreen({ onFinish }: {
  shootingType: string | null;
  onFinish: () => void;
}) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Nesten klar!</h2>
        <p className="text-slate-600 mt-3 max-w-sm mx-auto leading-relaxed">
          Nå registrerer du våpenet ditt og legger til løp. Deretter guider vi deg videre.
        </p>
      </div>

      <button
        onClick={onFinish}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors shadow-md"
      >
        Registrer våpen
      </button>
    </div>
  );
}
