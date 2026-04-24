import { Target, TrendingUp, TrendingDown, Minus, Award, BarChart3 } from 'lucide-react';
import { useTrainingStats } from './useTrainingStats';
import { TrainingCoachCard } from './TrainingCoachCard';

export function TrainingStatsSection() {
  const { stats, loading } = useTrainingStats();

  if (loading || !stats) return null;

  const hasScoreData = stats.avgScore != null;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3">
        {hasScoreData && (
          <StatCard
            label="Snitt poeng %"
            value={`${stats.avgScore!.toFixed(1)}%`}
            icon={<Target className="w-4 h-4 text-emerald-600" />}
          />
        )}

        {stats.hitPercentage != null && (
          <StatCard
            label="Treff %"
            value={`${stats.hitPercentage.toFixed(0)}%`}
            icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
          />
        )}

        {stats.avgInnerHits != null && (
          <StatCard
            label="Snitt inner"
            value={`${stats.avgInnerHits.toFixed(1)} i snitt`}
            icon={<Award className="w-4 h-4 text-amber-600" />}
          />
        )}

        <StatCard
          label="Totalt skudd"
          value={stats.totalShots.toLocaleString('nb-NO')}
          icon={<Target className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {stats.scoreTrend != null && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {stats.scoreTrend != null && (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                {stats.scoreTrend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : stats.scoreTrend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs text-slate-500 font-medium">Trend</span>
              </div>
              <p className={`text-lg font-bold ${
                stats.scoreTrend > 0 ? 'text-emerald-600' : stats.scoreTrend < 0 ? 'text-red-600' : 'text-slate-700'
              }`}>
                {stats.scoreTrend > 0 ? '+' : ''}{stats.scoreTrend.toFixed(1)} poeng
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Siste vs. tidligere</p>
            </div>
          )}

          {/* Hidden for now – Stabilitet card.
             Re-enable when connected to actionable insights.
          {stats.bestSeriesScore != null && stats.worstSeriesScore != null && (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-500 font-medium">Stabilitet</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {stats.bestSeriesScore} - {stats.worstSeriesScore}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Beste / svakeste serie
              </p>
            </div>
          )}
          */}
        </div>
      )}

      {/* <TrainingCoachCard stats={stats} /> */}
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
