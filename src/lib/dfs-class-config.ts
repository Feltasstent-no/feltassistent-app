import { supabase } from './supabase';

export interface DfsClassConfig {
  id: string;
  class_key: string;
  class_name: string;
  sort_order: number;
  field_type: 'finfelt' | 'grovfelt';
  bane_distances: number[];
  field_distance_min_m: number | null;
  field_distance_max_m: number | null;
  default_caliber: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShooterClassSetup {
  class_key: string;
  class_name: string;
  category: string | null;
  field_type: 'finfelt' | 'grovfelt';
  bane_distances: number[];
  field_distance_min_m: number | null;
  field_distance_max_m: number | null;
  default_caliber: string | null;
  description: string | null;
  is_active: boolean;
  shooter_class_id: string | null;
}

let configCache: DfsClassConfig[] | null = null;

export async function getAllDfsClassConfigs(): Promise<DfsClassConfig[]> {
  if (configCache) return configCache;
  const { data } = await supabase
    .from('dfs_class_configs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  configCache = (data as DfsClassConfig[]) || [];
  return configCache;
}

export async function getDfsClassConfig(classKey: string): Promise<DfsClassConfig | null> {
  const all = await getAllDfsClassConfigs();
  return all.find(c => c.class_key === classKey) || null;
}

export async function getDfsClassesByFieldType(fieldType: 'finfelt' | 'grovfelt'): Promise<DfsClassConfig[]> {
  const all = await getAllDfsClassConfigs();
  return all.filter(c => c.field_type === fieldType);
}

export function invalidateDfsClassCache(): void {
  configCache = null;
}

/**
 * Combines shooter_classes master data with dfs_class_configs configuration.
 * shooter_classes is the source of truth for class identity (name, category).
 * dfs_class_configs adds field_type, bane_distances, caliber, etc.
 */
export async function getShooterClassSetup(classKey: string): Promise<ShooterClassSetup | null> {
  const [scRes, dcRes] = await Promise.all([
    supabase
      .from('shooter_classes')
      .select('id, code, name, category')
      .eq('code', classKey)
      .maybeSingle(),
    supabase
      .from('dfs_class_configs')
      .select('*')
      .eq('class_key', classKey)
      .maybeSingle(),
  ]);

  const sc = scRes.data;
  const dc = dcRes.data as DfsClassConfig | null;

  if (!sc && !dc) return null;

  return {
    class_key: classKey,
    class_name: sc?.name || dc?.class_name || classKey,
    category: sc?.category || null,
    field_type: dc?.field_type || 'grovfelt',
    bane_distances: dc?.bane_distances || [],
    field_distance_min_m: dc?.field_distance_min_m || null,
    field_distance_max_m: dc?.field_distance_max_m || null,
    default_caliber: dc?.default_caliber || null,
    description: dc?.description || null,
    is_active: dc?.is_active ?? sc?.id != null,
    shooter_class_id: sc?.id || null,
  };
}

/**
 * Returns all class setups by joining shooter_classes with dfs_class_configs.
 */
export async function getAllShooterClassSetups(): Promise<ShooterClassSetup[]> {
  const [scRes, dcRes] = await Promise.all([
    supabase.from('shooter_classes').select('id, code, name, category').eq('is_active', true).order('sort_order'),
    supabase.from('dfs_class_configs').select('*').order('sort_order'),
  ]);

  const shooterClasses = scRes.data || [];
  const dfsConfigs = (dcRes.data as DfsClassConfig[]) || [];

  const dcMap = new Map(dfsConfigs.map(dc => [dc.class_key, dc]));

  return shooterClasses.map(sc => {
    const dc = dcMap.get(sc.code);
    return {
      class_key: sc.code,
      class_name: sc.name,
      category: sc.category,
      field_type: dc?.field_type || 'grovfelt',
      bane_distances: dc?.bane_distances || [],
      field_distance_min_m: dc?.field_distance_min_m || null,
      field_distance_max_m: dc?.field_distance_max_m || null,
      default_caliber: dc?.default_caliber || null,
      description: dc?.description || null,
      is_active: dc?.is_active ?? true,
      shooter_class_id: sc.id,
    };
  });
}

// TODO: When creating new matches/competitions, store snapshot fields:
// - shooter_class_at_match
// - field_type_at_match
// - bane_distances_at_match
// - discipline_at_match
// This ensures historical data remains correct even if a user changes class later.
