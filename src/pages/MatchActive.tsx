import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { ActiveHoldScreen } from '../components/match/ActiveHoldScreen';
import { ResetReminder } from '../components/match/ResetReminder';
import { HoldProgress } from '../components/match/HoldProgress';
import { EditHoldModal } from '../components/match/EditHoldModal';
import { useBlockNavigation } from '../lib/use-block-navigation';
import { useWakeLock } from '../lib/use-wake-lock';
import {
  getMatchSession,
  getMatchHolds,
  getCurrentHold,
  completeHold,
  updateMatchSessionHoldIndex,
  pauseMatchSession,
  uploadMonitorPhoto,
  completeMatchSession,
  startHold,
  getElapsedTime,
  updateHoldWindCorrection,
  updateMatchAmmoDeduction,
  updateMatchShotCounts,
  addMatchHold,
} from '../lib/match-service';
import { deductAmmoFromInventory } from '../lib/ammo-inventory-service';
import { supabase } from '../lib/supabase';
import type { MatchSession, MatchHoldWithFigure } from '../lib/match-service';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    console.log('[MatchActive] ========== FETCH DATA ==========');
    console.log('[MatchActive] Loading session:', id);

    const [sessionData, holdsData] = await Promise.all([
      getMatchSession(id),
      getMatchHolds(id),
    ]);

    if (sessionData) {
      if (sessionData.status === 'setup') {
        navigate(`/match/${id}/configure`);
        return;
      }

      console.log('[MatchActive] Session loaded:', {
        session_id: sessionData.id,
        current_hold_index: sessionData.current_hold_index
      });

      console.log('[MatchActive] Holds loaded:', holdsData.map(h => ({
        id: h.id,
        order_index: h.order_index,
        field_figure_id: h.field_figure_id,
        figure_code: h.field_figure?.code,
        figure_name: h.field_figure?.name
      })));

      setSession(sessionData);
      setHolds(holdsData);

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

      console.log('[MatchActive] Current hold loaded:', {
        id: current?.id,
        order_index: sessionData.current_hold_index,
        field_figure_id: current?.field_figure_id,
        figure_code: current?.field_figure?.code,
        figure_name: current?.field_figure?.name,
        svg_data_length: current?.field_figure?.svg_data?.length
      });

      setCurrentHold(current);
    }

    setLoading(false);
  };

  const handleCompleteHold = async () => {
    if (!currentHold || !session) return;

    await completeHold(currentHold.id);

    const nextIndex = session.current_hold_index + 1;
    const isFinfelt = session.competition_type === 'finfelt';
    const isLast = nextIndex >= holds.length;

    if (isLast && !isFinfelt) {
      setIsLastHoldReset(true);
      setShowResetReminder(true);
      return;
    }

    if (isLast) {
      await finishMatch();
      return;
    }

    if (isFinfelt) {
      handleNextHold();
    } else {
      setIsLastHoldReset(false);
      setShowResetReminder(true);
    }
  };

  const finishMatch = async () => {
    if (!session || !user) return;

    await completeMatchSession(session.id);

    if (session.ammo_inventory_id) {
      const { data: freshSession } = await supabase
        .from('match_sessions')
        .select('ammo_deducted_count')
        .eq('id', session.id)
        .maybeSingle();

      if (freshSession?.ammo_deducted_count == null) {
        const totalShots = holds.reduce((sum, h) => sum + h.shot_count, 0);

        await updateMatchShotCounts({
          sessionId: session.id,
          calculatedShotCount: totalShots,
        });

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

    const nextIndex = session.current_hold_index + 1;

    console.log('[MatchActive] ========== HANDLE NEXT HOLD ==========');
    console.log('[MatchActive] Moving from hold index:', session.current_hold_index);
    console.log('[MatchActive] Moving to hold index:', nextIndex);
    console.log('[MatchActive] Current hold BEFORE fetch:', {
      id: currentHold?.id,
      field_figure_id: currentHold?.field_figure_id,
      figure_code: currentHold?.field_figure?.code,
      figure_name: currentHold?.field_figure?.name
    });

    await updateMatchSessionHoldIndex(session.id, nextIndex);

    const [nextHold, updatedHolds] = await Promise.all([
      getCurrentHold(session.id, nextIndex),
      getMatchHolds(session.id)
    ]);

    console.log('[MatchActive] Next hold AFTER fetch:', {
      id: nextHold?.id,
      field_figure_id: nextHold?.field_figure_id,
      figure_code: nextHold?.field_figure?.code,
      figure_name: nextHold?.field_figure?.name,
      svg_data_length: nextHold?.field_figure?.svg_data?.length
    });

    setCurrentHold(nextHold);
    setHolds(updatedHolds);
    setSession({ ...session, current_hold_index: nextIndex });
    setShowResetReminder(false);

    console.log('[MatchActive] State updated - currentHold should now be:', nextHold?.id);
  };

  const handlePause = async () => {
    if (!session) return;

    if (confirm('Pause stevnet? Du kan fortsette senere.')) {
      setClockStarted(false);
      await pauseMatchSession(session.id);
      navigate('/match');
    }
  };


  const handleAddHold = async () => {
    if (!session) return;

    const defaultTime = session.competition_type === 'finfelt' ? 120 : 60;
    const { error } = await addMatchHold({
      sessionId: session.id,
      shootingTimeSeconds: defaultTime,
      shotCount: 6,
    });

    if (error) {
      alert('Kunne ikke legge til hold: ' + error.message);
      return;
    }

    const updatedHolds = await getMatchHolds(session.id);
    setHolds(updatedHolds);
    setShowResetReminder(false);
    setIsLastHoldReset(false);

    const nextIndex = session.current_hold_index + 1;
    await updateMatchSessionHoldIndex(session.id, nextIndex);

    const nextHold = await getCurrentHold(session.id, nextIndex);
    setCurrentHold(nextHold);
    setSession({ ...session, current_hold_index: nextIndex });
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

  const getInitialElapsedTime = () => {
    if (!currentHold?.started_at) return 0;
    return getElapsedTime(currentHold.started_at);
  };

  const handleWindCorrectionChange = async (holdId: string, clicks: number) => {
    await updateHoldWindCorrection(holdId, clicks);
    if (currentHold && currentHold.id === holdId) {
      setCurrentHold({ ...currentHold, wind_correction_clicks: clicks });
    }
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentHold || !user) return;

    const file = e.target.files[0];
    console.log('[MatchActive] handlePhotoSelected:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      holdId: currentHold.id,
    });

    const { url, error } = await uploadMonitorPhoto(currentHold.id, user.id, file);

    if (error) {
      console.error('[MatchActive] photo upload error:', error);
      alert('Kunne ikke laste opp bilde: ' + (error.message || JSON.stringify(error)));
    } else {
      console.log('[MatchActive] photo upload OK, stored path:', url);
      alert('Bilde lastet opp!');
    }

    e.target.value = '';
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

  return (
    <Layout>
      <div className="min-h-screen flex flex-col pb-20 md:pb-8">
        <div className="bg-white border-b border-slate-200 p-2">
          <div className="flex items-center justify-between">
            <HoldProgress
              currentHold={session.current_hold_index}
              totalHolds={holds.length}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {ammoName && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{ammoName}</span>
                  {ammoStock != null && (
                    <span className={`tabular-nums ${ammoStock <= 20 ? 'text-red-500 font-semibold' : ''}`}>
                      ({ammoStock})
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                disabled={clockStarted}
                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                title="Rediger hold"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <ActiveHoldScreen
            hold={currentHold}
            onComplete={handleCompleteHold}
            onPause={handlePause}
            onTakePhoto={handleTakePhoto}
            onClockStart={handleClockStart}
            onClockComplete={handleClockComplete}
            onWindCorrectionChange={handleWindCorrectionChange}
            initialElapsedTime={getInitialElapsedTime()}
            isFinfelt={session.competition_type === 'finfelt'}
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          className="hidden"
        />
      </div>
    </Layout>
  );
}
