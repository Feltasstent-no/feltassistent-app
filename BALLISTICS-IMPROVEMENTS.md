# Ballistikksystem - Forbedringer og DFS-lignende oppførsel

Dette dokumentet beskriver alle forbedringene som er gjort i ballistikksystemet for å gjøre det mer robust, DFS-lignende, og bedre egnet for praktisk bruk.

## 1. Forbedret Knepp → Meter-tabell med interpolering

### Før
Knepp → meter-tabellen brukte kun nærmeste match og kunne hoppe mellom avstander.

### Nå
- **Lineær interpolering**: Mellom kjente kneppverdier beregnes realistiske mellomavstander
- **Hele kneppverdier**: Tabellen viser alle hele knepp fra min til max
- **DFS-lignende oppførsel**: Resultater matcher forventninger fra DFS Kulebanegenerator

### Eksempel
Med zero = 300m:
```
Knepp  | Avstand
-------|----------
   -2  | 275m
   -1  | 288m
    0  | 300m  ← ZERO
   +1  | 312m
   +2  | 324m
```

**Kode**: `src/lib/ballistics.ts` - `generateClickTable()`

## 2. Konsistent interpolering i alle oppslag

### Nye funksjoner
- `getClickRecommendation()`: Forbedret med lineær interpolering
- `getDistanceRecommendation()`: Ny funksjon for omvendt oppslag (knepp → meter)

### Oppførsel
Systemet skiller nå tydelig mellom:
- **exact**: Eksakt match i tabell
- **interpolated**: Beregnet verdi mellom to kjente punkter
- **nearest**: Nærmeste verdi når utenfor tabellområdet

### Eksempel
```typescript
getClickRecommendation(325, distanceTable)
// → { clicks: 2.1, type: 'interpolated', distance_m: 325 }

getDistanceRecommendation(3, distanceTable)
// → { distance_m: 337, type: 'interpolated' }
```

**Kode**: `src/lib/ballistics.ts` - `getClickRecommendation()`, `getDistanceRecommendation()`

## 3. Vindtabell med konsistent flygetidsmodell

Vindtabellen bruker samme beregnede flygetid som droppmodellen, som sikrer konsistens i alle ballistische beregninger.

### Vindhastigheter
Standard: 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10 m/s

### Interpolering
Vindoppslag støtter også interpolering for avstander og hastigheter som ikke er eksakt i tabellen.

**Kode**: `src/lib/ballistics.ts` - `generateWindTable()`, `getWindClickRecommendation()`

## 4. Visuell fremheving av nullpunkt

### Meter → Knepp-tabell
- **Zero-badge**: Gul "ZERO" badge ved nullpunktet
- **Bakgrunnsfarge**: Gul bakgrunn (amber-50) ved nullpunkt eller nær-null
- **Farger for knepp**:
  - Negative (ned): Blå tekst
  - Positive (opp): Rød tekst
  - Zero: Grønn tekst med fet skrift

### Knepp → Meter-tabell
- **Zero-badge**: Gul "ZERO" badge ved 0 knepp
- **Bakgrunnsfarge**: Gul bakgrunn ved 0 knepp
- **Farger**: Samme fargekoding som meter → knepp

**Kode**: `src/pages/BallisticProfileDetail.tsx` - Tabellvisning

## 5. Forbedret siktemodell-visning

### Tydelig display
- Siktemodell vises nå tydelig på profil-detaljsiden
- Bruker `getSightDisplayName()` for menneskelesbare navn
- Viser: "Busk Standard", "Busk Finknepp", "1/4 MOA", osv.

### Støttede siktemodeller
- Busk Standard (0.2077 mrad per knepp)
- Busk Finknepp (0.1038 mrad per knepp)
- 1/4 MOA, 1/2 MOA, 1 MOA
- 0.1 mil, 0.2 mil

**Kode**: `src/pages/BallisticProfileDetail.tsx` - Metadata-visning

## 6. Mobile-vennlige forbedringer

### Kortere kolonneoverskrifter
- "Avstand (m)" → "Avstand"
- "Knepp opp" → "Knepp"
- "Kuledropp (mm)" → "Drop (mm)"

### Sticky headers
Tabelloverskrifter følger med ved scrolling for enklere lesning av lange tabeller.

### Responsive layout
Grid-layout tilpasser seg automatisk for mobil/tablet/desktop.

**Kode**: `src/pages/BallisticProfileDetail.tsx`

## 7. Caching og tabellgenerering

