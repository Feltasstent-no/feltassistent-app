# Fase 1: Hold-basert stevneoppsett med Grovfelt/Finfelt-skille

## Mål
Ombygge "Opprett Feltstevne" til å støtte:
1. Tydelig skille mellom Grovfelt og Finfelt
2. Hold-for-hold oppsett før stevnet starter
3. Lagring av komplett holdliste med figur, avstand og knepp

## Datamodell-endringer

### Nye kolonner i `competitions` tabell:
```sql
- competition_type: 'grovfelt' | 'finfelt' | 'bane' (existing 'felt' skal mappes til 'grovfelt')
```

### Eksisterende `competition_stages` tabell er allerede klar:
- stage_number: number
- field_figure_id: string
- distance_m: number
- clicks: number
- total_shots: number
- time_limit_seconds: number
- name, description, notes

### Nye kolonner i `competition_stages`:
```sql
- image_url: string | null (for gravlapp/bilde per hold)
- clicks_to_zero: number | null (knepp tilbake til nullpunkt etter hold)
- status: 'pending' | 'active' | 'completed' (for gjennomføring)
- started_at: timestamp | null
- completed_at: timestamp | null
```

## Komponent-endringer

### 1. NewCompetition.tsx (src/pages/NewCompetition.tsx)
**Eksisterende:** Enkel form med valg mellom bane/felt

**Ny oppførsel:**
- Split "felt" til "Grovfelt" og "Finfelt"
- Når Finfelt velges: forhåndsvis at alle hold blir 100m
- Når Grovfelt velges: vis at avstand velges per hold
- Fjern "Opprett og gå til stages" - i stedet "Opprett og konfigurer hold"

### 2. CompetitionStages.tsx (NY SIDE)
**Path:** `/competitions/:id/configure`

**Formål:** Hold-for-hold konfigurasjon før stevnet starter

**Layout for Grovfelt:**
```
[Hold 1]
- Velg figur (dropdown med alle feltfigurer)
- Velg avstand (input eller dropdown)
- Vis beregnede knepp fra aktiv knepptabell
- Vis knepp tilbake til null
- Notater (valgfritt)

[Hold 2]
...

[Lagre stevne]
```

**Layout for Finfelt:**
```
[Notis: Alle hold er 100m]

[Hold 1]
- Velg figur (kun finfeltfigurer)
- Notater (valgfritt)

[Hold 2]
...

[Før første hold: Husk å stille fra 15m til 100m]
[Etter siste hold: Husk å stille tilbake fra 100m til 15m]

[Lagre stevne]
```

### 3. CompetitionDetail.tsx (endring)
**Eksisterende:** Viser stevneinfo og knapp til stages

**Ny oppførsel:**
- Hvis status = 'draft': vis "Fortsett oppsett"
- Hvis status = 'configured': vis "Start stevne"
- Hvis status = 'active': vis "Fortsett stevne"
- Hvis status = 'completed': vis oppsummering

## Felt-kategorier (Field Figure Categories)

Fra databasen finnes allerede:
- Grovfelt (category_id)
- Finfelt (category_id)

Brukes til å filtrere figurer basert på stevnetype.

## Flyt

### Opprette Grovfelt-stevne:
1. NewCompetition → Velg "Grovfelt", fyll inn navn, dato, sted
2. Klikk "Opprett Feltstevne"
3. → `/competitions/:id/configure` (CompetitionStages)
4. For hvert hold: velg figur, angi avstand, se knepp
5. Klikk "Lagre stevne" → status = 'configured'
6. → `/competitions/:id` (CompetitionDetail)

### Opprette Finfelt-stevne:
1. NewCompetition → Velg "Finfelt", fyll inn navn, dato, sted
2. Klikk "Opprett Feltstevne"
3. → `/competitions/:id/configure` (CompetitionStages)
4. For hvert hold: velg figur (kun finfelt)
5. Alle hold er automatisk 100m
6. Vis veiledning om innstilling før/etter
7. Klikk "Lagre stevne" → status = 'configured'
8. → `/competitions/:id` (CompetitionDetail)

## Database migrations

### Migration 1: Add competition_type variations
```sql
-- competitions tabell har allerede competition_type
-- Vi bruker verdiene:
-- 'bane' (eksisterende)
-- 'grovfelt' (ny, men 'felt' kan mappes til denne)
-- 'finfelt' (ny)

-- Ingen endring nødvendig i schema, kun i applogikk
```

### Migration 2: Extend competition_stages
```sql
ALTER TABLE competition_stages
ADD COLUMN image_url text,
ADD COLUMN clicks_to_zero integer,
ADD COLUMN status text DEFAULT 'pending',
ADD COLUMN started_at timestamptz,
ADD COLUMN completed_at timestamptz;
```

## TypeScript types

### Oppdater CompetitionTemplate interface:
```typescript
export interface CompetitionTemplate {
  // ... existing fields
  competition_type: 'bane' | 'grovfelt' | 'finfelt';
  field_figure_category_id: string | null; // filter figures
  distance_mode: 'kjent' | 'ukjent' | 'blandet' | null;
  default_stages: number;
  default_shots_per_stage: number;
  default_shoot_time: number;
  default_prep_time: number;
}
```

### Oppdater CompetitionStage interface:
```typescript
export interface CompetitionStage {
  // ... existing fields
  image_url: string | null;
  clicks_to_zero: number | null;
  status: 'pending' | 'active' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}
```

## Fil-struktur

```
src/pages/
  - NewCompetition.tsx (MODIFY)
  - CompetitionStages.tsx (NEW) - hold-konfigurasjon
  - CompetitionDetail.tsx (MODIFY)
  - CompetitionRun.tsx (FUTURE - Fase 2)

src/components/
  - StageConfigCard.tsx (NEW) - enkelt hold i konfigurasjon
  - FieldFigureSelectorByCategory.tsx (NEW) - filtrer figurer
```

## Neste steg (kun Fase 1)

1. Lag database migration for competition_stages
2. Oppdater TypeScript types
3. Lag CompetitionStages.tsx (holdkonfigurasjon)
4. Lag StageConfigCard.tsx komponent
5. Oppdater NewCompetition.tsx med grovfelt/finfelt-valg
6. Test hele flyten

## Ikke inkludert i Fase 1
- Feltklokke-integrasjon (Fase 2)
- Hold-for-hold gjennomføring (Fase 2)
- Bilde-opplasting per hold (Fase 3)
- Oppsummering (Fase 3)
