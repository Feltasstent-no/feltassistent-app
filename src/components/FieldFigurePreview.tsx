import { FieldFigureSvg } from './FieldFigureSvg';
import type { FieldFigure } from '../types/database';

interface FieldFigurePreviewProps {
  figure: FieldFigure;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showDetails?: boolean;
  className?: string;
}

export function FieldFigurePreview({
  figure,
  size = 'md',
  showDetails = true,
  className = ''
}: FieldFigurePreviewProps) {
  return (
    <div className={className}>
      <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-center">
        <FieldFigureSvg
          svgData={figure.svg_data}
          imageUrl={figure.image_url}
          size={size}
          fallbackText={figure.short_code || figure.code}
        />
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <p className="text-sm font-bold text-slate-900">
            {figure.short_code || figure.code}
          </p>
          <p className="text-xs text-slate-600">{figure.name}</p>
        </div>
      )}
    </div>
  );
}
