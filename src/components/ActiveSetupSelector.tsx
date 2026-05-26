import { useState, useEffect } from 'react';
import { Target, Crosshair, CreditCard as Edit2, AlertCircle, Plus, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import {
  getUserWeapons,
  getWeaponBarrels,
  getUserClickTables,
  getUserBallisticProfiles,
} from '../lib/active-setup-service';
import { supabase } from '../lib/supabase';
import { Weapon, WeaponBarrel, ClickTable, BallisticProfile } from '../types/database';

function hasValidActiveSetup(setup: any) {
  return (
    setup &&
    setup.weapon_id &&
    setup.barrel_id &&
    (setup.click_table_id || setup.ballistic_profile_id)
  );
}

export function ActiveSetupSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeSetup, updateActiveSetup, loading: setupLoading } = useActiveSetup();


  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [barrels, setBarrels] = useState<WeaponBarrel[]>([]);
  const [clickTables, setClickTables] = useState<ClickTable[]>([]);
  const [ballisticProfiles, setBallisticProfiles] = useState<BallisticProfile[]>([]);

  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const [selectedBarrelId, setSelectedBarrelId] = useState<string>('');
  const [profileType, setProfileType] = useState<'click_table' | 'ballistic_profile'>('click_table');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const [activeAmmoName, setActiveAmmoName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (activeSetup) {
      setSelectedWeaponId(activeSetup.weapon_id || '');
      setSelectedBarrelId(activeSetup.barrel_id || '');

      if (activeSetup.click_table_id) {
        setProfileType('click_table');
        setSelectedProfileId(activeSetup.click_table_id);
      } else if (activeSetup.ballistic_profile_id) {
        setProfileType('ballistic_profile');
        setSelectedProfileId(activeSetup.ballistic_profile_id);
      }
    }
  }, [activeSetup]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          getUserWeapons(user.id),
          getUserClickTables(user.id),
          getUserBallisticProfiles(user.id),
        ]);

        const weaponsData = results[0].status === 'fulfilled' ? results[0].value : [];
        const clickTablesData = results[1].status === 'fulfilled' ? results[1].value : [];
        const ballisticProfilesData = results[2].status === 'fulfilled' ? results[2].value : [];

        setWeapons(weaponsData);
        setClickTables(clickTablesData);
        setBallisticProfiles(ballisticProfilesData);
      } catch (error) {
        console.error('❌ Error loading setup data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (!selectedWeaponId) {
      setBarrels([]);
      return;
    }

    const loadBarrels = async () => {
      try {
        const barrelsData = await getWeaponBarrels(selectedWeaponId);
        setBarrels(barrelsData);
      } catch (error) {
        console.error('Error loading barrels:', error);
      }
    };

    loadBarrels();
  }, [selectedWeaponId]);

  useEffect(() => {
    if (!activeSetup?.weapon_id || !user) {
      setActiveAmmoName(null);
      return;
    }
    const fetchAmmo = async () => {
      const weaponId = activeSetup.weapon_id!;
      const barrelId = activeSetup.barrel_id;

      // 1. Check is_current_active
      let query = supabase
        .from('ammo_inventory')
        .select('name')
        .eq('user_id', user.id)
        .eq('weapon_id', weaponId)
        .eq('is_current_active', true)
        .eq('is_active', true);
      if (barrelId) query = query.eq('barrel_id', barrelId);
      const { data: active } = await query.maybeSingle();
      if (active) { setActiveAmmoName(active.name); return; }

      // 2. Fallback: is_default_felt
      let q2 = supabase
        .from('ammo_inventory')
        .select('name')
        .eq('user_id', user.id)
        .eq('weapon_id', weaponId)
        .eq('is_active', true)
        .eq('is_default_felt', true);
      if (barrelId) q2 = q2.eq('barrel_id', barrelId);
      const { data: felt } = await q2.maybeSingle();
      if (felt) { setActiveAmmoName(felt.name); return; }

      // 3. Fallback: first active ammo for this weapon (with barrel match)
      if (barrelId) {
        const { data: withBarrel } = await supabase
          .from('ammo_inventory')
          .select('name')
          .eq('user_id', user.id)
          .eq('weapon_id', weaponId)
          .eq('barrel_id', barrelId)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (withBarrel) { setActiveAmmoName(withBarrel.name); return; }
      }

      // 4. Fallback: first active ammo for weapon (any barrel)
      const { data: anyAmmo } = await supabase
        .from('ammo_inventory')
        .select('name')
        .eq('user_id', user.id)
        .eq('weapon_id', weaponId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      setActiveAmmoName(anyAmmo?.name || null);
    };
    fetchAmmo();
  }, [activeSetup?.weapon_id, activeSetup?.barrel_id, user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      await updateActiveSetup({
        weapon_id: selectedWeaponId || null,
        barrel_id: selectedBarrelId || null,
        click_table_id: profileType === 'click_table' ? selectedProfileId || null : null,
        ballistic_profile_id: profileType === 'ballistic_profile' ? selectedProfileId || null : null,
      });

      setEditMode(false);
    } catch (error) {
      console.error('Error saving active setup:', error);
    } finally {
      setSaving(false);
    }
  };

  const isSetupValid = selectedWeaponId && selectedBarrelId && selectedProfileId;

  if (loading || setupLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-medium text-slate-900">Aktivt oppsett</h3>
        </div>
        <p className="text-slate-600">Laster...</p>
      </div>
    );
  }

  const setupComplete = hasValidActiveSetup(activeSetup);

  if (setupComplete && !editMode) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 text-sm leading-tight">Aktivt oppsett</h3>
              <p className="text-[10px] text-emerald-600 leading-tight">Klar til stevne</p>
            </div>
          </div>
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-1.5 bg-white border border-emerald-300 hover:border-emerald-400 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Edit2 className="h-3 w-3" />
            Bytt
          </button>
        </div>
        <div className="space-y-1.5 text-sm">
          {activeSetup.weapon && (
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 text-xs">Våpen</span>
              <span className="font-medium text-emerald-900 text-xs">
                {activeSetup.weapon.weapon_name} ({activeSetup.weapon.caliber})
              </span>
            </div>
          )}
          {activeSetup.barrel && (
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 text-xs">Løp</span>
              <span className="font-medium text-emerald-900 text-xs">
                {activeSetup.barrel.barrel_name}
              </span>
            </div>
          )}
          {activeAmmoName && (
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 text-xs flex items-center gap-1">
                <Package className="w-3 h-3" />
                Ammo
              </span>
              <span className="font-medium text-emerald-900 text-xs">{activeAmmoName}</span>
            </div>
          )}
          {activeSetup.click_table && (
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 text-xs">Tabell</span>
              <span className="font-medium text-emerald-900 text-xs">
                {activeSetup.click_table.name}
              </span>
            </div>
          )}
          {activeSetup.ballistic_profile && (
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 text-xs">Profil</span>
              <span className="font-medium text-emerald-900 text-xs">
                {activeSetup.ballistic_profile.name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const showOnboarding = !setupComplete;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {showOnboarding && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">
                Før du kan bruke appen må du sette opp utstyret ditt
              </h4>
              <p className="text-sm text-amber-700">
                Velg våpen, løp og enten knepptabell eller ballistisk profil for å komme i gang.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-3 mb-4">
        <Target className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-medium text-slate-900">
          {editMode ? 'Endre oppsett' : 'Sett opp utstyr'}
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Våpen
          </label>
          {weapons.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Ingen våpen funnet.</p>
              <button
                onClick={() => navigate('/weapons')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Legg til våpen</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-slate-500" />
              <select
                value={selectedWeaponId}
                onChange={(e) => {
                  setSelectedWeaponId(e.target.value);
                  setSelectedBarrelId('');
                }}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="">Velg våpen</option>
                {weapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>
                    {weapon.weapon_name} ({weapon.caliber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedWeaponId && barrels.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Løp
            </label>
            <select
              value={selectedBarrelId}
              onChange={(e) => setSelectedBarrelId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="">Velg løp</option>
              {barrels.map((barrel) => (
                <option key={barrel.id} value={barrel.id}>
                  {barrel.barrel_name} ({barrel.total_rounds_fired} skudd)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Profil type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="click_table"
                checked={profileType === 'click_table'}
                onChange={(e) => {
                  setProfileType(e.target.value as 'click_table');
                  setSelectedProfileId('');
                }}
                className="mr-2"
              />
              <span className="text-slate-900">Knepptabell</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="ballistic_profile"
                checked={profileType === 'ballistic_profile'}
                onChange={(e) => {
                  setProfileType(e.target.value as 'ballistic_profile');
                  setSelectedProfileId('');
                }}
                className="mr-2"
              />
              <span className="text-slate-900">Ballistisk profil</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {profileType === 'click_table' ? 'Knepptabell' : 'Ballistisk profil'}
          </label>
          {profileType === 'click_table' && clickTables.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Ingen knepptabeller funnet.</p>
              <button
                onClick={() => navigate('/click-tables/new')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Opprett knepptabell</span>
              </button>
            </div>
          ) : profileType === 'ballistic_profile' && ballisticProfiles.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Ingen ballistiske profiler funnet.</p>
              <button
                onClick={() => navigate('/ballistics/new')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Opprett ballistisk profil</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Crosshair className="h-5 w-5 text-slate-500" />
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="">
                  {profileType === 'click_table' ? 'Velg knepptabell' : 'Velg ballistisk profil'}
                </option>
                {profileType === 'click_table'
                  ? clickTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} (null: {table.zero_distance}m)
                      </option>
                    ))
                  : ballisticProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name} (null: {profile.zero_distance_m}m)
                      </option>
                    ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={saving || !isSetupValid}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Lagrer...' : 'Lagre oppsett'}
          </button>
          {editMode && (
            <button
              onClick={() => setEditMode(false)}
              disabled={saving}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
            >
              Avbryt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
