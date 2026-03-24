import { supabase } from './supabase';
import type { AmmoInventory } from '../types/database';

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
