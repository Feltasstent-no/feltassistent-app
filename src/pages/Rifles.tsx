import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Rifle } from '../types/database';
import { Plus, Target, Trash2, CreditCard as Edit2, Save, X } from 'lucide-react';

export function Rifles() {
  const { user } = useAuth();
  const [rifles, setRifles] = useState<Rifle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    rifle_number: '',
    name: '',
    caliber: '',
    model: '',
    serial_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchRifles();
  }, [user]);

  const fetchRifles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('rifles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) setRifles(data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      rifle_number: '',
      name: '',
      caliber: '',
      model: '',
      serial_number: '',
      notes: '',
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('rifles').insert({
      user_id: user.id,
      rifle_number: formData.rifle_number,
      name: formData.name,
      caliber: formData.caliber || null,
      model: formData.model || null,
      serial_number: formData.serial_number || null,
      notes: formData.notes || null,
    });

    if (error) {
      alert('Feil ved opprettelse: ' + error.message);
      return;
    }

    resetForm();
    setShowAddForm(false);
    await fetchRifles();
  };

  const handleUpdate = async (rifle: Rifle) => {
    const { error } = await supabase
      .from('rifles')
      .update({
        name: rifle.name,
        caliber: rifle.caliber || null,
        model: rifle.model || null,
        serial_number: rifle.serial_number || null,
        notes: rifle.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rifle.id);

    if (error) {
      alert('Feil ved oppdatering: ' + error.message);
      return;
    }

    setEditingId(null);
    await fetchRifles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette våpenet?')) return;

    const { error } = await supabase.from('rifles').update({ is_active: false }).eq('id', id);

    if (error) {
      alert('Feil ved sletting: ' + error.message);
      return;
    }

    await fetchRifles();
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
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mine våpen</h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">Administrer dine rifler</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition flex items-center space-x-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Legg til våpen</span>
              <span className="sm:hidden">Ny</span>
            </button>
          </div>
        </div>

        {rifles.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen våpen registrert</h3>
            <p className="text-slate-600 mb-6">Legg til ditt første våpen for å spore skuddtelling</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Legg til våpen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rifles.map((rifle) => (
              <div key={rifle.id} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                {editingId === rifle.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Våpennummer
                        </label>
                        <input
                          type="text"
                          value={rifle.rifle_number}
                          disabled
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">Navn</label>
                        <input
                          type="text"
                          value={rifle.name}
                          onChange={(e) => setRifles(rifles.map(r => r.id === rifle.id ? { ...r, name: e.target.value } : r))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Kaliber
                        </label>
                        <input
                          type="text"
                          value={rifle.caliber || ''}
                          onChange={(e) => setRifles(rifles.map(r => r.id === rifle.id ? { ...r, caliber: e.target.value } : r))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">Modell</label>
                        <input
                          type="text"
                          value={rifle.model || ''}
                          onChange={(e) => setRifles(rifles.map(r => r.id === rifle.id ? { ...r, model: e.target.value } : r))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Serienummer løp
                      </label>
                      <input
                        type="text"
                        value={rifle.serial_number || ''}
                        onChange={(e) => setRifles(rifles.map(r => r.id === rifle.id ? { ...r, serial_number: e.target.value } : r))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Notater</label>
                      <textarea
                        value={rifle.notes || ''}
                        onChange={(e) => setRifles(rifles.map(r => r.id === rifle.id ? { ...r, notes: e.target.value } : r))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        rows={2}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdate(rifle)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Lagre
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          fetchRifles();
                        }}
                        className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <X className="w-4 h-4 inline mr-2" />
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{rifle.name}</h3>
                        <p className="text-sm text-slate-600">Våpennummer: {rifle.rifle_number}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingId(rifle.id)}
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rifle.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      {rifle.caliber && (
                        <div>
                          <span className="text-slate-600">Kaliber:</span>
                          <p className="font-medium text-slate-900">{rifle.caliber}</p>
                        </div>
                      )}
                      {rifle.model && (
                        <div>
                          <span className="text-slate-600">Modell:</span>
                          <p className="font-medium text-slate-900">{rifle.model}</p>
                        </div>
                      )}
                      {rifle.serial_number && (
                        <div>
                          <span className="text-slate-600">Serienummer løp:</span>
                          <p className="font-medium text-slate-900">{rifle.serial_number}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Totalt skudd:</span>
                        <p className="font-medium text-slate-900">{rifle.total_shots}</p>
                      </div>
                    </div>

                    {rifle.notes && (
                      <p className="text-sm text-slate-600 bg-slate-50 rounded p-3">{rifle.notes}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Legg til våpen</h3>

              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Våpennummer *
                    </label>
                    <input
                      type="text"
                      value={formData.rifle_number}
                      onChange={(e) => setFormData({ ...formData, rifle_number: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="F.eks. 12345"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Navn *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="F.eks. Min feltrifle"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Kaliber</label>
                    <input
                      type="text"
                      value={formData.caliber}
                      onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="F.eks. .308"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Modell</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="F.eks. Sauer 200 STR"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Serienummer løp
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Notater</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                  >
                    Legg til våpen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
