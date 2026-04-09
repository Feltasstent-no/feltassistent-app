import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Target, ArrowLeft, Mail } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Ugyldig e-post eller passord'
        : error.message);
      setLoading(false);
    } else {
      navigate('/match');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Tilbakestill passord</h1>
              <p className="text-slate-600 mt-2">
                Skriv inn e-postadressen din, så sender vi en lenke for å tilbakestille passordet.
              </p>
            </div>

            {resetSent ? (
              <div className="space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-4 rounded-lg text-sm text-center">
                  <p className="font-semibold mb-1">E-post sendt!</p>
                  <p>Sjekk innboksen din for en lenke til å tilbakestille passordet. Sjekk også søppelpost-mappen.</p>
                </div>
                <button
                  onClick={() => { setMode('login'); setResetSent(false); setError(null); }}
                  className="w-full flex items-center justify-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold py-3 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Tilbake til innlogging
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-2">
                    E-post
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="din@epost.no"
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
                  {loading ? 'Sender...' : 'Send tilbakestillingslenke'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 font-medium py-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Tilbake til innlogging
                </button>
              </form>
            )}
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
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Felt Assistent'n</h1>
            <p className="text-slate-600 mt-2">Logg inn for å fortsette</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                E-post
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="din@epost.no"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Passord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="••••••••"
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
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode('forgot'); setError(null); }}
              className="text-sm text-slate-500 hover:text-emerald-600 transition"
            >
              Glemt passord?
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-slate-600">
              Har du ikke konto?{' '}
              <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Registrer deg
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
