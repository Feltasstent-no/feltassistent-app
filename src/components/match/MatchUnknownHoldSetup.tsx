import { useState, useEffect, useCallback } from 'react';
import { Target, ArrowUp, Wind, Check, ChevronDown, Layers } from 'lucide-react';
import type { FieldFigure } from '../../types/database';
import { FieldFigureSvg } from '../FieldFigureSvg';
import { SubHoldEditor, type SubHoldFormData } from './SubHoldEditor';
import { getElevationForClickTable, getWindForClickTable } from '../../lib/click-table-resolver';
import { ShotCountInput } from '../inputs/ShotCountInput';
import { ShootingTimeInput } from '../inputs/ShootingTimeInput';
import { WindValueInput } from '../inputs/WindValueInput';

export interface UnknownHoldConfirmConfig {
  field_figure_id: string;
  distance_m: number;
  clicks: number | null;
  wind_clicks: number | null;
  shot_count: number;
  shooting_time_seconds: number;
  is_composite: boolean;
  sub_holds: SubHoldFormData[];
}

interface MatchUnknownHoldSetupProps {
  holdIndex: number;
  totalHolds: number;
  shootingTimeSeconds: number;
  shotCount: number;
  figures: FieldFigure[];
  clickTableId: string | null;
  competitionType: 'grovfelt' | 'finfelt';
  onConfirm: (config: UnknownHoldConfirmConfig) => void;
}

function getMaxDistance(figure: FieldFigure): number | null {
  return figure.max_distance_m ?? figure.max_distance ?? figure.distance_m ?? null;
}

function formatMaxDistance(figure: FieldFigure): string {
  const d = getMaxDistance(figure);
  return d ? `Maks ${d}m` : '';
}

