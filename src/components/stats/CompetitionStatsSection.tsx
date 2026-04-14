import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, TrendingUp, TrendingDown, Minus, Award, Target } from 'lucide-react';

interface ResultEntry {
  hits: number;
  maxShots: number;
  innerHits: number;
  date: string;
}

interface CompStats {
  totalCompleted: number;
  best: ResultEntry | null;
  last: ResultEntry | null;
  avgHitPct: number | null;
  trend: number | null;
  bestHitRate: number | null;
  bestHitRateBasis: ResultEntry | null;
  denominatorConsistent: boolean;
  commonDenominator: number | null;
  avgHitsRaw: number | null;
}

function computeCompStats(results: ResultEntry[]): CompStats | null {
  const totalCompleted = results.length;

  if (totalCompleted === 0) return null;

  const withMax = results.filter(r => r.maxShots > 0);
  const sorted = [...results].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const best = withMax.length > 0
    ? withMax.reduce((best, r) => {
        const rPct = r.maxShots > 0 ? r.hits / r.maxShots : 0;
        const bPct = best.maxShots > 0 ? best.hits / best.maxShots : 0;
        return rPct > bPct || (rPct === bPct && r.innerHits > best.innerHits) ? r : best;
      })
    : sorted[0] || null;

  const last = sorted[0] || null;

  const denominators = withMax.map(r => r.maxShots);
  const uniqueDenominators = [...new Set(denominators)];
  const denominatorConsistent = uniqueDenominators.length <= 1;
  const commonDenominator = denominatorConsistent && uniqueDenominators.length === 1
    ? uniqueDenominators[0]
    : null;

  const avgHitPct = withMax.length > 0
    ? withMax.reduce((sum, r) => sum + (r.hits / r.maxShots) * 100, 0) / withMax.length
    : null;

  const avgHitsRaw = results.length > 0
    ? results.reduce((sum, r) => sum + r.hits, 0) / results.length
    : null;

  let trend: number | null = null;
  if (sorted.length >= 4) {
    const recentCount = Math.min(3, Math.floor(sorted.length / 2));
    const recent = sorted.slice(0, recentCount).filter(r => r.maxShots > 0);
    const older = sorted.slice(recentCount, recentCount * 2).filter(r => r.maxShots > 0);

    if (recent.length > 0 && older.length > 0) {
      const recentPct = recent.reduce((s, r) => s + (r.hits / r.maxShots) * 100, 0) / recent.length;
      const olderPct = older.reduce((s, r) => s + (r.hits / r.maxShots) * 100, 0) / older.length;
      trend = recentPct - olderPct;
    }
  }

  let bestHitRate: number | null = null;
  let bestHitRateBasis: ResultEntry | null = null;
  if (withMax.length > 0) {
    bestHitRateBasis = withMax.reduce((best, r) => {
      const rPct = r.hits / r.maxShots;
      const bPct = best.hits / best.maxShots;
      return rPct > bPct ? r : best;
    });
    bestHitRate = (bestHitRateBasis.hits / bestHitRateBasis.maxShots) * 100;
  }

  return {
    totalCompleted,
    best,
    last,
    avgHitPct,
    trend,
    bestHitRate,
    bestHitRateBasis,
    denominatorConsistent,
    commonDenominator,
    avgHitsRaw,
  };
}

function formatHits(entry: ResultEntry): string {
  if (entry.maxShots > 0) {
    return `${entry.hits}/${entry.maxShots} treff`;
  }
  return `${entry.hits} treff`;
}

function formatInner(entry: ResultEntry): string | null {
  if (entry.innerHits > 0) {
    return `${entry.innerHits} inner`;
  }
  return null;
}

