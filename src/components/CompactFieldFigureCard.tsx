import { FieldFigure } from '../types/database';
import { FieldFigureSvg } from './FieldFigureSvg';

interface CompactFieldFigureCardProps {
  figure: FieldFigure;
  onClick: (figure: FieldFigure) => void;
  selected?: boolean;
}

export function CompactFieldFigureCard({ figure, onClick, selected }: CompactFieldFigureCardProps) {
  const normalDistance = figure.normal_distance_m || figure.normal_distance;
  const maxDistance = figure.max_distance_m || figure.max_distance;

  return (
    <button
      onClick={() => onClick(figure)}
      className={`
        relative w-full p-3 rounded-lg border transition-all
        ${selected
          ? 'border-2 border-blue-600 bg-blue-50 shadow-md'
          : 'border border-slate-200 hover:border-slate-300 bg-white hover:shadow'
        }
      `}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-full aspect-square flex items-center justify-center bg-slate-50 rounded overflow-hidden">
          <FieldFigureSvg
            svgData={figure.svg_data}
            imageUrl={figure.image_url}
            size="xl"
            fallbackText={figure.short_code || figure.code}
          />
        </div>

        <div className="w-full space-y-1">
          <div className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold text-center truncate">
            {figure.name}
          </div>

          {figure.code && (
            <div className="text-[11px] text-slate-600 font-mono text-center truncate">
              Kode: {figure.code}
            </div>
          )}

          {figure.description && (
            <div className="text-[10px] text-slate-600 text-center line-clamp-1">
              {figure.description}
            </div>
          )}

          {normalDistance && (
            <div className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold text-center">
              Normal: {normalDistance}m
            </div>
          )}
          {maxDistance && (
            <div className="text-[11px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold text-center">
              Maks: {maxDistance}m
            </div>
          )}
          {figure.difficulty && (
            <div className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-center">
              Nivaa {figure.difficulty}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
