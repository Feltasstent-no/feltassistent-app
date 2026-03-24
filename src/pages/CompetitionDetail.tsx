import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Competition, CompetitionStage, Discipline } from '../types/database';
import { Trophy, Calendar, MapPin, CreditCard as Edit2, Play, List, Target } from 'lucide-react';

export function CompetitionDetail() {
  const { competitionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stages, setStages] = useState<CompetitionStage[]>([]);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchData();
  }, [competitionId, user]);

  const fetchData = async () => {
    if (!competitionId) return;

    const [competitionRes, stagesRes] = await Promise.all([
      supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single(),
      supabase
        .from('competition_stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number'),
    ]);

    if (competitionRes.data) {
      setCompetition(competitionRes.data);
      setIsOwner(competitionRes.data.user_id === user?.id);

      if (competitionRes.data.discipline_id) {
        const { data: disciplineData } = await supabase
          .from('disciplines')
          .select('*')
          .eq('id', competitionRes.data.discipline_id)
          .single();

        if (disciplineData) setDiscipline(disciplineData);
      }
    }

    if (stagesRes.data) setStages(stagesRes.data);

    setLoading(false);
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

  if (!competition) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Stevne ikke funnet</p>
          <Link to="/competitions" className="text-emerald-600 hover:text-emerald-700 font-medium mt-4 inline-block">
            Tilbake til stevner
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 min-w-0 break-words">{competition.name}</h1>
            {isOwner && (
              <>
                {competition.status === 'draft' && (
                  <button
                    onClick={() => navigate(`/competitions/${competitionId}/configure`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-center"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Fortsett oppsett</span>
                  </button>
                )}
                {competition.status === 'configured' && (
                  <button
                    onClick={() => navigate(`/competitions/${competitionId}/start`)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-center"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start stevne</span>
                  </button>
                )}
                {competition.status === 'active' && (
                  <button
                    onClick={() => navigate(`/competitions/${competitionId}/run`)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-center"
                  >
                    <Play className="w-4 h-4" />
                    <span>Fortsett stevne</span>
                  </button>
                )}
              </>
            )}
          </div>

          {competition.notes && (
            <p className="text-slate-600 mb-4">{competition.notes}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
              {competition.competition_type}
            </span>

            {discipline && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {discipline.name}
              </span>
            )}

            {competition.location && (
              <span className="flex items-center text-slate-600">
                <MapPin className="w-4 h-4 mr-1" />
                {competition.location}
              </span>
            )}

            {competition.competition_date && (
              <span className="flex items-center text-slate-600">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(competition.competition_date).toLocaleDateString('nb-NO')}
              </span>
            )}
          </div>
        </div>

        {(competition.competition_type === 'grovfelt' || competition.competition_type === 'finfelt') && (
          <>
            {stages.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Ingen hold konfigurert</h3>
                <p className="text-slate-600 mb-6">Dette feltstevnet har ingen hold ennå</p>
                {isOwner && (
                  <button
                    onClick={() => navigate(`/competitions/${competitionId}/configure`)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                  >
                    <List className="w-4 h-4 inline mr-2" />
                    Konfigurer hold
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 mb-6">
                  <div className="p-4 sm:p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Holdoversikt</h2>
                    <p className="text-slate-600 mt-1">{stages.length} hold konfigurert</p>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {stages.map((stage) => (
                      <div key={stage.id} className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                            Hold {stage.stage_number}
                            {stage.name && stage.name.trim() !== '' && ` – ${stage.name}`}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Stilling:</span>
                            <p className="font-medium text-slate-900 capitalize">{stage.position || 'Ikke satt'}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Skytetid:</span>
                            <p className="font-medium text-slate-900">{stage.shoot_seconds}s</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Klargjøring:</span>
                            <p className="font-medium text-slate-900">{stage.prep_seconds}s</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Skudd:</span>
                            <p className="font-medium text-slate-900">{stage.shots_count}</p>
                          </div>
                        </div>

                        {stage.notes && (
                          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded p-3">
                            {stage.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/competitions"
                    className="flex-1 px-4 sm:px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
                  >
                    Tilbake
                  </Link>
                  {isOwner && (
                    <Link
                      to={`/competitions/${competitionId}/stages`}
                      className="flex-1 px-4 sm:px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
                    >
                      <Edit2 className="w-4 h-4 inline mr-2" />
                      Rediger hold
                    </Link>
                  )}
                  <Link
                    to={`/competitions/${competitionId}/start`}
                    className="flex-1 px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition text-center"
                  >
                    <Play className="w-4 h-4 inline mr-2" />
                    Start feltløype
                  </Link>
                </div>
              </>
            )}
          </>
        )}

        {competition.competition_type === 'bane' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Banestevne</h3>
            <p className="text-slate-600">Dette er et banestevne. Funksjonalitet for baneskyting kommer snart.</p>
            <Link
              to="/competitions"
              className="inline-block mt-6 px-6 py-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Tilbake til stevner
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
