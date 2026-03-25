/**
 * Field Assistant Service
 *
 * Provides functionality for field figure selection, shot recommendations,
 * and shot logging for training and competition.
 */

import { supabase } from './supabase';
import { FieldFigure, FieldFigureCategory, ShotLog, BallisticProfile, ClickTable, ClickTableRow } from '../types/database';
import { generateDistanceTable, getClickRecommendation, calculateWindTable, getWindClickRecommendation } from './ballistics';
import { dfsWindFloor } from './ballistics-dfs';
import { resolveClickSource, getElevationFromResolver, getWindFromResolver } from './click-table-resolver';

/**
 * Convert wind angle in degrees to effective crosswind component
 *
 * @param wind_speed_ms - Wind speed in m/s
 * @param wind_angle_deg - Wind angle in degrees (0=from behind, 90=from right, 180=from front, 270=from left)
 * @returns Effective crosswind speed in m/s (always positive, represents perpendicular component)
 */
function calculateEffectiveCrosswind(wind_speed_ms: number, wind_angle_deg: number): number {
  const angle_rad = (wind_angle_deg * Math.PI) / 180;
  return Math.abs(wind_speed_ms * Math.sin(angle_rad));
}

export interface ShotRecommendation {
  distance_m: number;
  figure: FieldFigure;
  profile?: BallisticProfile;
  click_table?: ClickTable;
  elevation_clicks: number;
  elevation_type: 'exact' | 'nearest' | 'interpolated' | 'reference' | 'calculated';
  wind_clicks?: number;
  wind_speed_ms?: number;
  wind_direction?: string;
  notes: string[];
  source: 'ballistic_profile' | 'click_table';
  resolved_source?: string;
  resolved_source_name?: string;
}

export interface ShotLogInput {
  ballistic_profile_id: string | null;
  field_figure_id: string | null;
  competition_id?: string | null;
  training_entry_id?: string | null;
  distance_m: number;
  recommended_clicks: number;
  actual_clicks: number;
  wind_direction?: string | null;
  wind_speed_ms?: number | null;
  recommended_wind_clicks?: number | null;
  actual_wind_clicks?: number | null;
  result: 'hit' | 'miss' | 'near_miss';
  impact_offset_x_mm?: number | null;
  impact_offset_y_mm?: number | null;
  temperature_c?: number | null;
  light_conditions?: string | null;
  notes?: string | null;
  tags?: string[] | null;
}

/**
 * Fetch all active field figure categories
 */
