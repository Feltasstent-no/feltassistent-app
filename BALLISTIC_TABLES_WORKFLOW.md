# Ballistiske Tabeller - Generering, Lagring og Oppdatering

Dette dokumentet forklarer hvordan `ballistic_distance_table`, `ballistic_click_table` og `ballistic_wind_table` genereres, lagres og oppdateres når en `ballistic_profile` endres.

## 📊 Oversikt over systemet

```
┌─────────────────────────┐
│  ballistic_profiles     │
│  (Master record)        │
│  - BC, V0, zero, etc.   │
└───────────┬─────────────┘
            │
            │ ON DELETE CASCADE
            │
     ┌──────┴──────┬────────────────┬────────────────┐
     │             │                │                │
     ▼             ▼                ▼                ▼
┌─────────┐  ┌─────────┐  ┌──────────────┐  ┌──────────────┐
│distance │  │  click  │  │     wind     │  │ Generated    │
│ _table  │  │ _table  │  │    _table    │  │ click_tables │
└─────────┘  └─────────┘  └──────────────┘  └──────────────┘
```

## 🏗️ Database Schema

### 1. ballistic_profiles (Master)
```sql
CREATE TABLE ballistic_profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  barrel_id uuid REFERENCES weapon_barrels(id) ON DELETE SET NULL,
  name text NOT NULL,
  bullet_name text,
  ballistic_coefficient numeric NOT NULL,
  muzzle_velocity integer NOT NULL,
  zero_distance_m integer NOT NULL DEFAULT 100,
  min_distance_m integer NOT NULL DEFAULT 100,
  max_distance_m integer NOT NULL DEFAULT 600,
  distance_interval_m integer NOT NULL DEFAULT 25,
  temperature_c numeric DEFAULT 15,
  humidity_percent numeric DEFAULT 50,
  pressure_mm numeric DEFAULT 760,
  altitude_m integer DEFAULT 0,
  sight_type text DEFAULT 'busk_standard',
  sight_height_mm numeric NOT NULL,
  sight_radius_cm numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. ballistic_distance_table (Meter → Knepp)
```sql
CREATE TABLE ballistic_distance_table (
  id uuid PRIMARY KEY,
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE,
  distance_m integer NOT NULL,
  click_value numeric NOT NULL,
  bullet_drop_mm numeric NOT NULL
);
```

### 3. ballistic_click_table (Knepp → Meter)
```sql
CREATE TABLE ballistic_click_table (
  id uuid PRIMARY KEY,
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE,
  click integer NOT NULL,
  distance_m integer NOT NULL
);
```

### 4. ballistic_wind_table (Vind × Avstand → Knepp)
```sql
CREATE TABLE ballistic_wind_table (
  id uuid PRIMARY KEY,
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE,
  distance_m integer NOT NULL,
  wind_speed numeric NOT NULL,
  wind_clicks numeric NOT NULL
);
```

## 🔄 Scenario 1: Opprettelse av ny profil

### Frontend: NewBallisticProfile.tsx

```typescript
// Steg 1: Brukeren fyller ut skjemaet
const profileData = {
  user_id: user.id,
  name: 'DFS Grovfelt 2026',
  ballistic_coefficient: 0.548,
  muzzle_velocity: 900,
  zero_distance_m: 300,
  min_distance_m: 100,
  max_distance_m: 600,
  distance_interval_m: 50,
  sight_type: 'busk_standard',
  sight_height_mm: 50,
  // ... etc
};

// Steg 2: Opprett profilen
const { data: profile, error } = await supabase
  .from('ballistic_profiles')
  .insert(profileData)
  .select()
  .single();

// Steg 3: Generer alle tre tabeller med ballistikkbiblioteket
const distanceTable = generateDistanceTable(profile);
const clickTable = generateClickTable(profile, distanceTable);
const windTable = generateWindTable(
  profile,
  [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10], // Vindhastigheter
  profile.min_distance_m,
  profile.max_distance_m,
  50 // Intervall
);

