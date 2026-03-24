import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CompetitionTemplate, Discipline } from '../types/database';
import { Plus, CreditCard as Edit, Trash2, Save, X, GripVertical } from 'lucide-react';

export function AdminTemplates() {
  const [templates, setTemplates] = useState<CompetitionTemplate[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    competition_type: 'felt' as 'felt' | 'bane',
    discipline_id: '',
    distance_mode: '' as '' | 'kjent' | 'ukjent' | 'blandet',
    default_stages: 10,
    default_shots_per_stage: 1,
    default_shoot_time: 30,
    default_prep_time: 15,
    description: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [templatesRes, disciplinesRes] = await Promise.all([
      supabase.from('competition_templates').select('*').order('sort_order'),
      supabase.from('disciplines').select('*').eq('is_active', true).order('name'),
    ]);

    if (templatesRes.data) setTemplates(templatesRes.data);
    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      competition_type: 'felt',
      discipline_id: '',
      distance_mode: '',
      default_stages: 10,
      default_shots_per_stage: 1,
      default_shoot_time: 30,
      default_prep_time: 15,
      description: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('competition_templates').insert({
      name: formData.name,
      competition_type: formData.competition_type,
      discipline_id: formData.discipline_id || null,
      distance_mode: formData.distance_mode || null,
      default_stages: formData.default_stages,
      default_shots_per_stage: formData.default_shots_per_stage,
      default_shoot_time: formData.default_shoot_time,
      default_prep_time: formData.default_prep_time,
      description: formData.description || null,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    });

    if (!error) {
      fetchData();
      setShowNew(false);
      resetForm();
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase
      .from('competition_templates')
      .update({
        name: formData.name,
        competition_type: formData.competition_type,
        discipline_id: formData.discipline_id || null,
        distance_mode: formData.distance_mode || null,
        default_stages: formData.default_stages,
        default_shots_per_stage: formData.default_shots_per_stage,
        default_shoot_time: formData.default_shoot_time,
        default_prep_time: formData.default_prep_time,
        description: formData.description || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      })
      .eq('id', id);

    if (!error) {
      fetchData();
      setEditingId(null);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil deaktivere denne malen?')) return;

    const { error } = await supabase
      .from('competition_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (!error) {
      fetchData();
    }
  };

  const startEdit = (template: CompetitionTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      competition_type: template.competition_type,
      discipline_id: template.discipline_id || '',
      distance_mode: (template.distance_mode as '' | 'kjent' | 'ukjent' | 'blandet') || '',
      default_stages: template.default_stages,
      default_shots_per_stage: template.default_shots_per_stage,
      default_shoot_time: template.default_shoot_time,
      default_prep_time: template.default_prep_time,
      description: template.description || '',
      sort_order: template.sort_order,
      is_active: template.is_active,
    });
    setShowNew(false);
  };

  if (loading) {
    return <div className="text-center py-8">Laster...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Stevnemaler</h2>
          <p className="text-sm text-slate-600 mt-1">Administrer stevnemaler for felt og bane</p>
        </div>
        <button
          onClick={() => {
            setShowNew(true);
            setEditingId(null);
            resetForm();
          }}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Ny mal</span>
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Opprett ny mal</h3>
            <button
              onClick={() => {
                setShowNew(false);
                resetForm();
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Navn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="F.eks. Grovfelt – standard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.competition_type}
                  onChange={(e) =>
                    setFormData({ ...formData, competition_type: e.target.value as 'felt' | 'bane' })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="felt">Felt</option>
                  <option value="bane">Bane</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Disiplin</label>
                <select
                  value={formData.discipline_id}
                  onChange={(e) => setFormData({ ...formData, discipline_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Ingen spesifikk</option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Avstandsmodus</label>
                <select
                  value={formData.distance_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, distance_mode: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Ingen</option>
                  <option value="kjent">Kjente avstander</option>
                  <option value="ukjent">Ukjente avstander</option>
                  <option value="blandet">Blandet (kjent/ukjent)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Antall hold</label>
                <input
                  type="number"
                  value={formData.default_stages}
                  onChange={(e) =>
                    setFormData({ ...formData, default_stages: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skudd/hold</label>
                <input
                  type="number"
                  value={formData.default_shots_per_stage}
                  onChange={(e) =>
                    setFormData({ ...formData, default_shots_per_stage: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skytetid (s)</label>
                <input
                  type="number"
                  value={formData.default_shoot_time}
                  onChange={(e) =>
                    setFormData({ ...formData, default_shoot_time: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Klargjøring (s)</label>
                <input
                  type="number"
                  value={formData.default_prep_time}
                  onChange={(e) =>
                    setFormData({ ...formData, default_prep_time: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Kort beskrivelse av malen"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sorteringsrekkefølge</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Aktiv</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Opprett mal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNew(false);
                  resetForm();
                }}
                className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
              >
                Avbryt
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sortering
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Navn
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Disiplin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Hold
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Avstander
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {templates.map((template) => (
                <>
                  <tr key={template.id} className={editingId === template.id ? 'bg-yellow-50' : ''}>
                    {editingId === template.id ? (
                      <>
                        <td colSpan={9} className="px-4 py-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Navn
                                </label>
                                <input
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Sortering
                                </label>
                                <input
                                  type="number"
                                  value={formData.sort_order}
                                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Beskrivelse
                              </label>
                              <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                rows={2}
                                placeholder="Beskrivelse av malen"
                              />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Type
                                </label>
                                <select
                                  value={formData.competition_type}
                                  onChange={(e) => setFormData({ ...formData, competition_type: e.target.value as 'felt' | 'bane' })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                  <option value="felt">Felt</option>
                                  <option value="bane">Bane</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Disiplin
                                </label>
                                <select
                                  value={formData.discipline_id}
                                  onChange={(e) => setFormData({ ...formData, discipline_id: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                  <option value="">Ingen</option>
                                  {disciplines.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Avstandstype
                                </label>
                                <select
                                  value={formData.distance_mode}
                                  onChange={(e) => setFormData({ ...formData, distance_mode: e.target.value as any })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                  <option value="">Ingen</option>
                                  <option value="kjent">Kjent</option>
                                  <option value="ukjent">Ukjent</option>
                                  <option value="blandet">Blandet</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Status
                                </label>
                                <label className="flex items-center space-x-2 mt-2">
                                  <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded"
                                  />
                                  <span className="text-sm text-slate-700">Aktiv</span>
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Antall hold
                                </label>
                                <input
                                  type="number"
                                  value={formData.default_stages}
                                  onChange={(e) => setFormData({ ...formData, default_stages: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Skudd per hold
                                </label>
                                <input
                                  type="number"
                                  value={formData.default_shots_per_stage}
                                  onChange={(e) => setFormData({ ...formData, default_shots_per_stage: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Skytetid (s)
                                </label>
                                <input
                                  type="number"
                                  value={formData.default_shoot_time}
                                  onChange={(e) => setFormData({ ...formData, default_shoot_time: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Klargjøring (s)
                                </label>
                                <input
                                  type="number"
                                  value={formData.default_prep_time}
                                  onChange={(e) => setFormData({ ...formData, default_prep_time: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  min="0"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                              <button
                                onClick={() => handleUpdate(template.id)}
                                className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition"
                              >
                                <Save className="w-4 h-4" />
                                <span>Lagre endringer</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  resetForm();
                                }}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm transition"
                              >
                                Avbryt
                              </button>
                            </div>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2 text-slate-500">
                            <GripVertical className="w-4 h-4" />
                          <span className="text-sm font-mono">{template.sort_order}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-slate-500 mt-1">{template.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 capitalize">
                          {template.competition_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {disciplines.find((d) => d.id === template.discipline_id)?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {template.default_stages} × {template.default_shots_per_stage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {template.default_shoot_time}s / {template.default_prep_time}s
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 capitalize">
                          {template.distance_mode || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {template.is_active ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                            Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-1">
                          <button
                            onClick={() => startEdit(template)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Rediger"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Deaktiver"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          Ingen maler funnet. Opprett en ny mal for å komme i gang.
        </div>
      )}
    </div>
  );
}
