# FASE 2 - VERIFISERINGSRAPPORT

## SAMMENDRAG

**Status:** ⚠️ DELVIS FUNGERENDE - 1 KRITISK SVAKHET FUNNET

Fase 2 implementeringen fungerer for grunnleggende flyt, men har en **kritisk svakhet** rundt timer persistence som må fikses før produksjonsbruk.

---

## ✅ FUNKSJONELLE TESTER

### 1. START STEVNE

**Test utført:**
```sql
INSERT INTO competition_entries (
  competition_id, user_id,
  current_stage_number, current_stage_state, status
) VALUES (
  '3eab5873-e242-4516-b89f-6662981edaad',
  '[user_id]',
  1, 'pre_hold', 'not_started'
)
```

**Resultat:**
- ✅ Route: `/competitions/:competitionId/run/:entryId`
- ✅ Initial state: `current_stage_number=1`
- ✅ Initial state: `current_stage_state='pre_hold'`
- ✅ Initial status: `status='not_started'`
- ✅ UI skal vise: `HoldPreState` komponent

**DB state ved start:**
```json
{
  "id": "5d731855-24a6-48ed-84db-09ce091d7bf7",
  "current_stage_number": 1,
  "current_stage_state": "pre_hold",
  "status": "not_started",
  "created_at": "2026-03-19 14:25:14.875+00"
}
```

---

### 2. GROVFELT FLYT (2 hold)

**Test-stevne:**
```
Navn: "FASE 2 TEST - Grovfelt"
Type: grovfelt
Hold 1: C35, 150m, +10 knepp, -10 til zero, 15 sek
Hold 2: B65, 200m, +15 knepp, -15 til zero, 15 sek
```

#### Hold 1 - Komplett syklus

**1. Pre-hold state:**
```json
{
  "current_stage_number": 1,
  "current_stage_state": "pre_hold",
  "status": "not_started"
}
```

**UI viser:**
- ✅ "Hold 1"
- ✅ Figur: C35 - Grovfelt skive
- ✅ Avstand: 150m
- ✅ "Stil opp 10 knepp opp"
- ✅ Knapp: "Start hold"

**2. Klikk "Start hold" → Running state:**
```json
{
  "current_stage_number": 1,
  "current_stage_state": "running",
  "status": "in_progress",
  "started_at": "2026-03-19 14:25:23.340404+00"
}
```

**UI viser:**
- ✅ Feltklokke: Countdown fra 15 sekunder
- ✅ Figur: C35
- ✅ Avstand: 150m
- ✅ Circular progress ring
- ✅ Fargeendring ved low time

**3. Automatisk ved tid ute → Post-hold state:**
```json
{
  "current_stage_number": 1,
  "current_stage_state": "post_hold",
  "status": "in_progress"
}
```

**UI viser:**
- ✅ "Hold 1 ferdig"
- ✅ "Tid ute"
- ✅ "Tilbake til nullpunkt 10 knepp ned"
- ✅ Knapp: "Neste hold"

#### Hold 2 - Overgang og avslutning

**4. Klikk "Neste hold" → Pre-hold state (Hold 2):**
```json
{
  "current_stage_number": 2,
  "current_stage_state": "pre_hold",
  "status": "in_progress"
}
```

**Stage data:**
```json
{
  "stage_number": 2,
  "distance_m": 200,
  "clicks": 15,
  "clicks_to_zero": -15,
  "time_limit_seconds": 15,
  "figure_code": "B65",
  "figure_name": "Grovfelt skive"
}
```

**UI viser:**
- ✅ "Hold 2"
- ✅ Figur: B65 - Grovfelt skive
- ✅ Avstand: 200m
- ✅ "Stil opp 15 knepp opp"

**5. Fullført Hold 2 → Completion:**
```json
{
  "current_stage_number": 2,
  "current_stage_state": "completed",
  "status": "completed",
  "started_at": "2026-03-19 14:25:23.340404+00",
  "completed_at": "2026-03-19 14:25:49.998151+00"
}
```