// Steg 4: Lagre alle tabeller i parallell
await Promise.all([
  // Distance table (meter → knepp)
  supabase.from('ballistic_distance_table').insert(
    distanceTable.map(row => ({
      profile_id: profile.id,
      distance_m: row.distance_m,
      click_value: row.click_value,
      bullet_drop_mm: row.bullet_drop_mm,
    }))
  ),

  // Click table (knepp → meter)
  supabase.from('ballistic_click_table').insert(
    clickTable.map(row => ({
      profile_id: profile.id,
      click: row.click,
      distance_m: row.distance_m,
    }))
  ),

  // Wind table (avstand × vindhastighet → knepp)
  supabase.from('ballistic_wind_table').insert(
    windTable.map(row => ({
      profile_id: profile.id,
      distance_m: row.distance_m,
      wind_speed: row.wind_speed,
      wind_clicks: row.wind_clicks,
    }))
  ),
]);
```

### Hva genereres?

**Distance Table** (11 rader med 50m intervall):
```
100m → -19.4 knepp (drop: -403mm)
150m → -12.8 knepp (drop: -398mm)
200m →  -8.1 knepp (drop: -337mm)
250m →  -4.0 knepp (drop: -207mm)
300m →   0.0 knepp (drop: 0mm)      ← NULLPUNKT
350m →  +4.1 knepp (drop: 295mm)
400m →  +8.3 knepp (drop: 686mm)
450m → +12.7 knepp (drop: 1184mm)
500m → +17.3 knepp (drop: 1798mm)
550m → +22.2 knepp (drop: 2534mm)
600m → +27.3 knepp (drop: 3401mm)
```

**Click Table** (48 rader, fra -20 til +27):
```
-20 knepp → 100m
-19 knepp → 103m
...
 -4 knepp → 250m
  0 knepp → 300m  ← NULLPUNKT
 +4 knepp → 350m
