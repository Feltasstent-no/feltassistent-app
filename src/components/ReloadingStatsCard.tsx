import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Crosshair, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getReloadingStats, type ReloadingStats } from '../lib/ammo-inventory-service';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function formatNumber(n: number): string {
  return n.toLocaleString('nb-NO');
}

export function ReloadingStatsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReloadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!user) return;
    getReloadingStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [user]);

  if (loading || !stats) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Crosshair className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900">Ladding</p>
            <p className="text-xs text-slate-500 truncate">
              Registrert ladet i år: {formatNumber(stats.thisYear)} patroner &middot; {stats.batchCount} batcher
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center bg-emerald-50 rounded-lg py-2.5 px-1">
              <p className="text-lg font-semibold text-slate-900">{formatNumber(stats.thisYear)}</p>
              <p className="text-[11px] text-emerald-700/70">I år</p>
            </div>
            <div className="text-center bg-sky-50 rounded-lg py-2.5 px-1">
              <p className="text-lg font-semibold text-slate-900">{formatNumber(stats.last12Months)}</p>
              <p className="text-[11px] text-sky-700/70">Siste 12 mnd</p>
            </div>
            <div className="text-center bg-amber-50 rounded-lg py-2.5 px-1">
              <p className="text-lg font-semibold text-slate-900">{formatNumber(stats.totalRegistered)}</p>
              <p className="text-[11px] text-amber-700/70">Totalt registrert</p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {stats.batchCount} registrerte batcher
              {stats.lastProductionDate && (
                <> &middot; Sist ladet {formatDate(stats.lastProductionDate)}</>
              )}
            </p>
            {stats.batchesWithoutQuantity > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.batchesWithoutQuantity} {stats.batchesWithoutQuantity === 1 ? 'batch mangler' : 'batcher mangler'} registrert antall
              </p>
            )}
            {stats.batchesWithoutDate > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.batchesWithoutDate} {stats.batchesWithoutDate === 1 ? 'batch mangler' : 'batcher mangler'} ladedato
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/reloading-log'); }}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 transition"
            >
              Åpne laddebok
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
