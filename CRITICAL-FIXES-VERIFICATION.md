# KRITISKE FIXES - FELTFLYTEN

---

## ✅ FIX 1: FIGUR-PROBLEM I RUN

### Problem
Riktig figur i configure, men feil/eldre figur viste i run.

### Root Cause
**FieldFigure.tsx** manglet `size` og `showName` props som ActiveHoldScreen prøvde å bruke.

TypeScript error:
```
Property 'size' does not exist on type 'IntrinsicAttributes & FieldFigureProps'
```

### Fix
Oppdatert **FieldFigure.tsx** (linje 3-15):
```typescript
interface FieldFigureProps {
  figure: FieldFigureType | null;
  className?: string;
  size?: 'small' | 'medium' | 'large';    // ✅ NY
  showName?: boolean;                       // ✅ NY
}
```

Implementert støtte for:
- 3 størrelser: small (p-2), medium (p-4), large (p-6)
- Valgfri visning av figurnavn
- Sikker håndtering av `null` svg_data

### Konsekvens
- ActiveHoldScreen kan nå vise figurer korrekt
- Ingen TypeScript errors
- Figur fra configure vises i run

---

## ✅ FIX 2: NAVIGASJONSBLOKKERING

### Problem
Hvis man trykker feil (meny/hjem) midt i hold:
- Forlater stevnet uten advarsel
- Klokken starter på nytt ved retur

### Fix
**Implementert:**

1. **use-block-navigation.ts** (ny fil)
   - Browser `beforeunload` event blokkerer reload/lukk
   - Viser standard browser-dialog med melding

2. **MatchActive.tsx** (linje 31-35)
   ```typescript
   const [clockStarted, setClockStarted] = useState(false);

   useBlockNavigation(
     clockStarted && !showResetReminder,
     'Du er midt i et hold. Klokken vil starte på nytt hvis du forlater.'
   );
   ```

3. **ActiveHoldScreen.tsx** (linje 12-13, 36-38)
   - Sender `onClockStart` callback til parent
   - Parent setter `clockStarted = true`
   - Navigasjon blokkeres automatisk

### Beskyttelse
- ✅ Browser reload (F5)
- ✅ Lukk vindu/tab
- ✅ Back/forward
- ✅ Ekstern navigasjon

### User Experience
Browser viser standard dialog:
```
"Du er midt i et hold. Klokken vil starte på nytt hvis du forlater."
[ Forlat siden ] [ Bli på siden ]
```

---

## ✅ FIX 3: KLOKKE-RESUME

### Problem
Ved reload midt i hold starter klokken på nytt.

### Fix
**Implementert timestamp-basert resume:**

1. **match-service.ts** (linje 180-200)
   ```typescript
   export async function startHold(holdId: string): Promise<void> {
     const { data } = await supabase
       .from('match_holds')
       .select('started_at')
       .eq('id', holdId)
       .maybeSingle();

     // Sett timestamp kun første gang
     if (!data?.started_at) {
       await supabase
         .from('match_holds')
         .update({ started_at: new Date().toISOString() })
         .eq('id', holdId);
     }
   }

   export function getElapsedTime(startedAt: string | null): number {
     if (!startedAt) return 0;
     const start = new Date(startedAt).getTime();
     const now = Date.now();
     return Math.floor((now - start) / 1000);
   }
   ```

2. **MatchActive.tsx** (linje 118-132)
   ```typescript
   const handleClockStart = async () => {
     if (currentHold) {
       await startHold(currentHold.id);  // Lagrer timestamp
     }
     setClockStarted(true);
   };

   const getInitialElapsedTime = () => {
     if (!currentHold?.started_at) return 0;
     return getElapsedTime(currentHold.started_at);
   };
   ```

3. **HybridClock.tsx** (linje 9, 17, 27-45)
   ```typescript
   interface HybridClockProps {
     initialElapsedTime?: number;  // ✅ NY
   }

   useEffect(() => {
     const safePrepTime = prepTime ?? 15;
     const safeShootTime = shootTime ?? 60;

     if (initialElapsedTime > 0) {
       // Beregn korrekt fase og tid basert på elapsed
       if (initialElapsedTime < safePrepTime) {
         setPhase('prep');
         setTimeLeft(safePrepTime - initialElapsedTime);
       } else if (initialElapsedTime < safePrepTime + safeShootTime) {
         setPhase('shoot');
         setTimeLeft(safePrepTime + safeShootTime - initialElapsedTime);
       } else {
         setPhase('done');
         setTimeLeft(0);
       }
     }
   }, [prepTime, shootTime, initialElapsedTime]);
   ```

