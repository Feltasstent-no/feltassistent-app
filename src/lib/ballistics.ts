/**
 * Ballistics Module - Main Orchestrator
 *
 * DFS VERIFIED BASELINE - Frozen 2026-03-21
 * Do NOT modify without new DFS reference cases.
 * See BALLISTICS_VALIDATION.md and ballistics-regression.test.ts
 *
 * Combines the three ballistic layers:
 *   A. Physics / Trajectory (ballistics-physics.ts)
 *   B. DFS Sight / Click Conversion (ballistics-dfs.ts)
 *   C. Range / Figure Estimation (reserved for future)
 *
 * This module:
 * - Generates distance tables (meter -> knepp)
 * - Generates click tables (knepp -> meter, derived from distance table)
 * - Generates wind tables
 * - Provides lookup/interpolation functions
 *
 * All tables share the same physics foundation. Click tables are
 * always derived from distance tables by interpolation, never from
 * a separate model.
 */

import { BallisticProfile } from '../types/database';
import {
  calculateAirDensity,
  calculateRelativeBulletDrop,
  calculateWindDeflection
} from './ballistics-physics';
import {
  convertDropToClicksDFS,
  convertWindToClicksDFS,
  dfsWindFloor,
  type DFSSightType
} from './ballistics-dfs';

export type { DFSSightType };
export type ClickRecommendationType = 'exact' | 'nearest' | 'interpolated';

export interface ClickRecommendation {
  clicks: number;
  type: ClickRecommendationType;
  distance_m: number;
  nearest_distance?: number;
  interpolation_range?: { lower: number; upper: number };
}

interface BallisticResult {
  distance_m: number;
  click_value: number;
  bullet_drop_mm: number;
}

interface WindResult {
  distance_m: number;
  wind_speed: number;
  wind_clicks: number;
}

interface ClickDistanceResult {
  click: number;
  distance_m: number;
}

const DEFAULT_SIGHT_RADIUS_CM = 50;

function isDFSBuskSight(sight_type: string): sight_type is DFSSightType {
  return sight_type === 'busk_standard' || sight_type === 'busk_finknepp';
}

/**
 * Convert drop to clicks for MOA/mil sights (non-DFS).
 * Kept for compatibility with scope-based profiles.
 */
function convertDropToClicksMOAMil(
  relative_drop_mm: number,
  distance_m: number,
  sight_type: string
): number {
  if (distance_m <= 0) return 0;

  let moa_per_click = 0.25;
  if (sight_type === 'moa_half') moa_per_click = 0.5;
  else if (sight_type === 'moa_full') moa_per_click = 1.0;
  else if (sight_type === 'mil_0_1') moa_per_click = 0.1 * 3.438;
  else if (sight_type === 'mil_0_2') moa_per_click = 0.2 * 3.438;

  const drop_mm = Math.abs(relative_drop_mm);
  const moa_at_distance = (drop_mm / distance_m) * 3.438;
  const clicks = moa_at_distance / moa_per_click;
  const signed_clicks = relative_drop_mm < 0 ? -clicks : clicks;
  return Math.round(signed_clicks * 10) / 10;
}

/**
 * Generate distance table (meter -> knepp).
 *
 * For each distance from min to max:
 * 1. Physics layer calculates relative drop vs. zero
 * 2. Sight conversion layer converts drop to clicks
 *
 * Zero distance always produces 0 clicks.
 */
export function generateDistanceTable(profile: BallisticProfile): BallisticResult[] {
  const {
    muzzle_velocity,
    ballistic_coefficient,
    zero_distance_m,
    min_distance_m,
    max_distance_m,
    distance_interval_m,
    temperature_c,
    humidity_percent,
    pressure_mm,
    altitude_m,
    sight_type,
    sight_height_mm,
    sight_radius_cm
  } = profile;

  const air_density = calculateAirDensity(
    temperature_c,
    humidity_percent,
    pressure_mm,
    altitude_m
  );

  const effectiveSightRadius = sight_radius_cm || DEFAULT_SIGHT_RADIUS_CM;
  const results: BallisticResult[] = [];

  for (let distance = min_distance_m; distance <= max_distance_m; distance += distance_interval_m) {
    const relative_drop_mm = calculateRelativeBulletDrop(
      distance,
      zero_distance_m,
      sight_height_mm,
      muzzle_velocity,
      ballistic_coefficient,
      air_density
    );

    let click_value: number;

    if (isDFSBuskSight(sight_type)) {
      click_value = convertDropToClicksDFS(
        relative_drop_mm,
        distance,
        sight_type,
        effectiveSightRadius
      );
    } else {
      click_value = convertDropToClicksMOAMil(
        relative_drop_mm,
        distance,
        sight_type
      );
    }

    results.push({
      distance_m: distance,
      click_value,
      bullet_drop_mm: relative_drop_mm
    });
  }

  return results;
}

