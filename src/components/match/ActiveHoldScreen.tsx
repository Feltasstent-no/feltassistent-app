import { useState, useEffect } from 'react';
import { Camera, Play, CheckCircle, Pause, AlertCircle, Wind, Minus, Plus, PlusCircle } from 'lucide-react';
import { FieldFigure } from '../FieldFigure';
import { CompactDigitalClock } from './CompactDigitalClock';
import type { MatchHoldWithFigure } from '../../lib/match-service';

interface ActiveHoldScreenProps {
  hold: MatchHoldWithFigure;
  onComplete: () => void;
  onPause: () => void;
  onTakePhoto: () => void;
  onClockStart?: () => void;
  onClockComplete?: () => void;
  onWindCorrectionChange?: (holdId: string, clicks: number) => void;
  onAddHold?: () => void;
  initialElapsedTime?: number;
  isFinfelt?: boolean;
  isLastHold?: boolean;
  previousHoldWindClicks?: number | null;
}

export function ActiveHoldScreen({
  hold,
  onComplete,
  onPause,
  onTakePhoto,
  onClockStart,
  onClockComplete: onClockCompleteProp,
  onWindCorrectionChange,
  onAddHold,
  initialElapsedTime = 0,
  isFinfelt = false,
  isLastHold = false,
  previousHoldWindClicks,
}: ActiveHoldScreenProps) {
  const [clockStarted, setClockStarted] = useState(initialElapsedTime > 0);
  const [clockFinished, setClockFinished] = useState(false);
  const [windClicks, setWindClicks] = useState(hold.wind_correction_clicks || 0);

  useEffect(() => {
    setWindClicks(hold.wind_correction_clicks || 0);
  }, [hold.id, hold.wind_correction_clicks]);

  useEffect(() => {
    setClockStarted(initialElapsedTime > 0);
    setClockFinished(false);
  }, [hold.id, initialElapsedTime]);

  const handleStartClock = () => {
    setClockStarted(true);
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

  const prevWind = previousHoldWindClicks || 0;
  const currentRecommendedWind = hold.recommended_wind_clicks || 0;
  const windDeltaFromPrev = currentRecommendedWind - prevWind;
  const showWindDelta = !isFinfelt && previousHoldWindClicks != null && windDeltaFromPrev !== 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col p-3 space-y-3 overflow-hidden">
        {hold.field_figure ? (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <FieldFigure
              key={hold.id}
              figure={hold.field_figure}
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
                  {(hold.recommended_clicks || 0) > 0 ? '+' : ''}{hold.recommended_clicks || 0}
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

        {!isFinfelt && hasWindRecommendation && (
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
                {windDiffers && (
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
                  className="w-9 h-9 rounded-lg bg-white border-2 border-sky-300 hover:bg-sky-100 flex items-center justify-center transition"
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
                  className="w-9 h-9 rounded-lg bg-white border-2 border-sky-300 hover:bg-sky-100 flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4 text-sky-700" />
                </button>
              </div>
            </div>
          </div>
        )}

        {hold.field_figure && (
          <div className="w-full max-w-md mx-auto flex-shrink-0">
            <CompactDigitalClock
              key={hold.id}
              prepTime={hold.field_figure.prep_time_seconds || 15}
              shootTime={hold.shooting_time_seconds || 60}
              onComplete={handleClockComplete}
              isPaused={!clockStarted}
              initialElapsedTime={initialElapsedTime}
            />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4 space-y-2">
        {!clockStarted ? (
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
            <button
              onClick={onTakePhoto}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>Ta bilde av monitor</span>
            </button>
            <button
              onClick={onComplete}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-6 h-6" />
              <span>Fullfør hold</span>
            </button>
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
          <div className="text-center text-slate-600 py-2">
            <p className="text-sm">Klokken kjører...</p>
          </div>
        )}
      </div>
    </div>
  );
}
