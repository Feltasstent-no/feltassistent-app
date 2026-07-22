import { supabase } from './supabase';

export interface LogWeaponShotsParams {
  userId: string;
  weaponId: string;
  shotsFired: number;
  shotDate: string;
  comment?: string;
  source: 'dashboard' | 'weapons_page' | 'quick_assistant' | 'match' | 'training';
}

export async function logWeaponShots(params: LogWeaponShotsParams): Promise<void> {
  const { userId, weaponId, shotsFired, shotDate, comment, source } = params;

  if (!shotsFired || shotsFired === 0) {
    throw new Error('Shots fired must be a non-zero number');
  }

  const isCorrection = shotsFired < 0;
  const absShots = Math.abs(shotsFired);

  // Resolve active barrel from user_active_setup (single source of truth)
  const { data: setup, error: setupError } = await supabase
    .from('user_active_setup')
    .select('barrel_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (setupError) {
    throw setupError;
  }

  if (!setup?.barrel_id) {
    throw new Error('Ingen aktivt løp er valgt. Velg et løp i Aktivt oppsett før du registrerer skudd.');
  }

  const activeBarrelId = setup.barrel_id;

  // Verify barrel exists and belongs to the specified weapon
  const { data: barrel, error: barrelFetchError } = await supabase
    .from('weapon_barrels')
    .select('id, weapon_id, total_shots_fired')
    .eq('id', activeBarrelId)
    .single();

  if (barrelFetchError || !barrel) {
    throw new Error('Aktivt løp ble ikke funnet i databasen.');
  }

  if (barrel.weapon_id !== weaponId) {
    throw new Error(
      `Konsistensfeil: aktivt løp (${activeBarrelId}) tilhører ikke valgt våpen (${weaponId}). Oppdater Aktivt oppsett.`
    );
  }

  // Update weapon total
  const { data: weapon, error: weaponFetchError } = await supabase
    .from('weapons')
    .select('total_shots_fired')
    .eq('id', weaponId)
    .single();

  if (weaponFetchError) {
    throw weaponFetchError;
  }

  if (!weapon) {
    throw new Error('Weapon not found');
  }

  const currentTotal = weapon.total_shots_fired || 0;
  const newTotal = isCorrection
    ? Math.max(0, currentTotal - absShots)
    : currentTotal + absShots;

  const { error: weaponError } = await supabase
    .from('weapons')
    .update({ total_shots_fired: newTotal })
    .eq('id', weaponId);

  if (weaponError) {
    throw weaponError;
  }

  // Update barrel total
  const barrelCurrent = barrel.total_shots_fired || 0;
  const newBarrelTotal = isCorrection
    ? Math.max(0, barrelCurrent - absShots)
    : barrelCurrent + absShots;

  const { error: barrelError } = await supabase
    .from('weapon_barrels')
    .update({ total_shots_fired: newBarrelTotal })
    .eq('id', activeBarrelId);

  if (barrelError) {
    throw barrelError;
  }

  // Insert shot log
  const { error: logError } = await supabase
    .from('weapon_shot_logs')
    .insert({
      user_id: userId,
      weapon_id: weaponId,
      barrel_id: activeBarrelId,
      shots_fired: absShots,
      shot_date: shotDate,
      comment: comment || null,
      source,
      log_type: isCorrection ? 'correction' : 'add',
    });

  if (logError) {
    throw logError;
  }
}