/**
 * Generate click table (knepp -> meter).
 *
 * This is DERIVED from the distance table by interpolation.
 * It does NOT use a separate model.
 *
 * To produce accurate inversions across the full click range,
 * this function builds an internal fine-grained table (1m steps)
 * that extends beyond the user's min/max range. This prevents
 * edge effects where clicks near the table boundaries would
 * produce wildly inaccurate distance values.
 */
export function generateClickTable(
  profile: BallisticProfile,
  _distanceTable: BallisticResult[]
): ClickDistanceResult[] {
  const {
    muzzle_velocity,
    ballistic_coefficient,
    zero_distance_m,
    min_distance_m,
    max_distance_m,
    temperature_c,
    humidity_percent,
    pressure_mm,
    altitude_m,
    sight_type,
    sight_height_mm,
    sight_radius_cm
  } = profile;

  const air_density = calculateAirDensity(
    temperature_c, humidity_percent, pressure_mm, altitude_m
  );

  const effectiveSightRadius = sight_radius_cm || DEFAULT_SIGHT_RADIUS_CM;
  const extendedMin = Math.max(10, min_distance_m - 100);
  const extendedMax = max_distance_m + 100;

  const fineTable: BallisticResult[] = [];
  for (let d = extendedMin; d <= extendedMax; d++) {
    const drop = calculateRelativeBulletDrop(
      d, zero_distance_m, sight_height_mm, muzzle_velocity, ballistic_coefficient, air_density
    );
    let cv: number;
    if (isDFSBuskSight(sight_type)) {
      cv = convertDropToClicksDFS(drop, d, sight_type, effectiveSightRadius);
    } else {
      cv = convertDropToClicksMOAMil(drop, d, sight_type);
    }
    fineTable.push({ distance_m: d, click_value: cv, bullet_drop_mm: drop });
  }

  if (fineTable.length === 0) return [];

  let minClickIdx = 0;
  for (let i = 1; i < fineTable.length; i++) {
    if (fineTable[i].click_value < fineTable[minClickIdx].click_value) {
      minClickIdx = i;
    }
  }

  const monotonic = fineTable.slice(minClickIdx);
  if (monotonic.length < 2) return [];

  const minClick = Math.floor(monotonic[0].click_value);
  const maxClick = Math.ceil(monotonic[monotonic.length - 1].click_value);

  const results: ClickDistanceResult[] = [];

  for (let click = minClick; click <= maxClick; click++) {
    let found = false;

    for (let i = 0; i < monotonic.length - 1; i++) {
      const curr = monotonic[i];
      const next = monotonic[i + 1];

      if (curr.click_value <= click && next.click_value >= click) {
        if (Math.abs(next.click_value - curr.click_value) > 0.001) {
          const t = (click - curr.click_value) / (next.click_value - curr.click_value);
          results.push({
            click,
            distance_m: Math.round(curr.distance_m + t * (next.distance_m - curr.distance_m))
          });
        } else {
          results.push({ click, distance_m: curr.distance_m });
        }
        found = true;
        break;
      }
    }

    if (!found) {
      const nearest = monotonic.reduce((prev, curr) =>
        Math.abs(curr.click_value - click) < Math.abs(prev.click_value - click) ? curr : prev
      );
      if (Math.abs(nearest.click_value - click) < 1.0) {
        results.push({ click, distance_m: nearest.distance_m });
      }
    }
  }

  return results;
}

/**
 * Get click recommendation for a specific distance.
 * Uses exact match, nearest, or interpolation from the distance table.
 */
export function getClickRecommendation(
  distance_m: number,
  distanceTable: BallisticResult[]
): ClickRecommendation {
  if (distanceTable.length === 0) {
    return { clicks: 0, type: 'exact', distance_m };
  }

  const exactMatch = distanceTable.find(d => d.distance_m === distance_m);
  if (exactMatch) {
    return { clicks: exactMatch.click_value, type: 'exact', distance_m };
  }

  const nearest = distanceTable.reduce((prev, curr) =>
    Math.abs(curr.distance_m - distance_m) < Math.abs(prev.distance_m - distance_m) ? curr : prev
  );

  if (Math.abs(nearest.distance_m - distance_m) < 5) {
    return {
      clicks: nearest.click_value,
      type: 'nearest',
      distance_m,
      nearest_distance: nearest.distance_m
    };
  }

  let lower = distanceTable[0];
  let upper = distanceTable[distanceTable.length - 1];

  for (let i = 0; i < distanceTable.length - 1; i++) {
    if (distanceTable[i].distance_m <= distance_m && distanceTable[i + 1].distance_m >= distance_m) {
      lower = distanceTable[i];
      upper = distanceTable[i + 1];
      break;
    }
  }

  const t = (distance_m - lower.distance_m) / (upper.distance_m - lower.distance_m);
  const interpolated_clicks = lower.click_value + t * (upper.click_value - lower.click_value);

  return {
    clicks: Math.round(interpolated_clicks * 10) / 10,
    type: 'interpolated',
    distance_m,
    interpolation_range: { lower: lower.distance_m, upper: upper.distance_m }
  };
}

