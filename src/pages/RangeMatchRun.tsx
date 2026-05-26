import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrainingSession,
  getTrainingSeries,
  getSeriesImages,
  completeTrainingSession,
  cancelTrainingSession,
  addTrainingSeries,
} from '../lib/training-session-service';
import { TrainingSeriesCard } from '../components/training/TrainingSeriesCard';
import { AddSeriesModal } from '../components/training/AddSeriesModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldFigureSvg } from '../components/FieldFigureSvg';
import { useWakeLock } from '../lib/use-wake-lock';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trophy, Plus,
} from 'lucide-react';
import { PrepCountdown } from '../components/PrepCountdown';
import type { TrainingSession, TrainingSeries, TrainingSeriesImage } from '../types/database';

const LESJA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect x="0" y="0" width="300" height="300" fill="white"/><circle cx="150" cy="150" r="140" fill="black"/><circle cx="150" cy="150" r="100" fill="none" stroke="white" stroke-width="2"/><circle cx="150" cy="150" r="60" fill="none" stroke="white" stroke-width="2"/><circle cx="150" cy="150" r="20" fill="white"/></svg>`;

export function RangeMatchRun() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [seriesList, setSeriesList] = useState<TrainingSeries[]>([]);
  const [seriesImages, setSeriesImages] = useState<Record<string, TrainingSeriesImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const hasInitializedIndex = useRef(false);

  const isActive = session?.status === 'active';
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
    window.scrollTo({ top: 0 });
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (session && session.status !== 'active') {
      navigate(`/training/session/${session.id}/summary`, { replace: true });
    }
  }, [session, navigate]);

  const firstUncompletedIndex = useMemo(() => {
    const idx = seriesList.findIndex((s) => !s.completed);
    return idx === -1 ? Math.max(0, seriesList.length - 1) : idx;
  }, [seriesList]);

  useEffect(() => {
    if (!loading && seriesList.length > 0 && !hasInitializedIndex.current) {
      hasInitializedIndex.current = true;
      setCurrentIndex(firstUncompletedIndex);
    }
  }, [loading, seriesList.length, firstUncompletedIndex]);

  useEffect(() => {
    if (!loading && seriesList.length > 0 && currentIndex >= seriesList.length) {
      setCurrentIndex(Math.max(0, seriesList.length - 1));
    }
  }, [seriesList.length, loading, currentIndex]);

  const handleSeriesUpdated = async () => {
    await fetchData();
  };

  const handleSeriesCompleted = (wasAlreadyCompleted: boolean) => {
    if (wasAlreadyCompleted) return;
    setCurrentIndex((idx) => (idx < seriesList.length - 1 ? idx + 1 : idx));
  };

  const handleAdd = async (params: { shotCount: number; shootingTimeSeconds: number | null; distanceM: number | null }) => {
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
    setCurrentIndex(seriesList.length);
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
    navigate('/match', { replace: true });
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
          <p className="text-slate-600">Stevne ikke funnet</p>
        </div>
      </Layout>
    );
  }

  if (seriesList.length === 0) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto">
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">Ingen serier planlagt</p>
            <button
              onClick={() => navigate(`/match/range/${id}/setup`, { replace: true })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
            >
              Tilbake til oppsett
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentSeries = seriesList[currentIndex];
  const completedCount = seriesList.filter((s) => s.completed).length;
  const totalScore = seriesList.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalInner = seriesList.reduce((sum, s) => sum + (s.inner_hits || 0), 0);
  const allCompleted = completedCount === seriesList.length;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < seriesList.length - 1;

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-32 md:pb-8">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake</span>
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">{session.title}</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              <Trophy className="w-3 h-3" />
              Banestevne
            </span>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Serie</p>
            <div className="flex items-center gap-2">
              <PrepCountdown resetKey={currentIndex} variant="dark" />
              <p className="text-xs text-slate-400">{completedCount} / {seriesList.length} fullført</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 rounded-full overflow-hidden border border-slate-700">
              <FieldFigureSvg svgContent={LESJA_SVG} size="xs" />
            </div>
            <p className="text-2xl font-bold">
              Serie {currentIndex + 1} <span className="text-slate-400 text-lg font-medium">av {seriesList.length}</span>
              {currentSeries?.distance_m ? <span className="text-slate-400 text-base font-medium ml-2">— {currentSeries.distance_m}m</span> : null}
            </p>
          </div>
          <div className="flex gap-1">
            {seriesList.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-1 h-1.5 rounded-full transition ${
                  idx === currentIndex
                    ? 'bg-emerald-400'
                    : s.completed
                      ? 'bg-emerald-700'
                      : 'bg-slate-700'
                }`}
                aria-label={`Gå til serie ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={!canPrev}
            className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg transition flex items-center justify-center gap-1 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Forrige
          </button>
          <button
            onClick={() => setCurrentIndex(firstUncompletedIndex)}
            className="py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg transition text-sm"
          >
            Neste åpen
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(seriesList.length - 1, currentIndex + 1))}
            disabled={!canNext}
            className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg transition flex items-center justify-center gap-1 text-sm"
          >
            Neste
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {currentSeries && (
          <div className="mb-6">
            <TrainingSeriesCard
              key={currentSeries.id}
              series={currentSeries}
              images={seriesImages[currentSeries.id] || []}
              userId={user!.id}
              readOnly={false}
              hideTimer={false}
              isRangeMatch
              sourceType="bane"
              sourceName={session?.title || ''}
              sourceId={session?.id}
              onUpdated={handleSeriesUpdated}
              onDeleted={fetchData}
              onCompleted={handleSeriesCompleted}
            />
          </div>
        )}

        {seriesList.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Fullført</p>
                <p className="text-lg font-bold text-slate-900">{completedCount}/{seriesList.length}</p>
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

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 bg-emerald-50 border-2 border-dashed border-emerald-400 hover:bg-emerald-100 hover:border-emerald-500 text-emerald-700 font-medium rounded-xl transition flex items-center justify-center gap-2 mb-6 text-sm"
        >
          <Plus className="w-4 h-4" />
          Legg til ekstra serie
        </button>

        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Avbryt stevne
          </button>
          <button
            onClick={() => setShowFinishConfirm(true)}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {allCompleted ? 'Avslutt stevne' : 'Lagre og avslutt'}
          </button>
        </div>

        {showAddModal && (
          <AddSeriesModal
            defaultShotCount={currentSeries?.shot_count || 5}
            defaultShootingTime={currentSeries?.shooting_time_seconds || 60}
            defaultDistance={currentSeries?.distance_m || undefined}
            isRangeMatch
            onAdd={handleAdd}
            onClose={() => setShowAddModal(false)}
          />
        )}

        <ConfirmDialog
          open={showFinishConfirm}
          title={allCompleted ? 'Avslutt banestevnet?' : 'Noen serier er ikke fullført'}
          message={
            allCompleted
              ? 'Du kan fortsatt se og redigere resultatet i historikken etterpå.'
              : 'Du har serier uten registrert resultat. Du kan fortsatt avslutte stevnet og registrere resultater senere.'
          }
          confirmLabel={finishing ? 'Lagrer...' : allCompleted ? 'Avslutt stevne' : 'Lagre og avslutt'}
          cancelLabel="Fortsett stevne"
          variant="warning"
          isLoading={finishing}
          onConfirm={handleFinish}
          onCancel={() => setShowFinishConfirm(false)}
        />

        <ConfirmDialog
          open={showCancelConfirm}
          title="Avbryt banestevnet?"
          message="Dette markerer stevnet som avbrutt. Registrerte serier beholdes i historikken."
          confirmLabel="Avbryt stevne"
          cancelLabel="Fortsett stevne"
          variant="danger"
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </div>
    </Layout>
  );
}
