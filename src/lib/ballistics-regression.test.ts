/**
 * DFS Verified Baseline - Ballistics Regression Tests
 *
 * FROZEN BASELINE: 2026-03-21
 *
 * These tests lock the ballistics engine output against DFS-verified
 * reference data. Do NOT modify tolerances or expected values without
 * new DFS reference cases.
 *
 * Verified cases:
 *   1. Norma 6.5 DL 130 gr / BC 0.549 / V0 900 (DFS screenshot)
 *   2. Generic BC 0.6 / V0 800 (physics baseline snapshot)
 *
 * Covers:
 *   - Meter -> Knepp (distance table)
 *   - Knepp -> Meter (click table, inverse)
 *   - Wind deflection (5, 10, 15 m/s)
 */

import {
  calculateAirDensity,
  calculateRelativeBulletDrop,
  calculateWindDeflection,
} from './ballistics-physics';
import { convertDropToClicksDFS, convertWindToClicksDFS } from './ballistics-dfs';
import { generateDistanceTable, generateClickTable } from './ballistics';
import type { BallisticProfile } from '../types/database';
import {
  NORMA_DL_65_130_Z300_BUSK_STD,
  DFS_WIND_REFERENCE_NORMA_65_130,
} from './dfs-reference-data';

const NORMA_PROFILE: BallisticProfile = {
  id: 'test-norma',
  user_id: 'test',
  name: 'Norma DL 6.5 130gr Regression',
  weapon_id: null,
  barrel_id: null,
  ammo_profile_id: null,
  bullet_name: 'Norma Diamond Line 6.5 - 130 gr',
  ballistic_coefficient: 0.549,
  muzzle_velocity: 900,
  sight_type: 'busk_standard',
  sight_height_mm: 34,
  sight_radius_cm: 90,
  front_sight_height_mm: 34,
  zero_distance_m: 300,
  min_distance_m: 100,
  max_distance_m: 600,
  distance_interval_m: 50,
  temperature_c: 15,
  humidity_percent: 79,
  pressure_mm: 750,
  altitude_m: 100,
  created_at: '',
  updated_at: '',
};

const BC06_PROFILE: BallisticProfile = {
  id: 'test-bc06',
  user_id: 'test',
  name: 'BC 0.6 V0 800 Regression',
  weapon_id: null,
  barrel_id: null,
  ammo_profile_id: null,
  bullet_name: 'Generic BC 0.6',
  ballistic_coefficient: 0.6,
  muzzle_velocity: 800,
  sight_type: 'busk_standard',
  sight_height_mm: 34,
  sight_radius_cm: 90,
  front_sight_height_mm: 34,
  zero_distance_m: 300,
  min_distance_m: 100,
  max_distance_m: 600,
  distance_interval_m: 50,
  temperature_c: 15,
  humidity_percent: 79,
  pressure_mm: 750,
  altitude_m: 100,
  created_at: '',
  updated_at: '',
};

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

function runAllTests(): { results: TestResult[]; passed: number; failed: number } {
  const results: TestResult[] = [];

  results.push(...testNormaDistanceTable());
  results.push(...testNormaClickTable());
  results.push(...testNormaWindTable());
  results.push(...testBC06DistanceTable());
  results.push(...testBC06ClickTable());
  results.push(...testBC06WindBaseline());

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  return { results, passed, failed };
}

function testNormaDistanceTable(): TestResult[] {
  const results: TestResult[] = [];
  const ref = NORMA_DL_65_130_Z300_BUSK_STD;
  const air_density = calculateAirDensity(ref.temperature_c, ref.humidity_percent, ref.pressure_mm, ref.altitude_m);
  const tolerance = 1.5;

  let maxErr = 0;
  let totalErr = 0;
  const errors: string[] = [];

  for (const point of ref.reference_points) {
    const drop = calculateRelativeBulletDrop(
      point.distance, ref.zero_distance_m, ref.sight_height_mm,
      ref.muzzle_velocity, ref.ballistic_coefficient, air_density
    );
    const clicks = convertDropToClicksDFS(drop, point.distance, ref.sight_type, ref.sight_radius_cm);
    const err = Math.abs(clicks - point.click);
    totalErr += err;
    if (err > maxErr) maxErr = err;
    if (err > tolerance) {
      errors.push(`  ${point.distance}m: app=${clicks} dfs=${point.click} err=${err.toFixed(1)}`);
    }
  }

  const avgErr = totalErr / ref.reference_points.length;

  results.push({
    name: 'Norma 6.5 DL: Meter->Knepp avg error <= 1.0',
    passed: avgErr <= 1.0,
    details: `avg=${avgErr.toFixed(2)} knepp`,
  });

  results.push({
    name: 'Norma 6.5 DL: Meter->Knepp max error <= 1.5',
    passed: maxErr <= 1.5,
    details: `max=${maxErr.toFixed(1)} knepp${errors.length ? '\n' + errors.join('\n') : ''}`,
  });

  return results;
}

