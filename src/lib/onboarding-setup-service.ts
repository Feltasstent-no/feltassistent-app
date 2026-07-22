import { supabase } from './supabase';
import type { CaliberType } from '../types/database';
import { generateDistanceTable, generateClickTable, calculateWindTable } from './ballistics';
import type { BallisticProfile } from '../types/database';
import { createOrUpdateActiveSetup } from './active-setup-service';

export type SightChoice = 'busk_standard' | 'busk_finknepp' | 'annet_sikte';

interface OnboardingSetupParams {
  userId: string;
  weaponName: string;
  caliberType: CaliberType;
  sightChoice: SightChoice | null;
  baneDistances: number[];
}

interface SetupResult {
  weapon: boolean;
  barrel: boolean;
  ammo: boolean;
  profile: boolean;
  clickTable: boolean;
}

const DFS_STANDARD_PROFILES: Record<string, {
  bullet_name: string;
  ballistic_coefficient: number;
  muzzle_velocity: number;
  sight_height_mm: number;
  sight_radius_cm: number;
}> = {
  '6.5x55': {
    bullet_name: 'Norma Diamond Line 130gr',
    ballistic_coefficient: 0.548,
    muzzle_velocity: 900,
    sight_height_mm: 30,
    sight_radius_cm: 50,
  },
};

function getCaliberString(caliberType: CaliberType): string {
  if (caliberType === '.22 LR') return '.22 LR';
  if (caliberType === '6.5x55') return '6.5x55';
  return '5.56x45 NATO';
}

function getDefaultAmmoName(caliberType: CaliberType): string {
  if (caliberType === '.22 LR') return 'Standard .22 LR';
  if (caliberType === '6.5x55') return 'Norma Diamond Line 130gr Felt';
  return 'Standard 5.56x45 NATO';
}

