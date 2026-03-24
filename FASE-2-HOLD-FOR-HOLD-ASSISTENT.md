# FASE 2 - HOLD-FOR-HOLD ASSISTENT

## OVERSIKT

Fase 2 implementerer en assistert gjennomføring av stevner hvor brukeren ledes gjennom hvert hold steg for steg. Feltklokka er integrert direkte i holdflyten - ikke en separat side.

## DATAMODELL

### Database-endringer

**Ny tabell: `competition_entries`**
```sql
ALTER TABLE competition_entries
ADD COLUMN current_stage_number integer DEFAULT 1,
ADD COLUMN current_stage_state text DEFAULT 'pre_hold',
ADD COLUMN status text DEFAULT 'not_started';
```

**States:**
- `status`: 'not_started', 'in_progress', 'completed'
- `current_stage_state`: 'pre_hold', 'running', 'post_hold', 'completed', 'pre_match_note', 'post_match_note'

**TypeScript type:**
```typescript
export interface CompetitionEntry {
  id: string;
  competition_id: string;
  user_id: string;
  weapon_id: string | null;
  click_table_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  current_stage_number: number;
  current_stage_state: string;
  status: string;
  total_score: number | null;
  total_inner_hits: number | null;
  total_hits: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

## ARKITEKTUR

### Komponentstruktur

```
/pages/CompetitionRun.tsx              <- Hoved state-machine
/components/competition/
  ├── HoldPreState.tsx                 <- Pre-hold visning
  ├── FieldClockDisplay.tsx            <- Feltklokke under hold
  └── HoldPostState.tsx                <- Post-hold visning
```

### State-machine

**Grovfelt flyt:**
```
1. pre_hold     -> Viser figur, avstand, knepp opp
2. running      -> Feltklokke kjører
3. post_hold    -> Viser knepp ned til zero
4. (tilbake til 1 for neste hold, eller ferdig)
```

**Finfelt flyt:**
```
1. pre_match_note  -> Kun første gang: "Husk å stille til 100m"
2. pre_hold        -> Viser figur
3. running         -> Feltklokke kjører
4. (repeat 2-3 for alle hold)
5. post_match_note -> Kun siste gang: "Husk å stille tilbake til 15m"
```

## GROVFELT GJENNOMFØRING

### 1. Pre-hold state

**Visning:**
```
┌──────────────────────────────────┐
│          Hold 1                  │
│         Forbered deg             │
├──────────────────────────────────┤
│                                  │
│    [Target Icon]                 │
│         C35                      │
│    Grovfelt skive                │
│                                  │
├──────────────────────────────────┤
│       Avstand: 150m              │
├──────────────────────────────────┤
│    [↑] Stil opp                  │
│      10 knepp opp                │
│                                  │
├──────────────────────────────────┤
│   [Start hold] (grønn knapp)     │
└──────────────────────────────────┘
```

**Kode:**
```typescript
<HoldPreState
  stage={currentStage}
  figure={currentFigure}
  competitionType="grovfelt"
  onStartHold={handleStartHold}
/>
```

**Data:**
- `stage.field_figure_id` -> figur info
- `stage.distance_m` -> avstand
- `stage.clicks` -> knepp opp/ned fra zero

### 2. Running state

**Visning:**
```
┌──────────────────────────────────┐
│          Hold 1                  │
├──────────────────────────────────┤
│    C35 • Grovfelt skive          │
├──────────────────────────────────┤
│                                  │
│        [Clock Icon]              │
│            15                    │
│         sekunder                 │
│   (circular progress ring)       │
│                                  │
├──────────────────────────────────┤
│       Avstand: 150m              │
└──────────────────────────────────┘
```

**Features:**
- Circular progress ring
- Countdown timer
- Fargeendring:
  - > 5 sek: blå
  - <= 5 sek: gul
  - <= 3 sek: rød + pulsering

**Kode:**
```typescript
<FieldClockDisplay
  stage={currentStage}
  figure={currentFigure}
  onTimeUp={handleTimeUp}
/>
```

**Auto-overgang:**
Når `timeLeft === 0`:
- Grovfelt: `onTimeUp()` → state = 'post_hold'
- Finfelt: `onTimeUp()` → neste hold eller post_match_note

### 3. Post-hold state (kun Grovfelt)

**Visning:**
```
┌──────────────────────────────────┐
│       Hold 1 ferdig              │
│         Tid ute                  │
├──────────────────────────────────┤
│    [↓] Tilbake til nullpunkt     │
│      10 knepp ned                │
│                                  │
├──────────────────────────────────┤
│   [Neste hold →] (blå knapp)     │
│       eller                      │
│   [Avslutt stevne] (grønn)       │
└──────────────────────────────────┘
```

**Kode:**
```typescript
<HoldPostState
  stage={currentStage}
  isLastStage={isLastStage}
  onNextHold={handleNextHold}
  onFinish={handleFinish}
