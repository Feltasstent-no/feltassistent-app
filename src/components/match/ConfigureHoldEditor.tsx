import { useState, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { FieldFigureSelector } from '../FieldFigureSelector';
import { SubHoldEditor, type SubHoldFormData } from './SubHoldEditor';
import {
  createSubHold,
  deleteSubHold,
  updateSubHold,
  syncCompositeHoldShotCount,
  getSubHolds,
  effectiveElevation,
  type MatchHold,
  type MatchSubHold,
} from '../../lib/match-service';
import { supabase } from '../../lib/supabase';
import type { FieldFigure, ClickTableRow } from '../../types/database';
import { ShotCountInput } from '../inputs/ShotCountInput';
import { ShootingTimeInput } from '../inputs/ShootingTimeInput';
import { NumericTextInput } from '../inputs/NumericTextInput';
import { requiredInputClass, RequiredFieldError } from '../inputs/required-field';
import { isDistanceMissing, isShootingTimeMissing } from '../../lib/match-service';

interface ConfigureHoldEditorProps {
  hold: MatchHold;
  figures: FieldFigure[];
  clickTableRows: ClickTableRow[];
  competitionType: 'grovfelt' | 'finfelt';
  onUpdate: (holdId: string, updates: Partial<MatchHold>) => Promise<void>;
  onClose: () => void;
  onSubHoldsChanged: (holdId: string, isComposite: boolean) => void;
}

function getRecommendedClicks(clickTableRows: ClickTableRow[], distanceM: number): number | null {
  if (clickTableRows.length === 0 || !distanceM) return null;
  const exactMatch = clickTableRows.find(row => row.distance_m === distanceM);
  if (exactMatch) return exactMatch.clicks;
  const sorted = [...clickTableRows].sort((a, b) => a.distance_m - b.distance_m);
  const lower = sorted.filter(row => row.distance_m < distanceM).pop();
  const upper = sorted.find(row => row.distance_m > distanceM);
  if (!lower && upper) return upper.clicks;
  if (lower && !upper) return lower.clicks;
  if (!lower && !upper) return null;
  return (distanceM - lower.distance_m) <= (upper.distance_m - distanceM) ? lower.clicks : upper.clicks;
}

export function ConfigureHoldEditor({
  hold,
  figures,
  clickTableRows,
  competitionType,
  onUpdate,
  onClose,
  onSubHoldsChanged,
}: ConfigureHoldEditorProps) {
  const [isComposite, setIsComposite] = useState(hold.is_composite || false);
  const [subHolds, setSubHolds] = useState<SubHoldFormData[]>([
    { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
    { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
  ]);
  const [loadedSubHolds, setLoadedSubHolds] = useState(false);
  const [savingComposite, setSavingComposite] = useState(false);
  const savingCompositeRef = useRef(false);

  const isGrovfelt = competitionType !== 'finfelt';

  useEffect(() => {
    if (hold.is_composite && !loadedSubHolds) {
      getSubHolds(hold.id).then((existing: MatchSubHold[]) => {
        if (existing.length > 0) {
          setSubHolds(existing.map(sh => ({
            id: sh.id,
            fieldFigureId: sh.field_figure_id,
            distanceM: sh.distance_m || 0,
            shotCount: sh.shot_count,
            elevationClicks: sh.elevation_clicks,
            windClicks: sh.wind_clicks,
          })));
        }
        setLoadedSubHolds(true);
      });
    }
  }, [hold.id, hold.is_composite, loadedSubHolds]);

  useEffect(() => {
    if (!isComposite || !isGrovfelt) return;
    const updated = subHolds.map(sh => {
      if (!sh.distanceM) return sh;
      const autoClicks = getRecommendedClicks(clickTableRows, sh.distanceM);
      if (autoClicks !== null && sh.elevationClicks === null) {
        return { ...sh, elevationClicks: autoClicks };
      }
      return sh;
    });
    const changed = updated.some((sh, i) => sh.elevationClicks !== subHolds[i].elevationClicks);
    if (changed) setSubHolds(updated);
  }, [subHolds, clickTableRows, isComposite, isGrovfelt]);

  const handleSubHoldsChange = (newSubHolds: SubHoldFormData[]) => {
    const withAutoClicks = newSubHolds.map((sh, i) => {
      const prev = subHolds[i];
      if (isGrovfelt && sh.distanceM && sh.distanceM !== prev?.distanceM) {
        const autoClicks = getRecommendedClicks(clickTableRows, sh.distanceM);
        return { ...sh, elevationClicks: autoClicks };
      }
      return sh;
    });
    setSubHolds(withAutoClicks);
  };

  const handleToggleComposite = () => {
    setIsComposite(!isComposite);
  };

  const handleSaveComposite = async () => {
    if (savingCompositeRef.current) return;
    if (subHolds.length < 2) return;
    if (!subHolds.every(sh => sh.fieldFigureId && sh.distanceM > 0)) return;
    if (isShootingTimeMissing(hold.shooting_time_seconds)) return;

    savingCompositeRef.current = true;
    setSavingComposite(true);

    try {
      const firstSub = subHolds[0];
      const totalShots = subHolds.reduce((sum, sh) => sum + sh.shotCount, 0);

      await onUpdate(hold.id, {
        field_figure_id: firstSub.fieldFigureId!,
        distance_m: firstSub.distanceM,
        shot_count: totalShots,
      });

      await supabase
        .from('match_holds')
        .update({ is_composite: true })
        .eq('id', hold.id);

      const existingSubHolds = await getSubHolds(hold.id);
      const existingIds = new Set(existingSubHolds.map(sh => sh.id));
      const currentIds = new Set(subHolds.filter(sh => sh.id).map(sh => sh.id!));

      for (const esh of existingSubHolds) {
        if (!currentIds.has(esh.id)) {
          await deleteSubHold(esh.id);
        }
      }

      for (let i = 0; i < subHolds.length; i++) {
        const sh = subHolds[i];
        if (sh.id && existingIds.has(sh.id)) {
          await updateSubHold({
            subHoldId: sh.id,
            fieldFigureId: sh.fieldFigureId,
            distanceM: sh.distanceM,
            shotCount: sh.shotCount,
            elevationClicks: sh.elevationClicks,
            windClicks: sh.windClicks,
          });
        } else {
          await createSubHold({
            matchHoldId: hold.id,
            orderIndex: i,
            fieldFigureId: sh.fieldFigureId,
            distanceM: sh.distanceM,
            shotCount: sh.shotCount,
            elevationClicks: sh.elevationClicks,
            windClicks: sh.windClicks,
          });
        }
      }

      await syncCompositeHoldShotCount(hold.id);

      onSubHoldsChanged(hold.id, true);
      onClose();
    } finally {
      savingCompositeRef.current = false;
      setSavingComposite(false);
    }
  };

  const handleRevertToSimple = async () => {
    const existingSubs = await getSubHolds(hold.id);
    for (const sh of existingSubs) {
      await deleteSubHold(sh.id);
    }

    await supabase
      .from('match_holds')
      .update({ is_composite: false })
      .eq('id', hold.id);

    setIsComposite(false);
    setSubHolds([
      { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
      { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
    ]);
    onSubHoldsChanged(hold.id, false);
  };

  const compositeValid =
    subHolds.length >= 2 &&
    subHolds.every(sh => sh.fieldFigureId && sh.distanceM > 0) &&
    !isShootingTimeMissing(hold.shooting_time_seconds);
  const compositeShotTotal = subHolds.reduce((sum, sh) => sum + sh.shotCount, 0);

  if (isComposite) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleToggleComposite}
          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 transition"
        >
          <Layers className="w-5 h-5 text-emerald-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-emerald-800">Sammensatt hold</p>
            <p className="text-xs text-slate-500">Flere figurer innenfor en samlet skytetid</p>
          </div>
          <div className="ml-auto w-10 h-6 rounded-full bg-emerald-500 flex items-center justify-end transition-colors">
            <div className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
          </div>
        </button>

        <SubHoldEditor
          subHolds={subHolds}
          onChange={handleSubHoldsChange}
          figures={figures}
          showClicks={isGrovfelt}
        />

        <ShootingTimeInput
          value={String(hold.shooting_time_seconds)}
          onChange={(v) => {
            const parsed = parseInt(v);
            onUpdate(hold.id, { shooting_time_seconds: Number.isNaN(parsed) ? 0 : parsed });
          }}
          suffix="- samlet for alle delhold"
        />
        <p className="text-sm text-slate-600">
          {subHolds.length} delhold, {compositeShotTotal} skudd
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleSaveComposite}
            disabled={!compositeValid || savingComposite}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {savingComposite ? 'Lagrer...' : 'Lagre sammensatt hold'}
          </button>
          <button
            onClick={() => {
              if (hold.is_composite) {
                handleRevertToSimple();
              } else {
                setIsComposite(false);
              }
            }}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 rounded-lg transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleToggleComposite}
        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-white transition"
      >
        <Layers className="w-5 h-5 text-slate-400" />
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-700">Sammensatt hold</p>
          <p className="text-xs text-slate-500">Flere figurer innenfor en samlet skytetid</p>
        </div>
        <div className="ml-auto w-10 h-6 rounded-full bg-slate-300 flex items-center justify-start transition-colors">
          <div className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
        </div>
      </button>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Velg figur</label>
        <FieldFigureSelector
          figures={figures}
          selectedFigureId={hold.field_figure_id}
          onSelect={(figureId) => onUpdate(hold.id, { field_figure_id: figureId })}
          showDistanceInfo={true}
          competitionType={competitionType}
        />
      </div>

      {competitionType === 'finfelt' ? (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Avstand (meter)</label>
            <NumericTextInput
              value={hold.distance_m ?? 100}
              onCommit={(v) => onUpdate(hold.id, { distance_m: v ?? 100 })}
              ariaLabel="Avstand i meter"
              className={requiredInputClass(isDistanceMissing(hold.distance_m))}
              placeholder="100"
            />
            <RequiredFieldError show={isDistanceMissing(hold.distance_m)} message="Mangler avstand" />
          </div>
          <div className="py-4 px-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-medium mb-1">Knepp brukes ikke i finfelt</p>
            <p className="text-xs text-blue-700">Husk: fra 15m &rarr; ca +26 knepp (busk standard)</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Avstand (meter)</label>
            <NumericTextInput
              value={hold.distance_m ?? null}
              onCommit={(v) => onUpdate(hold.id, { distance_m: v })}
              ariaLabel="Avstand i meter"
              className={requiredInputClass(isDistanceMissing(hold.distance_m))}
              placeholder="Avstand..."
            />
            <RequiredFieldError show={isDistanceMissing(hold.distance_m)} message="Mangler avstand" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Valgt knepp opp</label>
              {hold.elevation_correction_clicks !== null && hold.elevation_correction_clicks !== undefined && (
                <button
                  type="button"
                  onClick={() => onUpdate(hold.id, { elevation_correction_clicks: null })}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Bruk anbefalt{hold.recommended_clicks != null ? ` (${hold.recommended_clicks})` : ''}
                </button>
              )}
            </div>
            <NumericTextInput
              value={effectiveElevation(hold) ?? null}
              onCommit={(v) => onUpdate(hold.id, { elevation_correction_clicks: v ?? 0 })}
              allowNegative
              ariaLabel="Valgt knepp opp"
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Knepp..."
            />
          </div>
        </div>
      )}

      <ShotCountInput
        value={hold.shot_count}
        onChange={(v) => onUpdate(hold.id, { shot_count: v })}
      />

      <ShootingTimeInput
        value={String(hold.shooting_time_seconds)}
        onChange={(v) => {
          const parsed = parseInt(v);
          onUpdate(hold.id, { shooting_time_seconds: Number.isNaN(parsed) ? 0 : parsed });
        }}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Notat (valgfritt)</label>
        <textarea
          value={hold.notes || ''}
          onChange={(e) => onUpdate(hold.id, { notes: e.target.value })}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          rows={2}
          placeholder="Notater..."
        />
      </div>

      <button
        onClick={onClose}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 rounded-lg transition-colors"
      >
        Lukk
      </button>
    </div>
  );
}
