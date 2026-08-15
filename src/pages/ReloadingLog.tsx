import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Beaker, Pencil, Copy, Crosshair, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getReloadingStats,
  getReloadingLogBatches,
  createBatch,
  updateBatch,
  type ReloadingStats,
  type ReloadingLogBatch,
} from '../lib/ammo-inventory-service';
import { BatchInfoDisplay } from '../components/BatchInfoDisplay';
import { BatchModal } from '../components/BatchModal';
import { batchFormToPayload } from '../components/BatchDetailsForm';
import type { BatchFormValues } from '../components/BatchDetailsForm';
import type { AmmunitionBatch, CaseMarkingColor } from '../types/database';

const COLOR_LABELS: Record<CaseMarkingColor, string> = {
  none: 'Ingen',
  red: 'Rød',
  blue: 'Blå',
  green: 'Grønn',
  black: 'Svart',
  yellow: 'Gul',
  other: 'Annen',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function formatNumber(n: number): string {
  return n.toLocaleString('nb-NO');
}

function getYearFromDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return parseInt(dateStr.slice(0, 4), 10);
}

function BatchCard({
  batch,
  onEdit,
  onCopy,
}: {
  batch: ReloadingLogBatch;
  onEdit: () => void;
  onCopy: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const ammo = batch.ammo_inventory;
  const caliber = ammo?.caliber;

  const summaryParts: string[] = [];
  if (batch.quantity_produced) summaryParts.push(`${formatNumber(batch.quantity_produced)} patroner`);
  if (caliber) summaryParts.push(caliber);

  const bulletLine: string[] = [];
  if (batch.bullet_manufacturer) bulletLine.push(batch.bullet_manufacturer);
  if (batch.bullet_model) bulletLine.push(batch.bullet_model);
  if (batch.bullet_weight_gr) bulletLine.push(`${batch.bullet_weight_gr} gr`);

  const powderLine: string[] = [];
  if (batch.powder_type) powderLine.push(batch.powder_type);
  if (batch.powder_charge_gr) powderLine.push(`${batch.powder_charge_gr} gr`);

  const metaParts: string[] = [];
  if (batch.case_reload_count != null && batch.case_reload_count > 0) {
    metaParts.push(`${batch.case_reload_count}. omlading`);
  }
  if (batch.case_marking_color && batch.case_marking_color !== 'none') {
    metaParts.push(`${COLOR_LABELS[batch.case_marking_color]} merking`);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {batch.production_date && (
                <span className="font-medium text-slate-700">
                  {formatDate(batch.production_date)}
                </span>
              )}
              {batch.batch_number && (
                <>
                  <span>&middot;</span>
                  <span>Batch {batch.batch_number}</span>
                </>
              )}
              {!batch.production_date && !batch.batch_number && (
                <span className="text-slate-400 italic">Ingen dato/batchnr.</span>
              )}
            </div>

            {summaryParts.length > 0 && (
              <p className="text-sm text-slate-700 mt-1">{summaryParts.join(' \u00B7 ')}</p>
            )}

            {bulletLine.length > 0 && (
              <p className="text-xs text-slate-600 mt-1">{bulletLine.join(' ')}</p>
            )}

            {(powderLine.length > 0 || metaParts.length > 0) && (
              <p className="text-xs text-slate-500 mt-0.5">
                {[powderLine.join(' '), ...metaParts].filter(Boolean).join(' \u00B7 ')}
              </p>
            )}

            {ammo && (
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {ammo.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
            <button
              onClick={onCopy}
              title="Kopier til ny batch"
              className="p-1.5 rounded transition text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onEdit}
              title="Rediger"
              className="p-1.5 rounded transition text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition border-t border-slate-100"
      >
        {expanded ? 'Skjul laddedata' : 'Vis laddedata'}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          <BatchInfoDisplay batch={batch as AmmunitionBatch} />
        </div>
      )}
    </div>
  );
}

export function ReloadingLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReloadingStats | null>(null);
  const [batches, setBatches] = useState<ReloadingLogBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [caliberFilter, setCaliberFilter] = useState<string>('all');
  const [batchModal, setBatchModal] = useState<{
    ammoId: string;
    ammoName: string;
    batch: AmmunitionBatch | null;
    copyFrom?: AmmunitionBatch;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getReloadingStats(), getReloadingLogBatches()]).then(([s, b]) => {
      setStats(s);
      setBatches(b);
      setLoading(false);
    });
  }, [user]);

  const reload = async () => {
    const [s, b] = await Promise.all([getReloadingStats(), getReloadingLogBatches()]);
    setStats(s);
    setBatches(b);
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    batches.forEach(b => {
      const y = getYearFromDate(b.production_date);
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [batches]);

  const availableCalibers = useMemo(() => {
    const cals = new Set<string>();
    batches.forEach(b => {
      if (b.ammo_inventory?.caliber) cals.add(b.ammo_inventory.caliber);
    });
    return Array.from(cals).sort();
  }, [batches]);

  const filtered = useMemo(() => {
    return batches.filter(b => {
      if (yearFilter !== 'all') {
        const y = getYearFromDate(b.production_date);
        if (String(y) !== yearFilter) return false;
      }
      if (caliberFilter !== 'all') {
        if (b.ammo_inventory?.caliber !== caliberFilter) return false;
      }
      return true;
    });
  }, [batches, yearFilter, caliberFilter]);

  const handleBatchSave = async (values: BatchFormValues) => {
    if (!user || !batchModal) return;
    if (batchModal.batch) {
      const payload = batchFormToPayload(values, user.id, batchModal.ammoId);
      const { user_id, ammo_inventory_id, ...updates } = payload;
      const { error } = await updateBatch(batchModal.batch.id, updates);
      if (error) throw error;
    } else {
      const payload = batchFormToPayload(values, user.id, batchModal.ammoId);
      const { error } = await createBatch(payload);
      if (error) throw error;
    }
    setBatchModal(null);
    await reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEmpty = batches.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/match')}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Laddebok</h1>
            <p className="text-[11px] text-slate-500">Historikk over registrerte ladebatcher</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 rounded-lg py-2.5 px-1">
                <p className="text-lg font-semibold text-slate-900">{formatNumber(stats.thisYear)}</p>
                <p className="text-[11px] text-emerald-700/70">I år</p>
              </div>
              <div className="bg-sky-50 rounded-lg py-2.5 px-1">
                <p className="text-lg font-semibold text-slate-900">{formatNumber(stats.last12Months)}</p>
                <p className="text-[11px] text-sky-700/70">Siste 12 mnd</p>
              </div>
              <div className="bg-amber-50 rounded-lg py-2.5 px-1">
                <p className="text-lg font-semibold text-slate-900">{formatNumber(stats.totalRegistered)}</p>
                <p className="text-[11px] text-amber-700/70">Totalt registrert</p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5">
              <p className="text-xs text-slate-500">
                {stats.batchCount} registrerte batcher
                {stats.lastProductionDate && (
                  <> &middot; Sist ladet {formatDateShort(stats.lastProductionDate)}</>
                )}
              </p>
              {stats.batchesWithoutQuantity > 0 && (
                <p className="text-xs text-slate-400">
                  {stats.batchesWithoutQuantity} {stats.batchesWithoutQuantity === 1 ? 'batch mangler' : 'batcher mangler'} registrert antall
                </p>
              )}
              {stats.batchesWithoutDate > 0 && (
                <p className="text-xs text-slate-400">
                  {stats.batchesWithoutDate} {stats.batchesWithoutDate === 1 ? 'batch mangler' : 'batcher mangler'} ladedato
                </p>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        {!isEmpty && (
          <div className="flex gap-2">
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Alle år</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            {availableCalibers.length > 1 && (
              <select
                value={caliberFilter}
                onChange={e => setCaliberFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Alle kalibre</option>
                {availableCalibers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-3">
              <Beaker className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">Ingen ladebatcher registrert ennå</p>
            <p className="text-xs text-slate-500 mt-1">
              Når du registrerer en hjemmeladet batch, vises den her.
            </p>
            <button
              onClick={() => navigate('/weapons')}
              className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition"
            >
              Gå til Våpen og ammunisjon
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Batch list */}
        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(batch => (
              <BatchCard
                key={batch.id}
                batch={batch}
                onEdit={() =>
                  setBatchModal({
                    ammoId: batch.ammo_inventory_id,
                    ammoName: batch.ammo_inventory?.name || 'Ammunisjon',
                    batch: batch as AmmunitionBatch,
                  })
                }
                onCopy={() =>
                  setBatchModal({
                    ammoId: batch.ammo_inventory_id,
                    ammoName: batch.ammo_inventory?.name || 'Ammunisjon',
                    batch: null,
                    copyFrom: batch as AmmunitionBatch,
                  })
                }
              />
            ))}
          </div>
        )}

        {!isEmpty && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">Ingen batcher passer valgte filtre.</p>
          </div>
        )}
      </div>

      {batchModal && (
        <BatchModal
          ammoName={batchModal.ammoName}
          batch={batchModal.batch}
          copyFrom={batchModal.copyFrom}
          onSave={handleBatchSave}
          onClose={() => setBatchModal(null)}
        />
      )}
    </div>
  );
}


