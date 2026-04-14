import { useState, useEffect } from 'react';
import { Target, ArrowUp, Wind, Check, ChevronDown } from 'lucide-react';
import { FieldFigure, CompetitionStage } from '../../types/database';
import { FieldFigureSvg } from '../FieldFigureSvg';
import { getElevationForClickTable, getWindForClickTable } from '../../lib/click-table-resolver';

interface UnknownHoldSetupProps {
  stage: CompetitionStage;
  stageIndex: number;
  totalStages: number;
  figures: FieldFigure[];
  clickTableId: string | null;
  competitionType: 'grovfelt' | 'finfelt';
  onConfirm: (config: {
    field_figure_id: string;
    distance_m: number;
    clicks: number | null;
    clicks_to_zero: number | null;
    wind_clicks: number | null;
  }) => void;
}

export function UnknownHoldSetup({
  stage,
  stageIndex,
  totalStages,
  figures,
  clickTableId,
  competitionType,
  onConfirm,
}: UnknownHoldSetupProps) {
  const [selectedFigureId, setSelectedFigureId] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [elevationClicks, setElevationClicks] = useState<number | null>(null);
  const [windClicks, setWindClicks] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showFigurePicker, setShowFigurePicker] = useState(false);

  const isGrovfelt = competitionType === 'grovfelt';
  const distance = distanceInput ? parseInt(distanceInput) : 0;
  const selectedFigure = figures.find(f => f.id === selectedFigureId);

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

  const canConfirm = selectedFigureId && (isGrovfelt ? distance > 0 : true);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      field_figure_id: selectedFigureId,
      distance_m: isGrovfelt ? distance : 100,
      clicks: elevationClicks,
      clicks_to_zero: elevationClicks,
      wind_clicks: windClicks,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-600 rounded-full mb-2">
            <span className="text-2xl font-bold">{stage.stage_number}</span>
          </div>
          <h1 className="text-2xl font-bold">Sett opp hold {stage.stage_number}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {stageIndex + 1} av {totalStages} hold
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Figur</label>
            <button
              onClick={() => setShowFigurePicker(!showFigurePicker)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                selectedFigureId
                  ? 'border-amber-600 bg-amber-900/20'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
            >
              {selectedFigure ? (
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 rounded p-1">
                    <FieldFigureSvg
                      svgData={selectedFigure.svg_data}
                      imageUrl={selectedFigure.image_url}
                      size="sm"
                      fallbackText={selectedFigure.short_code || selectedFigure.code}
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{selectedFigure.code}</p>
                    <p className="text-gray-400 text-xs">{selectedFigure.name}</p>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">Velg figur...</span>
              )}
              <ChevronDown className={`w-5 h-5 text-gray-400 transition ${showFigurePicker ? 'rotate-180' : ''}`} />
            </button>

            {showFigurePicker && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-600 bg-gray-700">
                {figures.map(figure => (
                  <button
                    key={figure.id}
                    onClick={() => {
                      setSelectedFigureId(figure.id);
                      setShowFigurePicker(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-600 transition ${
                      selectedFigureId === figure.id ? 'bg-amber-900/30' : ''
                    }`}
                  >
                    <div className="bg-white/10 rounded p-1 flex-shrink-0">
                      <FieldFigureSvg
                        svgData={figure.svg_data}
                        imageUrl={figure.image_url}
                        size="sm"
                        fallbackText={figure.short_code || figure.code}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{figure.code}</p>
                      <p className="text-gray-400 text-xs">{figure.name}</p>
                    </div>
                    {selectedFigureId === figure.id && (
                      <Check className="w-4 h-4 text-amber-400 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isGrovfelt && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estimert avstand (m)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="F.eks. 250"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-semibold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}

          {isGrovfelt && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Sidevind (m/s, valgfritt)</label>
              <input
                type="text"
                inputMode="decimal"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="F.eks. 3"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {isGrovfelt && distance > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm text-gray-400 font-semibold uppercase tracking-wide">Beregnet innstilling</h3>

            <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-700 rounded-lg p-3">
              <ArrowUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Elevasjon</p>
                <p className="text-xl font-bold">
                  {calculating ? '...' : elevationClicks !== null ? `${Math.abs(elevationClicks)} knepp ${elevationClicks >= 0 ? 'opp' : 'ned'}` : 'Ingen data'}
                </p>
              </div>
            </div>

            {windClicks !== null && windClicks !== 0 && (
              <div className="flex items-center gap-3 bg-teal-900/30 border border-teal-700 rounded-lg p-3">
                <Wind className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Vindkorreksjon</p>
                  <p className="text-xl font-bold">
                    {Math.abs(windClicks)} knepp
                  </p>
                </div>
              </div>
            )}

            <div className="text-center bg-gray-700/50 rounded-lg py-2">
              <p className="text-gray-400 text-xs">Avstand</p>
              <p className="text-2xl font-bold">{distance}m</p>
            </div>
          </div>
        )}

        {!isGrovfelt && selectedFigure && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-700 rounded-lg p-3">
              <Target className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Finfelt</p>
                <p className="text-lg font-bold">100m - kontroller nullstilling</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-center text-xs text-gray-500">
            {stage.total_shots} skudd / {stage.time_limit_seconds}s skytetid
          </p>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Bekreft og start hold
        </button>
      </div>
    </div>
  );
}
