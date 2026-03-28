import { useState } from 'react';
import { ArrowDown, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { CompetitionStage, CompetitionStageImage, FieldFigure } from '../../types/database';
import { HoldImageUpload } from './HoldImageUpload';

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
  const [addingHold, setAddingHold] = useState(false);
  const [newHold, setNewHold] = useState<AddHoldData>({
    distance_m: competitionType === 'finfelt' ? 100 : null,
    total_shots: 1,
    time_limit_seconds: 30,
    field_figure_id: null,
  });

  const handleProgress = async (action: () => Promise<void> | void) => {
    if (progressing) return;
    setProgressing(true);
    try {
      await action();
    } finally {
      setProgressing(false);
    }
  };

  const handleAddHold = async () => {
    if (!onAddHold || addingHold) return;
    setAddingHold(true);
    try {
      await onAddHold(newHold);
      setShowAddHold(false);
      setNewHold({
        distance_m: competitionType === 'finfelt' ? 100 : null,
        total_shots: 1,
        time_limit_seconds: 30,
        field_figure_id: null,
      });
    } finally {
      setAddingHold(false);
    }
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
                      value={newHold.field_figure_id || ''}
                      onChange={(e) => setNewHold({ ...newHold, field_figure_id: e.target.value || null })}
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

                <div className="grid grid-cols-3 gap-3">
                  {competitionType === 'grovfelt' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Avstand (m)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newHold.distance_m || ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setNewHold({ ...newHold, distance_m: v ? parseInt(v) : null });
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm"
                        placeholder="m"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Skudd</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newHold.total_shots}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setNewHold({ ...newHold, total_shots: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tid (sek)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newHold.time_limit_seconds}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setNewHold({ ...newHold, time_limit_seconds: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddHold(false)}
                    className="flex-1 py-2 px-3 border border-gray-600 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleAddHold}
                    disabled={addingHold}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {addingHold ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {addingHold ? 'Legger til...' : 'Legg til'}
                  </button>
                </div>
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
