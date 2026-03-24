import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AmmoProfile } from '../types/database';
import { Plus, CreditCard as Edit, Trash2, Package } from 'lucide-react';

export function AdminAmmoProfiles() {
  const [profiles, setProfiles] = useState<AmmoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AmmoProfile>>({
    manufacturer: '',
    name: '',
    caliber: '',
    bullet_weight_gr: 0,
    ballistic_coefficient_g1: 0,
    default_muzzle_velocity: 0,
    is_active: true
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('ammo_profiles')
      .select('*')
      .order('manufacturer', { ascending: true })
      .order('bullet_weight_gr', { ascending: true });

    if (data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.manufacturer || !formData.name || !formData.caliber) {
      alert('Vennligst fyll ut alle obligatoriske felt');
      return;
    }

    if (editingId) {
      await supabase
        .from('ammo_profiles')
        .update(formData)
        .eq('id', editingId);
    } else {
      await supabase
        .from('ammo_profiles')
        .insert([formData]);
    }

    setEditingId(null);
    setFormData({
      manufacturer: '',
      name: '',
      caliber: '',
      bullet_weight_gr: 0,
      ballistic_coefficient_g1: 0,
      default_muzzle_velocity: 0,
      is_active: true
    });
    fetchProfiles();
  };

  const handleEdit = (profile: AmmoProfile) => {
    setEditingId(profile.id);
    setFormData(profile);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne ammunisjonsprofilen?')) return;

    await supabase
      .from('ammo_profiles')
      .delete()
      .eq('id', id);

    fetchProfiles();
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      manufacturer: '',
      name: '',
      caliber: '',
      bullet_weight_gr: 0,
      ballistic_coefficient_g1: 0,
      default_muzzle_velocity: 0,
      is_active: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="w-6 h-6 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-900">Ammunisjonsprofiler</h2>
        </div>
        {!editingId && (
          <button
            onClick={() => setEditingId('new')}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>Ny profil</span>
          </button>
        )}
      </div>

      {editingId && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId === 'new' ? 'Ny ammunisjonsprofil' : 'Rediger ammunisjonsprofil'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Produsent *
              </label>
              <input
                type="text"
                value={formData.manufacturer || ''}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="f.eks. Lapua"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Navn *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="f.eks. Scenar 6.5 - 123 gr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kaliber *
              </label>
              <input
                type="text"
                value={formData.caliber || ''}
                onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="f.eks. 6.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kulevekt (grains) *
              </label>
              <input
                type="number"
                value={formData.bullet_weight_gr || ''}
                onChange={(e) => setFormData({ ...formData, bullet_weight_gr: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="f.eks. 123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ballistisk koeffisient (G1) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.ballistic_coefficient_g1 || ''}
                onChange={(e) => setFormData({ ...formData, ballistic_coefficient_g1: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="f.eks. 0.527"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Utgangshastighet (m/s) *
              </label>
              <input
                type="number"
                value={formData.default_muzzle_velocity || ''}
                onChange={(e) => setFormData({ ...formData, default_muzzle_velocity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="f.eks. 880"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active || false}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label className="ml-2 text-sm text-slate-700">
                Aktiv
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Lagre
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:border-emerald-200 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {profile.manufacturer} {profile.name}
                  </h3>
                  {!profile.is_active && (
                    <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">
                      Inaktiv
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Kaliber</p>
                    <p className="font-medium text-slate-900">{profile.caliber}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Kulevekt</p>
                    <p className="font-medium text-slate-900">{profile.bullet_weight_gr} gr</p>
                  </div>
                  <div>
                    <p className="text-slate-500">BC (G1)</p>
                    <p className="font-medium text-slate-900">{profile.ballistic_coefficient_g1}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">V₀</p>
                    <p className="font-medium text-slate-900">{profile.default_muzzle_velocity} m/s</p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(profile)}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                  title="Rediger"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Slett"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
