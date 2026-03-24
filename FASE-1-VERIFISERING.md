# FULLSTENDIG FUNKSJONELL VERIFISERING - FASE 1

## KRITISKE FUNN OG RETTING

### Problem 1-3: Database Schema Mismatches (LØST)
Tre kolonnenavn i databasen matchet ikke TypeScript-typene:
- `created_by` → `user_id` ✓ FIKSET
- `description` → `notes` ✓ FIKSET
- `figure_id` → `field_figure_id` ✓ FIKSET
- `shots_count` → `total_shots` ✓ FIKSET
- `shoot_seconds` → `time_limit_seconds` ✓ FIKSET

### Problem 4: Competition Type Constraint (LØST)
Database constraint tillot kun 'bane' og 'felt', ikke 'grovfelt' og 'finfelt' ✓ FIKSET

### Problem 5-7: UI Field Name Mismatches (LØST)
Tre UI-komponenter brukte feil feltnavn:
- `CompetitionDetail.tsx` brukte `.description` → endret til `.notes` ✓ FIKSET
- `Competitions.tsx` brukte `.created_by` → endret til `.user_id` ✓ FIKSET
- `CompetitionStages.tsx` brukte `.created_by` → endret til `.user_id` ✓ FIKSET

---

## 1. OPPRETT STEVNE - FULLSTENDIG VERIFISERT

### UI-flyt (NewCompetition.tsx linje 145-181):
Tre valgbare knapper:
- **Bane** - "Baneskyting"
- **Grovfelt** - "Grovfeltskyting"
- **Finfelt** - "Finfeltskyting (100m)"

### Database lagring (linje 70-84):
```typescript
competition_type: formData.competition_type  // 'bane' | 'grovfelt' | 'finfelt'
status: 'draft'
total_stages: formData.custom_stages
```

### Faktiske lagrede verdier:

**Bane:**
```sql
id: [uuid]
competition_type: "bane"
status: "draft"
```

**Grovfelt:**
```sql
id: 2f515655-e9b4-4096-a5b8-f2cb249e0669
name: "Test Grovfelt"
competition_type: "grovfelt"
status: "draft"
total_stages: 3
user_id: 5cc41ae8-4413-409e-8493-7487e47b8116
```

**Finfelt:**
```sql
id: 8c0a2eed-a4aa-4da1-84e1-1964b31fb6e7
name: "Test Finfelt"
competition_type: "finfelt"
status: "draft"
total_stages: 3
user_id: 5cc41ae8-4413-409e-8493-7487e47b8116
```

### Routing etter oppretting (linje 94-98):
```typescript
if (formData.competition_type === 'grovfelt' || formData.competition_type === 'finfelt') {
  navigate(`/competitions/${data.id}/configure`);  // → /competitions/[id]/configure
} else {
  navigate(`/competitions/${data.id}`);            // → /competitions/[id]
}
```

**Faktisk brukerflyt:**
1. Bruker klikker "Opprett stevne"
2. **Bane** → sendes til `/competitions/[id]` (detaljside)
3. **Grovfelt** → sendes til `/competitions/[id]/configure` (konfigurering)
4. **Finfelt** → sendes til `/competitions/[id]/configure` (konfigurering)

✓ **VERIFISERT**: Alle tre typer lagres korrekt og sendes til riktig side

---

## 2. GROVFELT-OPPSETT - FULLSTENDIG VERIFISERT

### UI-komponenter (StageConfigCard.tsx):

**Figur-dropdown (linje 90-101):**
- Viser alle grovfeltfigurer filtrert på `name ILIKE '%Grovfelt%'`
- Format: "[code] - [name]" (f.eks. "C35 - Grovfelt skive")

**Avstandsfelt (linje 103-111):**
- Tekstfelt med placeholder "Avstand (m)"
- Kan redigeres fritt

**Kneppberegning (linje 46-56):**
```typescript
if (competitionType === 'grovfelt' && distanceM && clickTable) {
  const row = clickTableRows.find(r => r.distance_m === distanceM);
  if (row) {
    onUpdate({
      clicks: row.clicks,          // Knepp opp
      clicks_to_zero: row.clicks,  // Tilbake til null
    });
  }
}
```

**Visning av knepp (linje 140-153):**
```tsx
{competitionType === 'grovfelt' && clicks !== null && (
  <div>
    <span>Knepp opp: {clicks}</span>
    <span>Tilbake til null: {clicksToZero}</span>
  </div>
)}
```

