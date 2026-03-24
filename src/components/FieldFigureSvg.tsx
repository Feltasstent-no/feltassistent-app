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
  let svg = raw;

  const viewBoxMatch = svg.match(/viewBox="([^"]*)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

  svg = svg.replace(/\s*width="[^"]*"/g, '');
  svg = svg.replace(/\s*height="[^"]*"/g, '');

  if (!viewBox) {
    const wMatch = raw.match(/width="(\d+(?:\.\d+)?)"/);
    const hMatch = raw.match(/height="(\d+(?:\.\d+)?)"/);
    if (wMatch && hMatch) {
      svg = svg.replace(/<svg/, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
    }
  }

  svg = svg.replace(
    /preserveAspectRatio="[^"]*"/g,
    ''
  );

  svg = svg.replace(
    /<svg/,
    '<svg preserveAspectRatio="xMidYMid meet" width="100%" height="100%"'
  );

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

  if (!raw) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-slate-200 rounded-lg`}
      >
        <span className="text-slate-500 font-bold text-lg">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className} flex items-center justify-center overflow-hidden`}
      dangerouslySetInnerHTML={{ __html: processedSvg }}
    />
  );
}

export { normalizeSvg };
