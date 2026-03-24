import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrainingEntry, Discipline } from '../types/database';
import { Plus, Target, Calendar, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteTrainingEntry } from '../lib/deletion-service';

export function TrainingList() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [entriesRes, disciplinesRes] = await Promise.all([
      supabase
        .from('training_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false }),
      supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);

    setLoading(false);
  };

  const getDisciplineName = (disciplineId: string | null) => {
    if (!disciplineId) return 'Ukjent';
    const discipline = disciplines.find(d => d.id === disciplineId);
    return discipline?.name || 'Ukjent';
  };

  const groupEntriesByMonth = (entries: TrainingEntry[]) => {
    const groups: { [key: string]: TrainingEntry[] } = {};

    entries.forEach(entry => {
      const date = new Date(entry.entry_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(entry);
    });

    return groups;
  };

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('nb-NO', { year: 'numeric', month: 'long' });
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
    } else {
      alert(result.error || 'Kunne ikke slette treningsloggen');
    }
    setDeleting(false);
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

  const groupedEntries = groupEntriesByMonth(entries);

  return (
    <Layout>
      <div className="pb-20 md:pb-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Treningslogg</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">{entries.length} økter totalt</p>
          </div>
          <Link
            to="/training/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 sm:py-3 sm:px-6 rounded-lg transition flex items-center space-x-2 shadow-lg shadow-emerald-600/20 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ny økt</span>
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen treningsøkter</h3>
            <p className="text-slate-600 mb-6">Kom i gang ved å registrere din første økt</p>
            <Link
              to="/training/new"
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Opprett treningsøkt</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([monthKey, monthEntries]) => (
              <div key={monthKey}>
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900 capitalize">
                    {formatMonthYear(monthKey)}
                  </h2>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                <div className="grid gap-4">
                  {monthEntries.map((entry) => (
                    <div key={entry.id} className="relative group">
                      <Link
                        to={`/training/${entry.id}`}
                        className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-emerald-300 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                              {getDisciplineName(entry.discipline_id)}
                            </span>
                            {entry.class_code && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                                {entry.class_code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">
                              {new Date(entry.entry_date).toLocaleDateString('nb-NO', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                            <button
                              onClick={(e) => handleDeleteClick(entry.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Slett treningsøkt"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {entry.location && (
                          <div>
                            <p className="text-xs text-slate-500">Sted</p>
                            <p className="font-medium text-slate-900">{entry.location}</p>
                          </div>
                        )}
                        {entry.shots_total && (
                          <div>
                            <p className="text-xs text-slate-500">Skudd</p>
                            <p className="font-medium text-slate-900">{entry.shots_total}</p>
                          </div>
                        )}
                        {entry.score !== null && entry.score > 0 && (
                          <div>
                            <p className="text-xs text-slate-500">Poeng</p>
                            <p className="font-medium text-slate-900">{entry.score}</p>
                          </div>
                        )}
                        {entry.position && (
                          <div>
                            <p className="text-xs text-slate-500">Stilling</p>
                            <p className="font-medium text-slate-900">{entry.position}</p>
                          </div>
                        )}
                      </div>

                        {entry.general_notes && (
                          <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                            {entry.general_notes}
                          </p>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={deleteDialogOpen}
          title="Slett treningsøkt"
          message="Er du sikker på at du vil slette denne treningsøkten? Dette vil også slette alle tilhørende bilder og notater. Denne handlingen kan ikke angres."
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
