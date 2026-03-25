import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { FieldFigure } from '../types/database';
import {
  getFieldFigures,
  calculateShotRecommendationResolved,
  ShotRecommendation
} from '../lib/field-assistant';
import { resolveClickSource, type ResolvedClickData } from '../lib/click-table-resolver';
import { FigurePicker } from '../components/FigurePicker';
import { CompactFieldFigureCard } from '../components/CompactFieldFigureCard';
import { WindInput } from '../components/WindInput';
import { ShotRecommendationDisplay } from '../components/ShotRecommendationDisplay';
import { Target, AlertCircle, SlidersHorizontal, Database, FileText, Calculator } from 'lucide-react';

export function ShotAssistant() {
  const { user } = useAuth();
  const { activeSetup } = useActiveSetup();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [figures, setFigures] = useState<FieldFigure[]>([]);

  const [selectedFigure, setSelectedFigure] = useState<FieldFigure | null>(null);
  const [distanceStr, setDistanceStr] = useState('300');
  const [windSpeed, setWindSpeed] = useState<number>(0);
  const [windAngleDeg, setWindAngleDeg] = useState<number>(90);

  const [recommendation, setRecommendation] = useState<ShotRecommendation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'alle' | 'grovfelt' | 'finfelt'>('alle');
  const [resolvedSource, setResolvedSource] = useState<ResolvedClickData | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (activeSetup?.discipline?.code) {
      const code = activeSetup.discipline.code as 'grovfelt' | 'finfelt';
      if (code === 'grovfelt' || code === 'finfelt') {
        setCategoryFilter(code);
      }
    }
  }, [activeSetup?.discipline]);

  useEffect(() => {
    if (user) {
      resolveClickSource(user.id).then(setResolvedSource);
    }
  }, [user, activeSetup]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);
      const figuresData = await getFieldFigures();
      setFigures(figuresData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const distance = parseInt(distanceStr, 10) || 0;

  async function handleCalculate() {
    if (!selectedFigure || !user) return;
    if (!activeSetup?.click_table_id && !activeSetup?.ballistic_profile_id) {
      return;
    }

    try {
      setCalculating(true);

      const rec = await calculateShotRecommendationResolved(
        user.id,
        distance,
        selectedFigure,
        windSpeed > 0 ? windSpeed : undefined,
        windSpeed > 0 ? windAngleDeg.toString() : undefined
      );

      if (rec) {
        setRecommendation(rec);
      } else {
        alert('Kunne ikke beregne anbefaling. Sjekk at du har et aktivt oppsett.');
      }
    } catch (error) {
      console.error('Error calculating recommendation:', error);
      alert('Feil ved beregning av skuddanbefaling');
    } finally {
      setCalculating(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto pb-24 md:pb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Kneppassistent</h1>
          <p>Laster...</p>
        </div>
      </Layout>
    );
  }

  const hasActiveSetup = activeSetup?.click_table_id || activeSetup?.ballistic_profile_id;

  const filteredFigures = figures
    .filter((figure) => {
      if (categoryFilter === 'alle') return true;
      return figure.category === categoryFilter;
    })
    .sort((a, b) => {
      if (a.code < b.code) return -1;
      if (a.code > b.code) return 1;
      return 0;
    });

  const sourceIcon = resolvedSource?.source === 'active_click_table'
    ? <Database className="h-4 w-4" />
    : resolvedSource?.source === 'generated_from_profile'
    ? <FileText className="h-4 w-4" />
    : <Calculator className="h-4 w-4" />;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Kneppassistent</h1>
          <p className="text-slate-600 mt-2">
            Oppslag i din aktive knepptabell for korrekt knepp og vindkorreksjon
          </p>
        </div>

        {!hasActiveSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">
                  Du har ingen aktiv knepptabell enda
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Vi anbefaler å opprette en ballistisk profil og generere en knepptabell for bruk i felt. Da bruker appen samme kneppverdier konsekvent i kneppassistenten og under stevnegjennomføring.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <button
                    onClick={() => navigate('/ballistics/new')}
                    className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition"
                  >
                    Opprett ballistisk profil
                  </button>
                  <button
                    onClick={() => navigate('/click-tables')}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-sm font-medium rounded-md hover:bg-amber-50 transition"
                  >
                    Mine knepptabeller
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasActiveSetup && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Target className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Aktivt oppsett</h3>
                <div className="mt-2 space-y-1 text-sm text-blue-800">
                  {activeSetup.weapon && (
                    <p>
                      <span className="font-medium">Våpen:</span> {activeSetup.weapon.weapon_name} ({activeSetup.weapon.caliber})
                    </p>
                  )}
                  {activeSetup.barrel && (
                    <p>
                      <span className="font-medium">Løp:</span> {activeSetup.barrel.barrel_name}
                    </p>
                  )}
                  {activeSetup.click_table && (
                    <p>
                      <span className="font-medium">Knepptabell:</span> {activeSetup.click_table.name}
                      {' '}(Nullpunkt på {activeSetup.click_table.zero_distance}m)
                    </p>
                  )}
                  {activeSetup.ballistic_profile && (
                    <p>
                      <span className="font-medium">Ballistisk profil:</span> {activeSetup.ballistic_profile.name}
                      {' '}(Nullpunkt på {activeSetup.ballistic_profile.zero_distance_m}m)
                    </p>
                  )}
                </div>
                {resolvedSource && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                    {sourceIcon}
                    <span>Kilde: {resolvedSource.sourceName}</span>
                    {resolvedSource.clickTableName && (
                      <span className="text-blue-500">({resolvedSource.clickTableName})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center space-x-3">
                <Target className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <h2 className="text-xl font-semibold text-slate-900">Velg figur</h2>
              </div>

              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => setCategoryFilter('alle')}
                  className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${
                    categoryFilter === 'alle'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setCategoryFilter('grovfelt')}
                  className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${
                    categoryFilter === 'grovfelt'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Grovfelt
                </button>
                <button
                  onClick={() => setCategoryFilter('finfelt')}
                  className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${
                    categoryFilter === 'finfelt'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Finfelt
                </button>
              </div>
            </div>

            <div className="md:hidden">
              <FigurePicker
                figures={filteredFigures}
                selectedFigure={selectedFigure}
                onSelect={setSelectedFigure}
              />
            </div>

            <div className="hidden md:block">
              {categoryFilter === 'alle' ? (
                <div className="space-y-6">
                  {['grovfelt', 'finfelt'].map((cat) => {
                    const catFigures = filteredFigures.filter(f => f.category === cat);
                    if (catFigures.length === 0) return null;

                    return (
                      <div key={cat}>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                          {cat === 'grovfelt' ? 'Grovfelt' : 'Finfelt'}
                        </h3>
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10 gap-3">
                          {catFigures.map((figure) => (
                            <CompactFieldFigureCard
                              key={figure.id}
                              figure={figure}
                              selected={selectedFigure?.id === figure.id}
                              onClick={() => setSelectedFigure(figure)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10 gap-3">
                  {filteredFigures.map((figure) => (
                    <CompactFieldFigureCard
                      key={figure.id}
                      figure={figure}
                      selected={selectedFigure?.id === figure.id}
                      onClick={() => setSelectedFigure(figure)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <SlidersHorizontal className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <h2 className="text-xl font-semibold text-slate-900">Parametere</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Avstand (meter)
                  </label>
                  <input
                    type="number"
                    value={distanceStr}
                    onChange={(e) => setDistanceStr(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                    min="50"
                    max="600"
                    step="10"
                  />
                </div>

                <WindInput
                  windSpeed={windSpeed}
                  windAngleDeg={windAngleDeg}
                  onWindSpeedChange={setWindSpeed}
                  onWindAngleChange={setWindAngleDeg}
                />

                <button
                  onClick={handleCalculate}
                  disabled={!selectedFigure || calculating || !hasActiveSetup}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium"
                >
                  {calculating ? 'Beregner...' : 'Beregn skuddanbefaling'}
                </button>
              </div>
            </div>

            <div>
              {recommendation && (
                <ShotRecommendationDisplay
                  recommendation={recommendation}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
