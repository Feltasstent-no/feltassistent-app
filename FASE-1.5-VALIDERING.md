# FASE 1.5 - VALIDERING OG ROBUSTHET

## IMPLEMENTERTE ENDRINGER

### 1. FIGURFILTRERING (FIKSET)

**Før (skjørt):**
```typescript
// Filtrerte på name-felt med ILIKE
if (competition.competition_type === 'finfelt') {
  query = query.ilike('name', '%Finfelt%');
}
```

**Problem:** Hvis noen endret figurnavn og fjernet "Finfelt", forsvant figuren.

**Etter (robust):**
```typescript
// Filtrerer på dedikert category-felt
if (competition.competition_type === 'finfelt') {
  query = query.eq('category', 'finfelt');
}
```

**Database-verdier:**
```sql
SELECT DISTINCT category FROM field_figures;
-- Result: 'grovfelt', 'finfelt'

-- Grovfelt figurer:
SELECT COUNT(*) FROM field_figures WHERE category = 'grovfelt';
-- Result: 21

-- Finfelt figurer:
SELECT COUNT(*) FROM field_figures WHERE category = 'finfelt';
-- Result: 10
```

---

### 2. VALIDERING AV PÅKREVDE FELTER

**Valideringsregler:**

```typescript
const validateStages = (): string[] => {
  const errors: string[] = [];

  // Regel 1: Minst ett hold
  if (stages.length === 0) {
    errors.push('Stevnet må ha minst ett hold');
    return errors;
  }

  stages.forEach((stage, index) => {
    const holdNumber = stage.stage_number || index + 1;

    // Regel 2: Alle hold må ha figur
    if (!stage.field_figure_id) {
      errors.push(`Hold ${holdNumber}: Velg en figur`);
    }

    // Regel 3: Grovfelt må ha avstand
    if (competition?.competition_type === 'grovfelt') {
      if (!stage.distance_m) {
        errors.push(`Hold ${holdNumber}: Angi avstand`);
      }
    }
  });

  return errors;
};
```

**Når kjører validering:**
```typescript
const saveConfiguration = async () => {
  const errors = validateStages();

  if (errors.length > 0) {
    setValidationErrors(errors);      // Vis feilmeldinger
    window.scrollTo({ top: 0 });      // Scroll til topp
    return;                            // STOPP - ikke lagre
  }

  setValidationErrors([]);            // Clear gamle feil
  // ... fortsett med lagring
}
```

---

## TESTSCENARIER OG FAKTISK OPPFØRSEL

### TEST 1: Grovfelt uten figur

**Aksjon:**
1. Opprett grovfelt-stevne
2. Legg til hold
3. Angi avstand: 150m
4. Ikke velg figur
5. Klikk "Lagre stevne"

**Resultat:**
```
❌ Validering feiler

UI viser:
┌─────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                  │
│                                              │
│ • Hold 1: Velg en figur                     │
└─────────────────────────────────────────────┘

Database:
- Ingen data lagres
- Status forblir 'draft'
- Bruker forblir på /configure siden
```

---

### TEST 2: Grovfelt uten avstand

**Aksjon:**
1. Opprett grovfelt-stevne
2. Legg til hold
3. Velg figur: "C35 - Grovfelt skive"
4. La avstand stå tom
5. Klikk "Lagre stevne"

**Resultat:**
```
❌ Validering feiler

UI viser:
┌─────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                  │
│                                              │
│ • Hold 1: Angi avstand                      │
└─────────────────────────────────────────────┘

Database:
- Ingen data lagres
- Status forblir 'draft'
- Bruker forblir på /configure siden
```

---

### TEST 3: Grovfelt uten figur OG uten avstand

**Aksjon:**
1. Opprett grovfelt-stevne
2. Legg til hold
3. La både figur og avstand stå tom
4. Klikk "Lagre stevne"

**Resultat:**
```
❌ Validering feiler

UI viser:
┌─────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                  │
│                                              │
│ • Hold 1: Velg en figur                     │
│ • Hold 1: Angi avstand                      │
└─────────────────────────────────────────────┘

Database:
- Ingen data lagres
- Status forblir 'draft'
```

---

### TEST 4: Finfelt uten figur

**Aksjon:**
1. Opprett finfelt-stevne
2. Legg til hold
3. Ikke velg figur (avstand er auto 100m)
4. Klikk "Lagre stevne"

