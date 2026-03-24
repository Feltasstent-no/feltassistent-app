/**
 * LAYER A: Ballistics Physics / Trajectory
 *
 * DFS VERIFIED BASELINE - Frozen 2026-03-21
 * Do NOT modify without new DFS reference cases.
 * See BALLISTICS_VALIDATION.md and ballistics-regression.test.ts
 *
 * Pure physics calculations for bullet trajectory using the standard
 * G1 drag function from the GNU Ballistics Library.
 *
 * This layer is completely independent of any sight system.
 *
 * The G1 drag model uses a piecewise power-law approximation:
 *   retardation = A * V^M / BC  (ft/s per second)
 * where A and M are velocity-dependent coefficients from the standard
 * G1 drag table, and BC is the G1 ballistic coefficient.
 *
 * Trajectory is computed by numerical integration with small time steps.
 *
 * Uses:
 * - ballistic_coefficient (G1 BC)
 * - muzzle_velocity (m/s)
 * - sight_height_mm (bore-to-sight offset, used only for zero angle)
 * - Environmental: temperature, pressure, humidity, altitude
 *
 * Does NOT use:
 * - Any sight-specific parameters (hullavstand, kornhøyde, click size)
 * - Any DFS-specific logic
 */

const GRAVITY = 9.80665;
const FPS_PER_MPS = 3.28084;

/**
 * G1 Standard Drag Function (GNU Ballistics Library / Ingalls).
 *
 * Returns the drag retardation (deceleration) in ft/s per second
 * for a projectile with BC=1.0 at the given velocity in ft/s.
 *
 * The drag is modeled as: retard = A * V^M
 * where A and M are piecewise constants depending on velocity.
 */
function g1DragRetardation(velocity_fps: number): number {
  let a: number, m: number;

  if (velocity_fps > 4230) { a = 1.477404177730177e-04; m = 1.9565; }
  else if (velocity_fps > 3680) { a = 1.920339268755614e-04; m = 1.925; }
  else if (velocity_fps > 3450) { a = 2.894751026819746e-04; m = 1.875; }
  else if (velocity_fps > 3295) { a = 4.349905111115636e-04; m = 1.825; }
  else if (velocity_fps > 3130) { a = 6.520421871892662e-04; m = 1.775; }
  else if (velocity_fps > 2960) { a = 9.748073694078696e-04; m = 1.725; }
  else if (velocity_fps > 2830) { a = 1.453721560187286e-03; m = 1.675; }
  else if (velocity_fps > 2680) { a = 2.162887202930376e-03; m = 1.625; }
  else if (velocity_fps > 2460) { a = 3.209559783129881e-03; m = 1.575; }
  else if (velocity_fps > 2225) { a = 3.904368218691249e-03; m = 1.55; }
  else if (velocity_fps > 2015) { a = 3.222942271262336e-03; m = 1.575; }
  else if (velocity_fps > 1890) { a = 2.203329542297809e-03; m = 1.625; }
  else if (velocity_fps > 1810) { a = 1.511001028891904e-03; m = 1.675; }
  else if (velocity_fps > 1730) { a = 8.609957592468259e-04; m = 1.75; }
  else if (velocity_fps > 1595) { a = 4.086146797305117e-04; m = 1.85; }
  else if (velocity_fps > 1520) { a = 1.954473210037398e-04; m = 1.95; }
  else if (velocity_fps > 1420) { a = 5.431896266462351e-05; m = 2.125; }
  else if (velocity_fps > 1360) { a = 8.847742581674416e-06; m = 2.375; }
  else if (velocity_fps > 1315) { a = 1.456922328720298e-06; m = 2.625; }
  else if (velocity_fps > 1280) { a = 2.419485191895565e-07; m = 2.875; }
  else if (velocity_fps > 1220) { a = 1.657956321067612e-08; m = 3.25; }
  else if (velocity_fps > 1185) { a = 4.745469537157371e-10; m = 3.75; }
  else if (velocity_fps > 1150) { a = 1.379746590025088e-11; m = 4.25; }
  else if (velocity_fps > 1100) { a = 4.070157961147882e-13; m = 4.75; }
  else if (velocity_fps > 1060) { a = 2.938236954847331e-14; m = 5.125; }
  else if (velocity_fps > 1025) { a = 1.228597370774746e-14; m = 5.25; }
  else if (velocity_fps > 980) { a = 2.916938264100495e-14; m = 5.125; }
  else if (velocity_fps > 945) { a = 3.855099424807451e-13; m = 4.75; }
  else if (velocity_fps > 905) { a = 1.185097045689854e-11; m = 4.25; }
  else if (velocity_fps > 860) { a = 3.566129470974951e-10; m = 3.75; }
  else if (velocity_fps > 810) { a = 1.045513263966272e-08; m = 3.25; }
  else if (velocity_fps > 780) { a = 1.291159200846216e-07; m = 2.875; }
  else if (velocity_fps > 750) { a = 6.824429329105383e-07; m = 2.625; }
  else if (velocity_fps > 700) { a = 3.569169672385163e-06; m = 2.375; }
  else if (velocity_fps > 640) { a = 1.839015095899579e-05; m = 2.125; }
  else if (velocity_fps > 600) { a = 5.71117468873424e-05; m = 1.950; }
  else if (velocity_fps > 550) { a = 9.226557091973427e-05; m = 1.875; }
  else if (velocity_fps > 250) { a = 9.337991957131389e-05; m = 1.875; }
  else if (velocity_fps > 100) { a = 7.225247327590413e-05; m = 1.925; }
  else if (velocity_fps > 65) { a = 5.792684957074546e-05; m = 1.975; }
  else { a = 5.206214107320588e-05; m = 2.000; }

  return a * Math.pow(velocity_fps, m);
}

