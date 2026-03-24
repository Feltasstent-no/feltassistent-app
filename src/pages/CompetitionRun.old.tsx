import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FieldFigure } from '../components/FieldFigure';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Competition,
  CompetitionEntry,
  CompetitionStage,
  CompetitionStageLog,
  ClickTable,
  ClickTableRow,
  FieldFigure as FieldFigureType,
  BallisticProfile,
  BallisticDistanceTable,
  BallisticWindTable,
  Weapon,
  WeaponBarrel,
} from '../types/database';
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Camera,
  CheckCircle2,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { ClickRecommendation, getWindClickRecommendation } from '../lib/ballistics';
import { ShotCountDialog } from '../components/ShotCountDialog';

export function CompetitionRun() {
  const navigate = useNavigate();
  const { competitionId, entryId } = useParams<{ competitionId: string; entryId: string }>();
  const { user } = useAuth();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entry, setEntry] = useState<CompetitionEntry | null>(null);
  const [stages, setStages] = useState<CompetitionStage[]>([]);
  const [stageLogs, setStageLogs] = useState<CompetitionStageLog[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [clickTable, setClickTable] = useState<ClickTable | null>(null);
  const [clickRows, setClickRows] = useState<ClickTableRow[]>([]);
  const [figures, setFigures] = useState<FieldFigureType[]>([]);
  const [ballisticProfile, setBallisticProfile] = useState<BallisticProfile | null>(null);
  const [distanceTable, setDistanceTable] = useState<BallisticDistanceTable[]>([]);
  const [windTable, setWindTable] = useState<BallisticWindTable[]>([]);
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [barrel, setBarrel] = useState<WeaponBarrel | null>(null);
  const [loading, setLoading] = useState(true);

  const [distance, setDistance] = useState('');
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [windDirection, setWindDirection] = useState<'left' | 'right' | null>(null);
  const [clickRecommendation, setClickRecommendation] = useState<ClickRecommendation | null>(null);
  const [windageRecommendation, setWindageRecommendation] = useState<ClickRecommendation | null>(null);
  const [usedElevationClicks, setUsedElevationClicks] = useState('');
  const [usedWindageClicks, setUsedWindageClicks] = useState('');
  const [resetToZero, setResetToZero] = useState(false);
  const [score, setScore] = useState('');
  const [innerHits, setInnerHits] = useState('');
  const [hits, setHits] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'prep' | 'shoot' | 'warning' | 'cooldown' | 'idle'>('idle');
  const timerIntervalRef = useRef<number | null>(null);

  const [showShotCountDialog, setShowShotCountDialog] = useState(false);
  const [totalShotsFired, setTotalShotsFired] = useState(0);

  useEffect(() => {
    fetchData();
  }, [competitionId, entryId, user]);

  useEffect(() => {
    if (distance && clickRows.length > 0) {
      const dist = parseInt(distance);
      if (!isNaN(dist)) {
        const recommendation = getClickRecommendationFromRows(dist);
        setClickRecommendation(recommendation);
        if (recommendation) {
          setUsedElevationClicks(recommendation.clicks.toString());
        }
      }
    } else {
      setClickRecommendation(null);
    }
  }, [distance, clickRows]);

  useEffect(() => {
    if (distance && windSpeed !== null && windTable.length > 0) {
      const dist = parseInt(distance);
      if (!isNaN(dist)) {
        const recommendation = getWindClickRecommendation(dist, windSpeed, windTable);
        setWindageRecommendation(recommendation);
        if (recommendation) {
          const windageValue = windDirection === 'left' ? -recommendation.clicks : recommendation.clicks;
          setUsedWindageClicks(windageValue.toString());
        }
      }
    } else {
      setWindageRecommendation(null);
      setUsedWindageClicks('');
    }
  }, [distance, windSpeed, windDirection, windTable]);

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning]);

  const fetchData = async () => {
    if (!competitionId || !entryId || !user) return;

    const [compRes, entryRes, stagesRes, logsRes, figuresRes] = await Promise.all([
      supabase.from('competitions').select('*').eq('id', competitionId).maybeSingle(),
      supabase.from('competition_entries').select('*').eq('id', entryId).maybeSingle(),
      supabase
        .from('competition_stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number'),
      supabase
        .from('competition_stage_logs')
        .select('*')
        .eq('entry_id', entryId)
        .order('completed_at'),
      supabase.from('field_figures').select('*').eq('is_active', true),
    ]);

    if (compRes.data) setCompetition(compRes.data);
    if (entryRes.data) {
      setEntry(entryRes.data);

      const tableRes = await supabase
        .from('click_tables')
        .select('*')
        .eq('id', entryRes.data.click_table_id)
        .maybeSingle();

      if (tableRes.data) {
        setClickTable(tableRes.data);

        const rowsRes = await supabase
          .from('click_table_rows')
          .select('*')
          .eq('click_table_id', tableRes.data.id)
          .order('distance_m');

        if (rowsRes.data) setClickRows(rowsRes.data);

        if (tableRes.data.ballistic_profile_id) {
          const profileRes = await supabase
            .from('ballistic_profiles')
            .select('*')
            .eq('id', tableRes.data.ballistic_profile_id)
            .maybeSingle();

          if (profileRes.data) {
            setBallisticProfile(profileRes.data);

            const [distRes, windRes] = await Promise.all([
              supabase
                .from('ballistic_distance_table')
                .select('*')
                .eq('profile_id', profileRes.data.id)
                .order('distance_m'),
              supabase
                .from('ballistic_wind_table')
                .select('*')
                .eq('profile_id', profileRes.data.id)
                .order('distance_m')
                .order('wind_speed'),
            ]);

            if (distRes.data) setDistanceTable(distRes.data);
            if (windRes.data) setWindTable(windRes.data);

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
        }
      }
    }
    if (stagesRes.data) setStages(stagesRes.data);
    if (logsRes.data) {
      setStageLogs(logsRes.data);
      setCurrentStageIndex(logsRes.data.length);
    }
    if (figuresRes.data) setFigures(figuresRes.data);

    setLoading(false);
  };

  const getClickRecommendationFromRows = (dist: number): ClickRecommendation | null => {
    if (clickRows.length === 0) return null;

    const exactMatch = clickRows.find((r) => r.distance_m === dist);
    if (exactMatch) {
      return {
        clicks: exactMatch.clicks_up,
        type: 'exact',
        distance_m: dist
      };
    }

    const sortedRows = [...clickRows].sort((a, b) => a.distance_m - b.distance_m);
    const lower = sortedRows.filter((r) => r.distance_m < dist).pop();
    const upper = sortedRows.find((r) => r.distance_m > dist);

    if (lower && upper) {
      const ratio = (dist - lower.distance_m) / (upper.distance_m - lower.distance_m);
      const interpolated = lower.clicks_up + ratio * (upper.clicks_up - lower.clicks_up);

      return {
        clicks: Math.round(interpolated * 10) / 10,
        type: 'interpolated',
        distance_m: dist,
        interpolation_range: { lower: lower.distance_m, upper: upper.distance_m }
      };
    }

    const nearest = sortedRows.reduce((prev, curr) =>
      Math.abs(curr.distance_m - dist) < Math.abs(prev.distance_m - dist) ? curr : prev
    );

    return {
      clicks: nearest.clicks_up,
      type: 'nearest',
      distance_m: dist,
      nearest_distance: nearest.distance_m
    };
  };

  const getCurrentStage = () => {
    return stages[currentStageIndex] || null;
  };

  const getCurrentFigure = () => {
    const stage = getCurrentStage();
    if (!stage || !stage.figure_id) return null;
    return figures.find((f) => f.id === stage.figure_id) || null;
  };

  const isStageCompleted = (stageId: string) => {
    return stageLogs.some((log) => log.stage_id === stageId);
  };

  const startTimer = (mode: 'prep' | 'shoot') => {
    const stage = getCurrentStage();
    if (!stage) return;

    let seconds = 0;
    if (mode === 'prep') {
      seconds = stage.prep_seconds || 15;
      setTimerMode('prep');
    } else if (mode === 'shoot') {
      seconds = stage.shoot_seconds || 60;
      setTimerMode('shoot');
    }

    setTimerSeconds(seconds);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerMode('idle');
  };

  const handleTimerComplete = () => {
    setTimerRunning(false);
    if (timerMode === 'prep') {
      startTimer('shoot');
    } else if (timerMode === 'shoot') {
      setTimerMode('idle');
    }
  };

  const formatDisplayTime = (seconds: number) => {
    if (seconds <= 75) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) {
      return `${mins} min`;
    }
    return `${mins} min ${secs} sek`;
  };

  const getTimerColorClasses = () => {
    if (timerSeconds <= 3 && (timerMode === 'prep' || timerMode === 'shoot')) {
      return 'text-white bg-red-600';
    }
    if (timerSeconds <= 10 && (timerMode === 'prep' || timerMode === 'shoot')) {
      return 'text-red-600';
    }
    return 'text-slate-900';
  };

  const handleSaveStage = async () => {
    const stage = getCurrentStage();
    if (!stage || !entryId || !user) return;

    const distNum = distance ? parseInt(distance) : null;
    const elevationNum = usedElevationClicks ? parseFloat(usedElevationClicks) : null;
    const windageNum = usedWindageClicks ? parseFloat(usedWindageClicks) : null;
    const scoreNum = score ? parseInt(score) : null;
    const innerNum = innerHits ? parseInt(innerHits) : null;
    const hitsNum = hits ? parseInt(hits) : null;

    const { data: logData, error: logError } = await supabase
      .from('competition_stage_logs')
      .insert({
        entry_id: entryId,
        stage_id: stage.id,
        user_id: user.id,
        actual_distance_m: distNum,
        wind_speed: windSpeed,
        wind_direction: windDirection,
        recommended_elevation_clicks: clickRecommendation?.clicks || null,
        used_elevation_clicks: elevationNum,
        recommended_windage_clicks: windageRecommendation?.clicks || null,
        used_windage_clicks: windageNum,
        ballistic_profile_id: ballisticProfile?.id || null,
        reset_to_zero: resetToZero,
        score: scoreNum,
        inner_hits: innerNum,
        hits: hitsNum,
        notes: notes || null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      alert('Kunne ikke lagre hold');
      return;
    }

    if (imageFile && logData) {
      const fileName = `${user.id}/${entryId}/${stage.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('target-images')
        .upload(fileName, imageFile);

      if (!uploadError) {
        await supabase.from('competition_stage_images').insert({
          stage_log_id: logData.id,
          user_id: user.id,
          storage_path: fileName,
        });
      }
    }

    resetStageForm();
    await fetchData();

    if (currentStageIndex >= stages.length - 1) {
      await completeCompetition();
    } else {
      setCurrentStageIndex((prev) => prev + 1);
    }
  };

  const completeCompetition = async () => {
    if (!entryId) return;

    const totalScore = stageLogs.reduce((sum, log) => sum + (log.score || 0), 0);
    const totalInner = stageLogs.reduce((sum, log) => sum + (log.inner_hits || 0), 0);
    const totalHits = stageLogs.reduce((sum, log) => sum + (log.hits || 0), 0);

    await supabase
      .from('competition_entries')
      .update({
        completed_at: new Date().toISOString(),
        total_score: totalScore,
        total_inner_hits: totalInner,
        total_hits: totalHits,
      })
      .eq('id', entryId);

    const totalShots = stages.reduce((sum, stage) => sum + (stage.shots_count || 0), 0);
    setTotalShotsFired(totalShots);

    if (totalShots > 0 && weapon && barrel) {
      setShowShotCountDialog(true);
    } else {
      navigate(`/competitions/${competitionId}/run/${entryId}`);
    }
  };

  const handleConfirmShotCount = async (weaponId?: string) => {
    if (!weapon || !barrel) return;

    const updates: Promise<any>[] = [];

    const newBarrelShots = barrel.total_shots_fired + totalShotsFired;
    updates.push(
      supabase
        .from('weapon_barrels')
        .update({ total_shots_fired: newBarrelShots })
        .eq('id', barrel.id)
    );

    const newWeaponShots = weapon.total_shots_fired + totalShotsFired;
    updates.push(
      supabase
        .from('weapons')
        .update({ total_shots_fired: newWeaponShots })
        .eq('id', weapon.id)
    );

    await Promise.all(updates);
    setShowShotCountDialog(false);
    navigate(`/competitions/${competitionId}/run/${entryId}`);
  };

  const handleCancelShotCount = () => {
    setShowShotCountDialog(false);
    navigate(`/competitions/${competitionId}/run/${entryId}`);
  };

  const resetStageForm = () => {
    setDistance('');
    setWindSpeed(null);
    setWindDirection(null);
    setClickRecommendation(null);
    setWindageRecommendation(null);
    setUsedElevationClicks('');
    setUsedWindageClicks('');
    setResetToZero(false);
    setScore('');
    setInnerHits('');
    setHits('');
    setNotes('');
    setImageFile(null);
    resetTimer();
  };

  const goToPreviousStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex((prev) => prev - 1);
      resetStageForm();
    }
  };

  const goToNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      setCurrentStageIndex((prev) => prev + 1);
      resetStageForm();
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

  if (!competition || !entry) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Stevne ikke funnet</p>
        </div>
      </Layout>
    );
  }

  const currentStage = getCurrentStage();
  const currentFigure = getCurrentFigure();
  const isCompleted = entry.completed_at !== null;

  if (isCompleted) {
    return (
      <Layout>
        <div className="max-w-4xl pb-20 md:pb-8">
          <div className="mb-6">
            <button
              onClick={() => navigate('/competitions')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Tilbake</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{competition.name}</h1>
            <p className="text-slate-600 mt-1">Resultat</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Fullført!</h2>
                <p className="text-slate-600">Stevnet er gjennomført</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Totalt poeng</p>
                <p className="text-3xl font-bold text-slate-900">{entry.total_score || 0}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Innertreff</p>
                <p className="text-3xl font-bold text-slate-900">{entry.total_inner_hits || 0}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Treff</p>
                <p className="text-3xl font-bold text-slate-900">{entry.total_hits || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Hold-for-hold</h3>
            <div className="space-y-3">
              {stageLogs.map((log, index) => {
                const stage = stages.find((s) => s.id === log.stage_id);
                return (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-600 text-white text-sm font-bold rounded">
                          {index + 1}
                        </span>
                        <span className="font-medium text-slate-900">
                          {stage?.name || `Hold ${index + 1}`}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">{log.score || 0}p</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
                      {log.actual_distance_m && (
                        <div className="text-slate-600">
                          <span className="font-medium">Avstand:</span> {log.actual_distance_m}m
                        </div>
                      )}
                      {log.inner_hits !== null && (
                        <div className="text-slate-600">
                          <span className="font-medium">Inner:</span> {log.inner_hits}
                        </div>
                      )}
                      {log.hits !== null && (
                        <div className="text-slate-600">
                          <span className="font-medium">Treff:</span> {log.hits}
                        </div>
                      )}
                    </div>

                    {(log.wind_speed || log.recommended_elevation_clicks !== null || log.recommended_windage_clicks !== null) && (
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {log.recommended_elevation_clicks !== null && (
                            <div className="bg-white p-2 rounded">
                              <p className="text-slate-500 mb-1">Høydeknepp</p>
                              <p className="text-slate-700">
                                Foreslått: <span className="font-semibold text-emerald-700">{log.recommended_elevation_clicks}</span>
                                {log.used_elevation_clicks !== null && (
                                  <> • Brukt: <span className="font-semibold text-slate-900">{log.used_elevation_clicks}</span></>
                                )}
                              </p>
                            </div>
                          )}

                          {log.wind_speed && log.recommended_windage_clicks !== null && (
                            <div className="bg-white p-2 rounded">
                              <p className="text-slate-500 mb-1">
                                Sideknepp ({log.wind_speed} m/s {log.wind_direction === 'left' ? '←' : '→'})
                              </p>
                              <p className="text-slate-700">
                                Foreslått: <span className="font-semibold text-blue-700">
                                  {log.wind_direction === 'left' ? '-' : '+'}{log.recommended_windage_clicks}
                                </span>
                                {log.used_windage_clicks !== null && (
                                  <> • Brukt: <span className="font-semibold text-slate-900">{log.used_windage_clicks}</span></>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentStage) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Ingen flere hold</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl pb-20 md:pb-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/competitions')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Tilbake</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{competition.name}</h1>
          <div className="flex items-center space-x-3 mt-2">
            <span className="text-sm text-slate-600">
              Hold {currentStageIndex + 1} av {stages.length}
            </span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {currentFigure && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-4">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Hold {currentStageIndex + 1}
                {currentStage.name && currentStage.name.trim() !== '' && ` – ${currentStage.name}`}
              </h2>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <FieldFigure figure={currentFigure} className="w-full h-64 sm:h-80" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center space-x-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{formatDisplayTime(currentStage.shoot_seconds)} skytetid</span>
              </div>
              {currentStage.shots_count && (
                <div className="text-slate-600">{currentStage.shots_count} skudd</div>
              )}
              {currentStage.position && (
                <div className="text-slate-600 capitalize">{currentStage.position}</div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Feltklokke</h3>
          </div>

          <div className="text-center mb-4">
            <div className={`${getTimerColorClasses().includes('bg-red-600') ? 'bg-red-600 rounded-2xl py-4 px-6 inline-block' : ''} transition-all duration-300`}>
              <div className={`text-5xl sm:text-6xl font-bold mb-2 transition-colors duration-300 ${getTimerColorClasses()}`}>
                {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="text-sm text-slate-600 capitalize mt-2">
              {timerMode === 'idle' ? 'Klar' : timerMode === 'prep' ? 'Forberedelse' : 'Skyting'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => startTimer('prep')}
              disabled={timerRunning}
              className="flex flex-col items-center justify-center py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition disabled:opacity-50 active:scale-95"
            >
              <Clock className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Forbered</span>
            </button>
            <button
              onClick={() => (timerRunning ? stopTimer() : startTimer('shoot'))}
              className="flex flex-col items-center justify-center py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition active:scale-95"
            >
              {timerRunning ? (
                <>
                  <Pause className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">Start</span>
                </>
              )}
            </button>
            <button
              onClick={resetTimer}
              className="flex flex-col items-center justify-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition active:scale-95"
            >
              <RotateCcw className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Nullstill</span>
            </button>
          </div>
        </div>

        {ballisticProfile && weapon && (
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200 p-4 sm:p-6 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <span>Holdassistanse</span>
            </h3>

            {currentFigure && (
              <div className="bg-white rounded-lg p-3 border border-slate-200 mb-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Figur</p>
                    <p className="font-bold text-slate-900">{currentFigure.figure_code}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Normalavstand</p>
                    <p className="font-semibold text-slate-900">{currentFigure.normal_distance_m}m</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Maks avstand</p>
                    <p className="font-semibold text-slate-900">{currentFigure.max_distance_m}m</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <p className="text-slate-600">Våpen</p>
                <p className="font-semibold text-slate-900">{weapon.weapon_name}</p>
              </div>
              {barrel && (
                <div>
                  <p className="text-slate-600">Løp</p>
                  <p className="font-semibold text-slate-900">{barrel.barrel_number}</p>
                </div>
              )}
              <div>
                <p className="text-slate-600">Profil</p>
                <p className="font-semibold text-slate-900">{ballisticProfile.name}</p>
              </div>
              <div>
                <p className="text-slate-600">Nullpunkt</p>
                <p className="font-semibold text-slate-900">{ballisticProfile.zero_distance_m}m</p>
              </div>
            </div>

            {clickRecommendation && (
              <div className="bg-white rounded-lg p-4 border border-emerald-300 mb-3">
                <p className="text-xs text-slate-600 mb-1">Foreslått høydeknepp</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {clickRecommendation.clicks} knepp
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {clickRecommendation.type === 'exact' && 'Eksakt verdi'}
                  {clickRecommendation.type === 'interpolated' &&
                    `Interpolert (${clickRecommendation.interpolation_range?.lower}-${clickRecommendation.interpolation_range?.upper}m)`
                  }
                  {clickRecommendation.type === 'nearest' &&
                    `Nærmeste (${clickRecommendation.nearest_distance}m)`
                  }
                </p>
              </div>
            )}

            {windageRecommendation && windSpeed !== null && windDirection && (
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <p className="text-xs text-slate-600 mb-1">Foreslått sideknepp</p>
                <p className="text-2xl font-bold text-blue-700">
                  {windDirection === 'left' ? '-' : '+'}{windageRecommendation.clicks} knepp
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Vind: {windSpeed} m/s {windDirection === 'left' ? 'venstre' : 'høyre'}
                  {' • '}
                  {windageRecommendation.type === 'exact' && 'Eksakt'}
                  {windageRecommendation.type === 'interpolated' && 'Interpolert'}
                  {windageRecommendation.type === 'nearest' && 'Nærmeste'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Registrer resultat</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Avstand (m)
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="125"
              />
              {currentFigure && distance && parseInt(distance) > currentFigure.max_distance_m && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border-2 border-red-300">
                  <p className="text-sm font-bold text-red-900 flex items-center space-x-2">
                    <span className="text-lg">⚠️</span>
                    <span>Avstand utenfor gyldig område</span>
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Målskive {currentFigure.figure_code} har maksavstand på {currentFigure.max_distance_m}m.
                    Din avstand ({distance}m) overstiger dette med {parseInt(distance) - currentFigure.max_distance_m}m.
                  </p>
                </div>
              )}
            </div>

            {windTable.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center space-x-2">
                    <Wind className="w-4 h-4" />
                    <span>Vindhastighet (m/s)</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setWindSpeed(speed)}
                        className={`py-2 px-1 text-sm rounded-lg border-2 transition ${
                          windSpeed === speed
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>

                {windSpeed !== null && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Vindretning
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setWindDirection('left')}
                        className={`py-3 px-4 rounded-lg border-2 transition ${
                          windDirection === 'left'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        ← Venstre
                      </button>
                      <button
                        onClick={() => setWindDirection('right')}
                        className={`py-3 px-4 rounded-lg border-2 transition ${
                          windDirection === 'right'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        Høyre →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Brukte høydeknepp
                </label>
                <input
                  type="number"
                  value={usedElevationClicks}
                  onChange={(e) => setUsedElevationClicks(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Brukte sideknepp
                </label>
                <input
                  type="number"
                  value={usedWindageClicks}
                  onChange={(e) => setUsedWindageClicks(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="0"
                />
              </div>
            </div>

            <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={resetToZero}
                onChange={(e) => setResetToZero(e.target.checked)}
                className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span className="text-sm font-medium text-slate-900">
                Nullstilte siktet etter skudd
              </span>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Poeng</label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="48"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Inner</label>
                <input
                  type="number"
                  value={innerHits}
                  onChange={(e) => setInnerHits(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Treff</label>
                <input
                  type="number"
                  value={hits}
                  onChange={(e) => setHits(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notater</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                placeholder="Vind, observasjoner..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last opp målbilde
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={goToPreviousStage}
            disabled={currentStageIndex === 0}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Forrige</span>
          </button>

          <button
            onClick={handleSaveStage}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{currentStageIndex >= stages.length - 1 ? 'Fullfør' : 'Neste hold'}</span>
          </button>
        </div>
      </div>

      <ShotCountDialog
        isOpen={showShotCountDialog}
        totalShots={totalShotsFired}
        weaponName={weapon?.weapon_name}
        onConfirm={handleConfirmShotCount}
        onCancel={handleCancelShotCount}
      />
    </Layout>
  );
}
