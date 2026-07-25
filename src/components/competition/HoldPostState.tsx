import { useState } from 'react';
import { ArrowDown, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { CompetitionStage, CompetitionStageImage, FieldFigure } from '../../types/database';
import { HoldImageUpload } from './HoldImageUpload';
import { SeriesEditor, SeriesValues } from '../inputs/SeriesEditor';

interface AddHoldData {
  distance_m: number | null;
  total_shots: number;
  time_limit_seconds: number;
  field_figure_id: string | null;
}

interface HoldPostStateProps {
  stage: CompetitionStage;
  isLastStage: boolean;
  entryId: string;
  existingImage?: CompetitionStageImage | null;
  figures?: FieldFigure[];
  competitionType?: 'grovfelt' | 'finfelt';
  onNextHold: () => Promise<void> | void;
  onFinish: () => Promise<void> | void;
  onImageUploaded?: () => void;
  onAddHold?: (data: AddHoldData) => Promise<void>;
}

export function HoldPostState({
  stage,
  isLastStage,
  entryId,
  existingImage,
  figures,
  competitionType,
  onNextHold,
  onFinish,
  onImageUploaded,
  onAddHold,
}: HoldPostStateProps) {
  const [progressing, setProgressing] = useState(false);
  const [showAddHold, setShowAddHold] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<string | null>(null);

  const handleProgress = async (action: () => Promise<void> | void) => {
    if (progressing) return;
    setProgressing(true);
    try {
      await action();
    } finally {
      setProgressing(false);
    }
  };

  const handleSeriesSave = async (values: SeriesValues) => {
    if (!onAddHold) return;
    await onAddHold({
      distance_m: values.distanceM,
      total_shots: values.shotCount,
      time_limit_seconds: values.shootingTimeSeconds ?? 30,
      field_figure_id: selectedFigure,
    });
    setShowAddHold(false);
    setSelectedFigure(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-3">
            <span className="text-3xl font-bold">&#10003;</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">Hold {stage.stage_number} ferdig</h1>
          <p className="text-gray-400 text-lg">Tid ute</p>
        </div>

        {stage.clicks_to_zero !== null && stage.clicks_to_zero !== 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <ArrowDown className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-xs text-gray-400">Tilbake til nullpunkt</p>
                  <p className="text-2xl font-bold">
                    {Math.abs(stage.clicks_to_zero)} knepp {stage.clicks_to_zero > 0 ? 'opp' : 'ned'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <HoldImageUpload
          entryId={entryId}
          stageNumber={stage.stage_number}
          existingImage={existingImage}
          onImageUploaded={onImageUploaded}
        />

        {onAddHold && (
          <>
            {showAddHold ? (
              <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-300">Legg til ekstra hold</h3>

                {figures && figures.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Figur</label>
                    <select
                      value={selectedFigure || ''}
                      onChange={(e) => setSelectedFigure(e.target.value || null)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm"
                    >
                      <option value="">Velg figur</option>
                      {figures.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} - {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <SeriesEditor
                  mode="create"
                  initialValues={{
                    shotCount: 1,
                    shootingTimeSeconds: 30,
                    distanceM: competitionType === 'finfelt' ? 100 : null,
                  }}
                  features={{
                    shootingTime: 'required',
                    distance: competitionType === 'grovfelt' ? 'optional' : 'hidden',
                  }}
                  submitLabel="Legg til hold"
                  onSave={handleSeriesSave}
                  onCancel={() => {
                    setShowAddHold(false);
                    setSelectedFigure(null);
                  }}
                  compact
                  darkMode
                />
              </div>
            ) : (
              <button
                onClick={() => setShowAddHold(true)}
                className="w-full py-2 px-4 border border-dashed border-gray-600 rounded-xl text-gray-400 text-sm hover:border-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Legg til ekstra hold
              </button>
            )}
          </>
        )}

        {isLastStage ? (
          <button
            onClick={() => handleProgress(onFinish)}
            disabled={progressing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold text-xl py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {progressing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : null}
            {progressing ? 'Avslutter...' : 'Avslutt stevne'}
          </button>
        ) : (
          <button
            onClick={() => handleProgress(onNextHold)}
            disabled={progressing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xl py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {progressing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : null}
            <span>{progressing ? 'Laster...' : 'Neste hold'}</span>
            {!progressing && <ArrowRight className="w-6 h-6" />}
          </button>
        )}
      </div>
    </div>
  );
}
