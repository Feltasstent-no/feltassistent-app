import { useState, useEffect } from 'react';
import { X, Check, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AmmoInventory } from '../types/database';

interface Weapon {
  id: string;
  weapon_name: string;
  weapon_number: string;
}

interface ShotCountDialogProps {
  isOpen: boolean;
  totalShots: number;
  weaponName?: string;
  weapons?: Weapon[];
  selectedWeaponId?: string;
  userId?: string;
  onConfirm: (weaponId?: string, ammoInventoryId?: string | null) => void;
  onCancel: () => void;
}

const USAGE_LABELS: Record<string, string> = {
  felt: 'Felt',
  bane: 'Bane',
  trening: 'Trening',
  annet: 'Annet',
};

export function ShotCountDialog({
  isOpen,
  totalShots,
  weaponName,
  weapons,
  selectedWeaponId,
  userId,
  onConfirm,
  onCancel,
}: ShotCountDialogProps) {
  const [selectedWeapon, setSelectedWeapon] = useState(selectedWeaponId || '');
  const [ammoList, setAmmoList] = useState<AmmoInventory[]>([]);
  const [selectedAmmo, setSelectedAmmo] = useState<string>('');
  const [loadingAmmo, setLoadingAmmo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedWeapon(selectedWeaponId || '');
      setAmmoList([]);
      setSelectedAmmo('');
      setSubmitting(false);
    }
  }, [isOpen, selectedWeaponId]);

  useEffect(() => {
    if (selectedWeapon && userId) {
      fetchAmmoForWeapon(selectedWeapon);
    } else {
      setAmmoList([]);
      setSelectedAmmo('');
    }
  }, [selectedWeapon, userId]);

  const fetchAmmoForWeapon = async (weaponId: string) => {
    setLoadingAmmo(true);
    setSelectedAmmo('');

    const { data } = await supabase
      .from('ammo_inventory')
      .select('*')
      .eq('weapon_id', weaponId)
      .eq('is_active', true)
      .eq('track_stock', true)
      .order('created_at', { ascending: true });

    const items = data || [];
    setAmmoList(items);

    if (items.length === 1) {
      setSelectedAmmo(items[0].id);
    } else {
      const defaultTraining = items.find((i: AmmoInventory) => i.is_default_trening);
      if (defaultTraining) {
        setSelectedAmmo(defaultTraining.id);
      } else {
        const autoDeduct = items.find((i: AmmoInventory) => i.auto_deduct_after_match);
        if (autoDeduct) {
          setSelectedAmmo(autoDeduct.id);
        }
      }
    }

    setLoadingAmmo(false);
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (submitting) return;
    setSubmitting(true);

    if (weapons && weapons.length > 0) {
      const ammoId = selectedAmmo || null;
      onConfirm(selectedWeapon, ammoId);
    } else {
      onConfirm(undefined, null);
    }
  };

  const hasMultipleAmmo = ammoList.length > 1;

  const formatAmmoLabel = (item: AmmoInventory) => {
    const name = item.name || item.ammo_name || 'Ukjent ammo';
    const type = USAGE_LABELS[item.usage_type] || item.usage_type;
    const stock = item.stock_quantity;
    return { name, type, stock };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Oppdater skuddteller?</h2>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-slate-600">
            Du skjot totalt <span className="font-bold text-slate-900">{totalShots} skudd</span>.
          </p>

          {weapons && weapons.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Velg vapen
                </label>
                <select
                  value={selectedWeapon}
                  onChange={(e) => setSelectedWeapon(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                >
                  <option value="">Velg et vapen</option>
                  {weapons.map((weapon) => (
                    <option key={weapon.id} value={weapon.id}>
                      {weapon.weapon_name} ({weapon.weapon_number})
                    </option>
                  ))}
                </select>
              </div>

              {selectedWeapon && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      <span>Trekk fra lager</span>
                    </div>
                  </label>

                  {loadingAmmo ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Laster lagerposter...</span>
                    </div>
                  ) : ammoList.length === 0 ? (
                    <div className="flex items-start gap-2 px-3 py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600">
                        Ingen lagerposter funnet for dette vapenet. Kun skuddteller oppdateres.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ammoList.map((item) => {
                        const { name, type, stock } = formatAmmoLabel(item);
                        const isSelected = selectedAmmo === item.id;
                        const isEmpty = stock <= 0;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedAmmo(isSelected ? '' : item.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : isEmpty
                                  ? 'border-slate-200 bg-slate-50 opacity-60'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`font-medium truncate ${
                                  isSelected ? 'text-emerald-900' : 'text-slate-900'
                                }`}>
                                  {name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                                    type === 'Trening'
                                      ? 'bg-blue-100 text-blue-700'
                                      : type === 'Felt'
                                        ? 'bg-green-100 text-green-700'
                                        : type === 'Bane'
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {type}
                                  </span>
                                  {item.is_default_trening && (
                                    <span className="text-xs text-slate-500">Standard</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-sm font-semibold tabular-nums ${
                                  isEmpty ? 'text-red-500' : 'text-slate-700'
                                }`}>
                                  {stock} stk
                                </p>
                                {!isEmpty && stock < totalShots && (
                                  <p className="text-xs text-amber-600 mt-0.5">Lavt lager</p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {hasMultipleAmmo && !selectedAmmo && (
                        <p className="text-xs text-slate-500 mt-1">
                          Velg hvilken lagerpost skuddene skal trekkes fra
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-slate-500">
                {ammoList.length > 0 && selectedAmmo
                  ? 'Skuddene legges til vapen/lop og trekkes fra valgt lager.'
                  : ammoList.length > 0
                    ? 'Velg en lagerpost for a trekke fra, eller trykk Legg til for kun skuddteller.'
                    : 'Skuddene legges til bade vapen og aktivt lop.'}
              </p>
            </>
          ) : (
            <>
              {weaponName && (
                <p className="text-slate-600">
                  Vil du legge til disse skuddene i skuddtelleren for <span className="font-semibold text-slate-900">{weaponName}</span>?
                </p>
              )}
              {!weaponName && (
                <p className="text-slate-600">
                  Vil du legge til disse skuddene i skuddtelleren for vapenet ditt?
                </p>
              )}
              <p className="text-sm text-slate-500">
                Du kan ogsa oppdatere skuddtelleren manuelt fra Dashboard eller Vapen-siden.
              </p>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition flex items-center justify-center space-x-2"
          >
            <X className="w-5 h-5" />
            <span>Hopp over</span>
          </button>
          <button
            onClick={handleConfirm}
            disabled={(weapons && weapons.length > 0 && !selectedWeapon) || submitting}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span>{submitting ? 'Oppdaterer...' : 'Legg til'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
