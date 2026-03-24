# OMFATTENDE DEBUG-LOGGING IMPLEMENTERT

## ✅ 1. TYPE-FELT I FIGURKORT

**Endring:** `src/components/FieldFigureCard.tsx`

**Visuell endring:**
```
┌────────────────────────────────────────┐
│ [Figur SVG]  [Grovfelt stående 100cm] │ <- Type vises som grønn badge
│              Kode: B100                │ <- Kode på egen linje
│              Normal: 100m  Maks: 400m  │
└────────────────────────────────────────┘
```

**Før:**
- Kun navn som heading
- Code som liten tekst ved siden av navn

**Nå:**
- Type/navn som grønn badge (emerald-100 bakgrunn)
- "Kode: B100" på egen linje
- Normal/Maks avstand badges under

**Denne endringen gjelder:**
- Oppretting av stevne (CompetitionConfigure)
- Alle figurvelgere
- Kneppassistent

---

## ✅ 2. SVG-RENDERING DEBUG

**Endring:** `src/components/FieldFigure.tsx`

### Console output du vil se:

```
[FieldFigure] ========== RENDERING SVG ==========
[FieldFigure] Figure: {
  id: "7de5ac91-69b3-49fb-a217-8f4b8e351a76",
  name: "Grovfelt stående 100cm",
  code: "B100",
  has_svg_data: true,
  svg_length: 728
}
[FieldFigure] SVG Content Preview (first 500 chars): <svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="50" cy="20" rx="12" ry="15" fill="none" stroke="#1f2937" stroke-width="2"/>
  <rect x="45" y="35" width="10" height="60" rx="3" fill="none" stroke="#1f2937" stroke-width="2"/>
  <line x1="50" y1="45" x2="30" y2="70" stroke="#1f2937" stroke-width="2"/>
  <line x1="50" y1="45" x2="70" y2="70" stroke="#1f2937" stroke-width="2"/>
  <line x1="50" y1="95" x2="35" y2="140" stroke="#1f2937" stro...
[FieldFigure] SVG contains <rect>? true
[FieldFigure] SVG contains <circle>? true
[FieldFigure] SVG contains <ellipse>? true
[FieldFigure] SVG contains <line>? true
[FieldFigure] SVG contains fill="#1f2937"? false
[FieldFigure] Rendering with dangerouslySetInnerHTML
[FieldFigure] Container classes: bg-white rounded-lg p-4
```

### Hva loggene forteller:

**Hvis SVG-en er riktig:**
- `svg_length`: ~730 bytes (ikke 115)
- `<ellipse>`: true (hode)
- `<line>`: true (armer/ben)
- `<circle>`: true (føtter)
- Preview viser faktisk SVG-kode

**Hvis SVG-en fortsatt er feil:**
- `svg_length`: 115 bytes
- Kun `<rect>`: true
- Preview viser: `<rect width="100" height="180" fill="#1f2937"/>`

**Dette avslører:**
1. Om figuren fra databasen har riktig SVG
2. Om komponenten faktisk mottar data
3. Om rendering-pathen er korrekt

---

## ✅ 3. TIMEOUT/DONE-STATE KOMPLETT DEBUGGING

### A) I FieldClockDisplay (selve klokken)

**Eksisterende logging ved timeout:**
```
[FieldClockDisplay] ========== TIMEOUT REACHED ==========
[FieldClockDisplay] Calling onTimeUp handler
[FieldClockDisplay] Stage number: 1
```

### B) I CompetitionRun.updateEntryState

**NY omfattende logging:**
```
[CompetitionRun] ========== UPDATE ENTRY STATE ==========
[CompetitionRun] Updating to: {
  stageNumber: 1,
  stageState: "post_hold",
  status: undefined,
  entryId: "..."
}
[CompetitionRun] Updates to apply: {
  current_stage_number: 1,
  current_stage_state: "post_hold",
  current_hold_started_at: null
}
[CompetitionRun] Update result: {
  data: { 
    id: "...",
    current_stage_number: 1,
    current_stage_state: "post_hold",
    ...
  },
  error: null
}
[CompetitionRun] Setting entry state to: {
  current_stage_number: 1,
  current_stage_state: "post_hold",
  status: "active"
}
```

### C) I CompetitionRun.handleTimeUp

```
[CompetitionRun] ========== TIME UP ==========
[CompetitionRun] Time up on stage: 1
[CompetitionRun] Total stages: 3
[CompetitionRun] Is last stage: false
[CompetitionRun] Updated to post_hold state
```

### D) I CompetitionRun render (state check)

```
[CompetitionRun] ========== STATE CHECK ==========
[CompetitionRun] Entry state: post_hold
[CompetitionRun] Should render post_hold? true

[CompetitionRun] ========== POST HOLD STATE ==========
[CompetitionRun] post_hold state: {
  current_stage: 1,
  total_stages: 3,
  isLastStage: false,
  button_will_show: "Neste hold"
}
```

### E) Hvis state IKKE oppdateres (fallthrough)

```
[CompetitionRun] ========== FALLTHROUGH: INVALID STATE ==========
[CompetitionRun] Entry state was: running
[CompetitionRun] Expected one of: pre_hold, running, post_hold, completed
[CompetitionRun] Entry data: {
  id: "...",
  current_stage_number: 1,
  current_stage_state: "running",
  status: "active"
}
```

---

## 📊 KOMPLETT TIMEOUT-FLYTEN

### Normal flyt (hvis alt fungerer):

