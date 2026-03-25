import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BallisticProfile, AmmoProfile } from '../types/database';
import { Activity, Save, AlertCircle } from 'lucide-react';
import { generateDistanceTable, generateClickTable, calculateWindTable } from '../lib/ballistics';

export function EditBallisticProfile() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [ammoProfiles, setAmmoProfiles] = useState<AmmoProfile[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    ammo_profile_id: '',
    bullet_name: '',
    ballistic_coefficient: '',
    muzzle_velocity: '',
    zero_distance_m: '',
    min_distance_m: '',
    max_distance_m: '',
    distance_interval_m: '',
    sight_type: '',
    sight_height_mm: '',
    sight_radius_cm: '',
    front_sight_height_mm: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchAmmoProfiles();
  }, [id, user]);

  useEffect(() => {
    if (formData.ammo_profile_id) {
      const ammo = ammoProfiles.find(a => a.id === formData.ammo_profile_id);
      if (ammo) {
        setFormData(prev => ({
          ...prev,
          bullet_name: ammo.name,
          ballistic_coefficient: ammo.ballistic_coefficient_g1.toString(),
          muzzle_velocity: ammo.default_muzzle_velocity.toString(),
        }));
      }
    }
  }, [formData.ammo_profile_id, ammoProfiles]);

  const fetchProfile = async () => {
    if (!id || !user) return;

    const { data, error } = await supabase
      .from('ballistic_profiles')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      alert('Feil ved henting av profil: ' + error.message);
      navigate('/ballistics');
      return;
    }

    if (!data) {
      alert('Profil ikke funnet eller du har ikke tilgang');
      navigate('/ballistics');
      return;
    }

    setFormData({
      name: data.name,
      ammo_profile_id: data.ammo_profile_id || '',
      bullet_name: data.bullet_name || '',
      ballistic_coefficient: data.ballistic_coefficient.toString(),
      muzzle_velocity: data.muzzle_velocity.toString(),
      zero_distance_m: data.zero_distance_m.toString(),
      min_distance_m: data.min_distance_m.toString(),
      max_distance_m: data.max_distance_m.toString(),
      distance_interval_m: data.distance_interval_m.toString(),
      sight_type: data.sight_type,
      sight_height_mm: data.sight_height_mm.toString(),
      sight_radius_cm: data.sight_radius_cm?.toString() || '',
      front_sight_height_mm: data.front_sight_height_mm?.toString() || '34',
    });

    setInitialLoading(false);
  };

  const fetchAmmoProfiles = async () => {
    const { data } = await supabase
      .from('ammo_profiles')
      .select('*')
      .eq('is_active', true)
      .order('caliber, name');
    if (data) setAmmoProfiles(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);
    setSuccessMessage('');

    try {
      const profileData = {
        name: formData.name,
        ammo_profile_id: formData.ammo_profile_id || null,
        bullet_name: formData.bullet_name || null,
        ballistic_coefficient: parseFloat(formData.ballistic_coefficient),
        muzzle_velocity: parseInt(formData.muzzle_velocity),
        zero_distance_m: parseInt(formData.zero_distance_m),
        min_distance_m: parseInt(formData.min_distance_m),
        max_distance_m: parseInt(formData.max_distance_m),
        distance_interval_m: parseInt(formData.distance_interval_m),
        sight_type: formData.sight_type,
        sight_height_mm: parseFloat(formData.sight_height_mm),
        sight_radius_cm: formData.sight_radius_cm ? parseFloat(formData.sight_radius_cm) : null,
        front_sight_height_mm: formData.front_sight_height_mm ? parseFloat(formData.front_sight_height_mm) : null,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('ballistic_profiles')
        .update(profileData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { data: updatedProfile, error: fetchError } = await supabase
        .from('ballistic_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const distanceTable = generateDistanceTable(updatedProfile);
      const clickTable = generateClickTable(updatedProfile, distanceTable);
      const windTable = calculateWindTable(updatedProfile);

      await Promise.all([
        supabase.from('ballistic_distance_table').delete().eq('profile_id', id),
        supabase.from('ballistic_click_table').delete().eq('profile_id', id),
        supabase.from('ballistic_wind_table').delete().eq('profile_id', id),
      ]);

      await Promise.all([
        supabase.from('ballistic_distance_table').insert(
          distanceTable.map(row => ({
            profile_id: id,
            distance_m: row.distance_m,
            click_value: row.click_value,
            bullet_drop_mm: row.bullet_drop_mm,
          }))
        ),
        supabase.from('ballistic_click_table').insert(
          clickTable.map(row => ({
            profile_id: id,
            click: row.click,
            distance_m: row.distance_m,
          }))
        ),
        supabase.from('ballistic_wind_table').insert(
          windTable.map(row => ({
            profile_id: id,
            distance_m: row.distance_m,
            wind_speed: row.wind_speed,
            wind_clicks: row.wind_clicks,
          }))
        ),
      ]);

      setSuccessMessage('Ballistisk profil oppdatert – tabeller regenerert');

      setTimeout(() => {
        navigate(`/ballistics/${id}`);
      }, 2000);

    } catch (error: any) {
      alert('Feil ved oppdatering: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-600">Laster profil...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Activity className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Rediger ballistisk profil</h1>
          </div>
          <p className="text-slate-600">Oppdater profilen og regenerer alle ballistiske tabeller</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">{successMessage}</p>
              <p className="text-sm text-emerald-700 mt-1">Du blir videresendt til profilvisningen...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Navn på profil <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="F.eks. DFS Grovfelt 2026"
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Kuledata</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Ammunisjonsprofil (valgfritt)
                </label>
                <select
                  value={formData.ammo_profile_id}
                  onChange={(e) => setFormData({ ...formData, ammo_profile_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Velg ammunisjonsprofil eller fyll inn manuelt</option>
                  {ammoProfiles.map((ammo) => (
                    <option key={ammo.id} value={ammo.id}>
                      {ammo.name} - {ammo.caliber} - BC {ammo.ballistic_coefficient_g1} - V0 {ammo.default_muzzle_velocity} m/s
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Velg en ferdigdefinert ammunisjonsprofil for å fylle ut BC og V0 automatisk
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Kulenavn</label>
                <input
                  type="text"
                  value={formData.bullet_name}
                  onChange={(e) => setFormData({ ...formData, bullet_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="F.eks. Lapua Scenar 155gr"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Ballistisk koeffisient (BC) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.ballistic_coefficient}
                    onChange={(e) => setFormData({ ...formData, ballistic_coefficient: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0.450"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Utgangshastighet (m/s) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.muzzle_velocity}
                    onChange={(e) => setFormData({ ...formData, muzzle_velocity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tabell-parametere</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Min avstand (m) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.min_distance_m}
                    onChange={(e) => setFormData({ ...formData, min_distance_m: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Max avstand (m) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.max_distance_m}
                    onChange={(e) => setFormData({ ...formData, max_distance_m: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Intervall (m) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.distance_interval_m}
                    onChange={(e) => setFormData({ ...formData, distance_interval_m: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Nullpunkt (m) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.zero_distance_m}
                  onChange={(e) => setFormData({ ...formData, zero_distance_m: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="300"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Avstanden hvor knepp = 0. Tabellen viser negative knepp for kortere avstander og positive for lengre.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Siktedata</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Siktemodell <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.sight_type}
                  onChange={(e) => setFormData({ ...formData, sight_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="busk_standard">Busk Standard (grovknepp)</option>
                  <option value="busk_finknepp">Busk Finknepp</option>
                  <option value="moa_quarter">1/4 MOA</option>
                  <option value="moa_half">1/2 MOA</option>
                  <option value="moa_full">1 MOA</option>
                  <option value="mil_0_1">0.1 mil</option>
                  <option value="mil_0_2">0.2 mil</option>
                </select>
                {(formData.sight_type === 'busk_standard' || formData.sight_type === 'busk_finknepp') && (
                  <p className="mt-1 text-xs text-slate-500">
                    {formData.sight_type === 'busk_standard'
                      ? 'Busk Standard: 1 knepp = 1.0 mm forskyvning ved bakhullet'
                      : 'Busk Finknepp: 1 knepp = 0.5 mm forskyvning ved bakhullet (dobbelt antall knepp)'
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Siktehøyde (mm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.sight_height_mm}
                  onChange={(e) => setFormData({ ...formData, sight_height_mm: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="50"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Avstand fra senterakse løp til siktelinje. Vanlig Sauer/Busk oppsett: 34 mm (legg inn din verdi her)
                </p>
              </div>

              {(formData.sight_type === 'busk_standard' || formData.sight_type === 'busk_finknepp') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Hullavstand (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.sight_radius_cm}
                      onChange={(e) => setFormData({ ...formData, sight_radius_cm: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="85"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Avstand mellom bakhull og frontkorn. Vanlig Sauer/Busk oppsett med 72cm løp er: ca 85 cm (legg inn din verdi her)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Hullkorn (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.front_sight_height_mm}
                      onChange={(e) => setFormData({ ...formData, front_sight_height_mm: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="3"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Hullkorn i mm. Vanlig Felt oppsett er ca 3 mm uten adler (legg inn din verdi her)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900 mb-2">
              <strong>OBS: Regenerering av tabeller</strong>
            </p>
            <p className="text-sm text-amber-900">
              Når du lagrer endringene vil alle ballistiske tabeller (avstandstabell, knepptabell og vindtabell)
              bli slettet og regenerert basert på de nye verdiene. Dette kan ikke angres.
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/ballistics/${id}`)}
              className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Oppdaterer...' : 'Lagre endringer'}</span>
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
