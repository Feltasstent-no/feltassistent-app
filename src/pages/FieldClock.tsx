import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { FieldClockPreset } from '../types/database';
import { useWakeLock } from '../lib/use-wake-lock';
import { Play, Pause, RotateCcw, X, ChevronDown, ChevronUp, AlertTriangle, Clock, Timer, BookOpen } from 'lucide-react';

function formatDisplayTime(seconds: number) {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}

function formatClockTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface ManualSettings {
  prep_seconds: number;
  shoot_seconds: number;
  warning_seconds: number;
  rule_reference: string;
}

function ManualTimeSection({
  onSelect,
}: {
  onSelect: (settings: ManualSettings) => void;
}) {
  const [shootInput, setShootInput] = useState('');
  const [shootSeconds, setShootSeconds] = useState<number | null>(null);
  const [inputError, setInputError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prepSeconds, setPrepSeconds] = useState(15);
  const [warningSeconds, setWarningSeconds] = useState(0);
  const [ruleRef, setRuleRef] = useState('');

  const parseTime = (input: string): number | null => {
    setInputError('');
    const cleaned = input.trim().toLowerCase();
    if (!cleaned) return null;

    const minMatch = cleaned.match(/(\d+)\s*(min|minutter?)/);
    if (minMatch) return parseInt(minMatch[1]) * 60;

    const secMatch = cleaned.match(/(\d+)\s*(s|sek|sekunder?)?$/);
    if (secMatch) return parseInt(secMatch[1]);

    if (/^\d+$/.test(cleaned)) return parseInt(cleaned);

    setInputError('Ugyldig format. Prøv f.eks. 75, 75 sek, eller 2 min.');
    return null;
  };

  const handleInputChange = (value: string) => {
    setShootInput(value);
    setShootSeconds(parseTime(value));
  };

  const handleUse = () => {
    if (!shootSeconds || shootSeconds <= 0) return;
    onSelect({
      prep_seconds: prepSeconds,
      shoot_seconds: shootSeconds,
      warning_seconds: warningSeconds,
      rule_reference: ruleRef,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Manuell tid</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={shootInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUse()}
            placeholder="Skytetid: f.eks. 75 sek, 2 min"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-lg"
          />
          {inputError && <p className="text-sm text-red-600 mt-2">{inputError}</p>}
          {shootSeconds && !inputError && (
            <p className="text-sm text-emerald-600 mt-2">
              Skytetid: {formatDisplayTime(shootSeconds)}
              {prepSeconds > 0 && ` | Forberedelse: ${formatDisplayTime(prepSeconds)}`}
              {warningSeconds > 0 && ` | Advarsel: ${formatDisplayTime(warningSeconds)}`}
            </p>
          )}
        </div>
        <button
          onClick={handleUse}
          disabled={!shootSeconds || shootSeconds <= 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Bruk
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-700 transition mt-3"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{showAdvanced ? 'Skjul innstillinger' : 'Vis flere innstillinger'}</span>
      </button>

      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Forberedelse (sek)</span>
              </label>
              <input
                type="number"
                value={prepSeconds}
                onChange={(e) => setPrepSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-base"
                min="0"
              />
            </div>
            <div>
              <label className="flex items-center space-x-1.5 text-sm font-medium text-slate-700 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Advarsel (sek)</span>
              </label>
              <input
                type="number"
                value={warningSeconds}
                onChange={(e) => setWarningSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-base"
                min="0"
                placeholder="0 = 10s standard"
              />
              <p className="text-xs text-slate-400 mt-1">{`0 = standard (10 sekunder f\u00F8r slutt)`}</p>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-1.5 text-sm font-medium text-slate-700 mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Regelreferanse (valgfri)</span>
            </label>
            <input
              type="text"
              value={ruleRef}
              onChange={(e) => setRuleRef(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-base"
              placeholder="F.eks. DFS Feltreglement kap. 4"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PresetOverridePanel({
  preset,
  overrides,
  onChange,
}: {
  preset: FieldClockPreset;
  overrides: { prep_seconds: number; shoot_seconds: number; warning_seconds: number };
  onChange: (overrides: { prep_seconds: number; shoot_seconds: number; warning_seconds: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasOverrides =
    overrides.prep_seconds !== preset.prep_seconds ||
    overrides.shoot_seconds !== preset.shoot_seconds ||
    overrides.warning_seconds !== preset.warning_seconds;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{open ? 'Skjul innstillinger' : 'Tilpass tider'}</span>
        {hasOverrides && !open && (
          <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">Tilpasset</span>
        )}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Forberedelse (s)</label>
              <input
                type="number"
                value={overrides.prep_seconds}
                onChange={(e) => onChange({ ...overrides, prep_seconds: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Skytetid (s)</label>
              <input
                type="number"
                value={overrides.shoot_seconds}
                onChange={(e) => onChange({ ...overrides, shoot_seconds: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                min="1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Advarsel (s)</label>
              <input
                type="number"
                value={overrides.warning_seconds}
                onChange={(e) => onChange({ ...overrides, warning_seconds: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                min="0"
              />
            </div>
          </div>
          {hasOverrides && (
            <button
              type="button"
              onClick={() => onChange({
                prep_seconds: preset.prep_seconds,
                shoot_seconds: preset.shoot_seconds,
                warning_seconds: preset.warning_seconds,
              })}
              className="text-xs text-slate-500 hover:text-slate-700 mt-2 underline"
            >
              Tilbakestill til standard
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FieldClock() {
  const [presets, setPresets] = useState<FieldClockPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FieldClockPreset | null>(null);
  const [overrides, setOverrides] = useState({ prep_seconds: 0, shoot_seconds: 0, warning_seconds: 0 });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'prep_normal' | 'prep_warning' | 'shooting_start' | 'shooting' | 'shooting_warning' | 'shooting_critical' | 'finished'>('idle');
  const intervalRef = useRef<number | null>(null);

  useWakeLock(selectedPreset !== null);

  useEffect(() => {
    fetchPresets();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const effectivePrep = selectedPreset ? overrides.prep_seconds : 15;
  const effectiveShoot = selectedPreset ? overrides.shoot_seconds : 0;
  const effectiveWarning = selectedPreset
    ? (overrides.warning_seconds > 0 ? overrides.warning_seconds : 10)
    : 10;

  const getWarningThreshold = useCallback(() => effectiveWarning, [effectiveWarning]);

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
          } else if (phase === 'shooting_start' && newTime === effectiveShoot - 2) {
            setPhase('shooting');
          } else if (phase === 'shooting' && newTime <= warningThreshold && newTime > 3) {
            setPhase('shooting_warning');
          } else if ((phase === 'shooting' || phase === 'shooting_warning') && newTime === 3) {
            setPhase('shooting_critical');
            vibrate();
          } else if (phase === 'shooting_critical') {
            if (newTime === 2 || newTime === 1) vibrate();
          }

          return newTime;
        });
      }, 1000);

    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, effectiveShoot, getWarningThreshold]);

  const fetchPresets = async () => {
    const { data } = await supabase
      .from('field_clock_presets')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setPresets(data);
  };

  const handlePhaseComplete = () => {
    playSound();
    vibrate();

    switch (phase) {
      case 'prep_normal':
      case 'prep_warning':
        setPhase('shooting_start');
        setTimeRemaining(effectiveShoot);
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
  };

  const vibrate = () => {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  };

  const handleManualSelect = (settings: ManualSettings) => {
    const preset: FieldClockPreset = {
      id: 'custom',
      name: 'Manuell tid',
      discipline_code: null,
      class_code: null,
      prep_seconds: settings.prep_seconds,
      shoot_seconds: settings.shoot_seconds,
      warning_seconds: settings.warning_seconds,
      cooldown_seconds: 0,
      rule_reference: settings.rule_reference || null,
      rule_version: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setSelectedPreset(preset);
    setOverrides({
      prep_seconds: settings.prep_seconds,
      shoot_seconds: settings.shoot_seconds,
      warning_seconds: settings.warning_seconds,
    });
    setPhase('idle');
    setTimeRemaining(0);
    setIsRunning(false);
  };

  const handlePresetSelect = (preset: FieldClockPreset) => {
    setSelectedPreset(preset);
    setOverrides({
      prep_seconds: preset.prep_seconds,
      shoot_seconds: preset.shoot_seconds,
      warning_seconds: preset.warning_seconds,
    });
    setPhase('idle');
    setTimeRemaining(0);
    setIsRunning(false);
  };

  const handleStart = () => {
    if (!selectedPreset) return;
    if (phase === 'idle') {
      setPhase('prep_normal');
      setTimeRemaining(effectivePrep);
    }
    setIsRunning(true);
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    setPhase('idle');
    setTimeRemaining(0);
  };

  const handleBack = () => {
    handleReset();
    setSelectedPreset(null);
  };

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
        return 'bg-slate-600';
    }
  };

  const getTimerColor = () => {
    if (phase === 'prep_warning') return 'text-red-200';
    if (phase === 'shooting_warning') return 'text-white';
    if (phase === 'shooting_critical') return 'text-white';
    return 'text-white';
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
        return `Advarsel \u2013 ${timeRemaining} sekunder igjen`;
      case 'shooting_critical':
        return 'Skyting';
      case 'finished':
        return 'Stans';
      default:
        return 'Klar';
    }
  };

  const getPhaseSubtext = () => {
    if (phase === 'prep_normal' && timeRemaining > 5) {
      return `Gj\u00F8r klar...`;
    }
    if (phase === 'prep_warning') {
      return 'Klar!';
    }
    return null;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Feltklokke</h1>
          <p className="text-slate-600 mt-1">Velg en preset eller sett opp tid manuelt</p>
        </div>

        {!selectedPreset ? (
          <div className="space-y-6">
            <ManualTimeSection onSelect={handleManualSelect} />

            {presets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Faste tidsvalg</h2>
                <div className="space-y-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 text-left transition active:scale-[0.99]"
                    >
                      <h3 className="font-semibold text-slate-900">{preset.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-600">
                        {preset.prep_seconds > 0 && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{formatDisplayTime(preset.prep_seconds)}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Timer className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{formatDisplayTime(preset.shoot_seconds)}</span>
                        </span>
                        {preset.warning_seconds > 0 && (
                          <span className="flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span>{formatDisplayTime(preset.warning_seconds)}</span>
                          </span>
                        )}
                      </div>
                      {preset.rule_reference && (
                        <p className="text-xs text-slate-400 mt-1.5">{preset.rule_reference}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Settings card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedPreset.name}</h2>
                  {selectedPreset.rule_reference && (
                    <p className="text-sm text-slate-500 mt-0.5">{selectedPreset.rule_reference}</p>
                  )}
                </div>
                <button onClick={handleBack} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {effectivePrep > 0 && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Forb: {formatDisplayTime(effectivePrep)}</span>
                  </span>
                )}
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Skyting: {formatDisplayTime(effectiveShoot)}</span>
                </span>
                {overrides.warning_seconds > 0 && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Adv: {formatDisplayTime(overrides.warning_seconds)}</span>
                  </span>
                )}
              </div>

              {/* Override panel - only for DB presets, not custom */}
              {selectedPreset.id !== 'custom' && phase === 'idle' && (
                <PresetOverridePanel
                  preset={selectedPreset}
                  overrides={overrides}
                  onChange={setOverrides}
                />
              )}
            </div>

            {/* Timer display */}
            <div className={`rounded-xl p-6 sm:p-10 md:p-14 text-center transition-colors duration-500 ${getPhaseColor()}`}>
              {/* Phase label */}
              <div className="mb-4 sm:mb-6">
                <p className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                  {getPhaseText()}
                </p>
                {getPhaseSubtext() && (
                  <p className="text-white/80 text-base sm:text-lg md:text-xl mt-2">{getPhaseSubtext()}</p>
                )}

                {/* Warning indicator */}
                {phase === 'shooting_warning' && (
                  <div className="flex items-center justify-center mt-3 space-x-2 animate-pulse">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    <span className="text-white font-semibold text-sm sm:text-base">Tid snart ute</span>
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Clock */}
              <div className="mb-8 sm:mb-10">
                <p className={`${getTimerColor()} text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight transition-colors duration-300 tabular-nums`}>
                  {formatClockTime(timeRemaining)}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap justify-center gap-3">
                {!isRunning && phase !== 'finished' && (
                  <button
                    onClick={handleStart}
                    className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-full transition flex items-center space-x-2 shadow-xl active:scale-95"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>{phase === 'idle' ? 'Start' : 'Fortsett'}</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={handlePause}
                    className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-full transition flex items-center space-x-2 shadow-xl active:scale-95"
                  >
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Pause</span>
                  </button>
                )}

                {phase === 'finished' && (
                  <button
                    onClick={handleReset}
                    className="bg-white hover:bg-white/90 text-slate-900 font-semibold px-8 py-4 rounded-full transition shadow-xl active:scale-95"
                  >
                    Start på nytt
                  </button>
                )}

                {phase !== 'idle' && phase !== 'finished' && (
                  <button
                    onClick={handleReset}
                    className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-full transition flex items-center space-x-2 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Nullstill</span>
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
