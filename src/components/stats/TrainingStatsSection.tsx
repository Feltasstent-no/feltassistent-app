import { Target, TrendingUp, TrendingDown, Minus, Award, BarChart3 } from 'lucide-react';
import { useTrainingStats } from './useTrainingStats';

export function TrainingStatsSection() {
  const { stats, loading, hasRangeMatches } = useTrainingStats();

  if (loading) return null;

  const safeStats = stats ?? {
    avgScore: null,
    avgInnerHits: null,
    hitPercentage: null,
    totalShots: 0,
    scoreTrend: null,
    bestSeriesScore: null,
    worstSeriesScore: null,
    totalSessions: 0,
    hasWindData: false,
    innerHitRatio: null,
    scoreSpread: null,
  };

  const isEmpty = safeStats.totalShots === 0;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Snitt poeng %"
          value={safeStats.avgScore != null ? `${safeStats.avgScore.toFixed(1)}%` : '0%'}
          icon={<Target className="w-4 h-4 text-emerald-600" />}
        />

        <StatCard
          label="Treff %"
          value={safeStats.hitPercentage != null ? `${safeStats.hitPercentage.toFixed(0)}%` : '0%'}
          icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
        />

        <StatCard
          label="Snitt inner"
          value={safeStats.avgInnerHits != null ? `${safeStats.avgInnerHits.toFixed(1)} i snitt` : '0 i snitt'}
          icon={<Award className="w-4 h-4 text-amber-600" />}
        />

        <StatCard
          label="Totalt skudd"
          value={safeStats.totalShots.toLocaleString('nb-NO')}
          icon={<Target className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {safeStats.scoreTrend != null && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              {safeStats.scoreTrend > 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : safeStats.scoreTrend < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs text-slate-500 font-medium">Trend</span>
            </div>
            <p className={`text-lg font-bold ${
              safeStats.scoreTrend > 0 ? 'text-emerald-600' : safeStats.scoreTrend < 0 ? 'text-red-600' : 'text-slate-700'
            }`}>
              {safeStats.scoreTrend > 0 ? '+' : ''}{safeStats.scoreTrend.toFixed(1)} poeng
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Siste vs. tidligere</p>
          </div>
        </div>
      )}

      {isEmpty && (
        <p className="mt-3 text-sm text-slate-500 text-center">
          {hasRangeMatches
            ? 'Statistikk vises for trening. Banestevner vises separat.'
            : 'Ingen treningsdata enda — start en økt for å se statistikk.'}
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
