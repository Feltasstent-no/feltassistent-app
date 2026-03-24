import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { Weapon, WeaponBarrel } from '../types/database';
import { Plus, Crosshair, Trash2, Save, X, Calendar, CreditCard as Edit, PlusCircle, ChevronDown, ChevronUp, History, Pencil, AlertTriangle, Info } from 'lucide-react';
import { getBarrelHealthStatus, getBarrelLifespanLimit } from '../lib/barrel-lifespan';
import { logWeaponShots } from '../lib/weapon-shot-service';
import { AmmoInventorySection } from '../components/AmmoInventorySection';

interface WeaponShotLog {
  id: string;
  weapon_id: string;
  barrel_id: string | null;
  shots_fired: number;
  shot_date: string;
  comment: string | null;
  source: string;
  created_at: string;
}

export function Weapons() {
  const { user } = useAuth();
  const { activeSetup, setWeapon } = useActiveSetup();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  const [barrels, setBarrels] = useState<WeaponBarrel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewWeapon, setShowNewWeapon] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showNewBarrel, setShowNewBarrel] = useState(false);
  const [editingBarrel, setEditingBarrel] = useState<WeaponBarrel | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    shots: '',
    entry_date: new Date().toISOString().split('T')[0],
    comment: '',
  });
  const [shotLogs, setShotLogs] = useState<WeaponShotLog[]>([]);
  const [showShotHistory, setShowShotHistory] = useState(false);
  const [editingShotLog, setEditingShotLog] = useState<WeaponShotLog | null>(null);
  const [editShotForm, setEditShotForm] = useState({
    shots_fired: '',
    shot_date: '',
    barrel_id: '',
    comment: '',
  });

  const [weaponForm, setWeaponForm] = useState({
    weapon_number: '',
    weapon_name: '',
    weapon_type: '',
    caliber: '',
    sight_type: '',
    serial_number: '',
    notes: '',
  });

  const [barrelForm, setBarrelForm] = useState({
    barrel_number: '',
    barrel_name: '',
    serial_number: '',
    installed_date: new Date().toISOString().split('T')[0],
    notes: '',
    ammo_lifespan_profile: 'field_ammo' as 'field_ammo' | 'recruit_ammo' | 'custom',
    custom_lifespan_limit: '',
  });

  useEffect(() => {
    fetchWeapons();
  }, [user]);


  const fetchWeapons = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('weapons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setWeapons(data);
      if (data.length > 0 && !selectedWeapon) {
        selectWeapon(data[0]);
      }
    }

    setLoading(false);
  };

  const selectWeapon = async (weapon: Weapon) => {
    setSelectedWeapon(weapon);
    setEditMode(false);
    setShowNewWeapon(false);
    setShowNewBarrel(false);
    setEditingBarrel(null);

    const { data } = await supabase
      .from('weapon_barrels')
      .select('*')
      .eq('weapon_id', weapon.id)
      .order('installed_date', { ascending: false });

    if (data) setBarrels(data);

    const { data: logsData, error: logsError } = await supabase
      .from('weapon_shot_logs')
      .select('*')
      .eq('weapon_id', weapon.id)
      .order('shot_date', { ascending: false });

    if (logsError) {
      console.error('Error fetching weapon shot logs:', logsError);
    }

    if (logsData) setShotLogs(logsData);
  };

  const handleCreateWeapon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { data, error } = await supabase
      .from('weapons')
      .insert({
        user_id: user.id,
        weapon_number: weaponForm.weapon_number,
        weapon_name: weaponForm.weapon_name,
        weapon_type: weaponForm.weapon_type || null,
        caliber: weaponForm.caliber || null,
        sight_type: weaponForm.sight_type || null,
        notes: weaponForm.notes || null,
        is_active: true,
        total_shots_fired: 0,
      })
      .select()
      .single();

    if (!error && data) {
      if (weaponForm.serial_number) {
        await supabase.from('weapon_barrels').insert({
          weapon_id: data.id,
          barrel_number: '1',
          barrel_name: 'Løp 1',
          serial_number: weaponForm.serial_number,
          installed_date: new Date().toISOString().split('T')[0],
          is_active: true,
          total_shots_fired: 0,
        });
      }

      await fetchWeapons();
      selectWeapon(data);
      setShowNewWeapon(false);
      resetWeaponForm();
    }
  };

  const handleUpdateWeapon = async () => {
    if (!selectedWeapon) return;

    const { error } = await supabase
      .from('weapons')
      .update({
        weapon_number: weaponForm.weapon_number,
        weapon_name: weaponForm.weapon_name,
        weapon_type: weaponForm.weapon_type || null,
        caliber: weaponForm.caliber || null,
        sight_type: weaponForm.sight_type || null,
        notes: weaponForm.notes || null,
      })
      .eq('id', selectedWeapon.id);

    if (!error) {
      await fetchWeapons();
      setEditMode(false);
    }
  };

  const handleDeleteWeapon = async (weaponId: string) => {
    if (!confirm('Er du sikker på at du vil deaktivere dette våpenet?')) return;

    await supabase.from('weapons').update({ is_active: false }).eq('id', weaponId);
    setSelectedWeapon(null);
    setBarrels([]);
    fetchWeapons();
  };

  const handleAddBarrel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeapon) return;

    let existingBarrel = null;

    if (barrelForm.serial_number && barrelForm.serial_number.trim() !== '') {
      const { data } = await supabase
        .from('weapon_barrels')
        .select('*')
        .eq('weapon_id', selectedWeapon.id)
        .eq('serial_number', barrelForm.serial_number.trim())
        .maybeSingle();

      existingBarrel = data;
    }

    await supabase
      .from('weapon_barrels')
      .update({ is_active: false })
      .eq('weapon_id', selectedWeapon.id)
      .eq('is_active', true);

    if (existingBarrel) {
      const { error } = await supabase
        .from('weapon_barrels')
        .update({
          barrel_number: barrelForm.barrel_number,
          barrel_name: barrelForm.barrel_name || null,
          installed_date: barrelForm.installed_date,
          is_active: true,
          removed_date: null,
          notes: barrelForm.notes || null,
        })
        .eq('id', existingBarrel.id);

      if (!error) {
        selectWeapon(selectedWeapon);
        setShowNewBarrel(false);
        resetBarrelForm();
      }
    } else {
      const { error } = await supabase.from('weapon_barrels').insert({
        weapon_id: selectedWeapon.id,
        barrel_number: barrelForm.barrel_number,
        barrel_name: barrelForm.barrel_name || null,
        serial_number: barrelForm.serial_number || null,
        installed_date: barrelForm.installed_date,
        is_active: true,
        total_shots_fired: 0,
        notes: barrelForm.notes || null,
        ammo_lifespan_profile: barrelForm.ammo_lifespan_profile,
        custom_lifespan_limit: barrelForm.ammo_lifespan_profile === 'custom' && barrelForm.custom_lifespan_limit
          ? parseInt(barrelForm.custom_lifespan_limit)
          : null,
      });

      if (!error) {
        selectWeapon(selectedWeapon);
        setShowNewBarrel(false);
        resetBarrelForm();
      }
    }
  };

  const handleUpdateBarrel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarrel) return;

    const { error } = await supabase
      .from('weapon_barrels')
      .update({
        barrel_number: barrelForm.barrel_number,
        barrel_name: barrelForm.barrel_name || null,
        serial_number: barrelForm.serial_number || null,
        installed_date: barrelForm.installed_date,
        notes: barrelForm.notes || null,
        ammo_lifespan_profile: barrelForm.ammo_lifespan_profile,
        custom_lifespan_limit: barrelForm.ammo_lifespan_profile === 'custom' && barrelForm.custom_lifespan_limit
          ? parseInt(barrelForm.custom_lifespan_limit)
          : null,
      })
      .eq('id', editingBarrel.id);

    if (!error) {
      if (selectedWeapon) selectWeapon(selectedWeapon);
      setEditingBarrel(null);
      resetBarrelForm();
    }
  };

  const handleDeactivateBarrel = async (barrelId: string) => {
    if (!confirm('Deaktiver dette løpet?')) return;

    await supabase
      .from('weapon_barrels')
      .update({
        is_active: false,
        removed_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', barrelId);

    if (selectedWeapon) selectWeapon(selectedWeapon);
  };

  const startEditBarrel = (barrel: WeaponBarrel) => {
    setEditingBarrel(barrel);
    setBarrelForm({
      barrel_number: barrel.barrel_number,
      barrel_name: barrel.barrel_name || '',
      serial_number: barrel.serial_number || '',
      installed_date: barrel.installed_date,
      notes: barrel.notes || '',
      ammo_lifespan_profile: barrel.ammo_lifespan_profile,
      custom_lifespan_limit: barrel.custom_lifespan_limit?.toString() || '',
    });
    setShowNewBarrel(false);
  };

  const startEdit = () => {
    if (!selectedWeapon) return;
    setWeaponForm({
      weapon_number: selectedWeapon.weapon_number,
      weapon_name: selectedWeapon.weapon_name,
      weapon_type: selectedWeapon.weapon_type || '',
      caliber: selectedWeapon.caliber || '',
      sight_type: selectedWeapon.sight_type || '',
      notes: selectedWeapon.notes || '',
    });
    setEditMode(true);
  };

  const resetWeaponForm = () => {
    setWeaponForm({
      weapon_number: '',
      weapon_name: '',
      weapon_type: '',
      caliber: '',
      sight_type: '',
      serial_number: '',
      notes: '',
    });
  };

  const resetBarrelForm = () => {
    setBarrelForm({
      barrel_number: '',
      barrel_name: '',
      serial_number: '',
      installed_date: new Date().toISOString().split('T')[0],
      notes: '',
      ammo_lifespan_profile: 'field_ammo',
      custom_lifespan_limit: '',
    });
  };

  const recalculateWeaponTotals = async (weaponId: string) => {
    const { data: logs } = await supabase
      .from('weapon_shot_logs')
      .select('shots_fired, barrel_id')
      .eq('weapon_id', weaponId);

    if (!logs) return;

    const weaponTotal = logs.reduce((sum, log) => sum + log.shots_fired, 0);

    await supabase
      .from('weapons')
      .update({ total_shots_fired: weaponTotal })
      .eq('id', weaponId);

    const barrelTotals = new Map<string, number>();
    logs.forEach(log => {
      if (log.barrel_id) {
        barrelTotals.set(
          log.barrel_id,
          (barrelTotals.get(log.barrel_id) || 0) + log.shots_fired
        );
      }
    });

    for (const [barrelId, total] of barrelTotals.entries()) {
      await supabase
        .from('weapon_barrels')
        .update({ total_shots_fired: total })
        .eq('id', barrelId);
    }

    const { data: allBarrels } = await supabase
      .from('weapon_barrels')
      .select('id')
      .eq('weapon_id', weaponId);

    if (allBarrels) {
      for (const barrel of allBarrels) {
        if (!barrelTotals.has(barrel.id)) {
          await supabase
            .from('weapon_barrels')
            .update({ total_shots_fired: 0 })
            .eq('id', barrel.id);
        }
      }
    }
  };

  const handleEditShotLog = (log: WeaponShotLog) => {
    setEditingShotLog(log);
    setEditShotForm({
      shots_fired: log.shots_fired.toString(),
      shot_date: log.shot_date,
      barrel_id: log.barrel_id || '',
      comment: log.comment || '',
    });
  };

  const handleUpdateShotLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShotLog || !selectedWeapon) return;

    const shotsToUpdate = parseInt(editShotForm.shots_fired);
    if (isNaN(shotsToUpdate) || shotsToUpdate <= 0) {
      alert('Vennligst skriv inn et gyldig antall skudd');
      return;
    }

    try {
      const { error } = await supabase
        .from('weapon_shot_logs')
        .update({
          shots_fired: shotsToUpdate,
          shot_date: editShotForm.shot_date,
          barrel_id: editShotForm.barrel_id || null,
          comment: editShotForm.comment || null,
        })
        .eq('id', editingShotLog.id);

      if (error) throw error;

      await recalculateWeaponTotals(selectedWeapon.id);
      await fetchWeapons();
      if (selectedWeapon) selectWeapon(selectedWeapon);

      setEditingShotLog(null);
      setEditShotForm({
        shots_fired: '',
        shot_date: '',
        barrel_id: '',
        comment: '',
      });
    } catch (error) {
      console.error('Error updating shot log:', error);
      alert('Feil ved oppdatering av skuddlogg');
    }
  };

  const handleDeleteShotLog = async (logId: string) => {
    if (!selectedWeapon) return;
    if (!confirm('Er du sikker på at du vil slette denne skuddloggen?')) return;

    try {
      const { error } = await supabase
        .from('weapon_shot_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      await recalculateWeaponTotals(selectedWeapon.id);
      await fetchWeapons();
      if (selectedWeapon) selectWeapon(selectedWeapon);
    } catch (error) {
      console.error('Error deleting shot log:', error);
      alert('Feil ved sletting av skuddlogg');
    }
  };


  const handleManualShotEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeapon || !user) return;

    const shotsToAdd = parseInt(manualEntryForm.shots);
    if (isNaN(shotsToAdd) || shotsToAdd <= 0) {
      alert('Vennligst skriv inn et gyldig antall skudd');
      return;
    }

    try {
      await logWeaponShots({
        userId: user.id,
        weaponId: selectedWeapon.id,
        shotsFired: shotsToAdd,
        shotDate: manualEntryForm.entry_date,
        comment: manualEntryForm.comment || undefined,
        source: 'weapons_page',
      });

      await fetchWeapons();
      if (selectedWeapon) {
        const { data: updatedWeapon } = await supabase
          .from('weapons')
          .select('*')
          .eq('id', selectedWeapon.id)
          .single();
        if (updatedWeapon) {
          setSelectedWeapon(updatedWeapon);
          selectWeapon(updatedWeapon);
        }
      }

      setShowManualEntry(false);
      setManualEntryForm({
        shots: '',
        entry_date: new Date().toISOString().split('T')[0],
        comment: '',
      });
    } catch (error) {
      console.error('Error logging weapon shots:', error);
      alert('Feil ved lagring av skudd');
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

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mine våpen</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Administrer dine våpen og løp</p>
          </div>
          <button
            onClick={() => {
              setShowNewWeapon(true);
              setSelectedWeapon(null);
              resetWeaponForm();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 sm:py-3 sm:px-6 rounded-lg transition flex items-center space-x-2 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nytt våpen</span>
            <span className="sm:hidden">Ny</span>
          </button>
        </div>

        {weapons.length === 0 && !showNewWeapon ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Crosshair className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Ingen våpen registrert</h2>
            <p className="text-slate-600 mb-6">
              Registrer dine våpen for å knytte knepptabeller og spore skuddtelling
            </p>
            <button
              onClick={() => setShowNewWeapon(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Registrer første våpen</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h2 className="font-semibold text-slate-900 mb-4">Mine våpen</h2>
                <div className="space-y-2">
                  {weapons.map((weapon) => (
                    <button
                      key={weapon.id}
                      onClick={() => selectWeapon(weapon)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedWeapon?.id === weapon.id
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{weapon.weapon_name}</p>
                      <p className="text-sm text-slate-600">{weapon.weapon_type}</p>
                      {weapon.caliber && (
                        <p className="text-xs text-slate-500">{weapon.caliber}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {showNewWeapon ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Nytt våpen</h2>
                    <button
                      onClick={() => setShowNewWeapon(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateWeapon} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Våpennummer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={weaponForm.weapon_number}
                        onChange={(e) =>
                          setWeaponForm({ ...weaponForm, weapon_number: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="V001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Våpennavn <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={weaponForm.weapon_name}
                        onChange={(e) =>
                          setWeaponForm({ ...weaponForm, weapon_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Min Sauer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Våpentype
                        </label>
                        <input
                          type="text"
                          value={weaponForm.weapon_type}
                          onChange={(e) =>
                            setWeaponForm({ ...weaponForm, weapon_type: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="Sauer STR"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Kaliber
                        </label>
                        <input
                          type="text"
                          value={weaponForm.caliber}
                          onChange={(e) =>
                            setWeaponForm({ ...weaponForm, caliber: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="6.5x55"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Sikte</label>
                      <input
                        type="text"
                        value={weaponForm.sight_type}
                        onChange={(e) =>
                          setWeaponForm({ ...weaponForm, sight_type: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Busk Standard"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Serienummer løp
                      </label>
                      <input
                        type="text"
                        value={weaponForm.serial_number}
                        onChange={(e) =>
                          setWeaponForm({ ...weaponForm, serial_number: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Notater
                      </label>
                      <textarea
                        value={weaponForm.notes}
                        onChange={(e) =>
                          setWeaponForm({ ...weaponForm, notes: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Opprett våpen</span>
                    </button>
                  </form>
                </div>
              ) : selectedWeapon ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          {editMode ? 'Rediger våpen' : selectedWeapon.weapon_name}
                        </h2>
                        {activeSetup?.weapon_id === selectedWeapon.id && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Aktivt våpen
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {!editMode && activeSetup?.weapon_id !== selectedWeapon.id && (
                          <button
                            onClick={async () => {
                              await setWeapon(selectedWeapon.id, barrels.find(b => b.is_active)?.id || null);
                              alert('Våpen satt som aktivt');
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                          >
                            Sett som aktivt
                          </button>
                        )}
                        {editMode ? (
                          <>
                            <button
                              onClick={() => setEditMode(false)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleUpdateWeapon}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={startEdit}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteWeapon(selectedWeapon.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editMode ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Våpennummer
                          </label>
                          <input
                            type="text"
                            value={weaponForm.weapon_number}
                            onChange={(e) =>
                              setWeaponForm({ ...weaponForm, weapon_number: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Våpennavn
                          </label>
                          <input
                            type="text"
                            value={weaponForm.weapon_name}
                            onChange={(e) =>
                              setWeaponForm({ ...weaponForm, weapon_name: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Våpentype
                            </label>
                            <input
                              type="text"
                              value={weaponForm.weapon_type}
                              onChange={(e) =>
                                setWeaponForm({ ...weaponForm, weapon_type: e.target.value })
                              }
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Kaliber
                            </label>
                            <input
                              type="text"
                              value={weaponForm.caliber}
                              onChange={(e) =>
                                setWeaponForm({ ...weaponForm, caliber: e.target.value })
                              }
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Sikte</label>
                          <input
                            type="text"
                            value={weaponForm.sight_type}
                            onChange={(e) =>
                              setWeaponForm({ ...weaponForm, sight_type: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Notater</label>
                          <textarea
                            value={weaponForm.notes}
                            onChange={(e) =>
                              setWeaponForm({ ...weaponForm, notes: e.target.value })
                            }
                            rows={2}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Våpennummer</p>
                            <p className="font-medium text-slate-900">
                              {selectedWeapon.weapon_number}
                            </p>
                          </div>
                          {selectedWeapon.weapon_type && (
                            <div>
                              <p className="text-slate-500">Type</p>
                              <p className="font-medium text-slate-900">
                                {selectedWeapon.weapon_type}
                              </p>
                            </div>
                          )}
                          {selectedWeapon.caliber && (
                            <div>
                              <p className="text-slate-500">Kaliber</p>
                              <p className="font-medium text-slate-900">
                                {selectedWeapon.caliber}
                              </p>
                            </div>
                          )}
                          {selectedWeapon.sight_type && (
                            <div>
                              <p className="text-slate-500">Sikte</p>
                              <p className="font-medium text-slate-900">
                                {selectedWeapon.sight_type}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-500">Totalt skudd</p>
                            <p className="font-medium text-slate-900">
                              {selectedWeapon.total_shots_fired}
                            </p>
                          </div>
                        </div>
                        {selectedWeapon.notes && (
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Notater</p>
                            <p className="text-sm text-slate-700">{selectedWeapon.notes}</p>
                          </div>
                        )}
                        <div className="pt-4 border-t border-slate-200">
                          <button
                            onClick={() => setShowManualEntry(!showManualEntry)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center space-x-2"
                          >
                            <PlusCircle className="w-5 h-5" />
                            <span>Legg til skudd manuelt</span>
                          </button>
                        </div>
                        {showManualEntry && (
                          <form onSubmit={handleManualShotEntry} className="mt-4 p-4 bg-emerald-50 rounded-lg">
                            <p className="text-sm font-medium text-emerald-900 mb-3">Legg til skudd</p>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Antall skudd *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={manualEntryForm.shots}
                                  onChange={(e) =>
                                    setManualEntryForm({ ...manualEntryForm, shots: e.target.value })
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                  placeholder="F.eks. 50"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Dato
                                </label>
                                <input
                                  type="date"
                                  value={manualEntryForm.entry_date}
                                  onChange={(e) =>
                                    setManualEntryForm({ ...manualEntryForm, entry_date: e.target.value })
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Kommentar
                                </label>
                                <textarea
                                  value={manualEntryForm.comment}
                                  onChange={(e) =>
                                    setManualEntryForm({ ...manualEntryForm, comment: e.target.value })
                                  }
                                  rows={2}
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                  placeholder="F.eks. Trening på 200m"
                                />
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  type="submit"
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition py-2"
                                >
                                  Legg til
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowManualEntry(false);
                                    setManualEntryForm({
                                      shots: '',
                                      entry_date: new Date().toISOString().split('T')[0],
                                      comment: '',
                                    });
                                  }}
                                  className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                                >
                                  Avbryt
                                </button>
                              </div>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">Løpsoversikt</h3>
                      <button
                        onClick={() => {
                          setShowNewBarrel(true);
                          setEditingBarrel(null);
                          resetBarrelForm();
                        }}
                        className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nytt løp</span>
                      </button>
                    </div>
                    <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Levetid er veiledende og påvirkes av ammunisjon, varme, belastning og presisjonskrav.
                      </p>
                    </div>

                    {showNewBarrel && (
                      <form onSubmit={handleAddBarrel} className="mb-6 p-4 bg-emerald-50 rounded-lg">
                        <p className="text-sm font-medium text-emerald-900 mb-3">Legg til nytt løp</p>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Løpnummer *
                              </label>
                              <input
                                type="text"
                                placeholder="F.eks. Løp 1"
                                required
                                value={barrelForm.barrel_number}
                                onChange={(e) =>
                                  setBarrelForm({ ...barrelForm, barrel_number: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Løpsnavn
                              </label>
                              <input
                                type="text"
                                placeholder="F.eks. Match-løp"
                                value={barrelForm.barrel_name}
                                onChange={(e) =>
                                  setBarrelForm({ ...barrelForm, barrel_name: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Serienummer løp
                            </label>
                            <input
                              type="text"
                              placeholder="Produsentens serienummer"
                              value={barrelForm.serial_number}
                              onChange={(e) =>
                                setBarrelForm({ ...barrelForm, serial_number: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Installert dato
                            </label>
                            <input
                              type="date"
                              value={barrelForm.installed_date}
                              onChange={(e) =>
                                setBarrelForm({ ...barrelForm, installed_date: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Levetidsprofil
                            </label>
                            <select
                              value={barrelForm.ammo_lifespan_profile}
                              onChange={(e) =>
                                setBarrelForm({
                                  ...barrelForm,
                                  ammo_lifespan_profile: e.target.value as 'field_ammo' | 'recruit_ammo' | 'custom',
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                              <option value="field_ammo">Feltammo (7500 skudd)</option>
                              <option value="recruit_ammo">Rekruttammo (12000 skudd)</option>
                              <option value="custom">Egendefinert</option>
                            </select>
                          </div>
                          {barrelForm.ammo_lifespan_profile === 'custom' && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Maks antall skudd *
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={barrelForm.custom_lifespan_limit}
                                onChange={(e) =>
                                  setBarrelForm({ ...barrelForm, custom_lifespan_limit: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Notater
                            </label>
                            <textarea
                              value={barrelForm.notes}
                              onChange={(e) =>
                                setBarrelForm({ ...barrelForm, notes: e.target.value })
                              }
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition py-2"
                            >
                              Legg til løp
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewBarrel(false);
                                resetBarrelForm();
                              }}
                              className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                            >
                              Avbryt
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {editingBarrel && (
                      <form onSubmit={handleUpdateBarrel} className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-3">Rediger løp</p>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Løpnummer *
                              </label>
                              <input
                                type="text"
                                required
                                value={barrelForm.barrel_number}
                                onChange={(e) =>
                                  setBarrelForm({ ...barrelForm, barrel_number: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Løpsnavn
                              </label>
                              <input
                                type="text"
                                value={barrelForm.barrel_name}
                                onChange={(e) =>
                                  setBarrelForm({ ...barrelForm, barrel_name: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Serienummer
                            </label>
                            <input
                              type="text"
                              value={barrelForm.serial_number}
                              onChange={(e) =>
                                setBarrelForm({ ...barrelForm, serial_number: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Installert dato
                            </label>
                            <input
                              type="date"
                              value={barrelForm.installed_date}
                              onChange={(e) =>
                                setBarrelForm({ ...barrelForm, installed_date: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Levetidsprofil
                            </label>
                            <select
                              value={barrelForm.ammo_lifespan_profile}
                              onChange={(e) =>
                                setBarrelForm({
                                  ...barrelForm,
                                  ammo_lifespan_profile: e.target.value as 'field_ammo' | 'recruit_ammo' | 'custom',
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="field_ammo">Feltammo (7500 skudd)</option>
                              <option value="recruit_ammo">Rekruttammo (12000 skudd)</option>
                              <option value="custom">Egendefinert</option>
                            </select>
                          </div>
                          {barrelForm.ammo_lifespan_profile === 'custom' && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Maks antall skudd *
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={barrelForm.custom_lifespan_limit}
                                onChange={(e) =>
                                  setBarrelForm({ ...barrelForm, custom_lifespan_limit: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Notater
                            </label>
                            <textarea
                              value={barrelForm.notes}
                              onChange={(e) =>
                                setBarrelForm({ ...barrelForm, notes: e.target.value })
                              }
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition py-2"
                            >
                              Lagre endringer
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBarrel(null);
                                resetBarrelForm();
                              }}
                              className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                            >
                              Avbryt
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {barrels.map((barrel) => {
                        const lifeStatus = getBarrelHealthStatus(barrel);
                        return (
                          <div
                            key={barrel.id}
                            className={`p-4 rounded-lg border ${
                              barrel.is_active
                                ? 'bg-white border-slate-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="font-semibold text-slate-900">{barrel.barrel_number}</p>
                                  {barrel.is_active && (
                                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                                      Aktivt
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded">
                                    {lifeStatus.profileLabel}
                                  </span>
                                </div>
                                {barrel.barrel_name && (
                                  <p className="text-sm text-slate-600">{barrel.barrel_name}</p>
                                )}
                                {barrel.serial_number && (
                                  <p className="text-xs text-slate-500">S/N: {barrel.serial_number}</p>
                                )}
                              </div>
                              {barrel.is_active && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => startEditBarrel(barrel)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Rediger løp"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeactivateBarrel(barrel.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Deaktiver løp"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {barrel.is_active && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className={`font-medium ${lifeStatus.statusColor}`}>
                                    {lifeStatus.status}
                                  </span>
                                  <span className="text-slate-600">
                                    {barrel.total_shots_fired} / {lifeStatus.limit} skudd
                                  </span>
                                </div>
                                <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`absolute left-0 top-0 h-full ${lifeStatus.barColor} transition-all`}
                                    style={{ width: `${Math.min(lifeStatus.percentage, 100)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{lifeStatus.percentage.toFixed(1)}% brukt</span>
                                  {lifeStatus.remaining > 0 ? (
                                    <span>{lifeStatus.remaining} skudd igjen</span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-red-600">
                                      <AlertTriangle className="w-3 h-3" />
                                      Over levetid
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {!barrel.is_active && (
                              <div className="flex items-center space-x-4 text-xs text-slate-500">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    Installert: {new Date(barrel.installed_date).toLocaleDateString('nb-NO')}
                                  </span>
                                </div>
                                {barrel.removed_date && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      Fjernet: {new Date(barrel.removed_date).toLocaleDateString('nb-NO')}
                                    </span>
                                  </div>
                                )}
                                <span>{barrel.total_shots_fired} skudd</span>
                              </div>
                            )}

                            {barrel.notes && (
                              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                                {barrel.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <AmmoInventorySection weapon={selectedWeapon} barrels={barrels} />

                  {shotLogs.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                      <button
                        onClick={() => setShowShotHistory(!showShotHistory)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-slate-600" />
                          <h3 className="text-lg font-semibold text-slate-900">
                            Skuddhistorikk ({shotLogs.length})
                          </h3>
                        </div>
                        {showShotHistory ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      {showShotHistory && (
                        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                          {shotLogs.map((log) => {
                            const barrel = barrels.find(b => b.id === log.barrel_id);
                            const sourceLabels: Record<string, string> = {
                              'dashboard': 'Dashboard',
                              'weapons_page': 'Våpen',
                              'quick_assistant': 'Assistent',
                            };
                            const isEditing = editingShotLog?.id === log.id;

                            return (
                              <div
                                key={log.id}
                                className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                              >
                                {isEditing ? (
                                  <form onSubmit={handleUpdateShotLog} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                          Antall skudd *
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          required
                                          value={editShotForm.shots_fired}
                                          onChange={(e) =>
                                            setEditShotForm({ ...editShotForm, shots_fired: e.target.value })
                                          }
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                          Dato *
                                        </label>
                                        <input
                                          type="date"
                                          required
                                          value={editShotForm.shot_date}
                                          onChange={(e) =>
                                            setEditShotForm({ ...editShotForm, shot_date: e.target.value })
                                          }
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Løp
                                      </label>
                                      <select
                                        value={editShotForm.barrel_id}
                                        onChange={(e) =>
                                          setEditShotForm({ ...editShotForm, barrel_id: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      >
                                        <option value="">Ikke knyttet til løp</option>
                                        {barrels.map(b => (
                                          <option key={b.id} value={b.id}>
                                            {b.barrel_name || b.barrel_number}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Kommentar
                                      </label>
                                      <textarea
                                        value={editShotForm.comment}
                                        onChange={(e) =>
                                          setEditShotForm({ ...editShotForm, comment: e.target.value })
                                        }
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                                      >
                                        Lagre
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingShotLog(null);
                                          setEditShotForm({
                                            shots_fired: '',
                                            shot_date: '',
                                            barrel_id: '',
                                            comment: '',
                                          });
                                        }}
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
                                      >
                                        Avbryt
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-900">
                                          {log.shots_fired} skudd
                                        </span>
                                        {barrel && (
                                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                                            {barrel.barrel_name || barrel.barrel_number}
                                          </span>
                                        )}
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                          {sourceLabels[log.source] || log.source}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(log.shot_date).toLocaleDateString('nb-NO')}</span>
                                      </div>
                                      {log.comment && (
                                        <p className="text-sm text-slate-600 mt-1">{log.comment}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                      <button
                                        onClick={() => handleEditShotLog(log)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                        title="Rediger"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteShotLog(log.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                        title="Slett"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <p className="text-slate-600">Velg et våpen eller opprett et nytt</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
