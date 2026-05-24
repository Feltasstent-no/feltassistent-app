import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrainingSession,
  getTrainingSeries,
  addTrainingSeries,
  updateTrainingSeries,
  deleteTrainingSeries,
  cancelTrainingSession,
} from '../lib/training-session-service';
import { AddSeriesModal } from '../components/training/AddSeriesModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, Play, Plus, Copy, Pencil, Trash2, Trophy, Target, Clock, Ruler } from 'lucide-react';
import type { TrainingSession, TrainingSeries } from '../types/database';

export function RangeMatchSetup() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [seriesList, setSeriesList] = useState<TrainingSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<TrainingSeries | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [sess, series] = await Promise.all([
      getTrainingSession(id),
      getTrainingSeries(id),
    ]);
    setSession(sess);
    setSeriesList(series);
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

  const handleAdd = async (params: { shotCount: number; shootingTimeSeconds: number | null; distanceM: number | null }) => {
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

  const handleCopy = async (series: TrainingSeries) => {
    if (!id || !user) return;
    await addTrainingSeries({
      sessionId: id,
      userId: user.id,
      orderIndex: seriesList.length,
      shotCount: series.shot_count,
      shootingTimeSeconds: series.shooting_time_seconds,
      distanceM: series.distance_m,
    });
    await fetchData();
  };

  const handleCopyLast = async () => {
    const last = seriesList[seriesList.length - 1];
    if (last) await handleCopy(last);
  };

  const handleDelete = async (seriesId: string) => {
    await deleteTrainingSeries(seriesId);
    await fetchData();
  };

  const handleStart = async () => {
    if (!id || starting || seriesList.length === 0) return;
    setStarting(true);
    navigate(`/match/range/${id}/run`, { replace: true });
  };

  const handleCancelSession = async () => {
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

  const lastSeries = seriesList[seriesList.length - 1];
  const defaultShotCount = lastSeries?.shot_count || 5;
  const defaultShootingTime = lastSeries?.shooting_time_seconds || 60;
  const urlDistance = searchParams.get('defaultDistance');
  const defaultDistance = lastSeries?.distance_m || (urlDistance ? parseInt(urlDistance) : undefined);

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

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              <Trophy className="w-3 h-3" />
              Banestevne
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Legg inn alle serier før stevnet starter
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-emerald-800">
            <strong>Steg 1 av 2:</strong> Sett opp alle seriene du skal skyte. Du kan kopiere forrige serie for å spare tid.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {seriesList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-dashed border-slate-300 rounded-xl">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">Ingen serier planlagt</p>
              <p className="text-sm text-slate-400">Legg til din første serie</p>
            </div>
          ) : (
            seriesList.map((s, idx) => (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm mb-0.5">
                    Serie {idx + 1}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {s.distance_m ? (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        {s.distance_m} m
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {s.shot_count} skudd
                    </span>
                    {s.shooting_time_seconds ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.shooting_time_seconds} sek
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(s)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    aria-label="Kopier serie"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingSeries(s)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    aria-label="Rediger serie"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    aria-label="Slett serie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 mb-8">
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

        <div className="mt-10 pt-6 border-t border-slate-200 space-y-3">
          <button
            onClick={handleStart}
            disabled={starting || seriesList.length === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-lg font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {starting ? 'Starter...' : seriesList.length === 0 ? 'Legg til minst én serie' : `Start stevne (${seriesList.length} ${seriesList.length === 1 ? 'serie' : 'serier'})`}
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-xl transition text-sm"
          >
            Avbryt stevne
          </button>
        </div>

        {(showAddModal || editingSeries) && (
          <AddSeriesModal
            defaultShotCount={editingSeries?.shot_count ?? defaultShotCount}
            defaultShootingTime={editingSeries?.shooting_time_seconds ?? defaultShootingTime}
            defaultDistance={editingSeries?.distance_m ?? defaultDistance}
            isRangeMatch
            onAdd={handleAdd}
            onClose={() => { setShowAddModal(false); setEditingSeries(null); }}
          />
        )}

        <ConfirmDialog
          open={showCancelConfirm}
          title="Avbryt banestevnet?"
          message="Dette vil forkaste stevnet før det har startet."
          confirmLabel="Avbryt stevne"
          cancelLabel="Fortsett oppsett"
          variant="danger"
          onConfirm={handleCancelSession}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </div>
    </Layout>
  );
}
