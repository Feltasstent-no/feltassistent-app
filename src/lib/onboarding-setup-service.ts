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
  fieldType?: 'grovfelt' | 'finfelt';
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

const DIAMOND_LINE_GROVKNEPP_TABLE: { distance_m: number; clicks: number }[] = [
  { distance_m: 100, clicks: -13 },
  { distance_m: 125, clicks: -12 },
  { distance_m: 150, clicks: -11 },
  { distance_m: 175, clicks: -9 },
  { distance_m: 200, clicks: -7 },
  { distance_m: 225, clicks: -6 },
  { distance_m: 250, clicks: -4 },
  { distance_m: 275, clicks: -2 },
  { distance_m: 300, clicks: 0 },
  { distance_m: 325, clicks: 2 },
  { distance_m: 350, clicks: 4 },
  { distance_m: 375, clicks: 6 },
  { distance_m: 400, clicks: 9 },
  { distance_m: 425, clicks: 11 },
  { distance_m: 450, clicks: 13 },
  { distance_m: 475, clicks: 16 },
  { distance_m: 500, clicks: 18 },
  { distance_m: 525, clicks: 21 },
  { distance_m: 550, clicks: 23 },
  { distance_m: 575, clicks: 25 },
  { distance_m: 600, clicks: 29 },
];

const DIAMOND_LINE_FINKNEPP_TABLE: { distance_m: number; clicks: number }[] = [
  { distance_m: 100, clicks: -26 },
  { distance_m: 125, clicks: -24 },
  { distance_m: 150, clicks: -22 },
  { distance_m: 175, clicks: -18 },
  { distance_m: 200, clicks: -14 },
  { distance_m: 225, clicks: -12 },
  { distance_m: 250, clicks: -8 },
  { distance_m: 275, clicks: -4 },
  { distance_m: 300, clicks: 0 },
  { distance_m: 325, clicks: 4 },
  { distance_m: 350, clicks: 8 },
  { distance_m: 375, clicks: 12 },
  { distance_m: 400, clicks: 18 },
  { distance_m: 425, clicks: 22 },
  { distance_m: 450, clicks: 26 },
  { distance_m: 475, clicks: 32 },
  { distance_m: 500, clicks: 36 },
  { distance_m: 525, clicks: 42 },
  { distance_m: 550, clicks: 46 },
  { distance_m: 575, clicks: 50 },
  { distance_m: 600, clicks: 58 },
];

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
  const { userId, weaponName, caliberType, sightChoice, baneDistances, fieldType } = params;
  const result: SetupResult = { weapon: false, barrel: false, ammo: false, profile: false, clickTable: false };
  let createdProfileId: string | null = null;
  let createdClickTableId: string | null = null;

  const caliber = getCaliberString(caliberType);

  // 1. Create weapon
  const { data: weapon, error: weaponErr } = await supabase
    .from('weapons')
    .insert({
      user_id: userId,
      weapon_number: '1',
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
      barrel_number: '1',
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
    const maxDistance = fieldType === 'grovfelt'
      ? Math.max(...baneDistances, 600)
      : Math.max(...baneDistances, 300);

    const profileData = {
      user_id: userId,
      weapon_id: weapon.id,
      barrel_id: barrel.id,
      name: `DFS Startprofil - ${weaponName}`,
      bullet_name: defaults.bullet_name,
      ballistic_coefficient: defaults.ballistic_coefficient,
      muzzle_velocity: defaults.muzzle_velocity,
      zero_distance_m: 300,
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
          name: sightChoice === 'busk_finknepp'
            ? `Diamond Line Felt 900 m/s - Finknepp - ${weaponName}`
            : `Diamond Line Felt 900 m/s - ${weaponName}`,
          caliber,
          ammo_type: defaults.bullet_name,
          muzzle_velocity: defaults.muzzle_velocity,
          zero_distance: 300,
          sight_info: sightChoice === 'busk_standard' ? 'Busk Standard (grovknepp)' : 'Busk Finknepp',
          weapon_id: weapon.id,
          barrel_id: barrel.id,
          ballistic_profile_id: profile.id,
          source_type: 'onboarding_reference',
          is_active: true,
        })
        .select()
        .single();

      if (!ctErr && ctData) {
        const refTable = sightChoice === 'busk_finknepp'
          ? DIAMOND_LINE_FINKNEPP_TABLE
          : DIAMOND_LINE_GROVKNEPP_TABLE;
        const rows = refTable.map(r => ({
          click_table_id: ctData.id,
          distance_m: r.distance_m,
          clicks: r.clicks,
        }));

        if (rows.length > 0) {
          const { error: rowsErr } = await supabase.from('click_table_rows').insert(rows);
          if (!rowsErr) {
            result.clickTable = true;
            createdClickTableId = ctData.id;
          } else {
            console.error('[Onboarding] click_table_rows insert failed:', rowsErr);
          }
        }
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
