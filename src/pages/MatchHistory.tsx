import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getMatchHistory } from '../lib/match-service';
import { getRangeMatchSessions, deleteTrainingSession } from '../lib/training-session-service';
import { ArrowLeft, Calendar, CheckCircle, Pause, Trash2, Target, Trophy } from 'lucide-react';
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
    merged.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const aCreated = a.data.created_at || '';
      const bCreated = b.data.created_at || '';
      if (aCreated !== bCreated) return aCreated < bCreated ? 1 : -1;
      return a.data.id < b.data.id ? 1 : a.data.id > b.data.id ? -1 : 0;
    });
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
                const hasResult = match.total_hits != null && match.total_hits > 0;

                return (
                  <div
                    key={`m-${match.id}`}
                    className="w-full bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => navigate(route)}
                        className="flex-1 text-left hover:opacity-80 transition min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 truncate">{match.match_name}</h3>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <Target className="w-2.5 h-2.5" />
                            FELT
                          </span>
                        </div>
                        {hasResult && (
                          <p className="text-xl font-bold text-slate-900 mb-1">
                            {match.total_hits} treff
                            {match.inner_hits ? <span className="text-sm font-medium text-slate-500 ml-1.5">({match.inner_hits}*)</span> : null}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(match.match_date).toLocaleDateString('nb-NO', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </button>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {match.status === 'completed' ? (
                          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Fullført</span>
                          </div>
                        ) : match.status === 'paused' ? (
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </div>
                        ) : match.status === 'setup' ? (
                          <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                            <span>Ufullstendig</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                            <span>Pågår</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ isOpen: true, item });
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Slett stevne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const sess = item.data;
              const route =
                sess.status === 'active'
                  ? `/training/session/${sess.id}`
                  : `/training/session/${sess.id}/summary`;
              const hasResult = sess.total_score != null && sess.total_score > 0;

              return (
                <div
                  key={`r-${sess.id}`}
                  className="w-full bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => navigate(route)}
                      className="flex-1 text-left hover:opacity-80 transition min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 truncate">{sess.title}</h3>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          <Trophy className="w-2.5 h-2.5" />
                          BANE
                        </span>
                      </div>
                      {hasResult && (
                        <p className="text-xl font-bold text-slate-900 mb-1">
                          {sess.total_score}p
                          {sess.total_inner_hits ? <span className="text-sm font-medium text-slate-500 ml-1.5">({sess.total_inner_hits}*)</span> : null}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {new Date(sess.session_date).toLocaleDateString('nb-NO', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sess.status === 'completed' ? (
                        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Fullført</span>
                        </div>
                      ) : sess.status === 'active' ? (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                          <span>Pågår</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[11px] font-semibold">
                          <span>Avbrutt</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ isOpen: true, item });
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Slett økt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
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
