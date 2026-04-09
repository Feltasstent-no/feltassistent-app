import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle } from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/match'), 2000);
    }
    setLoading(false);
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Tilbakestill passord</h1>
            <p className="text-slate-600">Verifiserer lenken din...</p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 text-sm text-slate-500 hover:text-emerald-600 transition"
            >
              Tilbake til innlogging
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
              {success ? <CheckCircle className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {success ? 'Passord oppdatert!' : 'Velg nytt passord'}
            </h1>
            {success && (
              <p className="text-slate-600 mt-2">Du blir sendt videre...</p>
            )}
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-4 rounded-lg text-sm text-center">
              Passordet ditt er oppdatert. Du er nå logget inn.
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Nytt passord
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Minst 6 tegn"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Bekreft passord
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Gjenta passordet"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Oppdaterer...' : 'Oppdater passord'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
