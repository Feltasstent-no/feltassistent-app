import { ArrowUp, Info } from 'lucide-react';
import { CompetitionStage, FieldFigure } from '../../types/database';
import { FieldFigureSvg } from '../FieldFigureSvg';

interface HoldPreStateProps {
  stage: CompetitionStage;
  figure: FieldFigure | null;
  competitionType: 'grovfelt' | 'finfelt';
  onStartHold: () => void;
}

export function HoldPreState({ stage, figure, competitionType, onStartHold }: HoldPreStateProps) {
  const isGrovfelt = competitionType === 'grovfelt';

  console.log('[HoldPreState] ========== RENDERING PRE-HOLD ==========');
  console.log('[HoldPreState] Stage:', {
    stage_number: stage.stage_number,
    distance_m: stage.distance_m,
    clicks: stage.clicks,
    field_figure_id: stage.field_figure_id
  });
  console.log('[HoldPreState] Figure:', figure ? {
    id: figure.id,
    code: figure.code,
    name: figure.name,
    has_svg: !!figure.svg_data,
    has_image: !!figure.image_url
  } : 'NO FIGURE');
  console.log('[HoldPreState] Competition type:', competitionType);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-2">
            <span className="text-2xl font-bold">{stage.stage_number}</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Hold {stage.stage_number}</h1>
        </div>

        {figure && (
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white/5 rounded-lg p-1 flex items-center justify-center">
              <FieldFigureSvg
                svgData={figure.svg_data}
                imageUrl={figure.image_url}
                size="lg"
                fallbackText={figure.short_code || figure.code}
              />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold">{figure.code}</p>
              <p className="text-gray-400 text-sm">{figure.name}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-3 space-y-3">

          {isGrovfelt && (
            <>
              <div className="text-center py-2">
                <p className="text-gray-400 text-xs">Avstand</p>
                <p className="text-2xl font-bold">{stage.distance_m}m</p>
              </div>

              {stage.clicks !== null && stage.clicks !== 0 && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 justify-center">
                    <ArrowUp className="w-5 h-5 text-blue-400" />
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Stil opp</p>
                      <p className="text-xl font-bold">
                        {Math.abs(stage.clicks)} knepp {stage.clicks > 0 ? 'opp' : 'ned'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!isGrovfelt && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-200">
                  <p className="font-semibold mb-0.5">Finfelt - 100m</p>
                  <p className="text-blue-300">
                    Alle hold er 100m. Husk å kontrollere at rifta er stilt til 100m.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onStartHold}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3 rounded-xl transition-colors"
        >
          Start hold
        </button>
      </div>
    </div>
  );
}
