import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface TrainingCoachStats {
  volumeLast30: number;
  volumeLast7: number;
  focusPoint: { text: string; sourceType: string; createdAt: string } | null;
  lastTraining: {
    score: number | null;
    maxScore: number | null;
    innerHits: number | null;
    hits: number | null;
    shots: number;
    percentage: number | null;
    type: 'bane' | 'felt';
    date: string;
  } | null;
  bestTraining: {
    score: number | null;
    maxScore: number | null;
    innerHits: number | null;
    hits: number | null;
    shots: number;
    percentage: number | null;
    type: 'bane' | 'felt';
    date: string;
  } | null;
}

export function useTrainingStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrainingCoachStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [sessionsRes, seriesRes, entriesRes, focusRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, session_date, total_score, total_shots, total_inner_hits, session_type, status, completed_at')
          .eq('user_id', user!.id)
          .neq('session_type', 'range_match')
          .in('status', ['completed', 'cancelled', 'active'])
          .order('session_date', { ascending: false }),
        supabase
          .from('training_series')
          .select('session_id, score, inner_hits, hits, shot_count, completed')
          .eq('user_id', user!.id),
        supabase
          .from('training_entries')
          .select('id, entry_date, score, shots_total, inner_hits, hits')
          .eq('user_id', user!.id)
          .order('entry_date', { ascending: false }),
        supabase
          .from('focus_points')
          .select('text, source_type, created_at')
          .eq('user_id', user!.id)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const sessions = sessionsRes.data || [];
      const series = seriesRes.data || [];
      const entries = entriesRes.data || [];
      const focusData = focusRes.data || [];

      // Aggregate series data per session
      const seriesBySession = new Map<string, { score: number; innerHits: number; hits: number; shots: number }>();
      for (const s of series) {
        const existing = seriesBySession.get(s.session_id) || { score: 0, innerHits: 0, hits: 0, shots: 0 };
        existing.score += s.score || 0;
        existing.innerHits += s.inner_hits || 0;
        existing.hits += s.hits || 0;
        existing.shots += s.shot_count || 0;
        seriesBySession.set(s.session_id, existing);
      }

      // Volume last 30 / 7 days
      let volumeLast30 = 0;
      let volumeLast7 = 0;

      for (const s of sessions) {
        if (s.session_date >= thirtyDaysAgo) {
          const seriesAgg = seriesBySession.get(s.id);
          const shots = seriesAgg ? seriesAgg.shots : (s.total_shots || 0);
          volumeLast30 += shots;
          if (s.session_date >= sevenDaysAgo) volumeLast7 += shots;
        }
      }
      for (const e of entries) {
        if (e.entry_date >= thirtyDaysAgo) {
          volumeLast30 += e.shots_total || 0;
          if (e.entry_date >= sevenDaysAgo) volumeLast7 += e.shots_total || 0;
        }
      }

      // Focus point
      const focusPoint = focusData.length > 0
        ? { text: focusData[0].text, sourceType: focusData[0].source_type, createdAt: focusData[0].created_at }
        : null;

      // Build combined results
      interface TrainingResult {
        score: number | null;
        maxScore: number | null;
        innerHits: number | null;
        hits: number | null;
        shots: number;
        percentage: number | null;
        type: 'bane' | 'felt';
        date: string;
        completedAt: string | null;
        status: string;
      }

      const results: TrainingResult[] = [];

      for (const s of sessions) {
        const seriesAgg = seriesBySession.get(s.id);
        const score = seriesAgg && seriesAgg.score > 0
          ? seriesAgg.score
          : (s.total_score > 0 ? s.total_score : null);
        const innerHits = seriesAgg && seriesAgg.innerHits > 0
          ? seriesAgg.innerHits
          : (s.total_inner_hits > 0 ? s.total_inner_hits : null);
        const hits = seriesAgg && seriesAgg.hits > 0 ? seriesAgg.hits : null;
        const shots = seriesAgg ? seriesAgg.shots : (s.total_shots || 0);

        if (shots === 0 && score == null) continue;

        const isFelt = s.session_type === 'felt' || s.session_type === 'field';
        const maxScore = !isFelt && shots > 0 ? shots * 10 : null;
        const percentage = maxScore && score != null && maxScore > 0
          ? (score / maxScore) * 100
          : null;

        results.push({
          score, maxScore, innerHits, hits, shots, percentage,
          type: isFelt ? 'felt' : 'bane',
          date: s.session_date,
          completedAt: s.completed_at,
          status: s.status,
        });
      }

      for (const e of entries) {
        const shots = e.shots_total || 0;
        const score = e.score && e.score > 0 ? e.score : null;
        const innerHits = e.inner_hits && e.inner_hits > 0 ? e.inner_hits : null;
        const hits = e.hits && e.hits > 0 ? e.hits : null;

        if (shots === 0 && score == null && hits == null) continue;

        const isFelt = hits != null && score == null;
        const maxScore = !isFelt && shots > 0 ? shots * 10 : null;
        const percentage = maxScore && score != null && maxScore > 0
          ? (score / maxScore) * 100
          : null;

        results.push({
          score, maxScore, innerHits, hits, shots, percentage,
          type: isFelt ? 'felt' : 'bane',
          date: e.entry_date,
          completedAt: e.entry_date,
          status: 'completed',
        });
      }

      // Sort by date descending
      results.sort((a, b) => b.date.localeCompare(a.date));

      // Last training: most recent completed with any data
      const completedResults = results.filter(r => r.status === 'completed');
      const lastTraining = completedResults.length > 0 ? completedResults[0] : null;

      // Best training: percentage-based ranking for bane, hits-based for felt
      // Only completed sessions with valid data
      let bestTraining: TrainingCoachStats['bestTraining'] = null;

      const baneEligible = completedResults.filter(
        r => r.type === 'bane' && r.score != null && r.shots > 0 && r.maxScore != null && r.maxScore > 0 && r.percentage != null
      );
      const feltEligible = completedResults.filter(
        r => r.type === 'felt' && r.hits != null && r.hits > 0
      );

      if (baneEligible.length > 0) {
        baneEligible.sort((a, b) => {
          // 1. Highest percentage
          const pctDiff = b.percentage! - a.percentage!;
          if (Math.abs(pctDiff) > 0.0001) return pctDiff;
          // 2. Highest inner ratio (inner / shots)
          const innerRatioA = (a.innerHits || 0) / a.shots;
          const innerRatioB = (b.innerHits || 0) / b.shots;
          const innerDiff = innerRatioB - innerRatioA;
          if (Math.abs(innerDiff) > 0.0001) return innerDiff;
          // 3. Most recent date
          return b.date.localeCompare(a.date);
        });
        const best = baneEligible[0];
        bestTraining = {
          score: best.score, maxScore: best.maxScore, innerHits: best.innerHits,
          hits: best.hits, shots: best.shots, percentage: best.percentage,
          type: 'bane', date: best.date,
        };
      } else if (feltEligible.length > 0) {
        const best = feltEligible.reduce((a, b) => (a.hits! > b.hits!) ? a : b);
        bestTraining = {
          score: best.score, maxScore: best.maxScore, innerHits: best.innerHits,
          hits: best.hits, shots: best.shots, percentage: best.percentage,
          type: 'felt', date: best.date,
        };
      }

      setStats({ volumeLast30, volumeLast7, focusPoint, lastTraining, bestTraining });
      setLoading(false);
    }

    load();
  }, [user]);

  return { stats, loading };
}
