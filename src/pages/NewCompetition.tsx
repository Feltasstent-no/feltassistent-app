import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Discipline, CompetitionTemplate } from '../types/database';
import { Trophy, Calendar, MapPin, FileText, Target, Settings } from 'lucide-react';

export function NewCompetition() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [templates, setTemplates] = useState<CompetitionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CompetitionTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    competition_type: 'grovfelt' as 'bane' | 'grovfelt' | 'finfelt',
    discipline_id: '',
    location: '',
    competition_date: new Date().toISOString().split('T')[0],
    is_public: false,
    template_id: '',
    custom_stages: 10,
    custom_shots_per_stage: 1,
    custom_shoot_time: 30,
    custom_prep_time: 15,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.template_id) {
      const template = templates.find((t) => t.id === formData.template_id);
      setSelectedTemplate(template || null);
      if (template) {
        setFormData({
          ...formData,
          custom_stages: template.default_stages,
          custom_shots_per_stage: template.default_shots_per_stage,
          custom_shoot_time: template.default_shoot_time,
          custom_prep_time: template.default_prep_time,
        });
      }
    } else {
      setSelectedTemplate(null);
    }
  }, [formData.template_id, templates]);

  const fetchData = async () => {
    const [disciplinesRes, templatesRes] = await Promise.all([
      supabase.from('disciplines').select('*').eq('is_active', true).order('name'),
      supabase.from('competition_templates').select('*').eq('is_active', true).order('sort_order'),
    ]);

    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('competitions')
      .insert({
        user_id: user.id,
        name: formData.name,
        notes: formData.description || null,
        competition_type: formData.competition_type,
        discipline_id: formData.discipline_id || null,
        location: formData.location || null,
        competition_date: formData.competition_date,
        total_stages: formData.custom_stages,
        status: 'draft',
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert('Feil ved opprettelse av stevne: ' + error.message);
      return;
    }

    if (data) {
      if (formData.competition_type === 'grovfelt' || formData.competition_type === 'finfelt') {
        navigate(`/competitions/${data.id}/configure`);
      } else {
        navigate(`/competitions/${data.id}`);
      }
    }
  };

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Nytt stevne</h1>
          <p className="text-slate-600 mt-1">Opprett et nytt stevne manuelt</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              <Trophy className="w-4 h-4 inline mr-2" />
              Navn på stevne
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="F.eks. Feltløp høsten 2026"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Beskrivelse
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Valgfri beskrivelse av stevnet"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              Type stevne
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, competition_type: 'bane' })}
                className={`p-3 sm:p-4 border-2 rounded-lg text-center transition ${
                  formData.competition_type === 'bane'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-sm sm:text-base">Bane</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, competition_type: 'grovfelt' })}
                className={`p-3 sm:p-4 border-2 rounded-lg text-center transition ${
                  formData.competition_type === 'grovfelt'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-sm sm:text-base">Grovfelt</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, competition_type: 'finfelt' })}
                className={`p-3 sm:p-4 border-2 rounded-lg text-center transition ${
                  formData.competition_type === 'finfelt'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-sm sm:text-base">Finfelt</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Disiplin
            </label>
            <select
              value={formData.discipline_id}
              onChange={(e) => setFormData({ ...formData, discipline_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Velg disiplin (valgfritt)</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </div>

          {(formData.competition_type === 'grovfelt' || formData.competition_type === 'finfelt') && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                <Settings className="w-4 h-4 inline mr-2" />
                Stevnemal (valgfritt)
              </label>
              <select
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="">Ingen mal - lag fra bunn</option>
                {templates
                  .filter((t) => t.competition_type === formData.competition_type)
                  .map((template) => {
                    const discipline = disciplines.find(d => d.id === template.discipline_id);
                    const distanceLabel = template.distance_mode === 'kjent' ? 'kjente' :
                                         template.distance_mode === 'ukjent' ? 'ukjente' :
                                         template.distance_mode === 'blandet' ? 'blandet' : '';
                    return (
                      <option key={template.id} value={template.id}>
                        {template.name} • {template.default_stages} hold • {template.default_shots_per_stage} skudd • Sky {template.default_shoot_time}s • Forb {template.default_prep_time}s{distanceLabel ? ` • ${distanceLabel}` : ''}
                      </option>
                    );
                  })}
              </select>
              {selectedTemplate && (
                <div className="mt-3 space-y-4">
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-emerald-900 text-lg">
                          {selectedTemplate.name}
                        </div>
                        {selectedTemplate.description && (
                          <div className="text-emerald-800 mt-1 text-sm">{selectedTemplate.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="text-emerald-700 font-semibold text-xs uppercase tracking-wide mb-1">Antall hold</div>
                        <div className="text-emerald-900 font-bold text-xl">{selectedTemplate.default_stages}</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="text-emerald-700 font-semibold text-xs uppercase tracking-wide mb-1">Skudd/hold</div>
                        <div className="text-emerald-900 font-bold text-xl">{selectedTemplate.default_shots_per_stage}</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="text-emerald-700 font-semibold text-xs uppercase tracking-wide mb-1">Skytetid</div>
                        <div className="text-emerald-900 font-bold text-xl">{selectedTemplate.default_shoot_time}s</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="text-emerald-700 font-semibold text-xs uppercase tracking-wide mb-1">Klargjøring</div>
                        <div className="text-emerald-900 font-bold text-xl">{selectedTemplate.default_prep_time}s</div>
                      </div>
                      {selectedTemplate.distance_mode && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="text-emerald-700 font-semibold text-xs uppercase tracking-wide mb-1">Avstander</div>
                          <div className="text-emerald-900 font-bold text-base capitalize">
                            {selectedTemplate.distance_mode === 'kjent' && 'Kjente'}
                            {selectedTemplate.distance_mode === 'ukjent' && 'Ukjente'}
                            {selectedTemplate.distance_mode === 'blandet' && 'Blandet'}
                          </div>
                        </div>
                      )}
                      {selectedTemplate.discipline_id && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="text-emerald-700 font-semibold text-xs uppercase tracking-wide mb-1">Disiplin</div>
                          <div className="text-emerald-900 font-bold text-base">
                            {disciplines.find(d => d.id === selectedTemplate.discipline_id)?.name || '—'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-emerald-200 flex items-start space-x-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                      </div>
                      <div className="text-xs text-emerald-800 leading-relaxed">
                        <span className="font-semibold">Standardmal valgt.</span> Du kan justere verdiene nedenfor før opprettelse, eller overstyre per hold senere.
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 text-sm">Tilpass oppsett</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Antall hold
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.custom_stages}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({ ...formData, custom_stages: v ? parseInt(v) : 1 });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Skudd per hold
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.custom_shots_per_stage}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({ ...formData, custom_shots_per_stage: v ? parseInt(v) : 1 });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Skytetid (sekunder)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.custom_shoot_time}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({ ...formData, custom_shoot_time: v ? parseInt(v) : 1 });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Klargjøringstid (sekunder)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.custom_prep_time}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({ ...formData, custom_prep_time: v ? parseInt(v) : 1 });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-600">
                      Disse verdiene brukes som standard når hold genereres. Du kan fortsatt justere hvert enkelt hold senere.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Sted / Arena
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="F.eks. Drevja skytebane"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Dato
            </label>
            <input
              type="date"
              value={formData.competition_date}
              onChange={(e) => setFormData({ ...formData, competition_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="is_public" className="ml-2 text-sm text-slate-900">
              Offentlig stevne (andre brukere kan se og delta)
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="flex-1 px-4 sm:px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? 'Oppretter...' : (formData.competition_type === 'grovfelt' || formData.competition_type === 'finfelt') ? 'Opprett og konfigurer' : 'Opprett stevne'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
