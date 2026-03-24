import WindCompassInput from './WindCompassInput';

interface WindInputProps {
  windSpeed: number;
  windAngleDeg: number;
  onWindSpeedChange: (speed: number) => void;
  onWindAngleChange: (angleDeg: number) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}

export function WindInput({
  windSpeed,
  windAngleDeg,
  onWindSpeedChange,
  onWindAngleChange,
  disabled = false,
  compact = false,
  label = 'Vindforhold'
}: WindInputProps) {
  return (
    <div className="space-y-4">
      {!compact && (
        <label className="block text-sm font-medium text-slate-700 mb-4">
          {label}
        </label>
      )}

      <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
        <WindCompassInput
          windAngleDeg={windAngleDeg}
          windSpeedMs={windSpeed}
          onWindAngleChange={onWindAngleChange}
          onWindSpeedChange={onWindSpeedChange}
          size={compact ? 160 : 200}
          snapToIntervals={true}
          compact={compact}
        />
      </div>

      {windSpeed === 0 && !compact && (
        <p className="text-xs text-slate-500 text-center">
          Sett vindhastighet og dra i kompasset for å angi vindretning
        </p>
      )}
    </div>
  );
}
