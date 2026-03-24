import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getMatchHistory } from '../lib/match-service';
import { ArrowLeft, Calendar, CheckCircle, Pause, Trash2 } from 'lucide-react';
import type { MatchSession } from '../lib/match-service';
import { deleteMatchSession } from '../lib/deletion-service';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function MatchHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; matchId: string | null; matchName: string }>({
    isOpen: false,
    matchId: null,
    matchName: ''
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const data = await getMatchHistory(user.id, 50);
    setMatches(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.matchId) return;

    console.log('[MatchHistory] Starting delete for match:', deleteConfirm.matchId);
    setDeleting(true);
    try {
      await deleteMatchSession(deleteConfirm.matchId);
      console.log('[MatchHistory] Delete successful, updating UI');
      setMatches(matches.filter(m => m.id !== deleteConfirm.matchId));
      setDeleteConfirm({ isOpen: false, matchId: null, matchName: '' });
    } catch (error) {
      console.error('[MatchHistory] Error deleting match:', error);
      alert(`Kunne ikke slette stevnet: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
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

        {matches.length === 0 ? (
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
            {matches.map((match) => {
              const getRouteForMatch = () => {
                if (match.status === 'completed') {
                  return `/match/${match.id}/summary`;
                } else if (match.status === 'setup') {
                  return `/match/${match.id}/configure`;
                } else {
                  return `/match/${match.id}`;
                }
              };

              return (
                <div
                  key={match.id}
                  className="w-full bg-white border border-slate-200 rounded-xl p-5 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <button
                      onClick={() => navigate(getRouteForMatch())}
                      className="flex-1 text-left hover:opacity-80 transition"
                    >
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {match.match_name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {new Date(match.match_date).toLocaleDateString('nb-NO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
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
                          console.log('[DELETE BUTTON CLICKED]', match.id);
                          e.stopPropagation();
                          setDeleteConfirm({
                            isOpen: true,
                            matchId: match.id,
                            matchName: match.match_name
                          });
                          console.log('[DELETE CONFIRM STATE SET]', {
                            isOpen: true,
                            matchId: match.id,
                            matchName: match.match_name
                          });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Slett stevne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {match.notes && (
                    <p className="text-sm text-slate-500 mt-2">{match.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Slett stevne?"
        message={`Er du sikker på at du vil slette "${deleteConfirm.matchName}"? Dette kan ikke angres.`}
        confirmText="Slett"
        cancelText="Avbryt"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, matchId: null, matchName: '' })}
        isDestructive={true}
        isLoading={deleting}
      />
    </Layout>
  );
}
