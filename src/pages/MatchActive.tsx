import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, RotateCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { ActiveHoldScreen } from '../components/match/ActiveHoldScreen';
import { ResetReminder } from '../components/match/ResetReminder';
import { EditHoldModal } from '../components/match/EditHoldModal';
import { AddHoldModal } from '../components/match/AddHoldModal';
import { FirstHoldModal } from '../components/match/FirstHoldModal';
import { MatchUnknownHoldSetup, type UnknownHoldConfirmConfig } from '../components/match/MatchUnknownHoldSetup';
import { useBlockNavigation } from '../lib/use-block-navigation';
import { useWakeLock } from '../lib/use-wake-lock';
import { getAssistanceMode, type AssistanceMode } from '../lib/user-preferences';
import {
  getMatchSession,
  getMatchHolds,
  getCurrentHold,
  completeHold,
  updateMatchSessionHoldIndex,
  pauseMatchSession,
  completeMatchSession,
  startHold,
  getElapsedTime,
  updateHoldWindCorrection,
  updateMatchAmmoDeduction,
  updateMatchMetadata,
  updateMatchShotCounts,
  getSubHoldsForSession,
  updateMatchHold,
  recalculateHoldClicks,
  createSubHold,
  syncCompositeHoldShotCount,
  createReshootHold,
  hasReshoot,
  setCountingAttempt,
} from '../lib/match-service';
import { enqueueUpload } from '../lib/upload-queue';
import { compressImage } from '../lib/image-compression';
import { UploadQueueStatus } from '../components/UploadQueueStatus';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { deductAmmoFromInventory } from '../lib/ammo-inventory-service';
import { logWeaponShots } from '../lib/weapon-shot-service';
import { getUserActiveSetup } from '../lib/active-setup-service';
import { supabase } from '../lib/supabase';
import type { MatchSession, MatchHoldWithFigure } from '../lib/match-service';
import type { FieldFigure } from '../types/database';

