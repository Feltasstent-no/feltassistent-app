import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Package, Plus, Minus, PlusCircle, X, Pencil, Trash2,
  ChevronDown, ChevronUp, History, Star, Target, Crosshair, TreePine, Loader2,
} from 'lucide-react';
import type { AmmoInventory, AmmunitionBatch, Weapon, WeaponBarrel } from '../types/database';
import {
  getAmmoInventoryForWeapon,
  createAmmoInventory,
  updateAmmoInventory,
  deactivateAmmoInventory,
  deductAmmoFromInventory,
  addAmmoToInventory,
  setAmmoAsCurrentActive,
  setAmmoDefault,
  getBatchesForAmmoIds,
  createBatch,
  updateBatch,
} from '../lib/ammo-inventory-service';
import { AmmoHistoryModal } from './AmmoHistoryModal';
import { BatchDetailsForm, EMPTY_BATCH_FORM, batchFormHasData, parseDecimalInput, batchFormToPayload } from './BatchDetailsForm';
import type { BatchFormValues } from './BatchDetailsForm';
import { BatchInfoDisplay, buildBatchSummary } from './BatchInfoDisplay';
import { BatchModal } from './BatchModal';

interface AmmoInventorySectionProps {
  weapon: Weapon;
  barrels: WeaponBarrel[];
}

const USAGE_TYPE_LABELS: Record<string, string> = {
  felt: 'Felt',
  bane: 'Bane',
  trening: 'Trening',
  annet: 'Annet',
};

const USAGE_TYPE_COLORS: Record<string, string> = {
  felt: 'bg-sky-100 text-sky-700',
  bane: 'bg-violet-100 text-violet-700',
  trening: 'bg-amber-100 text-amber-700',
  annet: 'bg-slate-100 text-slate-600',
};

const DEFAULT_CONTEXTS: { key: 'felt' | 'bane' | 'trening'; label: string; icon: typeof Target }[] = [
  { key: 'felt', label: 'Felt', icon: TreePine },
  { key: 'bane', label: 'Bane', icon: Target },
  { key: 'trening', label: 'Trening', icon: Crosshair },
];





