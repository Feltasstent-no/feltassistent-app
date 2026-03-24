import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { AdminTemplates } from '../components/AdminTemplates';
import { AdminShooterClasses } from '../components/AdminShooterClasses';
import { AdminDisciplines } from '../components/AdminDisciplines';
import { AdminPresets } from '../components/AdminPresets';
import { AdminAmmoProfiles } from '../components/AdminAmmoProfiles';
import { AdminFieldFigures } from '../components/AdminFieldFigures';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ShooterClass, Discipline, FieldClockPreset, Competition, FieldFigure, CompetitionTemplate } from '../types/database';
import { Shield, AlertCircle, Plus, Trophy, X, FileText } from 'lucide-react';

export function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shooterClasses, setShooterClasses] = useState<ShooterClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [presets, setPresets] = useState<FieldClockPreset[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [templates, setTemplates] = useState<CompetitionTemplate[]>([]);
  const [showNewCompetition, setShowNewCompetition] = useState(false);

  const [compForm, setCompForm] = useState({
    name: '',
    description: '',
    competition_type: 'felt' as 'bane' | 'felt',
    discipline_id: '',
    location: '',
    competition_date: new Date().toISOString().split('T')[0],
    is_public: true,
  });

  const [stages, setStages] = useState<Array<{
    stage_number: number;
    name: string;
    figure_id: string;
    position: string;
    prep_seconds: number;
    shoot_seconds: number;
    warning_seconds: number;
    cooldown_seconds: number;
    shots_count: number;
  }>>([]);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('app_admins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setIsAdmin(!!data);

    if (data) {
      fetchData();
    }

    setLoading(false);
  };

  const fetchData = async () => {
    const [classesRes, disciplinesRes, presetsRes, competitionsRes, figuresRes, templatesRes] = await Promise.all([
      supabase.from('shooter_classes').select('*').order('sort_order'),
      supabase.from('disciplines').select('*').order('name'),
      supabase.from('field_clock_presets').select('*').order('name'),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
      supabase.from('field_figures').select('*').eq('is_active', true).order('code'),
      supabase.from('competition_templates').select('*').order('name'),
    ]);

    if (classesRes.data) setShooterClasses(classesRes.data);
    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);
    if (presetsRes.data) setPresets(presetsRes.data);
    if (competitionsRes.data) setCompetitions(competitionsRes.data);
    if (figuresRes.data) setFigures(figuresRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);
  };

  const addStage = () => {
    setStages([
      ...stages,
      {
        stage_number: stages.length + 1,
        name: '',
        figure_id: '',
        position: 'liggende',
        prep_seconds: 15,
        shoot_seconds: 60,
        warning_seconds: 10,
        cooldown_seconds: 10,
        shots_count: 5,
      },
    ]);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: string, value: any) => {
    const newStages = [...stages];
    (newStages[index] as any)[field] = value;
    setStages(newStages);
  };

  const handleCreateCompetition = async () => {
    if (!user || !compForm.name) {
      alert('Fyll inn navn');
      return;
    }

    const { data: compData, error: compError } = await supabase
      .from('competitions')
      .insert({
        created_by: user.id,
        name: compForm.name,
        description: compForm.description || null,
        competition_type: compForm.competition_type,
        discipline_id: compForm.discipline_id || null,
        location: compForm.location || null,
        competition_date: compForm.competition_date || null,
        is_public: compForm.is_public,
        is_active: true,
      })
      .select()
      .single();

    if (compError || !compData) {
      alert('Kunne ikke opprette stevne');
      return;
    }

    if (stages.length > 0) {
      const stageInserts = stages.map((stage) => ({
        competition_id: compData.id,
        stage_number: stage.stage_number,
        name: stage.name || `Hold ${stage.stage_number}`,
        figure_id: stage.figure_id || null,
        position: stage.position,
        prep_seconds: stage.prep_seconds,
        shoot_seconds: stage.shoot_seconds,
        warning_seconds: stage.warning_seconds,
        cooldown_seconds: stage.cooldown_seconds,
        shots_count: stage.shots_count,
      }));

      await supabase.from('competition_stages').insert(stageInserts);
    }

    setShowNewCompetition(false);
    setCompForm({
      name: '',
      description: '',
      competition_type: 'felt',
      discipline_id: '',
      location: '',
      competition_date: new Date().toISOString().split('T')[0],
      is_public: true,
    });
    setStages([]);
    fetchData();
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

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingen tilgang</h2>
          <p className="text-slate-600">
            Du har ikke tilgang til adminpanelet. Kontakt en administrator for tilgang.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl pb-20 md:pb-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin</h1>
              <p className="text-slate-600">Administrer oppslagsdata</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <AdminTemplates />

          <AdminFieldFigures />

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Stevner</h2>
              <button
                onClick={() => setShowNewCompetition(!showNewCompetition)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center space-x-2"
              >
                {showNewCompetition ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span className="hidden sm:inline">{showNewCompetition ? 'Avbryt' : 'Nytt stevne'}</span>
              </button>
            </div>

            {showNewCompetition && (
              <div className="mb-6 p-4 sm:p-6 bg-slate-50 rounded-lg space-y-4">
                <h3 className="font-semibold text-slate-900 mb-4">Opprett nytt stevne</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Navn</label>
                    <input
                      type="text"
                      value={compForm.name}
                      onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="DFS Landslagssamling 2024"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Beskrivelse</label>
                    <textarea
                      value={compForm.description}
                      onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      placeholder="Beskrivelse..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                    <select
                      value={compForm.competition_type}
                      onChange={(e) => setCompForm({ ...compForm, competition_type: e.target.value as 'bane' | 'felt' })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="felt">Felt</option>
                      <option value="bane">Bane</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Disiplin</label>
                    <select
                      value={compForm.discipline_id}
                      onChange={(e) => setCompForm({ ...compForm, discipline_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Velg disiplin</option>
                      {disciplines.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sted</label>
                    <input
                      type="text"
                      value={compForm.location}
                      onChange={(e) => setCompForm({ ...compForm, location: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Setermoen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dato</label>
                    <input
                      type="date"
                      value={compForm.competition_date}
                      onChange={(e) => setCompForm({ ...compForm, competition_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={compForm.is_public}
                    onChange={(e) => setCompForm({ ...compForm, is_public: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                  />
                  <span className="text-sm text-slate-700">Offentlig stevne</span>
                </label>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">Hold</h4>
                    <button
                      onClick={addStage}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded transition flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Legg til hold</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {stages.map((stage, index) => (
                      <div key={index} className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-900">Hold {index + 1}</span>
                          <button
                            onClick={() => removeStage(index)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => updateStage(index, 'name', e.target.value)}
                            placeholder="Navn"
                            className="col-span-2 px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          />

                          <select
                            value={stage.figure_id}
                            onChange={(e) => updateStage(index, 'figure_id', e.target.value)}
                            className="col-span-2 px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Velg figur</option>
                            {figures.map((f) => (
                              <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                            ))}
                          </select>

                          <select
                            value={stage.position}
                            onChange={(e) => updateStage(index, 'position', e.target.value)}
                            className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="liggende">Liggende</option>
                            <option value="stående">Stående</option>
                            <option value="knestående">Knestående</option>
                          </select>

                          <input
                            type="number"
                            value={stage.shots_count}
                            onChange={(e) => updateStage(index, 'shots_count', parseInt(e.target.value))}
                            placeholder="Skudd"
                            className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          />

                          <input
                            type="number"
                            value={stage.prep_seconds}
                            onChange={(e) => updateStage(index, 'prep_seconds', parseInt(e.target.value))}
                            placeholder="Forb (s)"
                            className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          />

                          <input
                            type="number"
                            value={stage.shoot_seconds}
                            onChange={(e) => updateStage(index, 'shoot_seconds', parseInt(e.target.value))}
                            placeholder="Sky (s)"
                            className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateCompetition}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Opprett stevne
                </button>
              </div>
            )}

            <div className="space-y-2">
              {competitions.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <p className="font-medium text-slate-900">{comp.name}</p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {comp.competition_type} • {comp.location || 'Ingen sted'} • {comp.competition_date ? new Date(comp.competition_date).toLocaleDateString('nb-NO') : 'Ingen dato'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      comp.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {comp.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              ))}

              {competitions.length === 0 && !showNewCompetition && (
                <p className="text-center text-slate-600 py-8">Ingen stevner opprettet</p>
              )}
            </div>
          </div>

          <AdminAmmoProfiles />

          <AdminShooterClasses />

          <AdminDisciplines />

          <AdminPresets />
        </div>
      </div>
    </Layout>
  );
}
