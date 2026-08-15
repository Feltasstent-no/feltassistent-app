import { useState } from 'react';
import { ChevronDown, ChevronUp, FlaskConical, Factory, Beaker } from 'lucide-react';
import type { BatchOrigin, BatchStatus, CaseMarkingColor, AmmunitionBatch } from '../types/database';

export function parseDecimalInput(value: string): string {
  return value.replace(',', '.');
}

function strOrNull(v: string): string | null {
  return v.trim() || null;
}

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(parseDecimalInput(v));
  return isNaN(n) ? null : n;
}

function intOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

export function batchFormToPayload(
  f: BatchFormValues,
  userId: string,
  ammoInventoryId: string
): Omit<AmmunitionBatch, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    ammo_inventory_id: ammoInventoryId,
    batch_number: strOrNull(f.batch_number),
    ammo_origin: f.ammo_origin as AmmunitionBatch['ammo_origin'],
    production_date: strOrNull(f.production_date),
    quantity_produced: intOrNull(f.quantity_produced),
    status: f.status,
    bullet_manufacturer: strOrNull(f.bullet_manufacturer),
    bullet_model: strOrNull(f.bullet_model),
    bullet_type: strOrNull(f.bullet_type),
    bullet_weight_gr: numOrNull(f.bullet_weight_gr),
    bullet_lot_number: strOrNull(f.bullet_lot_number),
    powder_manufacturer: strOrNull(f.powder_manufacturer),
    powder_type: strOrNull(f.powder_type),
    powder_charge_gr: numOrNull(f.powder_charge_gr),
    powder_lot_number: strOrNull(f.powder_lot_number),
    primer_manufacturer: strOrNull(f.primer_manufacturer),
    primer_type: strOrNull(f.primer_type),
    primer_lot_number: strOrNull(f.primer_lot_number),
    case_manufacturer: strOrNull(f.case_manufacturer),
    case_lot_number: strOrNull(f.case_lot_number),
    case_reload_count: intOrNull(f.case_reload_count),
    case_batch_reference: strOrNull(f.case_batch_reference),
    case_marking_color: (f.case_marking_color || null) as AmmunitionBatch['case_marking_color'],
    case_marking_note: strOrNull(f.case_marking_note),
    col_mm: numOrNull(f.col_mm),
    cbto_mm: numOrNull(f.cbto_mm),
    case_length_mm: numOrNull(f.case_length_mm),
    sizing_method: strOrNull(f.sizing_method),
    crimp: strOrNull(f.crimp),
    load_data_source: strOrNull(f.load_data_source),
    notes: strOrNull(f.notes),
  };
}

export interface BatchFormValues {
  batch_number: string;
  ammo_origin: BatchOrigin | '';
  production_date: string;
  quantity_produced: string;
  status: BatchStatus;

  bullet_manufacturer: string;
  bullet_model: string;
  bullet_type: string;
  bullet_weight_gr: string;
  bullet_lot_number: string;

  powder_manufacturer: string;
  powder_type: string;
  powder_charge_gr: string;
  powder_lot_number: string;

  primer_manufacturer: string;
  primer_type: string;
  primer_lot_number: string;

  case_manufacturer: string;
  case_lot_number: string;
  case_reload_count: string;
  case_batch_reference: string;
  case_marking_color: CaseMarkingColor | '';
  case_marking_note: string;

  col_mm: string;
  cbto_mm: string;
  case_length_mm: string;
  sizing_method: string;
  crimp: string;
  load_data_source: string;

  notes: string;
}

export const EMPTY_BATCH_FORM: BatchFormValues = {
  batch_number: '',
  ammo_origin: '',
  production_date: '',
  quantity_produced: '',
  status: 'in_use',
  bullet_manufacturer: '',
  bullet_model: '',
  bullet_type: '',
  bullet_weight_gr: '',
  bullet_lot_number: '',
  powder_manufacturer: '',
  powder_type: '',
  powder_charge_gr: '',
  powder_lot_number: '',
  primer_manufacturer: '',
  primer_type: '',
  primer_lot_number: '',
  case_manufacturer: '',
  case_lot_number: '',
  case_reload_count: '',
  case_batch_reference: '',
  case_marking_color: '',
  case_marking_note: '',
  col_mm: '',
  cbto_mm: '',
  case_length_mm: '',
  sizing_method: '',
  crimp: '',
  load_data_source: '',
  notes: '',
};

