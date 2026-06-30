import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrainingSession,
  getTrainingSeries,
  addTrainingSeries,
  updateTrainingSeries,
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
  MapPin, Calendar, Cloud, Copy,
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
  const [editingSeries, setEditingSeries] = useState<TrainingSeries | null>(null);
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
    if (editingSeries) {
      await updateTrainingSeries({
        seriesId: editingSeries.id,
        shotCount: params.shotCount,
        shootingTimeSeconds: params.shootingTimeSeconds,
        distanceM: params.distanceM,
      });
      setEditingSeries(null);
    } else {
      await addTrainingSeries({
        sessionId: id,
        userId: user.id,
        orderIndex: seriesList.length,
        shotCount: params.shotCount,
        shootingTimeSeconds: params.shootingTimeSeconds,
        distanceM: params.distanceM,
      });
    }
    await fetchData();
  };

  const handleCopyLast = async () => {
    if (!id || !user) return;
    const last = seriesList[seriesList.length - 1];
    if (!last) return;
    await addTrainingSeries({
      sessionId: id,
      userId: user.id,
      orderIndex: seriesList.length,
      shotCount: last.shot_count,
      shootingTimeSeconds: last.shooting_time_seconds,
      distanceM: last.distance_m,
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
  const defaultShotCount = editingSeries?.shot_count || lastSeries?.shot_count || 5;
  const defaultShootingTime = editingSeries?.shooting_time_seconds || lastSeries?.shooting_time_seconds || undefined;
  const defaultDistance = editingSeries?.distance_m || lastSeries?.distance_m || undefined;

  const totalShots = seriesList.reduce((sum, s) => sum + s.shot_count, 0);
  const totalScore = seriesList.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalInner = seriesList.reduce((sum, s) => sum + (s.inner_hits || 0), 0);
  const completedCount = seriesList.filter(s => s.completed).length;
  const allCompleted = seriesList.length > 0 && completedCount === seriesList.length;

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
          <p className="text-slate-600">{isRangeMatch ? 'Stevne ikke funnet' : 'Trenings\u00F8kt ikke funnet'}</p>
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
                <p className="text-lg font-bold text-emerald-600">{totalScore || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Inner</p>
                <p className="text-lg font-bold text-slate-900">{totalInner || '\u2014'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {seriesList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">Ingen serier enda</p>
              <p className="text-sm text-slate-400">Legg til din f\u00F8rste serie for \u00E5 starte</p>
            </div>
          ) : (
            seriesList.map((s, idx) => (
              <div key={s.id} className="relative">
                <TrainingSeriesCard
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
                {isActive && !s.completed && (
                  <button
                    onClick={() => setEditingSeries(s)}
                    className="absolute top-2 right-12 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition z-10"
                    aria-label="Rediger serie"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {isActive && (
          <div>
            <div className="space-y-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-4 bg-white border-2 border-blue-400 hover:border-blue-600 hover:bg-blue-50 text-blue-700 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Legg til serie
              </button>
              {lastSeries && (
                <button
                  onClick={handleCopyLast}
                  className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition flex items-center justify-center gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Kopier forrige serie
                </button>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {isRangeMatch ? 'Avbryt stevne' : 'Avbryt \u00F8kt'}
              </button>

              <button
                onClick={() => setShowFinishConfirm(true)}
                disabled={seriesList.length === 0}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {allCompleted
                  ? (isRangeMatch ? 'Avslutt stevne' : 'Avslutt \u00F8kt')
                  : 'Lagre og avslutt'
                }
              </button>
            </div>
          </div>
        )}

        {(showAddModal || editingSeries) && (
          <AddSeriesModal
            defaultShotCount={defaultShotCount}
            defaultShootingTime={defaultShootingTime}
            defaultDistance={defaultDistance}
            isRangeMatch={isRangeMatch}
            isEditing={Boolean(editingSeries)}
            onAdd={handleAddSeries}
            onClose={() => { setShowAddModal(false); setEditingSeries(null); }}
          />
        )}

        <ConfirmDialog
          open={showFinishConfirm}
          title={
            allCompleted
              ? (isRangeMatch ? 'Avslutt banestevnet?' : 'Avslutt trenings\u00F8kten?')
              : 'Noen serier er ikke fullf\u00F8rt'
          }
          message={
            allCompleted
              ? (isRangeMatch
                  ? 'Du kan fortsatt se og redigere resultatet i historikken etterp\u00E5.'
                  : 'Du kan fortsatt se resultatet i treningsloggen etterp\u00E5.')
              : 'Du har serier uten registrert resultat. Du kan fortsatt avslutte og registrere resultater senere.'
          }
          confirmLabel={
            finishing
              ? 'Lagrer...'
              : allCompleted
                ? (isRangeMatch ? 'Avslutt stevne' : 'Avslutt \u00F8kt')
                : 'Lagre og avslutt'
          }
          cancelLabel={isRangeMatch ? 'Fortsett stevne' : 'Fortsett \u00F8kt'}
          variant="warning"
          isLoading={finishing}
          onConfirm={handleFinish}
          onCancel={() => setShowFinishConfirm(false)}
        />

        <ConfirmDialog
          open={showCancelConfirm}
          title={isRangeMatch ? 'Avbryt banestevnet?' : 'Avbryt trenings\u00F8kten?'}
          message={
            isRangeMatch
              ? 'Dette vil forkaste stevnet. Registrerte serier beholdes i historikken, men stevnet markeres som avbrutt.'
              : 'Dette vil forkaste \u00F8kten. Registrerte serier beholdes i historikken, men \u00F8kten markeres som avbrutt.'
          }
          confirmLabel={isRangeMatch ? 'Avbryt stevne' : 'Avbryt \u00F8kt'}
          cancelLabel={isRangeMatch ? 'Fortsett stevne' : 'Fortsett \u00F8kt'}
          variant="danger"
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />

        {showEditMeta && session && (
          <EditMetadataModal
            title={isRangeMatch ? 'Rediger banestevne' : 'Rediger trenings\u00F8kt'}
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
