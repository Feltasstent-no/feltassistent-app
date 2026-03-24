import { useState } from 'react';
import { Layout } from '../components/Layout';

/**
 * Wind Calculation Test Page
 *
 * This page demonstrates and logs the exact wind calculation logic
 * to verify that wind corrections are working correctly.
 */
export function WindTest() {
  const [windSpeed, setWindSpeed] = useState(10);
  const [windAngle, setWindAngle] = useState(270);
  const [distance, setDistance] = useState(250);
  const [windClicksPer10ms100m, setWindClicksPer10ms100m] = useState(4.4);

  const [result, setResult] = useState<{
    effective_crosswind: number;
    windClicksPer10ms: number;
    wind_clicks: number;
    formula_breakdown: string[];
  } | null>(null);

  function calculateEffectiveCrosswind(wind_speed_ms: number, wind_angle_deg: number): number {
    const angle_rad = (wind_angle_deg * Math.PI) / 180;
    return Math.abs(wind_speed_ms * Math.sin(angle_rad));
  }

  function testWindCalculation() {
    const steps: string[] = [];

    // Step 1: Calculate effective crosswind
    const angle_rad = (windAngle * Math.PI) / 180;
    steps.push(`Step 1: Convert angle to radians`);
    steps.push(`  angle_rad = (${windAngle} * π) / 180 = ${angle_rad.toFixed(6)}`);

    const sin_value = Math.sin(angle_rad);
    steps.push(`Step 2: Calculate sine of angle`);
    steps.push(`  sin(${angle_rad.toFixed(6)}) = ${sin_value.toFixed(6)}`);

    const effective_crosswind = Math.abs(windSpeed * sin_value);
    steps.push(`Step 3: Calculate effective crosswind`);
    steps.push(`  effective_crosswind = |${windSpeed} * ${sin_value.toFixed(6)}| = ${effective_crosswind.toFixed(6)} m/s`);

    // Step 2: Calculate wind clicks per 10 m/s (DFS-calibrated method)
    const windClicksPer10ms = windClicksPer10ms100m * (distance / 100);

    steps.push(`Step 4: Calculate wind clicks per 10 m/s at ${distance}m`);
    steps.push(`  windClicksPer10ms = wind_clicks_per_10ms_100m * (${distance} / 100)`);
    steps.push(`  windClicksPer10ms = ${windClicksPer10ms100m} * ${(distance / 100).toFixed(2)}`);
    steps.push(`  windClicksPer10ms = ${windClicksPer10ms.toFixed(2)}`);

    // Step 3: Calculate final wind clicks
    const wind_factor = effective_crosswind / 10;
    steps.push(`Step 5: Calculate wind factor`);
    steps.push(`  wind_factor = ${effective_crosswind.toFixed(6)} / 10 = ${wind_factor.toFixed(6)}`);

    const raw_wind_clicks = wind_factor * windClicksPer10ms;
    steps.push(`Step 6: Calculate raw wind clicks`);
    steps.push(`  raw_wind_clicks = ${wind_factor.toFixed(6)} * ${windClicksPer10ms.toFixed(2)} = ${raw_wind_clicks.toFixed(6)}`);

    const wind_clicks = Math.round(raw_wind_clicks);
    steps.push(`Step 7: Round to nearest integer`);
    steps.push(`  wind_clicks = round(${raw_wind_clicks.toFixed(6)}) = ${wind_clicks}`);

    setResult({
      effective_crosswind,
      windClicksPer10ms,
      wind_clicks,
      formula_breakdown: steps
    });
  }

  const quickAngles = [
    { label: '0° (Bakfra)', value: 0 },
    { label: '90° (Høyre)', value: 90 },
    { label: '180° (Forfra)', value: 180 },
    { label: '270° (Venstre)', value: 270 },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Vindberegning Test
          </h1>
          <p className="text-slate-600 mb-6">
            Test og verifiser vindkorreksjon-beregninger med detaljert logging
          </p>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">
              Input-parametere
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vindhastighet (m/s)
                </label>
                <input
                  type="number"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vindretning (grader)
                </label>
                <input
                  type="number"
                  value={windAngle}
                  onChange={(e) => setWindAngle(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Avstand (meter)
                </label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  step="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  wind_clicks_per_10ms_100m
                </label>
                <input
                  type="number"
                  value={windClicksPer10ms100m}
                  onChange={(e) => setWindClicksPer10ms100m(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  step="0.1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  DFS-kalibrert vindkorreksjonsfaktor (typisk 4.0-5.0)
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hurtigvalg vindretning
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {quickAngles.map((angle) => (
                  <button
                    key={angle.value}
                    onClick={() => setWindAngle(angle.value)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      windAngle === angle.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-900 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {angle.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={testWindCalculation}
              className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Beregn vindkorreksjon
            </button>
          </div>

          {result && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4 text-slate-900">
                Resultat
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium mb-1">
                    Effektiv kryssvind
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {result.effective_crosswind.toFixed(2)} m/s
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-600 font-medium mb-1">
                    Knepp per 10 m/s
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {result.windClicksPer10ms.toFixed(2)}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm text-purple-600 font-medium mb-1">
                    Final vindkorreksjon
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {result.wind_clicks} knepp
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Beregningstrinn
                </h3>
                <div className="space-y-1 font-mono text-sm text-slate-700">
                  {result.formula_breakdown.map((step, idx) => (
                    <div
                      key={idx}
                      className={step.startsWith('Step') ? 'font-bold mt-2' : 'ml-4'}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  DFS-kalibrert formel
                </h3>
                <p className="text-sm text-yellow-800">
                  Med 10 m/s vind fra 270° (full kryssvind fra venstre) på 250m:
                  <br />
                  Effektiv kryssvind = 10 m/s
                  <br />
                  Knepp per 10 m/s = 4.4 × (250 / 100) = 11
                  <br />
                  Vindkorreksjon = round((10 / 10) × 11) = <strong>11 knepp</strong>
                  <br />
                  <br />
                  Dette matcher DFS-vindtabeller for typisk 6.5mm oppsett.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
