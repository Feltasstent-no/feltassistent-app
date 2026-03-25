import { useEffect, useState, useRef } from 'react';
import { Clock, Target, Pause, Play } from 'lucide-react';
import { FieldFigure, CompetitionStage } from '../../types/database';

interface FieldClockDisplayProps {
  stage: CompetitionStage;
  figure: FieldFigure | null;
  holdStartedAt: string | null;
  onTimeUp: () => void;
}

export function FieldClockDisplay({ stage, figure, holdStartedAt, onTimeUp }: FieldClockDisplayProps) {
  const timeLimit = stage?.time_limit_seconds ?? 15;
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hasCalledTimeUp, setHasCalledTimeUp] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);

  useEffect(() => {
    const safeTimeLimit = stage?.time_limit_seconds ?? 15;

    if (!holdStartedAt) {
      setTimeLeft(safeTimeLimit);
      return;
    }

    if (isPaused) return;

    const updateTimer = () => {
      try {
        const startTime = new Date(holdStartedAt).getTime();

        if (isNaN(startTime)) {
          setTimeLeft(safeTimeLimit);
          return;
        }

        const now = Date.now();
        const effectiveElapsed = now - startTime - totalPausedMsRef.current;
        const elapsedSeconds = Math.floor(effectiveElapsed / 1000);
        const remaining = Math.max(0, safeTimeLimit - elapsedSeconds);

        setTimeLeft(remaining);

        if (remaining === 0 && !hasCalledTimeUp) {
          setHasCalledTimeUp(true);
          onTimeUp();
        }
      } catch (error) {
        setTimeLeft(safeTimeLimit);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 100);

    return () => clearInterval(timer);
  }, [holdStartedAt, stage?.time_limit_seconds, onTimeUp, hasCalledTimeUp, isPaused]);

  const handlePause = () => {
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (pausedAtRef.current) {
      totalPausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setIsPaused(false);
  };

  const safeTimeLimit = stage?.time_limit_seconds ?? 15;
  const progress = ((safeTimeLimit - timeLeft) / safeTimeLimit) * 100;

  const isLowTime = timeLeft <= 5;
  const isVeryLowTime = timeLeft <= 3;
  const isTimedOut = timeLeft === 0;

  const formatCountdown = (seconds: number) => {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${seconds}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
            <span className="text-lg font-bold">{stage.stage_number}</span>
          </div>

          {figure && (
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-white/5 rounded-lg p-1 flex items-center justify-center">
                {figure.image_url ? (
                  <img
                    src={figure.image_url}
                    alt={figure.name}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: '44px' }}
                  />
                ) : figure.svg_data ? (
                  <div
                    className="max-w-full max-h-full"
                    dangerouslySetInnerHTML={{ __html: figure.svg_data }}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '44px'
                    }}
                  />
                ) : (
                  <Target className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <span className="text-base font-semibold text-gray-300">{figure.code}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div
            className={`relative flex items-center justify-center w-64 h-64 rounded-full transition-all duration-300 ${
              isTimedOut
                ? 'bg-red-900/40'
                : isPaused
                ? 'bg-yellow-900/40'
                : isVeryLowTime
                ? 'bg-red-900/40 animate-pulse'
                : isLowTime
                ? 'bg-yellow-900/40'
                : 'bg-blue-900/40'
            }`}
          >
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className={`${
                  isTimedOut
                    ? 'text-red-600'
                    : isPaused
                    ? 'text-yellow-500'
                    : isVeryLowTime
                    ? 'text-red-600'
                    : isLowTime
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }`}
                strokeDasharray={`${progress * 7.54} ${754 - (progress * 7.54)}`}
                style={{ transition: 'stroke-dasharray 0.3s linear' }}
              />
            </svg>

            <div className="flex flex-col items-center z-10">
              {!isTimedOut && (
                <Clock
                  className={`w-10 h-10 mb-1 ${
                    isPaused
                      ? 'text-yellow-400'
                      : isVeryLowTime
                      ? 'text-red-400'
                      : isLowTime
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                  }`}
                />
              )}
              <span
                className={`text-8xl font-bold tabular-nums ${
                  isTimedOut
                    ? 'text-red-400'
                    : isPaused
                    ? 'text-yellow-300'
                    : isVeryLowTime
                    ? 'text-red-400'
                    : isLowTime
                    ? 'text-yellow-400'
                    : 'text-white'
                }`}
              >
                {formatCountdown(timeLeft)}
              </span>
              {!isTimedOut && (
                <span className="text-lg text-gray-400 mt-0.5">
                  {isPaused ? 'PAUSET' : `av ${safeTimeLimit} sek`}
                </span>
              )}
            </div>
          </div>

          {isTimedOut && (
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400 animate-pulse">
                TID UTE
              </p>
            </div>
          )}

          {isPaused && !isTimedOut && (
            <div className="text-center">
              <p className="text-lg font-semibold text-yellow-400">
                Klokken er pauset
              </p>
            </div>
          )}
        </div>

        {!isTimedOut && holdStartedAt && (
          <div className="flex justify-center pt-2">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full transition active:scale-95 shadow-lg"
              >
                <Play className="w-5 h-5" />
                <span>Gjenoppta</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-6 py-3 rounded-full transition active:scale-95 shadow-lg"
              >
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </button>
            )}
          </div>
        )}

        {stage.distance_m && (
          <div className="text-center bg-gray-800 rounded-lg py-2 px-4">
            <p className="text-gray-400 text-xs">Avstand</p>
            <p className="text-2xl font-bold">{stage.distance_m}m</p>
          </div>
        )}
      </div>
    </div>
  );
}