export async function getFieldFigureCategories(): Promise<FieldFigureCategory[]> {
  const { data, error } = await supabase
    .from('field_figure_categories')
    .select('*')
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Fetch active field figures, optionally filtered by category
 */
export async function getFieldFigures(categoryId?: string): Promise<FieldFigure[]> {
  let query = supabase
    .from('field_figures')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific field figure by ID
 */
export async function getFieldFigure(id: string): Promise<FieldFigure | null> {
  const { data, error } = await supabase
    .from('field_figures')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get click table rows for a specific click table
 */
export async function getClickTableRows(clickTableId: string): Promise<ClickTableRow[]> {
  const { data, error } = await supabase
    .from('click_table_rows')
    .select('*')
    .eq('click_table_id', clickTableId)
    .order('distance_m');

  if (error) throw error;
  return data || [];
}

/**
 * Get click recommendation from click table
 */
function getClickFromTable(distance_m: number, rows: ClickTableRow[]): { clicks: number; type: 'exact' | 'nearest' | 'interpolated' } {
  const exact = rows.find(r => r.distance_m === distance_m);
  if (exact) {
    return { clicks: exact.clicks, type: 'exact' };
  }

  const sorted = [...rows].sort((a, b) => a.distance_m - b.distance_m);

  const lower = sorted.filter(r => r.distance_m < distance_m).pop();
  const upper = sorted.find(r => r.distance_m > distance_m);

  if (lower && upper) {
    const ratio = (distance_m - lower.distance_m) / (upper.distance_m - lower.distance_m);
    const clicks = Math.round(lower.clicks + ratio * (upper.clicks - lower.clicks));
    return { clicks, type: 'interpolated' };
  }

  if (lower) {
    return { clicks: lower.clicks, type: 'nearest' };
  }

  if (upper) {
    return { clicks: upper.clicks, type: 'nearest' };
  }

  return { clicks: 0, type: 'nearest' };
}

/**
 * Get click recommendation from reference-type click table
 */
function getClickFromReference(
  distance_m: number,
  clickTable: ClickTable
): { clicks: number; type: 'reference' } {
  if (!clickTable.reference_distance_m || clickTable.reference_clicks === null) {
    return { clicks: 0, type: 'reference' };
  }

  const distanceDiff = distance_m - clickTable.zero_distance;
  const referenceDiff = clickTable.reference_distance_m - clickTable.zero_distance;

  if (referenceDiff === 0) {
    return { clicks: 0, type: 'reference' };
  }

  const ratio = distanceDiff / referenceDiff;
  const clicks = Math.round(ratio * clickTable.reference_clicks);

  return { clicks, type: 'reference' };
}

/**
 * Calculate shot recommendation using click table
 */
export async function calculateShotRecommendationFromClickTable(
  distance_m: number,
  figure: FieldFigure,
  clickTable: ClickTable,
  wind_speed_ms?: number,
  wind_direction?: string
): Promise<ShotRecommendation> {
  const notes: string[] = [];

  let elevation_clicks = 0;
  let elevation_type: 'exact' | 'nearest' | 'interpolated' | 'reference' = 'nearest';

  if (clickTable.table_type === 'reference') {
    const result = getClickFromReference(distance_m, clickTable);
    elevation_clicks = result.clicks;
    elevation_type = result.type;
    notes.push(`Beregnet fra referansepunkt: ${clickTable.reference_clicks} knepp @ ${clickTable.reference_distance_m}m`);
  } else {
    const rows = await getClickTableRows(clickTable.id);
    const result = getClickFromTable(distance_m, rows);
    elevation_clicks = result.clicks;
    elevation_type = result.type;

    if (result.type === 'interpolated') {
      notes.push('Interpolert mellom tabellverdier');
    } else if (result.type === 'nearest') {
      notes.push('Bruker nærmeste tabellverdi');
    }
  }

  const recommendation: ShotRecommendation = {
    distance_m,
    figure,
    click_table: clickTable,
    elevation_clicks,
    elevation_type,
    notes,
    source: 'click_table'
  };

  if (wind_speed_ms && wind_speed_ms > 0 && wind_direction) {
    const wind_angle_deg = parseFloat(wind_direction);
    const effective_crosswind = calculateEffectiveCrosswind(wind_speed_ms, wind_angle_deg);

    console.log('=== WIND CALCULATION DEBUG (Click Table) ===');
    console.log('Input wind_speed_ms:', wind_speed_ms);
    console.log('Input wind_angle_deg:', wind_angle_deg);
    console.log('Calculated effective_crosswind (m/s):', effective_crosswind);
    console.log('Distance (m):', distance_m);
    console.log('clickTable.wind_clicks_per_10ms_100m:', clickTable.wind_clicks_per_10ms_100m);

    // DFS-calibrated wind correction formula
    // Formula: (crosswind_ms / 10) * wind_clicks_per_10ms_100m * (distance_m / 100)
    // Example: 10 m/s at 250m with 4.4 clicks/10ms/100m
    //   = (10 / 10) * 4.4 * (250 / 100) = 1.0 * 4.4 * 2.5 = 11 clicks
    const windClicksPer10ms = clickTable.wind_clicks_per_10ms_100m * (distance_m / 100);

    console.log('windClicksPer10ms at distance (clicks per 10 m/s):', windClicksPer10ms);
    console.log('effective_crosswind / 10 (factor):', effective_crosswind / 10);
    console.log('Calculation: round((' + effective_crosswind + ' / 10) * ' + windClicksPer10ms + ')');

    const wind_clicks = dfsWindFloor((effective_crosswind / 10) * windClicksPer10ms);

    console.log('FINAL wind_clicks:', wind_clicks);
    console.log('=== END WIND CALCULATION DEBUG ===');

    recommendation.wind_clicks = wind_clicks;
    recommendation.wind_speed_ms = wind_speed_ms;
    recommendation.wind_direction = wind_direction;

    if (wind_clicks > 3) {
      notes.push(`Betydelig vindkorreksjon nødvendig (${wind_clicks} knepp)`);
    }

    notes.push(`Effektiv kryssvind: ${effective_crosswind.toFixed(1)} m/s (${wind_angle_deg}°)`);
  }

  return recommendation;
}

/**
 * Calculate shot recommendation for a given distance, figure, and profile
 */
export async function calculateShotRecommendation(
  distance_m: number,
  figure: FieldFigure,
  profile: BallisticProfile,
  wind_speed_ms?: number,
  wind_direction?: string
): Promise<ShotRecommendation> {
  const distanceTable = generateDistanceTable(profile);
  const elevationRec = getClickRecommendation(distance_m, distanceTable);

  const notes: string[] = [];

  const recommendation: ShotRecommendation = {
    distance_m,
    figure,
    profile,
    elevation_clicks: elevationRec.clicks,
    elevation_type: elevationRec.type,
    notes,
    source: 'ballistic_profile'
  };

  if (wind_speed_ms && wind_speed_ms > 0 && wind_direction) {
    const wind_angle_deg = parseFloat(wind_direction);
    const effective_crosswind = calculateEffectiveCrosswind(wind_speed_ms, wind_angle_deg);

    const windTable = calculateWindTable(profile);
    const windRec = getWindClickRecommendation(distance_m, effective_crosswind, windTable);

    recommendation.wind_clicks = windRec.clicks;
    recommendation.wind_speed_ms = wind_speed_ms;
    recommendation.wind_direction = wind_direction;

    if (windRec.clicks > 3) {
      notes.push(`Betydelig vindkorreksjon nødvendig (${windRec.clicks} knepp)`);
    }

    notes.push(`Effektiv kryssvind: ${effective_crosswind.toFixed(1)} m/s (${wind_angle_deg}°)`);
  }

  return recommendation;
}

/**
 * Log a shot result
 */
export async function logShot(
  userId: string,
  shotData: ShotLogInput
): Promise<ShotLog> {
  const { data, error } = await supabase
    .from('shot_logs')
    .insert({
      user_id: userId,
      ...shotData,
      shot_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's recent shot logs
 */
export async function getRecentShotLogs(
  userId: string,
  limit: number = 50
): Promise<ShotLog[]> {
  const { data, error } = await supabase
    .from('shot_logs')
    .select('*')
    .eq('user_id', userId)
    .order('shot_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get shot logs for a specific ballistic profile
 */
export async function getShotLogsByProfile(
  userId: string,
  profileId: string,
  limit: number = 100
): Promise<ShotLog[]> {
  const { data, error } = await supabase
    .from('shot_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('ballistic_profile_id', profileId)
    .order('shot_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Calculate accuracy statistics from shot logs
 */
export interface AccuracyStats {
  total_shots: number;
  hits: number;
  misses: number;
  near_misses: number;
  hit_rate: number;
  avg_click_difference: number;
  distances: {
    [distance: number]: {
      shots: number;
      hits: number;
      hit_rate: number;
    };
  };
}

export async function calculateAccuracyStats(
  userId: string,
  profileId?: string
): Promise<AccuracyStats> {
  let query = supabase
    .from('shot_logs')
    .select('*')
    .eq('user_id', userId);

  if (profileId) {
    query = query.eq('ballistic_profile_id', profileId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const logs = data || [];
  const hits = logs.filter(l => l.result === 'hit').length;
  const near_misses = logs.filter(l => l.result === 'near_miss').length;
  const misses = logs.filter(l => l.result === 'miss').length;

  // Calculate average click difference
  const click_diffs = logs.map(l => Math.abs(l.actual_clicks - l.recommended_clicks));
  const avg_click_difference = click_diffs.length > 0
    ? click_diffs.reduce((a, b) => a + b, 0) / click_diffs.length
    : 0;

  // Group by distance
  const distanceGroups: { [key: number]: ShotLog[] } = {};
  logs.forEach(log => {
    if (!distanceGroups[log.distance_m]) {
      distanceGroups[log.distance_m] = [];
    }
    distanceGroups[log.distance_m].push(log);
  });

  const distances: AccuracyStats['distances'] = {};
  Object.keys(distanceGroups).forEach(distKey => {
    const dist = parseInt(distKey);
    const distLogs = distanceGroups[dist];
    const distHits = distLogs.filter(l => l.result === 'hit').length;

    distances[dist] = {
      shots: distLogs.length,
      hits: distHits,
      hit_rate: distLogs.length > 0 ? (distHits / distLogs.length) * 100 : 0
    };
  });

  return {
    total_shots: logs.length,
    hits,
    misses,
    near_misses,
    hit_rate: logs.length > 0 ? (hits / logs.length) * 100 : 0,
    avg_click_difference,
    distances
  };
}

export { calculateEffectiveCrosswind };

export async function calculateShotRecommendationResolved(
  userId: string,
  distance_m: number,
  figure: FieldFigure,
  wind_speed_ms?: number,
  wind_direction?: string
): Promise<ShotRecommendation | null> {
  const resolved = await resolveClickSource(userId);
  if (!resolved) return null;

  const elevation = await getElevationFromResolver(distance_m, resolved);

  const notes: string[] = [];
  const recommendation: ShotRecommendation = {
    distance_m,
    figure,
    elevation_clicks: elevation.clicks,
    elevation_type: elevation.type,
    notes,
    source: resolved.clickTableId ? 'click_table' : 'ballistic_profile',
    resolved_source: resolved.source,
    resolved_source_name: resolved.sourceName,
  };

  if (resolved.clickTableId) {
    const { data: ct } = await supabase
      .from('click_tables')
      .select('*')
      .eq('id', resolved.clickTableId)
      .maybeSingle();
    if (ct) recommendation.click_table = ct;
  }

  if (resolved.ballisticProfileId) {
    const { data: bp } = await supabase
      .from('ballistic_profiles')
      .select('*')
      .eq('id', resolved.ballisticProfileId)
      .maybeSingle();
    if (bp) recommendation.profile = bp;
  }

  if (elevation.type === 'interpolated') {
    notes.push('Interpolert mellom tabellverdier');
  } else if (elevation.type === 'nearest') {
    notes.push('Bruker nærmeste tabellverdi');
  }

  if (wind_speed_ms && wind_speed_ms > 0 && wind_direction) {
    const wind_angle_deg = parseFloat(wind_direction);
    const effective_crosswind = calculateEffectiveCrosswind(wind_speed_ms, wind_angle_deg);

    const windResult = await getWindFromResolver(distance_m, effective_crosswind, resolved);
    recommendation.wind_clicks = windResult.clicks;
    recommendation.wind_speed_ms = wind_speed_ms;
    recommendation.wind_direction = wind_direction;

    if (windResult.clicks > 3) {
      notes.push(`Betydelig vindkorreksjon nødvendig (${windResult.clicks} knepp)`);
    }

    notes.push(`Effektiv kryssvind: ${effective_crosswind.toFixed(1)} m/s (${wind_angle_deg}\u00B0)`);
  }

  return recommendation;
}
