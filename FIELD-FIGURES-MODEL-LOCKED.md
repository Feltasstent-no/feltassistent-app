# FIELD FIGURES MODEL - LÅST ✅

**Dato:** 2026-03-20
**Status:** Implementert og låst

## PRINSIPP

`field_figures` er **masterbiblioteket** - den eneste kilden til sannhet for alle figurdata.

## DATABASE-MODELL

### `field_figures` (Master Library)

```sql
- id (uuid, PK)
- code (text) - Unik kode (B65, C35, Stripe-30/10, etc)
- name (text) - Visningsnavn
- category (text) - 'grovfelt' / 'finfelt'
- shape_type (text) - 'person', 'circle', 'stripe', 'segment', 'barrel', 'other'
- svg_data (text) - Selve SVG-koden
- normal_distance_m (integer)
- max_distance_m (integer)
- is_active (boolean) - Kun aktive vises i picker
- is_standard (boolean) - Official DFS-figurer
- sort_order (integer) - Sortering i picker
```

### `match_holds` / `competition_stages`

```sql
- id (uuid, PK)
- field_figure_id (uuid, FK → field_figures.id) ✅ SINGLE SOURCE OF TRUTH
- field_figure_code (text, nullable) - Debug snapshot
- field_figure_name (text, nullable) - Debug snapshot
- distance_m (integer)
- clicks (integer)
- shooting_time_seconds (integer)
```

## DATAFLYT

### 1. OPPSETT (Configure)

```typescript
// Bruker velger figur i picker
const selectedFigureId = 'uuid-123';
const selectedFigure = availableFigures.find(f => f.id === selectedFigureId);

// Lagre på hold/stage
await supabase
  .from('match_holds')
  .update({
    field_figure_id: selectedFigureId,           // ✅ HOVEDDATA
    field_figure_code: selectedFigure.code,      // 🔍 DEBUG ONLY
    field_figure_name: selectedFigure.name,      // 🔍 DEBUG ONLY
  })
  .eq('id', holdId);
```

### 2. KJØRING (Run)

```typescript
// Hent hold med figur via JOIN
const { data } = await supabase
  .from('match_holds')
  .select(`
    *,
    field_figure:field_figures(*)
  `)
  .eq('id', holdId)
  .maybeSingle();

// Vis figur direkte
<FieldFigure
  figure={data.field_figure}  // ✅ Hele objektet fra field_figures
/>
```

### 3. RENDERING

```typescript
// FieldFigure.tsx
export function FieldFigure({ figure }: { figure: FieldFigure }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: figure.svg_data }} />
  );
}
```

## REGLER

### ✅ GJØR

1. Lagre `field_figure_id` på alle hold/stages
2. Hent figur via JOIN: `field_figure:field_figures(*)`
3. Vis figur direkte fra `figure.svg_data`
4. Filtrer picker på `is_active = true`
5. Bruk `sort_order` for å sortere figurer i picker
6. Lagre `field_figure_code` og `field_figure_name` kun for debugging

### ❌ IKKE GJØR

1. ~~Gjør runtime-lookup via kode/navn~~
2. ~~Opprett ekstra mapping-tabeller~~
3. ~~Lag ny query for hver figur~~
4. ~~Bruk `field_figure_code` for lookup~~
5. ~~Cache figurer i frontend state~~
6. ~~Map figurer via category/type i run~~

## ADMIN-BIBLIOTEK

Bruk `AdminFieldFigures.tsx` til:

- ✅ Opprydding av duplikater
- ✅ Sette `is_active = false` på gamle figurer
- ✅ Validere SVG-data
- ✅ Migrere gamle data
- ✅ Administrere sort_order
- ❌ IKKE runtime-mapping i run

## FIGUR-OVERSIKT (Grovfelt)

| Code | Navn | Type | Status |
|------|------|------|--------|
| B45 | Grovfelt stående 45cm | person | ✅ Standard |
| B65 | Grovfelt stående 65cm | person | ✅ Standard |
| B100 | Grovfelt stående 100cm | person | ✅ Standard |
| C20-C50 | Grovfelt skive (div størrelser) | circle | ✅ Standard |
| Stripe-30/10 | Grovfelt skive | stripe | ✅ Standard |
| Stripe-13/40 | Grovfelt skive | stripe | ✅ Standard |
| S-25H | Grovfelt skive | stripe | ✅ Standard |
| S-25V | Grovfelt skive | stripe | ✅ Standard |
| 1/3, 1/4, 1/6, 1/8 | Grovfelt figur | segment | ✅ Standard |
| Tønne | Grovfelt skive | barrel | ✅ Standard |
| Småen | Grovfelt skive | circle | ✅ Standard |
| Sirkel | Grovfelt skive | circle | ✅ Standard |

## VERIFISERING

### Test 1: Oppsett lagrer riktig

```sql
SELECT
  hold_number,
  field_figure_id,
  field_figure_code,
  field_figure_name
FROM match_holds
WHERE match_session_id = 'xxx';
```

Forventet: Alle hold har `field_figure_id` + debug-kolonner.

### Test 2: Run henter riktig figur

```typescript
const hold = await getCurrentHold(sessionId, holdIndex);
console.log('Figur:', {
  id: hold.field_figure.id,
  code: hold.field_figure.code,
  name: hold.field_figure.name,
  has_svg: !!hold.field_figure.svg_data
});
```

Forventet: `field_figure` er hele objektet fra `field_figures` tabellen.

### Test 3: Visuell korrekthet

1. Velg B65 i oppsett
2. Start match
3. Hold 1 skal vise PERSON-figur med hode + armer/ben
4. Hold 2 skal vise den EKSAKTE figuren som ble valgt i oppsett

## MIGRERING

Hvis gamle data har kun `field_figure_code` uten `field_figure_id`:

```sql
UPDATE match_holds mh
SET field_figure_id = ff.id,
    field_figure_name = ff.name
FROM field_figures ff
WHERE mh.field_figure_code = ff.code
  AND mh.field_figure_id IS NULL
  AND ff.is_active = true
  AND ff.is_standard = true;
```

## KONKLUSJON

Modellen er nå låst:

✅ `field_figures` er single source of truth
✅ Hold/stages lagrer `field_figure_id` direkte
✅ Run henter via JOIN, ingen lookup
✅ Debug-kolonner for troubleshooting
✅ Ingen runtime-mapping
✅ Ingen ekstra tabeller

**Alle fremtidige endringer skal følge denne modellen.**
