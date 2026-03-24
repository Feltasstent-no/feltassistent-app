/**
 * DFS Reference Tables
 *
 * Reference ballistic tables from DFS Kulebanegenerator.
 * Used for calibration testing and validation of the ballistic model.
 *
 * These are REAL reference data points from DFS screenshots.
 * They serve as test fixtures, NOT as production logic.
 *
 * Each profile includes:
 * - Ballistic parameters (BC, V0, bullet)
 * - Sight parameters (sight_type, hullavstand, kornhøyde)
 * - Environmental conditions
 * - Reference click-distance pairs from DFS
 */

export interface DFSReferencePoint {
  click: number;
  distance: number;
}

export interface DFSReferenceProfile {
  name: string;
  description: string;

  bullet_name: string;
  caliber: string;
  bullet_weight_gr: number;
  ballistic_coefficient: number;
  muzzle_velocity: number;

  sight_type: 'busk_standard' | 'busk_finknepp';
  sight_height_mm: number;
  sight_radius_cm: number;
  front_sight_height_mm: number;
  zero_distance_m: number;

  temperature_c: number;
  humidity_percent: number;
  pressure_mm: number;
  altitude_m: number;

  reference_points: DFSReferencePoint[];
}

/**
 * Norma Diamond Line 6.5 - 130 gr
 * Zero: 300m, Busk Standard
 * Source: DFS Screenshot 2026-03-16
 */
export const NORMA_DL_65_130_Z300_BUSK_STD: DFSReferenceProfile = {
  name: 'norma_dl_65_130_z300_busk_std',
  description: 'Norma Diamond Line 6.5 - 130 gr, Zero 300m, Busk Standard',

  bullet_name: 'Norma Diamond Line 6.5 - 130 gr',
  caliber: '6.5mm',
  bullet_weight_gr: 130,
  ballistic_coefficient: 0.549,
  muzzle_velocity: 900,

  sight_type: 'busk_standard',
  sight_height_mm: 34,
  sight_radius_cm: 90,
  front_sight_height_mm: 34,
  zero_distance_m: 300,

  temperature_c: 15,
  humidity_percent: 79,
  pressure_mm: 750,
  altitude_m: 100,

  reference_points: [
    { click: -13, distance: 106 },
    { click: -12, distance: 128 },
    { click: -11, distance: 146 },
    { click: -10, distance: 163 },
    { click: -9, distance: 179 },
    { click: -8, distance: 194 },
    { click: -7, distance: 208 },
    { click: -6, distance: 222 },
    { click: -5, distance: 236 },
    { click: -4, distance: 249 },
    { click: -3, distance: 262 },
    { click: -2, distance: 275 },
    { click: -1, distance: 288 },
    { click: 0, distance: 300 },
    { click: 1, distance: 312 },
    { click: 2, distance: 324 },
    { click: 3, distance: 336 },
    { click: 4, distance: 347 },
    { click: 5, distance: 359 },
    { click: 6, distance: 370 },
    { click: 7, distance: 381 },
    { click: 8, distance: 392 },
    { click: 9, distance: 403 },
    { click: 10, distance: 414 },
    { click: 15, distance: 466 },
    { click: 20, distance: 515 },
    { click: 25, distance: 561 },
    { click: 29, distance: 597 },
  ]
};

/**
 * Norma Diamond Line 6.5 - 130 gr
 * Zero: 200m, Busk Standard
 * Estimated from DFS behavior patterns
 */
