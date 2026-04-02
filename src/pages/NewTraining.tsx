import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Discipline, ShooterClass } from '../types/database';
import { Save, ArrowLeft } from 'lucide-react';
import { ShotCountDialog } from '../components/ShotCountDialog';
import { deductAmmoFromInventory } from '../lib/ammo-inventory-service';
import { logWeaponShots } from '../lib/weapon-shot-service';
import { getLastShooterClassCode, setLastShooterClassCode, getLastTrainingLocation, setLastTrainingLocation } from '../lib/user-preferences';

interface SimpleWeapon {
  id: string;
  weapon_name: string;
  weapon_number: string;
}

export function NewTraining() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [shooterClasses, setShooterClasses] = useState<ShooterClass[]>([]);
  const [weapons, setWeapons] = useState<SimpleWeapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showShotCountDialog, setShowShotCountDialog] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [shotUpdateResult, setShotUpdateResult] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);
  const shotUpdateInProgress = useRef(false);

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    discipline_id: '',
    class_code: '',
    location: '',
    distance_m: '',
    position: '',
    shots_total: '',
    score: '',
    inner_hits: '',
    hits: '',
    duration_minutes: '',
    duration_seconds: '',
    weather: '',
    wind_notes: '',
    equipment_notes: '',
    mental_notes: '',
    technical_notes: '',
    general_notes: '',
  });

  useEffect(() => {
    const savedClass = getLastShooterClassCode();
    const savedLocation = getLastTrainingLocation();
    if (savedClass || savedLocation) {
      setFormData(prev => ({
        ...prev,
        class_code: savedClass || prev.class_code,
        location: savedLocation || prev.location,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [disciplinesRes, classesRes, weaponsRes] = await Promise.all([
      supabase.from('disciplines').select('*').eq('is_active', true),
      supabase.from('shooter_classes').select('*').eq('is_active', true).order('sort_order'),
      supabase
        .from('weapons')
        .select('id, weapon_name, weapon_number')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);
    if (classesRes.data) setShooterClasses(classesRes.data);
    if (weaponsRes.data) setWeapons(weaponsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const minutes = formData.duration_minutes && formData.duration_minutes !== '' ? parseInt(formData.duration_minutes) : 0;
    const seconds = formData.duration_seconds && formData.duration_seconds !== '' ? parseInt(formData.duration_seconds) : 0;
    const totalSeconds = (minutes * 60) + seconds;

    const { data, error } = await supabase
      .from('training_entries')
      .insert({
        user_id: user?.id,
        entry_date: formData.entry_date,
        discipline_id: formData.discipline_id || null,
        program_id: null,
        class_code: formData.class_code || null,
        location: formData.location || null,
        distance_m: formData.distance_m ? parseInt(formData.distance_m) : null,
        position: formData.position || null,
        shots_total: formData.shots_total ? parseInt(formData.shots_total) : null,
        score: formData.score ? parseInt(formData.score) : null,
        inner_hits: formData.inner_hits ? parseInt(formData.inner_hits) : null,
        hits: formData.hits ? parseInt(formData.hits) : null,
        duration_seconds: totalSeconds || null,
        weather: formData.weather || null,
        wind_notes: formData.wind_notes || null,
        equipment_notes: formData.equipment_notes || null,
        mental_notes: formData.mental_notes || null,
        technical_notes: formData.technical_notes || null,
        general_notes: formData.general_notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving training entry:', error);
      setMessage({ type: 'error', text: `Kunne ikke lagre treningsøkt: ${error.message}` });
      setLoading(false);
    } else if (data) {
      if (formData.class_code) setLastShooterClassCode(formData.class_code);
      if (formData.location) setLastTrainingLocation(formData.location);
      setSavedEntryId(data.id);
      setLoading(false);

      const shotsTotal = formData.shots_total ? parseInt(formData.shots_total) : 0;
      if (shotsTotal > 0 && weapons.length > 0) {
        setShowShotCountDialog(true);
      } else {
        navigate(`/training/${data.id}`);
      }
    }
  };

  const handleConfirmShotCount = async (weaponId?: string, ammoInventoryId?: string | null) => {
    if (!weaponId || !formData.shots_total) {
      setShowShotCountDialog(false);
      if (savedEntryId) {
        navigate(`/training/${savedEntryId}`);
      }
      return;
    }

    if (shotUpdateInProgress.current) return;
    shotUpdateInProgress.current = true;

    const shotsTotal = parseInt(formData.shots_total);

    try {
      await logWeaponShots({
        userId: user!.id,
        weaponId,
        shotsFired: shotsTotal,
        shotDate: formData.entry_date,
        comment: `Trening: ${shotsTotal} skudd`,
        source: 'training',
      });

      let ammoDeducted = false;
      let ammoWarning = '';

      if (user && ammoInventoryId) {
        const { error: deductError } = await deductAmmoFromInventory({
          inventoryId: ammoInventoryId,
          userId: user.id,
          quantity: shotsTotal,
          notes: `Trening ${formData.entry_date}: ${shotsTotal} skudd`,
        });

        if (deductError) {
          ammoWarning = 'Skuddteller oppdatert, men kunne ikke trekke fra lager.';
        } else {
          ammoDeducted = true;
        }
      } else if (!ammoInventoryId) {
        ammoWarning = 'Skuddteller oppdatert. Ingen lagerpost valgt.';
      }

      setShowShotCountDialog(false);

      if (ammoDeducted) {
        setShotUpdateResult({
          type: 'success',
          text: `${shotsTotal} skudd lagt til på våpen og trukket fra lager`,
        });
      } else if (ammoWarning) {
        setShotUpdateResult({
          type: 'warning',
          text: ammoWarning,
        });
      }

      setTimeout(() => {
        if (savedEntryId) {
          navigate(`/training/${savedEntryId}`);
        }
      }, 2000);
    } catch (err) {
      console.error('Error updating shot count:', err);
      setShowShotCountDialog(false);
      if (savedEntryId) {
        navigate(`/training/${savedEntryId}`);
      }
    } finally {
      shotUpdateInProgress.current = false;
    }
  };

  const handleCancelShotCount = () => {
    setShowShotCountDialog(false);
    if (savedEntryId) {
      navigate(`/training/${savedEntryId}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl pb-20 md:pb-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Tilbake</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Ny treningsøkt</h1>
          <p className="text-slate-600 mt-1">Registrer en ny økt</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Grunnleggende info</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dato <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Disiplin
                </label>
                <select
                  value={formData.discipline_id}
                  onChange={(e) => setFormData({ ...formData, discipline_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                >
                  <option value="">Velg disiplin</option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Klasse
                  </label>
                  <select
                    value={formData.class_code}
                    onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  >
                    <option value="">Velg klasse</option>
                    {shooterClasses.map((sc) => (
                      <option key={sc.id} value={sc.code}>{sc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sted
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="Skytebane"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Avstand (m)
                  </label>
                  <input
                    type="number"
                    value={formData.distance_m}
                    onChange={(e) => setFormData({ ...formData, distance_m: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Stilling
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  >
                    <option value="">Velg</option>
                    <option value="liggende">Liggende</option>
                    <option value="stående">Stående</option>
                    <option value="knestående">Knestående</option>
                    <option value="fast program (DFS)">Fast program (DFS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Antall skudd
                  </label>
                  <input
                    type="number"
                    value={formData.shots_total}
                    onChange={(e) => setFormData({ ...formData, shots_total: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="25"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Resultat</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Poeng
                </label>
                <input
                  type="number"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Innertreff
                </label>
                <input
                  type="number"
                  value={formData.inner_hits}
                  onChange={(e) => setFormData({ ...formData, inner_hits: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Treff
                </label>
                <input
                  type="number"
                  value={formData.hits}
                  onChange={(e) => setFormData({ ...formData, hits: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="25"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Varighet
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Min"
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formData.duration_seconds}
                      onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Sek"
                      min="0"
                      max="59"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Notater</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vær
                </label>
                <input
                  type="text"
                  value={formData.weather}
                  onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Overskyet, 15°C"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vind
                </label>
                <input
                  type="text"
                  value={formData.wind_notes}
                  onChange={(e) => setFormData({ ...formData, wind_notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Lett sidevind fra venstre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tekniske notater
                </label>
                <textarea
                  value={formData.technical_notes}
                  onChange={(e) => setFormData({ ...formData, technical_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                  placeholder="Anslag, sikte, avtrekk..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mentale notater
                </label>
                <textarea
                  value={formData.mental_notes}
                  onChange={(e) => setFormData({ ...formData, mental_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                  placeholder="Fokus, konsentrasjon..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Utstyr
                </label>
                <textarea
                  value={formData.equipment_notes}
                  onChange={(e) => setFormData({ ...formData, equipment_notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                  placeholder="Rifle, ammunisjon..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Generell kommentar
                </label>
                <textarea
                  value={formData.general_notes}
                  onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                  placeholder="Andre observasjoner..."
                />
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg transition"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Lagrer...' : 'Lagre økt'}</span>
            </button>
          </div>
        </form>
      </div>

      <ShotCountDialog
        isOpen={showShotCountDialog}
        totalShots={formData.shots_total ? parseInt(formData.shots_total) : 0}
        weapons={weapons}
        userId={user?.id}
        onConfirm={handleConfirmShotCount}
        onCancel={handleCancelShotCount}
      />

      {shotUpdateResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
          <div
            className={`px-5 py-4 rounded-xl shadow-lg border text-sm font-medium ${
              shotUpdateResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {shotUpdateResult.text}
          </div>
        </div>
      )}
    </Layout>
  );
}
