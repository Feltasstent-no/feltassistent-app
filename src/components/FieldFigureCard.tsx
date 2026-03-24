import { FieldFigure } from '../types/database';
import { ChevronRight } from 'lucide-react';
import { FieldFigureSvg } from './FieldFigureSvg';

interface FieldFigureCardProps {
  figure: FieldFigure;
  onClick: (figure: FieldFigure) => void;
  selected?: boolean;
}

export function FieldFigureCard({ figure, onClick, selected }: FieldFigureCardProps) {
  return (
    <button
      onClick={() => onClick(figure)}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left
        ${selected
          ? 'border-blue-600 bg-blue-50'
          : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg p-1 flex items-center justify-center border border-slate-200 overflow-hidden">
          <FieldFigureSvg
            svgData={figure.svg_data}
            imageUrl={figure.image_url}
            size="lg"
            fallbackText={figure.short_code || figure.code}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  {figure.name}
                </span>
              </div>
              {figure.code && (
                <span className="text-xs text-slate-500 font-mono">Kode: {figure.code}</span>
              )}
            </div>
            <ChevronRight className={`w-5 h-5 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>

          {figure.description && (
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{figure.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {figure.normal_distance && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                Normal: {figure.normal_distance}m
              </span>
            )}
            {figure.max_distance && (
              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                Maks: {figure.max_distance}m
              </span>
            )}
            {figure.difficulty && (
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                Nivaa {figure.difficulty}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
