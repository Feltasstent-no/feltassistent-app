/**
 * LAYER B: DFS Sight / Click Conversion
 *
 * DFS VERIFIED BASELINE - Frozen 2026-03-21
 * Do NOT modify without new DFS reference cases.
 * See BALLISTICS_VALIDATION.md and ballistics-regression.test.ts
 *
 * Converts physical bullet drop (from Layer A) to DFS-compatible click values
 * using actual sight geometry.
 *
 * === BUSK SIGHT GEOMETRY ===
 *
 * The DFS Busk sight is a mechanical iron sight:
 * - Rear aperture (bakhull) with threaded elevation/windage screws
 * - Front sight post (korn)
 * - "Hullavstand" = distance between rear aperture and front sight post (cm)
 * - "Kornhøyde" = height of front sight post (mm) - defines sight line offset
 *
 * Each "knepp" (click) moves the rear aperture by a fixed amount.
 * The Busk height screw has millimeter threads (1 rotation = 1mm).
 *
 * - Busk Standard (grovknepp): 12 knepp per rotation → 1 knepp = 1/12 mm
 * - Busk Finknepp: 12 knepp per half-rotation → 1 knepp = 1/24 mm
 *
 * === ANGULAR CONVERSION ===
 *
 * When the rear aperture moves by `click_size_mm`:
 *   angle_change = click_size_mm / sight_radius_mm
 *
 * This angle change, projected to target distance:
 *   impact_shift_at_distance = angle_change * distance_m * 1000 (mm)
 *   = click_size_mm * distance_m * 1000 / sight_radius_mm
 *
 * Therefore:
 *   clicks = drop_mm / impact_shift_per_click_at_distance
 *   clicks = drop_mm * sight_radius_mm / (click_size_mm * distance_m * 1000)
 *
 * === WHAT THIS LAYER USES ===
 * - sight_type: 'busk_standard' or 'busk_finknepp'
 * - sight_radius_mm: hullavstand (converted from cm input)
 * - front_sight_height_mm: kornhøyde (informational, not used in click calc)
 *
 * === WHAT THIS LAYER DOES NOT USE ===
 * - Hullkorn diameter (reserved for Layer C: range/figure estimation)
 * - Sikteavstand / øye-til-sikte (reserved for Layer C)
 * - Any empirical fudge factors or distance-dependent corrections
 */

/**
 * DFS wind clicks are always rounded DOWN (floor) to the nearest whole click.
 * This ensures the app never recommends more wind correction than DFS tables show.
 * Applies to final wind click output only -- internal precision is preserved.
 */
export function dfsWindFloor(rawWindClicks: number): number {
  return Math.floor(Math.abs(rawWindClicks));
}

export type DFSSightType = 'busk_standard' | 'busk_finknepp';

interface DFSSightModel {
  type: DFSSightType;
  displayName: string;
  click_size_mm: number;
}

const DFS_SIGHT_MODELS: Record<DFSSightType, DFSSightModel> = {
  busk_standard: {
    type: 'busk_standard',
    displayName: 'Busk Standard (grovknepp)',
    click_size_mm: 1.0 / 12,
  },
  busk_finknepp: {
    type: 'busk_finknepp',
    displayName: 'Busk Finknepp',
    click_size_mm: 1.0 / 24,
  },
};

export function getDFSSightModel(sight_type: DFSSightType): DFSSightModel {
  return DFS_SIGHT_MODELS[sight_type];
}

/**
 * Convert relative bullet drop to clicks for DFS Busk sights.
 *
 * This is the core DFS conversion using actual sight geometry:
 *
 *   clicks = drop_mm * sight_radius_mm / (click_size_mm * distance_m * 1000)
 *
 * The formula derives from the fact that one click moves the rear aperture
 * by click_size_mm, and the angular change this creates at the target is
 * click_size_mm / sight_radius_mm radians.
 *
 * Busk Finknepp is automatically handled by having click_size_mm = 1/24
 * instead of 1/12, which means it produces exactly 2x the clicks for
 * the same drop/distance/hullavstand combination.
 *
 * @param relative_drop_mm - Relative drop in mm from physics layer
 *                           (negative = bullet high, positive = bullet low)
 * @param distance_m - Target distance in meters
 * @param sight_type - 'busk_standard' or 'busk_finknepp'
 * @param sight_radius_cm - Hullavstand in centimeters
 * @returns Click value (negative = dial down, positive = dial up)
 */
