import { useState, useRef, useEffect } from 'react';
import { Wind } from 'lucide-react';

interface WindCompassInputProps {
  windAngleDeg: number;
  windSpeedMs: number;
  onWindAngleChange: (angle: number) => void;
  onWindSpeedChange: (speed: number) => void;
  size?: number;
  snapToIntervals?: boolean;
  compact?: boolean;
}

export function getWindDirectionLabel(angle: number): string {
  const normalized = ((angle % 360) + 360) % 360;

  if (normalized < 22.5 || normalized >= 337.5) return 'bakfra';
  if (normalized >= 22.5 && normalized < 67.5) return 'bakfra høyre';
  if (normalized >= 67.5 && normalized < 112.5) return 'høyre';
  if (normalized >= 112.5 && normalized < 157.5) return 'forfra høyre';
  if (normalized >= 157.5 && normalized < 202.5) return 'forfra';
  if (normalized >= 202.5 && normalized < 247.5) return 'forfra venstre';
  if (normalized >= 247.5 && normalized < 292.5) return 'venstre';
  return 'bakfra venstre';
}

export function getCorrectionDirectionLabel(angle: number): string {
  const normalized = ((angle % 360) + 360) % 360;

  if (normalized < 22.5 || normalized >= 337.5) return '';
  if (normalized >= 22.5 && normalized < 67.5) return 'Vindkorreksjon: knepp venstre';
  if (normalized >= 67.5 && normalized < 112.5) return 'Vindkorreksjon: knepp venstre';
  if (normalized >= 112.5 && normalized < 157.5) return 'Vindkorreksjon: knepp venstre';
  if (normalized >= 157.5 && normalized < 202.5) return '';
  if (normalized >= 202.5 && normalized < 247.5) return 'Vindkorreksjon: knepp høyre';
  if (normalized >= 247.5 && normalized < 292.5) return 'Vindkorreksjon: knepp høyre';
  return 'Vindkorreksjon: knepp høyre';
}

function getSourceSideLabel(angle: number): string {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized < 22.5 || normalized >= 337.5) return 'BAKFRA';
  if (normalized >= 22.5 && normalized < 67.5) return 'BAK-H';
  if (normalized >= 67.5 && normalized < 112.5) return 'HØYRE';
  if (normalized >= 112.5 && normalized < 157.5) return 'FORAN-H';
  if (normalized >= 157.5 && normalized < 202.5) return 'FORFRA';
  if (normalized >= 202.5 && normalized < 247.5) return 'FORAN-V';
  if (normalized >= 247.5 && normalized < 292.5) return 'VENSTRE';
  return 'BAK-V';
}

