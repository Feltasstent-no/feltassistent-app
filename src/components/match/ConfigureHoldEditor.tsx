import { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { FieldFigureSelector } from '../FieldFigureSelector';
import { SubHoldEditor, type SubHoldFormData } from './SubHoldEditor';
import {
  createSubHold,
  deleteSubHold,
  updateSubHold,
  syncCompositeHoldShotCount,
  getSubHolds,
  type MatchHold,
  type MatchSubHold,
} from '../../lib/match-service';
import { supabase } from '../../lib/supabase';
import type { FieldFigure, ClickTableRow } from '../../types/database';

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
    if (subHolds.length < 2) return;
    if (!subHolds.every(sh => sh.fieldFigureId && sh.distanceM > 0)) return;

    setSavingComposite(true);

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

    setSavingComposite(false);
    onSubHoldsChanged(hold.id, true);
    onClose();
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

  const compositeValid = subHolds.length >= 2 && subHolds.every(sh => sh.fieldFigureId && sh.distanceM > 0);
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Skytetid (sek)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hold.shooting_time_seconds}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                onUpdate(hold.id, { shooting_time_seconds: v ? parseInt(v) : 60 });
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="60"
            />
            <p className="text-xs text-slate-500 mt-1">Samlet tid for alle delhold</p>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-sm text-slate-600">
              {subHolds.length} delhold, {compositeShotTotal} skudd
            </p>
          </div>
        </div>

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
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hold.distance_m || 100}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                onUpdate(hold.id, { distance_m: v ? parseInt(v) : 100 });
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="100"
            />
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
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hold.distance_m || ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                onUpdate(hold.id, { distance_m: v ? parseInt(v) : null });
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Avstand..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Knepp opp</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="-?[0-9]*"
              value={hold.recommended_clicks ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9-]/g, '');
                onUpdate(hold.id, { recommended_clicks: v ? parseInt(v) : 0 });
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Knepp..."
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Antall skudd</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={hold.shot_count}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              onUpdate(hold.id, { shot_count: v ? parseInt(v) : 6 });
            }}
            onFocus={(e) => e.target.select()}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Skytetid (sek)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={hold.shooting_time_seconds}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              onUpdate(hold.id, { shooting_time_seconds: v ? parseInt(v) : 60 });
            }}
            onFocus={(e) => e.target.select()}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder={competitionType === 'finfelt' ? '120' : '60'}
          />
          <p className="text-xs text-slate-500 mt-1">Gjelder kun dette holdet</p>
        </div>
      </div>

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
