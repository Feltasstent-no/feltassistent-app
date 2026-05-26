import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useWakeLock } from '../lib/use-wake-lock';
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
import { UnknownHoldSetup } from '../components/competition/UnknownHoldSetup';
import { Info } from 'lucide-react';
import { UploadQueueToast } from '../components/UploadQueueStatus';

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

  useWakeLock(!loading && !!entry && entry.status !== 'completed');

  useEffect(() => {
    loadData();
  }, [competitionId, entryId, user]);

  const loadData = async () => {
    if (!competitionId || !entryId || !user) return;

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
    }
    if (figuresRes.data) {
      setFigures(figuresRes.data);
    }
    if (imagesRes.data) setStageImages(imagesRes.data);

    setLoading(false);
  };

  const updateEntryState = async (
    stageNumber: number,
    stageState: string,
    status?: string
  ) => {
    if (!entryId) return;

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

    const { data, error } = await supabase
      .from('competition_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .maybeSingle();

    if (data && !error) {
      setEntry(data);
    } else if (error) {
      console.error('[CompetitionRun] Failed to update entry:', error);
    }
  };

  const handleStartHold = async () => {
    if (!entry) return;

    if (showPreMatchNote) {
      setShowPreMatchNote(false);
    }

    await updateEntryState(entry.current_stage_number, 'running', 'in_progress');
  };

  const handleTimeUp = async () => {
    if (!entry || !competition) return;

    await updateEntryState(entry.current_stage_number, 'post_hold');
  };

  const handleNextHold = async () => {
    if (!entry) return;

    const nextStageNumber = entry.current_stage_number + 1;

    if (nextStageNumber > stages.length) {
      await updateEntryState(entry.current_stage_number, 'completed', 'completed');
      navigate(`/competitions/${competitionId}`);
    } else {
      await updateEntryState(nextStageNumber, 'pre_hold');
    }
  };

  const handleFinish = async () => {
    await updateEntryState(entry?.current_stage_number || stages.length, 'completed', 'completed');
    navigate(`/competitions/entry/${entryId}/summary`);
  };

  const handleAddHold = async (data: {
    distance_m: number | null;
    total_shots: number;
    time_limit_seconds: number;
    field_figure_id: string | null;
  }) => {
    if (!competitionId || !competition) return;

    const newStageNumber = stages.length + 1;
    const figure = data.field_figure_id
      ? figures.find(f => f.id === data.field_figure_id)
      : null;

    const { error } = await supabase
      .from('competition_stages')
      .insert({
        competition_id: competitionId,
        stage_number: newStageNumber,
        field_figure_id: data.field_figure_id,
        field_figure_code: figure?.code || null,
        field_figure_name: figure?.name || null,
        distance_m: data.distance_m,
        total_shots: data.total_shots,
        time_limit_seconds: data.time_limit_seconds,
        clicks: null,
        clicks_to_zero: null,
        notes: null,
      });

    if (error) {
      console.error('[CompetitionRun] Error adding hold:', error);
      return;
    }

    await supabase
      .from('competitions')
      .update({ total_stages: newStageNumber })
      .eq('id', competitionId);

    await loadData();
  };

  const handleUnknownHoldConfirm = async (config: {
    field_figure_id: string;
    distance_m: number;
    clicks: number | null;
    clicks_to_zero: number | null;
    wind_clicks: number | null;
  }) => {
    if (!currentStage || !competitionId) return;

    const figure = figures.find(f => f.id === config.field_figure_id);

    await supabase
      .from('competition_stages')
      .update({
        field_figure_id: config.field_figure_id,
        field_figure_code: figure?.code || null,
        field_figure_name: figure?.name || null,
        distance_m: config.distance_m,
        clicks: config.clicks,
        clicks_to_zero: config.clicks_to_zero,
      })
      .eq('id', currentStage.id);

    await loadData();
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

  const currentStage = stages.find(s => s.stage_number === entry.current_stage_number);

  const currentFigure = currentStage?.field_figure_id
    ? figures.find(f => f.id === currentStage.field_figure_id) || null
    : null;

  const isFinfelt = competition.competition_type === 'finfelt';
  const isGrovfelt = competition.competition_type === 'grovfelt';


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

  if (!currentStage) {
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
    const isUnknownHold = competition.distance_mode === 'ukjent';
    const stageNeedsSetup = isUnknownHold && !currentStage.field_figure_id;

    if (stageNeedsSetup) {
      const categoryFigures = figures.filter(f => {
        if (competition.competition_type === 'grovfelt') return f.category === 'grovfelt';
        if (competition.competition_type === 'finfelt') return f.category === 'finfelt';
        return true;
      });

      return (
        <UnknownHoldSetup
          stage={currentStage}
          stageIndex={entry.current_stage_number - 1}
          totalStages={stages.length}
          figures={categoryFigures}
          clickTableId={entry.click_table_id}
          competitionType={competition.competition_type as 'grovfelt' | 'finfelt'}
          onConfirm={handleUnknownHoldConfirm}
        />
      );
    }

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

    return (
      <>
        <HoldPostState
          stage={currentStage}
          isLastStage={isLastStage}
          entryId={entry.id}
          existingImage={currentStageImage}
          figures={figures}
          competitionType={competition.competition_type as 'grovfelt' | 'finfelt'}
          onNextHold={handleNextHold}
          onFinish={handleFinish}
          onImageUploaded={loadData}
          onAddHold={handleAddHold}
        />
        <UploadQueueToast />
      </>
    );
  }

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
