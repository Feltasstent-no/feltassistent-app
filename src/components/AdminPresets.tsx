import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FieldClockPreset } from '../types/database';
import { Plus, CreditCard as Edit, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

function PresetForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  formData: {
    name: string;
    prep_seconds: number;
    shoot_seconds: number;
    warning_seconds: number;
    rule_reference: string;
    is_active: boolean;
  };
  setFormData: (data: typeof formData | ((prev: typeof formData) => typeof formData)) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [showAdvanced, setShowAdvanced] = useState(
    formData.warning_seconds > 0 || !!formData.rule_reference
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          placeholder="F.eks. DFS Felthurtig reglement"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Forberedelse (sek)</label>
          <input
            type="number"
            value={formData.prep_seconds}
            onChange={(e) => setFormData({ ...formData, prep_seconds: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Skytetid (sek) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            value={formData.shoot_seconds}
            onChange={(e) => setFormData({ ...formData, shoot_seconds: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            min="1"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{showAdvanced ? 'Skjul avansert' : 'Vis avansert'}</span>
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-3 border-l-2 border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Advarseltid (sek)</label>
            <input
              type="number"
              value={formData.warning_seconds}
              onChange={(e) => setFormData({ ...formData, warning_seconds: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              min="0"
            />
            <p className="text-xs text-slate-500 mt-1">
              Hvor mange sekunder for klokka skifter farge og varsler. 0 = standard (10 sek).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Regelreferanse</label>
            <input
              type="text"
              value={formData.rule_reference}
              onChange={(e) => setFormData({ ...formData, rule_reference: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="F.eks. DFS Feltreglement kap. 4"
            />
          </div>
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
      )}

      <div className="flex space-x-2 pt-2">
        <button
          type="submit"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}

export function AdminPresets() {
  const [presets, setPresets] = useState<FieldClockPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const emptyForm = {
    name: '',
    prep_seconds: 15,
    shoot_seconds: 60,
    warning_seconds: 0,
    rule_reference: '',
    is_active: true,
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from('field_clock_presets')
      .select('*')
      .order('name');

    if (data) setPresets(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('field_clock_presets').insert({
      name: formData.name,
      prep_seconds: formData.prep_seconds,
      shoot_seconds: formData.shoot_seconds,
      warning_seconds: formData.warning_seconds,
      cooldown_seconds: 0,
      rule_reference: formData.rule_reference || null,
      is_active: formData.is_active,
    });

    if (!error) {
      fetchData();
      setShowNew(false);
      setFormData(emptyForm);
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase
      .from('field_clock_presets')
      .update({
        name: formData.name,
        prep_seconds: formData.prep_seconds,
        shoot_seconds: formData.shoot_seconds,
        warning_seconds: formData.warning_seconds,
        rule_reference: formData.rule_reference || null,
        is_active: formData.is_active,
      })
      .eq('id', id);

    if (!error) {
      fetchData();
      setEditingId(null);
      setFormData(emptyForm);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil deaktivere denne preseten?')) return;

    const { error } = await supabase
      .from('field_clock_presets')
      .update({ is_active: false })
      .eq('id', id);

    if (!error) {
      fetchData();
    }
  };

  const startEdit = (preset: FieldClockPreset) => {
    setEditingId(preset.id);
    setFormData({
      name: preset.name,
      prep_seconds: preset.prep_seconds,
      shoot_seconds: preset.shoot_seconds,
      warning_seconds: preset.warning_seconds,
      rule_reference: preset.rule_reference || '',
      is_active: preset.is_active,
    });
    setShowNew(false);
  };

  const formatDisplayTime = (seconds: number) => {
    if (seconds <= 75) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return <div className="text-center py-8">Laster...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Feltklokke Presets</h2>
          <p className="text-sm text-slate-600 mt-1">Administrer tidsinnstillinger for feltklokka</p>
        </div>
        <button
          onClick={() => {
            setShowNew(true);
            setEditingId(null);
            setFormData(emptyForm);
          }}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Ny preset</span>
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Opprett ny preset</h3>
            <button
              onClick={() => {
                setShowNew(false);
                setFormData(emptyForm);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <PresetForm
            formData={formData}
            setFormData={setFormData as any}
            onSubmit={handleCreate}
            onCancel={() => {
              setShowNew(false);
              setFormData(emptyForm);
            }}
            submitLabel="Opprett preset"
          />
        </div>
      )}

      <div className="space-y-3">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className={`p-4 rounded-lg ${editingId === preset.id ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}
          >
            {editingId === preset.id ? (
              <PresetForm
                formData={formData}
                setFormData={setFormData as any}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdate(preset.id);
                }}
                onCancel={() => {
                  setEditingId(null);
                  setFormData(emptyForm);
                }}
                submitLabel="Lagre endringer"
              />
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{preset.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
                    {preset.prep_seconds > 0 && <span>Forb: {formatDisplayTime(preset.prep_seconds)}</span>}
                    <span>Skyting: {formatDisplayTime(preset.shoot_seconds)}</span>
                    {preset.warning_seconds > 0 && <span>Adv: {formatDisplayTime(preset.warning_seconds)}</span>}
                  </div>
                  {preset.rule_reference && (
                    <p className="text-xs text-slate-500 mt-1">{preset.rule_reference}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      preset.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {preset.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <button
                    onClick={() => startEdit(preset)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Rediger"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Deaktiver"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {presets.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Ingen presets funnet. Opprett en ny preset for å komme i gang.
          </div>
        )}
      </div>
    </div>
  );
}