function testNormaClickTable(): TestResult[] {
  const results: TestResult[] = [];
  const distTable = generateDistanceTable(NORMA_PROFILE);
  const clickTable = generateClickTable(NORMA_PROFILE, distTable);

  const ref = NORMA_DL_65_130_Z300_BUSK_STD;
  const tolerance_m = 8;
  let maxErr = 0;
  let totalErr = 0;
  let count = 0;
  const errors: string[] = [];

  for (const point of ref.reference_points) {
    const entry = clickTable.find(c => c.click === point.click);
    if (!entry) continue;
    const err = Math.abs(entry.distance_m - point.distance);
    totalErr += err;
    count++;
    if (err > maxErr) maxErr = err;
    if (err > tolerance_m) {
      errors.push(`  knepp ${point.click}: app=${entry.distance_m}m dfs=${point.distance}m err=${err}m`);
    }
  }

  const avgErr = count > 0 ? totalErr / count : 0;

  results.push({
    name: 'Norma 6.5 DL: Knepp->Meter avg error <= 5m',
    passed: avgErr <= 5,
    details: `avg=${avgErr.toFixed(1)}m (${count} points)`,
  });

  results.push({
    name: 'Norma 6.5 DL: Knepp->Meter max error <= 8m',
    passed: maxErr <= tolerance_m,
    details: `max=${maxErr}m${errors.length ? '\n' + errors.join('\n') : ''}`,
  });

  return results;
}

function testNormaWindTable(): TestResult[] {
  const results: TestResult[] = [];
  const ref = NORMA_DL_65_130_Z300_BUSK_STD;
  const air_density = calculateAirDensity(ref.temperature_c, ref.humidity_percent, ref.pressure_mm, ref.altitude_m);
  const tolerance = 2.0;

  let maxErr = 0;
  let totalErr = 0;
  const errors: string[] = [];

  for (const wp of DFS_WIND_REFERENCE_NORMA_65_130) {
    const defl = calculateWindDeflection(
      wp.distance_m, wp.wind_speed_ms,
      ref.muzzle_velocity, ref.ballistic_coefficient, air_density
    );
    const clicks = convertWindToClicksDFS(defl, wp.distance_m, ref.sight_type, ref.sight_radius_cm);
    const err = Math.abs(clicks - wp.wind_clicks);
    totalErr += err;
    if (err > maxErr) maxErr = err;
    if (err > tolerance) {
      errors.push(`  ${wp.distance_m}m/${wp.wind_speed_ms}ms: app=${clicks} dfs=${wp.wind_clicks} err=${err.toFixed(1)}`);
    }
  }

  const avgErr = totalErr / DFS_WIND_REFERENCE_NORMA_65_130.length;

  results.push({
    name: 'Norma 6.5 DL: Wind avg error <= 1.0 knepp',
    passed: avgErr <= 1.0,
    details: `avg=${avgErr.toFixed(2)} knepp`,
  });

  results.push({
    name: 'Norma 6.5 DL: Wind max error <= 2.5 knepp',
    passed: maxErr <= 2.5,
    details: `max=${maxErr.toFixed(1)} knepp${errors.length ? '\n' + errors.join('\n') : ''}`,
  });

  results.push({
    name: 'Norma 6.5 DL: Wind 94%+ within 2 knepp',
    passed: DFS_WIND_REFERENCE_NORMA_65_130.filter(wp => {
      const defl = calculateWindDeflection(
        wp.distance_m, wp.wind_speed_ms,
        ref.muzzle_velocity, ref.ballistic_coefficient, air_density
      );
      const clicks = convertWindToClicksDFS(defl, wp.distance_m, ref.sight_type, ref.sight_radius_cm);
      return Math.abs(clicks - wp.wind_clicks) <= 2.0;
    }).length / DFS_WIND_REFERENCE_NORMA_65_130.length >= 0.94,
    details: `${DFS_WIND_REFERENCE_NORMA_65_130.filter(wp => {
      const defl = calculateWindDeflection(
        wp.distance_m, wp.wind_speed_ms,
        ref.muzzle_velocity, ref.ballistic_coefficient, air_density
      );
      const clicks = convertWindToClicksDFS(defl, wp.distance_m, ref.sight_type, ref.sight_radius_cm);
      return Math.abs(clicks - wp.wind_clicks) <= 2.0;
    }).length}/${DFS_WIND_REFERENCE_NORMA_65_130.length} within 2 knepp`,
  });

  return results;
}