export function MatchUnknownHoldSetup({
  holdIndex,
  totalHolds,
  shootingTimeSeconds: defaultShootingTime,
  shotCount: defaultShotCount,
  figures,
  clickTableId,
  competitionType,
  onConfirm,
}: MatchUnknownHoldSetupProps) {
  const [selectedFigureId, setSelectedFigureId] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [elevationClicks, setElevationClicks] = useState<number | null>(null);
  const [windClicks, setWindClicks] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showFigurePicker, setShowFigurePicker] = useState(false);

  const [localShotCount, setLocalShotCount] = useState(defaultShotCount);
  const [shootingTimeInput, setShootingTimeInput] = useState(String(defaultShootingTime));

  const [isComposite, setIsComposite] = useState(false);
  const [subHolds, setSubHolds] = useState<SubHoldFormData[]>([
    { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
    { fieldFigureId: null, distanceM: 0, shotCount: 3, elevationClicks: null, windClicks: null },
  ]);

  const isGrovfelt = competitionType === 'grovfelt';
  const distance = distanceInput ? parseInt(distanceInput) : 0;
  const selectedFigure = figures.find(f => f.id === selectedFigureId);
  const parsedShootingTime = parseInt(shootingTimeInput) || 0;
  const timeInvalid = parsedShootingTime < 10;

  const compositeShotTotal = subHolds.reduce((sum, sh) => sum + sh.shotCount, 0);
  const compositeValid = subHolds.length >= 2 && subHolds.every(sh => sh.fieldFigureId && sh.distanceM > 0);

  useEffect(() => {
    if (!isGrovfelt || !clickTableId || !distance) {
      setElevationClicks(null);
      return;
    }

    let cancelled = false;
    setCalculating(true);

    (async () => {
      const clicks = await getElevationForClickTable(clickTableId, distance);
      if (!cancelled) {
        setElevationClicks(clicks);
        setCalculating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [distance, clickTableId, isGrovfelt]);

  useEffect(() => {
    if (!isGrovfelt || !clickTableId || !distance || !windSpeed) {
      setWindClicks(null);
      return;
    }

    const ws = parseFloat(windSpeed);
    if (!ws) {
      setWindClicks(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const wc = await getWindForClickTable(clickTableId, distance, ws);
      if (!cancelled) setWindClicks(wc);
    })();

    return () => { cancelled = true; };
  }, [distance, windSpeed, clickTableId, isGrovfelt]);

  const resolveSubHoldClicks = useCallback(async (distanceM: number): Promise<number | null> => {
    if (!clickTableId || distanceM <= 0) return null;
    return getElevationForClickTable(clickTableId, distanceM);
  }, [clickTableId]);

  const resolveSubHoldWind = useCallback(async (distanceM: number, windSpeedMs: number): Promise<number | null> => {
    if (!clickTableId || distanceM <= 0 || !windSpeedMs) return null;
    return getWindForClickTable(clickTableId, distanceM, windSpeedMs);
  }, [clickTableId]);

  const canConfirmSingle = selectedFigureId && (isGrovfelt ? distance > 0 : true) && !timeInvalid;
  const canConfirmComposite = compositeValid && !timeInvalid;
  const canConfirm = isComposite ? canConfirmComposite : canConfirmSingle;

  const handleConfirm = () => {
    if (!canConfirm) return;

    if (isComposite) {
      const firstSub = subHolds[0];
      onConfirm({
        field_figure_id: firstSub.fieldFigureId!,
        distance_m: firstSub.distanceM,
        clicks: firstSub.elevationClicks,
        wind_clicks: firstSub.windClicks,
        shot_count: compositeShotTotal,
        shooting_time_seconds: parsedShootingTime,
        is_composite: true,
        sub_holds: subHolds,
      });
    } else {
      onConfirm({
        field_figure_id: selectedFigureId,
        distance_m: isGrovfelt ? distance : 100,
        clicks: elevationClicks,
        wind_clicks: windClicks,
        shot_count: localShotCount,
        shooting_time_seconds: parsedShootingTime,
        is_composite: false,
        sub_holds: [],
      });
    }
  };

  const holdNumber = holdIndex + 1;

  return (
    <div className="max-w-lg mx-auto space-y-4 py-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-600 rounded-full mb-1.5">
          <span className="text-xl font-bold text-white">{holdNumber}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Sett opp hold {holdNumber}</h1>
        <p className="text-slate-500 text-sm">
          {holdIndex + 1} av {totalHolds} hold
        </p>
      </div>

      <button
        type="button"
        onClick={() => setIsComposite(!isComposite)}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
          isComposite
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
      >
        <Layers className={`w-5 h-5 ${isComposite ? 'text-emerald-600' : 'text-slate-400'}`} />
        <div className="text-left">
          <p className={`text-sm font-semibold ${isComposite ? 'text-emerald-800' : 'text-slate-700'}`}>
            Sammensatt hold
          </p>
          <p className="text-xs text-slate-500">
            Flere figurer innenfor en samlet skytetid
          </p>
        </div>
        <div className={`ml-auto w-10 h-6 rounded-full transition-colors flex items-center ${
          isComposite ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
        }`}>
          <div className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
        </div>
      </button>

      {!isComposite && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Figur</label>
            <button
              onClick={() => setShowFigurePicker(!showFigurePicker)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                selectedFigureId
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
            >
              {selectedFigure ? (
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 rounded p-1">
                    <FieldFigureSvg
                      svgData={selectedFigure.svg_data}
                      imageUrl={selectedFigure.image_url}
                      size="sm"
                      fallbackText={selectedFigure.short_code || selectedFigure.code}
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{selectedFigure.code}</p>
                    <p className="text-slate-500 text-xs">{formatMaxDistance(selectedFigure)}</p>
                  </div>
                </div>
              ) : (
                <span className="text-slate-400">Velg figur...</span>
              )}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition ${showFigurePicker ? 'rotate-180' : ''}`} />
            </button>

            {showFigurePicker && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {figures.map(figure => (
                  <button
                    key={figure.id}
                    onClick={() => {
                      setSelectedFigureId(figure.id);
                      setShowFigurePicker(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition ${
                      selectedFigureId === figure.id ? 'bg-amber-50' : ''
                    }`}
                  >
                    <div className="bg-slate-100 rounded p-1 flex-shrink-0">
                      <FieldFigureSvg
                        svgData={figure.svg_data}
                        imageUrl={figure.image_url}
                        size="sm"
                        fallbackText={figure.short_code || figure.code}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{figure.code}</p>
                      <p className="text-slate-500 text-xs">{formatMaxDistance(figure)}</p>
                    </div>
                    {selectedFigureId === figure.id && (
                      <Check className="w-4 h-4 text-amber-600 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isGrovfelt && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Estimert avstand (m)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="F.eks. 250"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-lg font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}

          {isGrovfelt && (
            <WindValueInput value={windSpeed} onChange={setWindSpeed} />
          )}

          <ShotCountInput value={localShotCount} onChange={setLocalShotCount} />
        </div>
      )}

      {isComposite && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <SubHoldEditor
            subHolds={subHolds}
            onChange={setSubHolds}
            figures={figures}
            showClicks={isGrovfelt}
            onResolveClicks={isGrovfelt ? resolveSubHoldClicks : undefined}
            onResolveWind={isGrovfelt ? resolveSubHoldWind : undefined}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <ShootingTimeInput
          value={shootingTimeInput}
          onChange={setShootingTimeInput}
          suffix={isComposite ? '- samlet for alle delhold' : undefined}
        />
      </div>

      {!isComposite && isGrovfelt && distance > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
          <h3 className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Beregnet innstilling</h3>

          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <ArrowUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Elevasjon</p>
              <p className="text-xl font-bold text-slate-900">
                {calculating ? '...' : elevationClicks !== null ? `${Math.abs(elevationClicks)} knepp ${elevationClicks >= 0 ? 'opp' : 'ned'}` : 'Ingen data'}
              </p>
            </div>
          </div>

          {windClicks !== null && windClicks !== 0 && (
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
              <Wind className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Vindkorreksjon</p>
                <p className="text-xl font-bold text-slate-900">
                  {Math.abs(windClicks)} knepp
                </p>
              </div>
            </div>
          )}

          <div className="text-center bg-slate-100 rounded-lg py-2">
            <p className="text-slate-500 text-xs">Avstand</p>
            <p className="text-2xl font-bold text-slate-900">{distance}m</p>
          </div>
        </div>
      )}

      {!isComposite && !isGrovfelt && selectedFigure && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Target className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Finfelt</p>
              <p className="text-lg font-bold text-slate-900">100m - kontroller nullstilling</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-1">
        <p className="text-xs text-slate-500">
          {isComposite ? compositeShotTotal : localShotCount} skudd / {parsedShootingTime}s skytetid
        </p>
        {isComposite && (
          <p className="text-xs text-slate-400">
            {subHolds.length} delhold
          </p>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-lg py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        Bekreft og start hold
      </button>
    </div>
  );
}
