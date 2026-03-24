import { supabase } from './supabase';

export interface LogWeaponShotsParams {
  userId: string;
  weaponId: string;
  shotsFired: number;
  shotDate: string;
  comment?: string;
  source: 'dashboard' | 'weapons_page' | 'quick_assistant';
}

export async function logWeaponShots(params: LogWeaponShotsParams): Promise<void> {
  const { userId, weaponId, shotsFired, shotDate, comment, source } = params;

  if (!shotsFired || shotsFired === 0) {
    throw new Error('Shots fired must be a non-zero number');
  }

  const { data: weapon, error: weaponFetchError } = await supabase
    .from('weapons')
    .select('total_shots_fired')
    .eq('id', weaponId)
    .single();

  if (weaponFetchError) {
    console.error('Error fetching weapon:', weaponFetchError);
    throw weaponFetchError;
  }

  if (!weapon) {
    throw new Error('Weapon not found');
  }

  const newTotal = (weapon.total_shots_fired || 0) + shotsFired;

  const { error: weaponError } = await supabase
    .from('weapons')
    .update({
      total_shots_fired: newTotal,
    })
    .eq('id', weaponId);

  if (weaponError) {
    console.error('Error updating weapon:', weaponError);
    throw weaponError;
  }

  const { data: activeBarrel, error: barrelFetchError } = await supabase
    .from('weapon_barrels')
    .select('id, total_shots_fired')
    .eq('weapon_id', weaponId)
    .eq('is_active', true)
    .maybeSingle();

  if (barrelFetchError) {
    console.error('Error fetching active barrel:', barrelFetchError);
    throw barrelFetchError;
  }

  if (activeBarrel) {
    const newBarrelTotal = (activeBarrel.total_shots_fired || 0) + shotsFired;

    const { error: barrelError } = await supabase
      .from('weapon_barrels')
      .update({
        total_shots_fired: newBarrelTotal,
      })
      .eq('id', activeBarrel.id);

    if (barrelError) {
      console.error('Error updating barrel:', barrelError);
      throw barrelError;
    }
  }

  const logData = {
    user_id: userId,
    weapon_id: weaponId,
    barrel_id: activeBarrel?.id || null,
    shots_fired: shotsFired,
    shot_date: shotDate,
    comment: comment || null,
    source,
  };

  const { error: logError } = await supabase
    .from('weapon_shot_logs')
    .insert(logData);

  if (logError) {
    console.error('Error inserting weapon_shot_logs:', logError);
    throw logError;
  }
}
