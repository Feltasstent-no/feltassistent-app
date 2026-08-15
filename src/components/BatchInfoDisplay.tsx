import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Factory, Beaker, Copy } from 'lucide-react';
import type { AmmunitionBatch, CaseMarkingColor, BatchStatus } from '../types/database';

interface BatchInfoDisplayProps {
  batch: AmmunitionBatch;
  onEdit?: () => void;
  onCopy?: () => void;
  disabled?: boolean;
}

const COLOR_LABELS: Record<CaseMarkingColor, string> = {
  none: 'Ingen',
  red: 'Rød',
  blue: 'Blå',
  green: 'Grønn',
  black: 'Svart',
  yellow: 'Gul',
  other: 'Annen',
};

const STATUS_LABELS: Partial<Record<BatchStatus, string>> = {
  test_batch: 'Testbatch',
  blocked: 'Sperret',
  depleted: 'Oppbrukt',
  archived: 'Arkivert',
};

export function buildBatchSummary(b: AmmunitionBatch): { title: string; subtitle: string } {
  const parts: string[] = [];

  if (b.ammo_origin === 'factory') {
    parts.push('Fabrikkammo');
    const bullet: string[] = [];
    if (b.bullet_manufacturer) bullet.push(b.bullet_manufacturer);
    if (b.bullet_model) bullet.push(b.bullet_model);
    if (b.bullet_weight_gr) bullet.push(`${b.bullet_weight_gr} gr`);
    if (bullet.length) parts.push(bullet.join(' '));

    return {
      title: b.batch_number ? `Lot ${b.batch_number}` : 'Fabrikkammo',
      subtitle: parts.join(' \u00B7 '),
    };
  }

  parts.push('Hjemmeladet');
  const bullet: string[] = [];
  if (b.bullet_model) bullet.push(b.bullet_model);
  if (b.bullet_weight_gr) bullet.push(`${b.bullet_weight_gr} gr`);
  if (bullet.length) parts.push(bullet.join(' '));
  if (b.case_reload_count != null && b.case_reload_count > 0) {
    parts.push(`${b.case_reload_count}. omlading`);
  }
  if (b.case_marking_color && b.case_marking_color !== 'none') {
    parts.push(`${COLOR_LABELS[b.case_marking_color]} merking`);
  }

  return {
    title: b.batch_number ? `Batch ${b.batch_number}` : 'Hjemmeladet batch',
    subtitle: parts.join(' \u00B7 '),
  };
}

type DetailGroup = { label: string; rows: { label: string; value: string }[] };