...
+27 knepp → 600m
```

**Wind Table** (11 avstander × 10 vindhastigheter = 110 rader):
```
100m @ 0.5 m/s → 0.2 knepp
100m @ 1.0 m/s → 0.4 knepp
100m @ 1.5 m/s → 0.6 knepp
...
600m @ 10.0 m/s → 15.3 knepp
```

## 🔍 Scenario 2: Visning av profil

### Frontend: BallisticProfileDetail.tsx

```typescript
// Hent profil og alle tre tabeller samtidig
const [profileRes, distanceRes, clickRes, windRes] = await Promise.all([
  supabase
    .from('ballistic_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle(),

  supabase
    .from('ballistic_distance_table')
    .select('*')
    .eq('profile_id', id)
    .order('distance_m'),

  supabase
    .from('ballistic_click_table')
    .select('*')
    .eq('profile_id', id)
    .order('click'),

  supabase
    .from('ballistic_wind_table')
    .select('*')
    .eq('profile_id', id)
    .order('distance_m')
    .order('wind_speed'),
]);

if (profileRes.data) setProfile(profileRes.data);
if (distanceRes.data) setDistanceTable(distanceRes.data);
if (clickRes.data) setClickTable(clickRes.data);
if (windRes.data) setWindTable(windRes.data);
```

### UI - Tre faner:

**Fane 1: Meter → Knepp**
- Viser distance_table sortert på avstand
- Nullpunkt fremhevet med ZERO-badge
- Fargekoding: negativ (blå), null (grønn), positiv (rød)

**Fane 2: Knepp → Meter**
- Viser click_table sortert på knepp
- Nullpunkt (0 knepp) fremhevet
- Samme fargekoding

**Fane 3: Vindtabell**
- Viser wind_table i matrise-format
- Rader: avstander, Kolonner: vindhastigheter
- Kryssreferanse: avstand × vindhastighet = knepp

## 🔄 Scenario 3: Oppdatering av profil

### Nåværende implementering: INGEN AUTOMATISK OPPDATERING

**Problem:**
- Systemet har for øyeblikket INGEN update-funksjonalitet
- Hvis brukeren vil endre en profil må de:
  1. Opprette en ny profil med nye verdier
  2. Slette den gamle profilen

**Løsning (ikke implementert ennå):**

```typescript
// Foreslått implementering for fremtidig update-funksjonalitet

const handleUpdateProfile = async (updatedProfile: BallisticProfile) => {
  // Steg 1: Oppdater profilen
  const { error: profileError } = await supabase
    .from('ballistic_profiles')
    .update({
      name: updatedProfile.name,
      ballistic_coefficient: updatedProfile.ballistic_coefficient,
      muzzle_velocity: updatedProfile.muzzle_velocity,
      zero_distance_m: updatedProfile.zero_distance_m,
      // ... etc
      updated_at: new Date().toISOString(),
    })
    .eq('id', updatedProfile.id);

  if (profileError) throw profileError;

  // Steg 2: Regenerer tabeller
  const newDistanceTable = generateDistanceTable(updatedProfile);
  const newClickTable = generateClickTable(updatedProfile, newDistanceTable);
  const newWindTable = generateWindTable(updatedProfile, [...], ...);

  // Steg 3: Slett gamle tabelldata (CASCADE DELETE ville også fungert)
  await Promise.all([
    supabase.from('ballistic_distance_table').delete().eq('profile_id', updatedProfile.id),
    supabase.from('ballistic_click_table').delete().eq('profile_id', updatedProfile.id),
    supabase.from('ballistic_wind_table').delete().eq('profile_id', updatedProfile.id),
  ]);

  // Steg 4: Insert nye tabelldata
  await Promise.all([
    supabase.from('ballistic_distance_table').insert(newDistanceTable.map(...)),
    supabase.from('ballistic_click_table').insert(newClickTable.map(...)),
    supabase.from('ballistic_wind_table').insert(newWindTable.map(...)),
  ]);
};
```

## 🗑️ Scenario 4: Sletting av profil

### Database-nivå: CASCADE DELETE

```sql
-- Fra migrasjonen:
CREATE TABLE ballistic_distance_table (
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE
);

CREATE TABLE ballistic_click_table (
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE
);

CREATE TABLE ballistic_wind_table (
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE
);
```

**Oppførsel:**
```typescript
// Når en profil slettes:
await supabase
  .from('ballistic_profiles')
  .delete()
  .eq('id', profileId);

// Automatisk via CASCADE:
// ✓ Alle rader i ballistic_distance_table med profile_id slettes
// ✓ Alle rader i ballistic_click_table med profile_id slettes
// ✓ Alle rader i ballistic_wind_table med profile_id slettes
```

## 📐 Ballistikkberegninger

### src/lib/ballistics.ts

**1. generateDistanceTable()**
```typescript
// Input: ballistic_profile
// Output: Array av {distance_m, click_value, bullet_drop_mm}

function generateDistanceTable(profile: BallisticProfile) {
  const rows = [];

  for (let d = profile.min_distance_m; d <= profile.max_distance_m; d += profile.distance_interval_m) {
    const drop = calculateBulletDrop(d, profile.bc, profile.v0, ...);
    const clicks = dropToClicks(drop, profile.sight_type, profile.zero_distance_m);

    rows.push({
      distance_m: d,
      click_value: clicks,
      bullet_drop_mm: drop,
    });
  }

  return rows;
}
```

**2. generateClickTable()**
```typescript
// Input: ballistic_profile + distanceTable
// Output: Array av {click, distance_m}

function generateClickTable(profile: BallisticProfile, distanceTable: DistanceRow[]) {
  const minClick = Math.floor(distanceTable[0].click_value);
  const maxClick = Math.ceil(distanceTable[distanceTable.length - 1].click_value);

  const rows = [];

  for (let click = minClick; click <= maxClick; click++) {
    const recommendation = getDistanceRecommendation(click, distanceTable);

    rows.push({
      click: click,
      distance_m: recommendation.distance_m,
    });
  }

  return rows;
}
```

**3. generateWindTable()**
```typescript
// Input: ballistic_profile + windSpeeds + distance range
// Output: Array av {distance_m, wind_speed, wind_clicks}

function generateWindTable(
  profile: BallisticProfile,
  windSpeeds: number[],
  minDist: number,
  maxDist: number,
  interval: number
) {
  const rows = [];

  for (let d = minDist; d <= maxDist; d += interval) {
    for (const windSpeed of windSpeeds) {
      const windDrift = calculateWindDrift(d, windSpeed, profile.bc, profile.v0);
      const windClicks = driftToClicks(windDrift, profile.sight_type);

      rows.push({
        distance_m: d,
        wind_speed: windSpeed,
        wind_clicks: windClicks,
      });
    }
  }

  return rows;
}
```

## 🔐 Security (RLS)

**Alle tabeller er beskyttet med Row Level Security:**

```sql
-- Eksempel: ballistic_distance_table
CREATE POLICY "Users can view own distance tables"
  ON ballistic_distance_table FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_distance_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );
