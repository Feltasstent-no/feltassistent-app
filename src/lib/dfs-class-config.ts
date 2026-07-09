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

let cache: DfsClassConfig[] | null = null;

export async function getAllDfsClassConfigs(): Promise<DfsClassConfig[]> {
  if (cache) return cache;
  const { data } = await supabase
    .from('dfs_class_configs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  cache = (data as DfsClassConfig[]) || [];
  return cache;
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
  cache = null;
}

// TODO: When creating new matches/competitions, store snapshot fields:
// - shooter_class_at_match
// - field_type_at_match
// - bane_distances_at_match
// - discipline_at_match
// This ensures historical data remains correct even if a user changes class later.
