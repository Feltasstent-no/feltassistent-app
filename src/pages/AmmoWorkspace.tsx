import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAppBack } from '../lib/use-app-back';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { Weapon, WeaponBarrel } from '../types/database';
import { AmmoInventorySection } from '../components/AmmoInventorySection';
import { ArrowLeft, Package, Loader2 } from 'lucide-react';

export function AmmoWorkspace() {
  const { user } = useAuth();
  const { activeSetup } = useActiveSetup();
  const goBack = useAppBack('/skudd-og-ammo');
  const [searchParams] = useSearchParams();
  const weaponParam = searchParams.get('weapon');
  const inventoryParam = searchParams.get('inventory');

  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [barrels, setBarrels] = useState<WeaponBarrel[]>([]);
  const [stockTotal, setStockTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWeapons = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('weapons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      const list = data || [];
      setWeapons(list);
      if (list.length > 0) {
        const preferred =
          weaponParam && list.some(w => w.id === weaponParam)
            ? weaponParam
            : activeSetup?.weapon_id && list.some(w => w.id === activeSetup.weapon_id)
            ? activeSetup.weapon_id
            : list[0].id;
        setSelectedWeaponId(preferred);
      }
      setLoading(false);
    };

    fetchWeapons();
    return () => { cancelled = true; };
  }, [user, activeSetup?.weapon_id, weaponParam]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedWeaponId) {
      setBarrels([]);
      return;
    }
    setStockTotal(null);

    const loadWeaponData = async () => {
      const { data: barrelData } = await supabase
        .from('weapon_barrels')
        .select('*')
        .eq('weapon_id', selectedWeaponId)
        .order('installed_date', { ascending: false });
      if (!cancelled) setBarrels(barrelData || []);
    };

    loadWeaponData();
    return () => { cancelled = true; };
  }, [selectedWeaponId]);

  const selectedWeapon = weapons.find(w => w.id === selectedWeaponId) || null;
  const highlightInventoryId =
    selectedWeapon && selectedWeapon.id === weaponParam ? inventoryParam : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={goBack}
            aria-label="Tilbake"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Ammunisjon</h1>
            <p className="text-sm text-slate-600">Lager og forbruk</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : weapons.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Ingen våpen registrert</h2>
            <p className="text-sm text-slate-600">
              Registrer et våpen under Våpen for å begynne å spore ammunisjonslageret ditt.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <label htmlFor="ammo-weapon-select" className="block text-xs font-medium text-slate-500 mb-1.5">
                Våpen
              </label>
              <select
                id="ammo-weapon-select"
                value={selectedWeaponId ?? ''}
                onChange={(e) => setSelectedWeaponId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {weapons.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.weapon_name || w.weapon_number}
                    {w.caliber ? ` · ${w.caliber}` : ''}
                  </option>
                ))}
              </select>

              {selectedWeapon && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Package className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-medium">På lager</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tabular-nums text-slate-900">
                      {stockTotal ?? 0}
                    </span>
                    <span className="text-sm text-slate-500 ml-1.5">skudd</span>
                  </div>
                </div>
              )}
            </div>

            {selectedWeapon && (
              <AmmoInventorySection
                weapon={selectedWeapon}
                barrels={barrels}
                onStockChange={setStockTotal}
                defaultExpanded
                initialInventoryId={highlightInventoryId}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
