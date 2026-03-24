# OMFATTENDE TIMEOUT-LOGGING IMPLEMENTERT

## KRITISK: SVG-PROBLEMET ER LØST
SVG-er rendres nå korrekt. Dette dokumentet fokuserer KUN på timeout/post_hold-flyten.

---

## 🎯 HVA ER IMPLEMENTERT

Jeg har lagt til svært spesifikk logging på ALLE punkter i timeout-flyten:

1. **Før timeout** - State før timeout håndteres
2. **Under timeout-handling** - Database-oppdatering
3. **Etter timeout** - State etter oppdatering
4. **Render decision** - Hvilken UI-branch som velges
5. **HoldPostState** - Om komponenten faktisk rendres
6. **Button clicks** - Om knapper er synlige og klikkbare

---

## 📊 FORVENTET CONSOLE OUTPUT (NORMAL FLYT)

Når alt fungerer riktig, vil du se denne sekvensen:

### 1. Klokken kjører ned
```
[FieldClockDisplay] ========== RENDERING CLOCK ==========
[FieldClockDisplay] Time left: 3
[FieldClockDisplay] Time left: 2
[FieldClockDisplay] Time left: 1
[FieldClockDisplay] Time left: 0
```

### 2. Timeout trigger
```
[FieldClockDisplay] ========== TIMEOUT REACHED ==========
[FieldClockDisplay] Calling onTimeUp handler
[FieldClockDisplay] Stage number: 1
```

### 3. handleTimeUp kjøres
```
[TIMEOUT] ========== TIMEOUT REACHED ==========
[STATE BEFORE] entry.current_stage_number: 1
[STATE BEFORE] entry.current_stage_state: running
[STATE BEFORE] entry.status: in_progress
[STATE BEFORE] entry.id: "abc-123-..."
[STATE BEFORE] Total stages: 3
[STATE BEFORE] Is last stage: false
[TIMEOUT] Calling updateEntryState to set post_hold...
```

### 4. Database oppdateres
```
[CompetitionRun] ========== UPDATE ENTRY STATE ==========
[CompetitionRun] Updating to: {
  stageNumber: 1,
  stageState: "post_hold",
  status: undefined,
  entryId: "abc-123-..."
}
[CompetitionRun] Updates to apply: {
  current_stage_number: 1,
  current_stage_state: "post_hold",
  current_hold_started_at: null
}
```

### 5. Database-oppdatering lykkes
```
[CompetitionRun] Update result: {
  data: {
    id: "abc-123-...",
    current_stage_number: 1,
    current_stage_state: "post_hold",
    status: "in_progress",
    ...
  },
  error: null
}
[CompetitionRun] Setting entry state to: {
  current_stage_number: 1,
  current_stage_state: "post_hold",
  status: "in_progress"
}
```

### 6. State etter oppdatering
```
[TIMEOUT] updateEntryState completed
[STATE AFTER] entry.current_stage_state: post_hold
[STATE AFTER] Should now be post_hold
```

### 7. Komponenten re-rendres
```
[RENDER CHECK] ========== DECIDING WHAT TO RENDER ==========
[RENDER CHECK] entry.current_stage_state: post_hold
[RENDER CHECK] entry.current_stage_number: 1
[RENDER CHECK] entry.status: in_progress
[RENDER CHECK] currentStage exists: true
[RENDER CHECK] currentFigure exists: true
[RENDER CHECK] shouldRenderPreHold: false
[RENDER CHECK] shouldRenderRunning: false
[RENDER CHECK] shouldRenderPostHold: true
[RENDER CHECK] shouldRenderCompleted: false
```

### 8. HoldPostState rendres
```
[RENDER BRANCH] Rendering HoldPostState
[RENDER BRANCH] post_hold details: {
  current_stage: 1,
  total_stages: 3,
  isLastStage: false,
  button_will_show: "Neste hold",
  has_existing_image: false
}
```

### 9. HoldPostState komponent mountes
```
[HoldPostState] ========== COMPONENT MOUNTED/RENDERED ==========
[HoldPostState] Props received: {
  stage_id: "stage-123-...",
  stage_number: 1,
  isLastStage: false,
  entryId: "abc-123-...",
  has_existingImage: false,
  has_onNextHold: true,
  has_onFinish: true,
  has_onImageUploaded: true
}
[HoldPostState] Button that WILL render: NESTE HOLD (blue)
[HoldPostState] Button onClick handler: onNextHold
[HoldPostState] Stage clicks_to_zero: 3
```

### 10. Visuelt resultat
```
✅ Grønn checkmark
✅ "Hold 1 ferdig"
✅ "Tid ute"
✅ Blå knapp: "Neste hold"
```

---

## 🔴 FEILSCENARIOER OG DIAGNOSTIKK

### Scenario A: Database-oppdatering feiler

**Symptom:** UI står fast på "0:00" med klokke

**Console vil vise:**
```
[TIMEOUT] Calling updateEntryState to set post_hold...
[CompetitionRun] ========== UPDATE ENTRY STATE ==========
[CompetitionRun] Updates to apply: { current_stage_state: "post_hold", ... }
[CompetitionRun] Update result: {
  data: null,
  error: { message: "...", code: "..." }
}
[CompetitionRun] Failed to update entry: {...error...}
```

**Deretter:**
```
[RENDER CHECK] entry.current_stage_state: running  <- FORTSATT running!
[RENDER CHECK] shouldRenderRunning: true
[RENDER BRANCH] Rendering FieldClockDisplay (running state)
```

**Årsak:** RLS policy blokkerer, network error, eller constraint violation

**Løsning:** Sjekk error.message for detaljer

