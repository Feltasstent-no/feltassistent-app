import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { FieldFigure, ClickTable, ClickTableRow } from '../types/database';
import { supabase } from '../lib/supabase';

interface StageConfigCardProps {
  stageNumber: number;
  competitionType: 'grovfelt' | 'finfelt';
  fieldFigureId: string | null;
  distanceM: number | null;
  clicks: number | null;
  clicksToZero: number | null;
  notes: string | null;
  onUpdate: (updates: {
    field_figure_id?: string | null;
    distance_m?: number | null;
    clicks?: number | null;
    clicks_to_zero?: number | null;
    notes?: string | null;
  }) => void;
  onRemove: () => void;
  availableFigures: FieldFigure[];
  clickTable: ClickTable | null;
  clickTableRows: ClickTableRow[];
}

export function StageConfigCard({
  stageNumber,
  competitionType,
  fieldFigureId,
  distanceM,
  clicks,
  clicksToZero,
  notes,
  onUpdate,
  onRemove,
  availableFigures,
  clickTable,
  clickTableRows,
}: StageConfigCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes || '');

  const selectedFigure = availableFigures.find(f => f.id === fieldFigureId);

  useEffect(() => {
    if (competitionType === 'grovfelt' && distanceM && clickTable) {
      const row = clickTableRows.find(r => r.distance_m === distanceM);
      if (row) {
        onUpdate({
          clicks: row.clicks,
          clicks_to_zero: row.clicks,
        });
      }
    }
  }, [distanceM, competitionType, clickTable, clickTableRows]);

  useEffect(() => {
    if (competitionType === 'finfelt') {
      onUpdate({
        distance_m: 100,
        clicks: null,
        clicks_to_zero: null,
      });
    }
  }, [competitionType]);

  const handleFigureChange = (figureId: string) => {
    const figure = availableFigures.find(f => f.id === figureId);
    console.log(`[StageConfigCard] ========== FIGURE CHANGED FOR HOLD ${stageNumber} ==========`);
    console.log(`[StageConfigCard] Hold ${stageNumber} selected:`, {
      field_figure_id: figureId,
      figure_code: figure?.code || 'UNKNOWN',
      figure_name: figure?.name || 'UNKNOWN'
    });
    onUpdate({ field_figure_id: figureId });
  };

  const handleDistanceChange = (distance: number) => {
    onUpdate({ distance_m: distance });
  };

  const handleNotesBlur = () => {
    if (localNotes !== notes) {
      onUpdate({ notes: localNotes || null });
    }
  };

  return (
    <div className="border border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-800">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 mb-2">
            <div className="text-base sm:text-lg font-semibold text-gray-200 flex-shrink-0">
              Hold {stageNumber}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {competitionType === 'grovfelt' && (
                <input
                  type="number"
                  value={distanceM || ''}
                  onChange={(e) => handleDistanceChange(Number(e.target.value))}
                  placeholder="m"
                  className="w-20 sm:w-32 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {competitionType === 'finfelt' && (
                <div className="w-16 sm:w-32 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-900 border border-gray-600 rounded text-gray-400 text-sm">
                  100m
                </div>
              )}
            </div>
          </div>

          <select
            value={fieldFigureId || ''}
            onChange={(e) => handleFigureChange(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Velg figur</option>
            {availableFigures.map(figure => (
              <option key={figure.id} value={figure.id}>
                {figure.code} - {figure.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-900/50 rounded transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </div>

      {competitionType === 'grovfelt' && clicks !== null && (
        <div className="flex gap-4 text-sm mb-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Knepp opp:</span>
            <span className="text-green-400 font-semibold">{clicks}</span>
          </div>
          {clicksToZero !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Tilbake til null:</span>
              <span className="text-yellow-400 font-semibold">{clicksToZero}</span>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <label className="block text-sm text-gray-400 mb-1">
            Notater (valgfritt)
          </label>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Legg til notater for dette holdet..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
