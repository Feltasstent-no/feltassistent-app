import { useEffect, useRef, useState } from 'react';
import { Check, X, Layers, Sparkles } from 'lucide-react';
import { FieldFigureSelector } from '../FieldFigureSelector';
import { SubHoldEditor, type SubHoldFormData } from './SubHoldEditor';
import {
  updateMatchHold,
  updateHoldWindCorrection,
  recalculateHoldClicks,
  createSubHold,
  updateSubHold,
  deleteSubHold,
  syncCompositeHoldShotCount,
  getSubHolds,
  type MatchHoldWithFigure,
  type MatchSubHold,
} from '../../lib/match-service';
import type { FieldFigure, ClickTableRow } from '../../types/database';

interface PreStartHoldEditorProps {
  hold: MatchHoldWithFigure;
  sessionId: string;
  competitionType: 'grovfelt' | 'finfelt';
  figures: FieldFigure[];
  clickTableRows: ClickTableRow[];
  subHolds: MatchSubHold[];
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

function getRecommendedClicks(clickTableRows: ClickTableRow[], distanceM: number): number | null {
  if (clickTableRows.length === 0 || !distanceM) return null;
  const exact = clickTableRows.find(row => row.distance_m === distanceM);
  if (exact) return exact.clicks;
  const sorted = [...clickTableRows].sort((a, b) => a.distance_m - b.distance_m);
  const lower = sorted.filter(row => row.distance_m < distanceM).pop();
  const upper = sorted.find(row => row.distance_m > distanceM);
  if (!lower && upper) return upper.clicks;
  if (lower && !upper) return lower.clicks;
  if (!lower && !upper) return null;
  return (distanceM - lower!.distance_m) <= (upper!.distance_m - distanceM) ? lower!.clicks : upper!.clicks;
}

function formatClicks(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `${value}`;
}

interface RegularForm {
  fieldFigureId: string | null;
  distanceM: number;
  shotCount: number;
  shootingTimeSeconds: number;
  elevationCorrectionClicks: number | null;
  windCorrectionClicks: number;
  notes: string;
}

export function PreStartHoldEditor({
  hold,
  sessionId,
  competitionType,
  figures,
  clickTableRows,
  subHolds,
  onSaved,
  onCancel,
}: PreStartHoldEditorProps) {
  const isGrovfelt = competitionType !== 'finfelt';
  const isComposite = hold.is_composite;

  if (isComposite) {
    return (
      <CompositeEditor
        hold={hold}
        figures={figures}
        clickTableRows={clickTableRows}
        subHolds={subHolds}
        isGrovfelt={isGrovfelt}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    );
  }

  return (
    <RegularEditor
      hold={hold}
      sessionId={sessionId}
      figures={figures}
      clickTableRows={clickTableRows}
      isGrovfelt={isGrovfelt}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}

function RegularEditor({
  hold,
  sessionId,
  figures,
  clickTableRows,
  isGrovfelt,
  onSaved,
  onCancel,
}: {
  hold: MatchHoldWithFigure;
  sessionId: string;
  figures: FieldFigure[];
  clickTableRows: ClickTableRow[];
  isGrovfelt: boolean;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RegularForm>({
    fieldFigureId: hold.field_figure_id,
    distanceM: hold.distance_m || 0,
    shotCount: hold.shot_count,
    shootingTimeSeconds: hold.shooting_time_seconds,
    elevationCorrectionClicks: hold.elevation_correction_clicks,
    windCorrectionClicks: hold.wind_correction_clicks ?? 0,
    notes: hold.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const liveRecommendedElev = isGrovfelt ? getRecommendedClicks(clickTableRows, form.distanceM) : 0;
  const recommendedWind = hold.recommended_wind_clicks ?? 0;
  const followingRecommendedElev = form.elevationCorrectionClicks === null;
  const selectedElev = form.elevationCorrectionClicks ?? liveRecommendedElev ?? 0;

  const handleFigureSelect = (figureId: string) => {
    const fig = figures.find(f => f.id === figureId);
    setForm(f => ({
      ...f,
      fieldFigureId: figureId,
      distanceM: fig?.normal_distance_m ?? f.distanceM,
    }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateMatchHold({
        holdId: hold.id,
        fieldFigureId: form.fieldFigureId ?? undefined,
        distanceM: form.distanceM,
        elevationCorrectionClicks: form.elevationCorrectionClicks,
        shootingTimeSeconds: form.shootingTimeSeconds,
        shotCount: form.shotCount,
        notes: form.notes,
      });
      await updateHoldWindCorrection(hold.id, form.windCorrectionClicks);
      await recalculateHoldClicks(sessionId, hold.id, form.distanceM);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!form.fieldFigureId && form.distanceM > 0 && form.shootingTimeSeconds > 0;

  return (
    <div className="space-y-4">
      <EditorHeader title="Rediger hold" onCancel={onCancel} />

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wide mb-2">Figur</label>
        <FieldFigureSelector
          figures={figures}
          selectedFigureId={form.fieldFigureId}
          onSelect={handleFigureSelect}
          showDistanceInfo={true}
          competitionType={isGrovfelt ? 'grovfelt' : 'finfelt'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Avstand (m)"
          value={form.distanceM}
          onChange={v => setForm(f => ({ ...f, distanceM: v }))}
          invalid={form.distanceM <= 0}
          errorText="Mangler avstand"
        />
        <NumberField
          label="Antall skudd"
          value={form.shotCount}
          onChange={v => setForm(f => ({ ...f, shotCount: v }))}
        />
        <NumberField
          label="Skytetid (sek)"
          value={form.shootingTimeSeconds}
          onChange={v => setForm(f => ({ ...f, shootingTimeSeconds: v }))}
          invalid={form.shootingTimeSeconds <= 0}
          errorText="Mangler skytetid"
        />
      </div>

      {isGrovfelt ? (
        <>
          <RecommendedSelected
            title="Høyde (knepp)"
            recommendedLabel={formatClicks(liveRecommendedElev)}
            selectedValue={selectedElev}
            following={followingRecommendedElev}
            onSelectedChange={v => setForm(f => ({ ...f, elevationCorrectionClicks: v }))}
            onUseRecommended={() => setForm(f => ({ ...f, elevationCorrectionClicks: null }))}
            followingLabel="Følger anbefalt"
          />
          <RecommendedSelected
            title="Vind (knepp)"
            recommendedLabel={formatClicks(recommendedWind)}
            selectedValue={form.windCorrectionClicks}
            following={false}
            onSelectedChange={v => setForm(f => ({ ...f, windCorrectionClicks: v }))}
            onUseRecommended={() => setForm(f => ({ ...f, windCorrectionClicks: recommendedWind }))}
          />
        </>
      ) : (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
          <p className="text-sm font-medium text-blue-900">Knepp brukes ikke i finfelt</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wide mb-1">Notat (valgfritt)</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Notater..."
        />
      </div>

      <SaveCancel saving={saving} canSave={canSave} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

function CompositeEditor({
  hold,
  figures,
  clickTableRows,
  subHolds,
  isGrovfelt,
  onSaved,
  onCancel,
}: {
  hold: MatchHoldWithFigure;
  figures: FieldFigure[];
  clickTableRows: ClickTableRow[];
  subHolds: MatchSubHold[];
  isGrovfelt: boolean;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<SubHoldFormData[]>(
    subHolds.length > 0
      ? subHolds.map(sh => ({
          id: sh.id,
          fieldFigureId: sh.field_figure_id,
          distanceM: sh.distance_m || 0,
          shotCount: sh.shot_count,
          elevationClicks: sh.elevation_clicks,
          windClicks: sh.wind_clicks,
        }))
      : [
          { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
          { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
        ]
  );
  const [shootingTime, setShootingTime] = useState(hold.shooting_time_seconds);
  const [notes, setNotes] = useState(hold.notes || '');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!isGrovfelt) return;
    const updated = rows.map(sh => {
      if (!sh.distanceM) return sh;
      const auto = getRecommendedClicks(clickTableRows, sh.distanceM);
      if (auto !== null && sh.elevationClicks === null) return { ...sh, elevationClicks: auto };
      return sh;
    });
    if (updated.some((sh, i) => sh.elevationClicks !== rows[i].elevationClicks)) setRows(updated);
  }, [rows, clickTableRows, isGrovfelt]);

  const handleRowsChange = (next: SubHoldFormData[]) => {
    const withAuto = next.map((sh, i) => {
      const prev = rows[i];
      if (isGrovfelt && sh.distanceM && sh.distanceM !== prev?.distanceM) {
        return { ...sh, elevationClicks: getRecommendedClicks(clickTableRows, sh.distanceM) };
      }
      return sh;
    });
    setRows(withAuto);
  };

  const valid = rows.length >= 2 && rows.every(sh => sh.fieldFigureId && sh.distanceM > 0) && shootingTime > 0;
  const totalShots = rows.reduce((sum, sh) => sum + sh.shotCount, 0);

  const handleSave = async () => {
    if (savingRef.current || !valid) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const first = rows[0];
      await updateMatchHold({
        holdId: hold.id,
        fieldFigureId: first.fieldFigureId!,
        distanceM: first.distanceM,
        shotCount: totalShots,
        shootingTimeSeconds: shootingTime,
        notes,
      });

      const existing = await getSubHolds(hold.id);
      const existingIds = new Set(existing.map(sh => sh.id));
      const currentIds = new Set(rows.filter(sh => sh.id).map(sh => sh.id!));

      for (const esh of existing) {
        if (!currentIds.has(esh.id)) await deleteSubHold(esh.id);
      }

      for (let i = 0; i < rows.length; i++) {
        const sh = rows[i];
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
      await onSaved();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <EditorHeader
        title="Rediger sammensatt hold"
        onCancel={onCancel}
        badge={
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Layers className="w-3.5 h-3.5" />
            {rows.length} delhold
          </span>
        }
      />

      <SubHoldEditor
        subHolds={rows}
        onChange={handleRowsChange}
        figures={figures}
        showClicks={isGrovfelt}
      />

      <NumberField
        label="Skytetid (sek) - samlet"
        value={shootingTime}
        onChange={v => setShootingTime(v)}
        invalid={shootingTime <= 0}
        errorText="Mangler skytetid"
      />

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wide mb-1">Notat (valgfritt)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Notater..."
        />
      </div>

      <p className="text-sm text-slate-600">{rows.length} delhold, {totalShots} skudd totalt</p>

      <SaveCancel saving={saving} canSave={valid} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

function EditorHeader({ title, onCancel, badge }: { title: string; onCancel: () => void; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {badge}
      </div>
      <button onClick={onCancel} className="p-1 rounded text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SaveCancel({
  saving,
  canSave,
  onSave,
  onCancel,
}: {
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onCancel}
        className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
      >
        Avbryt
      </button>
      <button
        onClick={onSave}
        disabled={saving || !canSave}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check className="w-3.5 h-3.5" />
        {saving ? 'Lagrer...' : 'Lagre'}
      </button>
    </div>
  );
}

function RecommendedSelected({
  title,
  recommendedLabel,
  selectedValue,
  following,
  onSelectedChange,
  onUseRecommended,
  followingLabel,
}: {
  title: string;
  recommendedLabel: string;
  selectedValue: number;
  following: boolean;
  onSelectedChange: (v: number) => void;
  onUseRecommended: () => void;
  followingLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase text-slate-500 tracking-wide">{title}</p>
        <button
          type="button"
          onClick={onUseRecommended}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition"
        >
          <Sparkles className="w-3 h-3" />
          Bruk anbefalt
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Anbefalt</p>
          <p className="text-base font-bold text-slate-700 tabular-nums leading-tight mt-0.5">{recommendedLabel}</p>
        </div>
        <div className={`rounded-lg border px-2 py-1.5 text-center ${following ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-300'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${following ? 'text-slate-400' : 'text-emerald-600'}`}>
            {following && followingLabel ? followingLabel : 'Valgt'}
          </p>
          <SelectedInput value={selectedValue} onChange={onSelectedChange} />
        </div>
      </div>
    </div>
  );
}

function SelectedInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [str, setStr] = useState(String(value));

  useEffect(() => {
    setStr(String(value));
  }, [value]);

  return (
    <input
      type="number"
      value={str}
      onChange={e => {
        setStr(e.target.value);
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-full mt-0.5 text-center text-base font-bold tabular-nums bg-transparent focus:outline-none"
    />
  );
}

function NumberField({
  label,
  value,
  onChange,
  allowNegative = false,
  invalid = false,
  errorText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  allowNegative?: boolean;
  invalid?: boolean;
  errorText?: string;
}) {
  const [str, setStr] = useState(String(value));

  useEffect(() => {
    setStr(String(value));
  }, [value]);

  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase text-slate-500 tracking-wide mb-1">{label}</label>
      <input
        type="number"
        value={str}
        onChange={e => {
          setStr(e.target.value);
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && (allowNegative || v >= 0)) onChange(v);
        }}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none tabular-nums transition ${
          invalid
            ? 'bg-red-50 border-red-400 focus:ring-2 focus:ring-red-400 focus:border-red-400'
            : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
        }`}
      />
      {invalid && errorText && (
        <p className="text-[10px] text-red-600 font-medium mt-1">{errorText}</p>
      )}
    </div>
  );
}
