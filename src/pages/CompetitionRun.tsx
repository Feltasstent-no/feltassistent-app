import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Competition,
  CompetitionEntry,
  CompetitionStage,
  CompetitionStageImage,
  FieldFigure,
} from '../types/database';
import { HoldPreState } from '../components/competition/HoldPreState';
import { FieldClockDisplay } from '../components/competition/FieldClockDisplay';
import { HoldPostState } from '../components/competition/HoldPostState';
import { Info } from 'lucide-react';

export function CompetitionRun() {
  const navigate = useNavigate();
  const { competitionId, entryId } = useParams<{ competitionId: string; entryId: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entry, setEntry] = useState<CompetitionEntry | null>(null);
  const [stages, setStages] = useState<CompetitionStage[]>([]);
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [stageImages, setStageImages] = useState<CompetitionStageImage[]>([]);
  const [showPreMatchNote, setShowPreMatchNote] = useState(false);
  const [showPostMatchNote, setShowPostMatchNote] = useState(false);

  useEffect(() => {
    loadData();
  }, [competitionId, entryId, user]);

  const loadData = async () => {
    if (!competitionId || !entryId || !user) return;

    console.log('[CompetitionRun] ========== LOAD DATA START ==========');
    console.log('[CompetitionRun] competitionId:', competitionId);
    console.log('[CompetitionRun] entryId:', entryId);

    const [compRes, entryRes, stagesRes, figuresRes, imagesRes] = await Promise.all([
      supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .maybeSingle(),
      supabase
        .from('competition_entries')
        .select('*')
        .eq('id', entryId)
        .maybeSingle(),
      supabase
        .from('competition_stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number'),
      supabase
        .from('field_figures')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('competition_stage_images')
        .select('*')
        .eq('entry_id', entryId)
        .order('stage_number'),
    ]);

    if (compRes.data) setCompetition(compRes.data);
    if (entryRes.data) {
      setEntry(entryRes.data);
      console.log('[CompetitionRun] Entry loaded:', {
        current_stage_number: entryRes.data.current_stage_number,
        current_stage_state: entryRes.data.current_stage_state,
        status: entryRes.data.status
      });

      if (
        compRes.data?.competition_type === 'finfelt' &&
        entryRes.data.current_stage_number === 1 &&
        entryRes.data.current_stage_state === 'pre_hold'
      ) {
        setShowPreMatchNote(true);
      }
    }
    if (stagesRes.data) {
      setStages(stagesRes.data);
      console.log('[CompetitionRun] ========== STAGES FROM DATABASE ==========');
      console.log('[CompetitionRun] Total stages:', stagesRes.data.length);
      console.log('[CompetitionRun] Stages array is explicitly sorted by stage_number:', true);
      stagesRes.data.forEach((s, idx) => {
        console.log(`[CompetitionRun] Stage array[${idx}] → stage_number=${s.stage_number}:`, {
          stage_id: s.id,
          stage_number: s.stage_number,
          field_figure_id: s.field_figure_id,
          distance_m: s.distance_m,
          clicks: s.clicks,
          clicks_to_zero: s.clicks_to_zero
        });
      });
    }
    if (figuresRes.data) {
      setFigures(figuresRes.data);
      console.log('[CompetitionRun] ========== FIGURES FROM DATABASE ==========');
      console.log('[CompetitionRun] Total figures:', figuresRes.data.length);

      if (stagesRes.data && figuresRes.data) {
        console.log('[CompetitionRun] ========== STAGE → FIGURE MAPPING ==========');
        stagesRes.data.forEach((s, idx) => {
          const figure = figuresRes.data.find((f: any) => f.id === s.field_figure_id);
          console.log(`[CompetitionRun] Stage ${s.stage_number} (array[${idx}]):`, {
            stage_id: s.id,
            stage_number: s.stage_number,
            field_figure_id: s.field_figure_id,
            mapped_figure_code: figure?.code || 'NOT FOUND',
            mapped_figure_name: figure?.name || 'NOT FOUND',
            mapped_figure_id: figure?.id || 'NOT FOUND'
          });
        });
      }
    }
    if (imagesRes.data) setStageImages(imagesRes.data);

    console.log('[CompetitionRun] ========== LOAD DATA END ==========');
    setLoading(false);
  };

  const updateEntryState = async (
    stageNumber: number,
    stageState: string,
    status?: string
  ) => {
    if (!entryId) return;

    console.log('[CompetitionRun] ========== UPDATE ENTRY STATE ==========');
    console.log('[CompetitionRun] Updating to:', {
      stageNumber,
      stageState,
      status,
      entryId
    });

    const updates: any = {
      current_stage_number: stageNumber,
      current_stage_state: stageState,
    };

    if (status) {
      updates.status = status;
    }

    if (stageState === 'running' && !entry?.started_at) {
      updates.started_at = new Date().toISOString();
    }

    if (stageState === 'running') {
      updates.current_hold_started_at = new Date().toISOString();
    } else if (stageState !== 'running' && entry?.current_hold_started_at) {
      updates.current_hold_started_at = null;
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    console.log('[CompetitionRun] Updates to apply:', updates);

    const { data, error } = await supabase
      .from('competition_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .maybeSingle();

    console.log('[CompetitionRun] Update result:', { data, error });

    if (data && !error) {
      console.log('[CompetitionRun] Setting entry state to:', {
        current_stage_number: data.current_stage_number,
        current_stage_state: data.current_stage_state,
        status: data.status
      });
      setEntry(data);
    } else {
      console.error('[CompetitionRun] Failed to update entry:', error);
    }
  };

  const handleStartHold = async () => {
    if (!entry) return;

    console.log('[CompetitionRun] ========== START HOLD ==========');
    console.log('[CompetitionRun] Starting hold:', entry.current_stage_number);

    if (showPreMatchNote) {
      setShowPreMatchNote(false);
    }

    await updateEntryState(entry.current_stage_number, 'running', 'in_progress');
  };

  const handleTimeUp = async () => {
    if (!entry || !competition) return;

    console.log('[TIMEOUT] ========== TIMEOUT REACHED ==========');
    console.log('[STATE BEFORE] entry.current_stage_number:', entry.current_stage_number);
    console.log('[STATE BEFORE] entry.current_stage_state:', entry.current_stage_state);
    console.log('[STATE BEFORE] entry.status:', entry.status);
    console.log('[STATE BEFORE] entry.id:', entry.id);
    console.log('[STATE BEFORE] Total stages:', stages.length);
    console.log('[STATE BEFORE] Is last stage:', entry.current_stage_number >= stages.length);

    console.log('[TIMEOUT] Calling updateEntryState to set post_hold...');
    await updateEntryState(entry.current_stage_number, 'post_hold');

    console.log('[TIMEOUT] updateEntryState completed');
    console.log('[STATE AFTER] entry.current_stage_state:', entry.current_stage_state);
    console.log('[STATE AFTER] Should now be post_hold');
  };

  const handleNextHold = async () => {
    if (!entry) return;

    const nextStageNumber = entry.current_stage_number + 1;

    console.log('[CompetitionRun] ========== NEXT HOLD ==========');
    console.log('[CompetitionRun] Current stage:', entry.current_stage_number);
    console.log('[CompetitionRun] Next stage will be:', nextStageNumber);
    console.log('[CompetitionRun] Total stages:', stages.length);

    const nextStage = stages.find(s => s.stage_number === nextStageNumber);
    console.log('[CompetitionRun] Next stage preview:', nextStage ? {
      stage_id: nextStage.id,
      stage_number: nextStage.stage_number,
      field_figure_id: nextStage.field_figure_id,
      distance_m: nextStage.distance_m,
      clicks: nextStage.clicks
    } : 'NOT FOUND (will complete)');

    if (nextStageNumber > stages.length) {
      console.log('[CompetitionRun] No more stages - completing competition');
      await updateEntryState(entry.current_stage_number, 'completed', 'completed');
      navigate(`/competitions/${competitionId}`);
    } else {
      console.log('[CompetitionRun] Advancing to stage:', nextStageNumber);
      await updateEntryState(nextStageNumber, 'pre_hold');
    }
  };

  const handleFinish = async () => {
    console.log('[CompetitionRun] ========== FINISH COMPETITION ==========');
    console.log('[CompetitionRun] handleFinish called', {
      current_stage: entry?.current_stage_number,
      total_stages: stages.length,
      entryId
    });
    await updateEntryState(entry?.current_stage_number || stages.length, 'completed', 'completed');
    console.log('[CompetitionRun] Navigating to summary page');
    navigate(`/competitions/entry/${entryId}/summary`);
  };

  const handlePostMatchNoteContinue = () => {
    setShowPostMatchNote(false);
    handleFinish();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-lg">Laster...</div>
      </div>
    );
  }

  if (!competition || !entry || stages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Stevnet kunne ikke lastes</p>
          <button
            onClick={() => navigate('/competitions')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Tilbake til stevner
          </button>
        </div>
      </div>
    );
  }

  console.log('[CompetitionRun] ========== FINDING CURRENT STAGE ==========');
  console.log('[CompetitionRun] entry.current_stage_number:', entry.current_stage_number);
  console.log('[CompetitionRun] stages.length:', stages.length);
  console.log('[CompetitionRun] Available stages FULL ARRAY:');
  stages.forEach((s, idx) => {
    console.log(`  [${idx}] stage_number=${s.stage_number} | id=${s.id} | field_figure_id=${s.field_figure_id}`);
  });

  console.log('[CompetitionRun] Looking for stage with stage_number:', entry.current_stage_number);
  const currentStage = stages.find(s => s.stage_number === entry.current_stage_number);
  console.log('[CompetitionRun] Result of stages.find(s => s.stage_number === entry.current_stage_number):', currentStage ? 'FOUND' : 'NOT FOUND');

  console.log('[CompetitionRun] currentStage found:', !!currentStage);
  if (currentStage) {
    console.log('[CompetitionRun] ========== CURRENT STAGE DETAILS ==========');
    console.log('[CompetitionRun] currentStage:', {
      stage_id: currentStage.id,
      stage_number: currentStage.stage_number,
      field_figure_id: currentStage.field_figure_id,
      distance_m: currentStage.distance_m,
      clicks: currentStage.clicks
    });
  } else {
    console.error('[CompetitionRun] ⚠️ CURRENT STAGE NOT FOUND!');
    console.error('[CompetitionRun] Searching for stage_number:', entry.current_stage_number);
    console.error('[CompetitionRun] Available stage_numbers:', stages.map(s => s.stage_number));
  }

  console.log('[CompetitionRun] ========== MAPPING CURRENT FIGURE ==========');
  console.log('[CompetitionRun] currentStage.field_figure_id:', currentStage?.field_figure_id);

  if (!currentStage) {
    console.error('[CompetitionRun] ❌ NO CURRENT STAGE - CANNOT MAP FIGURE!');
    console.error('[CompetitionRun] This means entry.current_stage_number does not match any stage in stages array');
    console.error('[CompetitionRun] entry.current_stage_number:', entry.current_stage_number);
    console.error('[CompetitionRun] stages.map(s => s.stage_number):', stages.map(s => s.stage_number));
  }

  const currentFigure = currentStage?.field_figure_id
    ? figures.find(f => f.id === currentStage.field_figure_id) || null
    : null;

  console.log('[CompetitionRun] currentFigure found:', !!currentFigure);
  if (currentFigure) {
    console.log('[CompetitionRun] ========== ✅ CURRENT HOLD COMPLETE MAPPING ==========');
    console.log('[CompetitionRun] Entry Current Stage Number:', entry.current_stage_number);
    console.log('[CompetitionRun] Found Stage:', {
      stage_id: currentStage?.id,
      stage_number: currentStage?.stage_number,
      field_figure_id: currentStage?.field_figure_id,
      field_figure_code: currentStage?.field_figure_code,
      field_figure_name: currentStage?.field_figure_name
    });
    console.log('[CompetitionRun] Mapped Figure:', {
      figure_id: currentFigure.id,
      code: currentFigure.code,
      name: currentFigure.name,
      has_svg: !!currentFigure.svg_data,
      has_image_url: !!currentFigure.image_url
    });
    console.log('[CompetitionRun] 🔍 VERIFY: Stage.field_figure_code should match Figure.code');
    console.log('[CompetitionRun] 🔍 Stage debug code:', currentStage?.field_figure_code || 'NULL');
    console.log('[CompetitionRun] 🔍 Actual figure code:', currentFigure.code);
    console.log('[CompetitionRun] 🔍 Match?', currentStage?.field_figure_code === currentFigure.code ? '✅ YES' : '❌ NO - WRONG FIGURE!');
  } else if (currentStage?.field_figure_id) {
    console.error('[CompetitionRun] ========== ❌ FIGURE NOT FOUND ==========');
    console.error('[CompetitionRun] Looking for figure with id:', currentStage.field_figure_id);
    console.error('[CompetitionRun] Available figures (first 10):', figures.slice(0, 10).map(f => ({
      id: f.id,
      code: f.code
    })));
  }

  const isFinfelt = competition.competition_type === 'finfelt';
  const isGrovfelt = competition.competition_type === 'grovfelt';

  // Log current hold and figure mapping
  useEffect(() => {
    if (currentStage && currentFigure) {
      console.log('[CompetitionRun] ========== CURRENT HOLD RENDER ==========');
      console.log('[CompetitionRun] Hold number:', currentStage.stage_number);
      console.log('[CompetitionRun] Stage data:', {
        stage_id: currentStage.id,
        stage_number: currentStage.stage_number,
        field_figure_id: currentStage.field_figure_id,
        distance_m: currentStage.distance_m,
        clicks: currentStage.clicks
      });
      console.log('[CompetitionRun] Figure data:', {
        figure_id: currentFigure.id,
        code: currentFigure.code,
        name: currentFigure.name,
        has_svg: !!currentFigure.svg_data,
        svg_length: currentFigure.svg_data?.length || 0
      });
      console.log('[CompetitionRun] State:', entry.current_stage_state);
    } else if (currentStage && !currentFigure) {
      console.warn('[CompetitionRun] ⚠️ FIGURE NOT FOUND for stage:', {
        stage_number: currentStage.stage_number,
        field_figure_id: currentStage.field_figure_id,
        total_figures: figures.length
      });
    }
  }, [currentStage?.stage_number, currentFigure?.id, entry.current_stage_state]);

  // Debug logging
  useEffect(() => {
    if (stages.length > 0 && figures.length > 0) {
      console.log('[CompetitionRun] ALL STAGES:', stages.map(s => ({
        stage_number: s.stage_number,
        field_figure_id: s.field_figure_id,
        figure_code: figures.find(f => f.id === s.field_figure_id)?.code || 'NOT FOUND'
      })));
    }
  }, [stages, figures]);

  useEffect(() => {
    if (currentStage) {
      console.log('[CompetitionRun] Current Stage:', {
        stage_number: currentStage.stage_number,
        field_figure_id: currentStage.field_figure_id,
        figure_found: currentFigure ? {
          id: currentFigure.id,
          code: currentFigure.code,
          name: currentFigure.name,
          has_svg: !!currentFigure.svg_data,
          svg_preview: currentFigure.svg_data?.substring(0, 100)
        } : 'NOT FOUND',
        total_figures: figures.length
      });
    }
  }, [currentStage, currentFigure, figures.length]);

  if (showPreMatchNote && isFinfelt) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Finfelt</h1>
            <p className="text-xl text-gray-400">{competition.name}</p>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-2xl p-4 sm:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <Info className="w-8 h-8 text-blue-400 mt-1 flex-shrink-0" />
              <div className="space-y-4 text-blue-200">
                <p className="text-lg font-semibold">Før første hold:</p>
                <p className="text-xl">
                  Husk å stille fra for eksempel 15m til 100m før du starter.
                </p>
                <p className="text-gray-400">
                  Alle finfeltholdene er 100m.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartHold}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-2xl py-6 rounded-xl transition-colors"
          >
            Forstått - Start første hold
          </button>
        </div>
      </div>
    );
  }

  if (showPostMatchNote && isFinfelt) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-600 rounded-full mb-6">
              <span className="text-5xl">✓</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Finfelt ferdig!</h1>
            <p className="text-xl text-gray-400">{competition.name}</p>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <Info className="w-8 h-8 text-yellow-400 mt-1 flex-shrink-0" />
              <div className="space-y-4 text-yellow-200">
                <p className="text-lg font-semibold">Etter siste hold:</p>
                <p className="text-xl">
                  Husk å stille tilbake fra 100m til 15m.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handlePostMatchNoteContinue}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-2xl py-6 rounded-xl transition-colors"
          >
            Avslutt stevne
          </button>
        </div>
      </div>
    );
  }

  console.log('[RENDER CHECK] ========== DECIDING WHAT TO RENDER ==========');
  console.log('[RENDER CHECK] entry.current_stage_state:', entry.current_stage_state);
  console.log('[RENDER CHECK] entry.current_stage_number:', entry.current_stage_number);
  console.log('[RENDER CHECK] entry.status:', entry.status);
  console.log('[RENDER CHECK] currentStage exists:', !!currentStage);
  console.log('[RENDER CHECK] currentFigure exists:', !!currentFigure);

  const shouldRenderPreHold = entry.current_stage_state === 'pre_hold';
  const shouldRenderRunning = entry.current_stage_state === 'running';
  const shouldRenderPostHold = entry.current_stage_state === 'post_hold';
  const shouldRenderCompleted = entry.current_stage_state === 'completed';

  console.log('[RENDER CHECK] shouldRenderPreHold:', shouldRenderPreHold);
  console.log('[RENDER CHECK] shouldRenderRunning:', shouldRenderRunning);
  console.log('[RENDER CHECK] shouldRenderPostHold:', shouldRenderPostHold);
  console.log('[RENDER CHECK] shouldRenderCompleted:', shouldRenderCompleted);

  if (!currentStage) {
    console.log('[RENDER BRANCH] No currentStage - showing error');
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Hold ikke funnet</p>
          <button
            onClick={() => navigate('/competitions')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Tilbake til stevner
          </button>
        </div>
      </div>
    );
  }

  if (entry.current_stage_state === 'pre_hold') {
    console.log('[RENDER BRANCH] Rendering HoldPreState');
    return (
      <HoldPreState
        stage={currentStage}
        figure={currentFigure}
        competitionType={competition.competition_type as 'grovfelt' | 'finfelt'}
        onStartHold={handleStartHold}
      />
    );
  }

  if (entry.current_stage_state === 'running') {
    console.log('[RENDER BRANCH] Rendering FieldClockDisplay (running state)');
    console.log('[RENDER BRANCH] Hold started at:', entry.current_hold_started_at);
    return (
      <FieldClockDisplay
        stage={currentStage}
        figure={currentFigure}
        holdStartedAt={entry.current_hold_started_at}
        onTimeUp={handleTimeUp}
      />
    );
  }

  if (entry.current_stage_state === 'post_hold') {
    const isLastStage = entry.current_stage_number >= stages.length;
    const currentStageImage = stageImages.find(
      img => img.stage_number === entry.current_stage_number
    );

    console.log('[RENDER BRANCH] Rendering HoldPostState');
    console.log('[RENDER BRANCH] post_hold details:', {
      current_stage: entry.current_stage_number,
      total_stages: stages.length,
      isLastStage,
      button_will_show: isLastStage ? 'Avslutt stevne' : 'Neste hold',
      has_existing_image: !!currentStageImage
    });

    return (
      <HoldPostState
        stage={currentStage}
        isLastStage={isLastStage}
        entryId={entry.id}
        existingImage={currentStageImage}
        onNextHold={handleNextHold}
        onFinish={handleFinish}
        onImageUploaded={loadData}
      />
    );
  }

  console.log('[CompetitionRun] ========== FALLTHROUGH: INVALID STATE ==========');
  console.log('[CompetitionRun] Entry state was:', entry.current_stage_state);
  console.log('[CompetitionRun] Expected one of: pre_hold, running, post_hold, completed');
  console.log('[CompetitionRun] Entry data:', {
    id: entry.id,
    current_stage_number: entry.current_stage_number,
    current_stage_state: entry.current_stage_state,
    status: entry.status
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl">Ugyldig tilstand: {entry.current_stage_state}</p>
        <p className="text-sm text-gray-400 mt-2">Se console for detaljer</p>
        <button
          onClick={() => navigate('/competitions')}
          className="mt-4 text-blue-400 hover:text-blue-300"
        >
          Tilbake til stevner
        </button>
      </div>
    </div>
  );
}
