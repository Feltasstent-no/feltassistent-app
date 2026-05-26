import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, RotateCcw } from 'lucide-react';

interface PrepCountdownProps {
  seconds?: number;
  label?: string;
  resetKey?: string | number;
  variant?: 'dark' | 'light';
}

export function PrepCountdown({ seconds = 120, label = 'Klargjør', resetKey, variant = 'dark' }: PrepCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [resetKey, seconds]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (finished) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [finished]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
  }, [seconds]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isDark = variant === 'dark';

  if (finished) {
    return (
      <button
        onClick={reset}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
          isDark
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            : 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200'
        }`}
        title="Klar - trykk for reset"
      >
        <span>Klar</span>
        <RotateCcw className="w-3 h-3" />
      </button>
    );
  }

  if (running) {
    return (
      <button
        onClick={reset}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums transition ${
          isDark
            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
        }`}
        title="Trykk for å resette"
      >
        <Clock className="w-3 h-3" />
        <span>{formatTime(remaining)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={start}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
        isDark
          ? 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20 hover:text-white'
          : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 hover:text-slate-800'
      }`}
      title="Start klargjøringstid"
    >
      <Clock className="w-3 h-3" />
      <span>{label} {formatTime(remaining)}</span>
    </button>
  );
}
