import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { Weapon, WeaponBarrel } from '../types/database';
import { Save } from 'lucide-react';
import { TabellIconBadge } from '../components/TabellIconBadge';

export function NewClickTable() {
  const { user } = useAuth();
  const { activeSetup, setClickTable } = useActiveSetup();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [barrels, setBarrels] = useState<WeaponBarrel[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    ammo_type: '',
    caliber: '',
    bullet_weight: '',
    muzzle_velocity: '',
    zero_distance: '100',
    sight_info: 'Busk Standard',
    weapon_id: '',
    barrel_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchWeapons();
  }, [user]);

  useEffect(() => {
    if (formData.weapon_id) {
      fetchBarrels(formData.weapon_id);
    } else {
      setBarrels([]);
      setFormData(prev => ({ ...prev, barrel_id: '' }));
    }
  }, [formData.weapon_id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('click_tables')
      .insert({
        user_id: user.id,
        name: formData.name,
        ammo_type: formData.ammo_type || null,
        caliber: formData.caliber || null,
        bullet_weight: formData.bullet_weight || null,
        muzzle_velocity: formData.muzzle_velocity || null,
        zero_distance: parseInt(formData.zero_distance),
        sight_info: formData.sight_info,
        weapon_id: formData.weapon_id || null,
        barrel_id: formData.barrel_id || null,
        notes: formData.notes || null,
        is_active: true,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert('Feil ved opprettelse: ' + error.message);
      return;
    }

    if (data) {
      if (!activeSetup?.click_table_id) {
        await setClickTable(data.id);
      }
      navigate(`/click-tables/${data.id}`);
    }
  };

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <TabellIconBadge size="md" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Ny knepptabell</h1>
          </div>
          <p className="text-slate-600">Opprett en knepptabell for automatiske kneppforslag</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Navn på tabell <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="F.eks. Grovfelt 2026"
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
            <p className="text-xs text-slate-500 mt-1">
              Knyt tabellen til et spesifikt våpen for enklere filtrering
            </p>
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
              <p className="text-xs text-slate-500 mt-1">
                Knyt tabellen til et spesifikt løp hvis kneppverdiene er løpsspesifikke
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Kaliber</label>
              <input
                type="text"
                value={formData.caliber}
                onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder=".308 Win"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Ammunisjon</label>
              <input
                type="text"
                value={formData.ammo_type}
                onChange={(e) => setFormData({ ...formData, ammo_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Norma Match"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Kulevekt</label>
              <input
                type="text"
                value={formData.bullet_weight}
                onChange={(e) => setFormData({ ...formData, bullet_weight: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="150 grains"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Utgangshastighet (m/s)
              </label>
              <input
                type="number"
                value={formData.muzzle_velocity}
                onChange={(e) => setFormData({ ...formData, muzzle_velocity: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Innskutt avstand (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.zero_distance}
                onChange={(e) => setFormData({ ...formData, zero_distance: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Siktetype
              </label>
              <select
                value={formData.sight_info}
                onChange={(e) => setFormData({ ...formData, sight_info: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Busk Standard">Busk Standard (grovknepp)</option>
                <option value="Busk Finknepp">Busk Finknepp</option>
                <option value="1/4 MOA">1/4 MOA</option>
                <option value="1/2 MOA">1/2 MOA</option>
                <option value="1 MOA">1 MOA</option>
                <option value="0.1 mil">0.1 mil</option>
                <option value="0.2 mil">0.2 mil</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Notater</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Eventuelle notater om siktet, værforhold, etc."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Tips:</strong> Etter at tabellen er opprettet, kan du legge til kneppverdier for ulike avstander.
              Disse brukes for å gi deg automatiske kneppforslag under feltløyper.
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/click-tables')}
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
              <span>{loading ? 'Oppretter...' : 'Opprett tabell'}</span>
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