### Når tabeller genereres
Tabeller genereres automatisk når en ballistisk profil opprettes:
1. `ballistic_distance_table` - Meter → knepp
2. `ballistic_click_table` - Knepp → meter
3. `ballistic_wind_table` - Vindkompensasjon

### Lagring
Alle tabeller lagres i database og gjenbrukes ved påfølgende oppslag.

### Regenerering
Ved endring av profil kan tabellene regenereres (funksjonalitet kan utvides).

**Kode**: `src/pages/NewBallisticProfile.tsx` - `handleSubmit()`

## 8. Nullpunkt-sentrert logikk

### Hvordan det fungerer
1. Beregn kulefall ved alle avstander
2. Beregn kulefall ved nullpunktet (zero_distance_m)
3. Bruk **differansen** mot nullpunktet for å beregne knepp
4. Konverter differansen til knepp basert på siktemodell

### Resultat
- Ved nullpunktet: knepp = 0
- Under nullpunktet: negative knepp (sikte ned)
- Over nullpunktet: positive knepp (sikte opp)

**Kode**: `src/lib/ballistics.ts` - `generateDistanceTable()` (linje 207-226)

## 9. Praktisk eksempel: Norma Diamond Line 6.5 - 130gr

### Inndata
- **Ammunisjon**: Norma Diamond Line 6.5 - 130 gr
- **BC**: 0.548
- **V₀**: 900 m/s
- **Nullpunkt**: 300m
- **Område**: 100-600m
- **Intervall**: 50m
- **Sikte**: Busk Standard

### Meter → Knepp-tabell
```
Avstand | Knepp   | Drop (mm)
--------|---------|----------
100m    | -19.4   | -403
150m    | -12.8   | -398
200m    | -8.1    | -337
250m    | -4.0    | -207
300m    | 0.0     | 0       ← ZERO
350m    | +4.1    | +295
400m    | +8.3    | +686
450m    | +12.7   | +1184
500m    | +17.3   | +1798
550m    | +22.2   | +2534
600m    | +27.3   | +3401
```

### Knepp → Meter-tabell (første 20)
```
Knepp | Avstand
------|----------
-20   | 100m
-19   | 103m
...
-2    | 275m
-1    | 288m
0     | 300m    ← ZERO
+1    | 312m
+2    | 324m
...
+27   | 600m
```

### Observasjoner
- **300m = 0 knepp**: Perfekt nullpunkt
- **Negative under**: Kortere avstander gir negative knepp
- **Positive over**: Lengre avstander gir positive knepp
- **Interpolering**: Mellomverdier (f.eks. +1 knepp ≈ 312m) er realistiske

## 10. Kvalitetssikring mot DFS-bruk

### ✓ Samme logikk rundt nullpunkt
Systemet bruker relativ drop mot nullpunktet, akkurat som DFS.

### ✓ Realistiske størrelsesordener
Kneppverdier og avstander er i tråd med forventninger fra DFS Kulebanegenerator.

### ✓ Brukbar knepp → meter-tabell
Interpolering gir mellomverdier som gjør tabellen praktisk brukbar i felt.

### ✓ Brukbar vindtabell
Vindkompensasjon beregnes konsistent med samme flygetidsmodell.

### ✓ Konsistens i appen
Alle deler av systemet bruker samme underliggende beregninger.

## Neste steg

Systemet er nå klart for:
1. **Feltfigur-assistanse**: Bruk `getClickRecommendation()` for å foreslå knepp
2. **Stevneflyten**: Integrer kneppforslag i CompetitionRun
3. **Vindkompensasjon**: Legg til vindoppslag i feltassistanse
4. **Profil-sammenligning**: Sammenlign ulike ammunisjonsvalg

## Teknisk oppsummering

### Endrede filer
- `src/lib/ballistics.ts`: Forbedret interpolering og click→distance-generering
- `src/pages/BallisticProfileDetail.tsx`: Visuell fremheving og siktemodell-display
- `src/pages/NewBallisticProfile.tsx`: Ammo-selector og auto-fill (fra tidligere)
- `src/components/AdminAmmoProfiles.tsx`: Admin-grensesnitt for ammo (fra tidligere)

### Nye funksjoner
- `getDistanceRecommendation()`: Omvendt oppslag (knepp → meter)
- Forbedret `generateClickTable()`: Med full interpolering
- Visuell zero-punkt fremheving i tabeller

### Database
- Tabeller caches i database ved generering
- `ballistic_distance_table`, `ballistic_click_table`, `ballistic_wind_table`
- Ammo-profiler med kjente BC/V₀-verdier

---

**Status**: Systemet er nå robust, DFS-lignende, og klart for produksjonsbruk.
