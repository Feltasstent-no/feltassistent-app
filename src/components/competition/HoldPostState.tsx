import { ArrowDown, ArrowRight } from 'lucide-react';
import { CompetitionStage, CompetitionStageImage } from '../../types/database';
import { HoldImageUpload } from './HoldImageUpload';

interface HoldPostStateProps {
  stage: CompetitionStage;
  isLastStage: boolean;
  entryId: string;
  existingImage?: CompetitionStageImage | null;
  onNextHold: () => void;
  onFinish: () => void;
  onImageUploaded?: () => void;
}

export function HoldPostState({
  stage,
  isLastStage,
  entryId,
  existingImage,
  onNextHold,
  onFinish,
  onImageUploaded,
}: HoldPostStateProps) {
  console.log('[HoldPostState] ========== COMPONENT MOUNTED/RENDERED ==========');
  console.log('[HoldPostState] Props received:', {
    stage_id: stage.id,
    stage_number: stage.stage_number,
    isLastStage,
    entryId,
    has_existingImage: !!existingImage,
    has_onNextHold: typeof onNextHold === 'function',
    has_onFinish: typeof onFinish === 'function',
    has_onImageUploaded: typeof onImageUploaded === 'function'
  });
  console.log('[HoldPostState] Button that WILL render:', isLastStage ? 'AVSLUTT STEVNE (green)' : 'NESTE HOLD (blue)');
  console.log('[HoldPostState] Button onClick handler:', isLastStage ? 'onFinish' : 'onNextHold');
  console.log('[HoldPostState] Stage clicks_to_zero:', stage.clicks_to_zero);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-3">
            <span className="text-3xl font-bold">✓</span>
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

        {isLastStage ? (
          <button
            onClick={() => {
              console.log('[HoldPostState] ========== FINISH BUTTON CLICKED ==========');
              console.log('[HoldPostState] Calling onFinish handler');
              onFinish();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            Avslutt stevne
          </button>
        ) : (
          <button
            onClick={() => {
              console.log('[HoldPostState] ========== NEXT HOLD BUTTON CLICKED ==========');
              console.log('[HoldPostState] Calling onNextHold handler');
              onNextHold();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            <span>Neste hold</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