export const NORMA_DL_65_130_Z200_BUSK_STD: DFSReferenceProfile = {
  name: 'norma_dl_65_130_z200_busk_std',
  description: 'Norma Diamond Line 6.5 - 130 gr, Zero 200m, Busk Standard',

  bullet_name: 'Norma Diamond Line 6.5 - 130 gr',
  caliber: '6.5mm',
  bullet_weight_gr: 130,
  ballistic_coefficient: 0.549,
  muzzle_velocity: 900,

  sight_type: 'busk_standard',
  sight_height_mm: 34,
  sight_radius_cm: 90,
  front_sight_height_mm: 34,
  zero_distance_m: 200,

  temperature_c: 15,
  humidity_percent: 79,
  pressure_mm: 750,
  altitude_m: 100,

  reference_points: [
    { click: -8, distance: 100 },
    { click: -5, distance: 125 },
    { click: -3, distance: 150 },
    { click: -1, distance: 175 },
    { click: 0, distance: 200 },
    { click: 2, distance: 225 },
    { click: 4, distance: 250 },
    { click: 7, distance: 275 },
    { click: 9, distance: 300 },
    { click: 14, distance: 350 },
    { click: 19, distance: 400 },
    { click: 24, distance: 450 },
    { click: 30, distance: 500 },
    { click: 37, distance: 550 },
    { click: 44, distance: 600 },
  ]
};

/**
 * Sierra MatchKing 6.5 - 123 gr
 * Zero: 300m, Busk Standard
 */
export const SIERRA_MK_65_123_Z300_BUSK_STD: DFSReferenceProfile = {
  name: 'sierra_mk_65_123_z300_busk_std',
  description: 'Sierra MatchKing 6.5 - 123 gr, Zero 300m, Busk Standard',

  bullet_name: 'Sierra MatchKing 6.5 - 123 gr',
  caliber: '6.5mm',
  bullet_weight_gr: 123,
  ballistic_coefficient: 0.510,
  muzzle_velocity: 850,

  sight_type: 'busk_standard',
  sight_height_mm: 34,
  sight_radius_cm: 90,
  front_sight_height_mm: 34,
  zero_distance_m: 300,

  temperature_c: 15,
  humidity_percent: 79,
  pressure_mm: 750,
  altitude_m: 100,

  reference_points: [
    { click: -14, distance: 100 },
    { click: -12, distance: 125 },
    { click: -10, distance: 150 },
    { click: -8, distance: 175 },
    { click: -6, distance: 200 },
    { click: -4, distance: 225 },
    { click: -3, distance: 250 },
    { click: -1, distance: 275 },
    { click: 0, distance: 300 },
    { click: 2, distance: 325 },
    { click: 4, distance: 350 },
    { click: 6, distance: 375 },
    { click: 8, distance: 400 },
    { click: 14, distance: 450 },
    { click: 20, distance: 500 },
    { click: 27, distance: 550 },
    { click: 33, distance: 600 },
  ]
};

/**
 * Norma Alaska 7.62 - 180 gr
 * Zero: 300m, Busk Standard
 */
export const NORMA_ALASKA_762_180_Z300_BUSK_STD: DFSReferenceProfile = {
  name: 'norma_alaska_762_180_z300_busk_std',
  description: 'Norma Alaska 7.62 - 180 gr, Zero 300m, Busk Standard',

  bullet_name: 'Norma Alaska 7.62 - 180 gr',
  caliber: '7.62mm',
  bullet_weight_gr: 180,
  ballistic_coefficient: 0.480,
  muzzle_velocity: 780,

  sight_type: 'busk_standard',
  sight_height_mm: 34,
  sight_radius_cm: 90,
  front_sight_height_mm: 34,
  zero_distance_m: 300,

  temperature_c: 15,
  humidity_percent: 79,
  pressure_mm: 750,
  altitude_m: 100,

  reference_points: [
    { click: -15, distance: 100 },
    { click: -13, distance: 125 },
    { click: -11, distance: 150 },
    { click: -9, distance: 175 },
    { click: -7, distance: 200 },
    { click: -5, distance: 225 },
    { click: -3, distance: 250 },
    { click: -2, distance: 275 },
    { click: 0, distance: 300 },
    { click: 2, distance: 325 },
    { click: 5, distance: 350 },
    { click: 7, distance: 375 },
    { click: 10, distance: 400 },
    { click: 16, distance: 450 },
    { click: 22, distance: 500 },
    { click: 29, distance: 550 },
    { click: 37, distance: 600 },
  ]
};

