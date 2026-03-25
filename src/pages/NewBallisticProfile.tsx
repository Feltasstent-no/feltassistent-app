import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Weapon, WeaponBarrel, AmmoProfile } from '../types/database';
import { Activity, Save } from 'lucide-react';
import { generateDistanceTable, generateClickTable, calculateWindTable } from '../lib/ballistics';
import { getLastBallisticDefaults, setLastBallisticDefaults } from '../lib/user-preferences';

export function NewBallisticProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [barrels, setBarrels] = useState<WeaponBarrel[]>([]);
  const [ammoProfiles, setAmmoProfiles] = useState<AmmoProfile[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    ammo_profile_id: '',
    bullet_name: '',
    ballistic_coefficient: '',
    muzzle_velocity: '',
    zero_distance_m: '300',
    min_distance_m: '100',
    max_distance_m: '600',
    distance_interval_m: '25',
    temperature_c: '15',
    humidity_percent: '78',
    pressure_mm: '750',
    altitude_m: '100',
    sight_type: 'busk_standard',
    sight_height_mm: '34',
    sight_radius_cm: '85',
    front_sight_height_mm: '3',
    weapon_id: '',
    barrel_id: '',
  });

  useEffect(() => {
    const saved = getLastBallisticDefaults();
    if (saved) {
      setFormData(prev => ({
        ...prev,
        sight_height_mm: saved.sight_height_mm || prev.sight_height_mm,
        sight_radius_cm: saved.sight_radius_cm || prev.sight_radius_cm,
        front_sight_height_mm: saved.front_sight_height_mm || prev.front_sight_height_mm,
        sight_type: saved.sight_type || prev.sight_type,
        weapon_id: saved.weapon_id || prev.weapon_id,
        barrel_id: saved.barrel_id || prev.barrel_id,
      }));
    }
  }, []);

  useEffect(() => {
    fetchWeapons();
    fetchAmmoProfiles();
  }, [user]);

  useEffect(() => {
    if (formData.weapon_id) {
      fetchBarrels(formData.weapon_id);
    } else {
      setBarrels([]);
      setFormData(prev => ({ ...prev, barrel_id: '' }));
    }
  }, [formData.weapon_id]);

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

  const fetchWeapons = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weapons')
      .select('*')
      .eq('is_active', true)
      .order('weapon_name');
    if (data) setWeapons(data);
  };

  const fetchBarrels = async (weaponId: string) => {
    const { data } = await supabase
      .from('weapon_barrels')
      .select('*')
      .eq('weapon_id', weaponId)
      .order('installed_date', { ascending: false });
    if (data) setBarrels(data);
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
    if (!user) return;

    setLoading(true);

    const profileData = {
      user_id: user.id,
      name: formData.name,
      ammo_profile_id: formData.ammo_profile_id || null,
      bullet_name: formData.bullet_name || null,
      ballistic_coefficient: parseFloat(formData.ballistic_coefficient),
      muzzle_velocity: parseInt(formData.muzzle_velocity),
      zero_distance_m: parseInt(formData.zero_distance_m),
      min_distance_m: parseInt(formData.min_distance_m),
      max_distance_m: parseInt(formData.max_distance_m),
      distance_interval_m: parseInt(formData.distance_interval_m),
      temperature_c: parseFloat(formData.temperature_c),
      humidity_percent: parseFloat(formData.humidity_percent),
      pressure_mm: parseFloat(formData.pressure_mm),
      altitude_m: parseInt(formData.altitude_m),
      sight_type: formData.sight_type,
      sight_height_mm: parseFloat(formData.sight_height_mm),
      sight_radius_cm: formData.sight_radius_cm ? parseFloat(formData.sight_radius_cm) : null,
      front_sight_height_mm: formData.front_sight_height_mm ? parseFloat(formData.front_sight_height_mm) : null,
      weapon_id: formData.weapon_id || null,
      barrel_id: formData.barrel_id || null,
    };

    const { data: profile, error } = await supabase
      .from('ballistic_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      alert('Feil ved opprettelse: ' + error.message);
      setLoading(false);
      return;
    }

    if (profile) {
      setLastBallisticDefaults({
        sight_height_mm: formData.sight_height_mm,
        sight_radius_cm: formData.sight_radius_cm,
        front_sight_height_mm: formData.front_sight_height_mm,
        sight_type: formData.sight_type,
        weapon_id: formData.weapon_id,
        barrel_id: formData.barrel_id,
      });

      const distanceTable = generateDistanceTable(profile);
      const clickTable = generateClickTable(profile, distanceTable);
      const windTable = calculateWindTable(profile);

      await Promise.all([
        supabase.from('ballistic_distance_table').insert(
          distanceTable.map(row => ({
            profile_id: profile.id,
            distance_m: row.distance_m,
            click_value: row.click_value,
            bullet_drop_mm: row.bullet_drop_mm,
          }))
        ),
        supabase.from('ballistic_click_table').insert(
          clickTable.map(row => ({
            profile_id: profile.id,
            click: row.click,
            distance_m: row.distance_m,
          }))
        ),
        supabase.from('ballistic_wind_table').insert(
          windTable.map(row => ({
            profile_id: profile.id,
            distance_m: row.distance_m,
            wind_speed: row.wind_speed,
            wind_clicks: row.wind_clicks,
          }))
        ),
      ]);

      navigate(`/ballistics/${profile.id}`);
    }

    setLoading(false);
  };

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Activity className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Ny ballistisk profil</h1>
          </div>
          <p className="text-slate-600">Opprett en ballistisk profil for automatisk tabellgenerering</p>
        </div>

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

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Våpen</label>
            <select
              value={formData.weapon_id}
              onChange={(e) => setFormData({ ...formData, weapon_id: e.target.value, barrel_id: '' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Ingen våpen valgt</option>
              {weapons.map((weapon) => (
                <option key={weapon.id} value={weapon.id}>
                  {weapon.weapon_name} ({weapon.caliber || 'ukjent kaliber'})
                </option>
              ))}
            </select>
          </div>

          {formData.weapon_id && barrels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Løp (valgfritt)
              </label>
              <select
                value={formData.barrel_id}
                onChange={(e) => setFormData({ ...formData, barrel_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Generell for våpen</option>
                {barrels.map((barrel) => (
                  <option key={barrel.id} value={barrel.id}>
                    {barrel.barrel_number}
                    {barrel.barrel_name && ` - ${barrel.barrel_name}`}
                    {barrel.is_active && ' (Aktivt)'}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Værforhold</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Temperatur (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperature_c}
                    onChange={(e) => setFormData({ ...formData, temperature_c: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Luftfuktighet (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.humidity_percent}
                    onChange={(e) => setFormData({ ...formData, humidity_percent: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Barometertrykk (mmHg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.pressure_mm}
                    onChange={(e) => setFormData({ ...formData, pressure_mm: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="760"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Høyde over havet (m)
                  </label>
                  <input
                    type="number"
                    value={formData.altitude_m}
                    onChange={(e) => setFormData({ ...formData, altitude_m: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2">
              <strong>Anbefalt arbeidsflyt:</strong>
            </p>
            <ol className="text-sm text-blue-900 space-y-1 list-decimal list-inside">
              <li>Opprett denne ballistiske profilen med BC, V0 og siktedata</li>
              <li>Sjekk at tabellen stemmer med ditt oppsett</li>
              <li>Generer en knepptabell fra profilen (knapp på profilsiden)</li>
              <li>Sett knepptabellen som aktiv i oppsettet ditt</li>
            </ol>
            <p className="text-sm text-blue-800 mt-2">
              Da bruker appen samme kneppverdier konsekvent i kneppassistenten og under stevnegjennomføring.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-700 mb-2">
              <strong>Forhåndsutfylte verdier:</strong>
            </p>
            <p className="text-sm text-slate-600">
              Skjemaet er forhåndsutfylt med vanlige verdier for Sauer/Busk oppsett (siktehøyde 34 mm, hullavstand 85 cm, hullkorn 3 mm, Busk Standard).
              Endre disse til dine egne verdier.
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/ballistics')}
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
              <span>{loading ? 'Oppretter...' : 'Opprett profil'}</span>
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
