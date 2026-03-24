# UI VERIFISERING - FINFELT & GROVFELT FIX

## Test Environment
- Bruker: andor@valuetech.no (ID: 85ea0a3c-c97f-4ad6-b5a9-6906a3d4255d)
- Click Table: ee728016-1baa-489e-8837-2af2db027fc5

## TEST 1: FINFELT PRE-START MED SYNLIG KLOKKE

### Setup
1. Opprett nytt finfelt-stevne med 2 hold
2. Åpne første hold (pre-start state)

### Forventet Resultat
✅ Klokken er synlig og viser prep_time (f.eks. 0:15)
✅ Klokken er paused (teller ikke ned)
✅ "Knepp opp 0" vises IKKE
✅ Figur vises
✅ Avstand vises
✅ Antall skudd vises
✅ "Start klokke" knapp vises

### Faktisk Resultat
[TBD - Kjør i browser]

---

## TEST 2: FINFELT HOLDFLYT UTEN RESET-MODAL

### Setup
1. Start hold 1 i finfelt-stevne
2. La klokken kjøre ferdig
3. Fullfør hold 1

### Forventet Resultat
✅ Ingen "Tilbake til null" modal vises
✅ Hold 2 åpnes automatisk direkte
✅ Hold 2 viser ny figur/avstand
✅ Klokken i hold 2 er reset til prep_time

### Faktisk Resultat
[TBD - Kjør i browser]

---

## TEST 3: GROVFELT FIGURVELGER COLLAPSE

### Setup
1. Opprett nytt grovfelt-stevne
2. Åpne figurvelger for hold 1
3. Velg en figur

### Forventet Resultat
✅ Kun grovfeltfigurer vises i liste
✅ Listen kollapser etter valg
✅ Valgt figur vises i kompakt visning

### Faktisk Resultat
[TBD - Kjør i browser]

---

## TEST 4: GROVFELT HOLD 1 → HOLD 2 FLYT

### Setup
1. Start og fullfør hold 1 i grovfelt-stevne
2. Gå gjennom "Tilbake til null" modal
3. Åpne hold 2

### Forventet Resultat
✅ "Tilbake til null" modal vises mellom hold
✅ Hold 2 viser korrekt figur
✅ Hold 2 viser korrekt "Knepp opp" verdi
✅ Klokken er synlig og paused i pre-start
✅ Klokken starter friskt når "Start klokke" klikkes

### Faktisk Resultat
[TBD - Kjør i browser]

---

## Kritiske Filer i Fix
- `src/components/match/ActiveHoldScreen.tsx` - isFinfelt prop, conditional rendering
- `src/components/HybridClock.tsx` - isPaused prop
- `src/pages/MatchActive.tsx` - prop threading
- `src/pages/MatchConfigure.tsx` - figure selector collapse