export function convertDropToClicksDFS(
  relative_drop_mm: number,
  distance_m: number,
  sight_type: DFSSightType,
  sight_radius_cm: number
): number {
  if (distance_m <= 0) return 0;

  const model = DFS_SIGHT_MODELS[sight_type];
  const sight_radius_mm = sight_radius_cm * 10;

  // mm impact shift per click at this distance
  // = click_size_mm / sight_radius_mm * distance_m * 1000
  const mm_per_click = (model.click_size_mm * distance_m * 1000) / sight_radius_mm;

  const clicks = relative_drop_mm / mm_per_click;

  return Math.round(clicks * 10) / 10;
}

/**
 * Convert wind deflection to clicks for DFS Busk sights.
 *
 * Uses the same geometric principle as elevation:
 * the angular value of each click is determined by click_size / sight_radius.
 *
 * @param deflection_mm - Wind deflection in mm from physics layer
 * @param distance_m - Target distance in meters
 * @param sight_type - 'busk_standard' or 'busk_finknepp'
 * @param sight_radius_cm - Hullavstand in centimeters
 * @returns Wind clicks (always positive, sign handled by caller)
 */
export function convertWindToClicksDFS(
  deflection_mm: number,
  distance_m: number,
  sight_type: DFSSightType,
  sight_radius_cm: number
): number {
  if (distance_m <= 0) return 0;

  const model = DFS_SIGHT_MODELS[sight_type];
  const sight_radius_mm = sight_radius_cm * 10;

  const mm_per_click = (model.click_size_mm * distance_m * 1000) / sight_radius_mm;

  return dfsWindFloor(deflection_mm / mm_per_click);
}

/**
 * Validate DFS model against reference data.
 *
 * Computes click values for each reference distance and compares
 * against the DFS reference table values.
 */
export function validateAgainstReference(reference: {
  name: string;
  muzzle_velocity: number;
  ballistic_coefficient: number;
  sight_type: DFSSightType;
  sight_height_mm: number;
  sight_radius_cm: number;
  zero_distance_m: number;
  temperature_c: number;
  humidity_percent: number;
  pressure_mm: number;
  altitude_m: number;
  reference_points: Array<{ click: number; distance: number }>;
}, calculateRelativeDrop: (
  distance_m: number,
  zero_distance_m: number,
  sight_height_mm: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
) => number, calculateAirDensityFn: (
  temperature_c: number,
  humidity_percent: number,
  pressure_mm: number,
  altitude_m: number
) => number): {
  profile_name: string;
  avg_click_error: number;
  max_click_error: number;
  point_errors: Array<{
    reference_click: number;
    reference_distance: number;
    calculated_clicks: number;
    click_error: number;
  }>;
} {
  const air_density = calculateAirDensityFn(
    reference.temperature_c,
    reference.humidity_percent,
    reference.pressure_mm,
    reference.altitude_m
  );

  const point_errors = reference.reference_points.map(point => {
    const relative_drop = calculateRelativeDrop(
      point.distance,
      reference.zero_distance_m,
      reference.sight_height_mm,
      reference.muzzle_velocity,
      reference.ballistic_coefficient,
      air_density
    );

    const calculated_clicks = convertDropToClicksDFS(
      relative_drop,
      point.distance,
      reference.sight_type,
      reference.sight_radius_cm
    );

    return {
      reference_click: point.click,
      reference_distance: point.distance,
      calculated_clicks,
      click_error: Math.abs(calculated_clicks - point.click),
    };
  });

  const avg_click_error = point_errors.reduce((s, e) => s + e.click_error, 0) / point_errors.length;
  const max_click_error = Math.max(...point_errors.map(e => e.click_error));

  return { profile_name: reference.name, avg_click_error, max_click_error, point_errors };
}
