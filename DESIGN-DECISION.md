# Design Decision: DFS Ballistics Model

## Problem

DFS Kulebanegenerator bruker en kompleks, ikke-dokumentert algoritme for konvertering fra kuleavfall til knepp. Analysen viser:

1. **Ekstrem variasjon rundt nullpunktet**: Angular faktor hopper fra ~0.39 til ~0.06 når vi krysser nullpunktet
2. **Ikke-lineære mønstre**: Faktoren endrer seg ikke-lineært med avstand
3. **Profil-avhengighet**: Forskjellige ammunisjonstyper viser forskjellige mønstre
4. **Zero-avhengighet**: 200m og 300m null gir helt forskjellige faktorkurver

## Forsøkte Løsninger

### 1. Enkel angular factor med korreksjon
- **Resultat**: 2-3 knepp avvik ved ekstremer
- **Problem**: Kan ikke håndtere kompleks nullpunktsatferd

### 2. Avstandsavhengig kalibr eringskurve
- **Resultat**: 2.5 knepp gjennomsnittlig avvik
- **Problem**: En enkelt kurve kan ikke passe alle profiler

### 3. Multi-zone kalibrering
- **Resultat**: Bedre, men fortsatt systematiske avvik
- **Problem**: DFS-algoritmen er mer kompleks enn våre modeller

## Anbefalt Løsning

### Hybrid tilnærming:

1. **Primær modell**: Fysikkbasert med kalibr ert faktor
   - Brukes for generell beregning
   - God for interpolering mellom datapunkter
   - Fornuftig ekstrapolering utenfor måleområde

2. **Reference correction table**: For kjent profil-zero-kombinasjon
   - Brukes KUN når eksakt match med referanseprofil
   - Gir perfekt match med DFS for validerte konfigurasjoner
   - Ikke brukt for vilkårlige profiler

3. **Fallback**: Når profil ikke matcher referanse
   - Bruk fysikkmodell med best-fit kalibrering
   - Vis advarsel til bruker om at resultat er estimert
   - Anbefal brukeren å sjekke mot DFS direkte

## Implementering

```typescript
if (exactMatchWithReferenceProfile(profile)) {
  // Use reference-corrected values (perfect DFS match)
  return applyReferenceCorrection(physicsResult, referenceTable);
} else {
  // Use physics-based model with calibration
  return applyCalibratedConversion(physicsResult, calibration);
}
```

## Konklusjon

Uten tilgang til DFS' faktiske algoritme, kan vi ikke perfekt replisere den for alle profiler. Vi må derfor:

1. Garantere nøyaktighet for dokumenterte referanseprofiler
2. Gi beste estimat for andre profiler
3. Være ærlige med brukeren om usikkerhet

Dette er en pragmatisk løsning som balanserer nøyaktighet, vedlikeholdbarhet og brukerforventninger.
