import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Competition, CompetitionEntry, Discipline } from '../types/database';
import { Trophy, Calendar, MapPin, Users, Trash2, MoreVertical } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteCompetition, deleteCompetitionEntry } from '../lib/deletion-service';

export function Competitions() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [myEntries, setMyEntries] = useState<CompetitionEntry[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [competitionsRes, entriesRes, disciplinesRes] = await Promise.all([
      supabase
        .from('competitions')
        .select('*')
        .eq('is_active', true)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('competition_date', { ascending: false }),
      supabase
        .from('competition_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false }),
      supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true),
    ]);

    if (competitionsRes.data) setCompetitions(competitionsRes.data);
    if (entriesRes.data) setMyEntries(entriesRes.data);
    if (disciplinesRes.data) setDisciplines(disciplinesRes.data);

    setLoading(false);
  };

  const getDisciplineName = (disciplineId: string | null) => {
    if (!disciplineId) return null;
    const discipline = disciplines.find(d => d.id === disciplineId);
    return discipline?.name;
  };

  const hasStarted = (competitionId: string) => {
    return myEntries.some(e => e.competition_id === competitionId);
  };

  const getEntry = (competitionId: string) => {
    return myEntries.find(e => e.competition_id === competitionId);
  };

  const handleDeleteClick = (competitionId: string) => {
    setCompetitionToDelete(competitionId);
    setShowDeleteDialog(true);
    setShowMenu(null);
  };

  const handleDeleteEntryClick = (entryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEntryToDelete(entryId);
    setShowDeleteDialog(true);
    setShowMenu(null);
  };

  const handleDelete = async () => {
    if (!user) return;

    setDeleting(true);

    let result;
    if (entryToDelete) {
      result = await deleteCompetitionEntry(entryToDelete, user.id);
    } else if (competitionToDelete) {
      result = await deleteCompetition(competitionToDelete, user.id);
    } else {
      return;
    }

    if (result.success) {
      if (entryToDelete) {
        setMyEntries(myEntries.filter(e => e.id !== entryToDelete));
      }
      if (competitionToDelete) {
        setCompetitions(competitions.filter(c => c.id !== competitionToDelete));
      }
      setShowDeleteDialog(false);
      setCompetitionToDelete(null);
      setEntryToDelete(null);
    } else {
      alert(result.error || 'Kunne ikke slette');
    }
    setDeleting(false);
  };

  const hasEntries = (competitionId: string) => {
    return myEntries.some(e => e.competition_id === competitionId);
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
      <div className="pb-20 md:pb-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Stevner</h1>
              <p className="text-slate-600 mt-1">Dine stevner og tilgjengelige stevner</p>
            </div>
            <Link
              to="/competitions/new"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center space-x-2 flex-shrink-0"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Nytt stevne</span>
              <span className="sm:hidden">Nytt</span>
            </Link>
          </div>
        </div>

        {myEntries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Mine deltakelser</h2>
            <div className="grid gap-4">
              {myEntries.map((entry) => {
                const competition = competitions.find(c => c.id === entry.competition_id);
                if (!competition) return null;

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 transition relative group"
                  >
                    <Link
                      to={entry.completed_at ? `/competitions/entry/${entry.id}/summary` : `/competitions/${competition.id}/run/${entry.id}`}
                      className="block hover:bg-slate-50 -m-4 sm:-m-6 p-4 sm:p-6 rounded-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Trophy className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-lg font-semibold text-slate-900">{competition.name}</h3>
                          </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 capitalize">
                            {competition.competition_type}
                          </span>

                          {competition.location && (
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {competition.location}
                            </span>
                          )}

                          {competition.competition_date && (
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(competition.competition_date).toLocaleDateString('nb-NO')}
                            </span>
                          )}
                        </div>

                        {entry.completed_at ? (
                          <div className="mt-3 flex items-center space-x-4 text-sm">
                            <span className="font-semibold text-emerald-600">Fullført</span>
                            {entry.total_score && (
                              <span className="text-slate-900">Poeng: {entry.total_score}</span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3">
                            <span className="text-sm text-amber-600 font-medium">Pågående</span>
                          </div>
                        )}
                      </div>
                    </div>
                    </Link>

                    {entry.completed_at && (
                      <button
                        onClick={(e) => handleDeleteEntryClick(entry.id, e)}
                        className="absolute top-4 right-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition z-10"
                        title="Slett deltakelse"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-900 mb-4">Tilgjengelige stevner</h2>

        {competitions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen stevner</h3>
            <p className="text-slate-600">Det er ingen aktive stevner for øyeblikket</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {competitions.map((competition) => {
              const entry = getEntry(competition.id);
              const discipline = getDisciplineName(competition.discipline_id);

              const isOwner = competition.user_id === user?.id;

              return (
                <div
                  key={competition.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Trophy className="w-5 h-5 text-slate-600 flex-shrink-0" />
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">{competition.name}</h3>
                        {isOwner && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Mitt stevne
                          </span>
                        )}
                        {isOwner && !hasEntries(competition.id) && (
                          <div className="relative ml-auto">
                            <button
                              onClick={() => setShowMenu(showMenu === competition.id ? null : competition.id)}
                              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition border border-slate-300"
                              title="Handlinger"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {showMenu === competition.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                <button
                                  onClick={() => handleDeleteClick(competition.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Slett stevne</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {competition.description && (
                        <p className="text-slate-600 mb-3">{competition.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                          {competition.competition_type}
                        </span>

                        {discipline && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {discipline}
                          </span>
                        )}

                        {competition.location && (
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {competition.location}
                          </span>
                        )}

                        {competition.competition_date && (
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(competition.competition_date).toLocaleDateString('nb-NO')}
                          </span>
                        )}

                        {competition.is_public && (
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            Offentlig
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2">
                      <Link
                        to={`/competitions/${competition.id}`}
                        className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition text-center text-sm sm:text-base whitespace-nowrap"
                      >
                        Detaljer
                      </Link>
                      {entry ? (
                        <Link
                          to={`/competitions/${competition.id}/run/${entry.id}`}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition text-center text-sm sm:text-base"
                        >
                          {entry.completed_at ? 'Resultat' : 'Fortsett'}
                        </Link>
                      ) : (
                        <Link
                          to={`/competitions/${competition.id}/start`}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition text-center text-sm sm:text-base"
                        >
                          Start
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={showDeleteDialog}
          title={entryToDelete ? "Slett deltakelse" : "Slett stevne"}
          message={
            entryToDelete
              ? "Er du sikker på at du vil slette denne deltakelsen? Dette vil også slette alle notater, bilder og AI-oppsummeringer. Denne handlingen kan ikke angres."
              : "Er du sikker på at du vil slette dette stevnet? Denne handlingen kan ikke angres."
          }
          confirmLabel={deleting ? 'Sletter...' : 'Slett'}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setCompetitionToDelete(null);
            setEntryToDelete(null);
          }}
          variant="danger"
        />
      </div>
    </Layout>
  );
}
