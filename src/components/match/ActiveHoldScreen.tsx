import { useState, useEffect } from 'react';
import { Camera, Play, CheckCircle, Pause, AlertCircle, Wind, Minus, Plus, PlusCircle, Layers, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { FieldFigure } from '../FieldFigure';
import { FieldFigureSvg } from '../FieldFigureSvg';
import { CompactDigitalClock } from './CompactDigitalClock';
import type { MatchHoldWithFigure, MatchSubHold } from '../../lib/match-service';

interface ActiveHoldScreenProps {
  hold: MatchHoldWithFigure;
  onComplete: () => void;
  onPause: () => void;
  onTakePhoto: () => void;
  onClockStart?: () => void;
  onClockComplete?: () => void;
  clockStarted?: boolean;
  onWindCorrectionChange?: (holdId: string, clicks: number) => void;
  onElevationCorrectionChange?: (holdId: string, clicks: number | null) => void;
  onAddHold?: () => void;
  onTakeSubHoldPhoto?: (subHoldId: string) => void;
  initialElapsedTime?: number;
  isFinfelt?: boolean;
  isLastHold?: boolean;
  previousHoldWindClicks?: number | null;
  hasPhoto?: boolean;
  reviewMode?: boolean;
}

function SubHoldIndicator({
  subHolds,
  activeIndex,
  onSelect,
}: {
  subHolds: MatchSubHold[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="w-full max-w-md mx-auto flex-shrink-0">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="w-4 h-4 text-amber-700" />
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Sammensatt hold</span>
          <span className="text-xs text-amber-600 ml-auto">{subHolds.length} delhold</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onSelect(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="w-7 h-7 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <ChevronLeft className="w-4 h-4 text-amber-700" />
          </button>

          <div className="flex-1 flex gap-1">
            {subHolds.map((sh, i) => (
              <button
                key={sh.id}
                onClick={() => onSelect(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  i === activeIndex
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => onSelect(Math.min(subHolds.length - 1, activeIndex + 1))}
            disabled={activeIndex >= subHolds.length - 1}
            className="w-7 h-7 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <ChevronRight className="w-4 h-4 text-amber-700" />
          </button>
        </div>

        <ActiveSubHoldCard subHold={subHolds[activeIndex]} index={activeIndex} />

        {activeIndex < subHolds.length - 1 && (
          <div className="mt-2 pt-2 border-t border-amber-200">
            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mb-1">Neste delhold</p>
            <NextSubHoldPreview subHold={subHolds[activeIndex + 1]} index={activeIndex + 1} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveSubHoldCard({ subHold, index }: { subHold: MatchSubHold; index: number }) {
  const fig = subHold.field_figure;
  return (
    <div className="bg-white rounded-lg border border-amber-200 p-2.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
        {fig ? (
          <FieldFigureSvg
            svgData={fig.svg_data}
            imageUrl={fig.image_url}
            size="xs"
            fallbackText={fig.short_code || fig.code}
          />
        ) : (
          <span className="text-xs text-slate-400 font-bold">{index + 1}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">
          Delhold {index + 1}: {fig?.short_code || fig?.code || fig?.name || 'Ukjent'}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>{subHold.distance_m || 0}m</span>
          <span>{subHold.shot_count} skudd</span>
          {subHold.elevation_clicks != null && subHold.elevation_clicks !== 0 && (
            <span className="text-emerald-600 font-semibold">
              {subHold.elevation_clicks > 0 ? '+' : ''}{subHold.elevation_clicks} h fra 0
            </span>
          )}
          {subHold.wind_clicks != null && subHold.wind_clicks !== 0 && (
            <span className="text-sky-600 font-semibold">
              {subHold.wind_clicks > 0 ? '+' : ''}{subHold.wind_clicks} v
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function NextSubHoldPreview({ subHold, index }: { subHold: MatchSubHold; index: number }) {
  const fig = subHold.field_figure;
  return (
    <div className="flex items-center gap-2 text-xs text-amber-700">
      <span className="font-bold">{index + 1}.</span>
      <span>{fig?.short_code || fig?.code || 'Ukjent'}</span>
      <span>{subHold.distance_m || 0}m</span>
      <span>{subHold.shot_count} skudd</span>
      {subHold.elevation_clicks != null && subHold.elevation_clicks !== 0 && (
        <span className="font-semibold">
          {subHold.elevation_clicks > 0 ? '+' : ''}{subHold.elevation_clicks} h fra 0
        </span>
      )}
    </div>
  );
}

export function ActiveHoldScreen({
  hold,
  onComplete,
  onPause,
  onTakePhoto,
  onClockStart,
  onClockComplete: onClockCompleteProp,
  clockStarted = false,
  onWindCorrectionChange,
  onElevationCorrectionChange,
  onAddHold,
  onTakeSubHoldPhoto,
  initialElapsedTime = 0,
  isFinfelt = false,
  isLastHold = false,
  previousHoldWindClicks,
  hasPhoto = false,
  reviewMode = false,
}: ActiveHoldScreenProps) {
  const isComposite = hold.is_composite && hold.sub_holds && hold.sub_holds.length > 0;
  const subHolds = hold.sub_holds || [];

  const [clockFinished, setClockFinished] = useState(false);
  const [windClicks, setWindClicks] = useState(hold.wind_correction_clicks || 0);
  const [elevCorrection, setElevCorrection] = useState<number | null>(
    hold.elevation_correction_clicks ?? null
  );
  const [activeSubHoldIndex, setActiveSubHoldIndex] = useState(0);

  useEffect(() => {
    setWindClicks(hold.wind_correction_clicks || 0);
  }, [hold.id, hold.wind_correction_clicks]);

  useEffect(() => {
    setElevCorrection(hold.elevation_correction_clicks ?? null);
  }, [hold.id, hold.elevation_correction_clicks]);

  useEffect(() => {
    setClockFinished(false);
    setActiveSubHoldIndex(0);
  }, [hold.id]);

  useEffect(() => {
    if (initialElapsedTime > 0 && clockStarted && !clockFinished) {
      const totalTime = (hold.field_figure?.prep_time_seconds || 15) + (hold.shooting_time_seconds || 60);
      if (initialElapsedTime >= totalTime) {
        setClockFinished(true);
      }
    }
  }, [initialElapsedTime, clockStarted, clockFinished, hold.field_figure?.prep_time_seconds, hold.shooting_time_seconds]);

  const handleStartClock = () => {
    onClockStart?.();
  };

  const handleClockComplete = () => {
    setClockFinished(true);
    onClockCompleteProp?.();
  };

  const handleWindChange = (delta: number) => {
    const newValue = windClicks + delta;
    setWindClicks(newValue);
    onWindCorrectionChange?.(hold.id, newValue);
  };

  const hasWindRecommendation = !isFinfelt && (hold.recommended_wind_clicks || 0) !== 0;
  const windDiffers = hasWindRecommendation && windClicks !== (hold.recommended_wind_clicks || 0);
  const distanceM = hold.distance_m || 0;
  const isOutOfRange = distanceM < 100 || distanceM > 600;

  const recommendedElev = hold.recommended_clicks ?? 0;
  const effectiveElev = elevCorrection ?? recommendedElev;
  const followingRecommendedElev = elevCorrection === null;
  const readyEditable = !reviewMode && hold.started_at == null && !hold.completed;
  const showElevControl = !isFinfelt && !isComposite && readyEditable;

  const handleElevChange = (delta: number) => {
    const newValue = effectiveElev + delta;
    setElevCorrection(newValue);
    onElevationCorrectionChange?.(hold.id, newValue);
  };

  const handleUseRecommendedElev = () => {
    setElevCorrection(null);
    onElevationCorrectionChange?.(hold.id, null);
  };

  const prevWind = previousHoldWindClicks || 0;
  const currentRecommendedWind = hold.recommended_wind_clicks || 0;
  const windDeltaFromPrev = currentRecommendedWind - prevWind;
  const showWindDelta = !isFinfelt && previousHoldWindClicks != null && windDeltaFromPrev !== 0;

  const activeSub = isComposite ? subHolds[activeSubHoldIndex] : null;
  const displayFigure = isComposite && activeSub?.field_figure ? activeSub.field_figure : hold.field_figure;

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto min-h-0">
        {displayFigure ? (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <FieldFigure
              key={isComposite ? `${hold.id}-${activeSubHoldIndex}` : hold.id}
              figure={displayFigure}
              size="active"
              showName={true}
            />
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-bold text-sm">Figur mangler</p>
                <p className="text-xs">Konfigurasjonsfeil</p>
              </div>
            </div>
          </div>
        )}

        {isComposite && (
          <SubHoldIndicator
            subHolds={subHolds}
            activeIndex={activeSubHoldIndex}
            onSelect={setActiveSubHoldIndex}
          />
        )}

        {!isComposite && (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            {!isFinfelt ? (
              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-lg border-2 p-2 text-center ${isOutOfRange ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                  <p className={`text-xs mb-1 ${isOutOfRange ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>Avstand</p>
                  <p className={`text-lg font-bold ${isOutOfRange ? 'text-red-700' : 'text-slate-900'}`}>{distanceM}m</p>
                  {isOutOfRange && <p className="text-[9px] text-red-500">Utenfor DFS</p>}
                </div>
                <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-2 text-center">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">Høyde</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {effectiveElev > 0 ? '+' : ''}{effectiveElev}
                  </p>
                </div>
                <div className="bg-white rounded-lg border-2 border-slate-200 p-2 text-center">
                  <p className="text-xs text-slate-600 mb-1">Skudd</p>
                  <p className="text-lg font-bold text-slate-900">{hold.shot_count || 0}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg border-2 p-3 text-center ${isOutOfRange ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                  <p className={`text-xs mb-1 ${isOutOfRange ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>Avstand</p>
                  <p className={`text-xl font-bold ${isOutOfRange ? 'text-red-700' : 'text-slate-900'}`}>{distanceM}m</p>
                  {isOutOfRange && <p className="text-[9px] text-red-500">Utenfor DFS (100-600m)</p>}
                </div>
                <div className="bg-white rounded-lg border-2 border-slate-200 p-3 text-center">
                  <p className="text-xs text-slate-600 mb-1">Skudd</p>
                  <p className="text-xl font-bold text-slate-900">{hold.shot_count || 0}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {showElevControl && (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ArrowUpDown className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-semibold text-emerald-700">Høyde</p>
                  <p className="text-[10px] text-emerald-600">
                    Anbefalt {recommendedElev > 0 ? '+' : ''}{recommendedElev}
                    {!followingRecommendedElev && (
                      <button
                        onClick={handleUseRecommendedElev}
                        className="ml-1 underline hover:text-emerald-800"
                      >
                        Bruk anbefalt
                      </button>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleElevChange(-1)}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-emerald-300 hover:bg-emerald-100 flex items-center justify-center transition"
                >
                  <Minus className="w-4 h-4 text-emerald-700" />
                </button>
                <div className="min-w-[44px] text-center">
                  <span className="text-xl font-bold text-emerald-800">
                    {effectiveElev > 0 ? '+' : ''}{effectiveElev}
                  </span>
                </div>
                <button
                  onClick={() => handleElevChange(1)}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-emerald-300 hover:bg-emerald-100 flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!isFinfelt && hasWindRecommendation && readyEditable && (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <div className="bg-sky-50 border border-sky-300 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Wind className="w-4 h-4 text-sky-700 shrink-0" />
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-semibold text-sky-700">Vind</p>
                  <p className="text-[10px] text-sky-600">
                    Anbefalt {Math.abs(hold.recommended_wind_clicks || 0)}
                    {(hold.recommended_wind_clicks || 0) > 0 ? ' høyre' : (hold.recommended_wind_clicks || 0) < 0 ? ' venstre' : ''}
                    {windDiffers && (
                      <button
                        onClick={() => {
                          const rec = hold.recommended_wind_clicks || 0;
                          setWindClicks(rec);
                          onWindCorrectionChange?.(hold.id, rec);
                        }}
                        className="ml-1 underline hover:text-sky-800"
                      >
                        Bruk anbefalt
                      </button>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleWindChange(-1)}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-sky-300 hover:bg-sky-100 flex items-center justify-center transition"
                >
                  <Minus className="w-4 h-4 text-sky-700" />
                </button>
                <div className="min-w-[64px] text-center leading-tight">
                  <span className="text-xl font-bold text-sky-800">{Math.abs(windClicks)}</span>
                  <span className="text-[10px] font-medium text-sky-600 ml-0.5">
                    {windClicks > 0 ? 'høyre' : windClicks < 0 ? 'venstre' : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleWindChange(1)}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-sky-300 hover:bg-sky-100 flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4 text-sky-700" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!isFinfelt && hasWindRecommendation && !readyEditable && (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <div className="bg-sky-50 border-2 border-sky-300 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Wind className="w-4 h-4 text-sky-700" />
                <span className="text-xs font-semibold text-sky-700">Vindkorreksjon</span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-sky-600">
                  Anbefalt: {Math.abs(hold.recommended_wind_clicks || 0)} knepp
                  {(hold.recommended_wind_clicks || 0) > 0 ? ' høyre' : (hold.recommended_wind_clicks || 0) < 0 ? ' venstre' : ''}
                </span>
                {windDiffers && !reviewMode && (
                  <button
                    onClick={() => {
                      const rec = hold.recommended_wind_clicks || 0;
                      setWindClicks(rec);
                      onWindCorrectionChange?.(hold.id, rec);
                    }}
                    className="text-xs text-sky-600 hover:text-sky-800 underline"
                  >
                    Bruk anbefalt
                  </button>
                )}
              </div>

              {showWindDelta && (
                <div className="bg-sky-100 rounded-md px-2.5 py-1.5 mb-2">
                  <p className="text-xs font-semibold text-sky-800 text-center">
                    {windDeltaFromPrev > 0 ? '+' : ''}{windDeltaFromPrev} knepp {windDeltaFromPrev > 0 ? 'høyre' : 'venstre'} fra forrige hold
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleWindChange(-1)}
                  disabled={reviewMode}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-sky-300 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
                >
                  <Minus className="w-4 h-4 text-sky-700" />
                </button>
                <div className="min-w-[100px] text-center">
                  <span className="text-2xl font-bold text-sky-800">
                    {Math.abs(windClicks)}
                  </span>
                  <span className="text-xs font-medium text-sky-600 ml-1">
                    {windClicks > 0 ? 'høyre' : windClicks < 0 ? 'venstre' : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleWindChange(1)}
                  disabled={reviewMode}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-sky-300 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4 text-sky-700" />
                </button>
              </div>
            </div>
          </div>
        )}

        {hold.field_figure && !reviewMode && (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <CompactDigitalClock
              key={hold.id}
              prepTime={hold.field_figure.prep_time_seconds || 15}
              shootTime={hold.shooting_time_seconds || 60}
              onComplete={handleClockComplete}
              onForceComplete={handleClockComplete}
              isPaused={!clockStarted}
              started={clockStarted}
              initialElapsedTime={initialElapsedTime}
            />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4 space-y-2 flex-shrink-0">
        {reviewMode ? (
          <div className="text-center py-1.5">
            <p className="text-sm font-semibold text-slate-500">Tidligere hold - kun visning</p>
            <p className="text-xs text-slate-400 mt-0.5">Bruk knappene over for a bla eller ga tilbake til aktivt hold</p>
          </div>
        ) : !clockStarted ? (
          <>
            <button
              onClick={handleStartClock}
              disabled={!hold.field_figure}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
            >
              <Play className="w-6 h-6" />
              <span>Start klokke</span>
            </button>
            <button
              onClick={onPause}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition flex items-center justify-center space-x-2"
            >
              <Pause className="w-4 h-4" />
              <span>Pause stevne</span>
            </button>
          </>
        ) : clockFinished ? (
          <>
            {isComposite ? (
              <div className="space-y-2">
                {subHolds.map((sh, i) => (
                  <button
                    key={sh.id}
                    onClick={() => onTakeSubHoldPhoto?.(sh.id)}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg transition border border-blue-200 flex items-center justify-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Bilde delhold {i + 1}: {sh.field_figure?.short_code || sh.field_figure?.code || `${sh.distance_m}m`}</span>
                  </button>
                ))}
                <button
                  onClick={onTakePhoto}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Legg til bilde</span>
                </button>
                <button
                  onClick={onComplete}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{isLastHold ? 'Avslutt stevne' : 'Fullfør hold'}</span>
                </button>
              </div>
            ) : (
              <>
                {hasPhoto && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-900/40 border border-emerald-700 rounded-lg w-fit">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-300">1 bilde lagret</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onTakePhoto}
                    className="py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Camera className="w-5 h-5" />
                    <span>{hasPhoto ? 'Bytt bilde' : 'Ta bilde'}</span>
                  </button>
                  <button
                    onClick={onComplete}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Fullfør hold</span>
                  </button>
                </div>
              </>
            )}
            {isLastHold && onAddHold && (
              <button
                onClick={onAddHold}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg transition border border-slate-300 flex items-center justify-center space-x-2"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Legg til ekstra hold</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onPause}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition flex items-center justify-center space-x-2"
          >
            <Pause className="w-4 h-4" />
            <span>Pause stevne</span>
          </button>
        )}
      </div>
    </div>
  );
}
