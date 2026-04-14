import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, GripVertical, ArrowUp, Wind } from 'lucide-react';
import { CompactFigureSelector } from '../CompactFigureSelector';
import type { FieldFigure } from '../../types/database';

export interface SubHoldFormData {
  id?: string;
  fieldFigureId: string | null;
  distanceM: number;
  shotCount: number;
  elevationClicks: number | null;
  windClicks: number | null;
  windSpeedMs?: number;
}

export type ClickResolver = (distanceM: number) => Promise<number | null>;
export type WindResolver = (distanceM: number, windSpeedMs: number) => Promise<number | null>;

interface SubHoldEditorProps {
  subHolds: SubHoldFormData[];
  onChange: (subHolds: SubHoldFormData[]) => void;
  figures: FieldFigure[];
  showClicks?: boolean;
  onResolveClicks?: ClickResolver;
  onResolveWind?: WindResolver;
}

function SubHoldRow({
  subHold,
  index,
  figures,
  showClicks,
  onUpdate,
  onRemove,
  canRemove,
  onResolveClicks,
  onResolveWind,
}: {
  subHold: SubHoldFormData;
  index: number;
  figures: FieldFigure[];
  showClicks: boolean;
  onUpdate: (data: SubHoldFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  onResolveClicks?: ClickResolver;
  onResolveWind?: WindResolver;
}) {
  const [expanded, setExpanded] = useState(true);
  const [resolvedClicks, setResolvedClicks] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolvedWindClicks, setResolvedWindClicks] = useState<number | null>(null);
  const [windInput, setWindInput] = useState('');

  useEffect(() => {
    if (!onResolveClicks || !subHold.distanceM || subHold.distanceM <= 0) {
      setResolvedClicks(null);
      return;
    }

    let cancelled = false;
    setResolving(true);

    (async () => {
      const clicks = await onResolveClicks(subHold.distanceM);
      if (!cancelled) {
        setResolvedClicks(clicks);
        setResolving(false);
        if (clicks !== null) {
          onUpdate({ ...subHold, elevationClicks: clicks });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [subHold.distanceM, onResolveClicks]);

  const windSpeedParsed = parseFloat(windInput) || 0;

  useEffect(() => {
    if (!onResolveWind || !subHold.distanceM || subHold.distanceM <= 0 || !windSpeedParsed) {
      setResolvedWindClicks(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const wc = await onResolveWind(subHold.distanceM, windSpeedParsed);
      if (!cancelled) {
        setResolvedWindClicks(wc);
        if (wc !== null) {
          onUpdate({ ...subHold, windClicks: wc, windSpeedMs: windSpeedParsed });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [subHold.distanceM, windSpeedParsed, onResolveWind]);

  const handleFigureSelect = (figureId: string) => {
    const fig = figures.find(f => f.id === figureId);
    onUpdate({
      ...subHold,
      fieldFigureId: figureId,
      distanceM: fig?.normal_distance_m || subHold.distanceM,
    });
  };

  const figureName = figures.find(f => f.id === subHold.fieldFigureId);
  const hasAutoClicks = onResolveClicks && resolvedClicks !== null;
  const hasAutoWind = onResolveWind && resolvedWindClicks !== null && resolvedWindClicks !== 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition"
      >
        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
        <span className="text-sm font-bold text-slate-700 flex-shrink-0">
          Delhold {index + 1}
        </span>
        {figureName && (
          <span className="text-xs text-slate-500 truncate">
            {figureName.short_code || figureName.name} - {subHold.distanceM}m - {subHold.shotCount} skudd
          </span>
        )}
        <div className="flex-1" />
        {canRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-7 h-7 rounded-md hover:bg-red-100 flex items-center justify-center transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Figur</label>
            <CompactFigureSelector
              figures={figures}
              selectedFigureId={subHold.fieldFigureId}
              onSelect={handleFigureSelect}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Avstand (m)</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate({ ...subHold, distanceM: Math.max(0, subHold.distanceM - 50) })}
                  className="w-8 h-8 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <Minus className="w-3 h-3 text-slate-600" />
                </button>
                <input
                  type="number"
                  value={subHold.distanceM}
                  onChange={(e) => onUpdate({ ...subHold, distanceM: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="flex-1 text-center text-base font-bold border border-slate-300 rounded-md py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => onUpdate({ ...subHold, distanceM: subHold.distanceM + 50 })}
                  className="w-8 h-8 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <Plus className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Skudd</label>
              <div className="flex gap-1 mb-1.5">
                {[5, 6, 10, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onUpdate({ ...subHold, shotCount: n })}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                      subHold.shotCount === n
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate({ ...subHold, shotCount: Math.max(1, subHold.shotCount - 1) })}
                  className="w-8 h-8 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <Minus className="w-3 h-3 text-slate-600" />
                </button>
                <div className="flex-1 text-center text-base font-bold text-slate-900">
                  {subHold.shotCount}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...subHold, shotCount: subHold.shotCount + 1 })}
                  className="w-8 h-8 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <Plus className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {onResolveWind && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vindverdi (m/s, valgfritt)</label>
              <input
                type="text"
                inputMode="decimal"
                value={windInput}
                onChange={(e) => setWindInput(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="F.eks. 3"
                className="w-full text-center text-base font-bold border border-slate-300 rounded-md py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-400">Retning vurderes av skytteren.</p>
            </div>
          )}

          {(hasAutoClicks || hasAutoWind) && (
            <div className="flex gap-2">
              {hasAutoClicks && (
                <div className="flex-1 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <ArrowUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 leading-tight">Elevasjon</p>
                    <p className="text-sm font-bold text-slate-900">
                      {resolving ? '...' : `${Math.abs(resolvedClicks!)} knepp ${resolvedClicks! >= 0 ? 'opp' : 'ned'}`}
                    </p>
                  </div>
                </div>
              )}
              {hasAutoWind && (
                <div className="flex-1 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  <Wind className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 leading-tight">Vindkorreksjon</p>
                    <p className="text-sm font-bold text-slate-900">
                      {Math.abs(resolvedWindClicks!)} knepp
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {showClicks && !onResolveClicks && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Høydeknepp (fra 0)</label>
                <input
                  type="number"
                  value={subHold.elevationClicks ?? ''}
                  onChange={(e) => onUpdate({ ...subHold, elevationClicks: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full text-center text-base font-bold border border-slate-300 rounded-md py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vindverdi (knepp)</label>
                <input
                  type="number"
                  value={subHold.windClicks ?? ''}
                  onChange={(e) => onUpdate({ ...subHold, windClicks: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full text-center text-base font-bold border border-slate-300 rounded-md py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="-"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SubHoldEditor({ subHolds, onChange, figures, showClicks = false, onResolveClicks, onResolveWind }: SubHoldEditorProps) {
  const handleUpdate = (index: number, data: SubHoldFormData) => {
    const updated = [...subHolds];
    updated[index] = data;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(subHolds.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...subHolds, {
      fieldFigureId: null,
      distanceM: 0,
      shotCount: 3,
      elevationClicks: null,
      windClicks: null,
    }]);
  };

  const totalShots = subHolds.reduce((sum, sh) => sum + sh.shotCount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Delhold ({subHolds.length}) - Totalt {totalShots} skudd
        </p>
      </div>

      <div className="space-y-2">
        {subHolds.map((sh, i) => (
          <SubHoldRow
            key={i}
            subHold={sh}
            index={i}
            figures={figures}
            showClicks={showClicks}
            onUpdate={(data) => handleUpdate(i, data)}
            onRemove={() => handleRemove(i)}
            canRemove={subHolds.length > 2}
            onResolveClicks={onResolveClicks}
            onResolveWind={onResolveWind}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-emerald-400 text-slate-500 hover:text-emerald-600 text-sm font-medium rounded-xl transition flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Legg til delhold
      </button>
    </div>
  );
}
