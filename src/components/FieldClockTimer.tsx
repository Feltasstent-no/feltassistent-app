import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import { useWakeLock } from '../lib/use-wake-lock';

type Phase = 'idle' | 'prep_normal' | 'prep_warning' | 'shooting_start' | 'shooting' | 'shooting_warning' | 'shooting_critical' | 'finished';

interface FieldClockTimerProps {
  prepSeconds?: number;
  shootSeconds: number;
  warningSeconds?: number;
  compact?: boolean;
  onFinished?: () => void;
}

function formatClockTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    setTimeout(() => osc.stop(), 500);
  } catch {}
}

function vibrate() {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
}

export function FieldClockTimer({
  prepSeconds = 15,
  shootSeconds,
  warningSeconds = 10,
  compact = false,
  onFinished,
}: FieldClockTimerProps) {
  const [, forceRender] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const timerState = useRef({
    timeRemaining: 0,
    phase: 'idle' as Phase,
    isRunning: false,
  });

  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const effectiveWarning = warningSeconds > 0 ? warningSeconds : 10;

  const tick = useCallback(() => {
    forceRender((n) => n + 1);
  }, []);

  useWakeLock(timerState.current.phase !== 'idle' && timerState.current.phase !== 'finished');

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      const s = timerState.current;

      if (s.timeRemaining <= 0) {
        playSound();
        vibrate();

        if (s.phase === 'prep_normal' || s.phase === 'prep_warning') {
          s.phase = 'shooting_start';
          s.timeRemaining = shootSeconds;
          playSound();
          vibrate();
          tick();
          return;
        }

        s.phase = 'finished';
        s.isRunning = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        playSound();
        vibrate();
        onFinishedRef.current?.();
        tick();
        return;
      }

      s.timeRemaining -= 1;
      const t = s.timeRemaining;

      if (s.phase === 'prep_normal' && t === 5) {
        s.phase = 'prep_warning';
      } else if (s.phase === 'shooting_start' && t === shootSeconds - 2) {
        s.phase = 'shooting';
      } else if (s.phase === 'shooting' && t <= effectiveWarning && t > 3) {
        s.phase = 'shooting_warning';
      } else if ((s.phase === 'shooting' || s.phase === 'shooting_warning') && t === 3) {
        s.phase = 'shooting_critical';
        vibrate();
      } else if (s.phase === 'shooting_critical') {
        if (t === 2 || t === 1) vibrate();
      }

      tick();
    }, 1000);
  }, [shootSeconds, effectiveWarning, tick]);

  const handleStart = () => {
    const s = timerState.current;
    if (s.phase === 'idle') {
      s.phase = 'prep_normal';
      s.timeRemaining = prepSeconds;
    }
    s.isRunning = true;
    tick();
    startInterval();
  };

  const handlePause = () => {
    timerState.current.isRunning = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    tick();
  };

  const handleReset = () => {
    timerState.current.isRunning = false;
    timerState.current.phase = 'idle';
    timerState.current.timeRemaining = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    tick();
  };

  const { phase, timeRemaining, isRunning } = timerState.current;

  const getPhaseColor = () => {
    switch (phase) {
      case 'prep_normal':
      case 'prep_warning':
        return 'bg-blue-600';
      case 'shooting_start':
      case 'shooting':
        return 'bg-emerald-600';
      case 'shooting_warning':
        return 'bg-amber-500';
      case 'shooting_critical':
      case 'finished':
        return 'bg-red-600';
      default:
        return 'bg-slate-700';
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'prep_normal':
      case 'prep_warning':
        return 'Forberedelse';
      case 'shooting_start':
        return 'ILD!';
      case 'shooting':
        return 'Skyting';
      case 'shooting_warning':
        return `Advarsel`;
      case 'shooting_critical':
        return 'Skyting';
      case 'finished':
        return 'Stans';
      default:
        return 'Klar';
    }
  };

  const getPhaseSubtext = () => {
    if (phase === 'prep_normal' && timeRemaining > 5) return 'Gjør klar...';
    if (phase === 'prep_warning') return 'Klar!';
    return null;
  };

  if (phase === 'idle') {
    return (
      <div className="rounded-xl overflow-hidden">
        <div className="bg-slate-700 rounded-xl p-4 text-center">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2">Feltklokke</p>
          <p className="text-3xl font-bold text-white tabular-nums">{formatClockTime(shootSeconds)}</p>
          <p className="text-slate-400 text-xs mt-1">
            {prepSeconds}s forberedelse
          </p>
          <button
            onClick={handleStart}
            className="mt-3 bg-white hover:bg-white/90 text-slate-900 font-semibold px-6 py-2.5 rounded-full transition flex items-center gap-2 mx-auto shadow-lg active:scale-95"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>
        </div>
      </div>
    );
  }

  const padSize = compact ? 'p-4 sm:p-6' : 'p-6 sm:p-8';
  const timerSize = compact ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-7xl';
  const phaseSize = compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl';

  return (
    <div className={`rounded-xl ${padSize} text-center transition-colors duration-500 ${getPhaseColor()}`}>
      <div className="mb-2">
        <p className={`text-white ${phaseSize} font-bold`}>
          {getPhaseText()}
        </p>
        {getPhaseSubtext() && (
          <p className="text-white/80 text-sm mt-0.5">{getPhaseSubtext()}</p>
        )}
        {phase === 'shooting_warning' && (
          <div className="flex items-center justify-center mt-1.5 gap-1.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-xs">Tid snart ute</span>
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className={`text-white ${timerSize} font-bold tracking-tight tabular-nums`}>
          {formatClockTime(timeRemaining)}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {!isRunning && phase !== 'finished' && (
          <button
            onClick={handleStart}
            className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-5 py-2.5 rounded-full transition flex items-center gap-2 shadow-xl active:scale-95"
          >
            <Play className="w-4 h-4" />
            <span>Fortsett</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={handlePause}
            className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-5 py-2.5 rounded-full transition flex items-center gap-2 shadow-xl active:scale-95"
          >
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
        )}

        {phase === 'finished' && (
          <button
            onClick={handleReset}
            className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-5 py-2.5 rounded-full transition shadow-xl active:scale-95"
          >
            Start på nytt
          </button>
        )}

        {phase !== 'idle' && phase !== 'finished' && (
          <button
            onClick={handleReset}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-full transition flex items-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nullstill</span>
          </button>
        )}
      </div>
    </div>
  );
}