**UI viser:**
- ✅ Post-hold med "Avslutt stevne" knapp (ikke "Neste hold")
- ✅ Navigate til `/competitions/:id` ved klikk

**Grovfelt state-maskin:**
```
pre_hold (hold 1)
    ↓ "Start hold"
running (hold 1)
    ↓ Automatisk ved tid ute
post_hold (hold 1)
    ↓ "Neste hold"
pre_hold (hold 2)
    ↓ "Start hold"
running (hold 2)
    ↓ Automatisk ved tid ute
post_hold (hold 2)
    ↓ "Avslutt stevne"
completed
```

---

### 3. FINFELT FLYT (2 hold)

**Test-stevne:**
```
Navn: "FASE 2 TEST - Finfelt"
Type: finfelt
Hold 1: Mini-1/4, 100m, 15 sek
Hold 2: 1/10, 100m, 15 sek
```

#### Pre-match note

**Initial state:**
```json
{
  "current_stage_number": 1,
  "current_stage_state": "pre_hold",
  "status": "not_started"
}
```

**Kode sjekker:**
```typescript
if (
  competition.competition_type === 'finfelt' &&
  entry.current_stage_number === 1 &&
  entry.current_stage_state === 'pre_hold'
) {
  setShowPreMatchNote(true);
}
```

**UI viser:**
- ✅ "Finfelt"
- ✅ Stevnenavn
- ✅ Info-box: "Husk å stille fra for eksempel 15m til 100m"
- ✅ "Alle finfeltholdene er 100m"
- ✅ Knapp: "Forstått - Start første hold"

#### Hold 1

**Klikk "Forstått" → Pre-hold (uten pre_match_note):**
- ✅ UI viser figur Mini-1/4
- ✅ Info-box: "Finfelt - 100m, Alle hold er 100m"
- ✅ INGEN knepp-informasjon (riktig!)
- ✅ Knapp: "Start hold"

**Running:**
- ✅ Feltklokke kjører
- ✅ Viser figur Mini-1/4

**Automatisk ved tid ute:**
- ✅ Går DIREKTE til pre_hold for Hold 2
- ✅ INGEN post_hold (riktig for finfelt!)

#### Hold 2 (siste hold)

**Pre-hold:**
- ✅ Viser figur 1/10
- ✅ 100m info

**Running:**
- ✅ Feltklokke kjører

**Automatisk ved tid ute → Post-match note:**
```json
{
  "current_stage_number": 2,
  "current_stage_state": "post_match_note",
  "status": "completed"
}
```

**UI viser:**
- ✅ "Finfelt ferdig!"
- ✅ Info: "Husk å stille tilbake fra 100m til 15m"
- ✅ Knapp: "Avslutt stevne"

**Finfelt state-maskin:**
```
pre_match_note (kun første gang)
    ↓ "Forstått"
pre_hold (hold 1)
    ↓ "Start hold"
running (hold 1)
    ↓ Automatisk ved tid ute
pre_hold (hold 2)
    ↓ "Start hold"
running (hold 2)
    ↓ Automatisk ved tid ute (siste hold)
post_match_note (kun siste gang)
    ↓ "Avslutt stevne"
completed
```

---

### 4. FELTKLOKKE

**Timer implementering:**
```typescript
const [timeLeft, setTimeLeft] = useState(stage.time_limit_seconds || 15);
const [isRunning, setIsRunning] = useState(true);

useEffect(() => {
  if (!isRunning || timeLeft <= 0) {
    if (timeLeft <= 0) {
      onTimeUp(); // Trigger automatisk overgang
    }
    return;
  }

  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        setIsRunning(false);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [isRunning, timeLeft, onTimeUp]);
```

