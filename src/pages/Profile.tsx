import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile as ProfileType, ShooterClass } from '../types/database';
import { Save, Crosshair, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InitialsAvatar } from '../components/InitialsAvatar';

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

  useEffect(() => {
    fetchProfile();
    fetchShooterClasses();
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

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-1">Planlagt lisensmodell</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Feltassist app'n er f.t i aktiv utvikling, og det vil i en senere versjon tilkomme en årlig lisens i størrelsesorden 299 kr/år per bruker.
              </p>
            </div>
          </div>
        </div>

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
