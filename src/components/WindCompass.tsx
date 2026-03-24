interface WindCompassProps {
  windAngleDeg: number;
  windSpeedMs: number;
  size?: number;
}

export default function WindCompass({ windAngleDeg, windSpeedMs, size = 120 }: WindCompassProps) {
  const radius = size / 2;
  const center = radius;
  const arrowLength = radius * 0.7;
  const arrowWidth = 8;

  const windAngleRad = (windAngleDeg * Math.PI) / 180;

  const windArrowX = center + Math.sin(windAngleRad) * arrowLength;
  const windArrowY = center - Math.cos(windAngleRad) * arrowLength;

  const createArrowPath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = 12;

    const arrowTip1X = toX - headLength * Math.cos(angle - Math.PI / 6);
    const arrowTip1Y = toY - headLength * Math.sin(angle - Math.PI / 6);
    const arrowTip2X = toX - headLength * Math.cos(angle + Math.PI / 6);
    const arrowTip2Y = toY - headLength * Math.sin(angle + Math.PI / 6);

    return `
      M ${fromX} ${fromY}
      L ${toX} ${toY}
      M ${arrowTip1X} ${arrowTip1Y}
      L ${toX} ${toY}
      L ${arrowTip2X} ${arrowTip2Y}
    `;
  };

  const getWindDirection = (angle: number): string => {
    const normalized = ((angle % 360) + 360) % 360;
    if (normalized < 22.5 || normalized >= 337.5) return 'bakfra';
    if (normalized < 67.5) return 'bakfra høyre';
    if (normalized < 112.5) return 'høyre';
    if (normalized < 157.5) return 'forfra høyre';
    if (normalized < 202.5) return 'forfra';
    if (normalized < 247.5) return 'forfra venstre';
    if (normalized < 292.5) return 'venstre';
    return 'bakfra venstre';
  };

  const effectiveCrosswind = Math.abs(Math.sin(windAngleRad)) * windSpeedMs;
  const hasSignificantCrosswind = effectiveCrosswind > 0.5;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="drop-shadow-sm">
        <circle
          cx={center}
          cy={center}
          r={radius - 2}
          style={{ fill: 'var(--bg-card)', stroke: 'var(--border-default)' }}
          strokeWidth="2"
        />

        <circle
          cx={center}
          cy={center}
          r={radius * 0.15}
          style={{ fill: 'var(--bg-muted)', stroke: 'var(--border-strong)' }}
          strokeWidth="1"
        />

        <line x1={center} y1={2} x2={center} y2={12} style={{ stroke: 'var(--text-muted)' }} strokeWidth="2" />
        <line x1={center} y1={size - 12} x2={center} y2={size - 2} style={{ stroke: 'var(--text-muted)' }} strokeWidth="1" />
        <line x1={2} y1={center} x2={12} y2={center} style={{ stroke: 'var(--text-muted)' }} strokeWidth="1" />
        <line x1={size - 12} y1={center} x2={size - 2} y2={center} style={{ stroke: 'var(--text-muted)' }} strokeWidth="1" />

        <path
          d={createArrowPath(windArrowX, windArrowY, center, center)}
          stroke="#3b82f6"
          strokeWidth={arrowWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.8"
        />
      </svg>

      <div className="text-center space-y-1">
        <div className="text-sm font-medium text-slate-900">
          Vind fra {getWindDirection(windAngleDeg)}
        </div>
        <div className="text-xs text-slate-500">
          {windSpeedMs.toFixed(1)} m/s
          {hasSignificantCrosswind && (
            <> • Kryssvind: {effectiveCrosswind.toFixed(1)} m/s</>
          )}
        </div>
      </div>
    </div>
  );
}
