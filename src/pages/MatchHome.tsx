import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { ActiveSetupSelector } from '../components/ActiveSetupSelector';
import { getActiveMatchSession, getMatchHistory, cancelMatchSession } from '../lib/match-service';
import { History, Play, BookOpen, XCircle, Clock, Crosshair, Minus, CheckCircle, CheckCircle2, ArrowRight, Target } from 'lucide-react';
import apertureIcon from '../assets/aperture_icon_light.svg';
import { AmmoStatusCard } from '../components/AmmoStatusCard';
import type { MatchSession } from '../lib/match-service';
import { supabase } from '../lib/supabase';
import { logWeaponShots } from '../lib/weapon-shot-service';

interface WeaponWithBarrel {
  id: string;
  weapon_name: string;
  weapon_number: string;
  total_shots_fired: number;
  active_barrel?: {
    id: string;
    barrel_name: string;
    total_shots_fired: number;
  };
}

function hasValidActiveSetup(setup: any) {
  return (
    setup &&
    setup.weapon_id &&
    setup.barrel_id &&
    (setup.click_table_id || setup.ballistic_profile_id)
  );
}

export function MatchHome() {
  const { user } = useAuth();
  const { activeSetup } = useActiveSetup();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<MatchSession | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchSession[]>([]);
  const [weapons, setWeapons] = useState<WeaponWithBarrel[]>([]);
  const [showShotInput, setShowShotInput] = useState<string | null>(null);
  const [shotInputValue, setShotInputValue] = useState('');
  const [loading, setLoading] = useState(true);

  const setupComplete = hasValidActiveSetup(activeSetup);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [active, recent, weaponsRes] = await Promise.all([
      getActiveMatchSession(user.id),
      getMatchHistory(user.id, 5),
      supabase
        .from('weapons')
        .select('id, weapon_name, weapon_number, total_shots_fired')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    setActiveSession(active);
    setRecentMatches(recent.filter((m) => m.status !== 'in_progress' && m.status !== 'paused'));

    if (weaponsRes.data) {
      const weaponsWithBarrels = await Promise.all(
        weaponsRes.data.map(async (weapon) => {
          const { data: barrel } = await supabase
            .from('weapon_barrels')
            .select('id, barrel_name, total_shots_fired')
            .eq('weapon_id', weapon.id)
            .eq('is_active', true)
            .maybeSingle();

          return {
            ...weapon,
            active_barrel: barrel || undefined,
          };
        })
      );
      setWeapons(weaponsWithBarrels);
    }

    setLoading(false);
  };

  const handleCancelMatch = async () => {
    if (!activeSession) return;

    const confirmed = window.confirm(
      'Er du sikker på at du vil stoppe dette stevnet? Dette kan ikke angres.'
    );

    if (!confirmed) return;

    await cancelMatchSession(activeSession.id);
    setActiveSession(null);
    await fetchData();
  };

  const handleUpdateShots = async (weaponId: string, shots: number) => {
    if (!user || shots === 0 || isNaN(shots)) {
      alert('Ugyldig antall skudd');
      return;
    }

    try {
      await logWeaponShots({
        userId: user.id,
        weaponId,
        shotsFired: shots,
        shotDate: new Date().toISOString().split('T')[0],
        source: 'dashboard',
      });

      await fetchData();
      setShowShotInput(null);
      setShotInputValue('');
    } catch (error: any) {
      console.error('Error updating shots:', error);
      alert('Feil ved lagring av skudd: ' + (error?.message || 'Ukjent feil'));
    }
  };

  const handleQuickUpdate = async (weaponId: string, shots: number) => {
    try {
      await handleUpdateShots(weaponId, shots);
    } catch (error: any) {
      console.error('Error updating shots:', error);
      alert('Feil ved lagring av skudd: ' + (error?.message || 'Ukjent feil'));
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

  const hasWeaponAndBarrel = activeSetup?.weapon_id && activeSetup?.barrel_id;
  const hasClickTableOrProfile = activeSetup?.click_table_id || activeSetup?.ballistic_profile_id;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pb-20 md:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Feltassistent</h1>
          <p className="text-slate-600">Guidet stevnemodus for DFS Felt</p>
        </div>

        {!setupComplete && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Før du kan bruke appen må du sette opp:</h2>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2.5">
                {hasWeaponAndBarrel ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-sm ${hasWeaponAndBarrel ? 'text-slate-900' : 'text-slate-600'}`}>
                  Våpen og løp
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                {hasClickTableOrProfile ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-sm ${hasClickTableOrProfile ? 'text-slate-900' : 'text-slate-600'}`}>
                  Knepptabell, enten alene eller generert fra ballistisk profil
                </span>
              </li>
            </ul>
            <button
              onClick={() => navigate('/weapons')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center space-x-2"
            >
              <span>Start oppsett</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {setupComplete && (
          <div className="mb-8">
            <ActiveSetupSelector />
          </div>
        )}

        {activeSession && (
          <div className="bg-emerald-50 border-2 border-emerald-600 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-emerald-700 font-medium mb-1">Aktivt stevne</p>
                <h2 className="text-xl font-bold text-slate-900">{activeSession.match_name}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Hold {activeSession.current_hold_index + 1}
                </p>
              </div>
              <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {activeSession.status === 'paused' ? 'PAUSE' : 'PÅGÅR'}
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/match/${activeSession.id}`)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-lg transition shadow-lg flex items-center justify-center space-x-2"
              >
                <Play className="w-6 h-6" />
                <span>Fortsett stevne</span>
              </button>
              <button
                onClick={handleCancelMatch}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition flex items-center justify-center space-x-2 border border-red-200"
              >
                <XCircle className="w-5 h-5" />
                <span>Stopp stevne</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 mb-8">
          <button
            onClick={() => setupComplete ? navigate('/match/setup') : null}
            disabled={!setupComplete}
            className={`bg-white border-2 rounded-xl p-4 sm:p-6 transition group text-left ${
              setupComplete
                ? 'border-slate-200 hover:border-emerald-600 cursor-pointer'
                : 'border-slate-200 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-emerald-100 group-hover:bg-emerald-600 rounded-xl flex items-center justify-center transition flex-shrink-0 relative">
                <img src={apertureIcon} alt="" className="w-9 h-9 absolute opacity-100 group-hover:opacity-0 transition" style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(500%) hue-rotate(130deg) brightness(90%)' }} />
                <img src={apertureIcon} alt="" className="w-9 h-9 absolute opacity-0 group-hover:opacity-100 transition brightness-0 invert" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Start Feltstevne</h3>
                <p className="text-sm text-slate-600">
                  {setupComplete
                    ? 'Guidet gjennomføring av DFS feltløp'
                    : 'Fullfør oppsett for å starte'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/field-clock')}
            className="bg-white border-2 border-slate-200 hover:border-blue-600 rounded-xl p-4 sm:p-6 transition group text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-blue-100 group-hover:bg-blue-600 rounded-xl flex items-center justify-center transition">
                <Clock className="w-7 h-7 text-blue-600 group-hover:text-white transition" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Feltklokke</h3>
                <p className="text-sm text-slate-600">
                  Feltklokke for trening og stevner
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setupComplete ? navigate('/shot-assistant') : null}
            disabled={!setupComplete}
            className={`bg-white border-2 rounded-xl p-4 sm:p-6 transition group text-left ${
              setupComplete
                ? 'border-slate-200 hover:border-violet-600 cursor-pointer'
                : 'border-slate-200 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition ${
                setupComplete
                  ? 'bg-violet-100 group-hover:bg-violet-600'
                  : 'bg-slate-100'
              }`}>
                <Crosshair className={`w-7 h-7 transition ${
                  setupComplete
                    ? 'text-violet-600 group-hover:text-white'
                    : 'text-slate-400'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Knepp</h3>
                <p className="text-sm text-slate-600">
                  {setupComplete
                    ? 'Rask kneppberegning'
                    : 'Fullfør oppsett for å bruke'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/training')}
            className="bg-white border-2 border-slate-200 hover:border-amber-600 rounded-xl p-4 sm:p-6 transition group text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-amber-100 group-hover:bg-amber-600 rounded-xl flex items-center justify-center transition">
                <BookOpen className="w-7 h-7 text-amber-600 group-hover:text-white transition" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Treningslogg</h3>
                <p className="text-sm text-slate-600">
                  Loggfør og følg treningsøkter
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/match/history')}
            className="bg-white border-2 border-slate-200 hover:border-slate-600 rounded-xl p-4 sm:p-6 transition group text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-slate-100 group-hover:bg-slate-600 rounded-xl flex items-center justify-center transition">
                <History className="w-7 h-7 text-slate-600 group-hover:text-white transition" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Historikk</h3>
                <p className="text-sm text-slate-600">
                  Se tidligere stevner og resultater
                </p>
              </div>
            </div>
          </button>
        </div>

        {weapons.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-8">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Skuddteller</h2>
                <button
                  onClick={() => navigate('/weapons')}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                >
                  Administrer
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {weapons.map((weapon) => (
                <div key={weapon.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{weapon.weapon_name}</h3>
                        <p className="text-sm text-slate-500">{weapon.weapon_number}</p>
                        {weapon.active_barrel && (
                          <p className="text-xs text-slate-500 mt-1">
                            Løp: {weapon.active_barrel.barrel_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{weapon.total_shots_fired}</p>
                      <p className="text-xs text-slate-500">totalt skudd</p>
                      {weapon.active_barrel && (
                        <p className="text-xs text-slate-500 mt-1">
                          Løp: {weapon.active_barrel.total_shots_fired} skudd
                        </p>
                      )}
                    </div>
                  </div>

                  {showShotInput === weapon.id ? (
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={shotInputValue}
                        onChange={(e) => setShotInputValue(e.target.value)}
                        placeholder="Antall skudd"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const shots = parseInt(shotInputValue);
                          if (!isNaN(shots)) {
                            handleUpdateShots(weapon.id, shots);
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                      >
                        Legg til
                      </button>
                      <button
                        onClick={() => {
                          setShowShotInput(null);
                          setShotInputValue('');
                        }}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
                      >
                        Avbryt
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          handleQuickUpdate(weapon.id, 10);
                        }}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => {
                          handleQuickUpdate(weapon.id, 20);
                        }}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
                      >
                        +20
                      </button>
                      <button
                        onClick={() => {
                          handleQuickUpdate(weapon.id, 50);
                        }}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => setShowShotInput(weapon.id)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
                      >
                        Egendefinert
                      </button>
                      <button
                        onClick={() => {
                          handleQuickUpdate(weapon.id, -10);
                        }}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {setupComplete && <AmmoStatusCard />}

        {recentMatches.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Siste stevner</h2>
            <div className="space-y-3">
              {recentMatches.slice(0, 3).map((match) => {
                const getRouteForMatch = (match: MatchSession) => {
                  if (match.status === 'completed') {
                    return `/match/${match.id}/summary`;
                  } else if (match.status === 'setup') {
                    return `/match/${match.id}/configure`;
                  } else {
                    return `/match/${match.id}`;
                  }
                };

                const getStatusLabel = (status: string) => {
                  switch (status) {
                    case 'completed': return 'Fullført';
                    case 'setup': return 'Ufullstendig';
                    case 'in_progress': return 'Pågår';
                    case 'paused': return 'Pause';
                    default: return status;
                  }
                };

                return (
                  <button
                    key={match.id}
                    onClick={() => navigate(getRouteForMatch(match))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{match.match_name}</p>
                        <p className="text-sm text-slate-600">
                          {new Date(match.match_date).toLocaleDateString('nb-NO')}
                        </p>
                      </div>
                      {match.status === 'completed' ? (
                        <div className="flex items-center space-x-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Fullført</span>
                        </div>
                      ) : match.status === 'paused' ? (
                        <div className="flex items-center space-x-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Pause</span>
                        </div>
                      ) : match.status === 'setup' ? (
                        <div className="flex items-center space-x-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <span>Ufullstendig</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <span>Pågår</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
