import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getActiveTrainingSessions, getTrainingSessionHistory, deleteTrainingSession } from '../lib/training-session-service';
import { TrainingEntry, Discipline, TrainingSession } from '../types/database';
import {
  Plus, Target, Calendar, Trash2, Play, CheckCircle, Clock, MapPin,
  BookOpen, Zap, ChevronRight, XCircle,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteTrainingEntry } from '../lib/deletion-service';
import { TrainingStatsSection } from '../components/stats/TrainingStatsSection';

export function TrainingList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [activeSessions, setActiveSessions] = useState<TrainingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ kind: 'entry' | 'session'; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [entriesRes, disciplinesRes, active, completed] = await Promise.all([
      supabase
        .from('training_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false }),
      supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true),
      getActiveTrainingSessions(user.id),
      getTrainingSessionHistory(user.id),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);
    setActiveSessions(active.filter(s => s.session_type !== 'range_match'));
    setCompletedSessions(completed.filter(s => s.session_type !== 'range_match'));
    setLoading(false);
  };

  const getDisciplineName = (disciplineId: string | null) => {
    if (!disciplineId) return null;
    return disciplines.find(d => d.id === disciplineId)?.name || null;
  };

  const handleDeleteClick = (kind: 'entry' | 'session', id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setItemToDelete({ kind, id });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete || !user) return;
    setDeleting(true);
    if (itemToDelete.kind === 'entry') {
      const result = await deleteTrainingEntry(itemToDelete.id, user.id);
      if (result.success) {
        setEntries(entries.filter(e => e.id !== itemToDelete.id));
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    } else {
      const { error } = await deleteTrainingSession(itemToDelete.id);
      if (!error) {
        setCompletedSessions(completedSessions.filter(s => s.id !== itemToDelete.id));
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
    setDeleting(false);
  };

  const totalCount = entries.length + completedSessions.length;
  const hasAnyData = totalCount > 0 || activeSessions.length > 0;

  type CombinedItem =
    | { kind: 'session'; date: string; data: TrainingSession }
    | { kind: 'entry'; date: string; data: TrainingEntry };

  const combinedLog: CombinedItem[] = [
    ...completedSessions.map((s) => ({ kind: 'session' as const, date: s.session_date, data: s })),
    ...entries.map((e) => ({ kind: 'entry' as const, date: e.entry_date, data: e })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Trening</h1>
            <p className="text-slate-500 mt-0.5 text-sm">{totalCount} økter totalt</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            to="/training/session/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Zap className="w-5 h-5" />
            <span>Aktiv økt</span>
          </Link>
          <Link
            to="/training/new"
            className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 border border-sky-200"
          >
            <BookOpen className="w-5 h-5" />
            <span>Hurtiglogg</span>
          </Link>
        </div>

        {hasAnyData && <TrainingStatsSection />}

        {activeSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Aktive økter</h2>
            <div className="space-y-3">
              {activeSessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => navigate(`/training/session/${sess.id}`)}
                  className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 hover:bg-emerald-100 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-800">
                          Aktiv
                        </span>
                        {sess.session_type === 'range_match' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                            <Target className="w-3 h-3" />
                            Banestevne
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{sess.title}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-600 mt-0.5">
                        <span>{new Date(sess.session_date).toLocaleDateString('nb-NO')}</span>
                        {sess.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {sess.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Play className="w-5 h-5 text-emerald-600" />
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasAnyData ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen treningsøkter</h3>
            <p className="text-slate-600 mb-6">Start din første aktive treningsøkt eller logg en økt manuelt</p>
          </div>
        ) : (
          <div>
            {combinedLog.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Logg</h2>
                <div className="space-y-2">
                  {combinedLog.map((item) => {
                    const isSession = item.kind === 'session';
                    const id = item.data.id;
                    const title = isSession ? item.data.title : (getDisciplineName(item.data.discipline_id) || 'Hurtiglogg');
                    const date = item.date;
                    const location = item.data.location;
                    const disciplineName = getDisciplineName(item.data.discipline_id);
                    const classCode = !isSession ? item.data.class_code : null;
                    const score = isSession ? item.data.total_score : item.data.score;
                    const shots = isSession ? item.data.total_shots : item.data.shots_total;
                    const linkTo = isSession ? `/training/session/${id}/summary` : `/training/${id}`;
                    const metaParts: string[] = [new Date(date).toLocaleDateString('nb-NO')];
                    if (location) metaParts.push(location);
                    if (disciplineName) metaParts.push(disciplineName);
                    if (classCode) metaParts.push(classCode);

                    return (
                      <div key={`${item.kind}-${id}`} className="relative group">
                        <Link
                          to={linkTo}
                          className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {isSession ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                    <Zap className="w-3 h-3" />
                                    Aktiv økt
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                                    <BookOpen className="w-3 h-3" />
                                    Hurtiglogg
                                  </span>
                                )}
                                <p className="font-semibold text-slate-900 truncate">{title}</p>
                              </div>
                              <div className="text-sm text-slate-500">
                                {metaParts.join(' • ')}
                              </div>
                              {(score != null && score > 0) || shots ? (
                                <div className="text-sm mt-1">
                                  {score != null && score > 0 && (
                                    <span className="font-bold text-emerald-600">{score}p</span>
                                  )}
                                  {score != null && score > 0 && shots ? (
                                    <span className="text-slate-400"> • </span>
                                  ) : null}
                                  {shots ? (
                                    <span className="text-slate-500">{shots} skudd</span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <button
                              onClick={(e) => handleDeleteClick(isSession ? 'session' : 'entry', id, e)}
                              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              aria-label="Slett"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          open={deleteDialogOpen}
          title="Slett økt"
          message="Er du sikker på at du vil slette denne økten? Denne handlingen kan ikke angres."
          confirmLabel={deleting ? 'Sletter...' : 'Slett'}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setItemToDelete(null);
          }}
          variant="danger"
        />
      </div>
    </Layout>
  );
}