export function CompetitionStatsSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CompStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [matchRes, entryRes] = await Promise.all([
        supabase
          .from('match_sessions')
          .select('id, total_hits, inner_hits, calculated_shot_count, actual_shot_count, match_date, completed_at')
          .eq('user_id', user!.id)
          .eq('status', 'completed')
          .order('match_date', { ascending: false })
          .limit(50),
        supabase
          .from('competition_entries')
          .select('competition_id, total_score, total_hits, total_inner_hits, completed_at')
          .eq('user_id', user!.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(50),
      ]);

      const matchSessions = matchRes.data || [];
      const compEntries = entryRes.data || [];

      const compIds = [...new Set(compEntries.map(e => e.competition_id).filter(Boolean))];
      let stageMaxMap: Record<string, number> = {};

      if (compIds.length > 0) {
        const { data: stages } = await supabase
          .from('competition_stages')
          .select('competition_id, total_shots')
          .in('competition_id', compIds);

        if (stages) {
          for (const s of stages) {
            const cid = s.competition_id;
            stageMaxMap[cid] = (stageMaxMap[cid] || 0) + (s.total_shots || 0);
          }
        }
      }

      const matchResults: ResultEntry[] = matchSessions
        .filter(m => m.total_hits != null && m.total_hits > 0)
        .map(m => ({
          hits: m.total_hits!,
          maxShots: m.actual_shot_count || m.calculated_shot_count || 0,
          innerHits: m.inner_hits || 0,
          date: m.completed_at || m.match_date,
        }));

      const compResults: ResultEntry[] = compEntries
        .filter(e => (e.total_hits != null && e.total_hits > 0) || (e.total_score != null && e.total_score > 0))
        .map(e => ({
          hits: e.total_hits || e.total_score || 0,
          maxShots: stageMaxMap[e.competition_id] || 0,
          innerHits: e.total_inner_hits || 0,
          date: e.completed_at || '',
        }));

      const allResults = [...matchResults, ...compResults];
      setStats(computeCompStats(allResults));
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading || !stats) return null;

  const hasResults = stats.best != null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Din statistikk
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <MiniCard
          label="Stevner fullført"
          value={stats.totalCompleted.toString()}
          icon={<Trophy className="w-4 h-4 text-emerald-600" />}
        />

        {hasResults && stats.best && (
          <ResultCard
            label="Beste resultat"
            entry={stats.best}
            icon={<Award className="w-4 h-4 text-amber-600" />}
          />
        )}

        {hasResults && stats.avgHitPct != null && (
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-500 font-medium">Snitt treffprosent</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {stats.avgHitPct.toFixed(0)}%
            </p>
            {stats.denominatorConsistent && stats.commonDenominator && stats.avgHitsRaw != null && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                ~{stats.avgHitsRaw.toFixed(1)}/{stats.commonDenominator} treff
              </p>
            )}
          </div>
        )}

        {hasResults && stats.last && (
          <ResultCard
            label="Siste resultat"
            entry={stats.last}
            icon={<Target className="w-4 h-4 text-slate-500" />}
          />
        )}
      </div>

      {/* Hidden for now – Trend and Beste treff % cards.
         Re-enable when statistics model is stronger.
      {(stats.trend != null || stats.bestHitRate != null) && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {stats.trend != null && (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                {stats.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : stats.trend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs text-slate-500 font-medium">Trend</span>
              </div>
              <p className={`text-lg font-bold ${
                stats.trend > 0 ? 'text-emerald-600' : stats.trend < 0 ? 'text-red-600' : 'text-slate-700'
              }`}>
                {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Siste vs. tidligere</p>
            </div>
          )}

          {stats.bestHitRate != null && stats.bestHitRateBasis && (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-500 font-medium">Beste treff %</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {stats.bestHitRate.toFixed(0)}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.bestHitRateBasis.hits}/{stats.bestHitRateBasis.maxShots} treff
              </p>
            </div>
          )}
        </div>
      )}
      */}
    </div>
  );
}

function ResultCard({ label, entry, icon }: { label: string; entry: ResultEntry; icon: React.ReactNode }) {
  const inner = formatInner(entry);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900">{formatHits(entry)}</p>
      {inner && (
        <p className="text-[11px] text-slate-400 mt-0.5">{inner}</p>
      )}
    </div>
  );
}

function MiniCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
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