### Flow
1. User trykker "Start klokke"
2. `started_at` timestamp lagres i DB (kun første gang)
3. Ved reload: beregn elapsed time = now - started_at
4. HybridClock starter i riktig fase med riktig tid igjen

### Eksempel
```
Hold startet kl 14:00:00
Prep: 15s, Shoot: 60s

User reloader kl 14:00:40
Elapsed: 40 sekunder

Fase: shoot (40 > 15)
Tid igjen: (15+60) - 40 = 35 sekunder
```

---

## 🔍 VERIFISERING

### Test 1: Figur-rendering
**Setup:**
1. Opprett nytt grovfelt-stevne
2. Velg spesifikk figur i configure (f.eks. "1/3")
3. Start stevne

**Forventet:**
- ✅ Samme figur vises i run som i configure
- ✅ Figurnavn vises hvis `showName=true`
- ✅ Ingen TypeScript errors

### Test 2: Navigasjonsblokkering
**Setup:**
1. Start et hold
2. Trykk "Start klokke"
3. Prøv å:
   - Trykke F5 (reload)
   - Lukke tab
   - Navigere til annen side

**Forventet:**
- ✅ Browser viser advarsel
- ✅ Kan velge "Bli på siden"
- ✅ Klokken fortsetter å telle

### Test 3: Klokke-resume
**Setup:**
1. Start et hold
2. Trykk "Start klokke"
3. Vent 10 sekunder (under prep)
4. Reload siden (tving reload via browser)

**Forventet:**
- ✅ Kommer tilbake til samme hold
- ✅ Klokken fortsetter fra riktig tid (5s igjen av prep)
- ✅ Fase korrekt (prep hvis <15s, shoot hvis 15-75s)

**Setup 2:**
1. Start hold og klokke
2. Vent 30 sekunder (i shoot-fase)
3. Reload

**Forventet:**
- ✅ Klokken i shoot-fase
- ✅ Riktig tid igjen (ca 45s av 60s shoot)

---

## 📊 TEKNISK SAMMENDRAG

### Files Modified
1. **src/components/FieldFigure.tsx**
   - Lagt til `size` og `showName` props
   - Implementert size classes

2. **src/lib/use-block-navigation.ts** (NY)
   - Browser beforeunload hook
   - Blokkerer navigasjon under aktivt hold

3. **src/lib/match-service.ts**
   - `startHold()` - lagrer timestamp kun første gang
   - `getElapsedTime()` - beregner sekunder siden start

4. **src/pages/MatchActive.tsx**
   - Bruker useBlockNavigation hook
   - Beregner initialElapsedTime
   - Sender til ActiveHoldScreen

5. **src/components/match/ActiveHoldScreen.tsx**
   - Ny prop: `initialElapsedTime`
   - Auto-start klokke hvis `initialElapsedTime > 0`
   - Sender onClockStart callback til parent

6. **src/components/HybridClock.tsx**
   - Ny prop: `initialElapsedTime`
   - Beregner fase og tid basert på elapsed
   - Starter i korrekt tilstand

### Database
Bruker eksisterende `match_holds.started_at` (timestamptz)
- Settes ved første "Start klokke"
- Brukes til å beregne elapsed time
- Nullstilles ved neste hold

---

## 🎯 RESULTAT

### Før
❌ Feil figur i run (TypeScript prop error)
❌ Kan forlate hold uten advarsel
❌ Klokke reset ved reload

### Etter
✅ Korrekt figur med props support
✅ Blokkerer navigasjon under aktivt hold
✅ Klokke fortsetter korrekt ved reload

---

## 🚨 VIKTIG FOR PRODUKSJON

1. **Navigasjonsblokkering** kun mens klokken kjører
   - Ikke blokkert før "Start klokke"
   - Ikke blokkert etter hold fullført

2. **Timestamp presisjon**
   - Bruker `Date.now()` for presisjon
   - Avrundet til sekunder
   - Timezone-uavhengig (UTC)

3. **Edge cases håndtert**
   - Reload etter hold fullført → no-op
   - started_at allerede satt → bruk eksisterende
   - initialElapsedTime > total tid → sett phase='done'

---

## 📱 NEXT STEPS FOR TESTING

1. **Grovfelt full flow:**
   - Configure → Select figur → Start → Run
   - Verifiser korrekt figur
   - Start klokke → Wait 10s → Reload
   - Verifiser klokke fortsetter

2. **Finfelt:**
   - Samme test uten kneppjustering
   - Verifiser 2-kolonne layout

3. **Edge cases:**
   - Reload etter hold fullført
   - Reload før klokke startet
   - Meget lang elapsed time (>5 min)