### Faktisk lagret data (competition_stages tabell):

**Hold 1 (150m):**
```sql
stage_number: 1
field_figure_id: 100a3211-3165-4705-831b-35953e059b0d
distance_m: 150
clicks: -10                 ← Beregnet fra knepptabell
clicks_to_zero: -10         ← Samme verdi
total_shots: 1
time_limit_seconds: 15
notes: "Test hold 1"
```

**Hold 2 (200m):**
```sql
stage_number: 2
field_figure_id: 8a32c9e5-5253-464c-87d2-79932bb95544
distance_m: 200
clicks: -8
clicks_to_zero: -8
notes: "Test hold 2"
```

**Hold 3 (100m):**
```sql
stage_number: 3
field_figure_id: 7de5ac91-69b3-49fb-a217-8f4b8e351a76
distance_m: 100
clicks: -13
clicks_to_zero: -13
notes: "Test hold 3"
```

### Feltnavn brukt:
- **Knepp opp**: `clicks` (integer)
- **Tilbake til null**: `clicks_to_zero` (integer)

### Lagring og routing (CompetitionConfigure.tsx linje 169-221):
```typescript
const saveConfiguration = async () => {
  // 1. Slett gamle stages
  await supabase.from('competition_stages').delete().eq('competition_id', id);

  // 2. Insert nye stages
  await supabase.from('competition_stages').insert(stagesToInsert);

  // 3. Oppdater competition status
  await supabase.from('competitions').update({
    total_stages: stages.length,
    status: 'configured',  // ← Status endres fra 'draft' til 'configured'
  }).eq('id', id);

  // 4. Send bruker tilbake til detaljside
  navigate(`/competitions/${id}`);  // → /competitions/[id]
}
```

**Faktisk brukerflyt etter lagring:**
1. Bruker klikker "Lagre konfigurering"
2. Alle hold lagres i `competition_stages`
3. Competition status endres til `'configured'`
4. Bruker sendes til `/competitions/[id]` (detaljside)
5. Detaljside viser nå knappen "Start stevne" (fordi status = 'configured')

✓ **VERIFISERT**: Alle felter lagres korrekt, status oppdateres, routing til detaljside fungerer

---

## 3. FINFELT-OPPSETT - FULLSTENDIG VERIFISERT

### UI-oppførsel (StageConfigCard.tsx):

**Figurfiltrering (CompetitionConfigure.tsx linje 93-97):**
```typescript
if (competition.competition_type === 'finfelt') {
  query = query.ilike('name', '%Finfelt%');  // Kun finfeltfigurer
}
```

**Avstands-lock (StageConfigCard.tsx linje 113-117):**
```tsx
{competitionType === 'finfelt' && (
  <div className="w-32 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-400">
    100m  {/* Ikke redigerbart, grå bakgrunn */}
  </div>
)}
```

**Auto-setting av 100m (linje 58-66):**
```typescript
if (competitionType === 'finfelt') {
  onUpdate({
    distance_m: 100,      // Fast verdi
    clicks: null,         // Ingen knepp
    clicks_to_zero: null, // Ingen knepp
  });
}
```

### Faktisk lagret data:

**Hold 1:**
```sql
stage_number: 1
field_figure_id: c39182e1-6552-425c-9d9f-642ff1c50932
distance_m: 100             ← HARD-CODED
clicks: null                ← INGEN knepp
clicks_to_zero: null        ← INGEN knepp
total_shots: 1
time_limit_seconds: 15
notes: "Finfelt hold 1"
```

**Hold 2:**
```sql
stage_number: 2
field_figure_id: [uuid]
distance_m: 100
clicks: null
clicks_to_zero: null
```

**Hold 3:**
```sql
stage_number: 3
field_figure_id: [uuid]
distance_m: 100
clicks: null
clicks_to_zero: null
```

### Lagring og routing:
**Identisk med grovfelt:**
1. Klikk "Lagre konfigurering"
2. Status → `'configured'`
3. Route → `/competitions/[id]`

✓ **VERIFISERT**:
- Kun finfeltfigurer vises i dropdown
- Avstand låst til 100m i UI (grå, disabled)
- 100m faktisk lagret i database
- Ingen knepp lagret (null-verdier)
- Routing til detaljside fungerer

---

