# MATCH ROUTING BUGFIX - ROOT CAUSE ANALYSE OG LØSNING

## SYMPTOMER (Før fix)

1. **Blank skjerm** når ufullstendige stevner åpnes fra dashboard
2. **Crash med feilmelding:** "Cannot read properties of null (reading 'name')"
3. **400-feil mot shot_logs** på grunn av manglende `id` i query

---

## ROOT CAUSE ANALYSE

### Problem 1: Feil routing fra dashboard (MatchHome.tsx)

**Linje 488 (før fix):**
```typescript
onClick={() => navigate(`/match/${match.id}/summary`)}
```

**Problem:**
- ALLE matches (uansett status) ble sendt til `/match/{id}/summary`
- MatchSummary forventer kun **completed** matches
- Setup-matches har **null field_figure_id** → krasj

**Status i database:**
```sql
-- Eksempel fra faktisk database:
id: '9530037b-519b-47f8-9ff0-5192be679362'
status: 'setup'
hold_count: 5
holds_with_figures: 1  -- 4 holds har null field_figure_id!
```

### Problem 2: MatchSummary forventet komplette data

**MatchSummary.tsx linje 141 (før fix):**
```typescript
<p className="font-semibold text-slate-900">
  {hold.field_figure.name}  // CRASH hvis field_figure er null!
</p>
```

**Problem:**
- Ingen status-sjekk før rendering
- Ingen null-guards på field_figure
- Forventet at alle data var komplette

### Problem 3: shot_logs query mangler id

**match-service.ts linje 287 (før fix):**
```typescript
const { data: holds } = await supabase
  .from('match_holds')
  .select('completed, started_at, completed_at')  // MANGLER 'id'!
  .eq('match_session_id', sessionId);
```

**Linje 301 (før fix):**
```typescript
.in('match_hold_id', holds?.map((h: any) => h.id) || [])  // h.id er undefined!
```

**Problem:**
- `id` ble brukt på linje 301, men ikke selectet på linje 287
- Dette ga 400-feil når getMatchStats ble kalt

---

## LØSNING IMPLEMENTERT

### Fix 1: Smart routing basert på status (MatchHome.tsx)

**Etter fix:**
```typescript
const getRouteForMatch = (match: MatchSession) => {
  if (match.status === 'completed') {
    return `/match/${match.id}/summary`;
  } else if (match.status === 'setup') {
    return `/match/${match.id}/configure`;
  } else {
    return `/match/${match.id}`;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Fullført';
    case 'setup': return 'Ufullstendig';
    case 'in_progress': return 'Pågår';
    case 'paused': return 'Pause';
    default: return status;
  }
};
```

**Resultat:**
- `setup` → `/match/{id}/configure` (konfigurasjon)
- `in_progress` eller `paused` → `/match/{id}` (fortsett)
- `completed` → `/match/{id}/summary` (oppsummering)

### Fix 2: Status-guard i MatchSummary (MatchSummary.tsx)

**Lagt til early return:**
```typescript
if (session.status !== 'completed') {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Stevne ikke fullført</h2>
        <p className="text-slate-600 mb-6">
          Dette stevnet er ikke ferdig ennå. Fullfør det eller fortsett der du slapp.
        </p>
        <div className="space-x-4">
          {session.status === 'setup' && (
            <button onClick={() => navigate(`/match/${session.id}/configure`)}>
              Konfigurer stevne
            </button>
          )}
          {(session.status === 'in_progress' || session.status === 'paused') && (
            <button onClick={() => navigate(`/match/${session.id}`)}>
              Fortsett stevne
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
```

**Resultat:**
- Hvis noen prøver å navigere direkte til `/match/{id}/summary` for ufullstendig stevne, får de en vennlig feilmelding med korrekt redirect-knapp

### Fix 3: Null-guards på field_figure (MatchSummary.tsx)

**Før:**
```typescript
<p className="font-semibold text-slate-900">
  {hold.field_figure.name}
</p>
<p className="text-sm text-slate-600">
  {hold.distance_m}m • +{hold.recommended_clicks} knepp
</p>
```

**Etter:**
```typescript
<p className="font-semibold text-slate-900">
  {hold.field_figure?.name || 'Ukjent figur'}
</p>
<p className="text-sm text-slate-600">
  {hold.distance_m || 0}m • +{hold.recommended_clicks || 0} knepp
</p>
```