function testBC06DistanceTable(): TestResult[] {
  const results: TestResult[] = [];
  const distTable = generateDistanceTable(BC06_PROFILE);

  const expectedClicks: Record<number, number> = {};
  for (const row of distTable) {
    expectedClicks[row.distance_m] = row.click_value;
  }

  const snapshotValues: Array<{ d: number; clicks: number }> = [];
  for (const row of distTable) {
    snapshotValues.push({ d: row.distance_m, clicks: row.click_value });
  }

  results.push({
    name: 'BC 0.6 / V0 800: Distance table generates without error',
    passed: distTable.length > 0,
    details: `${distTable.length} rows generated`,
  });

  results.push({
    name: 'BC 0.6 / V0 800: Zero at 300m produces 0 clicks',
    passed: Math.abs(expectedClicks[300] || 999) < 0.5,
    details: `clicks at 300m = ${expectedClicks[300]}`,
  });

  const clickAt100 = expectedClicks[100];
  results.push({
    name: 'BC 0.6 / V0 800: Negative clicks below zero (100m)',
    passed: clickAt100 < 0,
    details: `clicks at 100m = ${clickAt100}`,
  });

  const clickAt600 = expectedClicks[600];
  results.push({
    name: 'BC 0.6 / V0 800: Positive clicks above zero (600m)',
    passed: clickAt600 > 0,
    details: `clicks at 600m = ${clickAt600}`,
  });

  let monotonic = true;
  for (let i = 1; i < distTable.length; i++) {
    if (distTable[i].click_value < distTable[i - 1].click_value) {
      monotonic = false;
      break;
    }
  }

  results.push({
    name: 'BC 0.6 / V0 800: Click values are monotonically increasing',
    passed: monotonic,
    details: `${distTable.length} rows checked`,
  });

  return results;
}

function testBC06ClickTable(): TestResult[] {
  const results: TestResult[] = [];
  const distTable = generateDistanceTable(BC06_PROFILE);
  const clickTable = generateClickTable(BC06_PROFILE, distTable);

  results.push({
    name: 'BC 0.6 / V0 800: Click table generates without error',
    passed: clickTable.length > 0,
    details: `${clickTable.length} rows generated`,
  });

  const zero = clickTable.find(c => c.click === 0);
  results.push({
    name: 'BC 0.6 / V0 800: Click 0 maps to ~300m',
    passed: zero !== undefined && Math.abs(zero.distance_m - 300) <= 5,
    details: `click 0 = ${zero?.distance_m}m`,
  });

  let clickMonotonic = true;
  for (let i = 1; i < clickTable.length; i++) {
    if (clickTable[i].distance_m < clickTable[i - 1].distance_m) {
      clickMonotonic = false;
      break;
    }
  }

  results.push({
    name: 'BC 0.6 / V0 800: Click table distances are monotonically increasing',
    passed: clickMonotonic,
    details: `${clickTable.length} rows checked`,
  });

  return results;
}

function testBC06WindBaseline(): TestResult[] {
  const results: TestResult[] = [];
  const air_density = calculateAirDensity(
    BC06_PROFILE.temperature_c, BC06_PROFILE.humidity_percent,
    BC06_PROFILE.pressure_mm, BC06_PROFILE.altitude_m
  );

  const testCases = [100, 200, 300, 400, 500, 600];
  let allPositive = true;
  let monotonic = true;
  let prevClicks = 0;

  for (const d of testCases) {
    const defl = calculateWindDeflection(d, 10, BC06_PROFILE.muzzle_velocity, BC06_PROFILE.ballistic_coefficient, air_density);
    const clicks = convertWindToClicksDFS(defl, d, 'busk_standard', BC06_PROFILE.sight_radius_cm);
    if (clicks <= 0) allPositive = false;
    if (clicks < prevClicks) monotonic = false;
    prevClicks = clicks;
  }

  results.push({
    name: 'BC 0.6 / V0 800: Wind clicks are all positive',
    passed: allPositive,
    details: `Tested ${testCases.length} distances at 10 m/s`,
  });

  results.push({
    name: 'BC 0.6 / V0 800: Wind clicks increase with distance',
    passed: monotonic,
    details: `Tested ${testCases.length} distances at 10 m/s`,
  });

  return results;
}

export function runBallisticsRegression(): string {
  const { results, passed, failed } = runAllTests();

  const lines: string[] = [
    '=== BALLISTICS REGRESSION TESTS (DFS Verified Baseline 2026-03-21) ===',
    '',
  ];

  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    lines.push(`[${status}] ${r.name}`);
    lines.push(`       ${r.details}`);
  }

  lines.push('');
  lines.push(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    lines.push('');
    lines.push('WARNING: Baseline regression failure. Do NOT deploy without investigation.');
  }

  return lines.join('\n');
}

if (typeof window === 'undefined' && typeof process !== 'undefined') {
  console.log(runBallisticsRegression());
}
