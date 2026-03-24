# Feltassistent - Dokumentasjon

## Oversikt

Feltassistenten er et komplett system for å hjelpe skyttere i felt med:
- Valg av feltfigur
- Knepp-beregning basert på ballistisk profil
- Skuddlogging for læring og analyse
- Datainnsamling for fremtidige korreksjoner

## Arkitektur

### Databasestruktur

#### Tabeller

**`field_figure_categories`**
- Kategorier for organisering av feltfigurer
- Eksempler: DFS Standard, DFS Trening, Presisjon, Annet

**`field_figures`** (eksisterende tabell, utvidet)
- Komplett katalog over feltfigurer
- Nye felt:
  - `category_id` - Link til kategori
  - `width_mm` / `height_mm` - Fysiske dimensjoner
  - `aim_points` - JSONB array med siktepunkter
  - `usage_notes` - Tips for bruk av figuren

**`shot_logs`**
- Individuelle skuddregistreringer
- Felter for læring og analyse:
  - `recommended_clicks` vs `actual_clicks` - Avvik fra anbefaling
  - `result` - hit / miss / near_miss
  - `impact_offset_x_mm` / `impact_offset_y_mm` - Presisjon (valgfritt)
  - `wind_direction`, `wind_speed_ms` - Vindforhold
  - `temperature_c`, `light_conditions` - Andre forhold

### Filstruktur

```
src/
├── lib/
│   ├── field-assistant.ts          # Service-lag for feltassistent
│   ├── ballistics.ts                # Ballistikkmotor (uendret)
│   ├── ballistics-physics.ts       # Fysikklag (uendret)
│   └── ballistics-dfs.ts            # DFS-kalibrering (uendret)
│
├── components/
│   ├── FieldFigureCard.tsx          # Figurkort for valg
│   ├── ShotRecommendationDisplay.tsx # Visning av knepp-anbefaling
│   └── ShotLogDialog.tsx            # Dialog for skuddlogging
│
├── pages/
│   └── FieldAssistant.tsx           # Hovedside for feltassistent
│
└── types/
    └── database.ts                  # TypeScript-typer (utvidet)
```

## Brukerflyt

### Steg 1: Velg ballistisk profil
Bruker velger hvilken ammunisjon/våpen-kombinasjon som skal brukes

### Steg 2: Velg feltfigur
Bruker velger fra katalog over DFS-figurer eller andre mål

### Steg 3: Angi parametere
- Avstand (m)
- Vindstyrke (m/s) - valgfritt
- Vindretning - valgfritt

### Steg 4: Få anbefaling
Systemet beregner og viser:
- **Høydekorreksjon** (knepp)
- **Vindkorreksjon** (knepp) - hvis vind angitt
- Notater og advarsler
- Informasjon om ballistisk profil

### Steg 5: Logg skudd
Etter skutt:
- Registrer resultat (Treff / Nesten / Bom)
- Angi faktisk brukt knepp
- Legg til notater hvis ønskelig
- Lagre for senere analyse

## Service-API

### `field-assistant.ts`

**getFieldFigureCategories()**
```typescript
Promise<FieldFigureCategory[]>
```
Henter alle aktive kategorier

**getFieldFigures(categoryId?: string)**
```typescript
Promise<FieldFigure[]>
```
Henter aktive figurer, eventuelt filtrert på kategori

**calculateShotRecommendation()**
```typescript
Promise<ShotRecommendation>
```
Beregner komplett anbefaling for gitt:
- distance_m
- figure
- profile
- wind_speed_ms (optional)
- wind_direction (optional)

**logShot()**
```typescript
Promise<ShotLog>
```
Lagrer et skudd med:
- Anbefalt vs faktisk knepp
- Resultat
- Forhold

**getRecentShotLogs()**
```typescript
Promise<ShotLog[]>
```
Henter brukerens siste skudd