**Resultat:**
- Ingen crash selv om data er inkonsistent
- Fallback-verdier vises

### Fix 4: Lagt til 'id' i shot_logs query (match-service.ts)

**Før:**
```typescript
const { data: holds } = await supabase
  .from('match_holds')
  .select('completed, started_at, completed_at')
  .eq('match_session_id', sessionId);
```

**Etter:**
```typescript
const { data: holds } = await supabase
  .from('match_holds')
  .select('id, completed, started_at, completed_at')
  .eq('match_session_id', sessionId);
```

**Resultat:**
- `h.id` er nå definert på linje 301
- Ingen 400-feil fra shot_logs query

### Fix 5: Samme routing-fix i MatchHistory (MatchHistory.tsx)

**Samme logikk implementert:**
```typescript
const getRouteForMatch = () => {
  if (match.status === 'completed') {
    return `/match/${match.id}/summary`;
  } else if (match.status === 'setup') {
    return `/match/${match.id}/configure`;
  } else {
    return `/match/${match.id}`;
  }
};
```

**Lagt til status-label:**
```typescript
{match.status === 'setup' ? (
  <div className="flex items-center space-x-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
    <span>Ufullstendig</span>
  </div>
) : ...}
```

**Resultat:**
- Konsistent routing fra alle steder i appen

---

## STATUS FLOW MAPPING

**Riktig routing etter status:**

| Status         | Route                        | Formål                          |
|----------------|------------------------------|---------------------------------|
| `setup`        | `/match/{id}/configure`      | Konfigurer holds og figurer     |
| `in_progress`  | `/match/{id}`                | Fortsett aktivt stevne          |
| `paused`       | `/match/{id}`                | Fortsett pauset stevne          |
| `completed`    | `/match/{id}/summary`        | Vis oppsummering og resultater  |

**Eksisterende route-guards:**

1. **MatchConfigure** (linje 66-69):
   - Redirecter `in_progress` til `/match/{id}`
   - Dette forhindrer at man prøver å konfigurere et aktivt stevne

2. **MatchSummary** (ny):
   - Redirecter ikke-completed til riktig sted
   - Viser vennlig feilmelding med redirect-knapper

3. **MatchHome** (ny):
   - Smart routing basert på status

4. **MatchHistory** (ny):
   - Smart routing basert på status

---

## VERIFISERING

### Test 1: Åpne setup-stevne fra dashboard

**Før:**
- Blank skjerm
- Console error: "Cannot read properties of null (reading 'name')"

**Etter:**
- Navigerer til `/match/{id}/configure`
- Viser konfigurasjonsskjerm
- Ingen errors

### Test 2: Åpne setup-stevne fra historikk

**Før:**
- Samme crash som Test 1

**Etter:**
- Navigerer til `/match/{id}/configure`
- Status vises som "Ufullstendig"
- Ingen errors

### Test 3: Direkte navigering til summary for ufullstendig stevne

**Før:**
- Crash med null-error

**Etter:**
- Viser "Stevne ikke fullført" melding
- Tilbyr "Konfigurer stevne" knapp (for setup)
- Tilbyr "Fortsett stevne" knapp (for in_progress/paused)

### Test 4: shot_logs query

**Før:**
- 400-feil: `id` undefined i `.in()` filter

**Etter:**
- Query kjører uten feil
- `totalShots` vises korrekt i summary

---

## FILER ENDRET

1. **src/pages/MatchHome.tsx**
   - Smart routing-funksjon
   - Status-labels oppdatert

2. **src/pages/MatchHistory.tsx**
   - Smart routing-funksjon
   - Lagt til "Ufullstendig" status-label

3. **src/pages/MatchSummary.tsx**
   - Status-guard (early return for ikke-completed)
   - Null-guards på field_figure
   - Fallback-verdier for distance og clicks

4. **src/lib/match-service.ts**
   - Lagt til `id` i getMatchStats select-clause

---

## KONKLUSJON

**Root cause:** Manglende status-håndtering i routing-logikk

**Løsning:** Smart routing basert på faktisk status, med defensive guards

**Resultat:**
- ✅ Ingen blank skjerm
- ✅ Ingen null-crashes
- ✅ Ingen 400-feil mot shot_logs
- ✅ Konsistent routing fra alle entry-points
- ✅ Vennlige feilmeldinger med redirect-knapper

**Build status:** ✅ Kompilerer uten errors