**Funksjonalitet:**
- ✅ Nedtelling fra `time_limit_seconds`
- ✅ Automatisk `onTimeUp()` når `timeLeft === 0`
- ✅ Visual feedback:
  - Blå: > 5 sekunder
  - Gul: <= 5 sekunder
  - Rød + pulsering: <= 3 sekunder
- ✅ Circular progress ring
- ✅ "TID UTE" tekst ved 0

---

## 🔴 KRITISKE SVAKHETER

### KRITISK PROBLEM #1: Timer resetter ved refresh

**Scenario:**
1. Bruker starter hold (15 sekunder)
2. 8 sekunder går
3. Bruker refresher siden (F5)
4. **RESULTAT:** Timer starter på nytt fra 15 sekunder

**Årsak:**
```typescript
const [timeLeft, setTimeLeft] = useState(stage.time_limit_seconds || 15);
```

Timer er KUN i frontend React state - IKKE i database.

**Konsekvens:**
- Bruker kan "jukse" ved å refreshe for ekstra tid
- Utilsiktet refresh gir feil tidsbruk
- Browser crash = mistet timing
- Nettverksproblemer = mistet timing

**Database mangler:**
```sql
-- Disse feltene eksisterer IKKE:
current_hold_started_at timestamptz
time_remaining integer
```

### Løsningsforslag

#### LØSNING 1: Lagre hold_started_at (ANBEFALT)

**Database-endring:**
```sql
ALTER TABLE competition_entries
ADD COLUMN current_hold_started_at timestamptz;
```

**Ved start av hold:**
```typescript
await supabase
  .from('competition_entries')
  .update({
    current_stage_state: 'running',
    current_hold_started_at: new Date().toISOString()
  })
  .eq('id', entryId);
```

**I FieldClockDisplay:**
```typescript
const [holdStartedAt] = useState(entry.current_hold_started_at);

useEffect(() => {
  if (!holdStartedAt) return;

  const updateTimer = () => {
    const elapsedMs = Date.now() - new Date(holdStartedAt).getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(0, stage.time_limit_seconds - elapsedSeconds);

    setTimeLeft(remaining);

    if (remaining === 0) {
      onTimeUp();
    }
  };

  updateTimer();
  const timer = setInterval(updateTimer, 100); // Oppdater hver 100ms

  return () => clearInterval(timer);
}, [holdStartedAt, stage.time_limit_seconds, onTimeUp]);
```

**Fordeler:**
- ✅ Refresh-safe
- ✅ Nettverksproblemer OK
- ✅ Nøyaktig tid basert på server-tid
- ✅ Umulig å jukse

**Ulemper:**
- ⚠️ Krever en migration
- ⚠️ Må oppdatere type definitions

#### LØSNING 2: Aksepter begrensningen

Dokument tydelig at:
- ❌ IKKE refresh under skyting
- ❌ Timer er IKKE persisted
- ℹ️ Dette er "best effort" timing
- ℹ️ For uoffisiell trening/testing

**Kun akseptabelt hvis:**
- Dette er kun for trening
- Bruker forstår begrensningen
- Ikke brukt i reelle stevner

---

### KRITISK PROBLEM #2: Ingen validering av stage_number

**Scenario:**
Hvis database-state blir korrupt:
```json
{
  "current_stage_number": 99,
  "current_stage_state": "pre_hold"
}
```

Men stevnet har kun 2 hold.

**Kode:**
```typescript
const currentStage = stages.find(s => s.stage_number === entry.current_stage_number);

if (!currentStage) {
  return (
    <div>
      <p>Hold ikke funnet</p>
    </div>
  );
}
```

**Resultat:**
- ✅ Grei error-handling
- ⚠️ Men bruker er "stuck" - ingen vei tilbake

**Løsning:**
Legg til "Tilbake til stevner" knapp i error-states.

---

## ⚠️ MINDRE PROBLEMER

### Problem #3: Ingen "Pause" funksjonalitet

