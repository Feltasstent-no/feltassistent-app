import { useMemo } from 'react';
import { FieldFigure as FieldFigureType } from '../types/database';
import { normalizeSvg } from './FieldFigureSvg';

interface FieldFigureProps {
  figure: FieldFigureType | null;
  className?: string;
  size?: 'compact' | 'active';
  showName?: boolean;
}

const containerClasses = {
  compact: 'w-16 h-16',
  active: 'w-32 h-32',
};

export function FieldFigure({
  figure,
  className = '',
  size = 'active',
  showName = false
}: FieldFigureProps) {
  const processedSvg = useMemo(
    () => (figure?.svg_data ? normalizeSvg(figure.svg_data) : ''),
    [figure?.svg_data]
  );

  if (!figure) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-slate-400 text-sm">Ingen figur valgt</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`${containerClasses[size]} flex items-center justify-center overflow-hidden rounded-lg bg-white`}
      >
        {figure.image_url ? (
          <img
            src={figure.image_url}
            alt={figure.name}
            className="w-full h-full object-contain"
          />
        ) : processedSvg ? (
          <div
            dangerouslySetInnerHTML={{ __html: processedSvg }}
            className="w-full h-full"
          />
        ) : (
          <span className="text-slate-400 font-bold text-sm">
            {figure.short_code || figure.code}
          </span>
        )}
      </div>
      {showName && (
        <p className="text-xs font-semibold text-slate-700 mt-1 text-center">
          {figure.short_code || figure.code || figure.name}
        </p>
      )}
    </div>
  );
}
