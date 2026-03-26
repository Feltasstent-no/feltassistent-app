import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getMatchSession,
  getMatchHolds,
  getMatchStats,
  getMatchHoldImages,
  updateMatchResult,
  updateMatchShotCounts,
  updateMatchAmmoDeduction,
  getEffectiveShotCount,
} from '../lib/match-service';
import { getWindDirectionLabel } from '../components/WindCompassInput';
import { getAutoDeductInventory, deductAmmoFromInventory } from '../lib/ammo-inventory-service';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, CheckCircle, Clock, Wind, Camera,
  Trophy, X, Save, CreditCard as Edit3, Package, Check, Minus, Pencil, Target, ImageOff,
} from 'lucide-react';
import { BulletIcon } from '../components/BulletIcon';
import { FieldFigureSvg } from '../components/FieldFigureSvg';

import type { MatchSession, MatchHoldWithFigure } from '../lib/match-service';

interface HoldImage {
  holdId: string;
  orderIndex: number;
  imageUrl: string;
  figureName: string;
  distanceM: number;
}

export function MatchSummary() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<MatchSession | null>(null);
  const [holds, setHolds] = useState<MatchHoldWithFigure[]>([]);
  const [holdImages, setHoldImages] = useState<HoldImage[]>([]);
  const [stats, setStats] = useState<{
    totalHolds: number;
    completedHolds: number;
    totalShots: number;
    duration: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingResult, setEditingResult] = useState(false);
  const [totalHits, setTotalHits] = useState<string>('');
  const [innerHits, setInnerHits] = useState<string>('');
  const [resultNotes, setResultNotes] = useState<string>('');
  const [savingResult, setSavingResult] = useState(false);

  const [editingShots, setEditingShots] = useState(false);
  const [actualShotInput, setActualShotInput] = useState('');
  const [savingShots, setSavingShots] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const [ammoDeductionState, setAmmoDeductionState] = useState<
    'idle' | 'pending' | 'adjusting' | 'done'
  >('idle');
  const [ammoInventoryName, setAmmoInventoryName] = useState('');
  const [ammoInventoryId, setAmmoInventoryId] = useState<string | null>(null);
  const [ammoDeductQuantity, setAmmoDeductQuantity] = useState(0);
  const [ammoAdjustedQuantity, setAmmoAdjustedQuantity] = useState('');
  const [ammoCurrentStock, setAmmoCurrentStock] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    const [sessionData, holdsData, statsData, imagesData] = await Promise.all([
      getMatchSession(id),
      getMatchHolds(id),
      getMatchStats(id),
      getMatchHoldImages(id),
    ]);

    setSession(sessionData);
    setHolds(holdsData);
    setStats(statsData);
    setHoldImages(imagesData);

    console.log('[MatchSummary] holdImages loaded:', imagesData.map(img => ({
      holdId: img.holdId,
      orderIndex: img.orderIndex,
      imageUrl: img.imageUrl,
      figureName: img.figureName,
    })));

    if (sessionData) {
      setTotalHits(sessionData.total_hits != null ? String(sessionData.total_hits) : '');
      setInnerHits(sessionData.inner_hits != null ? String(sessionData.inner_hits) : '');
      setResultNotes(sessionData.result_notes || '');

      if (statsData && !sessionData.calculated_shot_count) {
        await updateMatchShotCounts({
          sessionId: id,
          calculatedShotCount: statsData.totalShots,
        });
        sessionData.calculated_shot_count = statsData.totalShots;
        setSession({ ...sessionData });
      }

      if (sessionData.actual_shot_count != null) {
        setActualShotInput(String(sessionData.actual_shot_count));
      }
    }

    if (sessionData && statsData) {
      await loadAmmoInfo(user.id, sessionData, statsData.totalShots);
    }

    setLoading(false);
  };

  const fetchStock = async (inventoryId: string) => {
    const { data } = await supabase
      .from('ammo_inventory')
      .select('stock_quantity')
      .eq('id', inventoryId)
      .maybeSingle();
    if (data) setAmmoCurrentStock(data.stock_quantity);
    return data?.stock_quantity ?? null;
  };

  const loadAmmoInfo = async (
    userId: string,
    sessionData: MatchSession,
    calculatedFromHolds: number
  ) => {
    const effectiveShots = getEffectiveShotCount(sessionData, calculatedFromHolds);

    if (sessionData.ammo_deducted_count != null) {
      setAmmoDeductQuantity(sessionData.ammo_deducted_count);
      setAmmoDeductionState('done');

      if (sessionData.ammo_inventory_id) {
        setAmmoInventoryId(sessionData.ammo_inventory_id);
        const { data: inv } = await supabase
          .from('ammo_inventory')
          .select('name, stock_quantity')
          .eq('id', sessionData.ammo_inventory_id)
          .maybeSingle();
        setAmmoInventoryName(inv?.name || 'Ukjent');
        if (inv) setAmmoCurrentStock(inv.stock_quantity);
      }
      return;
    }

    const { data: setup } = await supabase
      .from('user_active_setup')
      .select('weapon_id, barrel_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!setup?.weapon_id) return;

    const inventory = await getAutoDeductInventory(userId, setup.weapon_id, setup.barrel_id);
    if (!inventory) return;

    setAmmoInventoryId(inventory.id);
    setAmmoInventoryName(inventory.name);
    setAmmoCurrentStock(inventory.stock_quantity);
    setAmmoDeductQuantity(effectiveShots);
    setAmmoAdjustedQuantity(String(effectiveShots));
    setAmmoDeductionState('pending');
  };

  const handleAmmoDeduct = async () => {
    if (!ammoInventoryId || !user || !id) return;
    const qty = parseInt(ammoAdjustedQuantity);
    if (isNaN(qty) || qty <= 0) return;

    const { error } = await deductAmmoFromInventory({
      inventoryId: ammoInventoryId,
      userId: user.id,
      quantity: qty,
      matchSessionId: id,
      notes: `Trekk etter stevne`,
    });

    if (!error) {
      await updateMatchAmmoDeduction({
        sessionId: id,
        ammoInventoryId: ammoInventoryId,
        ammoDeductedCount: qty,
      });
      setAmmoDeductQuantity(qty);
      setAmmoDeductionState('done');
      setSession((prev) => prev ? { ...prev, ammo_deducted_count: qty, ammo_inventory_id: ammoInventoryId } : prev);
      await fetchStock(ammoInventoryId);
    }
  };

  const handleCorrectionDeduct = async () => {
    if (!session || !ammoInventoryId || !user || !id) return;
    const alreadyDeducted = session.ammo_deducted_count ?? 0;
    const effectiveNow = getEffectiveShotCount(session, stats?.totalShots ?? 0);
    const diff = effectiveNow - alreadyDeducted;
    if (diff <= 0) return;

    const { error } = await deductAmmoFromInventory({
      inventoryId: ammoInventoryId,
      userId: user.id,
      quantity: diff,
      matchSessionId: id,
      notes: `Korreksjon: ${alreadyDeducted} -> ${effectiveNow} skudd`,
    });

    if (!error) {
      await updateMatchAmmoDeduction({
        sessionId: id,
        ammoInventoryId: ammoInventoryId,
        ammoDeductedCount: effectiveNow,
      });
      setAmmoDeductQuantity(effectiveNow);
      setSession((prev) => prev ? { ...prev, ammo_deducted_count: effectiveNow } : prev);
      await fetchStock(ammoInventoryId);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}t ${minutes}m`;
    return `${minutes}m`;
  };

  const handleSaveResult = async () => {
    if (!session) return;
    setSavingResult(true);

    const { error } = await updateMatchResult({
      sessionId: session.id,
      totalHits: totalHits ? parseInt(totalHits, 10) : null,
      innerHits: innerHits ? parseInt(innerHits, 10) : null,
      resultNotes: resultNotes.trim() || null,
    });

    if (error) {
      alert('Kunne ikke lagre resultat');
    } else {
      setSession({
        ...session,
        total_hits: totalHits ? parseInt(totalHits, 10) : null,
        inner_hits: innerHits ? parseInt(innerHits, 10) : null,
        result_notes: resultNotes.trim() || null,
      });
      setEditingResult(false);
    }
    setSavingResult(false);
  };

  const handleSaveActualShots = async () => {
    if (!session || !stats || !id) return;
    setSavingShots(true);

    const parsed = actualShotInput ? parseInt(actualShotInput, 10) : null;
    const calcCount = stats.totalShots;
    const actualToSave = (parsed != null && parsed !== calcCount) ? parsed : null;
    const newEffective = actualToSave ?? calcCount;

    const { error } = await updateMatchShotCounts({
      sessionId: id,
      calculatedShotCount: calcCount,
      actualShotCount: actualToSave,
    });

    if (!error) {
      const updatedSession = {
        ...session,
        calculated_shot_count: calcCount,
        actual_shot_count: actualToSave,
      };
      setSession(updatedSession);
      setEditingShots(false);

      if (ammoDeductionState === 'pending' || ammoDeductionState === 'adjusting') {
        setAmmoDeductQuantity(newEffective);
        setAmmoAdjustedQuantity(String(newEffective));
      }
    }
    setSavingShots(false);
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

  if (!session || !stats) {
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

  if (session.status !== 'completed') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Stevne ikke fullført</h2>
          <p className="text-slate-600 mb-6">
            Dette stevnet er ikke ferdig ennå.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
            {session.status === 'setup' && (
              <button
                onClick={() => navigate(`/match/${session.id}/configure`)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
              >
                Konfigurer stevne
              </button>
            )}
            {(session.status === 'in_progress' || session.status === 'paused') && (
              <button
                onClick={() => navigate(`/match/${session.id}`)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
              >
                Fortsett stevne
              </button>
            )}
            <button
              onClick={() => navigate('/match')}
              className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
            >
              Tilbake til oversikt
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const hasResult = session.total_hits != null;
  const hasImages = holdImages.length > 0;
  const calculatedShots = stats.totalShots;
  const effectiveShots = getEffectiveShotCount(session, calculatedShots);
  const hasOverride = session.actual_shot_count != null && session.actual_shot_count !== calculatedShots;
  const alreadyDeducted = session.ammo_deducted_count != null;
  const needsCorrectionDeduct = alreadyDeducted && effectiveShots > (session.ammo_deducted_count ?? 0);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pb-32 md:pb-8">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake til oversikt</span>
        </button>

        {/* 1. Stevneinfo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Stevne fullført</h1>
          <p className="text-lg text-slate-700 font-medium">{session.match_name}</p>
          <div className="flex items-center justify-center gap-3 mt-2 text-sm text-slate-500">
            <span>{new Date(session.match_date).toLocaleDateString('nb-NO')}</span>
            <span className="capitalize">{session.competition_type}</span>
          </div>
        </div>

        {/* 2. Feltresultat */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Feltresultat</h2>
            </div>
            {hasResult && !editingResult && (
              <button
                onClick={() => setEditingResult(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Endre
              </button>
            )}
          </div>

          {!hasResult && !editingResult ? (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm mb-3">
                Legg inn feltresultatet for dette stevnet
              </p>
              <button
                onClick={() => setEditingResult(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Registrer resultat
              </button>
            </div>
          ) : editingResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Treff</label>
                  <input
                    type="number"
                    value={totalHits}
                    onChange={(e) => setTotalHits(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-lg font-semibold"
                    placeholder="0"
                    min="0"
                    max="60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Innertreff</label>
                  <input
                    type="number"
                    value={innerHits}
                    onChange={(e) => setInnerHits(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-lg font-semibold"
                    placeholder="0"
                    min="0"
                    max="60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notater (valgfritt)</label>
                <textarea
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Kommentarer til resultatet..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveResult}
                  disabled={savingResult}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition text-sm"
                >
                  <Save className="w-4 h-4" />
                  {savingResult ? 'Lagrer...' : 'Lagre resultat'}
                </button>
                <button
                  onClick={() => {
                    setEditingResult(false);
                    if (session) {
                      setTotalHits(session.total_hits != null ? String(session.total_hits) : '');
                      setInnerHits(session.inner_hits != null ? String(session.inner_hits) : '');
                      setResultNotes(session.result_notes || '');
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-700">{session.total_hits ?? '-'}</p>
                  <p className="text-sm text-emerald-600 font-medium">Treff</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{session.inner_hits ?? '-'}</p>
                  <p className="text-sm text-blue-600 font-medium">Innertreff</p>
                </div>
              </div>
              {totalHits && innerHits && (
                <p className="text-center text-sm text-slate-600 font-medium">
                  {totalHits} treff, {innerHits} innertreff
                  {parseInt(totalHits) > 0 && (
                    <span className="text-slate-400 ml-1">
                      ({Math.round((parseInt(innerHits) / parseInt(totalHits)) * 100)}% inner)
                    </span>
                  )}
                </p>
              )}
              {session.result_notes && (
                <div className="mt-3 bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{session.result_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Nøkkeltall */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-1 text-slate-500" strokeWidth={2} />
            <p className="text-2xl font-bold text-slate-900">{stats.completedHolds}</p>
            <p className="text-xs text-slate-500">Hold</p>
          </div>

          {stats.duration != null && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{formatDuration(stats.duration)}</p>
              <p className="text-xs text-slate-500">Tid</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <BulletIcon className="w-7 h-7 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{effectiveShots} <span className="text-base font-semibold text-slate-500">skudd</span></p>
          </div>
        </div>

        {/* Skudddetalj under nøkkeltall */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          {editingShots ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Juster faktisk antall skudd</p>
                <button
                  onClick={() => {
                    setEditingShots(false);
                    setActualShotInput(session.actual_shot_count != null ? String(session.actual_shot_count) : '');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Beregnet fra løypa: {calculatedShots} skudd. Skriv inn faktisk antall brukt.
              </p>
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  min="0"
                  value={actualShotInput}
                  onChange={(e) => setActualShotInput(e.target.value)}
                  className="w-28 px-3 py-2.5 border border-slate-300 rounded-lg text-center font-semibold text-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder={String(calculatedShots)}
                  autoFocus
                />
                <button
                  onClick={handleSaveActualShots}
                  disabled={savingShots}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition text-sm"
                >
                  {savingShots ? 'Lagrer...' : 'Lagre'}
                </button>
                {session.actual_shot_count != null && (
                  <button
                    onClick={async () => {
                      setActualShotInput('');
                      setSavingShots(true);
                      await updateMatchShotCounts({
                        sessionId: id!,
                        calculatedShotCount: calculatedShots,
                        actualShotCount: null,
                      });
                      setSession({ ...session, actual_shot_count: null });
                      setEditingShots(false);
                      setSavingShots(false);
                    }}
                    className="px-3 py-2.5 text-slate-500 hover:text-red-600 text-sm font-medium transition"
                  >
                    Nullstill
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Beregnet: </span>
                  <span className="font-medium text-slate-700">{calculatedShots} skudd</span>
                </div>
                {hasOverride && (
                  <div>
                    <span className="text-slate-500">Faktisk brukt: </span>
                    <span className="font-bold text-amber-700">{session.actual_shot_count} skudd</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setActualShotInput(
                    session.actual_shot_count != null
                      ? String(session.actual_shot_count)
                      : String(calculatedShots)
                  );
                  setEditingShots(true);
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Pencil className="w-3 h-3" />
                Juster
              </button>
            </div>
          )}
        </div>

        {/* Vind */}
        {session.wind_speed_mps > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Wind className="w-5 h-5 text-sky-600 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-900">{session.wind_speed_mps} m/s</span>
              <span className="text-slate-500 ml-1 text-sm">{getWindDirectionLabel(session.wind_direction_degrees)}</span>
            </div>
          </div>
        )}

        {/* 4. Holdoversikt */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-3">Holdoversikt</h2>
          <div className="space-y-2">
            {holds.map((hold, index) => (
              <div
                key={hold.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                      {hold.field_figure ? (
                        <FieldFigureSvg
                          svgData={hold.field_figure.svg_data}
                          imageUrl={hold.field_figure.image_url}
                          size="xs"
                          fallbackText={hold.field_figure.short_code || hold.field_figure.code}
                        />
                      ) : (
                        <Target className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                      <span className="text-[9px] font-bold text-white leading-none">{index + 1}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {hold.field_figure?.name || 'Ukjent figur'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{hold.distance_m || 0}m</span>
                      <span>{hold.shot_count} skudd</span>
                      {hold.recommended_clicks != null && hold.recommended_clicks !== 0 && (
                        <span>+{hold.recommended_clicks} knepp</span>
                      )}
                      {hold.wind_correction_clicks != null && hold.wind_correction_clicks !== 0 && (
                        <span className="text-sky-600">
                          vind {hold.wind_correction_clicks > 0 ? '+' : ''}{hold.wind_correction_clicks}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hold.completed && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Bilder */}
        {hasImages && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Bilder fra stevnet</h2>
              <span className="text-xs text-slate-400 ml-auto">{holdImages.length} bilder</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {holdImages.map((img) => {
                const isFailed = failedImages.has(img.holdId);
                return (
                  <button
                    key={img.holdId}
                    onClick={() => !isFailed && setLightboxUrl(img.imageUrl)}
                    className={`group relative rounded-lg overflow-hidden border transition aspect-[4/3] ${
                      isFailed
                        ? 'border-slate-200 bg-slate-50 cursor-default'
                        : 'border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {isFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageOff className="w-6 h-6 mb-1" />
                        <span className="text-xs">Kunne ikke laste</span>
                      </div>
                    ) : (
                      <img
                        src={img.imageUrl}
                        alt={`Hold ${img.orderIndex + 1}`}
                        className="w-full h-full object-cover"
                        onLoad={() => console.log('[MatchSummary] image loaded OK:', img.holdId)}
                        onError={(e) => {
                          console.error('[MatchSummary] image FAILED:', {
                            holdId: img.holdId,
                            src: e.currentTarget.src,
                            currentSrc: e.currentTarget.currentSrc,
                          });
                          setFailedImages(prev => new Set(prev).add(img.holdId));
                        }}
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs font-medium">
                        Hold {img.orderIndex + 1} &middot; {img.distanceM}m
                      </p>
                      <p className="text-white/70 text-[10px]">{img.figureName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Notater per hold */}
        {holds.some(h => h.notes) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="text-base font-bold text-slate-900 mb-3">Notater per hold</h2>
            <div className="space-y-2">
              {holds.filter(h => h.notes).map((hold) => (
                <div key={hold.id} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    Hold {hold.order_index + 1} &middot; {hold.field_figure?.name || 'Ukjent'}
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{hold.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Lagerjustering */}
        {ammoDeductionState !== 'idle' && (() => {
          const isDone = ammoDeductionState === 'done' && !needsCorrectionDeduct;
          const correctionDiff = needsCorrectionDeduct ? effectiveShots - (session.ammo_deducted_count ?? 0) : 0;
          const stockAfterCorrection = ammoCurrentStock != null ? Math.max(0, ammoCurrentStock - correctionDiff) : null;

          const StockCell = ({ value, label, accent }: { value: React.ReactNode; label: string; accent?: 'green' | 'amber' | 'neutral' }) => {
            const bg = accent === 'green' ? 'bg-emerald-100/70' : accent === 'amber' ? 'bg-amber-100/80' : 'bg-white/70';
            const border = accent === 'green' ? 'border-emerald-200' : accent === 'amber' ? 'border-amber-300' : 'border-slate-200';
            const numColor = accent === 'green' ? 'text-emerald-800' : accent === 'amber' ? 'text-amber-800' : 'text-slate-800';
            const labelColor = accent === 'green' ? 'text-emerald-600' : accent === 'amber' ? 'text-amber-600' : 'text-slate-500';
            return (
              <div className={`${bg} border ${border} rounded-lg px-1.5 py-2.5 text-center min-w-0`}>
                <div className={`text-xl font-extrabold leading-none ${numColor}`}>{value}</div>
                <div className={`text-[10px] font-semibold uppercase tracking-wide mt-1.5 leading-tight ${labelColor}`}>{label}</div>
              </div>
            );
          };

          return (
            <div className={`border rounded-xl p-4 mb-6 ${
              isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Package className={`w-4 h-4 ${isDone ? 'text-emerald-600' : 'text-amber-600'}`} />
                <h2 className="text-sm font-bold text-slate-900 truncate">{ammoInventoryName}</h2>
              </div>

              {isDone && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <StockCell value={session.ammo_deducted_count} label="Trukket" accent="green" />
                    {ammoCurrentStock != null && (
                      <StockCell value={ammoCurrentStock} label="På lager" accent="green" />
                    )}
                  </div>
                  {hasOverride && (
                    <p className="text-[11px] text-emerald-600 text-center mt-1">
                      Brukt {session.actual_shot_count} (beregnet {calculatedShots})
                    </p>
                  )}
                </div>
              )}

              {ammoDeductionState === 'done' && needsCorrectionDeduct && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    <StockCell value={session.ammo_deducted_count} label="Trukket" accent="green" />
                    <StockCell value={`+${correctionDiff}`} label="Ekstra" accent="amber" />
                    {stockAfterCorrection != null ? (
                      <StockCell value={stockAfterCorrection} label="Etter trekk" accent="neutral" />
                    ) : (
                      <div />
                    )}
                  </div>
                  {ammoCurrentStock != null && (
                    <p className="text-[11px] text-amber-700 text-center">
                      På lager: {ammoCurrentStock}
                    </p>
                  )}
                  <button
                    onClick={handleCorrectionDeduct}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-lg transition text-sm"
                  >
                    <Minus className="w-4 h-4" />
                    Trekk {correctionDiff} ekstra
                  </button>
                </div>
              )}

              {ammoDeductionState === 'pending' && (() => {
                const stockAfter = ammoCurrentStock != null ? Math.max(0, ammoCurrentStock - ammoDeductQuantity) : null;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ammoCurrentStock != null ? (
                        <StockCell value={ammoCurrentStock} label="På lager" accent="neutral" />
                      ) : (
                        <div />
                      )}
                      <StockCell value={`-${ammoDeductQuantity}`} label="Trekkes" accent="amber" />
                      {stockAfter != null ? (
                        <StockCell value={stockAfter} label="Etter trekk" accent="neutral" />
                      ) : (
                        <div />
                      )}
                    </div>
                    {hasOverride && (
                      <p className="text-[11px] text-amber-700 text-center">
                        Brukt {session.actual_shot_count} (beregnet {calculatedShots})
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleAmmoDeduct}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-lg transition text-sm"
                      >
                        <Minus className="w-4 h-4" />
                        Bekreft
                      </button>
                      <button
                        onClick={() => setAmmoDeductionState('adjusting')}
                        className="px-3 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold rounded-lg transition text-sm border border-slate-300"
                      >
                        Juster
                      </button>
                      <button
                        onClick={() => setAmmoDeductionState('idle')}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 font-semibold rounded-lg transition text-sm"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                );
              })()}

              {ammoDeductionState === 'adjusting' && (() => {
                const adjQty = parseInt(ammoAdjustedQuantity) || 0;
                const adjAfter = ammoCurrentStock != null ? Math.max(0, ammoCurrentStock - adjQty) : null;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ammoCurrentStock != null ? (
                        <StockCell value={ammoCurrentStock} label="På lager" accent="neutral" />
                      ) : (
                        <div />
                      )}
                      <div className="bg-amber-100/80 border border-amber-300 rounded-lg px-1.5 py-2.5 text-center min-w-0">
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={ammoAdjustedQuantity}
                          onChange={(e) => setAmmoAdjustedQuantity(e.target.value)}
                          className="w-full bg-transparent text-center text-xl font-extrabold text-amber-800 leading-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus
                        />
                        <div className="text-[10px] font-semibold uppercase tracking-wide mt-1.5 leading-tight text-amber-600">Trekkes</div>
                      </div>
                      {adjAfter != null ? (
                        <StockCell value={adjAfter} label="Etter trekk" accent="neutral" />
                      ) : (
                        <div />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAmmoDeduct}
                        disabled={!ammoAdjustedQuantity || adjQty <= 0}
                        className="flex-1 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 text-white font-semibold rounded-lg transition text-sm"
                      >
                        Bekreft
                      </button>
                      <button
                        onClick={() => setAmmoDeductionState('pending')}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 font-semibold rounded-lg transition text-sm"
                      >
                        Tilbake
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        <button
          onClick={() => navigate('/match')}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-xl transition shadow-lg"
        >
          Tilbake til hjem
        </button>
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="Forstørret bilde"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              console.error('[MatchSummary] lightbox image FAILED:', {
                src: e.currentTarget.src,
              });
            }}
          />
        </div>
      )}
    </Layout>
  );
}
