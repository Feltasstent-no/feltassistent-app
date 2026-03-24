# KONKRETE FIXES IMPLEMENTERT

## ✅ FIX 1: REACT WARNING (PRIORITET 1)

### Problem
```
Warning: Cannot update a component (ActiveHoldScreen) while rendering a different component (CompactDigitalClock)
```

### Root Cause
`CompactDigitalClock.tsx` linje 37-40 kalte `onComplete()` callback UNDER render init-fasen i useEffect, som trigget setState i parent component mens child fortsatt rendret.

### Løsning
Flyttet `onComplete()` callback til separat useEffect som trigger KUN når `phase === 'done'`:

**Før:**
```typescript
useEffect(() => {
  // ... setup logic ...
  if (initialElapsedTime >= totalTime) {
    setPhase('done');
    setTimeLeft(0);
    if (!hasCalledComplete) {
      setHasCalledComplete(true);
      onComplete(); // ❌ KALLER PARENT CALLBACK UNDER RENDER
    }
  }
}, [prepTime, shootTime, initialElapsedTime]);
```

**Etter:**
```typescript
useEffect(() => {
  // ... setup logic ...
  if (initialElapsedTime >= totalTime) {
    setPhase('done');
    setTimeLeft(0);
  }
}, [prepTime, shootTime, initialElapsedTime]);

// Separat effect som kjører etter render er ferdig
useEffect(() => {
  if (phase === 'done' && !hasCalledComplete) {
    setHasCalledComplete(true);
    onComplete(); // ✅ KALLER CALLBACK ETTER RENDER
  }
}, [phase, hasCalledComplete, onComplete]);
```

### Forventet Resultat
- React warning skal IKKE vises mer
- Når klokken når 0:00, skal timeout håndteres riktig
- UI skal gå fra "running" → "post_hold" uten freeze

---

## ✅ FIX 2: DIAGNOSTIKK LOGGING FOR FIGURE MAPPING (PRIORITET 2)

### Problem
CompetitionRun viser feil figur (C35) når configure viste B65 på hold 1.

### Root Cause
Ukjent - trenger data fra faktisk kjøring for å verifisere.

### Løsning
Lagt til omfattende logging på ALLE punkter i figure mapping-flyten:

#### A. CompetitionConfigure.tsx - saveConfiguration()

Når bruker trykker "Lagre konfigurasjon":

```typescript
console.log('[CompetitionConfigure] ========== SAVING STAGES ==========');
stagesToInsert.forEach((s, idx) => {
  const figure = availableFigures.find(f => f.id === s.field_figure_id);
  console.log(`[CompetitionConfigure] Stage ${idx + 1} (stage_number=${s.stage_number}):`, {
    field_figure_id: s.field_figure_id,
    figure_code: figure?.code || 'NOT FOUND',
    figure_name: figure?.name || 'NOT FOUND',
    distance_m: s.distance_m,
    clicks: s.clicks
  });
});
```

**Dette viser:** Hvilke field_figure_id som faktisk sendes til database.

#### B. CompetitionRun.tsx - loadData()

Når run starter og henter data:

```typescript
console.log('[CompetitionRun] ========== STAGES FROM DATABASE ==========');
console.log('[CompetitionRun] Total stages:', stagesRes.data.length);
stagesRes.data.forEach((s, idx) => {
  console.log(`[CompetitionRun] Stage ${idx + 1}:`, {
    id: s.id,
    stage_number: s.stage_number,
    field_figure_id: s.field_figure_id,
    distance_m: s.distance_m,
    clicks: s.clicks,
    clicks_to_zero: s.clicks_to_zero
  });
});

console.log('[CompetitionRun] ========== FIGURES FROM DATABASE ==========');
console.log('[CompetitionRun] Total figures:', figuresRes.data.length);
figuresRes.data.slice(0, 10).forEach(f => {
  console.log(`[CompetitionRun] Figure:`, {
    id: f.id,
    code: f.code,
    name: f.name
  });
});
```

**Dette viser:** Hvilke stages og figures som faktisk hentes fra DB.

#### C. CompetitionRun.tsx - currentStage/currentFigure mapping

Under render, hver gang:

```typescript
console.log('[CompetitionRun] ========== FINDING CURRENT STAGE ==========');
console.log('[CompetitionRun] entry.current_stage_number:', entry.current_stage_number);
console.log('[CompetitionRun] Available stages:', stages.map(s => s.stage_number));

const currentStage = stages.find(s => s.stage_number === entry.current_stage_number);

console.log('[CompetitionRun] currentStage found:', !!currentStage);
if (currentStage) {
  console.log('[CompetitionRun] currentStage details:', {
    id: currentStage.id,
    stage_number: currentStage.stage_number,
    field_figure_id: currentStage.field_figure_id
  });
}

const currentFigure = currentStage?.field_figure_id
  ? figures.find(f => f.id === currentStage.field_figure_id) || null
  : null;

console.log('[CompetitionRun] currentFigure found:', !!currentFigure);
if (currentFigure) {
  console.log('[CompetitionRun] ========== FIGURE MAPPING ==========');
  console.log('[CompetitionRun] Stage field_figure_id:', currentStage.field_figure_id);
  console.log('[CompetitionRun] Figure matched:', {
    id: currentFigure.id,
    code: currentFigure.code,
    name: currentFigure.name,
    has_svg: !!currentFigure.svg_data
  });
  console.log('[CompetitionRun] ⚠️ IF THIS IS WRONG, CHECK DB: What is field_figure_id in competition_stages?');
}
```

