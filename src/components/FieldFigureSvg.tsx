import { useMemo } from 'react';

interface FieldFigureSvgProps {
  svgContent?: string | null;
  svgData?: string | null;
  imageUrl?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
}

const sizeClasses = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

function normalizeSvg(raw: string): string {
  let svg = raw.replace(/<\?xml[^?]*\?>\s*/g, '');

  const svgTagMatch = svg.match(/<svg([^>]*)>/);
  if (!svgTagMatch) return svg;

  let svgAttrs = svgTagMatch[1];
  const originalAttrs = svgAttrs;

  const viewBoxMatch = svgAttrs.match(/viewBox="([^"]*)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

  const wMatch = svgAttrs.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const hMatch = svgAttrs.match(/\bheight="(\d+(?:\.\d+)?)"/);

  svgAttrs = svgAttrs.replace(/\s*\bwidth="[^"]*"/g, '');
  svgAttrs = svgAttrs.replace(/\s*\bheight="[^"]*"/g, '');
  svgAttrs = svgAttrs.replace(/\s*preserveAspectRatio="[^"]*"/g, '');

  if (!viewBox && wMatch && hMatch) {
    svgAttrs += ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`;
  }

  svgAttrs = ` preserveAspectRatio="xMidYMid meet" width="100%" height="100%"` + svgAttrs;

  svg = svg.replace(`<svg${originalAttrs}>`, `<svg${svgAttrs}>`);

  return svg;
}

export function FieldFigureSvg({
  svgContent,
  svgData,
  imageUrl,
  className = '',
  size = 'md',
  fallbackText = '?'
}: FieldFigureSvgProps) {
  const raw = svgContent || svgData;

  const processedSvg = useMemo(
    () => (raw ? normalizeSvg(raw) : ''),
    [raw]
  );

  if (raw) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} flex items-center justify-center overflow-hidden`}
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
    );
  }

  if (imageUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center overflow-hidden`}>
        <img
          src={imageUrl}
          alt="Field figure"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-slate-200 rounded-lg`}
    >
      <span className="text-slate-500 font-bold text-lg">{fallbackText}</span>
    </div>
  );
}

export { normalizeSvg };
