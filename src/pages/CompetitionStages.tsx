import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FieldFigureSelector } from '../components/FieldFigureSelector';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Competition, CompetitionStage, FieldFigure, CompetitionTemplate } from '../types/database';
import { Plus, Trash2, GripVertical, CreditCard as Edit2, Save, X, Target, AlertCircle } from 'lucide-react';

interface StageFormData {
  stage_number: number;
  name: string;
  figure_id: string;
  position: string;
  distance_m: number;
  clicks: number;
  prep_seconds: number;
  shoot_seconds: number;
  warning_seconds: number;
  cooldown_seconds: number;
  shots_count: number;
  notes: string;
}

export function CompetitionStages() {
  const { competitionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const template = (location.state as any)?.template as CompetitionTemplate | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stages, setStages] = useState<CompetitionStage[]>([]);
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [stageCount, setStageCount] = useState(template?.default_stages || 5);
  const [showFigureSelector, setShowFigureSelector] = useState<string | null>(null);

  const [formData, setFormData] = useState<StageFormData>({
    stage_number: 1,
    name: '',
    figure_id: '',
    position: 'liggende',
    distance_m: 0,
    clicks: 0,
    prep_seconds: template?.default_prep_time || 15,
    shoot_seconds: template?.default_shoot_time || 30,
    warning_seconds: 10,
    cooldown_seconds: 5,
    shots_count: template?.default_shots_per_stage || 1,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [competitionId, user]);

  const fetchData = async () => {
    if (!competitionId || !user) return;

    const [competitionRes, stagesRes, figuresRes] = await Promise.all([
      supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single(),
      supabase
        .from('competition_stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number'),
      supabase
        .from('field_figures')
        .select('*')
        .eq('is_active', true)
        .order('name'),
    ]);

    if (competitionRes.data) {
      setCompetition(competitionRes.data);
      if (competitionRes.data.user_id !== user.id) {
        navigate('/competitions');
        return;
      }
    }

    if (stagesRes.data) setStages(stagesRes.data);
    if (figuresRes.data) setFigures(figuresRes.data);

    setLoading(false);
  };

  const generateStages = async () => {
    if (!competitionId) return;

    setSaving(true);

    const newStages = Array.from({ length: stageCount }, (_, i) => ({
      competition_id: competitionId,
      stage_number: i + 1,
      name: null,
      figure_id: null,
      position: 'liggende',
      distance_m: null,
      clicks: null,
      prep_seconds: template?.default_prep_time || 15,
      shoot_seconds: template?.default_shoot_time || 30,
      warning_seconds: 10,
      cooldown_seconds: 5,
      shots_count: template?.default_shots_per_stage || 1,
      notes: null,
    }));

    const { error } = await supabase
      .from('competition_stages')
      .insert(newStages);

    if (error) {
      alert('Feil ved opprettelse av hold: ' + error.message);
      setSaving(false);
      return;
    }

    await fetchData();
    setSaving(false);
    setShowAddForm(false);
  };

  const addStage = async () => {
    if (!competitionId) return;

    setSaving(true);

    const { error } = await supabase
      .from('competition_stages')
      .insert({
        competition_id: competitionId,
        stage_number: formData.stage_number,
        name: formData.name || `Hold ${formData.stage_number}`,
        figure_id: formData.figure_id || null,
        position: formData.position,
        distance_m: formData.distance_m || null,
        clicks: formData.clicks || null,
        prep_seconds: formData.prep_seconds,
        shoot_seconds: formData.shoot_seconds,
        warning_seconds: formData.warning_seconds,
        cooldown_seconds: formData.cooldown_seconds,
        shots_count: formData.shots_count,
        notes: formData.notes || null,
      });

    if (error) {
      alert('Feil ved opprettelse av hold: ' + error.message);
      setSaving(false);
      return;
    }

    await fetchData();
    setSaving(false);
    setShowAddForm(false);
    resetForm();
  };

  const updateStage = async (stageId: string, updates: Partial<CompetitionStage>) => {
    const { error } = await supabase
      .from('competition_stages')
      .update(updates)
      .eq('id', stageId);

    if (error) {
      alert('Feil ved oppdatering: ' + error.message);
      return;
    }

    await fetchData();
  };

  const deleteStage = async (stageId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette holdet?')) return;

    const { error } = await supabase
      .from('competition_stages')
      .delete()
      .eq('id', stageId);

    if (error) {
      alert('Feil ved sletting: ' + error.message);
      return;
    }

    await fetchData();
  };

  const resetForm = () => {
    setFormData({
      stage_number: stages.length + 1,
      name: '',
      figure_id: '',
      position: 'liggende',
      distance_m: 0,
      clicks: 0,
      prep_seconds: 15,
      shoot_seconds: 30,
      warning_seconds: 10,
      cooldown_seconds: 5,
      shots_count: 5,
      notes: '',
    });
  };

  const getFigureName = (figureId: string | null) => {
    if (!figureId) return 'Ingen figur valgt';
    const figure = figures.find(f => f.id === figureId);
    if (!figure) return 'Ukjent';
    return `${figure.code} – ${figure.name}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{competition?.name}</h1>
          <p className="text-slate-600 mt-1">Oppsett av hold for feltstevne</p>
        </div>

        {stages.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="text-center mb-6">
              <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen hold lagt til ennå</h3>
              <p className="text-slate-600">Start med å generere hold automatisk eller legg til manuelt</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <label className="block text-sm font-medium text-slate-900 mb-3">
                Generer flere hold automatisk
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={stageCount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setStageCount(v ? parseInt(v) : 1);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-24 px-4 py-2 border border-slate-300 rounded-lg"
                />
                <span className="text-slate-600">hold</span>
                <button
                  onClick={generateStages}
                  disabled={saving}
                  className="ml-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                >
                  {saving ? 'Oppretter...' : 'Generer hold'}
                </button>
              </div>
            </div>

            <div className="text-center">
              <span className="text-slate-500">eller</span>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mt-6 px-6 py-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg font-semibold text-slate-700 hover:text-emerald-700 transition"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Legg til første hold manuelt
            </button>
          </div>
        ) : (
          <>
            {template && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-emerald-900">
                  <p className="font-semibold mb-1">Stevnemal: {template.name}</p>
                  <p className="text-emerald-700">
                    Tider og antall skudd er forhåndsutfylt basert på malen. Du kan endre verdiene under.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Viktig påminnelse</p>
                <p>Husk å stille kneppen tilbake til 0 etter siste hold!</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
              {stages.map((stage, index) => (
                <div key={stage.id} className="p-4 sm:p-6">
                  {editingStage === stage.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Holdnummer
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.stage_number}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v) updateStage(stage.id, { stage_number: parseInt(v) });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Navn (valgfritt)
                          </label>
                          <input
                            type="text"
                            defaultValue={stage.name || ''}
                            onBlur={(e) => updateStage(stage.id, { name: e.target.value || null })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Figur
                        </label>
                        {showFigureSelector === stage.id ? (
                          <div className="space-y-3">
                            <FieldFigureSelector
                              figures={figures}
                              selectedFigureId={stage.figure_id}
                              onSelect={(figureId) => {
                                updateStage(stage.id, { figure_id: figureId });
                                setShowFigureSelector(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowFigureSelector(null)}
                              className="text-sm text-slate-600 hover:text-slate-900"
                            >
                              Lukk figurvelger
                            </button>
                          </div>
                        ) : (
                          <div>
                            {stage.figure_id ? (
                              <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-emerald-900">
                                      {figures.find(f => f.id === stage.figure_id)?.code || 'Ukjent'}
                                    </span>
                                    <span className="text-emerald-700 ml-2 text-sm">
                                      {figures.find(f => f.id === stage.figure_id)?.name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowFigureSelector(stage.id)}
                                    className="text-sm text-emerald-700 hover:text-emerald-900"
                                  >
                                    Endre
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowFigureSelector(stage.id)}
                                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition"
                              >
                                Velg figur
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Stilling
                        </label>
                        <select
                          value={stage.position || 'liggende'}
                          onChange={(e) => updateStage(stage.id, { position: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        >
                          <option value="liggende">Liggende</option>
                          <option value="knestående">Knestående</option>
                          <option value="stående">Stående</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Avstand (m)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.distance_m || ''}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              updateStage(stage.id, { distance_m: v ? parseInt(v) : null });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="Avstand i meter"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Antall knepp
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.clicks || ''}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              updateStage(stage.id, { clicks: v ? parseInt(v) : null });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="Antall knepp"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Klargjøring (sek)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.prep_seconds}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v) updateStage(stage.id, { prep_seconds: parseInt(v) });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Skytetid (sek)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.shoot_seconds}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v) updateStage(stage.id, { shoot_seconds: parseInt(v) });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Advarsel (sek)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.warning_seconds}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v) updateStage(stage.id, { warning_seconds: parseInt(v) });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Antall skudd
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={stage.shots_count}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v) updateStage(stage.id, { shots_count: parseInt(v) });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Notater
                        </label>
                        <textarea
                          defaultValue={stage.notes || ''}
                          onBlur={(e) => updateStage(stage.id, { notes: e.target.value || null })}
                          className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                          rows={2}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingStage(null)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                        >
                          <Save className="w-4 h-4 inline mr-2" />
                          Ferdig
                        </button>
                        <button
                          onClick={() => setEditingStage(null)}
                          className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <X className="w-4 h-4 inline mr-2" />
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <GripVertical className="w-5 h-5 text-slate-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Hold {stage.stage_number}
                              {stage.name && stage.name.trim() !== '' && ` – ${stage.name}`}
                            </h3>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingStage(stage.id)}
                            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteStage(stage.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Figur:</span>
                          <p className="font-medium text-slate-900">{getFigureName(stage.figure_id)}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Stilling:</span>
                          <p className="font-medium text-slate-900 capitalize">{stage.position || 'Ikke satt'}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Avstand:</span>
                          <p className="font-medium text-slate-900">{stage.distance_m ? `${stage.distance_m}m` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Knepp:</span>
                          <p className="font-medium text-slate-900">{stage.clicks || '-'}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Skytetid:</span>
                          <p className="font-medium text-slate-900">{stage.shoot_seconds}s</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Skudd:</span>
                          <p className="font-medium text-slate-900">{stage.shots_count}</p>
                        </div>
                      </div>

                      {stage.notes && (
                        <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded p-3">
                          {stage.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                resetForm();
                setFormData({ ...formData, stage_number: stages.length + 1 });
                setShowAddForm(true);
              }}
              className="w-full mt-4 px-6 py-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg font-semibold text-slate-700 hover:text-emerald-700 transition"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Legg til nytt hold
            </button>
          </>
        )}

        {showAddForm && stages.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Legg til nytt hold</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Holdnummer
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.stage_number}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setFormData({ ...formData, stage_number: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Navn (valgfritt)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Figur
                    </label>
                    <select
                      value={formData.figure_id}
                      onChange={(e) => setFormData({ ...formData, figure_id: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Velg figur</option>
                      {figures.map((figure) => (
                        <option key={figure.id} value={figure.id}>
                          {figure.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Stilling
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="liggende">Liggende</option>
                      <option value="knestående">Knestående</option>
                      <option value="stående">Stående</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Avstand (m)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.distance_m || ''}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, distance_m: v ? parseInt(v) : 0 });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Avstand i meter"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Antall knepp
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.clicks || ''}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, clicks: v ? parseInt(v) : 0 });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Antall knepp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Klargjøring (sek)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.prep_seconds}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setFormData({ ...formData, prep_seconds: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Skytetid (sek)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.shoot_seconds}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setFormData({ ...formData, shoot_seconds: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Advarsel (sek)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.warning_seconds}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setFormData({ ...formData, warning_seconds: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Antall skudd
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.shots_count}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        if (v) setFormData({ ...formData, shots_count: parseInt(v) });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Notater
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={addStage}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                  >
                    {saving ? 'Legger til...' : 'Legg til hold'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            onClick={() => navigate('/competitions')}
            className="flex-1 px-4 sm:px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Tilbake til stevner
          </button>
          {stages.length > 0 && (
            <button
              onClick={() => navigate(`/competitions/${competitionId}`)}
              className="flex-1 px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
            >
              Ferdig med oppsett
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