**Resultat:**
```
❌ Validering feiler

UI viser:
┌─────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                  │
│                                              │
│ • Hold 1: Velg en figur                     │
└─────────────────────────────────────────────┘

Database:
- Ingen data lagres
- Status forblir 'draft'

Merk: Avstand valideres IKKE for finfelt (alltid 100m)
```

---

### TEST 5: Finfelt komplett (gyldig)

**Aksjon:**
1. Opprett finfelt-stevne
2. Legg til hold
3. Velg figur: "Mini-1/4 - Finfelt skive"
4. (Avstand er automatisk 100m)
5. Klikk "Lagre stevne"

**Resultat:**
```
✓ Validering OK

Database lagring:
INSERT INTO competition_stages (
  competition_id,
  stage_number,
  field_figure_id,   -- UUID til Mini-1/4
  distance_m,        -- 100
  clicks,            -- null
  clicks_to_zero,    -- null
  total_shots,       -- 1
  time_limit_seconds -- 15
);

UPDATE competitions
SET status = 'configured',
    total_stages = 1
WHERE id = [uuid];

Routing:
navigate('/competitions/[id]')

UI endring:
Knapp endres fra "Fortsett oppsett" → "Start stevne"
```

---

### TEST 6: Grovfelt komplett (gyldig)

**Aksjon:**
1. Opprett grovfelt-stevne
2. Legg til hold
3. Velg figur: "C35 - Grovfelt skive"
4. Angi avstand: 150m
5. Klikk "Lagre stevne"

**Resultat:**
```
✓ Validering OK

Database lagring:
INSERT INTO competition_stages (
  competition_id,
  stage_number,
  field_figure_id,   -- UUID til C35
  distance_m,        -- 150
  clicks,            -- -10 (fra knepptabell hvis aktiv)
  clicks_to_zero,    -- -10 (fra knepptabell hvis aktiv)
  total_shots,       -- 1
  time_limit_seconds -- 15
);

UPDATE competitions
SET status = 'configured',
    total_stages = 1
WHERE id = [uuid];

Routing:
navigate('/competitions/[id]')
```

---

### TEST 7: Flere hold med blandet validering

**Aksjon:**
1. Opprett grovfelt-stevne
2. Legg til 3 hold
3. Hold 1: Figur ✓, Avstand ✓
4. Hold 2: Figur ✗, Avstand ✓
5. Hold 3: Figur ✓, Avstand ✗
6. Klikk "Lagre stevne"

**Resultat:**
```
❌ Validering feiler

UI viser:
┌─────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                  │
│                                              │
│ • Hold 2: Velg en figur                     │
│ • Hold 3: Angi avstand                      │
└─────────────────────────────────────────────┘

Database:
- INGEN av de 3 holdene lagres
- Status forblir 'draft'
- All-or-nothing validering
```

---

### TEST 8: Tomt stevne (ingen hold)

**Aksjon:**
1. Opprett stevne (grovfelt eller finfelt)
2. Fjern alle hold
3. Klikk "Lagre stevne"

**Resultat:**
```
❌ Validering feiler

UI viser:
┌─────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                  │
│                                              │
│ • Stevnet må ha minst ett hold              │
└─────────────────────────────────────────────┘

Database:
- Ingen data lagres
- Status forblir 'draft'

Merk: Knappen "Lagre stevne" er disabled hvis stages.length === 0
      Men validering gir også feilmelding for klarhet
```

---

## STATUS-KONTROLL

**Før Fase 1.5:**
```typescript
// Status ble ALLTID satt til 'configured' ved lagring
UPDATE competitions SET status = 'configured';
```

**Etter Fase 1.5:**
```typescript
// Status settes KUN til 'configured' hvis validering passerer
const errors = validateStages();
if (errors.length > 0) {
  return; // STOPP - ikke oppdater status
}

// Validering OK → fortsett
UPDATE competitions SET status = 'configured';
```

---

## KOMPLETT VALIDERINGSMATRISE

| Stevne-type | Figur | Avstand | Validering | Status       | Lagring |
|-------------|-------|---------|------------|--------------|---------|
| Grovfelt    | ✗     | ✗       | ❌ FEIL    | Forblir draft| NEI     |
| Grovfelt    | ✗     | ✓       | ❌ FEIL    | Forblir draft| NEI     |
| Grovfelt    | ✓     | ✗       | ❌ FEIL    | Forblir draft| NEI     |
| Grovfelt    | ✓     | ✓       | ✓ OK       | → configured | JA      |
| Finfelt     | ✗     | (100m)  | ❌ FEIL    | Forblir draft| NEI     |
| Finfelt     | ✓     | (100m)  | ✓ OK       | → configured | JA      |

