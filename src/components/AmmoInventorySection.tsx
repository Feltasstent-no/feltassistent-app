import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Package, Plus, Minus, PlusCircle, X, Pencil, Trash2,
  ChevronDown, ChevronUp, History, Star, Target, Crosshair, TreePine,
} from 'lucide-react';
import type { AmmoInventory, Weapon, WeaponBarrel } from '../types/database';
import {
  getAmmoInventoryForWeapon,
  createAmmoInventory,
  updateAmmoInventory,
  deactivateAmmoInventory,
  deductAmmoFromInventory,
  addAmmoToInventory,
  setAmmoAsCurrentActive,
  setAmmoDefault,
} from '../lib/ammo-inventory-service';
import { AmmoHistoryModal } from './AmmoHistoryModal';

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
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await createAmmoInventory({
      userId: user.id,
      weaponId: weapon.id,
      barrelId: form.barrel_id || null,
      name: form.name,
      usageType: form.usage_type,
      caliber: form.caliber || undefined,
      ammoName: form.ammo_name || undefined,
      bulletWeightGr: form.bullet_weight_gr ? parseFloat(form.bullet_weight_gr) : undefined,
      stockQuantity: parseInt(form.stock_quantity) || 0,
      trackStock: form.track_stock,
      autoDeductAfterMatch: form.auto_deduct_after_match,
      notes: form.notes || undefined,
    });

    if (!error) {
      setShowNewForm(false);
      resetForm();
      fetchInventory();
    } else {
      alert('Feil ved opprettelse: ' + error.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { error } = await updateAmmoInventory(editingItem.id, {
      name: form.name,
      usage_type: form.usage_type as AmmoInventory['usage_type'],
      caliber: form.caliber || null,
      ammo_name: form.ammo_name || null,
      bullet_weight_gr: form.bullet_weight_gr ? parseFloat(form.bullet_weight_gr) : null,
      track_stock: form.track_stock,
      auto_deduct_after_match: form.auto_deduct_after_match,
      barrel_id: form.barrel_id || null,
      notes: form.notes || null,
    });

    if (!error) {
      setEditingItem(null);
      resetForm();
      fetchInventory();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Fjern dette ammunisjonsoppsettet?')) return;
    await deactivateAmmoInventory(id);
    fetchInventory();
  };

  const startEdit = (item: AmmoInventory) => {
    setEditingItem(item);
    setShowNewForm(false);
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
    const qty = parseInt(adjustAmount);
    if (isNaN(qty) || qty <= 0) return;

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
    fetchInventory();
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

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
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
              onChange={(e) => setForm({ ...form, ammo_name: e.target.value })}
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
              onChange={(e) => setForm({ ...form, bullet_weight_gr: e.target.value })}
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
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Antall på lager</label>
            <input
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
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

        <div className="flex space-x-2">
          <button
            type="submit"
            className={`flex-1 ${isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-semibold rounded-lg transition py-2 text-sm`}
          >
            {isEdit ? 'Lagre endringer' : 'Opprett'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewForm(false);
              setEditingItem(null);
              resetForm();
            }}
            className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition text-sm"
          >
            Avbryt
          </button>
        </div>
      </div>
    </form>
  );

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
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {USAGE_TYPE_LABELS[item.usage_type] || item.usage_type}
                        </span>
                        {item.auto_deduct_after_match && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Auto-trekk
                          </span>
                        )}
                        {item.is_current_active && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
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
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Rediger"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Fjern"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                          {[10, 20, 50].map((qty) => (
                            <button
                              key={qty}
                              onClick={async () => {
                                if (!user) return;
                                await addAmmoToInventory({
                                  inventoryId: item.id,
                                  userId: user.id,
                                  quantity: qty,
                                  notes: `Hurtigtillegg +${qty}`,
                                });
                                fetchInventory();
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition"
                            >
                              +{qty}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setAdjustingItem(item.id);
                              setAdjustMode('add');
                              setAdjustAmount('');
                              setAdjustNotes('');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg transition"
                          >
                            Egendefinert
                          </button>
                          <button
                            onClick={() => {
                              setAdjustingItem(item.id);
                              setAdjustMode('remove');
                              setAdjustAmount('');
                              setAdjustNotes('');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg transition"
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
                              disabled={!adjustAmount || parseInt(adjustAmount) <= 0}
                              className={`px-3 py-2 text-white font-medium rounded-lg text-sm transition ${
                                adjustMode === 'add'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300'
                                  : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300'
                              }`}
                            >
                              {adjustMode === 'add' ? 'Legg til' : 'Trekk fra'}
                            </button>
                            <button
                              onClick={() => setAdjustingItem(null)}
                              className="p-2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>

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