function buildDetailGroups(b: AmmunitionBatch): DetailGroup[] {
  const groups: DetailGroup[] = [];

  const push = (group: DetailGroup, label: string, value: string | number | null | undefined) => {
    if (value == null || value === '') return;
    group.rows.push({ label, value: String(value) });
  };

  // Batch
  const batch: DetailGroup = { label: 'Batch', rows: [] };
  push(batch, 'Batchnummer', b.batch_number);
  push(batch, b.ammo_origin === 'factory' ? 'Produksjonsdato' : 'Ladedato', b.production_date);
  push(batch, b.ammo_origin === 'factory' ? 'Antall i batch' : 'Antall ladet', b.quantity_produced);
  if (batch.rows.length) groups.push(batch);

  // Kule
  const bullet: DetailGroup = { label: 'Kule', rows: [] };
  push(bullet, 'Produsent', b.bullet_manufacturer);
  push(bullet, 'Modell/type', b.bullet_model);
  if (b.bullet_type && b.bullet_type !== b.bullet_model) push(bullet, 'Type', b.bullet_type);
  push(bullet, 'Vekt', b.bullet_weight_gr != null ? `${b.bullet_weight_gr} gr` : null);
  push(bullet, 'Lotnummer', b.bullet_lot_number);
  if (bullet.rows.length) groups.push(bullet);

  // Krutt (only for reloaded)
  if (b.ammo_origin === 'reloaded') {
    const powder: DetailGroup = { label: 'Krutt', rows: [] };
    push(powder, 'Produsent', b.powder_manufacturer);
    push(powder, 'Type', b.powder_type);
    push(powder, 'Ladning', b.powder_charge_gr != null ? `${b.powder_charge_gr} gr` : null);
    push(powder, 'Lotnummer', b.powder_lot_number);
    if (powder.rows.length) groups.push(powder);

    // Tennhette
    const primer: DetailGroup = { label: 'Tennhette', rows: [] };
    push(primer, 'Produsent', b.primer_manufacturer);
    push(primer, 'Type', b.primer_type);
    push(primer, 'Lotnummer', b.primer_lot_number);
    if (primer.rows.length) groups.push(primer);

    // Hylse
    const casing: DetailGroup = { label: 'Hylse', rows: [] };
    push(casing, 'Produsent', b.case_manufacturer);
    push(casing, 'Lotnummer', b.case_lot_number);
    push(casing, 'Omlading nr.', b.case_reload_count);
    push(casing, 'Batch/referanse', b.case_batch_reference);
    if (b.case_marking_color && b.case_marking_color !== 'none') {
      push(casing, 'Merking/farge', COLOR_LABELS[b.case_marking_color]);
    }
    push(casing, 'Beskrivelse av merking', b.case_marking_note);
    if (casing.rows.length) groups.push(casing);

    // Patronmål / ladeprosess
    const dims: DetailGroup = { label: 'Patronmål og ladeprosess', rows: [] };
    push(dims, 'COL', b.col_mm != null ? `${b.col_mm} mm` : null);
    push(dims, 'CBTO', b.cbto_mm != null ? `${b.cbto_mm} mm` : null);
    push(dims, 'Hylselengde', b.case_length_mm != null ? `${b.case_length_mm} mm` : null);
    push(dims, 'Kalibreringsmetode', b.sizing_method);
    push(dims, 'Krymp', b.crimp);
    push(dims, 'Kilde/referanse', b.load_data_source);
    if (dims.rows.length) groups.push(dims);
  }

  // Merknad
  const notes: DetailGroup = { label: 'Merknad', rows: [] };
  push(notes, '', b.notes);
  if (notes.rows.length) groups.push(notes);

  return groups;
}

export function BatchInfoDisplay({ batch, onEdit, onCopy, disabled = false }: BatchInfoDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const { title, subtitle } = buildBatchSummary(batch);
  const showStatus = batch.status !== 'in_use' && STATUS_LABELS[batch.status];
  const detailGroups = expanded ? buildDetailGroups(batch) : [];
  const isFactory = batch.ammo_origin === 'factory';

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Collapsed summary */}
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
          isFactory ? 'bg-amber-100' : 'bg-emerald-100'
        }`}>
          {isFactory
            ? <Factory className="w-3.5 h-3.5 text-amber-600" />
            : <Beaker className="w-3.5 h-3.5 text-emerald-600" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900 truncate">{title}</span>
            {showStatus && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                batch.status === 'blocked'
                  ? 'bg-red-100 text-red-700'
                  : batch.status === 'depleted'
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {STATUS_LABELS[batch.status]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {onCopy && batch.ammo_origin === 'reloaded' && (
            <button
              type="button"
              onClick={onCopy}
              disabled={disabled}
              title="Kopier til ny batch"
              className="p-1.5 rounded transition text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={disabled}
              title="Rediger"
              className="p-1.5 rounded transition text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition border-t border-slate-100"
      >
        {expanded ? 'Skjul detaljer' : 'Vis detaljer'}
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5" />
          : <ChevronDown className="w-3.5 h-3.5" />
        }
      </button>

      {/* Expanded details */}
      {expanded && detailGroups.length > 0 && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100">
          {detailGroups.map((group) => (
            <div key={group.label} className="pt-2.5">
              {group.label === 'Merknad' ? (
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Merknad</p>
                  <p className="text-xs text-slate-700">{group.rows[0].value}</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">{group.label}</p>
                  <div className="space-y-1">
                    {group.rows.map((row) => (
                      <div key={row.label} className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500">{row.label}</span>
                        <span className="text-xs font-medium text-slate-800 text-right ml-3 truncate max-w-[60%]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
