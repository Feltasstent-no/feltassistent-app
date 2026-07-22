import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DfsClassConfig, invalidateDfsClassCache } from '../lib/dfs-class-config';
import { ShooterClass } from '../types/database';
import { getCategoryDisplayName } from '../lib/display-names';
import { Loader2, Target, Trees, CheckCircle, XCircle, Pencil, X, Save, AlertTriangle } from 'lucide-react';

interface MergedClassRow {
  shooter_class: ShooterClass;
  dfs_config: DfsClassConfig | null;
}

interface EditForm {
  field_type: 'finfelt' | 'grovfelt';
  bane_distances: number[];
  field_distance_min_m: number | null;
  field_distance_max_m: number | null;
  default_caliber: string;
  description: string;
  is_active: boolean;
}

interface ValidationErrors {
  bane_distances?: string;
  field_distance?: string;
}

function validate(form: EditForm): ValidationErrors {
  const errors: ValidationErrors = {};
  if (form.bane_distances.length === 0) errors.bane_distances = 'Velg minst en baneavstand';
  if (form.field_distance_min_m != null && form.field_distance_max_m != null &&
      form.field_distance_max_m < form.field_distance_min_m) {
    errors.field_distance = 'Maks feltavstand kan ikke vaere lavere enn min';
  }
  return errors;
}

export function AdminDfsConfig() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MergedClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<MergedClassRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchData = async () => {
    setLoading(true);
    const [scRes, dcRes] = await Promise.all([
      supabase.from('shooter_classes').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('dfs_class_configs').select('*').order('sort_order'),
    ]);

    const shooterClasses = (scRes.data as ShooterClass[]) || [];
    const dfsConfigs = (dcRes.data as DfsClassConfig[]) || [];
    const dcMap = new Map(dfsConfigs.map(dc => [dc.class_key, dc]));

    const merged: MergedClassRow[] = shooterClasses.map(sc => ({
      shooter_class: sc,
      dfs_config: dcMap.get(sc.code) || null,
    }));

    setRows(merged);
    setLoading(false);
  };

  const openEdit = useCallback((row: MergedClassRow) => {
    setEditingRow(row);
    const dc = row.dfs_config;
    setEditForm({
      field_type: dc?.field_type || 'grovfelt',
      bane_distances: dc ? [...dc.bane_distances] : [],
      field_distance_min_m: dc?.field_distance_min_m ?? null,
      field_distance_max_m: dc?.field_distance_max_m ?? null,
      default_caliber: dc?.default_caliber || '',
      description: dc?.description || '',
      is_active: dc?.is_active ?? true,
    });
    setErrors({});
  }, []);

  const closeEdit = () => {
    setEditingRow(null);
    setEditForm(null);
    setErrors({});
  };

  const handleSave = async () => {
    if (!editForm || !editingRow || !user) return;
    const validationErrors = validate(editForm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const classKey = editingRow.shooter_class.code;
    const payload = {
      field_type: editForm.field_type,
      bane_distances: editForm.bane_distances,
      field_distance_min_m: editForm.field_distance_min_m,
      field_distance_max_m: editForm.field_distance_max_m,
      default_caliber: editForm.default_caliber.trim() || null,
      description: editForm.description.trim() || null,
      is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingRow.dfs_config) {
      const res = await supabase
        .from('dfs_class_configs')
        .update(payload)
        .eq('id', editingRow.dfs_config.id);
      error = res.error;
    } else {
      const res = await supabase
        .from('dfs_class_configs')
        .insert({
          ...payload,
          class_key: classKey,
          class_name: editingRow.shooter_class.name,
          sort_order: editingRow.shooter_class.sort_order,
        });
      error = res.error;
    }

    if (error) {
      setSaving(false);
      setToast({ message: 'Kunne ikke lagre endringer', type: 'error' });
      return;
    }

    // Audit log
    const changedFields: string[] = [];
    const dc = editingRow.dfs_config;
    if (!dc || editForm.field_type !== dc.field_type) changedFields.push('field_type');
    if (!dc || JSON.stringify(editForm.bane_distances) !== JSON.stringify(dc.bane_distances)) changedFields.push('bane_distances');
    if (!dc || editForm.field_distance_min_m !== dc.field_distance_min_m) changedFields.push('field_distance_min_m');
    if (!dc || editForm.field_distance_max_m !== dc.field_distance_max_m) changedFields.push('field_distance_max_m');
    if (!dc || (editForm.default_caliber.trim() || null) !== dc.default_caliber) changedFields.push('default_caliber');
    if (!dc || (editForm.description.trim() || null) !== dc.description) changedFields.push('description');
    if (!dc || editForm.is_active !== dc.is_active) changedFields.push('is_active');

    if (changedFields.length > 0) {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user.id,
        action: 'dfs_class_config_updated',
        details: {
          class_key: classKey,
          class_name: editingRow.shooter_class.name,
          changed_fields: changedFields,
        },
      });
    }

    invalidateDfsClassCache();
    setSaving(false);
    closeEdit();
    setToast({ message: 'DFS-konfig oppdatert', type: 'success' });
    fetchData();
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

  const finfeltRows = rows.filter(r => r.dfs_config?.field_type === 'finfelt');
  const grovfeltRows = rows.filter(r => r.dfs_config?.field_type === 'grovfelt');
  const unconfiguredRows = rows.filter(r => !r.dfs_config);

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
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasjonsdata per klasse. Klassenavn styres fra Skytterklasser.
          </p>
        </div>

        {/* Finfelt */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Finfelt</h3>
            <span className="text-xs text-slate-400">({finfeltRows.length})</span>
          </div>
          <ClassGrid rows={finfeltRows} onEdit={openEdit} />
        </div>

        {/* Grovfelt */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trees className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Grovfelt</h3>
            <span className="text-xs text-slate-400">({grovfeltRows.length})</span>
          </div>
          <ClassGrid rows={grovfeltRows} onEdit={openEdit} />
        </div>

        {/* Unconfigured */}
        {unconfiguredRows.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Ikke konfigurert</h3>
              <span className="text-xs text-slate-400">({unconfiguredRows.length})</span>
            </div>
            <ClassGrid rows={unconfiguredRows} onEdit={openEdit} />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRow && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeEdit} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="font-semibold text-slate-900">{editingRow.shooter_class.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getCategoryDisplayName(editingRow.shooter_class.category)}
                </p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
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
                <span className="text-sm font-medium text-slate-700">Konfig aktiv</span>
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
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </>
  );
}

function ClassGrid({ rows, onEdit }: { rows: MergedClassRow[]; onEdit: (r: MergedClassRow) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {rows.map(r => {
        const dc = r.dfs_config;
        const inactive = dc && !dc.is_active;
        return (
          <div
            key={r.shooter_class.id}
            className={`group border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition relative ${inactive ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 text-sm truncate">{r.shooter_class.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {getCategoryDisplayName(r.shooter_class.category)}
                  {dc?.description && ` \u2013 ${dc.description}`}
                </p>
              </div>
              <button
                onClick={() => onEdit(r)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                title="Rediger konfigurasjon"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            {dc ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${dc.field_type === 'finfelt' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  {dc.bane_distances.join('/')}m
                </span>
                {dc.default_caliber && <span>{dc.default_caliber}</span>}
                {inactive && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                    <XCircle className="w-3 h-3" /> Inaktiv
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-amber-500 italic">Ingen DFS-konfig</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