export const DFS_REFERENCE_PROFILES: DFSReferenceProfile[] = [
  NORMA_DL_65_130_Z300_BUSK_STD,
  NORMA_DL_65_130_Z200_BUSK_STD,
  SIERRA_MK_65_123_Z300_BUSK_STD,
  NORMA_ALASKA_762_180_Z300_BUSK_STD,
];

export interface DFSWindReferencePoint {
  distance_m: number;
  wind_speed_ms: number;
  wind_clicks: number;
}

/**
 * DFS Wind Reference Table: Norma 6.5 - DL 130 gr (BC 0.549, V0 900)
 * Source: DFS Kulebanegenerator screenshot (corrected 2026-03-21)
 * Verified: 5, 10, and 15 m/s crosswind at 100-600m
 */
export const DFS_WIND_REFERENCE_NORMA_65_130: DFSWindReferencePoint[] = [
  { distance_m: 100, wind_speed_ms: 5, wind_clicks: 2 },
  { distance_m: 100, wind_speed_ms: 10, wind_clicks: 4 },
  { distance_m: 100, wind_speed_ms: 15, wind_clicks: 6 },
  { distance_m: 150, wind_speed_ms: 5, wind_clicks: 3 },
  { distance_m: 150, wind_speed_ms: 10, wind_clicks: 6 },
  { distance_m: 150, wind_speed_ms: 15, wind_clicks: 9 },
  { distance_m: 200, wind_speed_ms: 5, wind_clicks: 4 },
  { distance_m: 200, wind_speed_ms: 10, wind_clicks: 8 },
  { distance_m: 200, wind_speed_ms: 15, wind_clicks: 12 },
  { distance_m: 250, wind_speed_ms: 5, wind_clicks: 5 },
  { distance_m: 250, wind_speed_ms: 10, wind_clicks: 11 },
  { distance_m: 250, wind_speed_ms: 15, wind_clicks: 16 },
  { distance_m: 300, wind_speed_ms: 5, wind_clicks: 6 },
  { distance_m: 300, wind_speed_ms: 10, wind_clicks: 13 },
  { distance_m: 300, wind_speed_ms: 15, wind_clicks: 19 },
  { distance_m: 350, wind_speed_ms: 5, wind_clicks: 8 },
  { distance_m: 350, wind_speed_ms: 10, wind_clicks: 15 },
  { distance_m: 350, wind_speed_ms: 15, wind_clicks: 23 },
  { distance_m: 400, wind_speed_ms: 5, wind_clicks: 9 },
  { distance_m: 400, wind_speed_ms: 10, wind_clicks: 18 },
  { distance_m: 400, wind_speed_ms: 15, wind_clicks: 27 },
  { distance_m: 450, wind_speed_ms: 5, wind_clicks: 10 },
  { distance_m: 450, wind_speed_ms: 10, wind_clicks: 20 },
  { distance_m: 450, wind_speed_ms: 15, wind_clicks: 30 },
  { distance_m: 500, wind_speed_ms: 5, wind_clicks: 11 },
  { distance_m: 500, wind_speed_ms: 10, wind_clicks: 23 },
  { distance_m: 500, wind_speed_ms: 15, wind_clicks: 34 },
  { distance_m: 550, wind_speed_ms: 5, wind_clicks: 13 },
  { distance_m: 550, wind_speed_ms: 10, wind_clicks: 26 },
  { distance_m: 550, wind_speed_ms: 15, wind_clicks: 39 },
  { distance_m: 600, wind_speed_ms: 5, wind_clicks: 14 },
  { distance_m: 600, wind_speed_ms: 10, wind_clicks: 29 },
  { distance_m: 600, wind_speed_ms: 15, wind_clicks: 43 },
];

export function getDFSReferenceProfile(name: string): DFSReferenceProfile | undefined {
  return DFS_REFERENCE_PROFILES.find(p => p.name === name);
}