export async function createOnboardingSetup(params: OnboardingSetupParams): Promise<SetupResult> {
  const { userId, weaponName, caliberType, sightChoice, baneDistances } = params;
  const result: SetupResult = { weapon: false, barrel: false, ammo: false, profile: false, clickTable: false };
  let createdProfileId: string | null = null;
  let createdClickTableId: string | null = null;

  const caliber = getCaliberString(caliberType);

  // 1. Create weapon
  const { data: weapon, error: weaponErr } = await supabase
    .from('weapons')
    .insert({
      user_id: userId,
      weapon_name: weaponName,
      caliber,
      is_active: true,
    })
    .select()
    .single();

  if (weaponErr || !weapon) return result;
  result.weapon = true;

  // 2. Create barrel
  const { data: barrel, error: barrelErr } = await supabase
    .from('weapon_barrels')
    .insert({
      weapon_id: weapon.id,
      barrel_name: 'Løp 1',
      installed_date: new Date().toISOString().split('T')[0],
      is_active: true,
      total_shots_fired: 0,
    })
    .select()
    .single();

  if (barrelErr || !barrel) return result;
  result.barrel = true;

  // Consistency check: barrel must belong to weapon
  if (barrel.weapon_id !== weapon.id) {
    throw new Error(`Barrel weapon_id mismatch: barrel.weapon_id=${barrel.weapon_id}, weapon.id=${weapon.id}`);
  }

  // 3. Create ammo inventory
  const ammoName = getDefaultAmmoName(caliberType);
  const { error: ammoErr } = await supabase
    .from('ammo_inventory')
    .insert({
      user_id: userId,
      weapon_id: weapon.id,
      barrel_id: barrel.id,
      name: ammoName,
      usage_type: caliberType === '6.5x55' ? 'felt' : 'trening',
      caliber,
      is_active: true,
      stock_quantity: 0,
      track_stock: false,
    });

  if (!ammoErr) result.ammo = true;

  // 4. Create ballistic profile + click table (only for 6.5x55 + Busk)
  if (caliberType === '6.5x55' && sightChoice && sightChoice !== 'annet_sikte') {
    const defaults = DFS_STANDARD_PROFILES['6.5x55'];
    const maxDistance = Math.max(...baneDistances, 300);

    const profileData = {
      user_id: userId,
      weapon_id: weapon.id,
      barrel_id: barrel.id,
      name: `DFS Startprofil - ${weaponName}`,
      bullet_name: defaults.bullet_name,
      ballistic_coefficient: defaults.ballistic_coefficient,
      muzzle_velocity: defaults.muzzle_velocity,
      zero_distance_m: 100,
      min_distance_m: 100,
      max_distance_m: maxDistance,
      distance_interval_m: 25,
      temperature_c: 15,
      humidity_percent: 50,
      pressure_mm: 760,
      altitude_m: 0,
      sight_type: sightChoice,
      sight_height_mm: defaults.sight_height_mm,
      sight_radius_cm: defaults.sight_radius_cm,
      front_sight_height_mm: null,
    };

    const { data: profile, error: profileErr } = await supabase
      .from('ballistic_profiles')
      .insert(profileData)
      .select()
      .single();

    if (!profileErr && profile) {
      result.profile = true;
      createdProfileId = profile.id;

      // Generate tables using the ballistic engine
      const ballisticProfile: BallisticProfile = {
        ...profileData,
        id: profile.id,
        ammo_profile_id: null,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        front_sight_height_mm: null,
      };

      const distanceTable = generateDistanceTable(ballisticProfile);
      const clickTable = generateClickTable(ballisticProfile, distanceTable);
      const windTable = calculateWindTable(ballisticProfile);

      // Save generated tables
      await Promise.all([
        supabase.from('ballistic_distance_table').insert(
          distanceTable.map(row => ({
            profile_id: profile.id,
            distance_m: row.distance_m,
            click_value: row.click_value,
            bullet_drop_mm: row.bullet_drop_mm,
          }))
        ),
        supabase.from('ballistic_click_table').insert(
          clickTable.map(row => ({
            profile_id: profile.id,
            click: row.click,
            distance_m: row.distance_m,
          }))
        ),
        supabase.from('ballistic_wind_table').insert(
          windTable.map(row => ({
            profile_id: profile.id,
            distance_m: row.distance_m,
            wind_speed: row.wind_speed,
            wind_clicks: row.wind_clicks,
          }))
        ),
      ]);

      // 5. Create a user-facing click table from the distance table
      const { data: ctData, error: ctErr } = await supabase
        .from('click_tables')
        .insert({
          user_id: userId,
          name: `Starttabell - ${weaponName}`,
          caliber,
          ammo_type: defaults.bullet_name,
          muzzle_velocity: defaults.muzzle_velocity,
          zero_distance: 100,
          sight_info: sightChoice === 'busk_standard' ? 'Busk Standard (grovknepp)' : 'Busk Finknepp',
          weapon_id: weapon.id,
          barrel_id: barrel.id,
          ballistic_profile_id: profile.id,
          is_active: true,
        })
        .select()
        .single();

      if (!ctErr && ctData) {
        // Insert rows from the distance table
        const rows = distanceTable
          .filter(r => r.distance_m >= 100)
          .map(r => ({
            click_table_id: ctData.id,
            distance_m: r.distance_m,
            clicks_up: Math.round(r.click_value),
          }));

        if (rows.length > 0) {
          await supabase.from('click_table_rows').insert(rows);
        }
        result.clickTable = true;
        createdClickTableId = ctData.id;
      }
    }
  }

  // Upsert user_active_setup with the created resources
  if (result.weapon && result.barrel) {
    await createOrUpdateActiveSetup(userId, {
      weapon_id: weapon.id,
      barrel_id: barrel.id,
      click_table_id: createdClickTableId,
      ballistic_profile_id: createdProfileId,
      mode: 'general',
    });
  }

  return result;
}