/>
```

**Data:**
- `stage.clicks_to_zero` -> knepp tilbake til zero
- `isLastStage` -> bestemmer hvilken knapp som vises

## FINFELT GJENNOMFØRING

### 1. Pre-match note (kun før første hold)

**Visning:**
```
┌──────────────────────────────────┐
│         Finfelt                  │
│    [Stevnenavn]                  │
├──────────────────────────────────┤
│  [i] Før første hold:            │
│                                  │
│  Husk å stille fra for eksempel  │
│  15m til 100m før du starter.    │
│                                  │
│  Alle finfeltholdene er 100m.    │
│                                  │
├──────────────────────────────────┤
│  [Forstått - Start første hold]  │
└──────────────────────────────────┘
```

**Logikk:**
```typescript
if (
  competition.competition_type === 'finfelt' &&
  entry.current_stage_number === 1 &&
  entry.current_stage_state === 'pre_hold'
) {
  setShowPreMatchNote(true);
}
```

### 2. Pre-hold state

**Visning:**
```
┌──────────────────────────────────┐
│          Hold 1                  │
│         Forbered deg             │
├──────────────────────────────────┤
│    [Target Icon]                 │
│       Mini-1/4                   │
│     Finfelt skive                │
│                                  │
├──────────────────────────────────┤
│  [i] Finfelt - 100m              │
│  Alle hold er 100m.              │
│  Husk å kontrollere at rifta     │
│  er stilt til 100m.              │
│                                  │
├──────────────────────────────────┤
│   [Start hold] (grønn knapp)     │
└──────────────────────────────────┘
```

**Forskjell fra Grovfelt:**
- Ingen "Stil opp X knepp"
- Info-box om 100m konstant avstand

### 3. Running state

Identisk med Grovfelt - samme `FieldClockDisplay` komponent.

### 4. Post-match note (kun etter siste hold)

**Visning:**
```
┌──────────────────────────────────┐
│    [✓] Finfelt ferdig!           │
│    [Stevnenavn]                  │
├──────────────────────────────────┤
│  [i] Etter siste hold:           │
│                                  │
│  Husk å stille tilbake fra       │
│  100m til 15m.                   │
│                                  │
├──────────────────────────────────┤
│   [Avslutt stevne]               │
└──────────────────────────────────┘
```

**Logikk:**
```typescript
const isLastStage = entry.current_stage_number >= stages.length;

