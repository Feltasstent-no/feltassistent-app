import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { ActiveSetupSelector } from '../components/ActiveSetupSelector';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getActiveMatchSessions, getMatchHistory, cancelMatchSession, updateMatchMetadata } from '../lib/match-service';
import { cancelTrainingSession } from '../lib/training-session-service';
import { History, Play, BookOpen, XCircle, Clock, Crosshair, Minus, CheckCircle, CheckCircle2, ArrowRight, Target, Trophy, Pencil, Lightbulb } from 'lucide-react';
import { EditMetadataModal } from '../components/EditMetadataModal';
import apertureIcon from '../assets/aperture_icon_light.svg';
import { AmmoStatusCard } from '../components/AmmoStatusCard';
import type { MatchSession } from '../lib/match-service';
import { supabase } from '../lib/supabase';
import { logWeaponShots } from '../lib/weapon-shot-service';
import { CompetitionStatsSection } from '../components/stats/CompetitionStatsSection';

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

interface RecentItem {
  id: string;
  name: string;
  date: string;
  status: string;
  type: 'field' | 'range';
  route: string;
  totalHits?: number | null;
  innerHits?: number | null;
  totalScore?: number | null;
}

interface FocusPoint {
  id: string;
  text: string;
  source_type: 'felt' | 'bane' | 'trening';
  source_name: string;
  created_at: string;
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
  const { userMode } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSessions, setActiveSessions] = useState<MatchSession[]>([]);
  const [activeRangeMatches, setActiveRangeMatches] = useState<{ id: string; title: string; date: string; completedSeries: number; totalSeries: number }[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchSession[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [weapons, setWeapons] = useState<WeaponWithBarrel[]>([]);
  const [showShotInput, setShowShotInput] = useState<string | null>(null);
  const [shotInputValue, setShotInputValue] = useState('');
  const [shotAdjustMode, setShotAdjustMode] = useState<'add' | 'remove'>('add');
  const [focusPoints, setFocusPoints] = useState<FocusPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState<MatchSession | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelConfirmType, setCancelConfirmType] = useState<'field' | 'range'>('field');

  const locState = location.state as { fromOnboarding?: boolean; setupResult?: { weapon: boolean; barrel: boolean; ammo: boolean; profile: boolean; clickTable: boolean; caliberType: string | null; sightChoice: string | null } } | null;
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(!!locState?.fromOnboarding);
  const onboardingResult = locState?.setupResult || null;

  const fullSetupComplete = hasValidActiveSetup(activeSetup);
  const setupComplete = userMode === 'finfelt_only' ? true : fullSetupComplete;

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [activeSess, recent, weaponsRes, rangeRes, focusRes] = await Promise.all([
      getActiveMatchSessions(user.id),
      getMatchHistory(user.id, 10),
      supabase
        .from('weapons')
        .select('id, weapon_name, weapon_number, total_shots_fired')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('training_sessions')
        .select('id, title, session_date, status, created_at, total_score, total_inner_hits')
        .eq('user_id', user.id)
        .eq('session_type', 'range_match')
        .in('status', ['completed', 'active'])
        .order('session_date', { ascending: false })
        .limit(10),
      supabase
        .from('focus_points')
        .select('id, text, source_type, source_name, created_at')
        .eq('user_id', user.id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const activeIds = new Set(activeSess.map(s => s.id));
    setActiveSessions(activeSess);
    const filteredRecent = recent.filter((m) => !activeIds.has(m.id));
    setRecentMatches(filteredRecent);

    const fieldItems: RecentItem[] = filteredRecent.map(m => ({
      id: m.id,
      name: m.match_name,
      date: m.match_date,
      status: m.status,
      type: 'field',
      route: m.status === 'completed' ? `/match/${m.id}/summary`
        : m.status === 'setup' ? `/match/${m.id}/configure`
        : `/match/${m.id}`,
      totalHits: m.total_hits,
      innerHits: m.inner_hits,
    }));

    const activeRange = (rangeRes.data || []).filter((s: any) => s.status === 'active');
    const rangeItems: RecentItem[] = (rangeRes.data || [])
      .filter((s: any) => !activeRange.some((a: any) => a.id === s.id))
      .map((s: any) => ({
        id: s.id,
        name: s.title,
        date: s.session_date,
        status: s.status,
        type: 'range' as const,
        route: s.status === 'completed'
          ? `/training/session/${s.id}/summary`
          : `/match/range/${s.id}/run`,
        totalScore: s.total_score,
        innerHits: s.total_inner_hits,
      }));

    const activeRangeWithSeries = await Promise.all(
      activeRange.map(async (s: any) => {
        const { data: series } = await supabase
          .from('training_series')
          .select('id, completed')
          .eq('session_id', s.id);
        return {
          id: s.id,
          title: s.title,
          date: s.session_date,
          completedSeries: (series || []).filter((sr: any) => sr.completed).length,
          totalSeries: (series || []).length,
        };
      })
    );
    setActiveRangeMatches(activeRangeWithSeries);

    const combined = [...fieldItems, ...rangeItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
    setRecentItems(combined);
    setFocusPoints((focusRes.data || []) as FocusPoint[]);

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

  const handleCancelConfirm = async () => {
    if (!cancelConfirmId) return;
    if (cancelConfirmType === 'field') {
      await cancelMatchSession(cancelConfirmId);
      setActiveSessions(prev => prev.filter(s => s.id !== cancelConfirmId));
    } else {
      await cancelTrainingSession(cancelConfirmId);
      setActiveRangeMatches(prev => prev.filter(r => r.id !== cancelConfirmId));
    }
    setCancelConfirmId(null);
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
          <p className="text-slate-600">Guidet stevnemodus for DFS Skyting</p>
        </div>

        <CompetitionStatsSection />

        {showOnboardingSuccess && onboardingResult && (
          <OnboardingSuccessCard
            result={onboardingResult}
            onDismiss={() => setShowOnboardingSuccess(false)}
            onAction={() => {
              setShowOnboardingSuccess(false);
              if (onboardingResult.clickTable) {
                navigate('/shot-assistant');
              } else {
                navigate('/field-clock');
              }
            }}
          />
        )}

        {!setupComplete && userMode !== 'finfelt_only' && (
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

        {fullSetupComplete && (
          <div className="mb-8">
            <ActiveSetupSelector />
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Fokusområder</h2>
            </div>
            {focusPoints.length > 0 && (
              <button
                onClick={() => navigate('/focus-points')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition"
              >
                Se alle
              </button>
            )}
          </div>
          {focusPoints.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden px-4 py-3 flex items-start gap-3">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 leading-snug">{focusPoints[0].text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    focusPoints[0].source_type === 'felt' ? 'bg-emerald-100 text-emerald-700' :
                    focusPoints[0].source_type === 'bane' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {focusPoints[0].source_type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(focusPoints[0].created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-slate-500">Ingen fokusområder lagret ennå</p>
              <p className="text-xs text-slate-400 mt-0.5">Lagre erfaringer fra stevner og trening</p>
            </div>
          )}
        </div>

        {activeSessions.length > 0 && (
          <div className="space-y-4 mb-6">
            {activeSessions.map((sess) => {
              const isSetup = sess.status === 'setup';
              const isPaused = sess.status === 'paused';
              const route = isSetup
                ? `/match/${sess.id}/configure`
                : `/match/${sess.id}`;
              const statusLabel = isSetup ? 'OPPSETT' : isPaused ? 'PAUSE' : 'PÅGÅR';
              const statusColor = isSetup
                ? 'bg-slate-600'
                : isPaused
                ? 'bg-amber-600'
                : 'bg-emerald-600';
              const borderColor = isSetup
                ? 'border-slate-400'
                : 'border-emerald-600';
              const bgColor = isSetup
                ? 'bg-slate-50'
                : 'bg-emerald-50';

              return (
                <div key={sess.id} className={`${bgColor} border-2 ${borderColor} rounded-xl p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-emerald-700 font-medium mb-1">
                        {isSetup ? 'Stevne under oppsett' : 'Aktivt stevne'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xl font-bold text-slate-900">{sess.match_name}</h2>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditSession(sess); }}
                          className="p-1 rounded-md hover:bg-white/60 text-slate-400 hover:text-slate-600 transition"
                          title="Rediger stevneinfo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {!isSetup && (
                        <p className="text-sm text-slate-600 mt-1">
                          Hold {sess.current_hold_index + 1}
                        </p>
                      )}
                    </div>
                    <div className={`${statusColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                      {statusLabel}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate(route)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-lg transition shadow-lg flex items-center justify-center space-x-2"
                    >
                      <Play className="w-6 h-6" />
                      <span>{isSetup ? 'Fortsett oppsett' : 'Fortsett stevne'}</span>
                    </button>
                    <button
                      onClick={() => { setCancelConfirmType('field'); setCancelConfirmId(sess.id); }}
                      className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition flex items-center justify-center space-x-2 border border-red-200"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Avbryt stevne</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeRangeMatches.length > 0 && (
          <div className="space-y-4 mb-6">
            {activeRangeMatches.map((rm) => (
              <div key={rm.id} className="bg-amber-50 border-2 border-amber-500 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-amber-700 font-medium mb-1">Pågående banestevne</p>
                    <h2 className="text-xl font-bold text-slate-900">{rm.title}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Serie {rm.completedSeries} / {rm.totalSeries} fullført
                    </p>
                  </div>
                  <div className="bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    PÅGÅR
                  </div>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/match/range/${rm.id}/run`)}
                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white text-lg font-bold rounded-lg transition shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Play className="w-6 h-6" />
                    <span>Fortsett stevne</span>
                  </button>
                  <button
                    onClick={() => { setCancelConfirmType('range'); setCancelConfirmId(rm.id); }}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition flex items-center justify-center space-x-2 border border-red-200"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Avbryt stevne</span>
                  </button>
                </div>
              </div>
            ))}
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
            onClick={() => navigate('/training/session/new?mode=range_match')}
            className="bg-white border-2 border-slate-200 hover:border-amber-600 rounded-xl p-4 sm:p-6 transition group text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-amber-100 group-hover:bg-amber-600 rounded-xl flex items-center justify-center transition">
                <Trophy className="w-7 h-7 text-amber-600 group-hover:text-white transition" strokeWidth={2.25} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Start banestevne</h3>
                <p className="text-sm text-slate-600">
                  Baneskyting med serier, tid og resultat
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

          {userMode !== 'finfelt_only' && (
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
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Kneppassistent</h3>
                  <p className="text-sm text-slate-600">
                    {setupComplete
                      ? 'Rask kneppberegning'
                      : 'Fullfør oppsett for å bruke'}
                  </p>
                </div>
              </div>
            </button>
          )}

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
                        min="1"
                      />
                      <button
                        onClick={() => {
                          const qty = parseInt(shotInputValue);
                          if (!isNaN(qty) && qty > 0) {
                            const shots = shotAdjustMode === 'remove' ? -qty : qty;
                            handleUpdateShots(weapon.id, shots);
                          }
                        }}
                        className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${
                          shotAdjustMode === 'add'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {shotAdjustMode === 'add' ? 'Legg til' : 'Trekk fra'}
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
                        onClick={() => handleQuickUpdate(weapon.id, 10)}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleQuickUpdate(weapon.id, 20)}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
                      >
                        +20
                      </button>
                      <button
                        onClick={() => handleQuickUpdate(weapon.id, 50)}
                        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => {
                          setShotAdjustMode('add');
                          setShowShotInput(weapon.id);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
                      >
                        Egendefinert
                      </button>
                      <button
                        onClick={() => {
                          setShotAdjustMode('remove');
                          setShowShotInput(weapon.id);
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

        {fullSetupComplete && <AmmoStatusCard />}

        {recentItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Siste stevner</h2>
            <div className="space-y-3">
              {recentItems.map((item) => {
                const hasResult = item.type === 'field'
                  ? (item.totalHits != null && item.totalHits > 0)
                  : (item.totalScore != null && item.totalScore > 0);

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate(item.route)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            item.type === 'field'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.type === 'field' ? (
                              <><Target className="w-2.5 h-2.5" />FELT</>
                            ) : (
                              <><Trophy className="w-2.5 h-2.5" />BANE</>
                            )}
                          </span>
                        </div>
                        {hasResult && (
                          <p className="text-lg font-bold text-slate-900 mb-0.5">
                            {item.type === 'field' ? (
                              <>{item.totalHits} treff{item.innerHits ? <span className="text-sm font-medium text-slate-500 ml-1">({item.innerHits}*)</span> : null}</>
                            ) : (
                              <>{item.totalScore}p{item.innerHits ? <span className="text-sm font-medium text-slate-500 ml-1">({item.innerHits}*)</span> : null}</>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(item.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'completed' ? (
                          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Fullført</span>
                          </div>
                        ) : item.status === 'active' || item.status === 'in_progress' ? (
                          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            <span>Pågår</span>
                          </div>
                        ) : item.status === 'paused' ? (
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>Pause</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            <span>Ufullstendig</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editSession && (
        <EditMetadataModal
          title="Rediger stevneinfo"
          currentName={editSession.match_name}
          currentNotes={editSession.notes || ''}
          onSave={async (name, notes) => {
            const { error } = await updateMatchMetadata({
              sessionId: editSession.id,
              matchName: name,
              notes,
            });
            if (error) throw error;
            setActiveSessions(prev =>
              prev.map(s => s.id === editSession.id ? { ...s, match_name: name, notes: notes || undefined } : s)
            );
            setRecentMatches(prev =>
              prev.map(s => s.id === editSession.id ? { ...s, match_name: name, notes: notes || undefined } : s)
            );
          }}
          onClose={() => setEditSession(null)}
        />
      )}

      <ConfirmDialog
        open={!!cancelConfirmId}
        title="Avbryt stevne"
        message="Er du sikker på at du vil avbryte dette stevnet? Dette kan ikke angres."
        confirmText="Avbryt stevne"
        cancelText="Nei, behold"
        variant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelConfirmId(null)}
      />
    </Layout>
  );
}

function OnboardingSuccessCard({ result, onDismiss, onAction }: {
  result: { weapon: boolean; barrel: boolean; ammo: boolean; profile: boolean; clickTable: boolean; caliberType: string | null; sightChoice: string | null };
  onDismiss: () => void;
  onAction: () => void;
}) {
  const is22 = result.caliberType === '.22 LR';
  const has65Busk = result.caliberType === '6.5x55' && result.clickTable;

  return (
    <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-emerald-400 hover:text-emerald-600 transition-colors"
        aria-label="Lukk"
      >
        <XCircle className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2.5 mb-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <h3 className="font-bold text-slate-900">Feltassistenten er klar</h3>
      </div>

      <div className="space-y-1.5 mb-4">
        {result.weapon && <SuccessRow label="Vapen" />}
        {result.barrel && <SuccessRow label="Lop" />}
        {result.ammo && <SuccessRow label="Ammunisjon" />}
        {result.profile && <SuccessRow label="Startprofil" />}
        {result.clickTable && <SuccessRow label="Starttabell" />}
      </div>

      <button
        onClick={onAction}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
      >
        {has65Busk ? (
          <>
            <Crosshair className="w-4 h-4" />
            <span>Apne kneppassistent</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span>Apne feltklokke</span>
          </>
        )}
      </button>
    </div>
  );
}

function SuccessRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}
