import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ClickTable, ClickTableRow, Weapon, WeaponBarrel } from '../types/database';
import { Plus, Trash2, Save, ArrowLeft, CreditCard as Edit, X, Minus } from 'lucide-react';

export function ClickTableDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [table, setTable] = useState<ClickTable | null>(null);
  const [rows, setRows] = useState<ClickTableRow[]>([]);
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [barrel, setBarrel] = useState<WeaponBarrel | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    ammo_type: '',
    caliber: '',
    bullet_weight: '',
    muzzle_velocity: '',
    zero_distance: '',
    sight_info: '',
    notes: '',
  });

  const [newRow, setNewRow] = useState({
    distance_m: '',
    clicks: '',
  });

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    const [tableRes, rowsRes] = await Promise.all([
      supabase.from('click_tables').select('*').eq('id', id).maybeSingle(),
      supabase.from('click_table_rows').select('*').eq('click_table_id', id).order('distance_m'),
    ]);

    if (tableRes.data) {
      setTable(tableRes.data);
      setFormData({
        name: tableRes.data.name,
        ammo_type: tableRes.data.ammo_type || '',
        caliber: tableRes.data.caliber || '',
        bullet_weight: tableRes.data.bullet_weight || '',
        muzzle_velocity: tableRes.data.muzzle_velocity?.toString() || '',
        zero_distance: tableRes.data.zero_distance?.toString() || '100',
        sight_info: tableRes.data.sight_info || '',
        notes: tableRes.data.notes || '',
      });

      if (tableRes.data.weapon_id) {
        const { data: weaponData } = await supabase
          .from('weapons')
          .select('*')
          .eq('id', tableRes.data.weapon_id)
          .maybeSingle();
        if (weaponData) setWeapon(weaponData);
      }

      if (tableRes.data.barrel_id) {
        const { data: barrelData } = await supabase
          .from('weapon_barrels')
          .select('*')
          .eq('id', tableRes.data.barrel_id)
          .maybeSingle();
        if (barrelData) setBarrel(barrelData);
      }
    }

    if (rowsRes.data) setRows(rowsRes.data);
    setLoading(false);
  };

  const handleUpdateTable = async () => {
    if (!table) return;

    setSaving(true);

    const { error } = await supabase
      .from('click_tables')
      .update({
        name: formData.name,
        ammo_type: formData.ammo_type || null,
        caliber: formData.caliber || null,
        bullet_weight: formData.bullet_weight || null,
        muzzle_velocity: formData.muzzle_velocity || null,
        zero_distance: parseInt(formData.zero_distance),
        sight_info: formData.sight_info,
        notes: formData.notes || null,
      })
      .eq('id', table.id);

    setSaving(false);

    if (!error) {
      await fetchData();
      setEditMode(false);
    } else {
      alert('Feil ved lagring: ' + error.message);
    }
  };

  const handleAddRow = async () => {
    if (!table || !newRow.distance_m || !newRow.clicks) return;

    const { error } = await supabase.from('click_table_rows').insert({
      click_table_id: table.id,
      distance_m: parseInt(newRow.distance_m),
      clicks: parseInt(newRow.clicks),
    });

    if (!error) {
      fetchData();
      setNewRow({ distance_m: '', clicks: '' });
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Slett denne raden?')) return;

    await supabase.from('click_table_rows').delete().eq('id', rowId);
    fetchData();
  };

  const handleAdjustClicks = async (rowId: string, currentClicks: number, adjustment: number) => {
    const newClicks = currentClicks + adjustment;
    const { error } = await supabase
      .from('click_table_rows')
      .update({ clicks: newClicks })
      .eq('id', rowId);

    if (!error) {
      fetchData();
    }
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

  if (!table) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Knepptabell ikke funnet</h2>
          <button
            onClick={() => navigate('/click-tables')}
            className="text-emerald-600 hover:underline"
          >
            Tilbake til oversikt
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/click-tables')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake til knepptabeller</span>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {editMode ? 'Rediger tabell' : table.name}
              </h1>
              {weapon && (
                <div className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Våpen:</span> {weapon.weapon_name}
                  {barrel && (
                    <>
                      {' • '}
                      <span className="font-medium">Løp:</span> {barrel.barrel_number}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleUpdateTable}
                    disabled={saving}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Navn</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Kaliber</label>
                  <input
                    type="text"
                    value={formData.caliber}
                    onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ammunisjon</label>
                  <input
                    type="text"
                    value={formData.ammo_type}
                    onChange={(e) => setFormData({ ...formData, ammo_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Kulevekt</label>
                  <input
                    type="text"
                    value={formData.bullet_weight}
                    onChange={(e) => setFormData({ ...formData, bullet_weight: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Utgangshastighet (m/s)</label>
                  <input
                    type="number"
                    value={formData.muzzle_velocity}
                    onChange={(e) => setFormData({ ...formData, muzzle_velocity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Innskutt avstand (m)</label>
                  <input
                    type="number"
                    value={formData.zero_distance}
                    onChange={(e) => setFormData({ ...formData, zero_distance: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Siktetype</label>
                  <select
                    value={formData.sight_info}
                    onChange={(e) => setFormData({ ...formData, sight_info: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="Busk Standard">Busk Standard (grovknepp)</option>
                    <option value="Busk Finknepp">Busk Finknepp</option>
                    <option value="1/4 MOA">1/4 MOA</option>
                    <option value="1/2 MOA">1/2 MOA</option>
                    <option value="1 MOA">1 MOA</option>
                    <option value="0.1 mil">0.1 mil</option>
                    <option value="0.2 mil">0.2 mil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notater</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {table.caliber && (
                <div>
                  <p className="text-slate-500">Kaliber</p>
                  <p className="font-medium text-slate-900">{table.caliber}</p>
                </div>
              )}
              {table.ammo_type && (
                <div>
                  <p className="text-slate-500">Ammunisjon</p>
                  <p className="font-medium text-slate-900">{table.ammo_type}</p>
                </div>
              )}
              {table.bullet_weight && (
                <div>
                  <p className="text-slate-500">Kulevekt</p>
                  <p className="font-medium text-slate-900">{table.bullet_weight}</p>
                </div>
              )}
              {table.muzzle_velocity && (
                <div>
                  <p className="text-slate-500">Utgangshastighet</p>
                  <p className="font-medium text-slate-900">{table.muzzle_velocity} m/s</p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Innskutt avstand</p>
                <p className="font-medium text-slate-900">{table.zero_distance}m</p>
              </div>
              {table.sight_info && (
                <div>
                  <p className="text-slate-500">Siktetype</p>
                  <p className="font-medium text-slate-900">{table.sight_info}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Kneppverdier</h2>

          {rows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">Ingen kneppverdier lagt til enda</p>
              <p className="text-sm text-slate-500">Legg til kneppverdier for ulike avstander nedenfor</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center flex-1 gap-3 sm:gap-6">
                    <div className="w-16 sm:w-24">
                      <p className="text-xs text-slate-500 mb-1">Avstand</p>
                      <p className="text-base sm:text-lg font-semibold text-slate-900">{row.distance_m}m</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Knepp</p>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => handleAdjustClicks(row.id, row.clicks, -1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                            title="Reduser med 1 knepp"
                          >
                            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <div className="w-12 sm:w-16 text-center">
                            <span className="text-base sm:text-lg font-semibold text-emerald-600">
                              {row.clicks > 0 ? '+' : ''}{row.clicks}
                            </span>
                          </div>
                          <button
                            onClick={() => handleAdjustClicks(row.id, row.clicks, 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                            title="Øk med 1 knepp"
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <p className="text-sm font-medium text-slate-900 mb-3">Legg til ny kneppverdi</p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex gap-3 flex-1">
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 mb-1">Avstand (m)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={newRow.distance_m}
                    onChange={(e) => setNewRow({ ...newRow, distance_m: e.target.value })}
                    className="w-full px-3 sm:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 mb-1">Knepp opp</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={newRow.clicks}
                    onChange={(e) => setNewRow({ ...newRow, clicks: e.target.value })}
                    className="w-full px-3 sm:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={handleAddRow}
                disabled={!newRow.distance_m || !newRow.clicks}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Legg til</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