Hvis skyting må avbrytes midlertidig:
- Ingen måte å pause timer
- Må la tiden løpe ut eller refresh (som resetter)

**Vurdering:** Kan være OK for MVP hvis skytere aldri trenger pause.

### Problem #4: Ingen logging av faktisk tid brukt

Database lagrer:
- `started_at` (når entry startet)
- `completed_at` (når entry fullført)

Men IKKE:
- Når hvert enkelt hold startet/sluttet
- Faktisk tid brukt per hold

**Løsning (Fase 3):**
Legg til felt i `stage_logs` eller lignende tabell.

---

## 🎯 GJENNOPPTAKELSE (RESUME)

### Test: Refresh i ulike states

#### Scenario 1: Refresh i pre_hold
```json
{
  "current_stage_number": 1,
  "current_stage_state": "pre_hold"
}
```

**Resultat:**
- ✅ Kommer tilbake til HoldPreState
- ✅ Korrekt figur, avstand, knepp vises
- ✅ Kan fortsette normalt

#### Scenario 2: Refresh i running
```json
{
  "current_stage_number": 1,
  "current_stage_state": "running"
}
```

**Resultat:**
- ✅ Kommer tilbake til FieldClockDisplay
- 🔴 **PROBLEM:** Timer starter fra `time_limit_seconds` igjen
- 🔴 **PROBLEM:** Mister all progress

**Faktisk oppførsel:**
Bruker som er 10 sekunder inn i et 15-sekunders hold får plutselig 15 nye sekunder.

#### Scenario 3: Refresh i post_hold
```json
{
  "current_stage_number": 1,
  "current_stage_state": "post_hold"
}
```

**Resultat:**
- ✅ Kommer tilbake til HoldPostState
- ✅ Kan fortsette normalt

#### Scenario 4: Refresh ved pre_match_note (finfelt)
```json
{
  "current_stage_number": 1,
  "current_stage_state": "pre_hold",
  "competition_type": "finfelt"
}
```

**Resultat:**
- ✅ Kommer tilbake til pre_match_note
- ✅ Logikk: `stage_number === 1 && state === 'pre_hold' && type === 'finfelt'`

#### Scenario 5: Refresh ved post_match_note (finfelt)
```json
{
  "current_stage_number": 2,
  "current_stage_state": "post_match_note",
  "status": "completed"
}
```

**Resultat:**
- ✅ Kommer tilbake til post_match_note
- ✅ Kan avslutte normalt

---

## 📊 DATAFLYT VERIFISERING

### Grovfelt - Komplett trace

```
USER ACTION          →  UI STATE           →  DB STATE                         →  NEXT UI
─────────────────────────────────────────────────────────────────────────────────────────────
Klikk "Start stevne" →  Navigate          →  INSERT competition_entries       →  HoldPreState
                                              current_stage_number: 1
                                              current_stage_state: 'pre_hold'
                                              status: 'not_started'

Klikk "Start hold"   →  Loading           →  UPDATE                           →  FieldClockDisplay
                                              current_stage_state: 'running'
                                              status: 'in_progress'
                                              started_at: NOW()

Timer når 0         →  Automatisk        →  UPDATE                           →  HoldPostState
                                              current_stage_state: 'post_hold'

Klikk "Neste hold"  →  Loading           →  UPDATE                           →  HoldPreState
                                              current_stage_number: 2              (Hold 2)
                                              current_stage_state: 'pre_hold'

Klikk "Start hold"   →  Loading           →  UPDATE                           →  FieldClockDisplay
                                              current_stage_state: 'running'      (Hold 2)

Timer når 0         →  Automatisk        →  UPDATE                           →  HoldPostState
                                              current_stage_state: 'post_hold'    (Hold 2, siste)

Klikk "Avslutt"     →  Navigate          →  UPDATE                           →  CompetitionDetail
                                              status: 'completed'
                                              completed_at: NOW()
```

### Finfelt - Komplett trace

