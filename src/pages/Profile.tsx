import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile as ProfileType, ShooterClass } from '../types/database';
import { Save, Crosshair, ArrowRight, Info, CreditCard, Clock, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InitialsAvatar } from '../components/InitialsAvatar';

interface License {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  plan: {
    name: string;
    price_nok: number;
    billing_interval: string;
  };
}

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [shooterClasses, setShooterClasses] = useState<ShooterClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    dfs_shooter_id: '',
    club_name: '',
    shooter_class_id: '',
    birth_year: '',
  });

  const [license, setLicense] = useState<License | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchShooterClasses();
    fetchLicense();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        dfs_shooter_id: data.dfs_shooter_id || '',
        club_name: data.club_name || '',
        shooter_class_id: data.shooter_class_id || '',
        birth_year: data.birth_year?.toString() || '',
      });
    } else {
      setProfile(null);
    }

    setLoading(false);
  };

  const fetchShooterClasses = async () => {
    const { data } = await supabase
      .from('shooter_classes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (data) {
      setShooterClasses(data);
    }
  };

  const fetchLicense = async () => {
    if (!user) return;
    setLicenseLoading(true);

    const { data } = await supabase
      .from('licenses')
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        trial_start,
        trial_end,
        cancel_at_period_end,
        plan:plans(name, price_nok, billing_interval)
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data && data.plan) {
      setLicense({
        ...data,
        plan: Array.isArray(data.plan) ? data.plan[0] : data.plan,
      } as License);
    } else {
      setLicense(null);
    }

    setLicenseLoading(false);
  };

  const handleStartTrial = async () => {
    if (!user) return;

    setLicenseLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-trial`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Noe gikk galt');
      }

      const result = await response.json();
      if (result.license && result.license.plan) {
        const plan = Array.isArray(result.license.plan) ? result.license.plan[0] : result.license.plan;
        setLicense({ ...result.license, plan } as License);
      }

      setMessage({ type: 'success', text: result.created ? 'Prøveperiode startet!' : 'Du har allerede en lisens.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Kunne ikke starte prøveperiode' });
    } finally {
      setLicenseLoading(false);
    }
  };

  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;

    setUpgradeLoading(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Noe gikk galt');
      }

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Ingen checkout-URL mottatt');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Kunne ikke starte checkout' });
      setUpgradeLoading(false);
    }
  };

  const [manageLoading, setManageLoading] = useState(false);

  const handleManage = async () => {
    if (!user) return;

    setManageLoading(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer-portal-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke åpne administrasjon');
      }

      if (result.portal_url) {
        window.location.href = result.portal_url;
      } else {
        throw new Error('Ingen portal-URL mottatt');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Kunne ikke åpne abonnementsportalen' });
      setManageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    const selectedClass = shooterClasses.find((sc) => sc.id === formData.shooter_class_id);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        dfs_shooter_id: formData.dfs_shooter_id || null,
        club_name: formData.club_name || null,
        shooter_class_id: formData.shooter_class_id || null,
        shooter_class: selectedClass?.code || null,
        birth_year: formData.birth_year ? parseInt(formData.birth_year) : null,
      });

    if (error) {
      setMessage({ type: 'error', text: 'Kunne ikke lagre profil' });
    } else {
      setMessage({ type: 'success', text: 'Profil lagret!' });
      await fetchProfile();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl pb-20 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Min profil</h1>
          <p className="text-slate-600 mt-1">Rediger din skytterprofil</p>
        </div>

        <div
          onClick={() => navigate('/weapons')}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-4 sm:p-6 mb-6 cursor-pointer hover:from-emerald-700 hover:to-emerald-800 transition group"
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Crosshair className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Mine våpen og løp</h3>
                <p className="text-emerald-100 text-sm">
                  Administrer våpen, løp og skuddtelling
                </p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-center mb-6">
            <InitialsAvatar name={formData.full_name || profile?.full_name} size="lg" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-2">
                Fullt navn
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-base"
                placeholder="Ola Nordmann"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                E-post
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">E-post kan ikke endres</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                Telefonnummer
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-base"
                placeholder="+47 123 45 678"
              />
            </div>

            <div>
              <label htmlFor="dfs_shooter_id" className="block text-sm font-medium text-slate-700 mb-2">
                DFS Skytter-ID
              </label>
              <input
                id="dfs_shooter_id"
                type="text"
                value={formData.dfs_shooter_id}
                onChange={(e) => setFormData({ ...formData, dfs_shooter_id: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-base"
                placeholder="123456"
              />
            </div>

            <div>
              <label htmlFor="club_name" className="block text-sm font-medium text-slate-700 mb-2">
                Klubb/Skytterlag
              </label>
              <input
                id="club_name"
                type="text"
                value={formData.club_name}
                onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-base"
                placeholder="Oslo Skytterlag"
              />
            </div>

            <div>
              <label htmlFor="shooter_class" className="block text-sm font-medium text-slate-700 mb-2">
                Skytterklasse
              </label>
              <select
                id="shooter_class"
                value={formData.shooter_class_id}
                onChange={(e) => setFormData({ ...formData, shooter_class_id: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-base appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2364748b%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10"
              >
                <option value="">Velg klasse</option>
                {shooterClasses.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="birth_year" className="block text-sm font-medium text-slate-700 mb-2">
                Fødselsår
              </label>
              <input
                id="birth_year"
                type="number"
                value={formData.birth_year}
                onChange={(e) => setFormData({ ...formData, birth_year: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-base"
                placeholder="1990"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            {message && (
              <div
                className={`px-4 py-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Lagrer...' : 'Lagre endringer'}</span>
            </button>
          </form>
        </div>

        {profile?.is_demo ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 mt-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold text-emerald-900">Demo-konto</h3>
            </div>
            <p className="text-sm text-emerald-700 leading-relaxed ml-11">
              Denne kontoen brukes til demonstrasjon av Feltassistenten. Ingen betaling kreves.
            </p>
          </div>
        ) : user?.email === 'andor@valuetech.no' && (
          <SubscriptionSection license={license} loading={licenseLoading} onStartTrial={handleStartTrial} onUpgrade={handleUpgrade} upgradeLoading={upgradeLoading} onManage={handleManage} manageLoading={manageLoading} />
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mt-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-1">Om Feltassistent</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Feltassistent er en frittstående støtteapp for skyttere, med særlig fokus på feltskyting. Appen gir hjelp til ballistikk, knepptabeller, feltfigurer, feltklokke og gjennomføring av stevner og trening.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                Appen er ikke tilknyttet DFS sine offisielle systemer, og skal brukes som et praktisk hjelpemiddel og supplement for skytteren.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: License['status'] }) {
  const config = {
    trialing: { label: 'Prøveperiode', icon: Clock, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    active: { label: 'Aktiv', icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    past_due: { label: 'Betaling feilet', icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    canceled: { label: 'Kansellert', icon: XCircle, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
    expired: { label: 'Utløpt', icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  };
  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.border} border ${c.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

function SubscriptionSection({ license, loading, onStartTrial, onUpgrade, upgradeLoading, onManage, manageLoading }: { license: License | null; loading: boolean; onStartTrial: () => void; onUpgrade: () => void; upgradeLoading: boolean; onManage: () => void; manageLoading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Abonnement</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Abonnement</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-slate-600 text-sm mb-4">
            Du har ikke startet prøveperioden enda.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Info className="w-3.5 h-3.5" />
            <span>Full tilgang i 90 dager, deretter 299 kr/år</span>
          </div>
          <button
            onClick={onStartTrial}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition"
          >
            Start gratis prøveperiode
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">Betaling og kvitteringer håndteres trygt via Stripe.</p>
      </div>
    );
  }

  const periodEnd = new Date(license.current_period_end);
  const isExpiringSoon = periodEnd.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  const isCanceledOrExpired = license.status === 'canceled' || license.status === 'expired';

  if (isCanceledOrExpired) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">Abonnement</h3>
          </div>
          <StatusBadge status={license.status} />
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-slate-600 text-sm mb-4">Lisensen er ikke aktiv.</p>
          <button
            onClick={onUpgrade}
            disabled={upgradeLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {upgradeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {upgradeLoading ? 'Laster...' : 'Oppgrader til full tilgang'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">Betaling og kvitteringer håndteres trygt via Stripe.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Abonnement</h3>
        </div>
        <StatusBadge status={license.status} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Plan</span>
          <span className="text-sm font-medium text-slate-900">{license.plan.name}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Pris</span>
          <span className="text-sm font-medium text-slate-900">
            {license.plan.price_nok} kr/{license.plan.billing_interval === 'year' ? 'år' : 'mnd'}
          </span>
        </div>

        {license.status === 'trialing' && license.trial_end && (
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Prøveperiode utløper</span>
            <span className={`text-sm font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-slate-900'}`}>
              {formatDate(license.trial_end)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Tilgang aktiv til</span>
          <span className={`text-sm font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-slate-900'}`}>
            {formatDate(license.current_period_end)}
          </span>
        </div>

        {license.status === 'trialing' && license.trial_end && (
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Første betaling</span>
            <span className="text-sm font-medium text-slate-900">
              {formatDate(license.trial_end)}
            </span>
          </div>
        )}

        {license.status === 'active' && !license.cancel_at_period_end && (
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Neste betaling</span>
            <span className="text-sm font-medium text-slate-900">
              {formatDate(license.current_period_end)}
            </span>
          </div>
        )}

        {license.status === 'active' && license.cancel_at_period_end && (
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Avsluttes</span>
            <span className="text-sm font-medium text-amber-600">
              {formatDate(license.current_period_end)}
            </span>
          </div>
        )}

        {license.cancel_at_period_end && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700">
              Abonnementet avsluttes ved periodens slutt. Du beholder tilgang til {formatDate(license.current_period_end)}.
            </p>
          </div>
        )}

        {license.status === 'past_due' && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700 font-medium">
              Betaling feilet – oppdater betalingsmåte for å beholde tilgang.
            </p>
          </div>
        )}

        {license.status === 'trialing' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onUpgrade}
              disabled={upgradeLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {upgradeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {upgradeLoading ? 'Laster...' : 'Oppgrader til full tilgang'}
            </button>
          </div>
        )}

        {license.status === 'active' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onManage}
              disabled={manageLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {manageLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {manageLoading ? 'Åpner...' : 'Administrer abonnement'}
            </button>
          </div>
        )}

        {license.status === 'past_due' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onManage}
              disabled={manageLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {manageLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {manageLoading ? 'Åpner...' : 'Administrer abonnement'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">Betaling og kvitteringer håndteres trygt via Stripe.</p>
    </div>
  );
}
