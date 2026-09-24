import { useEffect, useRef, useState } from 'react';
import { X, Pencil, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  correctCompletedHold,
  correctCompletedSubHold,
  effectiveElevation,
  getLogicalHoldNumber,
  getMatchHolds,
  type MatchHoldWithFigure,
  type MatchSubHold,
} from '../../lib/match-service';
import { getElevationForClickTable, getWindForClickTable } from '../../lib/click-table-resolver';
import { supabase } from '../../lib/supabase';
import { FieldFigureSvg } from '../FieldFigureSvg';
import { ConfirmDialog } from '../ConfirmDialog';
import type { FieldFigure } from '../../types/database';

interface Props {
  hold: MatchHoldWithFigure;
  holds: MatchHoldWithFigure[];
  sessionId: string;
  onSaved: () => void;
  onCancel: () => void;
}

interface SessionClickInfo {
  clickTableId: string | null;
  competitionType: string;
  windSpeedMps: number;
  windDirectionDeg: number;
}

interface SubForm {
  figureId: string | null;
  distance: string;
  notes: string;
}

function formatClicks(v: number | null | undefined): string {
  if (v == null) return '\u2014';
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : `${v}`;
}

function formatTime(s: number): string {
  if (s >= 60 && s % 60 === 0) return `${s / 60} min`;
  return `${s}s`;
}

