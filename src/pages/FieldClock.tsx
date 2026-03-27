import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { FieldClockPreset } from '../types/database';
import { Play, Pause, RotateCcw, X } from 'lucide-react';

export function FieldClock() {
  const [presets, setPresets] = useState<FieldClockPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FieldClockPreset | null>(null);
  const [customTime, setCustomTime] = useState('');
  const [customTimeSeconds, setCustomTimeSeconds] = useState<number | null>(null);
  const [timeError, setTimeError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'prep_normal' | 'prep_warning' | 'shooting_start' | 'shooting' | 'shooting_warning' | 'shooting_critical' | 'finished'>('idle');
  const intervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    fetchPresets();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      releaseWakeLock();
    };
  }, []);

  const getWarningThreshold = useCallback(() => {
    if (selectedPreset && selectedPreset.warning_seconds > 0) {
      return selectedPreset.warning_seconds;
    }
    return 10;
  }, [selectedPreset]);

  const getPrepSeconds = useCallback(() => {
    if (selectedPreset) return selectedPreset.prep_seconds;
    return 15;
  }, [selectedPreset]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            handlePhaseComplete();
            return 0;
          }

          const newTime = prev - 1;
          const warningThreshold = getWarningThreshold();

          if (phase === 'prep_normal' && newTime === 5) {
            setPhase('prep_warning');
          } else if (phase === 'shooting_start' && newTime === (customTimeSeconds || selectedPreset?.shoot_seconds || 0) - 2) {
            setPhase('shooting');
          } else if (phase === 'shooting' && newTime === warningThreshold) {
            setPhase('shooting_warning');
          } else if (phase === 'shooting_warning' && newTime === 3) {
            setPhase('shooting_critical');
            vibrate();
          } else if (phase === 'shooting_critical') {
            if (newTime === 2 || newTime === 1) {
              vibrate();
            }
          }

          return newTime;
        });
      }, 1000);

      requestWakeLock();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, customTimeSeconds, selectedPreset, getWarningThreshold]);

  const fetchPresets = async () => {
    const { data } = await supabase
      .from('field_clock_presets')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setPresets(data);
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.log('Wake Lock release error:', err);
      }
    }
  };

  const parseCustomTime = (input: string): number | null => {
    setTimeError('');
    const cleaned = input.trim().toLowerCase();

    if (!cleaned) return null;

    const minPattern = /(\d+)\s*(min|minutter?)/;
    const secPattern = /(\d+)\s*(s|sek|sekunder?)?$/;

    const minMatch = cleaned.match(minPattern);
    if (minMatch) {
      return parseInt(minMatch[1]) * 60;
    }

    const secMatch = cleaned.match(secPattern);
    if (secMatch) {
      return parseInt(secMatch[1]);
    }

    if (/^\d+$/.test(cleaned)) {
      return parseInt(cleaned);
    }

    setTimeError('Ugyldig tidsformat. Skriv for eksempel 75 sek eller 2 min.');
    return null;
  };

  const handleCustomTimeChange = (value: string) => {
    setCustomTime(value);
    const seconds = parseCustomTime(value);
    setCustomTimeSeconds(seconds);
  };

  const handleUseCustomTime = () => {
    if (customTimeSeconds && customTimeSeconds > 0) {
      setSelectedPreset({
        id: 'custom',
        name: 'Manuell tid',
        discipline_code: null,
        class_code: null,
        prep_seconds: 15,
        shoot_seconds: customTimeSeconds,
        warning_seconds: 0,
        cooldown_seconds: 0,
        rule_reference: null,
        rule_version: null,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      setCustomTime('');
      setCustomTimeSeconds(null);
    }
  };

  const handlePhaseComplete = () => {
    playSound();
    vibrate();

    if (!selectedPreset && !customTimeSeconds) return;

    const shootTime = customTimeSeconds || selectedPreset?.shoot_seconds || 0;

    switch (phase) {
      case 'prep_normal':
      case 'prep_warning':
        setPhase('shooting_start');
        setTimeRemaining(shootTime);
        playSound();
        vibrate();
        break;
      case 'shooting_start':
      case 'shooting':
      case 'shooting_warning':
      case 'shooting_critical':
        setPhase('finished');
        setIsRunning(false);
        playSound();
        vibrate();
        break;
      default:
        setIsRunning(false);
    }
  };

  const playSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    setTimeout(() => oscillator.stop(), 500);
  };

  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const handleStart = () => {
    if (!selectedPreset && !customTimeSeconds) return;

    if (phase === 'idle') {
      const prepTime = getPrepSeconds();
      setPhase('prep_normal');
      setTimeRemaining(prepTime);
    }

    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhase('idle');
    setTimeRemaining(0);
  };

  const handlePresetSelect = (preset: FieldClockPreset) => {
    setSelectedPreset(preset);
    handleReset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (seconds: number) => {
    if (seconds <= 75) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) {
      return `${mins} min`;
    }
    return `${mins} min ${secs} sek`;
  };

  const getTimerColorClasses = () => {
    if (phase === 'shooting_critical') return 'text-white';
    if (phase === 'prep_warning') return 'text-red-600';
    if (phase === 'shooting_warning') return 'text-red-600';
    return 'text-white';
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'prep_normal':
      case 'prep_warning':
        return 'bg-blue-600';
      case 'shooting_start':
      case 'shooting':
      case 'shooting_warning':
        return 'bg-emerald-600';
      case 'shooting_critical':
      case 'finished':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
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
      case 'shooting_warning':
      case 'shooting_critical':
        return 'Skyting';
      case 'finished':
        return 'Stans';
      default:
        return 'Klar';
    }
  };

  const getPhaseSubtext = () => {
    if (phase === 'prep_normal' && timeRemaining > 10) {
      return 'Klar om 10 sekund fra nå';
    }
    if (phase === 'prep_normal' && timeRemaining <= 10 && timeRemaining > 5) {
      return `Klar om ${timeRemaining} sekund${timeRemaining !== 1 ? 'er' : ''} fra nå`;
    }
    if (phase === 'prep_warning') {
      return 'Klar';
    }
    return null;
  };

  const timerClasses = getTimerColorClasses();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Feltklokke</h1>
          <p className="text-slate-600 mt-1">Velg en preset eller skriv inn tid manuelt</p>
        </div>

        {!selectedPreset ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Manuell tid</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => handleCustomTimeChange(e.target.value)}
                    placeholder="F.eks: 75 sek, 2 min eller 120"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-lg"
                  />
                  {timeError && (
                    <p className="text-sm text-red-600 mt-2">{timeError}</p>
                  )}
                  {customTimeSeconds && !timeError && (
                    <p className="text-sm text-emerald-600 mt-2">
                      Skytetid: {formatDisplayTime(customTimeSeconds)} (Forberedelse: 15 sek)
                    </p>
                  )}
                </div>
                <button
                  onClick={handleUseCustomTime}
                  disabled={!customTimeSeconds || customTimeSeconds <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bruk
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Legg inn manuell tid for alle typer serier
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Faste tidsvalg</h2>
              <div className="space-y-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 text-left transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{preset.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                          {preset.prep_seconds > 0 && (
                            <span>Forb: {formatDisplayTime(preset.prep_seconds)}</span>
                          )}
                          <span>Skyting: {formatDisplayTime(preset.shoot_seconds)}</span>
                          {preset.warning_seconds > 0 && (
                            <span>Adv: {formatDisplayTime(preset.warning_seconds)}</span>
                          )}
                        </div>
                        {preset.rule_reference && (
                          <p className="text-xs text-slate-500 mt-2">{preset.rule_reference}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 break-words">{selectedPreset.name}</h2>
                  {selectedPreset.rule_reference && (
                    <p className="text-sm text-slate-600 mt-1">{selectedPreset.rule_reference}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleReset();
                    setSelectedPreset(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-blue-600 font-medium mb-1">Forberedelse</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">{formatDisplayTime(getPrepSeconds())}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Skyting</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-900">{formatDisplayTime(selectedPreset.shoot_seconds)}</p>
                </div>
                {selectedPreset.warning_seconds > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-amber-600 font-medium mb-1">Advarsel</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900">{formatDisplayTime(selectedPreset.warning_seconds)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-xl p-4 sm:p-8 md:p-12 text-center transition-colors duration-300 ${getPhaseColor()}`}>
              <div className="mb-6 sm:mb-8">
                <p className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3">{getPhaseText()}</p>
                {getPhaseSubtext() && (
                  <p className="text-white/80 text-lg sm:text-xl md:text-2xl">{getPhaseSubtext()}</p>
                )}
              </div>

              <div className="mb-8 sm:mb-10">
                <p className={`${timerClasses} text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight transition-colors duration-300`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {!isRunning && phase !== 'finished' && (
                  <button
                    onClick={handleStart}
                    className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full transition flex items-center space-x-2 shadow-xl active:scale-95"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    <span className="text-sm sm:text-base">Start</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={handlePause}
                    className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full transition flex items-center space-x-2 shadow-xl active:scale-95"
                  >
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    <span className="text-sm sm:text-base">Pause</span>
                  </button>
                )}

                {phase === 'finished' && (
                  <button
                    onClick={handleReset}
                    className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-full transition shadow-xl active:scale-95 text-base"
                  >
                    Start på nytt
                  </button>
                )}

                {phase !== 'finished' && (
                  <button
                    onClick={handleReset}
                    className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full transition flex items-center space-x-2 active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    <span className="text-sm sm:text-base">Nullstill</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