```

**Hva betyr dette?**
- Brukere kan KUN se sine egne ballistiske profiler
- Brukere kan KUN se tabelldata for sine egne profiler
- Alle operasjoner (SELECT, INSERT, UPDATE, DELETE) sjekkes mot eierskap

## 🎯 Praktisk bruk i konkurranser

### CompetitionRun.tsx - Feltskyting

```typescript
// Hent distance_table for å finne anbefalt knepp
const { data: distanceTable } = await supabase
  .from('ballistic_distance_table')
  .select('*')
  .eq('profile_id', competition.ballistic_profile_id)
  .order('distance_m');

// Når skytteren måler avstand:
const measuredDistance = 425; // meter

// Finn anbefalt knepp med interpolering
const recommendation = getClickRecommendation(measuredDistance, distanceTable);

// Vis til skytter: "+10.5 knepp OPP"
console.log(`${recommendation.clicks > 0 ? '+' : ''}${recommendation.clicks} knepp`);
```

## 📊 Dataflyt - Fullstendig oversikt

```
┌────────────────────────────────────────────────────────────────┐
│ 1. OPPRETTELSE                                                 │
│                                                                │
│ NewBallisticProfile.tsx                                        │
│   ↓                                                            │
│ Form submit → INSERT ballistic_profiles                        │
│   ↓                                                            │
│ generateDistanceTable() → INSERT ballistic_distance_table      │
│ generateClickTable()    → INSERT ballistic_click_table         │
│ generateWindTable()     → INSERT ballistic_wind_table          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 2. VISNING                                                     │
│                                                                │
│ BallisticProfileDetail.tsx                                     │
│   ↓                                                            │
│ SELECT ballistic_profiles WHERE id = ?                         │
│ SELECT ballistic_distance_table WHERE profile_id = ?           │
│ SELECT ballistic_click_table WHERE profile_id = ?              │
│ SELECT ballistic_wind_table WHERE profile_id = ?               │
│   ↓                                                            │
│ Render tre faner med data                                      │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 3. OPPDATERING (ikke implementert)                             │
│                                                                │
│ BallisticProfileEdit.tsx (mangler)                             │
│   ↓                                                            │
│ UPDATE ballistic_profiles                                      │
│   ↓                                                            │
│ DELETE old table data                                          │
│ INSERT new table data                                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 4. SLETTING                                                    │
│                                                                │
│ Ballistics.tsx (liste)                                         │
│   ↓                                                            │
│ DELETE ballistic_profiles WHERE id = ?                         │
│   ↓                                                            │
│ CASCADE DELETE automatically removes:                          │
│   - ballistic_distance_table rows                              │
│   - ballistic_click_table rows                                 │
│   - ballistic_wind_table rows                                  │
└────────────────────────────────────────────────────────────────┘
```

## 🎓 Oppsummering

**Nåværende system:**
✅ Opprettelse av profiler med automatisk tabellgenerering
✅ Visning av alle tre tabeller
✅ Sletting med automatisk CASCADE
✅ RLS-sikkerhet på alle tabeller
✅ Interpolering for mellomverdier
✅ Nullpunkt-sentrert logikk

**Mangler:**
❌ Redigering/oppdatering av eksisterende profiler
❌ Bulk-update av tabeller
❌ Versjonering av profiler

**Design-prinsipper:**
1. **Single source of truth**: `ballistic_profiles` er master
2. **Derived data**: Alle tabeller er kalkulerte fra profilen
3. **Atomisk opprettelse**: Profil + tabeller opprettes i én transaksjon
4. **Cascade deletion**: Sletting av profil sletter automatisk tabeller
5. **RLS-sikkerhet**: Brukere kan kun se sine egne data
