import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

interface TrainingSeriesTimerProps {
  shootingTimeSeconds: number;
}

export function TrainingSeriesTimer({ shootingTimeSeconds }: TrainingSeriesTimerProps) {
  const [timeLeft, setTimeLeft] = useState(shootingTimeSeconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const startRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);

  useEffect(() => {
    if (!running) return;

    startRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = elapsedBeforePauseRef.current + (now - (startRef.current ?? now));
      const remaining = Math.max(0, shootingTimeSeconds - Math.floor(elapsed / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setRunning(false);
        setFinished(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [running, shootingTimeSeconds]);

  const handleStart = useCallback(() => {
    setRunning(true);
    setFinished(false);
    setHasStarted(true);
  }, []);

  const handlePause = useCallback(() => {
    if (startRef.current) {
      elapsedBeforePauseRef.current += Date.now() - startRef.current;
      startRef.current = null;
    }
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setHasStarted(false);
    setTimeLeft(shootingTimeSeconds);
    startRef.current = null;
    elapsedBeforePauseRef.current = 0;
  }, [shootingTimeSeconds]);

  const formatTime = (s: number) => {
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec.toString().padStart(2, '0')}`;
    }
    return `${s}`;
  };

  const isLow = timeLeft <= 5 && timeLeft > 0;
  const progress = ((shootingTimeSeconds - timeLeft) / shootingTimeSeconds) * 100;

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      finished ? 'bg-red-50 border-red-200' : running ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24" cy="24" r="20"
              fill="none" stroke="currentColor" strokeWidth="3"
              className="text-slate-200"
            />
            <circle
              cx="24" cy="24" r="20"
              fill="none" strokeWidth="3"
              className={finished ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-blue-500'}
              strokeDasharray={`${progress * 1.257} ${125.7 - (progress * 1.257)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.2s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock className={`w-4 h-4 ${finished ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-blue-500'}`} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-2xl font-bold tabular-nums ${
            finished ? 'text-red-600' : isLow ? 'text-amber-600' : running ? 'text-blue-700' : 'text-slate-800'
          }`}>
            {finished ? 'TID UTE' : formatTime(timeLeft)}
          </p>
          {!finished && (
            <p className="text-xs text-slate-500">
              {running ? 'Skytetid' : `${shootingTimeSeconds} sek skytetid`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!running && !finished && (
            <button
              onClick={handleStart}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition active:scale-95"
            >
              <Play className="w-4 h-4 ml-0.5" />
            </button>
          )}
          {running && (
            <button
              onClick={handlePause}
              className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition active:scale-95"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {(hasStarted && !running) && (
            <button
              onClick={handleReset}
              className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