```
1. [FieldClockDisplay] Time left: 1
2. [FieldClockDisplay] Time left: 0
3. [FieldClockDisplay] ========== TIMEOUT REACHED ==========
4. [FieldClockDisplay] Calling onTimeUp handler
5. [CompetitionRun] ========== TIME UP ==========
6. [CompetitionRun] ========== UPDATE ENTRY STATE ==========
7. [CompetitionRun] Update result: { data: {...}, error: null }
8. [CompetitionRun] Setting entry state to: { current_stage_state: "post_hold" }
9. [CompetitionRun] ========== STATE CHECK ==========
10. [CompetitionRun] Entry state: post_hold
11. [CompetitionRun] Should render post_hold? true
12. [CompetitionRun] ========== POST HOLD STATE ==========
13. [HoldPostState] ========== RENDERING POST-HOLD ==========
14. UI: Grønn checkmark + "Neste hold" knapp
```

### Feil scenario 1: Database oppdatering feiler

```
1-5. (samme)
6. [CompetitionRun] ========== UPDATE ENTRY STATE ==========
7. [CompetitionRun] Update result: { data: null, error: {...} }
8. [CompetitionRun] Failed to update entry: {...error detaljer...}
9. [CompetitionRun] ========== STATE CHECK ==========
10. [CompetitionRun] Entry state: running  <- FORTSATT running!
11. [CompetitionRun] ========== RENDERING RUNNING STATE ==========
12. UI: Fortsatt klokke, står fast på 0:00
```

### Feil scenario 2: setEntry oppdaterer ikke react state

```
1-8. (samme)
9. [CompetitionRun] ========== STATE CHECK ==========
10. [CompetitionRun] Entry state: running  <- State oppdatert i DB, men ikke i React!
11. UI: Fortsatt klokke
```

### Feil scenario 3: React state oppdateres, men render-branch matcher ikke

```
1-10. (samme)
11. [CompetitionRun] Should render post_hold? false  <- Condition evaluerer feil!
12. [CompetitionRun] ========== FALLTHROUGH: INVALID STATE ==========
```

---

## 🔍 DIAGNOSTIKK BASERT PÅ CONSOLE OUTPUT

### Problem: "Mørk blokk fortsatt vises"

**Sjekk:**
1. `[FieldFigure] svg_length` - hvis 115: DB ikke oppdatert
2. `[FieldFigure] SVG contains <ellipse>?` - hvis false: feil SVG
3. `[FieldFigure] SVG Content Preview` - se faktisk innhold

**Løsning:**
- Refresh (Ctrl+Shift+R) hvis browser cache
- Sjekk at database faktisk har nye data
- Sjekk at riktig figure_id brukes

### Problem: "UI henger på 0:00 etter timeout"

**Sjekk sekvensen:**
1. Er "TIMEOUT REACHED" logged? 
   - Nei → Timer trigger ikke
2. Er "UPDATE ENTRY STATE" logged?
   - Nei → handleTimeUp ikke kalt
3. Er "Update result" success?
   - error !== null → Database-problem (RLS? Network?)
4. Er "Setting entry state" logged?
   - Nei → setEntry ikke kalt
5. Er "STATE CHECK" logged?
   - Nei → Komponenten re-rendrer ikke
6. Er "Entry state: post_hold"?
   - Nei → React state ikke oppdatert
7. Er "POST HOLD STATE" logged?
   - Nei → if-statement matcher ikke

### Problem: "Delete-knapp ikke synlig"

**Sjekk i Competitions.tsx:**
```
[Competitions] ========== ENTRY RENDER ==========
[Competitions] Entry: { completed_at: null }  <- Hvis null: ikke completed
[Competitions] Is completed: false
[Competitions] Delete button should show: false
[Competitions] DELETE BUTTON HIDDEN (not completed)
```

**Hvis completed_at er satt, men knapp ikke vises:**
- CSS z-index problem
- Button rendres, men skjult av noe annet
- Browser inspector: sjekk om button faktisk i DOM

---

## 🧪 TESTING-SJEKKLISTE

### Test 1: Verifiser Type-felt
1. Gå til Opprett stevne
2. Velg figurkategori
3. **Forvent:** Grønn badge med "Grovfelt stående 100cm"
4. **Forvent:** "Kode: B100" på egen linje

### Test 2: Verifiser SVG i run-view
1. Start et stevne med B100
2. Åpne console (F12)
3. Start holdet
4. **Se etter:**
   - `[FieldFigure] svg_length: 728`
   - `[FieldFigure] SVG contains <ellipse>? true`
5. **Visuelt:** Mannsfigur, ikke mørk blokk

### Test 3: Verifiser timeout-flow
1. Start et hold
2. La klokken gå til 0
3. **Følg sekvensen i console (se ovenfor)**
4. **Forvent:** Grønn checkmark + knapp innen 1 sekund

### Test 4: Verifiser delete-button
1. Fullfør et stevne helt
2. Gå til Stevner-siden
3. **Se console:**
   - `[Competitions] Is completed: true`
   - `[Competitions] DELETE BUTTON RENDERING`
4. **Visuelt:** Rød søppelbøtte topp-høyre

---

## 📝 NESTE STEG

**Når du tester:**
1. Åpne console FØRST (F12)
2. Start et hold
3. La timeout skje
4. **KOPIER HELE CONSOLE OUTPUT**
5. Rapporter tilbake med:
   - Hva du ser visuelt
   - Hele console-loggen
   - Hvilket steg som feiler

**Logging vil nå vise:**
- Eksakt hvor flyten stopper
- Om problem er database, React state, eller rendering
- Eksakt SVG-innhold som brukes
- Eksakt entry state før og etter oppdateringer

All informasjon du trenger for å diagnostisere problemet er nå i console!
