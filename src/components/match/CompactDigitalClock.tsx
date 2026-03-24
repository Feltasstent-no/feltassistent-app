import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CompactDigitalClockProps {
  prepTime: number;
  shootTime: number;
  onComplete: () => void;
  isPaused?: boolean;
  initialElapsedTime?: number;
}

export function CompactDigitalClock({
  prepTime,
  shootTime,
  onComplete,
  isPaused = false,
  initialElapsedTime = 0
}: CompactDigitalClockProps) {
  const [phase, setPhase] = useState<'prep' | 'shoot' | 'done'>('prep');
  const [timeLeft, setTimeLeft] = useState(prepTime);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  useEffect(() => {
    const safePrepTime = prepTime ?? 15;
    const safeShootTime = shootTime ?? 60;

    if (initialElapsedTime > 0) {
      if (initialElapsedTime < safePrepTime) {
        setPhase('prep');
        setTimeLeft(safePrepTime - initialElapsedTime);
      } else if (initialElapsedTime < safePrepTime + safeShootTime) {
        setPhase('shoot');
        setTimeLeft(safePrepTime + safeShootTime - initialElapsedTime);
      } else {
        setPhase('done');
        setTimeLeft(0);
      }
    } else {
      setTimeLeft(safePrepTime);
      setPhase('prep');
    }

    setHasCalledComplete(false);
  }, [prepTime, shootTime, initialElapsedTime]);

  // Separate effect to handle completion callback when phase becomes 'done'
  useEffect(() => {
    if (phase === 'done' && !hasCalledComplete) {
      setHasCalledComplete(true);
      onComplete();
    }
  }, [phase, hasCalledComplete, onComplete]);

  useEffect(() => {
    if (phase === 'done' || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;

        if (newTime <= 0) {
          if (phase === 'prep') {
            setPhase('shoot');
            return shootTime ?? 60;
          } else {
            setPhase('done');
            return 0;
          }
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, shootTime, isPaused]);

  const formatTime = (seconds: number) => {
    const safeSeconds = !isNaN(seconds) && isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  const phaseConfig = {
    prep: {
      label: 'Forberedelse',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-600'
    },
    shoot: {
      label: 'Skytetid',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-600'
    },
    done: {
      label: 'Tid ute',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-600'
    }
  };

  const config = phaseConfig[phase];

  return (
    <div className={`rounded-xl border-4 ${config.borderColor} ${config.bgColor} p-4 transition-all ${
      isCritical ? 'animate-pulse' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm font-bold ${config.textColor}`}>
          {config.label}
        </div>
        <Clock className={`w-5 h-5 ${config.textColor}`} />
      </div>

      <div className={`text-6xl font-bold text-center ${
        isCritical ? 'text-red-600' :
        isLowTime ? 'text-yellow-600' :
        config.textColor
      }`}>
        {formatTime(timeLeft)}
      </div>

      {phase !== 'done' && (
        <div className="mt-2 text-xs text-center text-slate-600">
          {phase === 'prep' ? `Skyting starter om ${formatTime(timeLeft)}` : `${formatTime(timeLeft)} igjen`}
        </div>
      )}
    </div>
  );
}
