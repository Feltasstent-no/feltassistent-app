import { useState } from 'react';
import { X, Loader2, FlaskConical } from 'lucide-react';
import { BatchDetailsForm, EMPTY_BATCH_FORM, batchFormHasData } from './BatchDetailsForm';
import type { BatchFormValues } from './BatchDetailsForm';
import type { AmmunitionBatch } from '../types/database';

interface BatchModalProps {
  ammoName: string;
  batch: AmmunitionBatch | null;
  copyFrom?: AmmunitionBatch;
  onSave: (values: BatchFormValues) => Promise<void>;
  onClose: () => void;
}

function batchToFormValues(b: AmmunitionBatch): BatchFormValues {
  return {
    batch_number: b.batch_number || '',
    ammo_origin: b.ammo_origin,
    production_date: b.production_date || '',
    quantity_produced: b.quantity_produced != null ? String(b.quantity_produced) : '',
    status: b.status,
    bullet_manufacturer: b.bullet_manufacturer || '',
    bullet_model: b.bullet_model || '',
    bullet_type: b.bullet_type || '',
    bullet_weight_gr: b.bullet_weight_gr != null ? String(b.bullet_weight_gr) : '',
    bullet_lot_number: b.bullet_lot_number || '',
    powder_manufacturer: b.powder_manufacturer || '',
    powder_type: b.powder_type || '',
    powder_charge_gr: b.powder_charge_gr != null ? String(b.powder_charge_gr) : '',
    powder_lot_number: b.powder_lot_number || '',
    primer_manufacturer: b.primer_manufacturer || '',
    primer_type: b.primer_type || '',
    primer_lot_number: b.primer_lot_number || '',
    case_manufacturer: b.case_manufacturer || '',
    case_lot_number: b.case_lot_number || '',
    case_reload_count: b.case_reload_count != null ? String(b.case_reload_count) : '',
    case_batch_reference: b.case_batch_reference || '',
    case_marking_color: b.case_marking_color || '',
    case_marking_note: b.case_marking_note || '',
    col_mm: b.col_mm != null ? String(b.col_mm) : '',
    cbto_mm: b.cbto_mm != null ? String(b.cbto_mm) : '',
    case_length_mm: b.case_length_mm != null ? String(b.case_length_mm) : '',
    sizing_method: b.sizing_method || '',
    crimp: b.crimp || '',
    load_data_source: b.load_data_source || '',
    notes: b.notes || '',
  };
}

function batchToCopyFormValues(b: AmmunitionBatch): BatchFormValues {
  const f = batchToFormValues(b);
  f.batch_number = '';
  f.production_date = new Date().toISOString().slice(0, 10);
  f.quantity_produced = '';
  f.status = 'in_use';
  f.notes = '';
  if (b.case_reload_count != null) {
    f.case_reload_count = String(b.case_reload_count + 1);
  }
  return f;
}

export function BatchModal({ ammoName, batch, copyFrom, onSave, onClose }: BatchModalProps) {
  const isEdit = batch !== null;
  const isCopy = !isEdit && copyFrom != null;
  const [values, setValues] = useState<BatchFormValues>(
    isEdit ? batchToFormValues(batch) : isCopy ? batchToCopyFormValues(copyFrom) : { ...EMPTY_BATCH_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (err) {
      console.error('Batch save error:', err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Kunne ikke lagre batchdata. Prøv igjen.'
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {isEdit ? 'Rediger batch' : isCopy ? 'Kopier til ny batch' : 'Ny batch'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{ammoName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <BatchDetailsForm
            values={values}
            onChange={setValues}
            disabled={saving}
            startOpen
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 space-y-2">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || (!isEdit && !batchFormHasData(values))}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Lagrer...</span>
                </>
              ) : (
                <span>{isEdit ? 'Lagre endringer' : isCopy ? 'Opprett kopi' : 'Opprett batch'}</span>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-lg transition text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
