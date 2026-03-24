import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BallisticProfile, BallisticDistanceTable, BallisticClickTable, BallisticWindTable, Weapon, WeaponBarrel } from '../types/database';
import { ArrowLeft, Activity, FileText, CreditCard as Edit } from 'lucide-react';
import { getSightDisplayName } from '../lib/ballistics';

export function BallisticProfileDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BallisticProfile | null>(null);
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [barrel, setBarrel] = useState<WeaponBarrel | null>(null);
  const [distanceTable, setDistanceTable] = useState<BallisticDistanceTable[]>([]);
  const [clickTable, setClickTable] = useState<BallisticClickTable[]>([]);
  const [windTable, setWindTable] = useState<BallisticWindTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'distance' | 'click' | 'wind'>('distance');
  const [generatingClickTable, setGeneratingClickTable] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    const [profileRes, distanceRes, clickRes, windRes] = await Promise.all([
      supabase.from('ballistic_profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('ballistic_distance_table').select('*').eq('profile_id', id).order('distance_m'),
      supabase.from('ballistic_click_table').select('*').eq('profile_id', id).order('click'),
      supabase.from('ballistic_wind_table').select('*').eq('profile_id', id).order('distance_m').order('wind_speed'),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);

      if (profileRes.data.weapon_id) {
        const { data: weaponData } = await supabase
          .from('weapons')
          .select('*')
          .eq('id', profileRes.data.weapon_id)
          .maybeSingle();
        if (weaponData) setWeapon(weaponData);
      }

      if (profileRes.data.barrel_id) {
        const { data: barrelData } = await supabase
          .from('weapon_barrels')
          .select('*')
          .eq('id', profileRes.data.barrel_id)
          .maybeSingle();
        if (barrelData) setBarrel(barrelData);
      }
    }

    if (distanceRes.data) setDistanceTable(distanceRes.data);
    if (clickRes.data) setClickTable(clickRes.data);
    if (windRes.data) setWindTable(windRes.data);

    setLoading(false);
  };

  const handleGenerateClickTable = async () => {
    if (!profile || !user) return;

    if (distanceTable.length === 0) {
      alert('Ingen data å generere knepptabell fra. Profilen må ha avstands-data.');
      return;
    }

    setGeneratingClickTable(true);

    try {
      const clickTableName = `${profile.name} - Knepptabell`;

      const { data: newClickTable, error: clickTableError } = await supabase
        .from('click_tables')
        .insert({
          user_id: user.id,
          name: clickTableName,
          weapon_id: profile.weapon_id,
          barrel_id: profile.barrel_id,
          ballistic_profile_id: profile.id,
          generated_from_profile: true,
          zero_distance: profile.zero_distance_m,
          muzzle_velocity: String(profile.muzzle_velocity),
          notes: `Automatisk generert fra ballistisk profil: ${profile.name}`,
          sight_info: profile.sight_type
        })
        .select()
        .single();

      if (clickTableError) {
        console.error('Feil ved opprettelse av knepptabell:', clickTableError);
        throw new Error(`Kunne ikke opprette knepptabell: ${clickTableError.message}`);
      }

      if (!newClickTable) {
        throw new Error('Ingen data returnert fra knepptabell-opprettelse');
      }

      const rowsToInsert = distanceTable.map(row => ({
        click_table_id: newClickTable.id,
        distance_m: row.distance_m,
        clicks: Math.round(row.click_value)
      }));

      const { error: rowsError } = await supabase
        .from('click_table_rows')
        .insert(rowsToInsert);

      if (rowsError) {
        console.error('Feil ved opprettelse av knepptabell-rader:', rowsError);
        throw new Error(`Kunne ikke opprette rader: ${rowsError.message}`);
      }

      alert('Knepptabell opprettet!');
      navigate('/click-tables');
    } catch (error: any) {
      console.error('Feil ved generering av knepptabell:', error);
      alert(error.message || 'Kunne ikke generere knepptabell');
    } finally {
      setGeneratingClickTable(false);
    }
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

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Profil ikke funnet</h2>
          <button
            onClick={() => navigate('/ballistics')}
            className="text-emerald-600 hover:underline"
          >
            Tilbake til oversikt
          </button>
        </div>
      </Layout>
    );
  }

  const groupedWindTable = windTable.reduce((acc, row) => {
    if (!acc[row.distance_m]) {
      acc[row.distance_m] = [];
    }
    acc[row.distance_m].push(row);
    return acc;
  }, {} as Record<number, BallisticWindTable[]>);

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/ballistics')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake til ballistikk</span>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{profile.name}</h1>
              {profile.bullet_name && (
                <p className="text-slate-600 mt-1">{profile.bullet_name}</p>
              )}
              {weapon && (
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">Våpen:</span> {weapon.weapon_name}
                  {barrel && (
                    <>
                      {' • '}
                      <span className="font-medium">Løp:</span> {barrel.barrel_number}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between items-start gap-4 mt-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm w-full">
              <div>
                <p className="text-slate-500">BC (G1)</p>
                <p className="font-medium text-slate-900">{profile.ballistic_coefficient}</p>
              </div>
              <div>
                <p className="text-slate-500">V₀</p>
                <p className="font-medium text-slate-900">{profile.muzzle_velocity} m/s</p>
              </div>
              <div>
                <p className="text-slate-500">Nullpunkt</p>
                <p className="font-medium text-slate-900">{profile.zero_distance_m} m</p>
              </div>
              <div>
                <p className="text-slate-500">Sikte</p>
                <p className="font-medium text-slate-900">{getSightDisplayName(profile.sight_type)}</p>
              </div>
              <div>
                <p className="text-slate-500">Siktehøyde</p>
                <p className="font-medium text-slate-900">{profile.sight_height_mm} mm</p>
              </div>
              {profile.sight_radius_cm && (
                <div>
                  <p className="text-slate-500">Hullavstand</p>
                  <p className="font-medium text-slate-900">{profile.sight_radius_cm} cm</p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Område</p>
                <p className="font-medium text-slate-900">{profile.min_distance_m}-{profile.max_distance_m}m</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate(`/ballistics/${id}/edit`)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Edit className="w-4 h-4" />
                <span>Rediger profil</span>
              </button>
              <button
                onClick={handleGenerateClickTable}
                disabled={generatingClickTable || distanceTable.length === 0}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg transition"
              >
                <FileText className="w-4 h-4" />
                <span>{generatingClickTable ? 'Genererer...' : 'Generer knepptabell'}</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 text-sm">
            <div>
              <p className="text-slate-500">Temperatur</p>
              <p className="font-medium text-slate-900">{profile.temperature_c} °C</p>
            </div>
            <div>
              <p className="text-slate-500">Luftfuktighet</p>
              <p className="font-medium text-slate-900">{profile.humidity_percent} %</p>
            </div>
            <div>
              <p className="text-slate-500">Trykk</p>
              <p className="font-medium text-slate-900">{profile.pressure_mm} mmHg</p>
            </div>
            <div>
              <p className="text-slate-500">Høyde</p>
              <p className="font-medium text-slate-900">{profile.altitude_m} m</p>
            </div>
            <div>
              <p className="text-slate-500">Intervall</p>
              <p className="font-medium text-slate-900">{profile.distance_interval_m} m</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-emerald-900 mb-2">Neste steg: Generer knepptabell</h3>
          <p className="text-sm text-emerald-800">
            Bruk knappen "Generer knepptabell" over for å lage en knepptabell fra denne profilen.
            Sett deretter knepptabellen som aktiv i oppsettet ditt. Da bruker appen samme kneppverdier
            konsekvent i kneppassistenten og under stevnegjennomføring.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">Om nullpunkt-sentrerte tabeller</h3>
          <p className="text-sm text-amber-800">
            Tabellene er sentrert rundt nullpunktet ({profile.zero_distance_m} m).
            Knepp = 0 ved nullpunktet, negative knepp (ned) for kortere avstand,
            positive knepp (opp) for lengre avstand. Tilsvarer DFS Kulebanegenerator.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('distance')}
                className={`flex-1 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-base font-semibold transition ${
                  activeTab === 'distance'
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Meter → Knepp
              </button>
              <button
                onClick={() => setActiveTab('click')}
                className={`flex-1 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-base font-semibold transition ${
                  activeTab === 'click'
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Knepp → Meter
              </button>
              <button
                onClick={() => setActiveTab('wind')}
                className={`flex-1 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-base font-semibold transition ${
                  activeTab === 'wind'
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Vindtabell
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'distance' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-slate-900 text-sm sm:text-base">Avstand</th>
                      <th className="text-right py-3 px-2 sm:px-4 font-semibold text-slate-900 text-sm sm:text-base">Knepp</th>
                      <th className="text-right py-3 px-2 sm:px-4 font-semibold text-slate-900 text-sm sm:text-base">Drop (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distanceTable.map((row) => {
                      const isZero = row.distance_m === profile.zero_distance_m;
                      const isNearZero = Math.abs(row.click_value) < 0.5;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            isZero || isNearZero ? 'bg-amber-50 font-semibold' : ''
                          }`}
                        >
                          <td className={`py-3 px-4 ${isZero || isNearZero ? 'font-bold text-slate-900' : 'font-medium text-slate-900'}`}>
                            {row.distance_m}m
                            {isZero && <span className="ml-2 px-2 py-0.5 bg-amber-600 text-white text-xs rounded">ZERO</span>}
                          </td>
                          <td className={`py-3 px-4 text-right ${
                            row.click_value < 0 ? 'text-blue-700' : row.click_value > 0 ? 'text-red-700' : 'text-emerald-700 font-bold'
                          }`}>
                            {row.click_value > 0 ? '+' : ''}{row.click_value.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">{row.bullet_drop_mm.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'click' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-slate-900 text-sm sm:text-base">Knepp</th>
                      <th className="text-right py-3 px-2 sm:px-4 font-semibold text-slate-900 text-sm sm:text-base">Avstand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickTable.map((row) => {
                      const isZero = row.click === 0;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            isZero ? 'bg-amber-50 font-semibold' : ''
                          }`}
                        >
                          <td className={`py-3 px-4 ${
                            row.click < 0 ? 'text-blue-700' : row.click > 0 ? 'text-red-700' : 'text-emerald-700 font-bold'
                          }`}>
                            {row.click > 0 ? '+' : ''}{row.click}
                            {isZero && <span className="ml-2 px-2 py-0.5 bg-amber-600 text-white text-xs rounded">ZERO</span>}
                          </td>
                          <td className={`py-3 px-4 text-right ${isZero ? 'font-bold text-slate-900' : 'text-slate-900'}`}>
                            {row.distance_m}m
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'wind' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 font-semibold text-slate-900 sticky left-0 bg-white">Avst.(m)</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">0.5 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">1 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">1.5 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">2 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">3 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">4 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">5 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">6 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">8 m/s</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-900">10 m/s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(groupedWindTable).map((distance) => (
                      <tr key={distance} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 font-medium text-slate-900 sticky left-0 bg-white">{distance}</td>
                        {[0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10].map((speed) => {
                          const entry = groupedWindTable[Number(distance)].find(e => e.wind_speed === speed);
                          return (
                            <td key={speed} className="py-3 px-2 text-center text-slate-900">
                              {entry ? entry.wind_clicks.toFixed(1) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
