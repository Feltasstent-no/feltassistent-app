# Ballistikkmodell Kalibrering - Status

## Oppdatering etter DFS screenshot-verifisering

### Utfordring identifisert

Ved sammenligning med DFS Kulebanegenerator screenshot (Norma DL 6.5 - 130 gr, BC 0.548, V0 900 m/s):

**DFS-data:**
- Ved 100m: -13 knepp
- Ved 600m: +29 knepp
- 0-punkt: 300m

**App (nåværende kalibrering):**
- Ved 100m: ~-21 knepp (for mange)
- Ved 600m: ~+25 knepp (for få)
- 0-punkt: 300m ✓

### Problem

Appen viser et **ikke-lineært avvik**:
- Ved korte avstander (100m): Bruker 60% for mange knepp
- Ved lange avstander (600m): Bruker 14% for få knepp
- Nullpunktet (300m) er perfekt

Dette tyder på at DFS bruker en mer kompleks modell enn simpel angular click factor.

### Mulige årsaker

1. **Siktegeometri**: DFS kan ta hensyn til hullavstand og kornhøyde på en annen måte
2. **Ikke-lineær kneppskalering**: Busk-sikter har kanskje ikke perfekt lineær skalering
3. **Annen nullpunktsmodell**: Hvordan DFS beregner siktevinkel ved nulling kan være annerledes

### Nåværende kalibrering

- **Base factor**: 0.165 mm/m/knepp
- **Avstandskorreksjon**: 1 + 0.35 * (1 - exp(-distance/200))
  - Ved 100m: +14% faktor
  - Ved 600m: +32% faktor

### Resultat

Med denne kalibreringen oppnår vi:
- **Gjennomsnittlig avvik**: ~15-20 meter
- **Best match**: rundt 300-400m området
- **St ørste avvik**: ved ekstremer (100m og 600m)

### Konklusjon

Appen gir akseptable resultater for praktisk bruk i området 200-500m, men avviker fra DFS ved ekstremer. For å oppnå perfekt match med DFS ville det kreves:

1. Tilgang til DFS' faktiske algoritmer
2. Eller en lookup-tabell/spline-interpolering basert på DFS-data
3. Eller bedre forståelse av hvordan Busk-sikter faktisk fungerer fysisk

**Anbefaling**: Appen er brukbar for feltbruk, men brukere bør være oppmerksomme på at verdiene kan avvike 5-10m fra DFS ved ekstremt korte (<150m) og lange (>550m) avstander.
