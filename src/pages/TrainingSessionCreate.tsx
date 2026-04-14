import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { supabase } from '../lib/supabase';
import { createTrainingSession } from '../lib/training-session-service';
import { getLastShooterClassCode, setLastShooterClassCode, getLastTrainingLocation, setLastTrainingLocation } from '../lib/user-preferences';
import { ArrowLeft, Play } from 'lucide-react';
import type { Discipline, ShooterClass } from '../types/database';

export function TrainingSessionCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSetup } = useActiveSetup();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [shooterClasses, setShooterClasses] = useState<ShooterClass[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [disciplineId, setDisciplineId] = useState('');
  const [classCode, setClassCode] = useState('');
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [windNotes, setWindNotes] = useState('');

  useEffect(() => {
    const savedClass = getLastShooterClassCode();
    const savedLocation = getLastTrainingLocation();
    if (savedClass) setClassCode(savedClass);
    if (savedLocation) setLocation(savedLocation);
  }, []);

  useEffect(() => {
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    const [disciplinesRes, classesRes] = await Promise.all([
      supabase.from('disciplines').select('*').eq('is_active', true),
      supabase.from('shooter_classes').select('*').eq('is_active', true).order('sort_order'),
    ]);
    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);
    if (classesRes.data) setShooterClasses(classesRes.data);
  };

  const handleStart = async () => {
    if (!user || saving) return;
    setSaving(true);

    const sessionTitle = title.trim() || `Trening ${new Date(sessionDate).toLocaleDateString('nb-NO')}`;

    if (classCode) setLastShooterClassCode(classCode);
    if (location) setLastTrainingLocation(location);

    const { data, error } = await createTrainingSession({
      userId: user.id,
      title: sessionTitle,
      sessionDate,
      disciplineId: disciplineId || null,
      location: location || null,
      weaponId: activeSetup?.weapon_id || null,
      barrelId: activeSetup?.barrel_id || null,
      classCode: classCode || null,
      weather: weather || null,
      windNotes: windNotes || null,
    });

    if (error) {
      console.error('Failed to create training session:', error);
      setSaving(false);
      return;
    }

    if (data) {
      navigate(`/training/session/${data.id}`, { replace: true });
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-20 md:pb-8">
        <button
          onClick={() => navigate('/training')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake</span>
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Ny treningsøkt</h1>
        <p className="text-slate-500 text-sm mb-6">Start en aktiv økt og legg til serier underveis</p>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tittel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                placeholder="F.eks. Felttrening Osen"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Dato</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sted</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                  placeholder="Skytebane"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Disiplin</label>
                <select
                  value={disciplineId}
                  onChange={(e) => setDisciplineId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                >
                  <option value="">Velg</option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Klasse</label>
                <select
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                >
                  <option value="">Velg</option>
                  {shooterClasses.map((sc) => (
                    <option key={sc.id} value={sc.code}>{sc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Forhold</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vær</label>
                <input
                  type="text"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                  placeholder="Sol, 18C"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vind</label>
                <input
                  type="text"
                  value={windNotes}
                  onChange={(e) => setWindNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-slate-900"
                  placeholder="Svak fra V"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={saving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-lg font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" />
            {saving ? 'Oppretter...' : 'Start treningsøkt'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
