import { useState, useEffect } from 'react';
import { Target, Crosshair, CreditCard as Edit2, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import {
  getUserWeapons,
  getWeaponBarrels,
  getUserClickTables,
  getUserBallisticProfiles,
} from '../lib/active-setup-service';
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

  console.log('🔍 ActiveSetupSelector render:', {
    user: user ? { id: user.id, email: user.email } : null,
    hasActiveSetup: !!activeSetup,
    setupLoading
  });

  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [barrels, setBarrels] = useState<WeaponBarrel[]>([]);
  const [clickTables, setClickTables] = useState<ClickTable[]>([]);
  const [ballisticProfiles, setBallisticProfiles] = useState<BallisticProfile[]>([]);

  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const [selectedBarrelId, setSelectedBarrelId] = useState<string>('');
  const [profileType, setProfileType] = useState<'click_table' | 'ballistic_profile'>('click_table');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

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
    console.log('🔍 useEffect [user] triggered:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email
    });

    if (!user) {
      console.log('🔍 No user, skipping data load');
      return;
    }

    const loadData = async () => {
      try {
        console.log('🔍 Starting loadData for userId:', user.id);
        setLoading(true);
        const results = await Promise.allSettled([
          getUserWeapons(user.id),
          getUserClickTables(user.id),
          getUserBallisticProfiles(user.id),
        ]);

        const weaponsData = results[0].status === 'fulfilled' ? results[0].value : [];
        const clickTablesData = results[1].status === 'fulfilled' ? results[1].value : [];
        const ballisticProfilesData = results[2].status === 'fulfilled' ? results[2].value : [];

        console.log('🔍 loadData completed:', {
          weaponsCount: weaponsData.length,
          clickTablesCount: clickTablesData.length,
          ballisticProfilesCount: ballisticProfilesData.length,
          errors: results.map((r, i) => r.status === 'rejected' ? { index: i, reason: r.reason } : null).filter(Boolean)
        });

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
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-900">Aktivt oppsett</h3>
          </div>
          <button
            onClick={() => setEditMode(true)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-medium flex items-center space-x-1"
          >
            <Edit2 className="h-4 w-4" />
            <span>Endre</span>
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {activeSetup.weapon && (
            <div className="flex justify-between">
              <span className="text-emerald-700">Våpen:</span>
              <span className="font-medium text-emerald-900">
                {activeSetup.weapon.weapon_name} ({activeSetup.weapon.caliber})
              </span>
            </div>
          )}
          {activeSetup.barrel && (
            <div className="flex justify-between">
              <span className="text-emerald-700">Løp:</span>
              <span className="font-medium text-emerald-900">
                {activeSetup.barrel.barrel_name}
              </span>
            </div>
          )}
          {activeSetup.click_table && (
            <div className="flex justify-between">
              <span className="text-emerald-700">Tabell:</span>
              <span className="font-medium text-emerald-900">
                {activeSetup.click_table.name}
              </span>
            </div>
          )}
          {activeSetup.ballistic_profile && (
            <div className="flex justify-between">
              <span className="text-emerald-700">Profil:</span>
              <span className="font-medium text-emerald-900">
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
