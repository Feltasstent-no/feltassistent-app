import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrainingSession,
  getTrainingSeries,
  getSeriesImages,
  deleteTrainingSession,
  updateTrainingSessionMetadata,
} from '../lib/training-session-service';
import { TrainingSeriesCard } from '../components/training/TrainingSeriesCard';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, TrendingUp, Trophy, Pencil, Trash2, MapPin, Calendar, Cloud,
} from 'lucide-react';
import type { TrainingSession, TrainingSeries, TrainingSeriesImage, Discipline } from '../types/database';

export function TrainingSessionSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [seriesList, setSeriesList] = useState<TrainingSeries[]>([]);
  const [seriesImages, setSeriesImages] = useState<Record<string, TrainingSeriesImage[]>>({});
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditMeta, setShowEditMeta] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [sess, series] = await Promise.all([
      getTrainingSession(id),
      getTrainingSeries(id),
    ]);
    setSession(sess);
    setSeriesList(series);
    setSessionNotes(sess?.notes || '');

    if (sess?.discipline_id) {
      const { data } = await supabase.from('disciplines').select('*').eq('id', sess.discipline_id).maybeSingle();
      if (data) setDiscipline(data);
    }

    const imgMap: Record<string, TrainingSeriesImage[]> = {};
    await Promise.all(
      series.map(async (s) => {
        const imgs = await getSeriesImages(s.id);
        imgMap[s.id] = imgs;
      })
    );
    setSeriesImages(imgMap);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteTrainingSession(id);
    navigate(session?.session_type === 'range_match' ? '/match/history' : '/training', { replace: true });
  };

  const handleSaveNotes = async () => {
    if (!session || savingNotes) return;
    setSavingNotes(true);
    await updateTrainingSessionMetadata({
      sessionId: session.id,
      notes: sessionNotes || null,
    });
    setSession({ ...session, notes: sessionNotes || null });
    setSavingNotes(false);
    setShowNotesEdit(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Ikke funnet</p>
        </div>
      </Layout>
    );
  }

  const totalShots = seriesList.reduce((sum, s) => sum + s.shot_count, 0);
  const totalScore = seriesList.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalInner = seriesList.reduce((sum, s) => sum + (s.inner_hits || 0), 0);
  const totalHits = seriesList.reduce((sum, s) => sum + (s.hits || 0), 0);

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-20 md:pb-8">
        <button
          onClick={() => navigate(session.session_type === 'range_match' ? '/match/history' : '/training')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{session.session_type === 'range_match' ? 'Tilbake til historikk' : 'Tilbake til treningsoversikt'}</span>
        </button>

        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
            session.session_type === 'range_match' ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            {session.session_type === 'range_match' ? (
              <Trophy className="w-7 h-7 text-amber-600" />
            ) : (
              <TrendingUp className="w-7 h-7 text-emerald-600" />
            )}
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
            {session.session_type === 'range_match' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                <Trophy className="w-3 h-3" />
                Banestevne
              </span>
            )}
            <button
              onClick={() => setShowEditMeta(true)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(session.session_date).toLocaleDateString('nb-NO', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {session.location}
              </span>
            )}
          </div>
          {discipline && (
            <span className="inline-flex items-center px-3 py-1 mt-2 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {discipline.name}
            </span>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Sammendrag</h2>
          <div className={`grid ${session.session_type === 'range_match' ? 'grid-cols-3' : 'grid-cols-4'} gap-4 text-center`}>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{totalScore || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Poeng</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalInner || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Inner</p>
            </div>
            {session.session_type !== 'range_match' && (
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalHits || '—'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Treff</p>
              </div>
            )}
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalShots}</p>
              <p className="text-xs text-slate-500 mt-0.5">Skudd</p>
            </div>
          </div>
        </div>

        {(session.weather || session.wind_notes) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Forhold</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {session.weather && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Cloud className="w-4 h-4 text-slate-400" />
                  {session.weather}
                </div>
              )}
              {session.wind_notes && (
                <div className="text-slate-700">{session.wind_notes}</div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Serier ({seriesList.length})
            </h2>
          </div>
          <div className="space-y-3">
            {seriesList.map((s) => (
              <TrainingSeriesCard
                key={s.id}
                series={s}
                images={seriesImages[s.id] || []}
                userId={user!.id}
                readOnly={session.session_type !== 'range_match'}
                hideTimer
                isRangeMatch={session.session_type === 'range_match'}
                onUpdated={fetchData}
                onDeleted={fetchData}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              {session.session_type === 'range_match' ? 'Forbedringspunkter' : 'Læringspunkter'}
            </h2>
            {!showNotesEdit && (
              <button
                onClick={() => setShowNotesEdit(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {session.notes ? 'Rediger' : 'Legg til'}
              </button>
            )}
          </div>
          {showNotesEdit ? (
            <div className="space-y-2">
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Hva fungerte bra? Hva kan forbedres?"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  {savingNotes ? 'Lagrer...' : 'Lagre'}
                </button>
                <button
                  onClick={() => { setShowNotesEdit(false); setSessionNotes(session.notes || ''); }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg transition"
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : session.notes ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{session.notes}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Ingen notater enda</p>
          )}
        </div>

        <div className="flex justify-center">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              {session.session_type === 'range_match' ? 'Slett stevne' : 'Slett økt'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition"
              >
                Bekreft sletting
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg transition"
              >
                Avbryt
              </button>
            </div>
          )}
        </div>

        {showEditMeta && session && (
          <EditMetadataModal
            title={session.session_type === 'range_match' ? 'Rediger banestevne' : 'Rediger treningsøkt'}
            currentName={session.title}
            currentNotes={session.notes || ''}
            nameLabel="Tittel"
            notesLabel="Notater"
            onSave={async (name, notes) => {
              const { error } = await updateTrainingSessionMetadata({
                sessionId: session.id,
                title: name,
                notes,
              });
              if (error) throw error;
              setSession({ ...session, title: name, notes: notes || null });
              setSessionNotes(notes || '');
            }}
            onClose={() => setShowEditMeta(false)}
          />
        )}
      </div>
    </Layout>
  );
}