/**
 * Calculate air density based on environmental conditions.
 *
 * Uses ideal gas law with altitude and humidity corrections.
 * Returns a density ratio relative to standard sea level (1.225 kg/m³).
 */
export function calculateAirDensity(
  temperature_c: number,
  humidity_percent: number,
  pressure_mm: number,
  altitude_m: number
): number {
  const pressure_pa = pressure_mm * 133.322;
  const temperature_k = temperature_c + 273.15;
  const altitude_factor = Math.exp(-altitude_m / 8000);
  const humidity_factor = 1 - (humidity_percent / 100) * 0.02;

  return (pressure_pa / (287.05 * temperature_k)) * altitude_factor * humidity_factor;
}

const STD_AIR_DENSITY = 1.225;

/**
 * Compute the trajectory at a given distance using numerical integration
 * with the G1 drag function.
 *
 * Integrates the 2D equations of motion (x,y) with small time steps.
 * The launch angle is computed to produce the given upward trajectory.
 *
 * @param distance_m - Desired horizontal distance in meters
 * @param launch_angle_rad - Launch angle in radians (above horizontal)
 * @param muzzle_velocity - Initial velocity in m/s
 * @param ballistic_coefficient - G1 BC
 * @param air_density - Actual air density in kg/m³
 * @returns { x_m, y_m, time, velocity } at the point where x >= distance_m
 */
function integrateTrajectory(
  distance_m: number,
  launch_angle_rad: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
): { x_m: number; y_m: number; time: number; velocity: number } {
  const density_ratio = air_density / STD_AIR_DENSITY;
  const adjusted_bc = ballistic_coefficient / density_ratio;

  let vx = muzzle_velocity * Math.cos(launch_angle_rad);
  let vy = muzzle_velocity * Math.sin(launch_angle_rad);
  let x = 0;
  let y = 0;
  let t = 0;

  const dt = 0.0005;
  const max_time = 5.0;

  while (x < distance_m && t < max_time) {
    const v = Math.sqrt(vx * vx + vy * vy);
    const v_fps = v * FPS_PER_MPS;

    const retard_fps2 = g1DragRetardation(v_fps) / adjusted_bc;
    const retard_mps2 = retard_fps2 / FPS_PER_MPS;

    const ax = -(vx / v) * retard_mps2;
    const ay = -(vy / v) * retard_mps2 - GRAVITY;

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }

  return { x_m: x, y_m: y, time: t, velocity: Math.sqrt(vx * vx + vy * vy) };
}

