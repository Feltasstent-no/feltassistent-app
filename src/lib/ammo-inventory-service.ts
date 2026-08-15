import { supabase } from './supabase';
import type { AmmoInventory, AmmunitionBatch } from '../types/database';

export interface AmmoInventoryLogEntry {
  id: string;
  quantity_change: number;
  reason: string;
  match_session_id: string | null;
  notes: string | null;
  running_balance: number | null;
  created_at: string;
}

export async function getAmmoInventoryForWeapon(weaponId: string): Promise<AmmoInventory[]> {
  const { data } = await supabase
    .from('ammo_inventory')
    .select('*')
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getAmmoInventoryForUser(userId: string): Promise<AmmoInventory[]> {
  const { data } = await supabase
    .from('ammo_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getAutoDeductInventory(
  userId: string,
  weaponId: string,
  barrelId?: string | null
): Promise<AmmoInventory | null> {
  let query = supabase
    .from('ammo_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .eq('auto_deduct_after_match', true)
    .eq('track_stock', true);

  if (barrelId) {
    query = query.eq('barrel_id', barrelId);
  }

  const { data } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data;
}

export async function createAmmoInventory(params: {
  userId: string;
  weaponId: string;
  barrelId?: string | null;
  name: string;
  usageType: string;
  caliber?: string;
  ammoName?: string;
  bulletWeightGr?: number;
  stockQuantity?: number;
  trackStock?: boolean;
  autoDeductAfterMatch?: boolean;
  notes?: string;
}): Promise<{ data: AmmoInventory | null; error: any }> {
  const { data, error } = await supabase
    .from('ammo_inventory')
    .insert({
      user_id: params.userId,
      weapon_id: params.weaponId,
      barrel_id: params.barrelId || null,
      name: params.name,
      usage_type: params.usageType,
      caliber: params.caliber || null,
      ammo_name: params.ammoName || null,
      bullet_weight_gr: params.bulletWeightGr || null,
      stock_quantity: params.stockQuantity || 0,
      track_stock: params.trackStock ?? true,
      auto_deduct_after_match: params.autoDeductAfterMatch ?? false,
      notes: params.notes || null,
    })
    .select()
    .single();

  return { data, error };
}

export async function updateAmmoInventory(
  id: string,
  updates: Partial<Pick<AmmoInventory, 'name' | 'usage_type' | 'caliber' | 'ammo_name' | 'bullet_weight_gr' | 'stock_quantity' | 'track_stock' | 'auto_deduct_after_match' | 'notes' | 'barrel_id'>>
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('ammo_inventory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  return { error };
}

export async function deactivateAmmoInventory(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('ammo_inventory')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  return { error };
}

export async function deductAmmoFromInventory(params: {
  inventoryId: string;
  userId: string;
  quantity: number;
  matchSessionId?: string;
  notes?: string;
}): Promise<{ error: any }> {
  const { data: current } = await supabase
    .from('ammo_inventory')
    .select('stock_quantity')
    .eq('id', params.inventoryId)
    .maybeSingle();

  if (!current) return { error: new Error('Ammunisjonsoppsett ikke funnet') };

  const newQuantity = Math.max(0, current.stock_quantity - params.quantity);

  const { error: updateError } = await supabase
    .from('ammo_inventory')
    .update({ stock_quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', params.inventoryId);

  if (updateError) return { error: updateError };

  const { error: logError } = await supabase
    .from('ammo_inventory_logs')
    .insert({
      ammo_inventory_id: params.inventoryId,
      user_id: params.userId,
      quantity_change: -params.quantity,
      reason: params.matchSessionId ? 'match' : 'manual',
      match_session_id: params.matchSessionId || null,
      notes: params.notes || null,
      running_balance: newQuantity,
    });

  return { error: logError };
}

export async function addAmmoToInventory(params: {
  inventoryId: string;
  userId: string;
  quantity: number;
  notes?: string;
}): Promise<{ error: any }> {
  const { data: current } = await supabase
    .from('ammo_inventory')
    .select('stock_quantity')
    .eq('id', params.inventoryId)
    .maybeSingle();

  if (!current) return { error: new Error('Ammunisjonsoppsett ikke funnet') };

  const newQuantity = current.stock_quantity + params.quantity;

  const { error: updateError } = await supabase
    .from('ammo_inventory')
    .update({ stock_quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', params.inventoryId);

  if (updateError) return { error: updateError };

  const { error: logError } = await supabase
    .from('ammo_inventory_logs')
    .insert({
      ammo_inventory_id: params.inventoryId,
      user_id: params.userId,
      quantity_change: params.quantity,
      reason: 'purchase',
      notes: params.notes || null,
      running_balance: newQuantity,
    });

  return { error: logError };
}

export async function getLatestAmmoLog(inventoryId: string): Promise<AmmoInventoryLogEntry | null> {
  const { data } = await supabase
    .from('ammo_inventory_logs')
    .select('id, quantity_change, reason, match_session_id, notes, running_balance, created_at')
    .eq('ammo_inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getAmmoHistoryLogs(
  inventoryId: string,
  limit = 50
): Promise<AmmoInventoryLogEntry[]> {
  const { data } = await supabase
    .from('ammo_inventory_logs')
    .select('id, quantity_change, reason, match_session_id, notes, running_balance, created_at')
    .eq('ammo_inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getActiveAmmoForWeapon(
  userId: string,
  weaponId: string,
  barrelId?: string | null
): Promise<{ inventory: AmmoInventory; latestLog: AmmoInventoryLogEntry | null } | null> {
  let query = supabase
    .from('ammo_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .eq('is_current_active', true);

  if (barrelId) {
    query = query.eq('barrel_id', barrelId);
  }

  const { data: active } = await query.limit(1).maybeSingle();

  if (active) {
    const latestLog = await getLatestAmmoLog(active.id);
    return { inventory: active, latestLog };
  }

  return null;
}

export async function getSuggestedAmmoForContext(
  userId: string,
  weaponId: string,
  context: 'felt' | 'bane' | 'trening',
  barrelId?: string | null
): Promise<AmmoInventory | null> {
  const defaultField = context === 'felt' ? 'is_default_felt'
    : context === 'bane' ? 'is_default_bane'
    : 'is_default_trening';

  let query = supabase
    .from('ammo_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .eq(defaultField, true);

  if (barrelId) {
    query = query.eq('barrel_id', barrelId);
  }

  const { data } = await query.limit(1).maybeSingle();
  return data;
}

export async function getAmmoInventoryWithLatestLog(
  userId: string,
  weaponId: string,
  barrelId?: string | null
): Promise<{ inventory: AmmoInventory; latestLog: AmmoInventoryLogEntry | null } | null> {
  const activeResult = await getActiveAmmoForWeapon(userId, weaponId, barrelId);
  if (activeResult) return activeResult;

  const suggested = await getSuggestedAmmoForContext(userId, weaponId, 'felt', barrelId);
  if (suggested) {
    const latestLog = await getLatestAmmoLog(suggested.id);
    return { inventory: suggested, latestLog };
  }

  let query = supabase
    .from('ammo_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .eq('track_stock', true);

  if (barrelId) {
    query = query.eq('barrel_id', barrelId);
  }

  const { data: inventory } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (!inventory) return null;

  const latestLog = await getLatestAmmoLog(inventory.id);
  return { inventory, latestLog };
}

export async function setAmmoAsCurrentActive(
  inventoryId: string,
  weaponId: string,
  userId: string
): Promise<{ error: any }> {
  const { error: clearError } = await supabase
    .from('ammo_inventory')
    .update({ is_current_active: false, updated_at: new Date().toISOString() })
    .eq('weapon_id', weaponId)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (clearError) return { error: clearError };

  const { error } = await supabase
    .from('ammo_inventory')
    .update({ is_current_active: true, updated_at: new Date().toISOString() })
    .eq('id', inventoryId);

  return { error };
}

export async function setAmmoDefault(
  inventoryId: string,
  weaponId: string,
  userId: string,
  context: 'felt' | 'bane' | 'trening',
  value: boolean
): Promise<{ error: any }> {
  const field = context === 'felt' ? 'is_default_felt'
    : context === 'bane' ? 'is_default_bane'
    : 'is_default_trening';

  if (value) {
    await supabase
      .from('ammo_inventory')
      .update({ [field]: false, updated_at: new Date().toISOString() })
      .eq('weapon_id', weaponId)
      .eq('user_id', userId)
      .eq('is_active', true);
  }

  const { error } = await supabase
    .from('ammo_inventory')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', inventoryId);

  return { error };
}

// ── Ammunition Batches ──────────────────────────────────────

export async function getBatchesForAmmoIds(
  ammoInventoryIds: string[]
): Promise<Record<string, AmmunitionBatch[]>> {
  if (ammoInventoryIds.length === 0) return {};

  const { data } = await supabase
    .from('ammunition_batches')
    .select('*')
    .in('ammo_inventory_id', ammoInventoryIds)
    .order('created_at', { ascending: false });

  const map: Record<string, AmmunitionBatch[]> = {};
  for (const batch of data || []) {
    const key = batch.ammo_inventory_id;
    if (!map[key]) map[key] = [];
    map[key].push(batch);
  }
  return map;
}

export async function getBatchesForAmmo(ammoInventoryId: string): Promise<AmmunitionBatch[]> {
  const { data } = await supabase
    .from('ammunition_batches')
    .select('*')
    .eq('ammo_inventory_id', ammoInventoryId)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function createBatch(
  params: Omit<AmmunitionBatch, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: AmmunitionBatch | null; error: any }> {
  const { data, error } = await supabase
    .from('ammunition_batches')
    .insert(params)
    .select()
    .single();

  return { data, error };
}

export async function updateBatch(
  id: string,
  updates: Partial<Omit<AmmunitionBatch, 'id' | 'user_id' | 'ammo_inventory_id' | 'created_at' | 'updated_at'>>
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('ammunition_batches')
    .update(updates)
    .eq('id', id);

  return { error };
}

export async function deleteBatch(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('ammunition_batches')
    .delete()
    .eq('id', id);

  return { error };
}

// ── Reloading Log ──────────────────────────────────────────

export interface ReloadingLogBatch extends AmmunitionBatch {
  ammo_inventory: {
    name: string;
    caliber: string | null;
    ammo_name: string | null;
    usage_type: string;
    weapon_id: string;
    barrel_id: string | null;
  } | null;
}

export async function getReloadingLogBatches(): Promise<ReloadingLogBatch[]> {
  const { data } = await supabase
    .from('ammunition_batches')
    .select('*, ammo_inventory:ammo_inventory_id(name, caliber, ammo_name, usage_type, weapon_id, barrel_id)')
    .eq('ammo_origin', 'reloaded')
    .order('production_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data || []) as ReloadingLogBatch[];
}

// ── Reloading Statistics ────────────────────────────────────

export interface ReloadingStats {
  thisYear: number;
  last12Months: number;
  totalRegistered: number;
  batchCount: number;
  batchesWithoutQuantity: number;
  batchesWithoutDate: number;
  lastProductionDate: string | null;
}

export async function getReloadingStats(): Promise<ReloadingStats | null> {
  const { data } = await supabase
    .from('ammunition_batches')
    .select('quantity_produced, production_date')
    .eq('ammo_origin', 'reloaded');

  if (!data || data.length === 0) return null;

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const rolling12 = new Date(now);
  rolling12.setMonth(rolling12.getMonth() - 12);
  const rolling12Str = rolling12.toISOString().slice(0, 10);

  let thisYear = 0;
  let last12Months = 0;
  let totalRegistered = 0;
  let batchesWithoutQuantity = 0;
  let batchesWithoutDate = 0;
  let lastProductionDate: string | null = null;

  for (const row of data) {
    const qty = row.quantity_produced as number | null;
    const date = row.production_date as string | null;

    if (qty == null) {
      batchesWithoutQuantity++;
    } else {
      totalRegistered += qty;
      if (date != null) {
        if (date >= yearStart) thisYear += qty;
        if (date >= rolling12Str) last12Months += qty;
      }
    }

    if (date == null) {
      batchesWithoutDate++;
    } else {
      if (lastProductionDate == null || date > lastProductionDate) {
        lastProductionDate = date;
      }
    }
  }

  return {
    thisYear,
    last12Months,
    totalRegistered,
    batchCount: data.length,
    batchesWithoutQuantity,
    batchesWithoutDate,
    lastProductionDate,
  };
}
