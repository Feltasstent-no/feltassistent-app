import { supabase } from './supabase';
import { UserActiveSetup, Weapon, WeaponBarrel, ClickTable, BallisticProfile, Discipline } from '../types/database';

export interface ActiveSetupWithDetails extends UserActiveSetup {
  weapon?: Weapon | null;
  barrel?: WeaponBarrel | null;
  click_table?: ClickTable | null;
  ballistic_profile?: BallisticProfile | null;
  discipline?: Discipline | null;
}

export async function getUserActiveSetup(userId: string): Promise<ActiveSetupWithDetails | null> {
  const { data, error } = await supabase
    .from('user_active_setup')
    .select(`
      *,
      weapon:weapons(id, weapon_name, weapon_type, caliber),
      barrel:weapon_barrels(id, barrel_name, barrel_number),
      click_table:click_tables(id, name, zero_distance),
      ballistic_profile:ballistic_profiles(id, name, zero_distance_m),
      discipline:disciplines(id, code, name)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    ...data,
    weapon: Array.isArray(data.weapon) ? data.weapon[0] : data.weapon,
    barrel: Array.isArray(data.barrel) ? data.barrel[0] : data.barrel,
    click_table: Array.isArray(data.click_table) ? data.click_table[0] : data.click_table,
    ballistic_profile: Array.isArray(data.ballistic_profile) ? data.ballistic_profile[0] : data.ballistic_profile,
    discipline: Array.isArray(data.discipline) ? data.discipline[0] : data.discipline,
  };
}

export async function createOrUpdateActiveSetup(
  userId: string,
  setup: {
    weapon_id?: string | null;
    barrel_id?: string | null;
    click_table_id?: string | null;
    ballistic_profile_id?: string | null;
    discipline_id?: string | null;
    mode?: string;
  }
): Promise<UserActiveSetup> {
  const { data, error } = await supabase
    .from('user_active_setup')
    .upsert({
      user_id: userId,
      weapon_id: setup.weapon_id ?? null,
      barrel_id: setup.barrel_id ?? null,
      click_table_id: setup.click_table_id ?? null,
      ballistic_profile_id: setup.ballistic_profile_id ?? null,
      discipline_id: setup.discipline_id ?? null,
      mode: setup.mode ?? 'general',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function clearActiveSetup(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_active_setup')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function setActiveWeapon(userId: string, weaponId: string | null, barrelId: string | null = null): Promise<UserActiveSetup> {
  const existing = await getUserActiveSetup(userId);

  return createOrUpdateActiveSetup(userId, {
    ...existing,
    weapon_id: weaponId,
    barrel_id: barrelId,
  });
}

export async function setActiveClickTable(userId: string, clickTableId: string | null): Promise<UserActiveSetup> {
  const existing = await getUserActiveSetup(userId);

  return createOrUpdateActiveSetup(userId, {
    ...existing,
    click_table_id: clickTableId,
    ballistic_profile_id: null,
  });
}

export async function setActiveBallisticProfile(userId: string, ballisticProfileId: string | null): Promise<UserActiveSetup> {
  const existing = await getUserActiveSetup(userId);

  return createOrUpdateActiveSetup(userId, {
    ...existing,
    ballistic_profile_id: ballisticProfileId,
    click_table_id: null,
  });
}

export async function getUserWeapons(userId: string): Promise<Weapon[]> {
  console.log('🔍 getUserWeapons called with userId:', userId);

  const { data, error } = await supabase
    .from('weapons')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('weapon_name');

  console.log('🔍 getUserWeapons result:', {
    userId,
    dataLength: data?.length || 0,
    data: data,
    error: error
  });

  if (error) throw error;
  return data || [];
}

export async function getWeaponBarrels(weaponId: string): Promise<WeaponBarrel[]> {
  const { data, error } = await supabase
    .from('weapon_barrels')
    .select('*')
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .order('barrel_name');

  if (error) throw error;
  return data || [];
}

export async function getUserClickTables(userId: string): Promise<ClickTable[]> {
  console.log('🔍 getUserClickTables called with userId:', userId);

  const { data, error } = await supabase
    .from('click_tables')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');

  console.log('🔍 getUserClickTables result:', {
    userId,
    dataLength: data?.length || 0,
    data: data,
    error: error
  });

  if (error) throw error;
  return data || [];
}

export async function getUserBallisticProfiles(userId: string): Promise<BallisticProfile[]> {
  console.log('🔍 getUserBallisticProfiles called with userId:', userId);

  const { data, error } = await supabase
    .from('ballistic_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  console.log('🔍 getUserBallisticProfiles result:', {
    userId,
    dataLength: data?.length || 0,
    data: data,
    error: error
  });

  if (error) throw error;
  return data || [];
}
