import { Target, Lightbulb, Clock, Trophy } from 'lucide-react';
import { useTrainingStats } from './useTrainingStats';

export function TrainingStatsSection() {
  const { stats, loading } = useTrainingStats();

  if (loading) return null;

  const s = stats;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const formatResult = (
    score: number | null,
    innerHits: number | null,
    hits: number | null,
    type: 'bane' | 'felt'
  ) => {
    if (type === 'felt' && hits != null) {
      return innerHits != null ? `${hits} treff / ${innerHits}*` : `${hits} treff`;
    }
    if (score != null) {
      return innerHits != null ? `${score}p / ${innerHits}*` : `${score}p`;
    }
    return '--';
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Treningsvolum */}
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 font-medium">Treningsvolum</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {s ? s.volumeLast30.toLocaleString('nb-NO') : '0'} skudd
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {s && s.volumeLast7 > 0
              ? `Siste 30 dager • +${s.volumeLast7} siste 7`
              : 'Siste 30 dager'}
          </p>
        </div>

        {/* 2. Fokusområde */}
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 font-medium">Fokusområde</span>
          </div>
          {s?.focusPoint ? (
            <>
              <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
                {s.focusPoint.text}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 uppercase">
                {s.focusPoint.sourceType} • {formatDate(s.focusPoint.createdAt)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-500 leading-tight">Ingen fokusområde</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Lagre erfaringer fra trening</p>
            </>
          )}
        </div>

        {/* 3. Siste trening */}
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500 font-medium">Siste trening</span>
          </div>
          {s?.lastTraining ? (
            <>
              <p className="text-lg font-bold text-slate-900">
                {formatResult(s.lastTraining.score, s.lastTraining.innerHits, s.lastTraining.hits, s.lastTraining.type)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {s.lastTraining.shots} skudd {s.lastTraining.type}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-500">Ingen trening ennå</p>
          )}
        </div>

        {/* 4. Beste trening */}
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-slate-500 font-medium">Beste trening</span>
          </div>
          {s?.bestTraining ? (
            <>
              <p className="text-lg font-bold text-slate-900">
                {formatResult(s.bestTraining.score, s.bestTraining.innerHits, s.bestTraining.hits, s.bestTraining.type)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{s.bestTraining.type}</p>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-500">Ingen data ennå</p>
          )}
        </div>
      </div>
    </div>
  );
}