export function CompletedHoldCorrection({ hold, holds, sessionId, onSaved, onCancel }: Props) {
  const isComp = hold.is_composite && !!hold.sub_holds && hold.sub_holds.length > 0;
  const isReshoot = !!hold.reshoot_of_hold_id;
  const logicalNo = getLogicalHoldNumber(hold, holds);

  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionClickInfo | null>(null);

  const [figureId, setFigureId] = useState<string | null>(hold.field_figure_id);
  const [distance, setDistance] = useState(String(hold.distance_m || ''));
  const [notes, setNotes] = useState(hold.notes || '');
  const [figurePickerOpen, setFigurePickerOpen] = useState(false);

  const [subForms, setSubForms] = useState<Record<string, SubForm>>({});

  const [newRecommended, setNewRecommended] = useState<{ elev: number; wind: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    supabase
      .from('field_figures')
      .select('*')
      .eq('is_active', true)
      .order('order_index')
      .then(({ data }) => setFigures(data || []));

    supabase
      .from('match_sessions')
      .select('click_table_id, competition_type, wind_speed_mps, wind_direction_degrees')
      .eq('id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSessionInfo({
            clickTableId: data.click_table_id,
            competitionType: data.competition_type,
            windSpeedMps: data.wind_speed_mps || 0,
            windDirectionDeg: data.wind_direction_degrees || 0,
          });
        }
      });

    if (isComp && hold.sub_holds) {
      const initial: Record<string, SubForm> = {};
      hold.sub_holds.forEach(sh => {
        initial[sh.id] = {
          figureId: sh.field_figure_id,
          distance: String(sh.distance_m || ''),
          notes: sh.notes || '',
        };
      });
      setSubForms(initial);
    }
  }, [hold.id]);

  useEffect(() => {
    if (!sessionInfo?.clickTableId || sessionInfo.competitionType === 'finfelt' || isComp) {
      setNewRecommended(null);
      return;
    }
    const distNum = parseFloat(distance);
    if (!distNum || distNum <= 0) {
      setNewRecommended(null);
      return;
    }
    const distChanged = distNum !== hold.distance_m;
    const figChanged = figureId !== hold.field_figure_id;
    if (!distChanged && !figChanged) {
      setNewRecommended(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const elev = await getElevationForClickTable(sessionInfo.clickTableId!, distNum);
      const windDirRad = (sessionInfo.windDirectionDeg * Math.PI) / 180;
      const crosswind = Math.abs(sessionInfo.windSpeedMps * Math.sin(windDirRad));
      const wind = crosswind > 0
        ? await getWindForClickTable(sessionInfo.clickTableId!, distNum, crosswind)
        : 0;
      if (!cancelled) setNewRecommended({ elev, wind });
    })();
    return () => { cancelled = true; };
  }, [distance, figureId, sessionInfo]);

  const distNum = parseFloat(distance);
  const distValid = distNum > 0;
  const figValid = isComp || !!figureId;

  const subValid = isComp
    ? hold.sub_holds!.every(sh => {
        const f = subForms[sh.id];
        return f && !!f.figureId && parseFloat(f.distance) > 0;
      })
    : true;

  const hasChanges = (() => {
    if (!isComp) {
      return figureId !== hold.field_figure_id
        || distNum !== (hold.distance_m || 0)
        || notes !== (hold.notes || '');
    }
    if (notes !== (hold.notes || '')) return true;
    return hold.sub_holds!.some(sh => {
      const f = subForms[sh.id];
      if (!f) return false;
      return f.figureId !== sh.field_figure_id
        || parseFloat(f.distance) !== (sh.distance_m || 0)
        || f.notes !== (sh.notes || '');
    });
  })();

  const canSave = hasChanges && (isComp || (distValid && figValid)) && subValid;

  const handleSaveRequest = () => {
    if (!canSave || saving) return;
    setShowConfirm(true);
  };

  const handleConfirmedSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setShowConfirm(false);

    try {
      const protectedBefore = {
        started_at: hold.started_at,
        completed: hold.completed,
        completed_at: hold.completed_at,
        shot_count: hold.shot_count,
        shooting_time_seconds: hold.shooting_time_seconds,
        elevation_correction_clicks: hold.elevation_correction_clicks,
        wind_correction_clicks: hold.wind_correction_clicks,
        reshoot_of_hold_id: hold.reshoot_of_hold_id,
        counts_for_score: hold.counts_for_score,
      };

      if (!isComp) {
        const updates: { field_figure_id?: string | null; distance_m?: number | null; notes?: string | null } = {};
        if (figureId !== hold.field_figure_id) updates.field_figure_id = figureId;
        if (distNum !== (hold.distance_m || 0)) updates.distance_m = distNum;
        if (notes !== (hold.notes || '')) updates.notes = notes || null;

        const { error } = await correctCompletedHold(hold.id, sessionId, updates);
        if (error) {
          setSaveError('Kunne ikke lagre korrigeringen. Prøv igjen.');
          return;
        }
      } else {
        if (notes !== (hold.notes || '')) {
          const { error } = await correctCompletedHold(hold.id, sessionId, { notes: notes || null });
          if (error) {
            setSaveError('Kunne ikke lagre notat. Prøv igjen.');
            return;
          }
        }
        for (const sh of hold.sub_holds!) {
          const f = subForms[sh.id];
          if (!f) continue;
          const subUpdates: { field_figure_id?: string | null; distance_m?: number | null; notes?: string | null } = {};
          if (f.figureId !== sh.field_figure_id) subUpdates.field_figure_id = f.figureId;
          const subDist = parseFloat(f.distance);
          if (subDist !== (sh.distance_m || 0)) subUpdates.distance_m = subDist;
          if (f.notes !== (sh.notes || '')) subUpdates.notes = f.notes || null;
          if (Object.keys(subUpdates).length > 0) {
            const { error } = await correctCompletedSubHold(sh.id, subUpdates);
            if (error) {
              setSaveError(`Kunne ikke lagre korrigeringen for delhold ${hold.sub_holds!.indexOf(sh) + 1}. Prøv igjen.`);
              return;
            }
          }
        }
      }

      const updatedHolds = await getMatchHolds(sessionId);
      const updated = updatedHolds.find(h => h.id === hold.id);
      if (updated) {
        const violations: string[] = [];
        if (updated.started_at !== protectedBefore.started_at) violations.push('started_at');
        if (updated.completed !== protectedBefore.completed) violations.push('completed');
        if (updated.completed_at !== protectedBefore.completed_at) violations.push('completed_at');
        if (updated.shot_count !== protectedBefore.shot_count) violations.push('shot_count');
        if (updated.shooting_time_seconds !== protectedBefore.shooting_time_seconds) violations.push('shooting_time');
        if (updated.elevation_correction_clicks !== protectedBefore.elevation_correction_clicks) violations.push('elevation_correction_clicks');
        if (updated.wind_correction_clicks !== protectedBefore.wind_correction_clicks) violations.push('wind_correction_clicks');
        if (updated.reshoot_of_hold_id !== protectedBefore.reshoot_of_hold_id) violations.push('reshoot_of_hold_id');
        if (updated.counts_for_score !== protectedBefore.counts_for_score) violations.push('counts_for_score');
        if (violations.length > 0) {
          setSaveError(`Invariantfeil: beskyttede felt ble endret (${violations.join(', ')}). Kontakt support.`);
          return;
        }
      }

      onSaved();
    } catch {
      setSaveError('Uventet feil. Prøv igjen.');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const updateSubForm = (shId: string, patch: Partial<SubForm>) => {
    setSubForms(prev => ({ ...prev, [shId]: { ...prev[shId], ...patch } }));
  };

  const selectedFigure = figures.find(f => f.id === figureId);
  const elev = effectiveElevation(hold);
  const holdTitle = isReshoot ? `Omskyting av Hold ${logicalNo}` : `Hold ${logicalNo}`;

  const ReadOnlyRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onCancel} />
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <h2 className="text-base font-bold text-slate-900 truncate">
              Korriger registrering — {holdTitle}
            </h2>
          </div>
          <button
            onClick={saving ? undefined : onCancel}
            disabled={saving}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 disabled:opacity-50 transition"
            aria-label="Lukk"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Locked fields (read-only) */}
          <div className="bg-slate-50 rounded-xl p-4 divide-y divide-slate-200/70">
            <div className="pb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Gjennomføringsdata (låst)
              </p>
            </div>
            <ReadOnlyRow label="Skudd" value={hold.shot_count} />
            <ReadOnlyRow label="Skytetid" value={formatTime(hold.shooting_time_seconds)} />
            {!isComp && (
              <ReadOnlyRow
                label="Høyde (brukt på holdet)"
                value={formatClicks(elev)}
              />
            )}
            {!isComp && (
              <ReadOnlyRow
                label="Vind (brukt på holdet)"
                value={formatClicks(hold.wind_correction_clicks)}
              />
            )}
          </div>

          {/* Recommended comparison (ordinary hold only) */}
          {!isComp && newRecommended && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                Etter korrigering
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Høyde</p>
                  <p className="text-sm text-slate-700">
                    Brukt: <span className="font-bold">{formatClicks(elev)}</span>
                  </p>
                  <p className="text-sm text-blue-700">
                    Anbefalt etter korr.: <span className="font-bold">{formatClicks(newRecommended.elev)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Vind</p>
                  <p className="text-sm text-slate-700">
                    Brukt: <span className="font-bold">{formatClicks(hold.wind_correction_clicks)}</span>
                  </p>
                  <p className="text-sm text-blue-700">
                    Anbefalt etter korr.: <span className="font-bold">{formatClicks(newRecommended.wind)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Editable fields — ordinary hold */}
          {!isComp && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Korrigerbare felt
                </p>

                {/* Figure selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Feltfigur</label>
                  <button
                    type="button"
                    onClick={() => setFigurePickerOpen(!figurePickerOpen)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                      !figureId ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {selectedFigure ? (
                      <>
                        <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <FieldFigureSvg
                            svgData={selectedFigure.svg_data}
                            imageUrl={selectedFigure.image_url}
                            size="xs"
                            fallbackText={selectedFigure.short_code || selectedFigure.code}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{selectedFigure.name}</p>
                          <p className="text-xs text-slate-500">{selectedFigure.short_code || selectedFigure.code}</p>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-red-500 font-medium">Velg figur</span>
                    )}
                    <span className="ml-auto flex-shrink-0 text-slate-400">
                      {figurePickerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {!figureId && (
                    <p className="text-xs text-red-600 mt-1 font-medium">Feltfigur er påkrevd</p>
                  )}

                  {figurePickerOpen && (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white">
                      {figures.map(fig => (
                        <button
                          key={fig.id}
                          type="button"
                          onClick={() => { setFigureId(fig.id); setFigurePickerOpen(false); }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center ${
                            fig.id === figureId
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-slate-200 hover:border-slate-400 bg-white'
                          }`}
                        >
                          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                            <FieldFigureSvg
                              svgData={fig.svg_data}
                              imageUrl={fig.image_url}
                              size="xs"
                              fallbackText={fig.short_code || fig.code}
                            />
                          </div>
                          <span className="text-[10px] text-slate-600 font-medium leading-tight truncate w-full">
                            {fig.short_code || fig.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Distance */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Avstand (m)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={distance}
                    onChange={e => setDistance(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition focus:outline-none focus:ring-2 ${
                      !distValid && distance !== ''
                        ? 'border-red-300 bg-red-50 focus:ring-red-400'
                        : 'border-slate-300 bg-white focus:ring-blue-400 focus:border-blue-400'
                    }`}
                  />
                  {!distValid && (
                    <p className="text-xs text-red-600 mt-1 font-medium">Gyldig avstand er påkrevd</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notat</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                    placeholder="Valgfritt notat"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Composite sub-holds */}
          {isComp && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Korriger delhold
              </p>
              {hold.sub_holds!.map((sh, si) => (
                <SubHoldCorrectionCard
                  key={sh.id}
                  subHold={sh}
                  index={si}
                  form={subForms[sh.id] || { figureId: sh.field_figure_id, distance: String(sh.distance_m || ''), notes: sh.notes || '' }}
                  figures={figures}
                  onUpdate={patch => updateSubForm(sh.id, patch)}
                />
              ))}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notat (hele holdet)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                  placeholder="Valgfritt notat"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-xl transition text-sm"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSaveRequest}
              disabled={!canSave || saving}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lagre korrigering
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Korriger registrering?"
        message="Dette korrigerer registreringen av holdet. Verdiene som faktisk ble brukt under gjennomføringen beholdes."
        confirmText="Lagre korrigering"
        isDestructive={false}
        isLoading={saving}
        onConfirm={handleConfirmedSave}
        onCancel={() => { if (!saving) setShowConfirm(false); }}
      />
    </div>
  );
}

function SubHoldCorrectionCard({
  subHold,
  index,
  form,
  figures,
  onUpdate,
}: {
  subHold: MatchSubHold;
  index: number;
  form: SubForm;
  figures: FieldFigure[];
  onUpdate: (patch: Partial<SubForm>) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedFig = figures.find(f => f.id === form.figureId);
  const distNum = parseFloat(form.distance);
  const distValid = distNum > 0;

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-slate-500">{index + 1}</span>
        </div>
        <p className="text-sm font-bold text-slate-800">Delhold {index + 1}</p>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span>{subHold.shot_count} skudd</span>
          {subHold.elevation_clicks != null && (
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {formatClicks(subHold.elevation_clicks)} høyde
            </span>
          )}
          {subHold.wind_clicks != null && subHold.wind_clicks !== 0 && (
            <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
              {formatClicks(subHold.wind_clicks)} vind
            </span>
          )}
        </div>
      </div>

      {/* Figure */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Feltfigur</label>
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition text-left ${
            !form.figureId ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
        >
          {selectedFig ? (
            <>
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <FieldFigureSvg
                  svgData={selectedFig.svg_data}
                  imageUrl={selectedFig.image_url}
                  size="xs"
                  fallbackText={selectedFig.short_code || selectedFig.code}
                />
              </div>
              <span className="text-sm font-medium text-slate-800 truncate">{selectedFig.name}</span>
            </>
          ) : (
            <span className="text-sm text-red-500 font-medium">Velg figur</span>
          )}
          <span className="ml-auto text-slate-400">
            {pickerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>
        {!form.figureId && (
          <p className="text-xs text-red-600 mt-1 font-medium">Feltfigur er påkrevd</p>
        )}
        {pickerOpen && (
          <div className="mt-1.5 grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-1.5 bg-white">
            {figures.map(fig => (
              <button
                key={fig.id}
                type="button"
                onClick={() => { onUpdate({ figureId: fig.id }); setPickerOpen(false); }}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition text-center ${
                  fig.id === form.figureId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                  <FieldFigureSvg
                    svgData={fig.svg_data}
                    imageUrl={fig.image_url}
                    size="xs"
                    fallbackText={fig.short_code || fig.code}
                  />
                </div>
                <span className="text-[9px] text-slate-600 font-medium leading-tight truncate w-full">
                  {fig.short_code || fig.code}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Distance */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Avstand (m)</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={form.distance}
          onChange={e => onUpdate({ distance: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:ring-2 ${
            !distValid && form.distance !== ''
              ? 'border-red-300 bg-red-50 focus:ring-red-400'
              : 'border-slate-300 bg-white focus:ring-blue-400'
          }`}
        />
        {!distValid && (
          <p className="text-xs text-red-600 mt-1 font-medium">Gyldig avstand er påkrevd</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notat</label>
        <textarea
          value={form.notes}
          onChange={e => onUpdate({ notes: e.target.value })}
          rows={1}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="Valgfritt"
        />
      </div>
    </div>
  );
}
