import { ShotRecommendation } from '../lib/field-assistant';
import { Target, ArrowUp, Wind, Info, Database, FileText, Calculator } from 'lucide-react';
import WindCompass from './WindCompass';

interface ShotRecommendationDisplayProps {
  recommendation: ShotRecommendation;
}

export function ShotRecommendationDisplay({ recommendation }: ShotRecommendationDisplayProps) {
  const { distance_m, figure, elevation_clicks, elevation_type, wind_clicks, wind_direction, notes, source, profile, click_table, resolved_source, resolved_source_name } = recommendation;

  const getClickDisplayClass = (clicks: number) => {
    if (clicks === 0) return 'bg-green-100 text-green-900 border-green-300';
    if (Math.abs(clicks) <= 5) return 'bg-blue-100 text-blue-900 border-blue-300';
    if (Math.abs(clicks) <= 15) return 'bg-yellow-100 text-yellow-900 border-yellow-300';
    return 'bg-orange-100 text-orange-900 border-orange-300';
  };

  const sourceIcon = resolved_source === 'active_click_table'
    ? <Database className="w-3.5 h-3.5" />
    : resolved_source === 'generated_from_profile'
    ? <FileText className="w-3.5 h-3.5" />
    : <Calculator className="w-3.5 h-3.5" />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{figure.name}</h2>
            <p className="text-sm text-slate-600">{distance_m} meter</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              <ArrowUp className="w-4 h-4 inline mr-1" />
              Høydekorreksjon
            </label>
            <div className={`p-3 sm:p-4 rounded-lg border-2 ${getClickDisplayClass(elevation_clicks)}`}>
              <div className="text-2xl sm:text-3xl font-bold text-center">
                {elevation_clicks > 0 ? '+' : ''}{elevation_clicks}
              </div>
              <div className="text-sm text-center mt-1">knepp</div>
              <div className="text-xs text-center mt-1 opacity-75">
                {elevation_type === 'exact' && 'Eksakt'}
                {elevation_type === 'nearest' && 'Nærmeste'}
                {elevation_type === 'interpolated' && 'Interpolert'}
                {elevation_type === 'calculated' && 'Beregnet'}
              </div>
            </div>
          </div>

          {wind_clicks !== undefined && wind_clicks !== 0 && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                <Wind className="w-4 h-4 inline mr-1" />
                Vindkorreksjon
              </label>
              <div className={`p-3 sm:p-4 rounded-lg border-2 ${getClickDisplayClass(wind_clicks)}`}>
                <div className="text-2xl sm:text-3xl font-bold text-center">
                  {Math.abs(wind_clicks)}
                </div>
                <div className="text-sm text-center mt-1">
                  knepp {wind_clicks > 0 ? 'høyre' : 'venstre'}
                </div>
              </div>
            </div>
          )}
        </div>

        {wind_clicks !== undefined && wind_direction !== undefined && recommendation.wind_speed_ms !== undefined && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex justify-center">
              <WindCompass
                windAngleDeg={parseFloat(wind_direction)}
                windSpeedMs={recommendation.wind_speed_ms}
                size={140}
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-600">
                Hold i sentrum - Juster med siktet
              </p>
            </div>
          </div>
        )}
      </div>

      {notes && notes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              {notes.map((note, idx) => (
                <p key={idx} className="text-sm text-slate-700">
                  {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4">
        {resolved_source_name && (
          <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-slate-500">
            {sourceIcon}
            <span>Kilde: {resolved_source_name}</span>
          </div>
        )}

        {source === 'ballistic_profile' && profile && (
          <>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Ballistisk profil</h3>
            <p className="text-sm text-slate-900">{profile.name}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
              <div>
                <span className="font-medium">Null:</span> {profile.zero_distance_m}m
              </div>
              <div>
                <span className="font-medium">V0:</span> {profile.muzzle_velocity} m/s
              </div>
              <div>
                <span className="font-medium">Sikte:</span> {profile.sight_type}
              </div>
            </div>
          </>
        )}

        {source === 'click_table' && click_table && (
          <>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Knepptabell</h3>
            <p className="text-sm text-slate-900">{click_table.name}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="font-medium">Null:</span> {click_table.zero_distance}m
              </div>
              <div>
                <span className="font-medium">Type:</span> {click_table.table_type === 'reference' ? 'Referanse' : 'Tabell'}
              </div>
            </div>
          </>
        )}

        {resolved_source === 'direct_calculation' && (
          <p className="text-xs text-amber-600 mt-2">
            Direkte beregning brukes som fallback. Vi anbefaler å generere en knepptabell fra din ballistiske profil for mer konsekvent bruk.
          </p>
        )}
      </div>
    </div>
  );
}
