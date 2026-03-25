import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Competition,
  CompetitionEntry,
  CompetitionStage,
  CompetitionStageImage,
  FieldFigure,
} from '../types/database';
import { ArrowLeft, Target, TrendingUp, Sparkles, AlertCircle, CheckCircle, HelpCircle, Trash2, MoreVertical, X, ZoomIn } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteCompetitionEntry } from '../lib/deletion-service';

export function CompetitionSummary() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entry, setEntry] = useState<CompetitionEntry | null>(null);
  const [stages, setStages] = useState<CompetitionStage[]>([]);
  const [stageImages, setStageImages] = useState<CompetitionStageImage[]>([]);
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entryId) {
      loadData();
    }
  }, [entryId]);

  const loadData = async () => {
    if (!entryId) return;

    setLoading(true);

    const { data: entryData } = await supabase
      .from('competition_entries')
      .select('*, competitions(*)')
      .eq('id', entryId)
      .maybeSingle();

    if (!entryData) {
      setLoading(false);
      return;
    }

    setEntry(entryData);
    const comp = entryData.competitions as Competition;
    if (comp) setCompetition(comp);

    const [stagesRes, imagesRes, figuresRes, summaryRes] = await Promise.all([
      supabase
        .from('competition_stages')
        .select('*')
        .eq('competition_id', entryData.competition_id)
        .order('stage_number'),
      supabase
        .from('competition_stage_images')
        .select('*')
        .eq('entry_id', entryId)
        .order('stage_number'),
      supabase.from('field_figures').select('*').eq('is_active', true),
      supabase
        .from('competition_ai_summaries')
        .select('*')
        .eq('entry_id', entryId)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (stagesRes.data) setStages(stagesRes.data);
    if (figuresRes.data) setFigures(figuresRes.data);
    if (summaryRes.data) setAiSummary(summaryRes.data.summary_json);

    if (imagesRes.data) {
      setStageImages(imagesRes.data);

      const pathsToSign = imagesRes.data.filter((img) => img.storage_path);
      if (pathsToSign.length > 0) {
        const paths = pathsToSign.map((img) => img.storage_path!);
        const { data: signedData, error: signError } = await supabase.storage
          .from('target-images')
          .createSignedUrls(paths, 3600);

        if (signedData && !signError) {
          const urlMap: Record<string, string> = {};
          signedData.forEach((item, idx) => {
            if (item.signedUrl) {
              urlMap[paths[idx]] = item.signedUrl;
            }
          });
          setSignedUrls(urlMap);
        }
      }
    }

    setLoading(false);
  };

  const generateAISummary = async () => {
    if (!entryId || !user) return;

    setGeneratingAI(true);
    setAiError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Ikke autentisert');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-competition-summary`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entry_id: entryId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Kunne ikke generere oppsummering');
      }

      setAiSummary(result.summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiError(error instanceof Error ? error.message : 'Noe gikk galt');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleDelete = async () => {
    if (!entryId || !user) return;

    setDeleting(true);
    const result = await deleteCompetitionEntry(entryId, user.id);

    if (result.success) {
      navigate('/competitions');
    } else {
      alert(result.error || 'Kunne ikke slette deltakelsen');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Laster oppsummering...</p>
        </div>
      </div>
    );
  }

  if (!entry || !competition) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Stevne ikke funnet</p>
          <button
            onClick={() => navigate('/competitions')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Tilbake til stevner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/competitions')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Tilbake til stevner
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 break-words">
                {competition.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-slate-600">
                <span>
                  {new Date(entry.created_at).toLocaleDateString('nb-NO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span className="capitalize">{competition.competition_type.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Fullført</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-300"
                  title="Handlinger"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteDialog(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Slett deltakelse</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          title="Slett deltakelse"
          message="Er du sikker på at du vil slette denne deltakelsen? Dette vil også slette alle notater, bilder og AI-oppsummeringer. Denne handlingen kan ikke angres."
          confirmLabel={deleting ? 'Sletter...' : 'Slett'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          variant="danger"
        />

        <div className="space-y-6">
          {stages.map((stage) => {
            const figure = figures.find((f) => f.id === stage.field_figure_id);
            const stageImage = stageImages.find((img) => img.stage_number === stage.stage_number);
            const resolvedImageUrl = stageImage?.storage_path
              ? signedUrls[stageImage.storage_path] || null
              : null;

            return (
              <div
                key={stage.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-base sm:text-lg">{stage.stage_number}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-bold text-base sm:text-lg">Hold {stage.stage_number}</h3>
                        <p className="text-blue-100 text-sm truncate">{figure?.name || 'Ukjent figur'}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white text-xl sm:text-2xl font-bold">{stage.distance_m}m</div>
                      {stage.clicks !== null && stage.clicks !== 0 && (
                        <div className="text-blue-100 text-sm">{stage.clicks} knepp</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  {resolvedImageUrl && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Gravlapp
                      </h4>
                      <button
                        type="button"
                        onClick={() => setLightboxImage({
                          url: resolvedImageUrl,
                          alt: `Gravlapp hold ${stage.stage_number}`,
                        })}
                        className="relative group w-full rounded-lg border border-slate-200 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <img
                          src={resolvedImageUrl}
                          alt={`Gravlapp hold ${stage.stage_number}`}
                          className="w-full"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow">
                            <ZoomIn className="w-5 h-5 text-slate-700" />
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {stageImage?.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Notater
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-slate-700 whitespace-pre-wrap">
                          {stageImage.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {!resolvedImageUrl && !stageImage?.notes && (
                    <p className="text-center text-slate-500 italic py-4">
                      Ingen dokumentasjon fra dette holdet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Assistant Section */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">AI-Assistent</h3>
                <p className="text-blue-100 text-sm">Refleksjon basert på dine data</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {!aiSummary && !generatingAI && (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  Få en AI-generert analyse av stevnet basert på notater og data du har dokumentert.
                </p>
                <button
                  onClick={generateAISummary}
                  disabled={generatingAI}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  Generér AI-oppsummering
                </button>
                {aiError && (
                  <div className="mt-4 flex items-center gap-2 justify-center text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{aiError}</span>
                  </div>
                )}
              </div>
            )}

            {generatingAI && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Genererer oppsummering...</p>
              </div>
            )}

            {aiSummary && !generatingAI && (
              <div className="space-y-6">
                {/* Introduction */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-slate-700 leading-relaxed">
                    {aiSummary.summary.introduction}
                  </p>
                </div>

                {/* Per-hold comments */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                    Hold-for-hold
                  </h4>
                  <div className="space-y-3">
                    {aiSummary.summary.per_hold.map((hold: any) => {
                      const dataBasisIcon =
                        hold.data_basis === 'notater' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : hold.data_basis === 'begrenset' ? (
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-slate-500" />
                        );

                      const dataBasisLabel =
                        hold.data_basis === 'notater'
                          ? 'Basert på notat'
                          : hold.data_basis === 'begrenset'
                          ? 'Begrenset data'
                          : 'Ingen data';

                      return (
                        <div
                          key={hold.stage_number}
                          className="bg-white rounded-lg p-4 border border-slate-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-700 font-bold text-sm">
                                {hold.stage_number}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {dataBasisIcon}
                                <span className="text-xs text-slate-500">
                                  {dataBasisLabel}
                                </span>
                              </div>
                              <p className="text-slate-700 text-sm leading-relaxed">
                                {hold.comment}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall observations */}
                {aiSummary.summary.overall_observations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                      Samlede observasjoner
                    </h4>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <ul className="space-y-2">
                        {aiSummary.summary.overall_observations.map((obs: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Improvement suggestions */}
                {aiSummary.summary.improvement_suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                      Forslag til forbedring
                    </h4>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <ul className="space-y-2">
                        {aiSummary.summary.improvement_suggestions.map((sugg: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm">
                            <span className="text-green-600 mt-1">→</span>
                            <span>{sugg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Disclaimers */}
                {aiSummary.disclaimers && aiSummary.disclaimers.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 mb-2">
                          Viktig å vite
                        </p>
                        <ul className="space-y-1">
                          {aiSummary.disclaimers.map((disc: string, idx: number) => (
                            <li key={idx} className="text-xs text-amber-800">
                              • {disc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regenerate button */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={generateAISummary}
                    disabled={generatingAI}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                  >
                    Regenerér oppsummering
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 rounded-xl transition border-2 border-red-300 font-semibold text-base hover:border-red-400"
          >
            <Trash2 className="w-5 h-5" />
            <span>Slett denne deltakelsen</span>
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Dette vil slette alle notater, bilder og AI-oppsummeringer
          </p>
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.alt}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
