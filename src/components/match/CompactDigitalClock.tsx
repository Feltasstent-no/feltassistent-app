import { useEffect, useState, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface CompactDigitalClockProps {
  prepTime: number;
  shootTime: number;
  onComplete: () => void;
  isPaused?: boolean;
  initialElapsedTime?: number;
}

type ClockPhase = 'prep' | 'shoot' | 'done';

const ILD_DURATION_MS = 3000;

interface ClockState {
  phase: ClockPhase;
  timeLeft: number;
  shootElapsedMs: number;
}

function deriveState(
  startedAt: number,
  prepTime: number,
  shootTime: number,
  now: number
): ClockState {
  const elapsed = Math.max(0, now - startedAt);
  const elapsedSec = elapsed / 1000;

  if (elapsedSec < prepTime) {
    return {
      phase: 'prep',
      timeLeft: Math.ceil(prepTime - elapsedSec),
      shootElapsedMs: 0,
    };
  }

  const shootElapsed = elapsedSec - prepTime;
  if (shootElapsed < shootTime) {
    return {
      phase: 'shoot',
      timeLeft: Math.ceil(shootTime - shootElapsed),
      shootElapsedMs: (elapsed - prepTime * 1000),
    };
  }

  return { phase: 'done', timeLeft: 0, shootElapsedMs: shootTime * 1000 };
}

function getSubtitle(state: ClockState): { text: string; emphasis: boolean } | null {
  if (state.phase === 'prep') {
    if (state.timeLeft <= 0) return { text: 'ILD', emphasis: true };
    if (state.timeLeft <= 5) return { text: 'KLAR', emphasis: true };
    return { text: `Klar om ${state.timeLeft} sekunder`, emphasis: false };
  }

  if (state.phase === 'shoot') {
    if (state.shootElapsedMs < ILD_DURATION_MS) {
      return { text: 'ILD', emphasis: true };
    }
    return { text: 'Tid igjen av holdet', emphasis: false };
  }

  return null;
}

export function CompactDigitalClock({
  prepTime,
  shootTime,
  onComplete,
  isPaused = false,
  initialElapsedTime = 0,
}: CompactDigitalClockProps) {
  const safePrepTime = prepTime ?? 15;
  const safeShootTime = shootTime ?? 60;

  const startedAtRef = useRef<number>(
    Date.now() - initialElapsedTime * 1000
  );
  const hasCalledComplete = useRef(false);

  const computeState = useCallback(
    () => deriveState(startedAtRef.current, safePrepTime, safeShootTime, Date.now()),
    [safePrepTime, safeShootTime]
  );

  const [state, setState] = useState<ClockState>(computeState);

  useEffect(() => {
    startedAtRef.current = Date.now() - initialElapsedTime * 1000;
    hasCalledComplete.current = false;
    setState(deriveState(startedAtRef.current, safePrepTime, safeShootTime, Date.now()));
  }, [safePrepTime, safeShootTime, initialElapsedTime]);

  useEffect(() => {
    if (state.phase === 'done' && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onComplete();
    }
  }, [state.phase, onComplete]);

  useEffect(() => {
    if (isPaused || state.phase === 'done') return;

    const tick = () => setState(computeState());

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isPaused, state.phase, computeState]);

  const formatTime = (seconds: number) => {
    const safe = !isNaN(seconds) && isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = state.timeLeft <= 10;
  const isCritical = state.timeLeft <= 5;

  const phaseConfig = {
    prep: {
      label: 'Forberedelse',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-600',
    },
    shoot: {
      label: 'Skytetid',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-600',
    },
    done: {
      label: 'Tid ute',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-600',
    },
  };

  const config = phaseConfig[state.phase];
  const subtitle = getSubtitle(state);

  return (
    <div
      className={`rounded-xl border-4 ${config.borderColor} ${config.bgColor} p-4 transition-all ${
        isCritical && state.phase !== 'done' ? 'animate-pulse' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className={`text-sm font-bold ${config.textColor}`}>{config.label}</div>
          <div className="text-[10px] text-slate-500 leading-tight">
            Skytetid: {safeShootTime} sek
          </div>
        </div>
        <Clock className={`w-5 h-5 ${config.textColor}`} />
      </div>

      <div
        className={`text-6xl font-bold text-center tabular-nums ${
          isCritical && state.phase !== 'done'
            ? 'text-red-600'
            : isLowTime
              ? 'text-yellow-600'
              : config.textColor
        }`}
      >
        {formatTime(state.timeLeft)}
      </div>

      {subtitle && (
        <div
          className={`mt-2 text-center ${
            subtitle.emphasis
              ? 'text-lg font-black tracking-wide ' +
                (subtitle.text === 'ILD' ? 'text-red-700' : 'text-blue-700')
              : 'text-xs text-slate-600'
          }`}
        >
          {subtitle.text}
        </div>
      )}
    </div>
  );
}