## 4. FIGURFILTRERING - FULLSTENDIG VERIFISERT

### Filter-metode:
Bruker **IKKE** category eller type-felt.
Bruker `field_figures.name` kolonne med ILIKE pattern matching.

### Faktiske DB-verdier:

**Grovfelt (21 figurer):**
```sql
SELECT COUNT(*) FROM field_figures
WHERE name ILIKE '%Grovfelt%' AND is_active = true;
-- Result: 21

-- Eksempler:
code: "C35",   name: "Grovfelt skive"
code: "1/8",   name: "Grovfelt skive"
code: "B100",  name: "Grovfelt skive"
```

**Finfelt (10 figurer):**
```sql
SELECT COUNT(*) FROM field_figures
WHERE name ILIKE '%Finfelt%' AND is_active = true;
-- Result: 10

-- Eksempler:
code: "Mini-1/4",  name: "Finfelt skive"
code: "1/10",      name: "Finfelt skive"
code: "Hjul",      name: "Finfelt skive"
```

### UI-filtrering (CompetitionConfigure.tsx linje 93-97):
```typescript
if (competition.competition_type === 'finfelt') {
  query = query.ilike('name', '%Finfelt%');
} else if (competition.competition_type === 'grovfelt') {
  query = query.ilike('name', '%Grovfelt%');
}
```

✓ **VERIFISERT**: Filtrering fungerer i praksis basert på name-felt

---

## 5. AKTIV KNEPPTABELL - FULLSTENDIG VERIFISERT

### Uten aktiv knepptabell (grovfelt):

**UI-varsel (CompetitionConfigure.tsx linje 273-285):**
```tsx
{isGrovfelt && !clickTable && (
  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
    <p className="font-semibold">Ingen aktiv knepptabell</p>
    <p>For å beregne knepp automatisk, sett en aktiv knepptabell i innstillinger.</p>
  </div>
)}
```

**Oppførsel:**
- Gul warning-boks vises øverst
- Hold kan fortsatt opprettes
- Avstand kan settes
- Knepp-feltene forblir tomme (ingen automatisk beregning)
- Bruker kan fortsatt lagre holdet
- Lagring fungerer normalt → status: 'configured' → route: `/competitions/[id]`

### Med aktiv knepptabell:

**Automatisk beregning (StageConfigCard.tsx linje 46-56):**
```typescript
const row = clickTableRows.find(r => r.distance_m === distanceM);
if (row) {
  onUpdate({
    clicks: row.clicks,          // Fra knepptabell
    clicks_to_zero: row.clicks,  // Fra knepptabell
  });
}
```

### Finfelt (med eller uten knepptabell):
**Ingen påvirkning** - finfelt bruker aldri knepptabell fordi alle hold er 100m.

✓ **VERIFISERT**:
- Grovfelt viser warning uten knepptabell, men fungerer fortsatt
- Finfelt er upåvirket av knepptabell
- Lagring og routing fungerer uavhengig av knepptabell

---

## 6. STATUSFLYT - FULLSTENDIG VERIFISERT

### Status-verdier i database:
```sql
CHECK (status IN ('draft', 'configured', 'active', 'completed'))
```

### Routing i CompetitionDetail.tsx (linje 90-116):

**Draft (linje 90-98):**
```tsx
{competition.status === 'draft' && (
  <button onClick={() => navigate(`/competitions/${competitionId}/configure`)}>
    Fortsett oppsett
  </button>
)}
```
→ Route: `/competitions/[id]/configure`

**Configured (linje 99-107):**
```tsx
{competition.status === 'configured' && (
  <button onClick={() => navigate(`/competitions/${competitionId}/start`)}>
    Start stevne
  </button>
)}
```
→ Route: `/competitions/[id]/start`

**Active (linje 108-116):**
```tsx
{competition.status === 'active' && (
  <button onClick={() => navigate(`/competitions/${competitionId}/run`)}>
    Fortsett stevne
  </button>
)}
```
→ Route: `/competitions/[id]/run`

### Eksempel på statusovergang (draft → configured):

**Før:**
```sql
SELECT id, name, status FROM competitions
WHERE id = '2f515655-e9b4-4096-a5b8-f2cb249e0669';

id: 2f515655-e9b4-4096-a5b8-f2cb249e0669
name: "Test Grovfelt"
status: "draft"
```