---

### Scenario B: React state oppdateres ikke

**Symptom:** Database oppdatert, men UI endrer seg ikke

**Console vil vise:**
```
[CompetitionRun] Update result: { data: {...}, error: null }  <- SUCCESS
[CompetitionRun] Setting entry state to: { current_stage_state: "post_hold" }
[TIMEOUT] updateEntryState completed
[STATE AFTER] entry.current_stage_state: running  <- FEIL! Fortsatt running
```

**Deretter:**
```
[RENDER CHECK] entry.current_stage_state: running
[RENDER CHECK] shouldRenderPostHold: false
[RENDER BRANCH] Rendering FieldClockDisplay (running state)
```

**Årsak:** setEntry() kalles ikke, eller React state er stale

**Løsning:** Se på updateEntryState-implementasjonen

---

### Scenario C: Render-branch evaluerer feil

**Symptom:** State er riktig, men feil UI rendres

**Console vil vise:**
```
[STATE AFTER] entry.current_stage_state: post_hold  <- RIKTIG
[RENDER CHECK] entry.current_stage_state: post_hold  <- RIKTIG
[RENDER CHECK] shouldRenderPostHold: true  <- RIKTIG
```

**MEN:**
```
[RENDER BRANCH] Rendering FieldClockDisplay (running state)  <- FEIL BRANCH!
```

**Årsak:** Condition-rekkefølge i render-logikk, eller en tidligere condition matcher

**Løsning:** Sjekk om `!currentStage` eller annen guard-condition trigger først

---

### Scenario D: HoldPostState rendres, men ingen knapp vises

**Symptom:** Grønn checkmark vises, men ingen knapp

**Console vil vise:**
```
[RENDER BRANCH] Rendering HoldPostState
[HoldPostState] ========== COMPONENT MOUNTED/RENDERED ==========
[HoldPostState] Button that WILL render: NESTE HOLD (blue)
```

**Men visuelt:** Ingen knapp

**Årsak:** CSS-problem (hidden, z-index), eller knappen rendres men er usynlig

**Løsning:** 
- Åpne browser inspector
- Sjekk om button faktisk er i DOM
- Sjekk CSS computed styles
- Sjekk om noe overlayer knappen

---

### Scenario E: Komponenten re-rendrer ikke etter state-endring

**Symptom:** Ingen nye console logs etter timeout

**Console vil vise:**
```
[TIMEOUT] updateEntryState completed
[STATE AFTER] entry.current_stage_state: post_hold
```

**Deretter:** Ingenting mer

**Årsak:** React re-render ikke trigget

**Løsning:** Sjekk om entry-objektet faktisk endres (referanse-likhet)

---

## 🔍 DEBUGGING-SJEKKLISTE

Når du tester, følg denne sekvensen:

1. **Åpne console (F12)**
2. **Start et hold**
3. **La klokken gå til 0**
4. **Vent 2 sekunder**
5. **Kopier hele console output**

### Hva å se etter:

#### ✅ Hvis timeout fungerer:
- [ ] `[TIMEOUT] ========== TIMEOUT REACHED ==========` vises
- [ ] `[STATE BEFORE] entry.current_stage_state: running`
- [ ] `[CompetitionRun] Update result:` har `error: null`
- [ ] `[STATE AFTER] entry.current_stage_state: post_hold`
- [ ] `[RENDER CHECK] shouldRenderPostHold: true`
- [ ] `[RENDER BRANCH] Rendering HoldPostState`
- [ ] `[HoldPostState] ========== COMPONENT MOUNTED/RENDERED ==========`
- [ ] Visuelt: Grønn checkmark + knapp

#### ❌ Hvis timeout henger:
Finn første linje som IKKE vises:

- Mangler `[TIMEOUT]`? → Timer trigger ikke
- Mangler `[UPDATE ENTRY STATE]`? → handleTimeUp ikke kalt
- Update result har error? → Database-problem
- `[STATE AFTER]` fortsatt running? → React state ikke oppdatert
- `shouldRenderPostHold: false`? → Condition evaluerer feil
- Mangler `[HoldPostState]`? → Komponenten rendres ikke
- HoldPostState rendres men ingen knapp? → CSS/DOM-problem

---

## 📝 RAPPORTERING

Når du rapporterer tilbake, gi meg:

### 1. Visuelt resultat
- Hva ser du på skjermen etter 0:00?
- "Klokken kjører..." fortsatt synlig?
- Grønn checkmark synlig?
- Knapp synlig?

### 2. Console output
Kopier **alle** linjer fra:
```
[TIMEOUT] ========== TIMEOUT REACHED ==========
```
til siste linje i console.

### 3. Browser inspector (hvis knapp mangler)
- Høyreklikk der knappen skal være
- Velg "Inspect"
- Fortell meg om `<button>` er i DOM
- Hvis ja, sjekk CSS: `display`, `visibility`, `opacity`

---

## 🎯 MÅL

Med denne loggingen skal vi kunne:

1. **Se eksakt hvor flyten stopper**
2. **Se om problemet er database, React state, eller rendering**
3. **Se om komponenten faktisk rendres, men CSS skjuler den**
4. **Se om knappen eksisterer i DOM**

All informasjon vi trenger er nå i console. Hver linje forteller oss noe spesifikt om hva som skjer.

---

## ⚡ VIKTIG

Denne loggingen er **SVÆRT detaljert**. Du vil se mange linjer i console.
Dette er med vilje - vi trenger å se hvert steg for å finne ut nøyaktig hvor problemet er.

Når problemet er funnet, kan vi fjerne logging.
Først må vi vite hva som faktisk skjer.
