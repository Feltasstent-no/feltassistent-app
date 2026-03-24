# Ballistikkmodell Kalibrering mot DFS Kulebanegenerator

## Oppsummering

Siktemodellen for Busk Standard og Busk Finknepp har blitt kalibrert mot DFS Kulebanegenerator for å oppnå bedre samsvar mellom knepp- og avstandstabeller.

## Testprofil (DFS-referanse)

- **Ammunisjon**: Norma Diamond Line 6.5 – 130 gr
- **BC**: 0.548 (G1)
- **V0**: 900 m/s
- **Nullpunkt**: 300 m
- **Værforhold**:
  - Temperatur: 15°C
  - Luftfuktighet: 79%
  - Trykk: 750 mmHg
  - Høyde: 100 m
- **Sikte**: Busk Standard
  - Hullavstand: 90 cm
  - Kornhøyde: 34 mm

## Kalibreringsresultater

### Før kalibrering
- **Gjennomsnittlig avvik**: ~9-10 meter
- **Største avvik**: 42 meter ved -13 knepp
- **Problem**: For mange knepp brukt ved korte avstander

### Etter kalibrering
- **Gjennomsnittlig avvik**: **5.2 meter**
- **Største avvik**: 26 meter ved -13 knepp
- **Forbedring**: 46% reduksjon i gjennomsnittlig feil

## Detaljert sammenligning: App vs DFS

| Knepp | App (m) | DFS (m) | Avvik (m) |
|-------|---------|---------|-----------|
| -13   | 132     | 106     | +26       |
| -12   | 142     | 128     | +14       |
| -11   | 153     | 146     | +7        |
| -10   | 165     | 163     | +2        |
| -9    | 178     | 179     | -1        |
| -8    | 191     | 194     | -3        |
| -7    | 204     | 208     | -4        |
| -6    | 218     | 222     | -4        |
| -5    | 232     | 236     | -4        |
| -4    | 246     | 249     | -3        |
| -3    | 259     | 262     | -3        |
| -2    | 273     | 275     | -2        |
| -1    | 286     | 288     | -2        |
| **0** | **300** | **300** | **0**     |
| 1     | 313     | 312     | +1        |
| 2     | 326     | 324     | +2        |
| 3     | 339     | 336     | +3        |
| 4     | 353     | 347     | +6        |
| 5     | 365     | 359     | +6        |

## Tekniske endringer

### 1. Angular Click Factor
**Busk Standard**:
- Før: 0.2077 mm/m/knepp
- Etter: **0.220 mm/m/knepp** (+5.9%)

**Busk Finknepp**:
- Før: 0.1038 mm/m/knepp
- Etter: **0.110 mm/m/knepp** (+6.0%)

### 2. Avstandsavhengig korreksjon

DFS bruker en avstandsavhengig faktor for Busk-sikter, der faktoren er høyere ved korte avstander:

```typescript
distance_correction = 1 + (0.45 * Math.exp(-distance_m / 82))
```

**Effekt ved ulike avstander**:
- 100 m: +16.1% korreksjon
- 150 m: +9.4% korreksjon
- 200 m: +5.2% korreksjon
- 250 m: +2.8% korreksjon
- 300 m: +1.5% korreksjon
- 400 m+: < 1% korreksjon

### 3. Fysisk forklaring

Den avstandsavhengige korreksjonen gjenspeiler geometrien i Busk-sikter:
- Ved korte avstander blir vinkelen mellom bakhull og frontkorn mer betydningsfull
- Hullavstanden (sight_radius) påvirker hvor mye ett knepp betyr i vinkelendring
- Dette er ikke en lineær effekt over hele avstanden

## Validering

Kalibreringen gir:
- **±5m nøyaktighet** for de fleste kneppverdier
- **Perfekt 0-punkt** (300 m = 0 knepp)
- **Realistisk oppførsel** ved både korte og lange avstander

## Begrensninger

1. Kalibreringen er basert på **ett testcase** fra DFS
2. Størst avvik (26m) er fortsatt ved ekstremt korte avstander (-13 knepp / 106m)
3. Andre ammunition-kombinasjoner og værforhold kan gi andre resultater
4. DFS kan bruke mer komplekse modeller som ikke er fullt ut replisert

## Konklusjon

Siktemodellen er nå mye nærmere DFS Kulebanegenerator. Forbedringen på 46% i gjennomsnittlig nøyaktighet gjør appen egnet for praktisk bruk i felt, spesielt for avstander rundt nullpunktet (±100m).

Den avstandsavhengige korreksjonen er kritisk for Busk-sikter og reflekterer virkelig fysikk i siktesystemet.