**Dette viser:** Nøyaktig hvilken stage og figure som matches, og field_figure_id brukt.

### Forventet Resultat Med Logging

Nå kan vi se EKSAKT:

1. **I Configure**: Hvilken field_figure_id som sendes til DB når du lagrer
2. **I Run**: Hvilken field_figure_id som faktisk ligger i DB
3. **I Run**: Hvilken figure som matches basert på field_figure_id
4. **Hvis feil**: Om problemet er i configure, database, eller run

---

## 🔍 VERIFISERINGSPLAN

### Test 1: React Warning Fix

1. Start et stevne
2. La klokken gå til 0:00
3. Sjekk console: Skal IKKE vise React warning
4. Sjekk UI: Skal gå til post_hold med knapp

**Forventet console:**
```
[TIMEOUT] ========== TIMEOUT REACHED ==========
[STATE BEFORE] entry.current_stage_state: running
[DB UPDATE] success
[STATE AFTER] entry.current_stage_state: post_hold
[RENDER BRANCH] Rendering HoldPostState
[HoldPostState] ========== COMPONENT MOUNTED/RENDERED ==========
```

**IKKE:**
```
Warning: Cannot update a component...
```

### Test 2: Figure Mapping

**Steg A: Configure**
1. Gå til Configure
2. Velg B65 på hold 1
3. Velg Stripe 30/10 på hold 2
4. Trykk "Lagre konfigurasjon"
5. **KOPIER CONSOLE OUTPUT**

**Forventet console:**
```
[CompetitionConfigure] ========== SAVING STAGES ==========
[CompetitionConfigure] Stage 1 (stage_number=1): {
  field_figure_id: "uuid-for-B65",
  figure_code: "B65",
  figure_name: "Grovfelt stående 65cm",
  distance_m: 100,
  clicks: 8
}
[CompetitionConfigure] Stage 2 (stage_number=2): {
  field_figure_id: "uuid-for-stripe",
  figure_code: "S30/10",
  figure_name: "Stripe 30/10",
  distance_m: 150,
  clicks: 12
}
```

**Steg B: Run**
1. Gå til Run
2. Start hold 1
3. **KOPIER CONSOLE OUTPUT FØR START**

**Forventet console:**
```
[CompetitionRun] ========== STAGES FROM DATABASE ==========
[CompetitionRun] Total stages: 2
[CompetitionRun] Stage 1: {
  id: "...",
  stage_number: 1,
  field_figure_id: "uuid-for-B65",  <- SKAL VÆRE SAMME SOM I CONFIGURE
  distance_m: 100,
  clicks: 8
}
[CompetitionRun] Stage 2: {
  id: "...",
  stage_number: 2,
  field_figure_id: "uuid-for-stripe",
  distance_m: 150,
  clicks: 12
}

[CompetitionRun] ========== FINDING CURRENT STAGE ==========
[CompetitionRun] entry.current_stage_number: 1
[CompetitionRun] currentStage details: {
  id: "...",
  stage_number: 1,
  field_figure_id: "uuid-for-B65"  <- SKAL VÆRE B65 UUID
}

[CompetitionRun] ========== FIGURE MAPPING ==========
[CompetitionRun] Stage field_figure_id: "uuid-for-B65"
[CompetitionRun] Figure matched: {
  id: "uuid-for-B65",
  code: "B65",  <- SKAL VÆRE B65
  name: "Grovfelt stående 65cm",  <- SKAL VÆRE B65
  has_svg: true
}
```

**HVIS FEIL:**

Hvis du ser C35 i stedet for B65, sammenlign:
- field_figure_id fra Configure
- field_figure_id fra Run stages
- field_figure_id i Figure matched

Dette forteller oss HVOR feilen er:
- Samme ID i configure og run, men feil figure? → Figure lookup bug
- Forskjellig ID i configure og run? → Database/save bug
- Riktig ID men feil stage_number? → Stage mapping bug

---

## 📋 RAPPORTERING

### For Test 1 (React Warning):
1. Screenshot av console UTEN React warning
2. Screenshot av post_hold UI med knapp

### For Test 2 (Figure Mapping):
1. Console output fra Configure save
2. Console output fra Run start (første 50 linjer)
3. Screenshot av UI som viser figur i hold 1
4. Bekreft: Er det B65 eller C35?

---

## 🎯 KRITISKE SPØRSMÅL SOM LOGGING SVARER PÅ

1. **Når du lagrer i Configure, hvilken field_figure_id sendes til DB?**
   → Se `[CompetitionConfigure] SAVING STAGES`

2. **Når Run starter, hvilken field_figure_id hentes fra DB?**
   → Se `[CompetitionRun] STAGES FROM DATABASE`

3. **Hvilken figure matches basert på field_figure_id?**
   → Se `[CompetitionRun] FIGURE MAPPING`

4. **Er problemet i save, load, eller lookup?**
   → Sammenlign field_figure_id i alle 3 steg

5. **Trigger React warning fortsatt?**
   → Se om `Warning: Cannot update...` vises

Med denne loggingen har vi ALLE svarene vi trenger for å finne root cause.
