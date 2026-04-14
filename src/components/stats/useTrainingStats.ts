import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface TrainingStats {
  avgScore: number | null;
  avgInnerHits: number | null;
  hitPercentage: number | null;
  totalShots: number;
  scoreTrend: number | null;
  bestSeriesScore: number | null;
  worstSeriesScore: number | null;
  totalSessions: number;
  hasWindData: boolean;
  innerHitRatio: number | null;
  scoreSpread: number | null;
}

function computeStats(
  sessions: Array<{ id: string; total_score: number; total_shots: number; total_inner_hits: number; session_date: string; wind_notes: string | null }>,
  allSeries: Array<{ session_id: string; score: number | null; inner_hits: number | null; hits: number | null; shot_count: number }>
): TrainingStats {
  const completedSeries = allSeries.filter(s => s.score != null && s.score > 0);

  const totalShots = allSeries.reduce((sum, s) => sum + (s.shot_count || 0), 0);
  const totalHits = allSeries.reduce((sum, s) => sum + (s.hits ?? s.shot_count ?? 0), 0);

  const avgScore = completedSeries.length > 0
    ? completedSeries.reduce((sum, s) => sum + (s.score || 0), 0) / completedSeries.length
    : null;

  const seriesWithInner = completedSeries.filter(s => s.inner_hits != null);
  const avgInnerHits = seriesWithInner.length > 0
    ? seriesWithInner.reduce((sum, s) => sum + (s.inner_hits || 0), 0) / seriesWithInner.length
    : null;

  const hitPercentage = totalShots > 0 ? (totalHits / totalShots) * 100 : null;

  const scores = completedSeries.map(s => s.score || 0);
  const bestSeriesScore = scores.length > 0 ? Math.max(...scores) : null;
  const worstSeriesScore = scores.length > 0 ? Math.min(...scores) : null;

  const scoreSpread = bestSeriesScore != null && worstSeriesScore != null
    ? bestSeriesScore - worstSeriesScore
    : null;

  const totalInnerHits = seriesWithInner.reduce((sum, s) => sum + (s.inner_hits || 0), 0);
  const totalSeriesShots = seriesWithInner.reduce((sum, s) => sum + (s.shot_count || 0), 0);
  const innerHitRatio = totalSeriesShots > 0 ? (totalInnerHits / totalSeriesShots) * 100 : null;

  const hasWindData = sessions.some(s => s.wind_notes != null && s.wind_notes.trim() !== '');

  let scoreTrend: number | null = null;
  if (sessions.length >= 4) {
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    );
    const recentCount = Math.min(5, Math.floor(sorted.length / 2));
    const olderCount = recentCount;

    const recentSessions = sorted.slice(0, recentCount).filter(s => s.total_score > 0);
    const olderSessions = sorted.slice(recentCount, recentCount + olderCount).filter(s => s.total_score > 0);

    if (recentSessions.length > 0 && olderSessions.length > 0) {
      const recentAvg = recentSessions.reduce((s, x) => s + x.total_score, 0) / recentSessions.length;
      const olderAvg = olderSessions.reduce((s, x) => s + x.total_score, 0) / olderSessions.length;
      scoreTrend = recentAvg - olderAvg;
    }
  }

  return {
    avgScore,
    avgInnerHits,
    hitPercentage,
    totalShots,
    scoreTrend,
    bestSeriesScore,
    worstSeriesScore,
    totalSessions: sessions.length,
    hasWindData,
    innerHitRatio,
    scoreSpread,
  };
}

export function useTrainingStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [sessionsRes, seriesRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, total_score, total_shots, total_inner_hits, session_date, wind_notes')
          .eq('user_id', user!.id)
          .eq('status', 'completed')
          .order('session_date', { ascending: false })
          .limit(50),
        supabase
          .from('training_series')
          .select('session_id, score, inner_hits, hits, shot_count')
          .eq('user_id', user!.id)
          .eq('completed', true),
      ]);

      const sessions = sessionsRes.data || [];
      const series = seriesRes.data || [];

      if (sessions.length === 0 && series.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      setStats(computeStats(sessions, series));
      setLoading(false);
    }

    load();
  }, [user]);

  return { stats, loading };
}
