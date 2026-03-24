import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BallisticProfile, Weapon, WeaponBarrel } from '../types/database';
import { Plus, Target, Trash2, Activity } from 'lucide-react';

type ProfileWithRelations = BallisticProfile & {
  weapon?: Weapon | null;
  barrel?: WeaponBarrel | null;
};

export function Ballistics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('ballistic_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const profilesWithRelations: ProfileWithRelations[] = await Promise.all(
        data.map(async (profile) => {
          const profileWithRelations: ProfileWithRelations = { ...profile };

          if (profile.weapon_id) {
            const { data: weaponData } = await supabase
              .from('weapons')
              .select('*')
              .eq('id', profile.weapon_id)
              .maybeSingle();
            profileWithRelations.weapon = weaponData;
          }

          if (profile.barrel_id) {
            const { data: barrelData } = await supabase
              .from('weapon_barrels')
              .select('*')
              .eq('id', profile.barrel_id)
              .maybeSingle();
            profileWithRelations.barrel = barrelData;
          }

          return profileWithRelations;
        })
      );
      setProfiles(profilesWithRelations);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne ballistiske profilen? Dette vil også slette alle genererte tabeller.')) return;

    await supabase
      .from('ballistic_profiles')
      .delete()
      .eq('id', id);

    fetchProfiles();
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
      <div className="pb-20 md:pb-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Ballistikk</h1>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">Ballistiske profiler og tabeller</p>
          </div>
          <button
            onClick={() => navigate('/ballistics/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 sm:py-3 sm:px-6 rounded-lg transition flex items-center space-x-2 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ny profil</span>
            <span className="sm:hidden">Ny</span>
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Hva er ballistiske profiler?
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed mb-3">
            Ballistiske profiler er <strong>automatisk genererte tabeller</strong> basert på fysikk og matematikk.
            Du oppgir fysiske verdier (BC, V0, nullpunkt, temp) og systemet beregner kulefallet for alle avstander.
          </p>
          <div className="text-blue-800 text-sm">
            <p className="font-medium mb-1">Genererer:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Avstandstabell:</strong> Knepp for hver avstand (sentrert rundt nullpunkt)</li>
              <li><strong>Knepptabell:</strong> Knepp → Avstand mapping</li>
              <li><strong>Vindtabell:</strong> Vindkorreksjon for alle vindhastigheter</li>
            </ul>
          </div>
          <p className="text-blue-700 text-sm mt-3 italic">
            💡 Bruk dette for teoretiske beregninger før du skyter, eller for å eksperimentere med forskjellige kuler/hastigheter. Og overfør dette grunnlaget til knepptabellen for videre fintuning mot valgte våpen.
          </p>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Ingen ballistiske profiler enda</h2>
            <p className="text-slate-600 mb-6">
              Opprett din første ballistiske profil for å generere knepptabeller og vindtabeller
            </p>
            <button
              onClick={() => navigate('/ballistics/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Opprett profil</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:border-emerald-200 transition cursor-pointer"
                onClick={() => navigate(`/ballistics/${profile.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <Activity className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{profile.name}</h3>
                    </div>
                    {profile.bullet_name && (
                      <p className="text-sm text-slate-600 mb-2">{profile.bullet_name}</p>
                    )}
                    {profile.weapon && (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Våpen:</span> {profile.weapon.weapon_name}
                        {profile.barrel && (
                          <>
                            {' • '}
                            <span className="font-medium">Løp:</span> {profile.barrel.barrel_number}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(profile.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">BC</p>
                    <p className="font-medium text-slate-900">{profile.ballistic_coefficient}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">V0</p>
                    <p className="font-medium text-slate-900">{profile.muzzle_velocity} m/s</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Nullpunkt</p>
                    <p className="font-medium text-slate-900">{profile.zero_distance_m} m</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Siktehøyde</p>
                    <p className="font-medium text-slate-900">{profile.sight_height_mm} mm</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
