import { useState } from 'react';
import { Minus, Plus, Trash2, GripVertical } from 'lucide-react';
import { CompactFigureSelector } from '../CompactFigureSelector';
import type { FieldFigure } from '../../types/database';

export interface SubHoldFormData {
  id?: string;
  fieldFigureId: string | null;
  distanceM: number;
  shotCount: number;
  elevationClicks: number | null;
  windClicks: number | null;
}

interface SubHoldEditorProps {
  subHolds: SubHoldFormData[];
  onChange: (subHolds: SubHoldFormData[]) => void;
  figures: FieldFigure[];
  showClicks?: boolean;
}

function SubHoldRow({
  subHold,
  index,
  figures,
  showClicks,
  onUpdate,
  onRemove,
  canRemove,
}: {
  subHold: SubHoldFormData;
  index: number;
  figures: FieldFigure[];
  showClicks: boolean;
  onUpdate: (data: SubHoldFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const handleFigureSelect = (figureId: string) => {
    const fig = figures.find(f => f.id === figureId);
    onUpdate({
      ...subHold,
      fieldFigureId: figureId,
      distanceM: fig?.normal_distance_m || subHold.distanceM,
    });
  };

  const figureName = figures.find(f => f.id === subHold.fieldFigureId);

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

          {showClicks && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hoydeknepp (fra 0)</label>
                <input
                  type="number"
                  value={subHold.elevationClicks ?? ''}
                  onChange={(e) => onUpdate({ ...subHold, elevationClicks: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full text-center text-base font-bold border border-slate-300 rounded-md py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vindknepp</label>
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

export function SubHoldEditor({ subHolds, onChange, figures, showClicks = false }: SubHoldEditorProps) {
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
