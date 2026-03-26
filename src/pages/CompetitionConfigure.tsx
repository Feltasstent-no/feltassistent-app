import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Info, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Competition, CompetitionStage, FieldFigure, ClickTable, ClickTableRow } from '../types/database';
import { StageConfigCard } from '../components/StageConfigCard';

export default function CompetitionConfigure() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stages, setStages] = useState<Partial<CompetitionStage>[]>([]);
  const [availableFigures, setAvailableFigures] = useState<FieldFigure[]>([]);
  const [clickTable, setClickTable] = useState<ClickTable | null>(null);
  const [clickTableRows, setClickTableRows] = useState<ClickTableRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (id && user) {
      loadCompetition();
      loadActiveClickTable();
    }
  }, [id, user]);

  useEffect(() => {
    if (competition) {
      loadFieldFigures();
    }
  }, [competition]);

  const loadCompetition = async () => {
    if (!id) return;

    const { data: comp, error: compError } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (compError) {
      console.error('Error loading competition:', compError);
      return;
    }

    if (!comp) {
      navigate('/competitions');
      return;
    }

    setCompetition(comp);

    const { data: existingStages } = await supabase
      .from('competition_stages')
      .select('*')
      .eq('competition_id', id)
      .order('stage_number');

    console.log('[CompetitionConfigure] ========== LOADING EXISTING STAGES ==========');
    if (existingStages && existingStages.length > 0) {
      console.log('[CompetitionConfigure] Found existing stages:', existingStages.length);
      existingStages.forEach((s, idx) => {
        console.log(`[CompetitionConfigure] Loaded Stage ${idx + 1}:`, {
          id: s.id,
          stage_number: s.stage_number,
          field_figure_id: s.field_figure_id,
          distance_m: s.distance_m,
          clicks: s.clicks
        });
      });
      setStages(existingStages);
    } else {
      console.log('[CompetitionConfigure] No existing stages, creating empty:', comp.total_stages);
      const initialStages: Partial<CompetitionStage>[] = Array.from(
        { length: comp.total_stages },
        (_, i) => ({
          competition_id: id,
          stage_number: i + 1,
          field_figure_id: null,
          distance_m: comp.competition_type === 'finfelt' ? 100 : null,
          clicks: null,
          clicks_to_zero: null,
          total_shots: 1,
          time_limit_seconds: 15,
          notes: null,
        })
      );
      setStages(initialStages);
    }

    setLoading(false);
  };

  const loadFieldFigures = async () => {
    if (!competition) return;

    console.log('[CompetitionConfigure] ========== LOADING AVAILABLE FIGURES ==========');
    console.log('[CompetitionConfigure] Competition type:', competition.competition_type);

    let query = supabase
      .from('field_figures')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (competition.competition_type === 'finfelt') {
      console.log('[CompetitionConfigure] Filtering for finfelt figures');
      query = query.eq('category', 'finfelt');
    } else if (competition.competition_type === 'grovfelt') {
      query = query.eq('category', 'grovfelt');
    }

    const { data } = await query;
    console.log('[CompetitionConfigure] Loaded figures:', data?.length || 0);
    if (data && data.length > 0) {
      data.slice(0, 10).forEach(f => {
        console.log('[CompetitionConfigure] Available figure:', {
          id: f.id,
          code: f.code,
          name: f.name,
          category: f.category
        });
      });
    }
    setAvailableFigures(data || []);
  };

  const loadActiveClickTable = async () => {
    if (!user) return;

    const { data: activeSetup } = await supabase
      .from('user_active_setup')
      .select('click_table_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (activeSetup?.click_table_id) {
      const { data: table } = await supabase
        .from('click_tables')
        .select('*')
        .eq('id', activeSetup.click_table_id)
        .maybeSingle();

      if (table) {
        setClickTable(table);

        const { data: rows } = await supabase
          .from('click_table_rows')
          .select('*')
          .eq('click_table_id', table.id)
          .order('distance_m');

        setClickTableRows(rows || []);
      }
    }
  };

  const updateStage = (index: number, updates: Partial<CompetitionStage>) => {
    console.log(`[CompetitionConfigure] ========== UPDATE STAGE ${index + 1} ==========`);
    console.log(`[CompetitionConfigure] Updates for stage ${index + 1}:`, updates);

    setStages(prev => {
      const newStages = [...prev];
      const oldStage = newStages[index];
      newStages[index] = { ...oldStage, ...updates };

      console.log(`[CompetitionConfigure] Stage ${index + 1} after update:`, {
        stage_number: newStages[index].stage_number,
        field_figure_id: newStages[index].field_figure_id,
        distance_m: newStages[index].distance_m,
        clicks: newStages[index].clicks
      });

      return newStages;
    });
  };

  const addStage = () => {
    const newStageNumber = stages.length + 1;
    setStages(prev => [
      ...prev,
      {
        competition_id: id,
        stage_number: newStageNumber,
        field_figure_id: null,
        distance_m: competition?.competition_type === 'finfelt' ? 100 : null,
        clicks: null,
        clicks_to_zero: null,
        total_shots: 1,
        time_limit_seconds: 15,
        notes: null,
      },
    ]);
  };

  const removeStage = (index: number) => {
    setStages(prev => {
      const newStages = prev.filter((_, i) => i !== index);
      return newStages.map((stage, i) => ({
        ...stage,
        stage_number: i + 1,
      }));
    });
  };

  const validateStages = (): string[] => {
    const errors: string[] = [];

    if (stages.length === 0) {
      errors.push('Stevnet må ha minst ett hold');
      return errors;
    }

    stages.forEach((stage, index) => {
      const holdNumber = stage.stage_number || index + 1;

      if (!stage.field_figure_id) {
        errors.push(`Hold ${holdNumber}: Velg en figur`);
      }

      if (competition?.competition_type === 'grovfelt') {
        if (!stage.distance_m) {
          errors.push(`Hold ${holdNumber}: Angi avstand`);
        }
      }

      if (competition?.competition_type === 'finfelt') {
        if (!stage.field_figure_id) {
          errors.push(`Hold ${holdNumber}: Velg en figur`);
        }
      }
    });

    return errors;
  };

  const saveConfiguration = async () => {
    if (!id || !competition) return;

    const errors = validateStages();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);
    setSaving(true);

    const { error: deleteError } = await supabase
      .from('competition_stages')
      .delete()
      .eq('competition_id', id);

    if (deleteError) {
      console.error('Error deleting old stages:', deleteError);
      setSaving(false);
      return;
    }

    const stagesToInsert = stages.map(stage => {
      const figure = availableFigures.find(f => f.id === stage.field_figure_id);
      return {
        competition_id: id,
        stage_number: stage.stage_number,
        field_figure_id: stage.field_figure_id,
        field_figure_code: figure?.code || null,
        field_figure_name: figure?.name || null,
        distance_m: stage.distance_m,
        clicks: stage.clicks,
        clicks_to_zero: stage.clicks_to_zero,
        total_shots: stage.total_shots || 1,
        time_limit_seconds: stage.time_limit_seconds || 15,
        notes: stage.notes,
      };
    });

    console.log('[CompetitionConfigure] ========== SAVING STAGES ==========');
    stagesToInsert.forEach((s, idx) => {
      const figure = availableFigures.find(f => f.id === s.field_figure_id);
      console.log(`[CompetitionConfigure] Stage ${idx + 1} (stage_number=${s.stage_number}):`, {
        field_figure_id: s.field_figure_id,
        figure_code: figure?.code || 'NOT FOUND',
        figure_name: figure?.name || 'NOT FOUND',
        distance_m: s.distance_m,
        clicks: s.clicks
      });
    });

    const { data: insertedStages, error: insertError } = await supabase
      .from('competition_stages')
      .insert(stagesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting stages:', insertError);
      setSaving(false);
      return;
    }

    console.log('[CompetitionConfigure] ========== DB SAVE VERIFICATION ==========');
    console.log('[CompetitionConfigure] Inserted stages count:', insertedStages?.length || 0);

    const { data: verifyStages } = await supabase
      .from('competition_stages')
      .select(`
        id,
        stage_number,
        field_figure_id,
        distance_m,
        clicks,
        field_figures (
          id,
          code,
          name
        )
      `)
      .eq('competition_id', id)
      .order('stage_number');

    console.log('[CompetitionConfigure] ========== VERIFIED FROM DB ==========');
    if (verifyStages) {
      verifyStages.forEach((stage: any) => {
        console.log(`[CompetitionConfigure] DB Stage ${stage.stage_number}:`, {
          stage_id: stage.id,
          stage_number: stage.stage_number,
          field_figure_id: stage.field_figure_id,
          figure_code: stage.field_figures?.code || 'NULL',
          figure_name: stage.field_figures?.name || 'NULL',
          distance_m: stage.distance_m,
          clicks: stage.clicks
        });
      });
    }

    const { error: updateError } = await supabase
      .from('competitions')
      .update({
        total_stages: stages.length,
        status: 'configured',
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating competition:', updateError);
    }

    setSaving(false);
    const from = searchParams.get('from');
    if (from === 'start') {
      navigate(`/competitions/${id}/start`);
    } else {
      navigate(`/competitions/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-lg">Laster...</div>
      </div>
    );
  }

  if (!competition) {
    return null;
  }

  const isFinfelt = competition.competition_type === 'finfelt';
  const isGrovfelt = competition.competition_type === 'grovfelt';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => {
              const from = searchParams.get('from');
              if (from === 'start') {
                navigate(`/competitions/${id}/start`);
              } else {
                navigate(`/competitions/${id}`);
              }
            }}
            className="p-2 hover:bg-gray-800 rounded transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{competition.name}</h1>
            <p className="text-gray-400">
              Konfigurer hold - {isFinfelt ? 'Finfelt' : isGrovfelt ? 'Grovfelt' : 'Bane'}
            </p>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-200">
                <p className="font-semibold mb-2">Kan ikke lagre stevne:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-red-300">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {isFinfelt && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">Finfelt: Alle hold er 100m</p>
                <p className="text-blue-300">
                  Før første hold: Husk å stille fra f.eks. 15m til 100m
                </p>
                <p className="text-blue-300">
                  Etter siste hold: Husk å stille tilbake fra 100m til 15m
                </p>
              </div>
            </div>
          </div>
        )}

        {isGrovfelt && !clickTable && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-semibold mb-1">Ingen aktiv knepptabell</p>
                <p className="text-yellow-300">
                  For å beregne knepp automatisk, sett en aktiv knepptabell i innstillinger.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {stages.map((stage, index) => (
            <StageConfigCard
              key={index}
              stageNumber={stage.stage_number || index + 1}
              competitionType={competition.competition_type as 'grovfelt' | 'finfelt'}
              fieldFigureId={stage.field_figure_id || null}
              distanceM={stage.distance_m || null}
              clicks={stage.clicks || null}
              clicksToZero={stage.clicks_to_zero || null}
              notes={stage.notes || null}
              onUpdate={(updates) => updateStage(index, updates)}
              onRemove={() => removeStage(index)}
              availableFigures={availableFigures}
              clickTable={clickTable}
              clickTableRows={clickTableRows}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={addStage}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            <Plus className="w-5 h-5" />
            Legg til hold
          </button>

          <button
            onClick={saveConfiguration}
            disabled={saving || stages.length === 0}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors sm:ml-auto"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Lagrer...' : 'Lagre stevne'}
          </button>
        </div>
      </div>
    </div>
  );
}