**getShotLogsByProfile()**
```typescript
Promise<ShotLog[]>
```
Henter skudd for en spesifikk ballistisk profil

**calculateAccuracyStats()**
```typescript
Promise<AccuracyStats>
```
Beregner treffsikkerhet og statistikk

## Datamodell for Skuddlogg

```typescript
interface ShotLog {
  id: string;
  user_id: string;

  // Kontekst
  ballistic_profile_id: string | null;
  field_figure_id: string | null;
  competition_id: string | null;
  training_entry_id: string | null;

  // Skudddata
  distance_m: number;
  recommended_clicks: number;       // Hva appen anbefalte
  actual_clicks: number;            // Hva skytter brukte

  // Vind
  wind_direction: string | null;
  wind_speed_ms: number | null;
  recommended_wind_clicks: number | null;
  actual_wind_clicks: number | null;

  // Resultat
  result: 'hit' | 'miss' | 'near_miss';
  impact_offset_x_mm: number | null;  // Avvik fra siktemål
  impact_offset_y_mm: number | null;

  // Forhold
  temperature_c: number | null;
  light_conditions: string | null;

  // Notater
  notes: string | null;
  tags: string[] | null;

  // Tidspunkt
  shot_at: string;
  created_at: string;
}
```

## Fremtidige Forbedringer

### Personlig Læring (Fase 2)
Systemet er designet for å støtte:

1. **Avviksanalyse**
   - Sammenlign anbefalt vs faktisk knepp
   - Finn systematiske avvik per avstand
   - Identifiser trender

2. **Personlige Korreksjoner**
   - Basert på historiske data
   - "Du treffer vanligvis 1 knepp lavere på 400m"
   - Justering av anbefalinger over tid

3. **Vindlæring**
   - Analyse av vindkorreksjon vs resultat
   - Forbedrede vindestimater
   - Personlige vindkorreksjoner

4. **Maskinlæring (senere)**
   - Prediktive modeller
   - Multi-faktor korreksjon
   - Automatisk tilpasning

### Datastruktur for Læring

Alle nødvendige felter er allerede på plass:
- Anbefalt vs faktisk (avvik)
- Resultat (suksess/feil)
- Forhold (vind, temperatur, lys)
- Kontekst (profil, figur, avstand)

## Tekniske Detaljer

### Sikkerhet (RLS)
- `field_figure_categories`: Les for alle autentiserte
- `field_figures`: Les for alle autentiserte
- `shot_logs`: Full CRUD kun for egen bruker

### Performance
- Indexer på: user_id, profile_id, figure_id, shot_at
- Paginering støttet via limit parameter
- Effektiv filtrering på kategori og profil

### Validering
- Required fields enforced i database
- TypeScript types sikrer type-safety
- Result enum håndteres korrekt

## Bruk i Eksisterende Flows

### Integrasjon med Konkurranser
`competition_id` feltet tillater kobling av skuddlogg til stevner

### Integrasjon med Trening
`training_entry_id` feltet tillater kobling til treningsøkter

### Integrasjon med Ballistikk
`ballistic_profile_id` feltet sikrer at alle skudd kan spores tilbake til riktig ammunisjon/våpen

## Testing

Systemet er bygget og integrert med:
- ✅ Database schema migrert
- ✅ TypeScript types oppdatert
- ✅ Service-lag implementert
- ✅ Komponenter opprettet
- ✅ Hovedside ferdig
- ✅ Navigation oppdatert
- ✅ Build passerer

## Konklusjon

Feltassistenten er nå klar for bruk med:
- **Komplett figurkatalog** (bruker eksisterende DFS-figurer)
- **Presis knepp-beregning** (via eksisterende ballistikkmotor)
- **Enkel skuddlogging** (for fremtidig læring)
- **Skalerbar arkitektur** (klar for ML-funksjoner senere)

Ballistikkmodellen forblir uendret og fortsetter å bruke Busk Standard som primær DFS-modell.
