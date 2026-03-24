import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Discipline } from '../types/database';
import { Plus, CreditCard as Edit, Trash2, Save, X } from 'lucide-react';

export function AdminDisciplines() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from('disciplines')
      .select('*')
      .order('name');

    if (data) setDisciplines(data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      is_active: true,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('disciplines').insert({
      name: formData.name,
      code: formData.code,
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
      .from('disciplines')
      .update({
        name: formData.name,
        code: formData.code,
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
    if (!confirm('Er du sikker på at du vil deaktivere denne disiplinen?')) return;

    const { error } = await supabase
      .from('disciplines')
      .update({ is_active: false })
      .eq('id', id);

    if (!error) {
      fetchData();
    }
  };

  const startEdit = (discipline: Discipline) => {
    setEditingId(discipline.id);
    setFormData({
      name: discipline.name,
      code: discipline.code,
      is_active: discipline.is_active,
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
          <h2 className="text-xl font-bold text-slate-900">Disipliner</h2>
          <p className="text-sm text-slate-600 mt-1">Administrer disipliner</p>
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
          <span className="hidden sm:inline">Ny disiplin</span>
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Opprett ny disiplin</h3>
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
                  placeholder="F.eks. Felt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="F.eks. felt"
                />
              </div>
            </div>

            <div>
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

            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Opprett disiplin
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {disciplines.map((discipline) => (
          <div
            key={discipline.id}
            className={`p-4 rounded-lg ${editingId === discipline.id ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}
          >
            {editingId === discipline.id ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Navn"
                  />
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Kode"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Aktiv</span>
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdate(discipline.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lagre</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        resetForm();
                      }}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm transition"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{discipline.name}</p>
                  <p className="text-sm text-slate-600">{discipline.code}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      discipline.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {discipline.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <button
                    onClick={() => startEdit(discipline)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Rediger"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(discipline.id)}
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

        {disciplines.length === 0 && (
          <div className="col-span-2 text-center py-8 text-slate-500">
            Ingen disipliner funnet. Opprett en ny disiplin for å komme i gang.
          </div>
        )}
      </div>
    </div>
  );
}
