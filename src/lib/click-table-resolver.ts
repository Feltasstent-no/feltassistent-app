import { supabase } from './supabase';
import type { ClickTableRow } from '../types/database';
import { generateDistanceTable, calculateWindTable, getClickRecommendation, getWindClickRecommendation } from './ballistics';

export type ResolvedSource =
  | 'active_click_table'
  | 'generated_from_profile'
  | 'direct_calculation';

export const SOURCE_LABELS: Record<ResolvedSource, string> = {
  active_click_table: 'Aktiv knepptabell',
  generated_from_profile: 'Generert fra ballistisk profil',
  direct_calculation: 'Direkte beregning (fallback)',
};

export interface ResolvedClickData {
  source: ResolvedSource;
  sourceName: string;
  clickTableId: string | null;
  clickTableName: string | null;
  ballisticProfileId: string | null;
  ballisticProfileName: string | null;
  zeroDistance: number;
}

export interface ElevationResult {
  clicks: number;
  type: 'exact' | 'nearest' | 'interpolated' | 'calculated';
  source: ResolvedSource;
  sourceName: string;
}

export interface WindResult {
  clicks: number;
  source: ResolvedSource;
  sourceName: string;
}

async function fetchClickTableRows(clickTableId: string): Promise<ClickTableRow[]> {
  const { data, error } = await supabase
    .from('click_table_rows')
    .select('*')
    .eq('click_table_id', clickTableId)
    .order('distance_m');

  if (error) throw error;
  return data || [];
}

function interpolateFromRows(
  distance_m: number,
  rows: ClickTableRow[]
): { clicks: number; type: 'exact' | 'nearest' | 'interpolated' } {
  const exact = rows.find(r => r.distance_m === distance_m);
  if (exact) return { clicks: exact.clicks, type: 'exact' };

  const sorted = [...rows].sort((a, b) => a.distance_m - b.distance_m);
  const lower = sorted.filter(r => r.distance_m < distance_m).pop();
  const upper = sorted.find(r => r.distance_m > distance_m);

  if (lower && upper) {
    const ratio = (distance_m - lower.distance_m) / (upper.distance_m - lower.distance_m);
    return {
      clicks: Math.round(lower.clicks + ratio * (upper.clicks - lower.clicks)),
      type: 'interpolated',
    };
  }

  if (lower) return { clicks: lower.clicks, type: 'nearest' };
  if (upper) return { clicks: upper.clicks, type: 'nearest' };
  return { clicks: 0, type: 'nearest' };
}