export default function WindCompassInput({
  windAngleDeg,
  windSpeedMs,
  onWindAngleChange,
  onWindSpeedChange,
  size = 200,
  snapToIntervals = true,
  compact = false,
}: WindCompassInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const compassRef = useRef<SVGSVGElement>(null);

  const calculateAngleFromPoint = (clientX: number, clientY: number): number => {
    if (!compassRef.current) return windAngleDeg;

    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (-angle + 90 + 360) % 360;

    if (snapToIntervals) {
      angle = Math.round(angle / 45) * 45;
    }

    return angle;
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newAngle = calculateAngleFromPoint(e.clientX, e.clientY);
    onWindAngleChange(newAngle);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const newAngle = calculateAngleFromPoint(touch.clientX, touch.clientY);
    onWindAngleChange(newAngle);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, windAngleDeg]);

  const handleCompassClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const newAngle = calculateAngleFromPoint(e.clientX, e.clientY);
    onWindAngleChange(newAngle);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const newAngle = calculateAngleFromPoint(touch.clientX, touch.clientY);
    onWindAngleChange(newAngle);
  };

  const arrowRotation = (180 - windAngleDeg + 360) % 360;
  const center = size / 2;
  const radius = (size / 2) * 0.75;

  const arrowLength = radius * 0.72;
  const arrowTailLength = radius * 0.35;

  const arrowTipX = center + arrowLength * Math.sin((arrowRotation * Math.PI) / 180);
  const arrowTipY = center - arrowLength * Math.cos((arrowRotation * Math.PI) / 180);

  const arrowTailX = center - arrowTailLength * Math.sin((arrowRotation * Math.PI) / 180);
  const arrowTailY = center + arrowTailLength * Math.cos((arrowRotation * Math.PI) / 180);

  const sourceMarkerDist = radius + (compact ? 10 : 14);
  const sourceMarkerX = center + sourceMarkerDist * Math.sin((arrowRotation * Math.PI) / 180);
  const sourceMarkerY = center - sourceMarkerDist * Math.cos((arrowRotation * Math.PI) / 180);

  const headSize = compact ? 12 : 14;
  const midHeadSize = compact ? 8 : 10;
  const midFraction = 0.55;
  const midPointX = center + (arrowLength * midFraction) * Math.sin((arrowRotation * Math.PI) / 180);
  const midPointY = center - (arrowLength * midFraction) * Math.cos((arrowRotation * Math.PI) / 180);

  const labelFontSize = compact ? 10 : 12;

  const correctionLabel = getCorrectionDirectionLabel(windAngleDeg);
  const sourceLabel = getSourceSideLabel(windAngleDeg);

  const normalized = ((windAngleDeg % 360) + 360) % 360;
  const isRight = normalized > 22.5 && normalized < 157.5;
  const isLeft = normalized > 202.5 && normalized < 337.5;

  const labelPositions = {
    top: { x: center, y: center - radius + (compact ? 16 : 18), anchor: 'middle' as const },
    right: { x: center + radius - (compact ? 16 : 18), y: center + 5, anchor: 'middle' as const },
    bottom: { x: center, y: center + radius - (compact ? 8 : 10), anchor: 'middle' as const },
    left: { x: center - radius + (compact ? 16 : 18), y: center + 5, anchor: 'middle' as const },
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className="flex flex-col items-center">
        <svg
          ref={compassRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="cursor-pointer touch-none select-none"
          onClick={handleCompassClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ touchAction: 'none' }}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="fill-slate-100 stroke-slate-300"
            strokeWidth="2"
          />

          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isRight ? '#dc2626' : isLeft ? '#dc2626' : '#94a3b8'}
            strokeWidth="3"
            strokeDasharray={`${(radius * Math.PI) / 2} ${(radius * Math.PI * 3) / 2}`}
            strokeDashoffset={
              isRight ? -radius * Math.PI * 0.25 :
              isLeft ? -radius * Math.PI * 0.75 :
              0
            }
            opacity={isRight || isLeft ? 0.5 : 0}
          />

          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const angle = (deg * Math.PI) / 180;
            const isMain = deg % 90 === 0;
            const innerR = isMain ? radius - 12 : radius - 8;
            const outerR = radius - 3;
            const x1 = center + innerR * Math.sin(angle);
            const y1 = center - innerR * Math.cos(angle);
            const x2 = center + outerR * Math.sin(angle);
            const y2 = center - outerR * Math.cos(angle);

            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-slate-400"
                strokeWidth={isMain ? 2.5 : 1.5}
              />
            );
          })}

          <text x={labelPositions.top.x} y={labelPositions.top.y} textAnchor="middle" fontSize={labelFontSize} fontWeight="600" className="fill-slate-500">
            Forfra
          </text>
          <text x={labelPositions.right.x} y={labelPositions.right.y} textAnchor="middle" fontSize={labelFontSize}
            fontWeight={isRight ? '800' : '600'}
            className={isRight ? 'fill-red-500' : 'fill-slate-500'}
          >
            H
          </text>
          <text x={labelPositions.bottom.x} y={labelPositions.bottom.y} textAnchor="middle" fontSize={labelFontSize} fontWeight="600" className="fill-slate-500">
            Bakfra
          </text>
          <text x={labelPositions.left.x} y={labelPositions.left.y} textAnchor="middle" fontSize={labelFontSize}
            fontWeight={isLeft ? '800' : '600'}
            className={isLeft ? 'fill-red-500' : 'fill-slate-500'}
          >
            V
          </text>

          <g className={isDragging ? 'opacity-80' : ''}>
            <line
              x1={arrowTailX}
              y1={arrowTailY}
              x2={arrowTipX}
              y2={arrowTipY}
              stroke="#2563eb"
              strokeWidth={compact ? 3.5 : 4.5}
              strokeLinecap="round"
            />

            <polygon
              points={`
                ${arrowTipX},${arrowTipY}
                ${arrowTipX - headSize * Math.sin((arrowRotation + 150) * Math.PI / 180)},${arrowTipY + headSize * Math.cos((arrowRotation + 150) * Math.PI / 180)}
                ${arrowTipX - headSize * Math.sin((arrowRotation - 150) * Math.PI / 180)},${arrowTipY + headSize * Math.cos((arrowRotation - 150) * Math.PI / 180)}
              `}
              fill="#2563eb"
            />

            <polygon
              points={`
                ${midPointX},${midPointY}
                ${midPointX - midHeadSize * Math.sin((arrowRotation + 150) * Math.PI / 180)},${midPointY + midHeadSize * Math.cos((arrowRotation + 150) * Math.PI / 180)}
                ${midPointX - midHeadSize * Math.sin((arrowRotation - 150) * Math.PI / 180)},${midPointY + midHeadSize * Math.cos((arrowRotation - 150) * Math.PI / 180)}
              `}
              fill="#2563eb"
              opacity="0.7"
            />

            <circle cx={center} cy={center} r={compact ? 5 : 7} fill="#2563eb" />
          </g>

          <circle
            cx={sourceMarkerX}
            cy={sourceMarkerY}
            r={compact ? 3.5 : 4.5}
            fill="#dc2626"
          />

          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            className="cursor-grab active:cursor-grabbing"
          />
        </svg>

        <div className={`${compact ? 'mt-1.5' : 'mt-3'} text-center space-y-1`}>
          <div className="flex items-center justify-center gap-2">
            <Wind className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-slate-900">
              Vind fra {getWindDirectionLabel(windAngleDeg)}
            </span>
          </div>
          {correctionLabel && windSpeedMs > 0 && (
            <div className="text-sm font-medium text-emerald-700">
              {correctionLabel}
            </div>
          )}
          {windSpeedMs === 0 && (
            <div className="text-sm text-slate-400">
              Ingen vindkorreksjon (0 m/s)
            </div>
          )}
          <div className="text-xs text-slate-500">
            {windAngleDeg}&deg; &mdash; {sourceLabel}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span>Vindhastighet</span>
          <span className="text-lg font-semibold text-blue-600">{windSpeedMs} m/s</span>
        </label>
        <input
          type="range"
          min="0"
          max="15"
          step="0.5"
          value={windSpeedMs}
          onChange={(e) => onWindSpeedChange(parseFloat(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          style={{
            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(windSpeedMs / 15) * 100}%, var(--slider-track, #e5e7eb) ${(windSpeedMs / 15) * 100}%, var(--slider-track, #e5e7eb) 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>7.5</span>
          <span>15 m/s</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {[
          { label: 'Bakfra', angle: 0 },
          { label: 'Høyre', angle: 90 },
          { label: 'Forfra', angle: 180 },
          { label: 'Venstre', angle: 270 }
        ].map(({ label, angle }) => (
          <button
            key={angle}
            onClick={() => onWindAngleChange(angle)}
            className={`px-1.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              windAngleDeg === angle
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
