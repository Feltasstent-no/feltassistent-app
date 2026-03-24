/**
 * BROWSER CONSOLE TEST - Figur Data Flow
 *
 * Kjør denne i browser console når du er på run-view
 * for å se nøyaktig hva som skjer med figur-dataene
 */

// Test 1: Hent current match session fra URL
const matchId = window.location.pathname.split('/')[2];
console.log('=== FIGUR FLOW TEST ===');
console.log('Match ID:', matchId);

// Test 2: Sjekk Supabase state (hvis tilgjengelig)
if (window.localStorage) {
  const supabaseKeys = Object.keys(window.localStorage).filter(k =>
    k.includes('supabase') || k.includes('auth')
  );
  console.log('Supabase localStorage keys:', supabaseKeys);
}

// Test 3: Sjekk React DevTools state (må kjøres manuelt)
console.log(`
MANUELL TEST-GUIDE:
==================

1. Åpne React DevTools
2. Finn <MatchActive> component
3. Se på state:
   - currentHold.field_figure_id
   - currentHold.field_figure.name
   - currentHold.field_figure.code

4. Finn <ActiveHoldScreen> component
5. Se på props:
   - hold.field_figure_id
   - hold.field_figure.name

6. Finn <FieldFigure> component
7. Se på props:
   - figure.name
   - figure.code
   - figure.svg_data (length)

FORVENTET:
- Alle tre components skal vise SAMME figur-ID og navn
- svg_data skal være tilstede
- Ingen null eller undefined

HVIS FEIL:
- Noter hvor i chain figur-dataen forsvinner eller endres
- Sjekk console logs for [getCurrentHold], [ActiveHoldScreen], [FieldFigure]
`);

// Test 4: SQL query for å verifisere DB-data
console.log(`
SQL VERIFISERING (kjør i Supabase SQL Editor):
================================================

-- Hent hold-data for denne matchen:
SELECT
  mh.id,
  mh.order_index,
  mh.field_figure_id,
  ff.name as figure_name,
  ff.code as figure_code,
  LENGTH(ff.svg_data) as svg_length
FROM match_holds mh
LEFT JOIN field_figures ff ON ff.id = mh.field_figure_id
WHERE mh.match_session_id = '${matchId}'
ORDER BY mh.order_index;
`);