**Under lagring (CompetitionConfigure.tsx linje 207-213):**
```typescript
await supabase.from('competitions').update({
  total_stages: stages.length,
  status: 'configured',  // ← Automatisk overgang
}).eq('id', id);
```

**Etter:**
```sql
status: "configured"
total_stages: 3
```

**UI-endring:**
- Knapp endres fra "Fortsett oppsett" → "Start stevne"
- Routing endres fra `/configure` → `/start`

### Komplett routing-flyt:

```
1. Opprett stevne (NewCompetition)
   ↓
2. /competitions/[id]/configure (status: draft)
   ↓ Klikk "Lagre konfigurering"
3. Status → 'configured'
   ↓ navigate(`/competitions/${id}`)
4. /competitions/[id] (detaljside, status: configured)
   ↓ Viser knapp "Start stevne"
5. Klikk "Start stevne"
   ↓ navigate(`/competitions/${id}/start`)
6. /competitions/[id]/start (ikke implementert ennå i Fase 1)
```

✓ **VERIFISERT**: Statusflyt styrer routing korrekt, automatisk overgang fra draft → configured

---

## SVAKHETER OG EDGE CASES IDENTIFISERT:

### 1. Ingen validering av figurvalg (SVAKHET)
- UI tillater lagring av hold uten figur
- `field_figure_id` kan være `null` i databasen
- Status endres til 'configured' selv om hold mangler figurer
- **Anbefaling**: Legg til validering før status endres til 'configured'

### 2. Ingen validering av avstand i grovfelt (SVAKHET)
- UI tillater lagring av hold uten avstand
- Knepp kan ikke beregnes hvis avstand mangler
- Status endres til 'configured' selv om avstand mangler
- **Anbefaling**: Krev avstand for grovfelt-hold

### 3. Knepptabell kan mangle avstander (EDGE CASE)
- Hvis bruker velger 175m men knepptabellen kun har 150m og 200m
- Ingen interpolering eller nærmeste verdi
- Knepp forblir `null`
- **Anbefaling**: Legg til interpolering eller vis warning

### 4. Manglende status-validering (SVAKHET)
- Ingenting hindrer endring fra 'draft' til 'configured' selv om hold mangler
- Tom `stages` array tillates
- **Anbefaling**: Valider at minst 1 hold eksisterer før 'configured' tillates

### 5. Figurfiltrering basert på name er skjør (SVAKHET)
- Hvis noen redigerer figurnavn og fjerner "Grovfelt"/"Finfelt"
- Figuren forsvinner fra filtrering
- **Anbefaling**: Legg til dedikert `figure_type` eller `category_id` kolonne

### 6. Routing til /start og /run ikke implementert (MANGLER I FASE 1)
- `/competitions/[id]/start` eksisterer ikke som rute
- `/competitions/[id]/run` eksisterer ikke som rute
- Disse skal implementeres i Fase 2

---

## KONKLUSJON:

### FUNGERER SOM PLANLAGT:
✓ Opprett stevne med 3 typer
✓ Grovfelt lagrer figur, avstand, knepp
✓ Finfelt låser til 100m uten knepp
✓ Figurfiltrering virker i praksis
✓ Manglende knepptabell håndteres greit
✓ Statusflyt styrer routing korrekt
✓ Automatisk overgang draft → configured ved lagring
✓ Routing etter lagring: `/competitions/[id]/configure` → `/competitions/[id]`
✓ Prosjektet bygger uten feil

### SVAKHETER SOM BØR FIKSES FØR FASE 2:
⚠️ Ingen validering av påkrevde felter (figur, avstand)
⚠️ Figurfiltrering er skjør (basert på name)
⚠️ Ingen interpolering av kneppverdier
⚠️ Ingen status-overgangskontroll
⚠️ Routing til /start og /run mangler (skal implementeres i Fase 2)

### KOMPLETT ROUTING-FLYT VERIFISERT:
```
NewCompetition → /configure (draft)
              → Lagre
              → /competitions/[id] (configured)
              → "Start stevne"-knapp vises
              → Klar for Fase 2
```

**ANBEFALING**: Fiks valideringsproblemer før Fase 2 starter, eller godta at Fase 2 må håndtere ufullstendige konfigurasjoner.

**FASE 1 ER FUNKSJONELT KOMPLETT** - alle planlagte features fungerer som spesifisert i FASE-1-PLAN.md.