export function MatchActive() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<MatchSession | null>(null);
  const [holds, setHolds] = useState<MatchHoldWithFigure[]>([]);
  const [currentHold, setCurrentHold] = useState<MatchHoldWithFigure | null>(null);
  const [showResetReminder, setShowResetReminder] = useState(false);
  const [isLastHoldReset, setIsLastHoldReset] = useState(false);
  const [clockStarted, setClockStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ammoName, setAmmoName] = useState<string | null>(null);
  const [ammoStock, setAmmoStock] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddHoldModal, setShowAddHoldModal] = useState(false);
  const [showFirstHoldModal, setShowFirstHoldModal] = useState(false);
  const [showHoldSetupModal, setShowHoldSetupModal] = useState(false);
  const [showUnknownSetup, setShowUnknownSetup] = useState(false);
  const [showEditMeta, setShowEditMeta] = useState(false);
  const [showReshootConfirm, setShowReshootConfirm] = useState(false);
  const [reshootBusy, setReshootBusy] = useState(false);
  const [showReshootChoice, setShowReshootChoice] = useState<{
    originalHoldId: string;
    reshootHoldId: string;
    originalIndex: number;
    reshootIndex: number;
  } | null>(null);
  const [choiceBusy, setChoiceBusy] = useState(false);
  const [fieldFigures, setFieldFigures] = useState<FieldFigure[]>([]);
  const [assistMode] = useState<AssistanceMode>(getAssistanceMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subHoldPhotoInputRef = useRef<HTMLInputElement>(null);
  const pendingSubHoldIdRef = useRef<string | null>(null);

  useBlockNavigation(
    clockStarted && !showResetReminder,
    'Du er midt i et hold. Klokken vil starte på nytt hvis du forlater.'
  );

  useWakeLock(!loading && !!session && session.status !== 'completed');

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    const [sessionData, holdsData] = await Promise.all([
      getMatchSession(id),
      getMatchHolds(id),
    ]);

    if (sessionData) {
      if (sessionData.status === 'setup') {
        navigate(`/match/${id}/configure`);
        return;
      }

      const subHoldsMap = await getSubHoldsForSession(id);
      const holdsWithSubs = holdsData.map(h => ({
        ...h,
        sub_holds: subHoldsMap[h.id] || undefined,
      }));

      setSession(sessionData);
      setHolds(holdsWithSubs);

      const isUnknown = sessionData.distance_mode === 'ukjent';

      if (isUnknown && fieldFigures.length === 0) {
        const { data: figs } = await supabase
          .from('field_figures')
          .select('*')
          .eq('is_active', true)
          .order('order_index');
        if (figs) setFieldFigures(figs);
      }

      if (sessionData.ammo_inventory_id) {
        const { data: ammoData } = await supabase
          .from('ammo_inventory')
          .select('name, stock_quantity')
          .eq('id', sessionData.ammo_inventory_id)
          .maybeSingle();
        if (ammoData) {
          setAmmoName(ammoData.name);
          setAmmoStock(ammoData.stock_quantity);
        }
      }

      const current = await getCurrentHold(id, sessionData.current_hold_index);

      if (current && subHoldsMap[current.id]) {
        current.sub_holds = subHoldsMap[current.id];
      }

      setCurrentHold(current);

      if (isUnknown && current && !current.field_figure_id && !current.started_at) {
        setShowUnknownSetup(true);
      } else if (!current?.started_at && assistMode !== 'minimal') {
        if (sessionData.current_hold_index === 0) {
          setShowFirstHoldModal(true);
        } else if (assistMode === 'guided') {
          setShowHoldSetupModal(true);
        }
      }
    }

    setLoading(false);
  };

  const handleCompleteHold = async () => {
    if (!currentHold || !session) return;

    await completeHold(currentHold.id);

    if (currentHold.reshoot_of_hold_id) {
      const originalIndex = holds.findIndex(h => h.id === currentHold.reshoot_of_hold_id);
      const reshootIndex = holds.findIndex(h => h.id === currentHold.id);
      setShowReshootChoice({
        originalHoldId: currentHold.reshoot_of_hold_id,
        reshootHoldId: currentHold.id,
        originalIndex: originalIndex >= 0 ? originalIndex : 0,
        reshootIndex: reshootIndex >= 0 ? reshootIndex : session.current_hold_index,
      });
      return;
    }

    await proceedAfterHoldComplete();
  };

  const findNextOrdinaryIndex = (fromIndex: number, holdsArr = holds): number => {
    for (let i = fromIndex + 1; i < holdsArr.length; i++) {
      if (!holdsArr[i]?.reshoot_of_hold_id) return i;
    }
    return -1;
  };

  const proceedAfterHoldComplete = async () => {
    if (!session) return;

    const nextIndex = findNextOrdinaryIndex(session.current_hold_index);
    const isFinfelt = session.competition_type === 'finfelt';
    const isLast = nextIndex === -1;
    const showReset = assistMode !== 'minimal' && !isFinfelt;

    if (isLast && showReset) {
      setIsLastHoldReset(true);
      setShowResetReminder(true);
      return;
    }

    if (isLast) {
      await finishMatch();
      return;
    }

    if (showReset) {
      setIsLastHoldReset(false);
      setShowResetReminder(true);
    } else {
      handleNextHold();
    }
  };

  const handleReshootChoice = async (winner: 'original' | 'reshoot') => {
    if (!showReshootChoice || !session) return;
    setChoiceBusy(true);

    const { error } = await setCountingAttempt({
      originalHoldId: showReshootChoice.originalHoldId,
      reshootHoldId: showReshootChoice.reshootHoldId,
      winner,
    });

    if (error) {
      alert('Kunne ikke lagre valget. Prøv igjen.');
      setChoiceBusy(false);
      return;
    }

    const updatedHolds = holds.map(h => {
      if (h.id === showReshootChoice.originalHoldId) {
        return { ...h, counts_for_score: winner === 'original' };
      }
      if (h.id === showReshootChoice.reshootHoldId) {
        return { ...h, counts_for_score: winner === 'reshoot' };
      }
      return h;
    });
    setHolds(updatedHolds);

    const originalIdx = showReshootChoice.originalIndex;
    const resumeIdx = findNextOrdinaryIndex(originalIdx, updatedHolds);
    const resumeHold = resumeIdx >= 0 ? updatedHolds[resumeIdx] ?? null : null;
    const isFinfelt = session.competition_type === 'finfelt';
    const showReset = assistMode !== 'minimal' && !isFinfelt;

    setShowReshootChoice(null);
    setChoiceBusy(false);

    const noRealNext = resumeIdx === -1 || !resumeHold;

    if (noRealNext) {
      if (showReset) {
        setIsLastHoldReset(true);
        setShowResetReminder(true);
      } else {
        await finishMatch();
      }
      return;
    }

    if (showReset) {
      setSession({ ...session, current_hold_index: originalIdx });
      setIsLastHoldReset(false);
      setShowResetReminder(true);
    } else {
      await updateMatchSessionHoldIndex(session.id, resumeIdx);
      setCurrentHold(resumeHold);
      setSession({ ...session, current_hold_index: resumeIdx });
    }
  };

  const handleCreateReshoot = async () => {
    if (!currentHold || !session || reshootBusy) return;

    const already = await hasReshoot(currentHold.id);
    if (already) {
      alert('Dette holdet har allerede en omskyting.');
      setShowReshootConfirm(false);
      return;
    }

    setReshootBusy(true);
    const { hold: newHold, error } = await createReshootHold(currentHold.id);

    if (error || !newHold) {
      alert(error?.message || 'Kunne ikke opprette omskyting.');
      setReshootBusy(false);
      setShowReshootConfirm(false);
      return;
    }

    const [updatedHolds, subHoldsMap] = await Promise.all([
      getMatchHolds(session.id),
      getSubHoldsForSession(session.id),
    ]);

    const holdsWithSubs = updatedHolds.map(h => ({
      ...h,
      sub_holds: subHoldsMap[h.id] || undefined,
    }));

    const newIndex = holdsWithSubs.findIndex(h => h.id === newHold.id);
    const targetIndex = newIndex >= 0 ? newIndex : holdsWithSubs.length - 1;

    await updateMatchSessionHoldIndex(session.id, targetIndex);

    const nextCurrent = holdsWithSubs[targetIndex] ?? null;

    setHolds(holdsWithSubs);
    setCurrentHold(nextCurrent);
    setSession({ ...session, current_hold_index: targetIndex });
    setInitialElapsedTime(0);
    setClockStarted(false);
    setShowResetReminder(false);
    setIsLastHoldReset(false);
    setShowEditModal(false);
    setShowReshootConfirm(false);
    setReshootBusy(false);
  };

  const finishMatch = async () => {
    if (!session || !user) return;

    await completeMatchSession(session.id);

    const totalShots = holds.reduce((sum, h) => sum + h.shot_count, 0);

    await updateMatchShotCounts({
      sessionId: session.id,
      calculatedShotCount: totalShots,
    });

    if (totalShots > 0) {
      try {
        const activeSetup = await getUserActiveSetup(user.id);
        if (activeSetup?.weapon_id) {
          await logWeaponShots({
            userId: user.id,
            weaponId: activeSetup.weapon_id,
            shotsFired: totalShots,
            shotDate: session.match_date || new Date().toISOString().split('T')[0],
            comment: session.match_name,
            source: 'match',
          });
        }
      } catch (e) {
        console.error('[MatchActive] Failed to log weapon shots:', e);
      }
    }

    if (session.ammo_inventory_id) {
      const { data: freshSession } = await supabase
        .from('match_sessions')
        .select('ammo_deducted_count')
        .eq('id', session.id)
        .maybeSingle();

      if (freshSession?.ammo_deducted_count == null) {
        const { error } = await deductAmmoFromInventory({
          inventoryId: session.ammo_inventory_id,
          userId: user.id,
          quantity: totalShots,
          matchSessionId: session.id,
          notes: `Automatisk trekk: ${session.match_name}`,
        });

        if (!error) {
          await updateMatchAmmoDeduction({
            sessionId: session.id,
            ammoInventoryId: session.ammo_inventory_id,
            ammoDeductedCount: totalShots,
          });
        }
      }
    }

    navigate(`/match/${session.id}/summary`);
  };

  const handleLastHoldConfirm = async () => {
    setShowResetReminder(false);
    setIsLastHoldReset(false);
    await finishMatch();
  };

  const handleNextHold = async () => {
    if (!session) return;

    const prevIndex = session.current_hold_index;
    const nextIndex = findNextOrdinaryIndex(prevIndex);

    if (nextIndex === -1) {
      setShowResetReminder(false);
      await finishMatch();
      return;
    }

    const nextHoldFromState = holds[nextIndex] ?? null;

    if (!nextHoldFromState) {
      console.warn('[MatchActive] handleNextHold: no local hold at index', nextIndex, '- falling back to fetch');
      try {
        await updateMatchSessionHoldIndex(session.id, nextIndex);
        const fetched = await getCurrentHold(session.id, nextIndex);
        setCurrentHold(fetched);
        setSession({ ...session, current_hold_index: nextIndex });
        setShowResetReminder(false);
      } catch (err) {
        console.error('[MatchActive] handleNextHold fallback failed:', err);
      }
      return;
    }

    setCurrentHold(nextHoldFromState);
    setSession({ ...session, current_hold_index: nextIndex });
    setShowResetReminder(false);

    if (session.distance_mode === 'ukjent' && !nextHoldFromState.field_figure_id && !nextHoldFromState.started_at) {
      setShowUnknownSetup(true);
    } else if (assistMode === 'guided' && !nextHoldFromState.started_at) {
      setShowHoldSetupModal(true);
    }

    updateMatchSessionHoldIndex(session.id, nextIndex).catch((err) => {
      console.error('[MatchActive] Failed to persist hold index, rolling back:', err);
      setSession((prev) => (prev ? { ...prev, current_hold_index: prevIndex } : prev));
      setCurrentHold(holds[prevIndex] ?? null);
      setShowUnknownSetup(false);
      setShowHoldSetupModal(false);
    });
  };

  const handlePause = async () => {
    if (!session) return;

    if (confirm('Pause stevnet? Du kan fortsette senere.')) {
      setClockStarted(false);
      await pauseMatchSession(session.id);
      navigate('/match');
    }
  };


  const handleAddHold = () => {
    setShowAddHoldModal(true);
  };

  const handleAddHoldSaved = async () => {
    if (!session) return;

    setShowAddHoldModal(false);

    const nextIndex = session.current_hold_index + 1;
    await updateMatchSessionHoldIndex(session.id, nextIndex);

    const [updatedHolds, nextHold, subHoldsMap] = await Promise.all([
      getMatchHolds(session.id),
      getCurrentHold(session.id, nextIndex),
      getSubHoldsForSession(session.id),
    ]);

    if (nextHold && subHoldsMap[nextHold.id]) {
      nextHold.sub_holds = subHoldsMap[nextHold.id];
    }

    const holdsWithSubs = updatedHolds.map(h => ({
      ...h,
      sub_holds: subHoldsMap[h.id] || undefined,
    }));

    setHolds(holdsWithSubs);
    setShowResetReminder(false);
    setIsLastHoldReset(false);
    setCurrentHold(nextHold);
    setSession({ ...session, current_hold_index: nextIndex });

    if (session.distance_mode === 'ukjent' && nextHold && !nextHold.field_figure_id && !nextHold.started_at) {
      setShowUnknownSetup(true);
    } else if (assistMode === 'guided' && nextHold && !nextHold.started_at) {
      setShowHoldSetupModal(true);
    }
  };

  const handleUnknownHoldConfirm = async (config: UnknownHoldConfirmConfig) => {
    if (!currentHold || !session) return;

    await updateMatchHold({
      holdId: currentHold.id,
      fieldFigureId: config.field_figure_id,
      distanceM: config.distance_m,
      recommendedClicks: config.clicks ?? undefined,
      shotCount: config.shot_count,
      shootingTimeSeconds: config.shooting_time_seconds,
    });

    if (config.is_composite) {
      await supabase
        .from('match_holds')
        .update({ is_composite: true })
        .eq('id', currentHold.id);

      for (let i = 0; i < config.sub_holds.length; i++) {
        const sh = config.sub_holds[i];
        await createSubHold({
          matchHoldId: currentHold.id,
          orderIndex: i,
          fieldFigureId: sh.fieldFigureId,
          distanceM: sh.distanceM,
          shotCount: sh.shotCount,
          elevationClicks: sh.elevationClicks,
          windClicks: sh.windClicks,
        });
      }

      await syncCompositeHoldShotCount(currentHold.id);
    }

    if (session.click_table_id && config.distance_m > 0) {
      await recalculateHoldClicks(session.id, currentHold.id, config.distance_m);
    }

    if (config.wind_clicks != null) {
      await updateHoldWindCorrection(currentHold.id, config.wind_clicks);
    }

    await fetchData();
    setShowUnknownSetup(false);
  };

  const handleClockStart = async () => {
    if (currentHold) {
      await startHold(currentHold.id);
    }
    setClockStarted(true);
  };

  const handleClockComplete = () => {
    setClockStarted(false);
  };

  const [initialElapsedTime, setInitialElapsedTime] = useState(0);

  useEffect(() => {
    if (currentHold?.started_at) {
      const elapsed = getElapsedTime(currentHold.started_at);
      setInitialElapsedTime(elapsed);
      if (elapsed > 0 && !currentHold.completed) {
        setClockStarted(true);
      }
    } else {
      setInitialElapsedTime(0);
    }
  }, [currentHold?.id, currentHold?.started_at]);

  const handleWindCorrectionChange = async (holdId: string, clicks: number) => {
    await updateHoldWindCorrection(holdId, clicks);
    if (currentHold && currentHold.id === holdId) {
      setCurrentHold({ ...currentHold, wind_correction_clicks: clicks });
    }
  };

  const handleTakePhoto = () => {
    if (!navigator.onLine) {
      alert('Du er offline. Ta bildet med telefonens kamera nå, og last det opp fra kamerarullen når du har nett.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentHold || !user) return;

    if (!navigator.onLine) {
      e.target.value = '';
      alert('Du er offline. Ta bildet med telefonens kamera nå, og last det opp fra kamerarullen når du har nett.');
      return;
    }

    try {
      const originalFile = e.target.files[0];
      e.target.value = '';
      const file = await compressImage(originalFile);
      const storagePath = `${user.id}/${currentHold.id}_${Date.now()}.jpg`;

      enqueueUpload({
        blob: file,
        storagePath,
        holdId: currentHold.id,
        holdType: 'match_hold',
      });
    } catch (err) {
      console.error('[MatchActive] Photo upload failed:', err);
    }
  };

  const handleTakeSubHoldPhoto = (subHoldId: string) => {
    if (!navigator.onLine) {
      alert('Du er offline. Ta bildet med telefonens kamera nå, og last det opp fra kamerarullen når du har nett.');
      return;
    }
    pendingSubHoldIdRef.current = subHoldId;
    subHoldPhotoInputRef.current?.click();
  };

  const handleSubHoldPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const subHoldId = pendingSubHoldIdRef.current;
    if (!subHoldId) return;

    if (!navigator.onLine) {
      e.target.value = '';
      alert('Du er offline. Ta bildet med telefonens kamera nå, og last det opp fra kamerarullen når du har nett.');
      return;
    }

    try {
      const originalFile = e.target.files[0];
      e.target.value = '';
      const file = await compressImage(originalFile);
      const storagePath = `${user.id}/sub_${subHoldId}_${Date.now()}.jpg`;

      enqueueUpload({
        blob: file,
        storagePath,
        holdId: subHoldId,
        holdType: 'sub_hold',
      });
    } catch (err) {
      console.error('[MatchActive] Sub-hold photo upload failed:', err);
    }
    pendingSubHoldIdRef.current = null;
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

  if (!session || !currentHold) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Stevne ikke funnet</h2>
          <button
            onClick={() => navigate('/match')}
            className="text-emerald-600 hover:underline"
          >
            Tilbake til oversikt
          </button>
        </div>
      </Layout>
    );
  }

  if (showUnknownSetup && currentHold && session) {
    return (
      <Layout>
        <MatchUnknownHoldSetup
          holdIndex={session.current_hold_index}
          totalHolds={holds.length}
          shootingTimeSeconds={currentHold.shooting_time_seconds}
          shotCount={currentHold.shot_count}
          figures={fieldFigures}
          clickTableId={session.click_table_id}
          competitionType={session.competition_type}
          onConfirm={handleUnknownHoldConfirm}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100dvh-4rem-2rem)] md:h-[calc(100dvh-4rem-4rem)] flex flex-col overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-8">
        <div className="bg-white border-b border-slate-200 px-3 py-2.5 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-[72px]">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold leading-none mb-0.5">Hold</p>
              <p className="text-lg font-bold text-slate-900 leading-tight tabular-nums">
                {session.current_hold_index + 1}<span className="text-slate-400 font-medium text-sm"> / {holds.length}</span>
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <button
                onClick={() => setShowEditMeta(true)}
                className="block text-sm font-semibold text-slate-800 truncate w-full text-left hover:text-slate-600 transition"
                title="Rediger stevneinfo"
              >
                {session.match_name}
              </button>
              {ammoName && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  <span className="font-medium">{ammoName}</span>
                  {ammoStock != null && (
                    <span className={`ml-1 tabular-nums ${ammoStock <= 20 ? 'text-red-500 font-semibold' : ''}`}>
                      ({ammoStock})
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <UploadQueueStatus />
              <button
                onClick={() => setShowReshootConfirm(true)}
                disabled={clockStarted || !!currentHold?.reshoot_of_hold_id}
                className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                title={currentHold?.reshoot_of_hold_id ? 'Dette er allerede en omskyting' : 'Opprett omskyting'}
              >
                <RotateCw className="w-3 h-3 text-amber-600" />
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                disabled={clockStarted}
                className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                title="Rediger hold"
              >
                <Pencil className="w-3 h-3 text-blue-600" />
              </button>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${holds.length > 0 ? Math.min(((session.current_hold_index + 1) / holds.length) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        {currentHold?.reshoot_of_hold_id && (() => {
          const origIdx = holds.findIndex(h => h.id === currentHold.reshoot_of_hold_id);
          return (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center justify-center gap-2 flex-shrink-0">
              <RotateCw className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-xs font-bold text-amber-800">
                Omskyting av hold {origIdx >= 0 ? origIdx + 1 : '?'}
              </span>
            </div>
          );
        })()}

        <div className="flex-1 min-h-0 overflow-hidden">
          <ActiveHoldScreen
            hold={currentHold}
            onComplete={handleCompleteHold}
            onPause={handlePause}
            onTakePhoto={handleTakePhoto}
            onClockStart={handleClockStart}
            onClockComplete={handleClockComplete}
            onWindCorrectionChange={handleWindCorrectionChange}
            onAddHold={handleAddHold}
            onTakeSubHoldPhoto={handleTakeSubHoldPhoto}
            initialElapsedTime={initialElapsedTime}
            isFinfelt={session.competition_type === 'finfelt'}
            isLastHold={session.current_hold_index >= holds.length - 1}
            previousHoldWindClicks={
              session.current_hold_index > 0
                ? holds[session.current_hold_index - 1]?.wind_correction_clicks ?? null
                : null
            }
          />
        </div>

        {showResetReminder && (
          <ResetReminder
            onConfirm={isLastHoldReset ? handleLastHoldConfirm : handleNextHold}
            onAddHold={handleAddHold}
            previousClicks={currentHold?.recommended_clicks}
            previousWindClicks={currentHold?.wind_correction_clicks}
            nextWindClicks={
              !isLastHoldReset && session
                ? holds[session.current_hold_index + 1]?.recommended_wind_clicks ?? null
                : null
            }
            isLastHold={isLastHoldReset}
          />
        )}

        {showEditModal && currentHold && (
          <EditHoldModal
            hold={currentHold}
            sessionId={session.id}
            competitionType={session.competition_type}
            onClose={() => setShowEditModal(false)}
            onSaved={async () => {
              setShowEditModal(false);
              await fetchData();
            }}
          />
        )}

        {showFirstHoldModal && currentHold && (
          <FirstHoldModal
            hold={currentHold}
            holdIndex={0}
            isFinfelt={session.competition_type === 'finfelt'}
            onConfirm={() => setShowFirstHoldModal(false)}
            onCancel={() => {
              setShowFirstHoldModal(false);
              navigate('/match');
            }}
          />
        )}

        {showHoldSetupModal && currentHold && (
          <FirstHoldModal
            hold={currentHold}
            holdIndex={session.current_hold_index}
            isFinfelt={session.competition_type === 'finfelt'}
            onConfirm={() => setShowHoldSetupModal(false)}
            onCancel={() => setShowHoldSetupModal(false)}
          />
        )}

        {showAddHoldModal && (
          <AddHoldModal
            sessionId={session.id}
            competitionType={session.competition_type}
            onClose={() => setShowAddHoldModal(false)}
            onSaved={handleAddHoldSaved}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          className="hidden"
        />
        <input
          ref={subHoldPhotoInputRef}
          type="file"
          accept="image/*"
          onChange={handleSubHoldPhotoSelected}
          className="hidden"
        />
      </div>

      {showReshootConfirm && currentHold && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCw className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Opprett omskyting av hold {session ? session.current_hold_index + 1 : ''}?
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Et nytt hold opprettes som kopi. Originalt hold beholdes. Du velger selv hvilket forsøk som teller.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReshootConfirm(false)}
                disabled={reshootBusy}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleCreateReshoot}
                disabled={reshootBusy}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {reshootBusy ? 'Oppretter...' : 'Opprett omskyting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReshootChoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <RotateCw className="w-7 h-7 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Hvilket forsøk skal telle?
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Velg hvilket av forsøkene som skal telle som resultat for dette holdet. Alle skudd teller fortsatt for ammunisjon og slitasje.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleReshootChoice('original')}
                disabled={choiceBusy}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition disabled:opacity-50 text-left"
              >
                Behold originalt resultat (hold {showReshootChoice.originalIndex + 1})
              </button>
              <button
                onClick={() => handleReshootChoice('reshoot')}
                disabled={choiceBusy}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition disabled:opacity-50 text-left"
              >
                Bruk omskyting som tellende (hold {showReshootChoice.reshootIndex + 1})
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditMeta && session && (
        <EditMetadataModal
          title="Rediger stevneinfo"
          currentName={session.match_name}
          currentNotes={session.notes || ''}
          onSave={async (name, notes) => {
            const { error } = await updateMatchMetadata({
              sessionId: session.id,
              matchName: name,
              notes,
            });
            if (error) throw error;
            setSession({ ...session, match_name: name, notes: notes || undefined });
          }}
          onClose={() => setShowEditMeta(false)}
        />
      )}
    </Layout>
  );
}