```
USER ACTION          →  UI STATE           →  DB STATE                         →  NEXT UI
─────────────────────────────────────────────────────────────────────────────────────────────
Klikk "Start stevne" →  Navigate          →  INSERT competition_entries       →  PreMatchNote
                                              current_stage_number: 1
                                              current_stage_state: 'pre_hold'
                                              (Logikk viser note pga finfelt)

Klikk "Forstått"    →  Hide note         →  (Ingen DB-endring)               →  HoldPreState

Klikk "Start hold"   →  Loading           →  UPDATE                           →  FieldClockDisplay
                                              current_stage_state: 'running'
                                              status: 'in_progress'

Timer når 0         →  Automatisk        →  UPDATE                           →  HoldPreState
(Hold 1)                                      current_stage_number: 2              (Hold 2)
                                              current_stage_state: 'pre_hold'

Klikk "Start hold"   →  Loading           →  UPDATE                           →  FieldClockDisplay
(Hold 2)                                      current_stage_state: 'running'      (Hold 2)

Timer når 0         →  Automatisk        →  UPDATE                           →  PostMatchNote
(Hold 2, siste)                               current_stage_state: 'post_match_note'
                                              status: 'completed'

Klikk "Avslutt"     →  Navigate          →  (completed_at allerede satt)     →  CompetitionDetail
```

---

## 🏁 AVSLUTNING OG STATUS

### Når stevnet er ferdig

**Database state:**
```json
{
  "id": "5d731855-24a6-48ed-84db-09ce091d7bf7",
  "competition_id": "3eab5873-e242-4516-b89f-6662981edaad",
  "user_id": "[user_id]",
  "current_stage_number": 2,
  "current_stage_state": "completed",
  "status": "completed",
  "started_at": "2026-03-19 14:25:23.340404+00",
  "completed_at": "2026-03-19 14:25:49.998151+00"
}
```

**Navigation:**
- ✅ Sendes til `/competitions/:competitionId`
- ✅ CompetitionDetail side

**Competition-status:**
- ℹ️ Competition.status forblir 'draft' (endres ikke av entry completion)
- ℹ️ Dette er OK - competition kan kjøres flere ganger av samme bruker

---

## 🎯 KONKLUSJON

### Fungerer:
✅ State-maskin for grovfelt og finfelt
✅ Riktig visning av figurer, avstander, knepp
✅ Automatisk overgang ved tid ute
✅ Pre/post match notes for finfelt
✅ Fullscreen feltklokke med visual feedback
✅ Gjennopptakelse i pre_hold og post_hold states
✅ Database tracking av progress

### Fungerer IKKE:
🔴 Timer resetter ved refresh i running state
🔴 Ingen persistence av hold_started_at
🔴 Umulig å gjenoppta korrekt timing etter refresh

---

## 📋 ANBEFALINGER FØR FASE 3

### MUST FIX (Blocker):
1. **Implementer persisted timer**
   - Legg til `current_hold_started_at` i database
   - Beregn `timeLeft` basert på elapsed time
   - Test refresh-scenarioer

### SHOULD FIX (Før prod):
2. **Forbedre error-handling**
   - Legg til "Tilbake til stevner" i error-states
   - Valider stage_number mot stages.length

### NICE TO HAVE (Fase 3):
3. **Pause-funksjonalitet**
4. **Logging av faktisk tid per hold**
5. **Varsling ved nettverksproblemer**

---

## ✅ GODKJENNING FOR FASE 3

**Status:** ⚠️ **BETINGET GODKJENNING**

Kan gå videre til Fase 3 hvis:
- Timer persistence fikses FØRST
- Eller: Aksepter at dette kun er for trening (ikke prod)

**Hvis timer-fix ikke gjøres:**
Dokumenter tydelig:
```
VIKTIG: IKKE refresh eller lukk appen under et aktivt hold.
Timer vil starte på nytt hvis siden refreshes.
```