const BATCH_DATA_FIELDS: (keyof BatchFormValues)[] = [
  'batch_number', 'production_date', 'quantity_produced',
  'bullet_manufacturer', 'bullet_model', 'bullet_type', 'bullet_weight_gr', 'bullet_lot_number',
  'powder_manufacturer', 'powder_type', 'powder_charge_gr', 'powder_lot_number',
  'primer_manufacturer', 'primer_type', 'primer_lot_number',
  'case_manufacturer', 'case_lot_number', 'case_reload_count', 'case_batch_reference',
  'case_marking_note',
  'col_mm', 'cbto_mm', 'case_length_mm', 'sizing_method', 'crimp', 'load_data_source',
  'notes',
];

export function batchFormHasData(f: BatchFormValues): boolean {
  if (f.ammo_origin !== 'factory' && f.ammo_origin !== 'reloaded') return false;
  if (f.case_marking_color && f.case_marking_color !== 'none') return true;
  return BATCH_DATA_FIELDS.some(key => f[key].trim() !== '');
}

interface BatchDetailsFormProps {
  values: BatchFormValues;
  onChange: (values: BatchFormValues) => void;
  disabled?: boolean;
  startOpen?: boolean;
}

function DecimalField({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="decimal"
        className={inputClass}
        value={value}
        onChange={e => onChange(parseDecimalInput(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  );
}

const MARKING_COLORS: { value: CaseMarkingColor; label: string }[] = [
  { value: 'none', label: 'Ingen' },
  { value: 'red', label: 'Rød' },
  { value: 'blue', label: 'Blå' },
  { value: 'green', label: 'Grønn' },
  { value: 'black', label: 'Svart' },
  { value: 'yellow', label: 'Gul' },
  { value: 'other', label: 'Annen' },
];

const labelClass = 'block text-xs font-medium text-slate-700 mb-1';
const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function BatchDetailsForm({ values, onChange, disabled = false, startOpen = false }: BatchDetailsFormProps) {
  const [sectionOpen, setSectionOpen] = useState(startOpen);
  const [extraDetailsOpen, setExtraDetailsOpen] = useState(false);

  const set = (field: keyof BatchFormValues, val: string) => {
    onChange({ ...values, [field]: val });
  };

  const origin = values.ammo_origin;

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Collapsed toggle */}
      <button
        type="button"
        onClick={() => setSectionOpen(!sectionOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition"
        disabled={disabled}
      >
        <div className="flex items-center gap-2.5">
          <FlaskConical className="w-4 h-4 text-amber-600" />
          <div>
            <span className="text-sm font-medium text-slate-800">Batch og laddedata</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Valgfritt &ndash; for batchnummer, komponenter og egne laddedata
            </p>
          </div>
        </div>
        {sectionOpen
          ? <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        }
      </button>

      {sectionOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
          {/* Origin selector */}
          <div className="pt-4">
            <p className={labelClass}>Type ammunisjon</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => set('ammo_origin', 'factory')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-left ${
                  origin === 'factory'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Factory className={`w-4 h-4 ${origin === 'factory' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${origin === 'factory' ? 'text-amber-800' : 'text-slate-700'}`}>
                  Fabrikkammo
                </span>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const updates: Partial<BatchFormValues> = { ammo_origin: 'reloaded' };
                  if (!values.production_date) {
                    updates.production_date = new Date().toISOString().slice(0, 10);
                  }
                  onChange({ ...values, ...updates });
                }}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-left ${
                  origin === 'reloaded'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Beaker className={`w-4 h-4 ${origin === 'reloaded' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${origin === 'reloaded' ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Hjemmeladet
                </span>
              </button>
            </div>
          </div>

          {/* Factory fields */}
          {origin === 'factory' && (
            <FactoryFields values={values} set={set} disabled={disabled} />
          )}

          {/* Reloaded fields */}
          {origin === 'reloaded' && (
            <ReloadedFields
              values={values}
              set={set}
              disabled={disabled}
              extraDetailsOpen={extraDetailsOpen}
              setExtraDetailsOpen={setExtraDetailsOpen}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FactoryFields({
  values,
  set,
  disabled,
}: {
  values: BatchFormValues;
  set: (field: keyof BatchFormValues, val: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Batch/lotnummer">
          <input
            type="text"
            className={inputClass}
            value={values.batch_number}
            onChange={e => set('batch_number', e.target.value)}
            placeholder="F.eks. LOT2024-A3"
            disabled={disabled}
          />
        </Field>
        <Field label="Produksjonsdato">
          <input
            type="date"
            className={inputClass}
            value={values.production_date}
            onChange={e => set('production_date', e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kuleprodusent">
          <input
            type="text"
            className={inputClass}
            value={values.bullet_manufacturer}
            onChange={e => set('bullet_manufacturer', e.target.value)}
            placeholder="F.eks. Lapua"
            disabled={disabled}
          />
        </Field>
        <Field label="Kulemodell/type">
          <input
            type="text"
            className={inputClass}
            value={values.bullet_model}
            onChange={e => set('bullet_model', e.target.value)}
            placeholder="F.eks. Scenar-L"
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DecimalField
          label="Kulevekt (grains)"
          value={values.bullet_weight_gr}
          onChange={v => set('bullet_weight_gr', v)}
          placeholder="F.eks. 139"
          disabled={disabled}
        />
        <Field label="Kule-lotnummer">
          <input
            type="text"
            className={inputClass}
            value={values.bullet_lot_number}
            onChange={e => set('bullet_lot_number', e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field label="Antall i batch">
        <input
          type="number"
          className={inputClass}
          value={values.quantity_produced}
          onChange={e => set('quantity_produced', e.target.value)}
          placeholder="Antall patroner"
          min="0"
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

function ReloadedFields({
  values,
  set,
  disabled,
  extraDetailsOpen,
  setExtraDetailsOpen,
}: {
  values: BatchFormValues;
  set: (field: keyof BatchFormValues, val: string) => void;
  disabled: boolean;
  extraDetailsOpen: boolean;
  setExtraDetailsOpen: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Core reloading fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Batchnummer">
          <input
            type="text"
            className={inputClass}
            value={values.batch_number}
            onChange={e => set('batch_number', e.target.value)}
            placeholder="Eget batchnr."
            disabled={disabled}
          />
        </Field>
        <Field label="Ladedato">
          <input
            type="date"
            className={inputClass}
            value={values.production_date}
            onChange={e => set('production_date', e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field label="Antall ladet">
        <input
          type="number"
          className={inputClass}
          value={values.quantity_produced}
          onChange={e => set('quantity_produced', e.target.value)}
          placeholder="Antall patroner"
          min="0"
          disabled={disabled}
        />
      </Field>

      {/* Bullet section */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kuleprodusent">
          <input
            type="text"
            className={inputClass}
            value={values.bullet_manufacturer}
            onChange={e => set('bullet_manufacturer', e.target.value)}
            placeholder="F.eks. Lapua"
            disabled={disabled}
          />
        </Field>
        <Field label="Kulemodell/type">
          <input
            type="text"
            className={inputClass}
            value={values.bullet_model}
            onChange={e => set('bullet_model', e.target.value)}
            placeholder="F.eks. Scenar-L"
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DecimalField
          label="Kulevekt (grains)"
          value={values.bullet_weight_gr}
          onChange={v => set('bullet_weight_gr', v)}
          placeholder="F.eks. 139"
          disabled={disabled}
        />
        <Field label="Kule-lotnummer">
          <input
            type="text"
            className={inputClass}
            value={values.bullet_lot_number}
            onChange={e => set('bullet_lot_number', e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      {/* Powder section */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kruttprodusent">
          <input
            type="text"
            className={inputClass}
            value={values.powder_manufacturer}
            onChange={e => set('powder_manufacturer', e.target.value)}
            placeholder="F.eks. Vihtavuori"
            disabled={disabled}
          />
        </Field>
        <Field label="Kruttype">
          <input
            type="text"
            className={inputClass}
            value={values.powder_type}
            onChange={e => set('powder_type', e.target.value)}
            placeholder="F.eks. N160"
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DecimalField
          label="Ladning (grains)"
          value={values.powder_charge_gr}
          onChange={v => set('powder_charge_gr', v)}
          placeholder="F.eks. 43,50"
          disabled={disabled}
        />
        <Field label="Krutt-lotnummer">
          <input
            type="text"
            className={inputClass}
            value={values.powder_lot_number}
            onChange={e => set('powder_lot_number', e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <DecimalField
        label="COL (mm)"
        value={values.col_mm}
        onChange={v => set('col_mm', v)}
        placeholder="Cartridge Overall Length"
        disabled={disabled}
      />

      {/* Extra details sub-section */}
      <div className="rounded-lg border border-slate-200 overflow-hidden mt-2">
        <button
          type="button"
          onClick={() => setExtraDetailsOpen(!extraDetailsOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition"
          disabled={disabled}
        >
          <span className="text-xs font-medium text-slate-600">Flere komponentdetaljer</span>
          {extraDetailsOpen
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </button>

        {extraDetailsOpen && (
          <div className="px-3 pb-3 space-y-3 border-t border-slate-100">
            {/* Primer */}
            <div className="pt-3">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Tennhette</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Produsent">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.primer_manufacturer}
                    onChange={e => set('primer_manufacturer', e.target.value)}
                    placeholder="F.eks. CCI"
                    disabled={disabled}
                  />
                </Field>
                <Field label="Type">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.primer_type}
                    onChange={e => set('primer_type', e.target.value)}
                    placeholder="F.eks. BR2"
                    disabled={disabled}
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Lotnummer">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.primer_lot_number}
                    onChange={e => set('primer_lot_number', e.target.value)}
                    disabled={disabled}
                  />
                </Field>
              </div>
            </div>

            {/* Case */}
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Hylse</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Produsent">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.case_manufacturer}
                    onChange={e => set('case_manufacturer', e.target.value)}
                    placeholder="F.eks. Lapua"
                    disabled={disabled}
                  />
                </Field>
                <Field label="Lotnummer">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.case_lot_number}
                    onChange={e => set('case_lot_number', e.target.value)}
                    disabled={disabled}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Omlading nr.">
                  <input
                    type="number"
                    className={inputClass}
                    value={values.case_reload_count}
                    onChange={e => set('case_reload_count', e.target.value)}
                    placeholder="F.eks. 3"
                    min="0"
                    disabled={disabled}
                  />
                </Field>
                <Field label="Hylsebatch/referanse">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.case_batch_reference}
                    onChange={e => set('case_batch_reference', e.target.value)}
                    disabled={disabled}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Merking/farge">
                  <select
                    className={inputClass}
                    value={values.case_marking_color}
                    onChange={e => set('case_marking_color', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Velg...</option>
                    {MARKING_COLORS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Beskrivelse av merking">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.case_marking_note}
                    onChange={e => set('case_marking_note', e.target.value)}
                    placeholder="F.eks. to røde streker over hylsebunnen"
                    disabled={disabled}
                  />
                </Field>
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Dimensjoner og prosess</p>
              <div className="grid grid-cols-2 gap-3">
                <DecimalField
                  label="CBTO (mm)"
                  value={values.cbto_mm}
                  onChange={v => set('cbto_mm', v)}
                  placeholder="Cartridge Base To Ogive"
                  disabled={disabled}
                />
                <DecimalField
                  label="Hylselengde (mm)"
                  value={values.case_length_mm}
                  onChange={v => set('case_length_mm', v)}
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Kalibreringsmetode">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.sizing_method}
                    onChange={e => set('sizing_method', e.target.value)}
                    placeholder="F.eks. full length"
                    disabled={disabled}
                  />
                </Field>
                <Field label="Krymp">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.crimp}
                    onChange={e => set('crimp', e.target.value)}
                    placeholder="F.eks. ingen"
                    disabled={disabled}
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="Kilde/referanse for laddedata">
                  <input
                    type="text"
                    className={inputClass}
                    value={values.load_data_source}
                    onChange={e => set('load_data_source', e.target.value)}
                    placeholder="F.eks. Vihtavuori reload guide 2024"
                    disabled={disabled}
                  />
                </Field>
              </div>
            </div>

            {/* Notes */}
            <Field label="Merknad">
              <textarea
                className={`${inputClass} resize-none`}
                value={values.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="Egne notater om denne batchen"
                disabled={disabled}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}