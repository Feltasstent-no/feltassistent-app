import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DfsClassConfig, invalidateDfsClassCache } from '../lib/dfs-class-config';
import { Loader2, Target, Trees, CheckCircle, XCircle, Pencil, X, Save, AlertTriangle } from 'lucide-react';

interface EditForm {
  class_name: string;
  field_type: 'finfelt' | 'grovfelt';
  bane_distances: number[];
  field_distance_min_m: number | null;
  field_distance_max_m: number | null;
  default_caliber: string;
  description: string;
  is_active: boolean;
}

interface ValidationErrors {
  class_name?: string;
  bane_distances?: string;
  field_distance?: string;
}

function validate(form: EditForm): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!form.class_name.trim()) errors.class_name = 'Klassenavn kan ikke være tomt';
  if (form.bane_distances.length === 0) errors.bane_distances = 'Velg minst én baneavstand';
  if (form.field_distance_min_m != null && form.field_distance_max_m != null &&
      form.field_distance_max_m < form.field_distance_min_m) {
    errors.field_distance = 'Maks feltavstand kan ikke være lavere enn min';
  }
  return errors;
}

export function AdminDfsConfig() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<DfsClassConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<DfsClassConfig | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchConfigs(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dfs_class_configs')
      .select('*')
      .order('sort_order');
    setConfigs((data as DfsClassConfig[]) || []);
    setLoading(false);
  };

  const openEdit = useCallback((config: DfsClassConfig) => {
    setEditingConfig(config);
    setEditForm({
      class_name: config.class_name,
      field_type: config.field_type,
      bane_distances: [...config.bane_distances],
      field_distance_min_m: config.field_distance_min_m,
      field_distance_max_m: config.field_distance_max_m,
      default_caliber: config.default_caliber || '',
      description: config.description || '',
      is_active: config.is_active,
    });
    setErrors({});
  }, []);

  const closeEdit = () => {
    setEditingConfig(null);
    setEditForm(null);
    setErrors({});
  };

  const handleSave = async () => {
    if (!editForm || !editingConfig || !user) return;
    const validationErrors = validate(editForm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const updatePayload = {
      class_name: editForm.class_name.trim(),
      field_type: editForm.field_type,
      bane_distances: editForm.bane_distances,
      field_distance_min_m: editForm.field_distance_min_m,
      field_distance_max_m: editForm.field_distance_max_m,
      default_caliber: editForm.default_caliber.trim() || null,
      description: editForm.description.trim() || null,
      is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('dfs_class_configs')
      .update(updatePayload)
      .eq('id', editingConfig.id);

    if (error) {
      setSaving(false);
      setToast({ message: 'Kunne ikke lagre endringer', type: 'error' });
      return;
    }

    // Build changed fields for audit
    const changedFields: string[] = [];
    if (editForm.class_name !== editingConfig.class_name) changedFields.push('class_name');
    if (editForm.field_type !== editingConfig.field_type) changedFields.push('field_type');
    if (JSON.stringify(editForm.bane_distances) !== JSON.stringify(editingConfig.bane_distances)) changedFields.push('bane_distances');
    if (editForm.field_distance_min_m !== editingConfig.field_distance_min_m) changedFields.push('field_distance_min_m');
    if (editForm.field_distance_max_m !== editingConfig.field_distance_max_m) changedFields.push('field_distance_max_m');
    if ((editForm.default_caliber || null) !== editingConfig.default_caliber) changedFields.push('default_caliber');
    if ((editForm.description || null) !== editingConfig.description) changedFields.push('description');
    if (editForm.is_active !== editingConfig.is_active) changedFields.push('is_active');

    if (changedFields.length > 0) {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user.id,
        action: 'dfs_class_config_updated',
        details: {
          class_key: editingConfig.class_key,
          class_name: editForm.class_name,
          changed_fields: changedFields,
        },
      });
    }

    invalidateDfsClassCache();
    setSaving(false);
    closeEdit();
    setToast({ message: 'DFS-klasse oppdatert', type: 'success' });
    fetchConfigs();
  };

  const toggleBaneDistance = (dist: number) => {
    if (!editForm) return;
    const current = editForm.bane_distances;
    const next = current.includes(dist)
      ? current.filter(d => d !== dist)
      : [...current, dist].sort((a, b) => a - b);
    setEditForm({ ...editForm, bane_distances: next });
    if (errors.bane_distances && next.length > 0) {
      setErrors({ ...errors, bane_distances: undefined });
    }
  };

  const finfeltConfigs = configs.filter(c => c.field_type === 'finfelt');
  const grovfeltConfigs = configs.filter(c => c.field_type === 'grovfelt');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">DFS-konfigurasjon</h2>
          <p className="text-sm text-slate-500 mt-1">Klasseoppsett basert på DFS Skytterboka kap. 7</p>
        </div>

        {/* Finfelt */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Finfelt</h3>
            <span className="text-xs text-slate-400">({finfeltConfigs.length} klasser)</span>
          </div>
          <ClassGrid configs={finfeltConfigs} onEdit={openEdit} />
        </div>

        {/* Grovfelt */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trees className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Grovfelt</h3>
            <span className="text-xs text-slate-400">({grovfeltConfigs.length} klasser)</span>
          </div>
          <ClassGrid configs={grovfeltConfigs} onEdit={openEdit} />
        </div>
      </div>

      {/* Edit Modal */}
      {editingConfig && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeEdit} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="font-semibold text-slate-900">Rediger klasse</h3>
                <p className="text-xs text-slate-400 mt-0.5">class_key: {editingConfig.class_key}</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* class_name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Klassenavn</label>
                <input
                  type="text"
                  value={editForm.class_name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, class_name: e.target.value });
                    if (errors.class_name) setErrors({ ...errors, class_name: undefined });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.class_name ? 'border-red-400' : 'border-slate-300'}`}
                />
                {errors.class_name && <p className="text-xs text-red-500 mt-1">{errors.class_name}</p>}
              </div>

              {/* field_type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Felttype</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, field_type: 'finfelt' })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      editForm.field_type === 'finfelt'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Finfelt
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, field_type: 'grovfelt' })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      editForm.field_type === 'grovfelt'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Grovfelt
                  </button>
                </div>
              </div>

              {/* bane_distances */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Baneavstander</label>
                <div className="flex gap-2">
                  {[100, 200, 300].map(dist => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => toggleBaneDistance(dist)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        editForm.bane_distances.includes(dist)
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dist}m
                    </button>
                  ))}
                </div>
                {errors.bane_distances && <p className="text-xs text-red-500 mt-1">{errors.bane_distances}</p>}
              </div>

              {/* Felt distances */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feltavstand (meter)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={editForm.field_distance_min_m ?? ''}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value) : null;
                      setEditForm({ ...editForm, field_distance_min_m: v });
                      if (errors.field_distance) setErrors({ ...errors, field_distance: undefined });
                    }}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-slate-400 text-sm">til</span>
                  <input
                    type="number"
                    placeholder="Maks"
                    value={editForm.field_distance_max_m ?? ''}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value) : null;
                      setEditForm({ ...editForm, field_distance_max_m: v });
                      if (errors.field_distance) setErrors({ ...errors, field_distance: undefined });
                    }}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {errors.field_distance && <p className="text-xs text-red-500 mt-1">{errors.field_distance}</p>}
              </div>

              {/* default_caliber */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Standard kaliber</label>
                <input
                  type="text"
                  value={editForm.default_caliber}
                  onChange={(e) => setEditForm({ ...editForm, default_caliber: e.target.value })}
                  placeholder="F.eks. .22 LR, 6.5x55"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Valgfri beskrivelse"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* is_active */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-slate-700">Aktiv</span>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editForm.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editForm.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3 rounded-b-xl">
              <button
                onClick={closeEdit}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Avbryt
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </>
  );
}

function ClassGrid({ configs, onEdit }: { configs: DfsClassConfig[]; onEdit: (c: DfsClassConfig) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {configs.map(c => (
        <div
          key={c.id}
          className={`group border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition relative ${!c.is_active ? 'opacity-50' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 text-sm truncate">{c.class_name}</p>
              {c.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.description}</p>}
            </div>
            <button
              onClick={() => onEdit(c)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
              title="Rediger"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${c.field_type === 'finfelt' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              {c.bane_distances.join('/')}m
            </span>
            {c.default_caliber && <span>{c.default_caliber}</span>}
            {!c.is_active && (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <XCircle className="w-3 h-3" /> Inaktiv
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
