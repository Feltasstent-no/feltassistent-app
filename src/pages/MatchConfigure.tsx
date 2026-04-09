import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FieldFigurePreview } from '../components/FieldFigurePreview';
import { ConfigureHoldEditor } from '../components/match/ConfigureHoldEditor';
import { ArrowLeft, Play, Check, AlertCircle, Package, AlertTriangle, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getMatchSession,
  getMatchHolds,
  updateMatchHold,
  updateMatchShooterClass,
  updateMatchAmmoSelection,
  startMatchSession,
  isMatchReadyToStart,
  getSubHoldsForSession,
  type MatchSession,
  type MatchHold,
  type MatchSubHold,
} from '../lib/match-service';
import { getAmmoInventoryForUser } from '../lib/ammo-inventory-service';
import { useAuth } from '../contexts/AuthContext';
import type { FieldFigure, ShooterClass, CompetitionTemplate, ClickTableRow, AmmoInventory } from '../types/database';
import { getLastShooterClassId, setLastShooterClassId } from '../lib/user-preferences';

export function MatchConfigure() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<MatchSession | null>(null);
  const [template, setTemplate] = useState<CompetitionTemplate | null>(null);
  const [holds, setHolds] = useState<MatchHold[]>([]);
  const [availableFigures, setAvailableFigures] = useState<FieldFigure[]>([]);
  const [shooterClasses, setShooterClasses] = useState<ShooterClass[]>([]);
  const [selectedShooterClassId, setSelectedShooterClassId] = useState<string>('');
  const [editingHoldId, setEditingHoldId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [clickTableRows, setClickTableRows] = useState<ClickTableRow[]>([]);
  const [subHoldsMap, setSubHoldsMap] = useState<Record<string, MatchSubHold[]>>({});
  const [ammoList, setAmmoList] = useState<AmmoInventory[]>([]);
  const [selectedAmmoId, setSelectedAmmoId] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      checkReadyState();
    }
  }, [holds, id]);

  const fetchData = async () => {
    if (!id) return;

    setLoading(true);

    try {
      const [sessionData, holdsData] = await Promise.all([
        getMatchSession(id),
        getMatchHolds(id),
      ]);

      if (!sessionData) {
        navigate('/match');
        return;
      }

      if (sessionData.status === 'completed') {
        navigate(`/match/${id}/summary`);
        return;
      }

      setSession(sessionData);
      setHolds(holdsData);

      const subHolds = await getSubHoldsForSession(id);
      setSubHoldsMap(subHolds);

      if (sessionData.shooter_class_id) {
        setSelectedShooterClassId(sessionData.shooter_class_id);
      } else {
        const lastClassId = getLastShooterClassId();
        if (lastClassId) {
          setSelectedShooterClassId(lastClassId);
          await updateMatchShooterClass(sessionData.id, lastClassId);
        } else if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('shooter_class_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profileData?.shooter_class_id) {
            setSelectedShooterClassId(profileData.shooter_class_id);
            setLastShooterClassId(profileData.shooter_class_id);
            await updateMatchShooterClass(sessionData.id, profileData.shooter_class_id);
          }
        }
      }

      const { data: templateData } = await supabase
        .from('competition_templates')
        .select('*')
        .eq('id', sessionData.template_id)
        .maybeSingle();

      setTemplate(templateData);

      // Hent alle DFS figurer (FieldFigureSelector filtrerer selv på grovfelt/finfelt)
      const { data: figuresData } = await supabase
        .from('field_figures')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      console.log('Available figures:', figuresData);
      setAvailableFigures(figuresData || []);

      const { data: classesData } = await supabase
        .from('shooter_classes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setShooterClasses(classesData || []);

      if (sessionData.click_table_id) {
        const { data: clickTableRowsData } = await supabase
          .from('click_table_rows')
          .select('*')
          .eq('click_table_id', sessionData.click_table_id)
          .order('distance_m');

        setClickTableRows(clickTableRowsData || []);
      }

      if (user) {
        const inventory = await getAmmoInventoryForUser(user.id);
        const activeItems = inventory.filter(a => a.track_stock);
        setAmmoList(activeItems);

        if (sessionData.ammo_inventory_id) {
          setSelectedAmmoId(sessionData.ammo_inventory_id);
        } else if (activeItems.length > 0) {
          const autoDeduct = activeItems.find(a => a.auto_deduct_after_match);
          if (autoDeduct) {
            setSelectedAmmoId(autoDeduct.id);
            await updateMatchAmmoSelection(sessionData.id, autoDeduct.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
    }

    setLoading(false);
  };

  const checkReadyState = async () => {
    if (!id) return;
    const ready = await isMatchReadyToStart(id);
    setIsReady(ready);
  };

  const getRecommendedClicksForDistance = (distanceM: number): number | null => {
    if (clickTableRows.length === 0 || !distanceM) return null;

    const exactMatch = clickTableRows.find(row => row.distance_m === distanceM);
    if (exactMatch) return exactMatch.clicks;

    const sortedRows = [...clickTableRows].sort((a, b) => a.distance_m - b.distance_m);

    const lowerRow = sortedRows.filter(row => row.distance_m < distanceM).pop();
    const upperRow = sortedRows.find(row => row.distance_m > distanceM);

    if (!lowerRow && upperRow) return upperRow.clicks;
    if (lowerRow && !upperRow) return lowerRow.clicks;
    if (!lowerRow && !upperRow) return null;

    const lowerDiff = distanceM - lowerRow.distance_m;
    const upperDiff = upperRow.distance_m - distanceM;

    if (lowerDiff <= upperDiff) {
      return lowerRow.clicks;
    } else {
      return upperRow.clicks;
    }
  };

  const handleUpdateHold = async (holdId: string, updates: Partial<MatchHold>) => {
    const hold = holds.find(h => h.id === holdId);

    console.log('[MatchConfigure] ========== HANDLE UPDATE HOLD ==========');
    console.log('[MatchConfigure] holdId:', holdId);
    console.log('[MatchConfigure] hold_number:', hold?.hold_number);
    console.log('[MatchConfigure] order_index:', hold?.order_index);
    console.log('[MatchConfigure] updates received:', updates);

    if (updates.field_figure_id) {
      const figure = availableFigures.find(f => f.id === updates.field_figure_id);
      console.log('[MatchConfigure] ⚠️  FIELD_FIGURE_ID UPDATE DETECTED ⚠️');
      console.log('[MatchConfigure] 🔄 BEFORE: hold.field_figure_id =', hold?.field_figure_id);
      console.log('[MatchConfigure] 🔄 BEFORE: figure code =', availableFigures.find(f => f.id === hold?.field_figure_id)?.code);
      console.log('[MatchConfigure] ➡️  AFTER: field_figure_id =', updates.field_figure_id);
      console.log('[MatchConfigure] ➡️  AFTER: figure code =', figure?.code);
      console.log('[MatchConfigure] Selected figure:', {
        field_figure_id: updates.field_figure_id,
        code: figure?.code || 'NOT FOUND',
        name: figure?.name || 'NOT FOUND'
      });

      if (figure) {
        updates.field_figure_code = figure.code;
        updates.field_figure_name = figure.name;
      }
    }

    if (session?.competition_type === 'finfelt') {
      if (!hold?.distance_m && updates.distance_m === undefined) {
        updates.distance_m = 100;
      }

      updates.recommended_clicks = 0;
    } else if (updates.distance_m !== undefined && updates.recommended_clicks === undefined) {
      const recommendedClicks = getRecommendedClicksForDistance(updates.distance_m);
      if (recommendedClicks !== null) {
        updates.recommended_clicks = recommendedClicks;
      }
    }

    console.log('[MatchConfigure] 📤 Calling updateMatchHold with:', {
      holdId,
      fieldFigureId: updates.field_figure_id || undefined,
      distanceM: updates.distance_m || undefined,
      shootingTimeSeconds: updates.shooting_time_seconds || undefined,
      shotCount: updates.shot_count || undefined,
      recommendedClicks: updates.recommended_clicks !== undefined ? updates.recommended_clicks : undefined,
      notes: updates.notes || undefined,
    });

    const { error } = await updateMatchHold({
      holdId,
      fieldFigureId: updates.field_figure_id || undefined,
      distanceM: updates.distance_m || undefined,
      shootingTimeSeconds: updates.shooting_time_seconds || undefined,
      shotCount: updates.shot_count || undefined,
      recommendedClicks: updates.recommended_clicks !== undefined ? updates.recommended_clicks : undefined,
      notes: updates.notes || undefined,
    });

    if (!error) {
      console.log('[MatchConfigure] ✅ updateMatchHold success, updating local state...');
      setHolds(
        holds.map((h) =>
          h.id === holdId ? { ...h, ...updates } : h
        )
      );
      console.log('[MatchConfigure] ✅ Local state updated');
    } else {
      console.error('[MatchConfigure] ❌ updateMatchHold failed:', error);
    }
  };

  const handleShooterClassChange = async (classId: string) => {
    if (!id) return;

    setSelectedShooterClassId(classId);
    if (classId) setLastShooterClassId(classId);
    await updateMatchShooterClass(id, classId);
  };

  const handleAmmoChange = async (ammoId: string) => {
    if (!id) return;
    setSelectedAmmoId(ammoId);
    await updateMatchAmmoSelection(id, ammoId || null);
  };

  const handleSubHoldsChanged = async (holdId: string, isComposite: boolean) => {
    if (!id) return;
    const [updatedHolds, updatedSubHolds] = await Promise.all([
      getMatchHolds(id),
      getSubHoldsForSession(id),
    ]);
    setHolds(updatedHolds);
    setSubHoldsMap(updatedSubHolds);
  };

  const handleStartMatch = async () => {
    if (!id || !isReady) return;

    setStarting(true);
    const { error } = await startMatchSession(id);

    if (error) {
      alert('Kunne ikke starte stevne: ' + error.message);
      setStarting(false);
    } else {
      navigate(`/match/${id}/preview`);
    }
  };

  const isHoldComplete = (hold: MatchHold) => {
    return (
      hold.field_figure_id !== null &&
      hold.distance_m !== null &&
      hold.distance_m > 0
    );
  };

  const completedCount = holds.filter(isHoldComplete).length;
  const totalCount = holds.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Laster stevneoppsett...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-40 md:pb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/match/setup')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{session?.match_name}</h1>
            <p className="text-sm text-slate-600">{template?.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Progresjon</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">
                {completedCount} av {totalCount} hold
              </p>
            </div>
            {isReady ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Klar til start</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Ikke ferdig</span>
              </div>
            )}
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Velg skyterklasse
          </label>
          <select
            value={selectedShooterClassId}
            onChange={(e) => handleShooterClassChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Velg klasse...</option>
            {shooterClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-slate-500">
            Kun for egen info om hvilken klasse stevnet ble skutt i
          </p>
        </div>

        {ammoList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-slate-600" />
              <label className="block text-sm font-medium text-slate-700">
                Ammunisjon (anbefalt)
              </label>
            </div>
            <select
              value={selectedAmmoId}
              onChange={(e) => handleAmmoChange(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Ikke spor ammunisjon</option>
              {ammoList.map((ammo) => (
                <option key={ammo.id} value={ammo.id}>
                  {ammo.name} ({ammo.stock_quantity} tilgjengelig)
                </option>
              ))}
            </select>
            {selectedAmmoId && (() => {
              const selected = ammoList.find(a => a.id === selectedAmmoId);
              const totalShots = holds.reduce((sum, h) => sum + h.shot_count, 0);
              if (selected && selected.stock_quantity < totalShots) {
                return (
                  <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Lite ammunisjon</p>
                      <p className="text-xs text-amber-700">
                        {selected.stock_quantity} på lager, trenger {totalShots} skudd for dette stevnet.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            <p className="mt-2 text-sm text-slate-500">
              Skuddforbruk trekkes automatisk fra lager etter stevnet
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {holds.map((hold, index) => (
            <div
              key={hold.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-colors ${
                isHoldComplete(hold)
                  ? 'border-emerald-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg font-bold text-emerald-700">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Hold {index + 1}</p>
                    </div>
                  </div>
                  {isHoldComplete(hold) && (
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {editingHoldId === hold.id ? (
                  <ConfigureHoldEditor
                    hold={hold}
                    figures={availableFigures}
                    clickTableRows={clickTableRows}
                    competitionType={session?.competition_type || 'grovfelt'}
                    onUpdate={handleUpdateHold}
                    onClose={() => setEditingHoldId(null)}
                    onSubHoldsChanged={handleSubHoldsChanged}
                  />
                ) : (
                  <div>
                    {hold.field_figure_id && hold.distance_m ? (
                      <div className="flex items-start gap-3 sm:gap-6">
                        <div className="flex-shrink-0 hidden sm:block">
                          {(() => {
                            const figure = availableFigures.find((f) => f.id === hold.field_figure_id);
                            return figure ? (
                              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-50 rounded-lg border-2 border-slate-200 p-2">
                                <FieldFigurePreview
                                  figure={figure}
                                  size="lg"
                                  showDetails={false}
                                />
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            {hold.is_composite && subHoldsMap[hold.id]?.length > 0 ? (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <Layers className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    Sammensatt - {subHoldsMap[hold.id].length} delhold
                                  </span>
                                </div>
                                <div className="space-y-1 mb-2">
                                  {subHoldsMap[hold.id].map((sh, si) => {
                                    const fig = availableFigures.find(f => f.id === sh.field_figure_id);
                                    return (
                                      <p key={sh.id} className="text-sm text-slate-600">
                                        <span className="font-medium text-slate-700">{si + 1}.</span>{' '}
                                        {fig?.name || 'Ukjent'} - {sh.distance_m}m
                                        {sh.elevation_clicks != null && (
                                          <span className="text-emerald-700 font-medium">
                                            {' '}({sh.elevation_clicks > 0 ? '+' : ''}{sh.elevation_clicks} kn)
                                          </span>
                                        )}
                                        {' - '}{sh.shot_count} skudd
                                      </p>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-slate-600">
                                  Figur:{' '}
                                  <span className="font-medium text-slate-900">
                                    {availableFigures.find((f) => f.id === hold.field_figure_id)?.name}
                                  </span>
                                </p>
                                <p className="text-sm text-slate-600 break-words">
                                  {hold.distance_m}m
                                  {hold.recommended_clicks !== null && hold.recommended_clicks !== undefined && (
                                    <>
                                      {' · '}
                                      <span className="font-medium text-emerald-700">
                                        {hold.recommended_clicks > 0 ? '+' : ''}{hold.recommended_clicks} knepp
                                      </span>
                                    </>
                                  )}
                                  {' · '}
                                  {hold.shot_count} skudd
                                </p>
                              </>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <label className="text-xs text-slate-500">Skytetid:</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={hold.shooting_time_seconds}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/[^0-9]/g, '');
                                  handleUpdateHold(hold.id, {
                                    shooting_time_seconds: v ? parseInt(v) : 60,
                                  });
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-20 px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                              <span className="text-xs text-slate-500">sek</span>
                            </div>
                            {hold.notes && (
                              <p className="text-sm text-slate-500 mt-1">{hold.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingHoldId(hold.id)}
                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                          >
                            Rediger
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          console.log('Opening hold editor for:', hold.id);
                          console.log('Available figures count:', availableFigures.length);
                          setEditingHoldId(hold.id);
                        }}
                        className="w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded-lg transition-colors"
                      >
                        Fyll ut hold
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="fixed left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 p-4 md:static md:bg-white md:border md:rounded-xl md:shadow-lg md:p-6 md:z-auto"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={handleStartMatch}
            disabled={!isReady || starting}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
              isReady && !starting
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5" />
            {starting ? 'Starter...' : 'Start stevne'}
          </button>
          {!isReady && (
            <p className="text-center text-sm text-slate-600 mt-3">
              Fyll ut alle hold før du starter stevnet
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