export function AmmoInventorySection({ weapon, barrels }: AmmoInventorySectionProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<AmmoInventory[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AmmoInventory | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add');
  const [historyItem, setHistoryItem] = useState<AmmoInventory | null>(null);
  const [isCreatingAmmo, setIsCreatingAmmo] = useState(false);
  const [createAmmoError, setCreateAmmoError] = useState<string | null>(null);
  const [isUpdatingAmmo, setIsUpdatingAmmo] = useState(false);
  const [updateAmmoError, setUpdateAmmoError] = useState<string | null>(null);
  const [deletingAmmoId, setDeletingAmmoId] = useState<string | null>(null);
  const [isAdjustingAmmo, setIsAdjustingAmmo] = useState(false);
  const [adjustAmmoError, setAdjustAmmoError] = useState<string | null>(null);
  const [quickAddingKey, setQuickAddingKey] = useState<string | null>(null);
  const [batchForm, setBatchForm] = useState<BatchFormValues>({ ...EMPTY_BATCH_FORM });
  const [stockManuallyEdited, setStockManuallyEdited] = useState(false);
  const [bulletWeightManuallyEdited, setBulletWeightManuallyEdited] = useState(false);
  const [bulletModelManuallyEdited, setBulletModelManuallyEdited] = useState(false);
  const [batchesMap, setBatchesMap] = useState<Record<string, AmmunitionBatch[]>>({});
  const [batchWarning, setBatchWarning] = useState<string | null>(null);
  const [batchModal, setBatchModal] = useState<{ ammoId: string; ammoName: string; batch: AmmunitionBatch | null; copyFrom?: AmmunitionBatch } | null>(null);
  const [batchOpenIds, setBatchOpenIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    name: '',
    usage_type: 'felt',
    caliber: weapon.caliber || '',
    ammo_name: '',
    bullet_weight_gr: '',
    stock_quantity: '0',
    track_stock: true,
    auto_deduct_after_match: false,
    barrel_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchInventory();
  }, [weapon.id]);

  const fetchInventory = async () => {
    const data = await getAmmoInventoryForWeapon(weapon.id);
    setItems(data);
    if (data.length > 0) {
      const ids = data.map(i => i.id);
      const batches = await getBatchesForAmmoIds(ids);
      setBatchesMap(batches);
    } else {
      setBatchesMap({});
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      usage_type: 'felt',
      caliber: weapon.caliber || '',
      ammo_name: '',
      bullet_weight_gr: '',
      stock_quantity: '0',
      track_stock: true,
      auto_deduct_after_match: false,
      barrel_id: '',
      notes: '',
    });
    setBatchForm({ ...EMPTY_BATCH_FORM });
    setBatchWarning(null);
    setStockManuallyEdited(false);
    setBulletWeightManuallyEdited(false);
    setBulletModelManuallyEdited(false);
  };

  const handleBatchFormChange = (newBatch: BatchFormValues) => {
    const oldQty = batchForm.quantity_produced;
    const newQty = newBatch.quantity_produced;
    setBatchForm(newBatch);

    if (newBatch.ammo_origin === 'reloaded' && !stockManuallyEdited && oldQty !== newQty) {
      const parsed = parseInt(newQty, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setForm(prev => ({ ...prev, stock_quantity: String(parsed) }));
      } else if (newQty === '') {
        setForm(prev => ({ ...prev, stock_quantity: '0' }));
      }
    }

    if (!bulletWeightManuallyEdited && newBatch.bullet_weight_gr !== batchForm.bullet_weight_gr) {
      setBulletWeightManuallyEdited(true);
    }
    if (!bulletModelManuallyEdited && newBatch.bullet_model !== batchForm.bullet_model) {
      setBulletModelManuallyEdited(true);
    }
  };

  const handleAmmoFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));

    if (!showNewForm) return;

    if (field === 'bullet_weight_gr' && !bulletWeightManuallyEdited) {
      setBatchForm(prev => {
        if (prev.bullet_weight_gr === '' || prev.bullet_weight_gr === form.bullet_weight_gr) {
          return { ...prev, bullet_weight_gr: value };
        }
        return prev;
      });
    }
    if (field === 'ammo_name' && !bulletModelManuallyEdited) {
      setBatchForm(prev => {
        if (prev.bullet_model === '' || prev.bullet_model === form.ammo_name) {
          return { ...prev, bullet_model: value };
        }
        return prev;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isCreatingAmmo) return;

    setIsCreatingAmmo(true);
    setCreateAmmoError(null);

    try {
      const { data: newAmmo, error } = await createAmmoInventory({
        userId: user.id,
        weaponId: weapon.id,
        barrelId: form.barrel_id || null,
        name: form.name,
        usageType: form.usage_type,
        caliber: form.caliber || undefined,
        ammoName: form.ammo_name || undefined,
        bulletWeightGr: form.bullet_weight_gr ? parseFloat(parseDecimalInput(form.bullet_weight_gr)) : undefined,
        stockQuantity: parseInt(form.stock_quantity) || 0,
        trackStock: form.track_stock,
        autoDeductAfterMatch: form.auto_deduct_after_match,
        notes: form.notes || undefined,
      });

      if (error) throw error;

      if (newAmmo && batchFormHasData(batchForm)) {
        try {
          const batchPayload = batchFormToPayload(batchForm, user.id, newAmmo.id);
          const { error: batchError } = await createBatch(batchPayload);
          if (batchError) throw batchError;
        } catch (batchErr) {
          console.error('Error creating batch:', batchErr);
          setBatchWarning('Ammunisjonen ble opprettet, men batchdetaljene kunne ikke lagres. Du kan legge dem til senere.');
        }
      }

      setShowNewForm(false);
      resetForm();
      await fetchInventory();
    } catch (err) {
      console.error('Error creating ammo inventory:', err);
      setCreateAmmoError(
        err instanceof Error && err.message
          ? err.message
          : 'Feil ved opprettelse av ammunisjonsoppsett'
      );
    } finally {
      setIsCreatingAmmo(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (isUpdatingAmmo) return;

    setIsUpdatingAmmo(true);
    setUpdateAmmoError(null);

    try {
      const { error } = await updateAmmoInventory(editingItem.id, {
        name: form.name,
        usage_type: form.usage_type as AmmoInventory['usage_type'],
        caliber: form.caliber || null,
        ammo_name: form.ammo_name || null,
        bullet_weight_gr: form.bullet_weight_gr ? parseFloat(parseDecimalInput(form.bullet_weight_gr)) : null,
        track_stock: form.track_stock,
        auto_deduct_after_match: form.auto_deduct_after_match,
        barrel_id: form.barrel_id || null,
        notes: form.notes || null,
      });

      if (error) throw error;

      setEditingItem(null);
      resetForm();
      await fetchInventory();
    } catch (err) {
      console.error('Error updating ammo inventory:', err);
      setUpdateAmmoError(
        err instanceof Error && err.message
          ? err.message
          : 'Feil ved oppdatering av ammunisjonsoppsett'
      );
    } finally {
      setIsUpdatingAmmo(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingAmmoId) return;
    if (!confirm('Fjern dette ammunisjonsoppsettet?')) return;

    setDeletingAmmoId(id);
    try {
      await deactivateAmmoInventory(id);
      await fetchInventory();
    } catch (err) {
      console.error('Error deleting ammo inventory:', err);
      alert('Feil ved fjerning av ammunisjonsoppsett');
    } finally {
      setDeletingAmmoId(null);
    }
  };

  const startEdit = async (item: AmmoInventory) => {
    setEditingItem(item);
    setShowNewForm(false);
    setBatchWarning(null);
    setForm({
      name: item.name,
      usage_type: item.usage_type,
      caliber: item.caliber || '',
      ammo_name: item.ammo_name || '',
      bullet_weight_gr: item.bullet_weight_gr?.toString() || '',
      stock_quantity: item.stock_quantity.toString(),
      track_stock: item.track_stock,
      auto_deduct_after_match: item.auto_deduct_after_match,
      barrel_id: item.barrel_id || '',
      notes: item.notes || '',
    });

  };

  const handleAdjust = async () => {
    if (!adjustingItem || !user) return;
    if (isAdjustingAmmo) return;
    const qty = parseInt(adjustAmount);
    if (isNaN(qty) || qty <= 0) return;

    setIsAdjustingAmmo(true);
    setAdjustAmmoError(null);

    try {
      if (adjustMode === 'add') {
        await addAmmoToInventory({
          inventoryId: adjustingItem,
          userId: user.id,
          quantity: qty,
          notes: adjustNotes || undefined,
        });
      } else {
        await deductAmmoFromInventory({
          inventoryId: adjustingItem,
          userId: user.id,
          quantity: qty,
          notes: adjustNotes || undefined,
        });
      }

      setAdjustingItem(null);
      setAdjustAmount('');
      setAdjustNotes('');
      await fetchInventory();
    } catch (err) {
      console.error('Error adjusting ammo:', err);
      setAdjustAmmoError(
        err instanceof Error && err.message
          ? err.message
          : 'Feil ved justering av beholdning'
      );
    } finally {
      setIsAdjustingAmmo(false);
    }
  };

  const handleSetActive = async (item: AmmoInventory) => {
    if (!user) return;
    await setAmmoAsCurrentActive(item.id, weapon.id, user.id);
    fetchInventory();
  };

  const handleToggleDefault = async (item: AmmoInventory, context: 'felt' | 'bane' | 'trening') => {
    if (!user) return;
    const field = context === 'felt' ? 'is_default_felt'
      : context === 'bane' ? 'is_default_bane'
      : 'is_default_trening';
    const currentValue = item[field];
    await setAmmoDefault(item.id, weapon.id, user.id, context, !currentValue);
    fetchInventory();
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => {
    const isBusy = isEdit ? isUpdatingAmmo : isCreatingAmmo;
    const busyError = isEdit ? updateAmmoError : createAmmoError;
    return (
    <form onSubmit={onSubmit} className={`p-4 rounded-lg ${isEdit ? 'bg-blue-50' : 'bg-emerald-50'}`}>
      <p className={`text-sm font-medium mb-3 ${isEdit ? 'text-blue-900' : 'text-emerald-900'}`}>
        {isEdit ? 'Rediger ammunisjonsoppsett' : 'Nytt ammunisjonsoppsett'}
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Navn *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            placeholder="F.eks. Lapua Scenar Felt"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Bruksområde</label>
            <select
              value={form.usage_type}
              onChange={(e) => setForm({ ...form, usage_type: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            >
              <option value="felt">Felt</option>
              <option value="bane">Bane</option>
              <option value="trening">Trening</option>
              <option value="annet">Annet</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kaliber</label>
            <input
              type="text"
              value={form.caliber}
              onChange={(e) => setForm({ ...form, caliber: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
              placeholder="F.eks. 6.5x55"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kule/ammo-navn</label>
            <input
              type="text"
              value={form.ammo_name}
              onChange={(e) => handleAmmoFormChange('ammo_name', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
              placeholder="F.eks. Scenar 139gr"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kulevekt (gr)</label>
            <input
              type="number"
              step="0.1"
              value={form.bullet_weight_gr}
              onChange={(e) => handleAmmoFormChange('bullet_weight_gr', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
              placeholder="139"
            />
          </div>
        </div>

        {barrels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Knyttet til løp (valgfritt)</label>
            <select
              value={form.barrel_id}
              onChange={(e) => setForm({ ...form, barrel_id: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            >
              <option value="">Generell for våpen</option>
              {barrels.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.barrel_name || b.barrel_number} {b.is_active ? '' : '(inaktivt)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isEdit && (
          <BatchDetailsForm
            values={batchForm}
            onChange={handleBatchFormChange}
            disabled={isBusy}
          />
        )}

        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {batchForm.ammo_origin === 'reloaded' ? 'Startbeholdning' : 'Antall på lager'}
            </label>
            {batchForm.ammo_origin === 'reloaded' && !stockManuallyEdited && (
              <p className="text-[10px] text-slate-400 mb-1">Fylles automatisk fra antall ladet, men kan endres.</p>
            )}
            <input
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={(e) => {
                setStockManuallyEdited(true);
                setForm({ ...form, stock_quantity: e.target.value });
              }}
              className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.track_stock}
              onChange={(e) => setForm({ ...form, track_stock: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-700">Spor lagerbeholdning</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.auto_deduct_after_match}
              onChange={(e) => setForm({ ...form, auto_deduct_after_match: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-700">Trekk brukte skudd automatisk etter stevne</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notater</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={`w-full px-3 py-2 rounded-lg border ${isEdit ? 'border-blue-200' : 'border-emerald-200'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none`}
          />
        </div>

        {busyError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{busyError}</p>
          </div>
        )}
        {batchWarning && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">{batchWarning}</p>
          </div>
        )}
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={isBusy}
            aria-busy={isBusy}
            className={`flex-1 ${isEdit ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'} disabled:cursor-not-allowed text-white font-semibold rounded-lg transition py-2 text-sm flex items-center justify-center gap-2`}
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEdit ? 'Oppdaterer...' : 'Lagrer...'}</span>
              </>
            ) : (
              <span>{isEdit ? 'Lagre endringer' : 'Opprett'}</span>
            )}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setShowNewForm(false);
              setEditingItem(null);
              setCreateAmmoError(null);
              setUpdateAmmoError(null);
              resetForm();
            }}
            className="px-4 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 rounded-lg transition text-sm"
          >
            Avbryt
          </button>
        </div>
      </div>
    </form>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Ammunisjon ({items.length})
            </h3>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => {
                setShowNewForm(true);
                setEditingItem(null);
                resetForm();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded-lg transition text-sm border border-amber-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nytt ammunisjonsoppsett</span>
            </button>

            {showNewForm && renderForm(handleCreate, false)}
            {editingItem && renderForm(handleUpdate, true)}

            {items.length === 0 && !showNewForm && (
              <p className="text-sm text-slate-500 text-center py-4">
                Ingen ammunisjonsoppsett. Opprett et for å spore lagerbeholdning.
              </p>
            )}

            {items.map((item) => {
              const defaultLabels: string[] = [];
              if (item.is_default_felt) defaultLabels.push('Felt');
              if (item.is_default_bane) defaultLabels.push('Bane');
              if (item.is_default_trening) defaultLabels.push('Trening');

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.is_current_active
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${USAGE_TYPE_COLORS[item.usage_type] || 'bg-slate-100 text-slate-600'}`}>
                          {USAGE_TYPE_LABELS[item.usage_type] || item.usage_type}
                        </span>
                        {item.auto_deduct_after_match && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Auto-trekk
                          </span>
                        )}
                        {item.is_current_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-medium rounded">
                            <Star className="w-3 h-3" />
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {item.caliber && <span>{item.caliber}</span>}
                        {item.ammo_name && <span>{item.ammo_name}</span>}
                        {item.bullet_weight_gr && <span>{item.bullet_weight_gr}gr</span>}
                        {item.barrel_id && (
                          <span className="text-emerald-600">
                            {barrels.find(b => b.id === item.barrel_id)?.barrel_name || 'Knyttet til løp'}
                          </span>
                        )}
                      </div>
                      {defaultLabels.length > 0 && (
                        <p className="text-[10px] font-medium text-slate-400 mt-1">
                          Standard for {defaultLabels.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => setHistoryItem(item)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition"
                        title="Historikk"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        disabled={deletingAmmoId === item.id}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
                        title="Rediger"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingAmmoId === item.id}
                        aria-busy={deletingAmmoId === item.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
                        title="Fjern"
                      >
                        {deletingAmmoId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {item.track_stock && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-600" />
                          <span className={`text-lg font-bold ${item.stock_quantity <= 20 ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.stock_quantity}
                          </span>
                          <span className="text-xs text-slate-500">på lager</span>
                          {item.stock_quantity <= 20 && item.stock_quantity > 0 && (
                            <span className="text-xs text-red-500 font-medium">Lavt!</span>
                          )}
                        </div>
                      </div>

                      {adjustingItem !== item.id ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[10, 20, 50].map((qty) => {
                            const key = `${item.id}:${qty}`;
                            const busy = quickAddingKey === key;
                            return (
                              <button
                                key={qty}
                                disabled={quickAddingKey !== null}
                                aria-busy={busy}
                                onClick={async () => {
                                  if (!user) return;
                                  if (quickAddingKey !== null) return;
                                  setQuickAddingKey(key);
                                  try {
                                    await addAmmoToInventory({
                                      inventoryId: item.id,
                                      userId: user.id,
                                      quantity: qty,
                                      notes: `Hurtigtillegg +${qty}`,
                                    });
                                    await fetchInventory();
                                  } catch (err) {
                                    console.error('Error quick-adding ammo:', err);
                                    alert('Feil ved hurtigtillegg');
                                  } finally {
                                    setQuickAddingKey(null);
                                  }
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-1"
                              >
                                {busy ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Lagrer...</span>
                                  </>
                                ) : (
                                  <span>+{qty}</span>
                                )}
                              </button>
                            );
                          })}
                          <button
                            disabled={quickAddingKey !== null}
                            onClick={() => {
                              setAdjustingItem(item.id);
                              setAdjustMode('add');
                              setAdjustAmount('');
                              setAdjustNotes('');
                              setAdjustAmmoError(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                          >
                            Egendefinert
                          </button>
                          <button
                            disabled={quickAddingKey !== null}
                            onClick={() => {
                              setAdjustingItem(item.id);
                              setAdjustMode('remove');
                              setAdjustAmount('');
                              setAdjustNotes('');
                              setAdjustAmmoError(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-lg border border-slate-300">
                          <p className="text-xs font-medium text-slate-700 mb-2">
                            {adjustMode === 'add' ? 'Legg til skudd' : 'Trekk fra skudd'}
                          </p>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <input
                                type="number"
                                min="1"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Antall"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={handleAdjust}
                              disabled={!adjustAmount || parseInt(adjustAmount) <= 0 || isAdjustingAmmo}
                              aria-busy={isAdjustingAmmo}
                              className={`px-3 py-2 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-1 ${
                                adjustMode === 'add'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300'
                                  : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300'
                              } disabled:cursor-not-allowed`}
                            >
                              {isAdjustingAmmo ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Lagrer...</span>
                                </>
                              ) : (
                                <span>{adjustMode === 'add' ? 'Legg til' : 'Trekk fra'}</span>
                              )}
                            </button>
                            <button
                              disabled={isAdjustingAmmo}
                              onClick={() => {
                                setAdjustingItem(null);
                                setAdjustAmmoError(null);
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {adjustAmmoError && (
                            <p className="mt-2 text-xs text-red-700">{adjustAmmoError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center gap-2 flex-wrap">
                    {!item.is_current_active && (
                      <button
                        onClick={() => handleSetActive(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition"
                      >
                        <Star className="w-3 h-3" />
                        Sett aktiv
                      </button>
                    )}
                    {DEFAULT_CONTEXTS.map(({ key, label, icon: Icon }) => {
                      const field = key === 'felt' ? 'is_default_felt'
                        : key === 'bane' ? 'is_default_bane'
                        : 'is_default_trening';
                      const isDefault = item[field];
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleDefault(item, key)}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition ${
                            isDefault
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                      {item.notes}
                    </p>
                  )}

                  {(() => {
                    const batches = batchesMap[item.id] ?? [];
                    const batchCount = batches.length;
                    const isOpen = batchOpenIds.has(item.id);

                    if (batchCount === 0) {
                      return (
                        <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Batchdata &middot; Ikke registrert</span>
                          <button
                            type="button"
                            onClick={() => setBatchModal({ ammoId: item.id, ammoName: item.name, batch: null })}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded transition"
                          >
                            <Plus className="w-3 h-3" />
                            Legg til
                          </button>
                        </div>
                      );
                    }

                    const firstBatch = batches[0];
                    const summary = buildBatchSummary(firstBatch);

                    return (
                      <div className="mt-2 pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          onClick={() => {
                            setBatchOpenIds(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0 text-left">
                            <p className="text-[11px] font-medium text-slate-700 truncate">
                              {batchCount === 1 ? summary.title : `Batcher (${batchCount})`}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {batchCount === 1 ? summary.subtitle : summary.title + (batchCount > 2 ? ` +${batchCount - 1} til` : ` + 1 til`)}
                            </p>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="mt-2 space-y-2">
                            {batches.map((batch) => (
                              <BatchInfoDisplay
                                key={batch.id}
                                batch={batch}
                                onEdit={() => setBatchModal({ ammoId: item.id, ammoName: item.name, batch })}
                                onCopy={() => setBatchModal({ ammoId: item.id, ammoName: item.name, batch: null, copyFrom: batch })}
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => setBatchModal({ ammoId: item.id, ammoName: item.name, batch: null })}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded transition"
                            >
                              <Plus className="w-3 h-3" />
                              Ny batch
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {batchModal && (
        <BatchModal
          ammoName={batchModal.ammoName}
          batch={batchModal.batch}
          copyFrom={batchModal.copyFrom}
          onSave={async (values: BatchFormValues) => {
            if (!user) return;
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
            await fetchInventory();
          }}
          onClose={() => setBatchModal(null)}
        />
      )}

      {historyItem && (
        <AmmoHistoryModal
          inventoryId={historyItem.id}
          inventoryName={historyItem.name}
          currentStock={historyItem.stock_quantity}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </>
  );
}
