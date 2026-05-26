import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrainingSession,
  getTrainingSeries,
  addTrainingSeries,
  completeTrainingSession,
  cancelTrainingSession,
  getSeriesImages,
  updateTrainingSessionMetadata,
} from '../lib/training-session-service';
import { TrainingSeriesCard } from '../components/training/TrainingSeriesCard';
import { AddSeriesModal } from '../components/training/AddSeriesModal';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useWakeLock } from '../lib/use-wake-lock';
import {
  ArrowLeft, Plus, CheckCircle, XCircle, Pencil, Target, Trophy,
  MapPin, Calendar, Cloud,
} from 'lucide-react';
import type { TrainingSession, TrainingSeries, TrainingSeriesImage } from '../types/database';

export function TrainingSessionActive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [seriesList, setSeriesList] = useState<TrainingSeries[]>([]);
  const [seriesImages, setSeriesImages] = useState<Record<string, TrainingSeriesImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditMeta, setShowEditMeta] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const isActive = session?.status === 'active';
  const isRangeMatch = session?.session_type === 'range_match';
  useWakeLock(isActive);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [sess, series] = await Promise.all([
      getTrainingSession(id),
      getTrainingSeries(id),
    ]);
    setSession(sess);
    setSeriesList(series);

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

  const handleAddSeries = async (params: { shotCount: number; shootingTimeSeconds: number | null; distanceM: number | null }) => {
    if (!id || !user) return;
    await addTrainingSeries({
      sessionId: id,
      userId: user.id,
      orderIndex: seriesList.length,
      shotCount: params.shotCount,
      shootingTimeSeconds: params.shootingTimeSeconds,
      distanceM: params.distanceM,
    });
    await fetchData();
  };

  const handleFinish = async () => {
    if (!id || finishing) return;
    setFinishing(true);
    await completeTrainingSession(id);
    navigate(`/training/session/${id}/summary`, { replace: true });
  };

  const handleCancel = async () => {
    if (!id) return;
    await cancelTrainingSession(id);
    navigate(isRangeMatch ? '/match' : '/training', { replace: true });
  };

  const lastSeries = seriesList[seriesList.length - 1];
  const defaultShotCount = lastSeries?.shot_count || 5;
  const defaultShootingTime = lastSeries?.shooting_time_seconds || undefined;
  const defaultDistance = lastSeries?.distance_m || undefined;

  const totalShots = seriesList.reduce((sum, s) => sum + s.shot_count, 0);
  const totalScore = seriesList.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalInner = seriesList.reduce((sum, s) => sum + (s.inner_hits || 0), 0);
  const completedCount = seriesList.filter(s => s.completed).length;

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
          <p className="text-slate-600">{isRangeMatch ? 'Stevne ikke funnet' : 'Treningsøkt ikke funnet'}</p>
        </div>
      </Layout>
    );
  }

  const readOnly = session.status !== 'active';

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-32 md:pb-8">
        <button
          onClick={() => navigate(isRangeMatch ? '/match' : '/training')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake</span>
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
            {session.session_type === 'range_match' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                <Trophy className="w-3 h-3" />
                Banestevne
              </span>
            )}
            {isActive && (
              <button
                onClick={() => setShowEditMeta(true)}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mt-1">
            <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              {new Date(session.session_date).toLocaleDateString('nb-NO')}
            </span>
            {session.location && (
              <span className="flex items-center gap-1 flex-shrink-0 truncate max-w-[12rem]">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{session.location}</span>
              </span>
            )}
            {session.weather && (
              <span className="flex items-center gap-1 flex-shrink-0 truncate max-w-[10rem]">
                <Cloud className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{session.weather}</span>
              </span>
            )}
            {isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 flex-shrink-0">
                Aktiv
              </span>
            )}
          </div>
        </div>

        {seriesList.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Serier</p>
                <p className="text-lg font-bold text-slate-900">{completedCount}/{seriesList.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Skudd</p>
                <p className="text-lg font-bold text-slate-900">{totalShots}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Poeng</p>
                <p className="text-lg font-bold text-emerald-600">{totalScore || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Inner</p>
                <p className="text-lg font-bold text-slate-900">{totalInner || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {seriesList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">Ingen serier enda</p>
              <p className="text-sm text-slate-400">Legg til din første serie for å starte</p>
            </div>
          ) : (
            seriesList.map((s, idx) => (
              <TrainingSeriesCard
                key={s.id}
                series={s}
                images={seriesImages[s.id] || []}
                userId={user!.id}
                readOnly={readOnly}
                hideTimer={idx !== seriesList.length - 1}
                sourceType="trening"
                sourceName={session?.title || ''}
                sourceId={session?.id}
                onUpdated={fetchData}
                onDeleted={fetchData}
              />
            ))
          )}
        </div>

        {isActive && (
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-4 bg-white border-2 border-blue-400 hover:border-blue-600 hover:bg-blue-50 text-blue-700 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Legg til serie
            </button>

            <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {isRangeMatch ? 'Avbryt stevne' : 'Avbryt økt'}
              </button>

              <button
                onClick={() => setShowFinishConfirm(true)}
                disabled={seriesList.length === 0}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isRangeMatch ? 'Avslutt stevne' : 'Fullfør økt'}
              </button>
            </div>
          </div>
        )}

        {showAddModal && (
          <AddSeriesModal
            defaultShotCount={defaultShotCount}
            defaultShootingTime={defaultShootingTime}
            defaultDistance={defaultDistance}
            isRangeMatch={isRangeMatch}
            onAdd={handleAddSeries}
            onClose={() => setShowAddModal(false)}
          />
        )}

        <ConfirmDialog
          open={showFinishConfirm}
          title={isRangeMatch ? 'Avslutt banestevnet?' : 'Avslutt treningsøkten?'}
          message={
            isRangeMatch
              ? 'Er du sikker på at du vil avslutte banestevnet? Du kan fortsatt se resultatet i historikken etterpå.'
              : 'Er du sikker på at du vil avslutte treningsøkten? Du kan fortsatt se resultatet i treningsloggen etterpå.'
          }
          confirmLabel={finishing ? 'Lagrer...' : isRangeMatch ? 'Avslutt stevne' : 'Avslutt økt'}
          cancelLabel={isRangeMatch ? 'Fortsett stevne' : 'Fortsett økt'}
          variant="warning"
          isLoading={finishing}
          onConfirm={handleFinish}
          onCancel={() => setShowFinishConfirm(false)}
        />

        <ConfirmDialog
          open={showCancelConfirm}
          title={isRangeMatch ? 'Avbryt banestevnet?' : 'Avbryt treningsøkten?'}
          message={
            isRangeMatch
              ? 'Dette vil forkaste stevnet. Registrerte serier beholdes i historikken, men stevnet markeres som avbrutt.'
              : 'Dette vil forkaste økten. Registrerte serier beholdes i historikken, men økten markeres som avbrutt.'
          }
          confirmLabel={isRangeMatch ? 'Avbryt stevne' : 'Avbryt økt'}
          cancelLabel={isRangeMatch ? 'Fortsett stevne' : 'Fortsett økt'}
          variant="danger"
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />

        {showEditMeta && session && (
          <EditMetadataModal
            title={isRangeMatch ? 'Rediger banestevne' : 'Rediger treningsøkt'}
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
            }}
            onClose={() => setShowEditMeta(false)}
          />
        )}
      </div>
    </Layout>
  );
}