/**
 * Generate wind table.
 *
 * Uses the SAME physics foundation as the distance table:
 * - Wind deflection from physics layer
 * - Click conversion from sight conversion layer
 */
export function calculateWindTable(profile: BallisticProfile): WindResult[] {
  const {
    muzzle_velocity,
    ballistic_coefficient,
    min_distance_m,
    max_distance_m,
    distance_interval_m,
    temperature_c,
    humidity_percent,
    pressure_mm,
    altitude_m,
    sight_type,
    sight_radius_cm,
  } = profile;

  const air_density = calculateAirDensity(
    temperature_c,
    humidity_percent,
    pressure_mm,
    altitude_m
  );

  const effectiveSightRadius = sight_radius_cm || DEFAULT_SIGHT_RADIUS_CM;
  const results: WindResult[] = [];
  const wind_speeds = [2.5, 5, 7.5, 10];

  for (let distance = min_distance_m; distance <= max_distance_m; distance += distance_interval_m) {
    for (const wind_speed of wind_speeds) {
      const deflection_mm = calculateWindDeflection(
        distance,
        wind_speed,
        muzzle_velocity,
        ballistic_coefficient,
        air_density
      );

      let wind_clicks: number;

      if (isDFSBuskSight(sight_type)) {
        wind_clicks = convertWindToClicksDFS(
          deflection_mm,
          distance,
          sight_type,
          effectiveSightRadius
        );
      } else {
        wind_clicks = Math.abs(convertDropToClicksMOAMil(deflection_mm, distance, sight_type));
      }

      results.push({ distance_m: distance, wind_speed, wind_clicks });
    }
  }

  return results;
}

/**
 * Get wind click recommendation for a specific distance and wind speed.
 */
export function getWindClickRecommendation(
  target_distance_m: number,
  wind_speed: number,
  windTable: WindResult[]
): ClickRecommendation {
  const relevantRows = windTable.filter(row => row.wind_speed === wind_speed);

  const exactMatch = relevantRows.find(row => row.distance_m === target_distance_m);
  if (exactMatch) {
    return { clicks: exactMatch.wind_clicks, type: 'exact', distance_m: target_distance_m };
  }

  const sorted = [...relevantRows].sort((a, b) => a.distance_m - b.distance_m);
  const lower = sorted.filter(row => row.distance_m < target_distance_m).pop();
  const upper = sorted.find(row => row.distance_m > target_distance_m);

  if (lower && upper) {
    const ratio = (target_distance_m - lower.distance_m) / (upper.distance_m - lower.distance_m);
    const interpolated_clicks = lower.wind_clicks + ratio * (upper.wind_clicks - lower.wind_clicks);

    return {
      clicks: dfsWindFloor(interpolated_clicks),
      type: 'interpolated',
      distance_m: target_distance_m,
      interpolation_range: { lower: lower.distance_m, upper: upper.distance_m }
    };
  }

  const nearest = relevantRows.reduce((prev, curr) =>
    Math.abs(curr.distance_m - target_distance_m) < Math.abs(prev.distance_m - target_distance_m) ? curr : prev
  );

  return {
    clicks: nearest.wind_clicks,
    type: 'nearest',
    distance_m: target_distance_m,
    nearest_distance: nearest.distance_m
  };
}

/**
 * Get sight model display name.
 */
export function getSightDisplayName(sight_type: string): string {
  const models: Record<string, string> = {
    'busk_standard': 'Busk Standard (grovknepp)',
    'busk_finknepp': 'Busk Finknepp',
    'moa_quarter': '1/4 MOA',
    'moa_half': '1/2 MOA',
    'moa_full': '1 MOA',
    'mil_0_1': '0.1 mil',
    'mil_0_2': '0.2 mil'
  };
  return models[sight_type.toLowerCase().replace(/\s+/g, '_')] || sight_type;
}

/**
 * List all available sight types.
 */
export function getAvailableSightTypes(): Array<{ value: string; label: string; isDFS: boolean }> {
  return [
    { value: 'busk_standard', label: 'Busk Standard (grovknepp)', isDFS: true },
    { value: 'busk_finknepp', label: 'Busk Finknepp', isDFS: true },
    { value: 'moa_quarter', label: '1/4 MOA', isDFS: false },
    { value: 'moa_half', label: '1/2 MOA', isDFS: false },
    { value: 'moa_full', label: '1 MOA', isDFS: false },
    { value: 'mil_0_1', label: '0.1 mil', isDFS: false },
    { value: 'mil_0_2', label: '0.2 mil', isDFS: false },
  ];
}