/**
 * Find the launch angle that zeros at a given distance.
 *
 * Uses iterative refinement (bisection) to find the angle that
 * produces y_m = 0 at distance = zero_distance_m, accounting for
 * sight height (bore is below sight line).
 */
function findZeroAngle(
  zero_distance_m: number,
  sight_height_mm: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
): number {
  const sight_height_m = sight_height_mm / 1000;

  let lo = 0;
  let hi = 0.05;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const result = integrateTrajectory(
      zero_distance_m, mid, muzzle_velocity, ballistic_coefficient, air_density
    );
    const y_at_zero = result.y_m - sight_height_m;

    if (y_at_zero < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * Calculate bullet velocity and flight time at a given distance.
 *
 * Uses the G1 drag function with numerical integration.
 * Assumes flat-fire (zero launch angle) for velocity/time queries.
 */
export function calculateVelocityAtDistance(
  distance_m: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
): { velocity: number; time: number } {
  const result = integrateTrajectory(
    distance_m, 0, muzzle_velocity, ballistic_coefficient, air_density
  );
  return { velocity: result.velocity, time: result.time };
}

/**
 * Calculate physical bullet drop at a given distance.
 *
 * This is pure gravity drop with no sight adjustments or zeroing.
 * Uses flat-fire trajectory integration.
 */
export function calculatePhysicalBulletDrop(
  distance_m: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
): number {
  const result = integrateTrajectory(
    distance_m, 0, muzzle_velocity, ballistic_coefficient, air_density
  );
  return -result.y_m * 1000;
}

/**
 * Calculate relative bullet drop at a distance, relative to zero point.
 *
 * This is the displacement from the sight line at the target distance,
 * given that the rifle is zeroed at zero_distance_m.
 *
 * Uses full numerical trajectory integration with the G1 drag function.
 *
 * Sign convention:
 * - negative = bullet hits HIGH (need to aim lower / dial down)
 * - positive = bullet hits LOW (need to aim higher / dial up)
 *
 * At zero_distance_m, this returns 0.
 */
export function calculateRelativeBulletDrop(
  distance_m: number,
  zero_distance_m: number,
  sight_height_mm: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
): number {
  const sight_height_m = sight_height_mm / 1000;

  const zero_angle = findZeroAngle(
    zero_distance_m, sight_height_mm, muzzle_velocity, ballistic_coefficient, air_density
  );

  const result = integrateTrajectory(
    distance_m, zero_angle, muzzle_velocity, ballistic_coefficient, air_density
  );

  const sight_line_y = sight_height_m;
  const bullet_y = result.y_m;

  const deviation_m = sight_line_y - bullet_y;

  return deviation_m * 1000;
}

/**
 * Calculate wind deflection at a given distance.
 *
 * Uses the lag-time method with the G1 drag function:
 *   deflection = wind_speed * (actual_flight_time - vacuum_flight_time)
 *
 * This is accurate because wind acts on the bullet only during the
 * "extra" time it spends in flight due to drag.
 */
export function calculateWindDeflection(
  distance_m: number,
  wind_speed_ms: number,
  muzzle_velocity: number,
  ballistic_coefficient: number,
  air_density: number
): number {
  const { time: actual_time } = calculateVelocityAtDistance(
    distance_m, muzzle_velocity, ballistic_coefficient, air_density
  );

  const vacuum_time = distance_m / muzzle_velocity;
  const lag_time = actual_time - vacuum_time;

  return wind_speed_ms * lag_time * 1000;
}