export async function resolveClickSource(
  userId: string
): Promise<ResolvedClickData | null> {
  const { data: setup } = await supabase
    .from('user_active_setup')
    .select(`
      click_table_id,
      ballistic_profile_id,
      click_table:click_tables(id, name, zero_distance, ballistic_profile_id),
      ballistic_profile:ballistic_profiles(id, name, zero_distance_m)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (!setup) return null;

  const ct = Array.isArray(setup.click_table) ? setup.click_table[0] : setup.click_table;
  const bp = Array.isArray(setup.ballistic_profile) ? setup.ballistic_profile[0] : setup.ballistic_profile;

  if (ct) {
    const source: ResolvedSource = ct.ballistic_profile_id
      ? 'generated_from_profile'
      : 'active_click_table';

    return {
      source,
      sourceName: SOURCE_LABELS[source],
      clickTableId: ct.id,
      clickTableName: ct.name,
      ballisticProfileId: ct.ballistic_profile_id || null,
      ballisticProfileName: null,
      zeroDistance: ct.zero_distance,
    };
  }

  if (bp) {
    const { data: generatedTable } = await supabase
      .from('click_tables')
      .select('id, name, zero_distance')
      .eq('ballistic_profile_id', bp.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (generatedTable) {
      return {
        source: 'generated_from_profile',
        sourceName: SOURCE_LABELS['generated_from_profile'],
        clickTableId: generatedTable.id,
        clickTableName: generatedTable.name,
        ballisticProfileId: bp.id,
        ballisticProfileName: bp.name,
        zeroDistance: generatedTable.zero_distance,
      };
    }

    return {
      source: 'direct_calculation',
      sourceName: SOURCE_LABELS['direct_calculation'],
      clickTableId: null,
      clickTableName: null,
      ballisticProfileId: bp.id,
      ballisticProfileName: bp.name,
      zeroDistance: bp.zero_distance_m,
    };
  }

  return null;
}

export async function getElevationFromResolver(
  distance_m: number,
  resolved: ResolvedClickData
): Promise<ElevationResult> {
  if (resolved.clickTableId) {
    const rows = await fetchClickTableRows(resolved.clickTableId);
    const result = interpolateFromRows(distance_m, rows);
    return {
      clicks: result.clicks,
      type: result.type,
      source: resolved.source,
      sourceName: resolved.sourceName,
    };
  }

  if (resolved.ballisticProfileId) {
    const { data: profile } = await supabase
      .from('ballistic_profiles')
      .select('*')
      .eq('id', resolved.ballisticProfileId)
      .maybeSingle();

    if (profile) {
      const distTable = generateDistanceTable(profile);
      const rec = getClickRecommendation(distance_m, distTable);
      return {
        clicks: rec.clicks,
        type: 'calculated',
        source: 'direct_calculation',
        sourceName: SOURCE_LABELS['direct_calculation'],
      };
    }
  }

  return {
    clicks: 0,
    type: 'nearest',
    source: 'direct_calculation',
    sourceName: SOURCE_LABELS['direct_calculation'],
  };
}

export async function getWindFromResolver(
  distance_m: number,
  effectiveCrosswind_ms: number,
  resolved: ResolvedClickData
): Promise<WindResult> {
  if (resolved.clickTableId) {
    const { data: ct } = await supabase
      .from('click_tables')
      .select('wind_clicks_per_10ms_100m')
      .eq('id', resolved.clickTableId)
      .maybeSingle();

    if (ct && ct.wind_clicks_per_10ms_100m > 0) {
      const windClicksPer10ms = ct.wind_clicks_per_10ms_100m * (distance_m / 100);
      return {
        clicks: Math.round((effectiveCrosswind_ms / 10) * windClicksPer10ms),
        source: resolved.source,
        sourceName: resolved.sourceName,
      };
    }
  }

  if (resolved.ballisticProfileId) {
    const { data: profile } = await supabase
      .from('ballistic_profiles')
      .select('*')
      .eq('id', resolved.ballisticProfileId)
      .maybeSingle();

    if (profile) {
      const windTable = calculateWindTable(profile);
      const rec = getWindClickRecommendation(distance_m, effectiveCrosswind_ms, windTable);
      return {
        clicks: rec.clicks,
        source: resolved.source === 'active_click_table' ? resolved.source : 'direct_calculation',
        sourceName: resolved.source === 'active_click_table' ? resolved.sourceName : SOURCE_LABELS['direct_calculation'],
      };
    }
  }

  return {
    clicks: 0,
    source: 'direct_calculation',
    sourceName: SOURCE_LABELS['direct_calculation'],
  };
}

export async function getElevationForClickTable(
  clickTableId: string,
  distance_m: number
): Promise<number> {
  const rows = await fetchClickTableRows(clickTableId);
  const result = interpolateFromRows(distance_m, rows);
  return result.clicks;
}

export async function getWindForClickTable(
  clickTableId: string,
  distance_m: number,
  effectiveCrosswind_ms: number
): Promise<number> {
  const { data: ct } = await supabase
    .from('click_tables')
    .select('wind_clicks_per_10ms_100m')
    .eq('id', clickTableId)
    .maybeSingle();

  if (!ct || !ct.wind_clicks_per_10ms_100m || ct.wind_clicks_per_10ms_100m <= 0) {
    return 0;
  }

  const windClicksPer10ms = ct.wind_clicks_per_10ms_100m * (distance_m / 100);
  return Math.round((effectiveCrosswind_ms / 10) * windClicksPer10ms);
}
