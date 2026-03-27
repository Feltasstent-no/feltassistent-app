export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  dfs_shooter_id: string | null;
  club_name: string | null;
  shooter_class: string | null;
  shooter_class_id: string | null;
  birth_year: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserActiveSetup {
  user_id: string;
  weapon_id: string | null;
  barrel_id: string | null;
  click_table_id: string | null;
  ballistic_profile_id: string | null;
  discipline_id: string | null;
  mode: string;
  updated_at: string;
  created_at: string;
}

export interface ShooterClass {
  id: string;
  code: string;
  name: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Discipline {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface TrainingProgram {
  id: string;
  discipline_id: string | null;
  class_code: string | null;
  name: string;
  description: string | null;
  default_shots: number | null;
  default_time_seconds: number | null;
  rule_version: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TrainingEntry {
  id: string;
  user_id: string;
  entry_date: string;
  discipline_id: string | null;
  program_id: string | null;
  total_shots: number;
  notes: string | null;
  total_time_seconds: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingShot {
  id: string;
  training_entry_id: string;
  shot_number: number;
  score: number | null;
  time_seconds: number | null;
  distance: number | null;
  position: string | null;
  notes: string | null;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  name: string;
  duration_seconds: number;
  description: string | null;
  color: string | null;
  is_timed: boolean;
  is_shooting: boolean;
  created_at: string;
}

export interface Competition {
  id: string;
  user_id: string;
  name: string;
  competition_type: 'bane' | 'grovfelt' | 'finfelt';
  discipline_id: string | null;
  shooter_class: string | null;
  location: string | null;
  competition_date: string;
  notes: string | null;
  total_stages: number;
  total_shots: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitionStage {
  id: string;
  competition_id: string;
  stage_number: number;
  name: string | null;
  description: string | null;
  total_shots: number;
  time_limit_seconds: number | null;
  field_figure_id: string | null;
  distance_m: number | null;
  clicks: number | null;
  clicks_to_zero: number | null;
  created_at: string;
}

export interface CompetitionEntry {
  id: string;
  competition_id: string;
  user_id: string;
  weapon_id: string | null;
  click_table_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  current_stage_number: number;
  current_stage_state: string;
  current_hold_started_at: string | null;
  status: string;
  total_score: number | null;
  total_inner_hits: number | null;
  total_hits: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionStageImage {
  id: string;
  stage_log_id: string | null;
  entry_id: string | null;
  stage_number: number | null;
  user_id: string;
  storage_path: string | null;
  image_url: string | null;
  caption: string | null;
  notes: string | null;
  uploaded_at: string | null;
  created_at: string;
}

export interface StageLog {
  id: string;
  user_id: string;
  stage_id: string;
  competition_id: string;
  hits: number;
  shots_fired: number;
  time_seconds: number | null;
  points: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  wind_direction: string | null;
  wind_speed_ms: number | null;
  recommended_elevation_clicks: number | null;
  actual_elevation_clicks: number | null;
  recommended_wind_clicks: number | null;
  actual_wind_clicks: number | null;
  created_at: string;
  updated_at: string;
}

export interface FieldFigure {
  id: string;
  code: string;
  name: string;
  description: string | null;
  svg_data: string | null;
  svg_content: string | null;
  image_url: string | null;
  file_type: string | null;
  category: string | null;
  category_id: string | null;
  difficulty: number | null;
  distance_m: number;
  normal_distance: number | null;
  max_distance: number | null;
  normal_distance_m: number | null;
  max_distance_m: number | null;
  ag3_hk416_max_distance_m: number | null;
  short_code: string | null;
  width_mm: number | null;
  height_mm: number | null;
  shape_type: string | null;
  aim_points: unknown[] | null;
  usage_notes: string | null;
  notes: string | null;
  order_index: number | null;
  sort_order: number;
  is_active: boolean;
  is_standard: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldFigureCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface ShotLog {
  id: string;
  user_id: string;
  ballistic_profile_id: string | null;
  field_figure_id: string | null;
  competition_id: string | null;
  training_entry_id: string | null;
  distance_m: number;
  recommended_clicks: number;
  actual_clicks: number;
  wind_direction: string | null;
  wind_speed_ms: number | null;
  recommended_wind_clicks: number | null;
  actual_wind_clicks: number | null;
  result: string;
  impact_offset_x_mm: number | null;
  impact_offset_y_mm: number | null;
  temperature_c: number | null;
  light_conditions: string | null;
  notes: string | null;
  tags: string[] | null;
  weapon_id: string | null;
  barrel_id: string | null;
  shot_at: string;
  created_at: string;
}

export interface Rifle {
  id: string;
  user_id: string;
  name: string;
  caliber: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  description: string | null;
  discipline_id: string | null;
  shooter_class: string | null;
  default_stage_count: number;
  default_total_shots: number;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClickTable {
  id: string;
  user_id: string;
  name: string;
  weapon_id: string | null;
  barrel_id: string | null;
  discipline_id: string | null;
  zero_distance: number;
  click_value_cm_100m: number;
  wind_clicks_per_10ms_100m: number;
  notes: string | null;
  ballistic_profile_id: string | null;
  table_type: string;
  reference_distance_m: number | null;
  reference_clicks: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClickTableRow {
  id: string;
  click_table_id: string;
  distance_m: number;
  clicks: number;
  notes: string | null;
  created_at: string;
}

export interface AmmoProfile {
  id: string;
  name: string;
  caliber: string;
  manufacturer: string | null;
  bullet_weight_gr: number;
  ballistic_coefficient_g1: number;
  default_muzzle_velocity: number;
  is_active: boolean;
  created_at: string;
}

export interface BallisticProfile {
  id: string;
  user_id: string;
  name: string;
  weapon_id: string | null;
  barrel_id: string | null;
  ammo_profile_id: string | null;
  bullet_name: string | null;
  ballistic_coefficient: number;
  muzzle_velocity: number;
  zero_distance_m: number;
  min_distance_m: number;
  max_distance_m: number;
  distance_interval_m: number;
  temperature_c: number;
  humidity_percent: number;
  pressure_mm: number;
  altitude_m: number;
  sight_type: string;
  sight_height_mm: number;
  sight_radius_cm: number | null;
  front_sight_height_mm: number | null;
  created_at: string;
  updated_at: string;
}

export interface BallisticDistanceTable {
  id: string;
  ballistic_profile_id: string;
  distance_m: number;
  clicks: number;
  created_at: string;
}

export interface BallisticClickTable {
  id: string;
  ballistic_profile_id: string;
  distance_m: number;
  clicks: number;
  created_at: string;
}

export interface BallisticWindTable {
  id: string;
  ballistic_profile_id: string;
  distance_m: number;
  wind_speed_ms: number;
  wind_clicks: number;
  created_at: string;
}

export interface Weapon {
  id: string;
  user_id: string;
  weapon_name: string;
  type: string;
  caliber: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeaponBarrel {
  id: string;
  weapon_id: string;
  barrel_name: string;
  length_mm: number | null;
  twist_rate: string | null;
  profile: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  installation_date: string | null;
  total_rounds_fired: number;
  barrel_lifespan_profile_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchSession {
  id: string;
  user_id: string;
  name: string;
  discipline_id: string | null;
  click_table_id: string | null;
  total_holds: number;
  hold_duration_seconds: number;
  prep_duration_seconds: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchHold {
  id: string;
  match_session_id: string;
  hold_number: number;
  field_figure_id: string | null;
  distance_m: number | null;
  recommended_clicks: number | null;
  wind_direction: string | null;
  wind_speed_ms: number | null;
  recommended_wind_clicks: number | null;
  actual_elevation_clicks: number | null;
  actual_wind_clicks: number | null;
  shot_count: number;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface WeaponShotLog {
  id: string;
  weapon_id: string;
  barrel_id: string | null;
  user_id: string;
  shots_fired: number;
  match_session_id: string | null;
  competition_id: string | null;
  training_entry_id: string | null;
  shot_at: string;
  notes: string | null;
  created_at: string;
}

export interface BarrelLifespanProfile {
  id: string;
  name: string;
  caliber: string;
  description: string | null;
  estimated_lifespan_rounds: number;
  warning_threshold_rounds: number;
  created_at: string;
}

export interface AmmoInventory {
  id: string;
  user_id: string;
  weapon_id: string;
  barrel_id: string | null;
  name: string;
  usage_type: 'felt' | 'bane' | 'trening' | 'annet';
  caliber: string | null;
  ammo_name: string | null;
  bullet_weight_gr: number | null;
  stock_quantity: number;
  track_stock: boolean;
  auto_deduct_after_match: boolean;
  is_default_felt: boolean;
  is_default_bane: boolean;
  is_default_trening: boolean;
  is_current_active: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldClockPreset {
  id: string;
  name: string;
  discipline_code: string | null;
  class_code: string | null;
  prep_seconds: number;
  shoot_seconds: number;
  warning_seconds: number;
  cooldown_seconds: number;
  rule_reference: string | null;
  rule_version: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AmmoInventoryLog {
  id: string;
  ammo_inventory_id: string;
  user_id: string;
  quantity_change: number;
  reason: 'match' | 'manual' | 'purchase' | 'adjustment';
  match_session_id: string | null;
  notes: string | null;
  running_balance: number | null;
  created_at: string;
}
