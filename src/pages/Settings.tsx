import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Shield, RotateCcw, Volume2 } from 'lucide-react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { getVoiceCommandsEnabled, setVoiceCommandsEnabled } from '../lib/user-preferences';

export function Settings() {
  const navigate = useNavigate();
  const { resetOnboarding } = useOnboarding();
  const [resetting, setResetting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(getVoiceCommandsEnabled());

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    setVoiceCommandsEnabled(next);
  };

  const handleResetOnboarding = async () => {
    setResetting(true);
    await resetOnboarding();
    navigate('/onboarding', { replace: true });
  };

  return (
    <Layout>
      <div className="max-w-2xl pb-20 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Innstillinger</h1>
          <p className="text-slate-600 mt-1">Administrer appen</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Volume2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900">Skytekommandoer med lyd</h3>
              <p className="text-sm text-slate-600">Spill av «Klar», «Ild» og «Stans» under aktiv økt</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={voiceEnabled}
              onClick={handleToggleVoice}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${
                voiceEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <Link
            to="/admin"
            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex items-center space-x-4 transition"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Admin</h3>
              <p className="text-sm text-slate-600">Administrer klasser, disipliner og presets</p>
            </div>
          </Link>

          <button
            onClick={handleResetOnboarding}
            disabled={resetting}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex items-center space-x-4 transition text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <RotateCcw className={`w-6 h-6 text-amber-600 ${resetting ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Start onboarding på nytt</h3>
              <p className="text-sm text-slate-600">Nullstill oppsett og gå gjennom veiviseren igjen</p>
            </div>
          </button>
        </div>
      </div>
    </Layout>
  );
}