---

## BRUKEROPPLEVELSE

### Før validering (Fase 1):
1. Bruker opprett tomt stevne
2. Klikker "Lagre stevne"
3. Status → 'configured'
4. Stevne har 0 stages eller ufullstendige stages
5. Senere: Kan ikke kjøre stevne (crash eller undefined behavior)

### Etter validering (Fase 1.5):
1. Bruker prøver å lagre ufullstendig stevne
2. Rød error-boks vises øverst
3. Konkrete feilmeldinger: "Hold 2: Velg en figur"
4. Status forblir 'draft'
5. Bruker retter feil → lagring fungerer
6. Status → 'configured'
7. Stevne er garantert komplett og kjørbart

---

## HVA SKJER HVIS BRUKEREN PRØVER Å LAGRE UGYLDIG HOLD

**Konkret scenario:**
```
1. Bruker går til /competitions/[id]/configure
2. Ser 3 hold
3. Hold 1: Mangler figur
4. Hold 2: Mangler avstand
5. Hold 3: Komplett
6. Klikker "Lagre stevne"

Resultat:
┌──────────────────────────────────────────────────┐
│ ⚠️  Kan ikke lagre stevne:                       │
│                                                   │
│ • Hold 1: Velg en figur                          │
│ • Hold 2: Angi avstand                           │
└──────────────────────────────────────────────────┘

- Siden scroller til topp (window.scrollTo)
- Ingen data lagres
- Status forblir 'draft'
- Bruker kan fortsette å redigere
- Når alle feil er fikset: lagring fungerer
```

---

## HVA SKJER HVIS STEVNET MANGLER DATA

**Scenario 1: Ingen hold**
```
Stevne eksisterer i database:
- id: [uuid]
- name: "Testskyting"
- status: 'draft'
- total_stages: 0

Bruker klikker "Lagre stevne":
❌ "Stevnet må ha minst ett hold"

Status: Forblir 'draft'
```

**Scenario 2: Alle hold mangler påkrevde felter**
```
Stevne har 2 hold:
- Hold 1: field_figure_id = null, distance_m = null
- Hold 2: field_figure_id = null, distance_m = null

Bruker klikker "Lagre stevne":
❌ "Hold 1: Velg en figur"
❌ "Hold 1: Angi avstand"
❌ "Hold 2: Velg en figur"
❌ "Hold 2: Angi avstand"

Status: Forblir 'draft'
```

**Scenario 3: Delvis komplett**
```
Stevne har 2 hold:
- Hold 1: Komplett
- Hold 2: Mangler figur

Bruker klikker "Lagre stevne":
❌ "Hold 2: Velg en figur"

Resultat:
- INGEN hold lagres (all-or-nothing)
- Status forblir 'draft'
- Når Hold 2 er fikset: ALLE hold lagres
```

---

## TEKNISKE DETALJER

### Validering kjører før database-operasjoner

**Rekkefølge:**
```typescript
1. validateStages()           // Sjekk alle regler
2. if (errors) { return; }    // Stopp hvis feil
3. setValidationErrors([])    // Clear gamle feil
4. DELETE old stages          // Slett gamle data
5. INSERT new stages          // Lagre nye data
6. UPDATE status              // Sett 'configured'
7. navigate()                 // Gå til detaljside
```

### All-or-nothing lagring

Hvis validering feiler:
- INGEN stages lagres
- INGEN status-oppdatering
- INGEN routing

Hvis validering OK:
- ALLE stages slettes først
- ALLE stages lagres på nytt
- Status oppdateres
- Routing til detaljside

### Error-clearing

Validering-errors fjernes når:
1. Bruker klikker "Lagre stevne" og validering passerer
2. Komponenten reloades

Validering-errors vises når:
1. Bruker klikker "Lagre stevne" og validering feiler
2. Errors forblir synlige til neste lagringsforsøk

---

## KONKLUSJON

**Fase 1.5 gjør systemet robust ved:**

1. ✓ Figurfiltrering basert på `category` (ikke `name`)
2. ✓ Påkrevde felter valideres før lagring
3. ✓ Status endres KUN hvis data er komplett
4. ✓ Brukeren får konkrete feilmeldinger
5. ✓ All-or-nothing lagring (konsistent tilstand)
6. ✓ Ingen ufullstendige stevner når status = 'configured'

**Fase 2 kan nå trygt anta:**
- Alle stevner med status 'configured' har minst 1 hold
- Alle hold har figur
- Alle grovfelt-hold har avstand
- Alle finfelt-hold har 100m avstand
