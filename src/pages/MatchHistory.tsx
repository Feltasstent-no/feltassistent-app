import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getMatchHistory } from '../lib/match-service';
import { getRangeMatchSessions, deleteTrainingSession } from '../lib/training-session-service';
import { ArrowLeft, Calendar, CheckCircle, Pause, Trash2, Target } from 'lucide-react';
import type { MatchSession } from '../lib/match-service';
import type { TrainingSession } from '../types/database';
import { deleteMatchSession } from '../lib/deletion-service';
import { ConfirmDialog } from '../components/ConfirmDialog';

type HistoryItem =
  | { kind: 'match'; date: string; data: MatchSession }
  | { kind: 'range_match'; date: string; data: TrainingSession };

export function MatchHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: HistoryItem | null }>({
    isOpen: false,
    item: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [matches, ranges] = await Promise.all([
      getMatchHistory(user.id, 50),
      getRangeMatchSessions(user.id, 50),
    ]);

    const merged: HistoryItem[] = [
      ...matches.map<HistoryItem>((m) => ({ kind: 'match', date: m.match_date, data: m })),
      ...ranges.map<HistoryItem>((r) => ({ kind: 'range_match', date: r.session_date, data: r })),
    ];
    merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    setItems(merged);
    setLoading(false);
  };

  const handleDelete = async () => {
    const item = deleteConfirm.item;
    if (!item) return;

    setDeleting(true);
    try {
      if (item.kind === 'match') {
        await deleteMatchSession(item.data.id);
      } else {
        await deleteTrainingSession(item.data.id);
      }
      setItems((prev) => prev.filter((x) => !(x.kind === item.kind && x.data.id === item.data.id)));
      setDeleteConfirm({ isOpen: false, item: null });
    } catch (error) {
      console.error('[MatchHistory] Error deleting:', error);
      alert(`Kunne ikke slette: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
    } finally {
      setDeleting(false);
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
      <div className="max-w-2xl mx-auto pb-20 md:pb-8">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">Stevnehistorikk</h1>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Ingen stevner ennå</p>
            <button
              onClick={() => navigate('/match/setup')}
              className="text-emerald-600 hover:underline font-semibold"
            >
              Start ditt første stevne
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              if (item.kind === 'match') {
                const match = item.data;
                const route =
                  match.status === 'completed'
                    ? `/match/${match.id}/summary`
                    : match.status === 'setup'
                    ? `/match/${match.id}/configure`
                    : `/match/${match.id}`;

                return (
                  <div
                    key={`m-${match.id}`}
                    className="w-full bg-white border border-slate-200 rounded-xl p-5 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <button
                        onClick={() => navigate(route)}
                        className="flex-1 text-left hover:opacity-80 transition"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900">{match.match_name}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Feltstevne
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {new Date(match.match_date).toLocaleDateString('nb-NO', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </p>
                      </button>
                      <div className="ml-4 flex items-center gap-2">
                        {match.status === 'completed' ? (
                          <div className="flex items-center space-x-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Fullført</span>
                          </div>
                        ) : match.status === 'paused' ? (
                          <div className="flex items-center space-x-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </div>
                        ) : match.status === 'setup' ? (
                          <div className="flex items-center space-x-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                            <span>Ufullstendig</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                            <span>Pågår</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ isOpen: true, item });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Slett stevne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {match.notes && <p className="text-sm text-slate-500 mt-2">{match.notes}</p>}
                  </div>
                );
              }

              const sess = item.data;
              const route =
                sess.status === 'active'
                  ? `/training/session/${sess.id}`
                  : `/training/session/${sess.id}/summary`;

              return (
                <div
                  key={`r-${sess.id}`}
                  className="w-full bg-white border border-slate-200 rounded-xl p-5 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <button
                      onClick={() => navigate(route)}
                      className="flex-1 text-left hover:opacity-80 transition"
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{sess.title}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          <Target className="w-3 h-3" />
                          Banestevne
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {new Date(sess.session_date).toLocaleDateString('nb-NO', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </button>
                    <div className="ml-4 flex items-center gap-2">
                      {sess.status === 'completed' ? (
                        <div className="flex items-center space-x-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Fullført</span>
                        </div>
                      ) : sess.status === 'active' ? (
                        <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <span>Pågår</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <span>Avbrutt</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ isOpen: true, item });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Slett økt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {sess.notes && <p className="text-sm text-slate-500 mt-2">{sess.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.item?.kind === 'range_match' ? 'Slett økt?' : 'Slett stevne?'}
        message={`Er du sikker på at du vil slette "${
          deleteConfirm.item?.kind === 'match'
            ? deleteConfirm.item.data.match_name
            : deleteConfirm.item?.kind === 'range_match'
            ? deleteConfirm.item.data.title
            : ''
        }"? Dette kan ikke angres.`}
        confirmText="Slett"
        cancelText="Avbryt"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, item: null })}
        isDestructive={true}
        isLoading={deleting}
      />
    </Layout>
  );
}