if (isLastStage) {
  setShowPostMatchNote(true);
  await updateEntryState(
    entry.current_stage_number,
    'post_match_note',
    'completed'
  );
}
```

## STATE TRANSITIONS

### Database-oppdateringer

**Funksjon:**
```typescript
const updateEntryState = async (
  stageNumber: number,
  stageState: string,
  status?: string
) => {
  const updates: any = {
    current_stage_number: stageNumber,
    current_stage_state: stageState,
  };

  if (status) {
    updates.status = status;
  }

  if (stageState === 'running' && !entry?.started_at) {
    updates.started_at = new Date().toISOString();
  }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  await supabase
    .from('competition_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .maybeSingle();
};
```

### Grovfelt transitions

```typescript
// pre_hold -> running
handleStartHold() {
  await updateEntryState(
    entry.current_stage_number,
    'running',
    'in_progress'
  );
}

// running -> post_hold
handleTimeUp() {
  await updateEntryState(
    entry.current_stage_number,
    'post_hold'
  );
}

// post_hold -> pre_hold (neste hold)
handleNextHold() {
  const nextStageNumber = entry.current_stage_number + 1;
  await updateEntryState(nextStageNumber, 'pre_hold');
}

// post_hold -> completed (siste hold)
handleFinish() {
  await updateEntryState(
    entry.current_stage_number,
    'completed',
    'completed'
  );
  navigate(`/competitions/${competitionId}`);
}
```

### Finfelt transitions

```typescript
// running -> pre_hold (neste hold)
// eller running -> post_match_note (siste hold)
handleTimeUp() {
  const isLastStage = entry.current_stage_number >= stages.length;

  if (isLastStage) {
    setShowPostMatchNote(true);
    await updateEntryState(
      entry.current_stage_number,
      'post_match_note',
      'completed'
    );
  } else {
    await updateEntryState(
      entry.current_stage_number + 1,
      'pre_hold'
    );
  }
}
```

## FELTKLOKKE INTEGRASJON

### Design-prinsipper

1. Feltklokka er IKKE en separat side
2. Feltklokka ER en del av state-flyten
3. Automatisk overgang når tid er ute
4. Visuell feedback med farger og animasjon

### Implementering

**Komponent:** `FieldClockDisplay.tsx`

**Props:**
```typescript
interface FieldClockDisplayProps {
  stage: CompetitionStage;
  figure: FieldFigure | null;
  onTimeUp: () => void;
}
```

**Timer logikk:**
```typescript
const [timeLeft, setTimeLeft] = useState(stage.time_limit_seconds || 15);
const [isRunning, setIsRunning] = useState(true);

useEffect(() => {
  if (!isRunning || timeLeft <= 0) {
    if (timeLeft <= 0) {
      onTimeUp(); // Trigger state change
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

**Visual feedback:**
```typescript
const isLowTime = timeLeft <= 5;
const isVeryLowTime = timeLeft <= 3;

// Farger
const color = isVeryLowTime ? 'red' : isLowTime ? 'yellow' : 'blue';

// Animasjon
const animation = isVeryLowTime ? 'animate-pulse' : '';
```

**Circular progress:**
```typescript
const progress =
  ((stage.time_limit_seconds || 15) - timeLeft) /
  (stage.time_limit_seconds || 15) * 100;

<svg>
  <circle
    strokeDasharray={`${progress * 9.42} ${942 - (progress * 9.42)}`}
  />
</svg>
```

## KOMPLETT FLYTDIAGRAM

### Grovfelt

```
START
  |
  v
┌─────────────────┐
│ CompetitionStart│ <- Velg våpen, knepptabell
│ /start          │
└────────┬────────┘
         │ Klikk "Start stevne"
         │ INSERT competition_entry
         │ status = 'not_started'
         │ current_stage_number = 1
         │ current_stage_state = 'pre_hold'
         v
┌─────────────────┐
│ HoldPreState    │
│ pre_hold        │ <- Vis figur, avstand, knepp opp
└────────┬────────┘
         │ Klikk "Start hold"
         │ UPDATE status = 'in_progress'
         │ UPDATE current_stage_state = 'running'
         v
┌─────────────────┐
│ FieldClockDisplay│
│ running         │ <- Countdown timer
└────────┬────────┘
         │ Automatisk når timeLeft === 0
         │ UPDATE current_stage_state = 'post_hold'
         v
┌─────────────────┐
│ HoldPostState   │
│ post_hold       │ <- Vis knepp ned til zero
└────────┬────────┘
         │
         ├─> Hvis ikke siste hold:
         │   Klikk "Neste hold"
         │   UPDATE current_stage_number += 1
         │   UPDATE current_stage_state = 'pre_hold'
         │   (Gå tilbake til HoldPreState)
         │
         └─> Hvis siste hold:
             Klikk "Avslutt stevne"
             UPDATE status = 'completed'
             UPDATE completed_at = now()
             NAVIGATE til /competitions/:id
```

### Finfelt

```
START
  |
  v
┌─────────────────┐
│ CompetitionStart│
│ /start          │
└────────┬────────┘
         │ INSERT competition_entry
         v
┌─────────────────┐
│ PreMatchNote    │ <- KUN første gang
│ pre_match_note  │    "Husk å stille til 100m"
└────────┬────────┘
         │ Klikk "Forstått"
         v
┌─────────────────┐
│ HoldPreState    │
│ pre_hold        │ <- Vis figur (alltid 100m)
└────────┬────────┘
         │ Klikk "Start hold"
         │ UPDATE current_stage_state = 'running'
         v
┌─────────────────┐
│ FieldClockDisplay│
│ running         │ <- Countdown timer
└────────┬────────┘
         │ Automatisk når timeLeft === 0
         │
         ├─> Hvis ikke siste hold:
         │   UPDATE current_stage_number += 1
         │   UPDATE current_stage_state = 'pre_hold'
         │   (Gå tilbake til HoldPreState)
         │
         └─> Hvis siste hold:
             UPDATE current_stage_state = 'post_match_note'
             UPDATE status = 'completed'
             v
         ┌─────────────────┐
         │ PostMatchNote   │ <- KUN etter siste hold
         │ post_match_note │    "Husk å stille tilbake til 15m"
         └────────┬────────┘
                  │ Klikk "Avslutt stevne"
                  │ NAVIGATE til /competitions/:id
```

## ROUTING

**Eksisterende:**
- `/competitions/:competitionId/start` -> CompetitionStart
- `/competitions/:competitionId/run/:entryId` -> CompetitionRun

**Ingen nye routes trengs.**

## TESTING SCENARIO

### Test 1: Grovfelt med 2 hold

**Setup:**
```
Stevne: "Testskyting Grovfelt"
Hold 1: C35, 150m, 15 sek, +10 knepp, -10 knepp til zero
Hold 2: B65, 200m, 15 sek, +15 knepp, -15 knepp til zero
```

**Forventet flyt:**
```
1. Start-side: Velg våpen, knepptabell
2. Klikk "Start stevne"
3. Pre-hold: Hold 1, C35, 150m, "Stil opp 10 knepp opp"
4. Klikk "Start hold"
5. Feltklokke: 15 sekunder countdown
6. Automatisk: Post-hold, "Tilbake til nullpunkt 10 knepp ned"
7. Klikk "Neste hold"
8. Pre-hold: Hold 2, B65, 200m, "Stil opp 15 knepp opp"
9. Klikk "Start hold"
10. Feltklokke: 15 sekunder countdown
11. Automatisk: Post-hold, "Tilbake til nullpunkt 15 knepp ned"
12. Klikk "Avslutt stevne"
13. Navigate til /competitions/:id
```

### Test 2: Finfelt med 2 hold

**Setup:**
```
Stevne: "Finfelt match"
Hold 1: Mini-1/4, 100m, 15 sek
Hold 2: 1/10, 100m, 15 sek
```

**Forventet flyt:**
```
1. Start-side: Velg våpen, knepptabell
2. Klikk "Start stevne"
3. Pre-match note: "Husk å stille fra 15m til 100m"
4. Klikk "Forstått - Start første hold"
5. Pre-hold: Hold 1, Mini-1/4, info om 100m
6. Klikk "Start hold"
7. Feltklokke: 15 sekunder countdown
8. Automatisk: Pre-hold Hold 2
9. Klikk "Start hold"
10. Feltklokke: 15 sekunder countdown
11. Automatisk: Post-match note "Husk å stille tilbake fra 100m til 15m"
12. Klikk "Avslutt stevne"
13. Navigate til /competitions/:id
```

## ENDRINGER I EKSISTERENDE KODE

### 1. CompetitionStart.tsx

**Før:**
```typescript
const { data } = await supabase
  .from('competition_entries')
  .insert({
    competition_id: competitionId,
    user_id: user.id,
    weapon_id: selectedWeaponId || null,
    click_table_id: selectedTableId || null,
    started_at: new Date().toISOString(),
  })
```

**Etter:**
```typescript
const { data } = await supabase
  .from('competition_entries')
  .insert({
    competition_id: competitionId,
    user_id: user.id,
    weapon_id: selectedWeaponId || null,
    click_table_id: selectedTableId || null,
    current_stage_number: 1,
    current_stage_state: 'pre_hold',
    status: 'not_started',
  })
```

**Fikset også:** Feltnavn fra `figure_id` til `field_figure_id`

### 2. CompetitionRun.tsx

**Før:**
Eksisterende implementasjon med manuell navigering mellom hold.

**Etter:**
Helt ny implementasjon med state-machine og integrert feltklokke.

**Backup:**
Gammel fil lagret som `CompetitionRun.old.tsx`

## BEGRENSNINGER OG SCOPE

**Fase 2 inkluderer IKKE:**
- Bildeopplasting per hold
- Manuell skuddføring
- Poengberegning
- Treffregistrering
- Vinddata per hold

**Disse kommer i Fase 3.**

## KONKLUSJON

Fase 2 gir en full assistert gjennomføring av stevner:

1. ✓ Hold-for-hold navigering
2. ✓ Integrert feltklokke
3. ✓ Grovfelt-spesifikk flyt med knepp opp/ned
4. ✓ Finfelt-spesifikk flyt med pre/post match notes
5. ✓ Automatisk state-overgang
6. ✓ Fullscreen visuell design
7. ✓ Database tracking av state

**Neste steg (Fase 3):**
- Bildeopplasting per hold
- Skuddlogging
- Poengberegning
- Oppsummering
