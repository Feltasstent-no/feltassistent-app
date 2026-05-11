import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Award, Target, Medal } from 'lucide-react';

interface FieldEntry {
  kind: 'field';
  hits: number;
  maxShots: number;
  innerHits: number;
  date: string;
}

interface RangeEntry {
  kind: 'range';
  score: number;
  innerHits: number;
  date: string;
}

type AnyEntry = FieldEntry | RangeEntry;

interface DashStats {
  totalCompleted: number;
  bestField: FieldEntry | null;
  bestRange: RangeEntry | null;
  last: AnyEntry | null;
}

function computeBestField(entries: FieldEntry[]): FieldEntry | null {
  if (entries.length === 0) return null;
  const withMax = entries.filter(e => e.maxShots > 0);
  if (withMax.length === 0) {
    return entries.reduce((best, e) =>
      e.hits > best.hits || (e.hits === best.hits && e.innerHits > best.innerHits) ? e : best
    );
  }
  return withMax.reduce((best, e) => {
    const ePct = e.hits / e.maxShots;
    const bPct = best.hits / best.maxShots;
    if (ePct > bPct) return e;
    if (ePct === bPct && e.innerHits > best.innerHits) return e;
    return best;
  });
}

function computeBestRange(entries: RangeEntry[]): RangeEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, e) => {
    if (e.score > best.score) return e;
    if (e.score === best.score && e.innerHits > best.innerHits) return e;
    return best;
  });
}

export function CompetitionStatsSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [matchRes, entryRes, rangeRes] = await Promise.all([
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
        supabase
          .from('training_sessions')
          .select('id, total_score, total_inner_hits, session_date, completed_at')
          .eq('user_id', user!.id)
          .eq('session_type', 'range_match')
          .eq('status', 'completed')
          .order('session_date', { ascending: false })
          .limit(50),
      ]);

      const matchSessions = matchRes.data || [];
      const compEntries = entryRes.data || [];
      const rangeSessions = rangeRes.data || [];

      const compIds = [...new Set(compEntries.map(e => e.competition_id).filter(Boolean))];
      const stageMaxMap: Record<string, number> = {};

      if (compIds.length > 0) {
        const { data: stages } = await supabase
          .from('competition_stages')
          .select('competition_id, total_shots')
          .in('competition_id', compIds);

        if (stages) {
          for (const s of stages) {
            stageMaxMap[s.competition_id] = (stageMaxMap[s.competition_id] || 0) + (s.total_shots || 0);
          }
        }
      }

      const fieldEntries: FieldEntry[] = [
        ...matchSessions.map<FieldEntry>(m => ({
          kind: 'field',
          hits: m.total_hits ?? 0,
          maxShots: m.actual_shot_count || m.calculated_shot_count || 0,
          innerHits: m.inner_hits || 0,
          date: m.completed_at || m.match_date,
        })),
        ...compEntries.map<FieldEntry>(e => ({
          kind: 'field',
          hits: e.total_hits ?? e.total_score ?? 0,
          maxShots: stageMaxMap[e.competition_id] || 0,
          innerHits: e.total_inner_hits || 0,
          date: e.completed_at || '',
        })),
      ];

      const rangeEntries: RangeEntry[] = rangeSessions.map<RangeEntry>(s => ({
        kind: 'range',
        score: s.total_score ?? 0,
        innerHits: s.total_inner_hits ?? 0,
        date: s.completed_at || s.session_date || '',
      }));

      const totalCompleted = fieldEntries.length + rangeEntries.length;

      const bestField = computeBestField(fieldEntries.filter(e => e.hits > 0));
      const bestRange = computeBestRange(rangeEntries.filter(e => e.score > 0));

      const allSorted: AnyEntry[] = [...fieldEntries, ...rangeEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const last = allSorted[0] || null;

      setStats({ totalCompleted, bestField, bestRange, last });
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading || !stats) return null;

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

        <FieldBestCard entry={stats.bestField} />

        <RangeBestCard entry={stats.bestRange} />

        <LastResultCard entry={stats.last} />
      </div>
    </div>
  );
}

function FieldBestCard({ entry }: { entry: FieldEntry | null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Award className="w-4 h-4 text-amber-600" />
        <span className="text-xs text-slate-500 font-medium">Beste feltstevne</span>
      </div>
      {entry ? (
        <>
          <p className="text-lg font-bold text-slate-900 text-center">
            {entry.maxShots > 0 ? `${entry.hits}/${entry.maxShots} treff` : `${entry.hits} treff`}
          </p>
          {entry.innerHits > 0 && (
            <p className="text-[11px] text-slate-400 mt-0.5 text-center">{entry.innerHits} inner</p>
          )}
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-slate-400 text-center">—</p>
          <p className="text-[11px] text-slate-400 mt-0.5 text-center">Ingen feltstevner</p>
        </>
      )}
    </div>
  );
}

function RangeBestCard({ entry }: { entry: RangeEntry | null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Medal className="w-4 h-4 text-amber-600" />
        <span className="text-xs text-slate-500 font-medium">Beste banestevne</span>
      </div>
      {entry ? (
        <>
          <p className="text-lg font-bold text-slate-900 text-center">{entry.score}p</p>
          {entry.innerHits > 0 && (
            <p className="text-[11px] text-slate-400 mt-0.5 text-center">{entry.innerHits} inner</p>
          )}
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-slate-400 text-center">—</p>
          <p className="text-[11px] text-slate-400 mt-0.5 text-center">Ingen banestevner</p>
        </>
      )}
    </div>
  );
}

function LastResultCard({ entry }: { entry: AnyEntry | null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-500 font-medium">Siste resultat</span>
      </div>
      {entry ? (
        entry.kind === 'field' ? (
          <>
            <p className="text-lg font-bold text-slate-900 text-center">
              Feltstevne: {entry.maxShots > 0 ? `${entry.hits}/${entry.maxShots} treff` : `${entry.hits} treff`}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 text-center">
              Feltstevne{entry.innerHits > 0 ? ` • ${entry.innerHits} inner` : ''}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-slate-900 text-center">Banestevne: {entry.score}p</p>
            <p className="text-[11px] text-slate-400 mt-0.5 text-center">
              Banestevne{entry.innerHits > 0 ? ` • ${entry.innerHits} inner` : ''}
            </p>
          </>
        )
      ) : (
        <>
          <p className="text-lg font-bold text-slate-400 text-center">—</p>
          <p className="text-[11px] text-slate-400 mt-0.5 text-center">Ingen stevner enda</p>
        </>
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
      <p className="text-lg font-bold text-slate-900 text-center">{value}</p>
    </div>
  );
}
