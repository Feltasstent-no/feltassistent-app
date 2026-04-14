import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getActiveTrainingSessions, getTrainingSessionHistory } from '../lib/training-session-service';
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
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
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
    setActiveSessions(active);
    setCompletedSessions(completed);
    setLoading(false);
  };

  const getDisciplineName = (disciplineId: string | null) => {
    if (!disciplineId) return null;
    return disciplines.find(d => d.id === disciplineId)?.name || null;
  };

  const handleDeleteClick = (entryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!entryToDelete || !user) return;
    setDeleting(true);
    const result = await deleteTrainingEntry(entryToDelete, user.id);
    if (result.success) {
      setEntries(entries.filter(e => e.id !== entryToDelete));
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
    setDeleting(false);
  };

  const totalCount = entries.length + completedSessions.length;
  const hasAnyData = totalCount > 0 || activeSessions.length > 0;

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
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 border border-slate-200"
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-800">
                          Aktiv
                        </span>
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
          <div className="space-y-6">
            {completedSessions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Treningsøkter</h2>
                <div className="space-y-2">
                  {completedSessions.map((sess) => (
                    <Link
                      key={sess.id}
                      to={`/training/session/${sess.id}/summary`}
                      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{sess.title}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                            <span>{new Date(sess.session_date).toLocaleDateString('nb-NO')}</span>
                            {sess.location && <span>{sess.location}</span>}
                            {getDisciplineName(sess.discipline_id) && (
                              <span>{getDisciplineName(sess.discipline_id)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {sess.total_score > 0 && (
                            <span className="text-sm font-bold text-emerald-600">{sess.total_score}p</span>
                          )}
                          {sess.total_shots > 0 && (
                            <span className="text-xs text-slate-400">{sess.total_shots} skudd</span>
                          )}
                          {sess.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {entries.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Hurtiglogger</h2>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="relative group">
                      <Link
                        to={`/training/${entry.id}`}
                        className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {getDisciplineName(entry.discipline_id) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  {getDisciplineName(entry.discipline_id)}
                                </span>
                              )}
                              {entry.class_code && (
                                <span className="text-xs text-slate-500">{entry.class_code}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span>
                                {new Date(entry.entry_date).toLocaleDateString('nb-NO')}
                              </span>
                              {entry.location && <span>{entry.location}</span>}
                              {entry.shots_total ? <span>{entry.shots_total} skudd</span> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {entry.score != null && entry.score > 0 && (
                              <span className="text-sm font-bold text-emerald-600">{entry.score}p</span>
                            )}
                            <button
                              onClick={(e) => handleDeleteClick(entry.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          open={deleteDialogOpen}
          title="Slett treningsøkt"
          message="Er du sikker på at du vil slette denne treningsøkten? Denne handlingen kan ikke angres."
          confirmLabel={deleting ? 'Sletter...' : 'Slett'}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setEntryToDelete(null);
          }}
          variant="danger"
        />
      </div>
    </Layout>
  );
}
