# STAGE MAPPING DEBUG PROTOCOL

**Dato:** 2026-03-20
**Problem:** Feil hold vises i run - riktig figur, men fra feil hold
**Status:** Debugging aktivert

## HVA VI VET

✅ `field_figures` tabellen er korrekt
✅ SVG-data er korrekt
✅ `field_figure_id` på stages er lagret
✅ Figurer hentes korrekt via ID
❌ Men FEIL figur vises på FEIL tidspunkt

## HYPOTESE

Problemet er i mappingen mellom:
- `entry.current_stage_number` (1, 2, 3, ...)
- `stages` array (sortert etter `stage_number`)
- `currentStage = stages.find(s => s.stage_number === entry.current_stage_number)`

Mulige årsaker:
1. Off-by-one feil (0-indeksert vs 1-indeksert)
2. Stages ikke sortert riktig
3. Stage_number ikke satt riktig ved opprettelse
4. Entry.current_stage_number blir oppdatert feil

## DEBUG-PUNKTER

### 1. Når kompetanse lastes

```
[CompetitionRun] ========== STAGES FROM DATABASE ==========
Total stages: X
Stages array is explicitly sorted by stage_number: true

[0] stage_number=1 | field_figure_id=xxx | code=YYY
[1] stage_number=2 | field_figure_id=yyy | code=ZZZ
...
```

**SJEKK:**
- Er stages sortert riktig (1, 2, 3)?
- Har hver stage riktig field_figure_id?
- Matcher code mot det du valgte i configure?

### 2. Når hold vises

```
[CompetitionRun] ========== FINDING CURRENT STAGE ==========
entry.current_stage_number: X
stages.length: Y

Available stages FULL ARRAY:
  [0] stage_number=1 | id=... | field_figure_id=...
  [1] stage_number=2 | id=... | field_figure_id=...

Looking for stage with stage_number: X
Result of stages.find(...): FOUND/NOT FOUND
```

**SJEKK:**
- Hva er `entry.current_stage_number`? (Skal være 1 for første hold)
- Finnes stage med dette stage_number i arrayet?
- Er det rett stage som blir funnet?

### 3. Når figur mappes

```
[CompetitionRun] ========== ✅ CURRENT HOLD COMPLETE MAPPING ==========
Entry Current Stage Number: X
Found Stage: {
  stage_number: X,
  field_figure_id: ...,
  field_figure_code: "ABC",
  field_figure_name: "..."
}
Mapped Figure: {
  code: "ABC",
  name: "..."
}
🔍 Stage debug code: ABC
🔍 Actual figure code: ABC
🔍 Match? ✅ YES / ❌ NO - WRONG FIGURE!
```

**SJEKK:**
- Matcher `stage.field_figure_code` med `figure.code`?
- Hvis NEI: `field_figure_id` på stage er feil i databasen!
- Hvis JA: Stage-numberet er riktig, men kanskje startet på feil hold?

### 4. Når du går til neste hold

```
[CompetitionRun] ========== NEXT HOLD ==========
Current stage: X
Next stage will be: X+1
Total stages: Y

Next stage preview: {
  stage_number: X+1,
  field_figure_id: ...,
  distance_m: ...,
  clicks: ...
}
```

**SJEKK:**
- Går `current_stage_number` fra 1 → 2 → 3?
- Matcher "Next stage preview" det du forventer?

## TESTSCENARIO

1. Opprett nytt stevne med 2 hold:
   - Hold 1: B65 (65cm figur), 100m
   - Hold 2: C35 (sirkel), 150m

2. Start stevnet

3. **På Hold 1:**
   - Hvilken figur vises? (Skal være B65)
   - Sjekk logg: `entry.current_stage_number` = 1?
   - Sjekk logg: `stage.field_figure_code` = "B65"?
   - Sjekk logg: `figure.code` = "B65"?
   - Sjekk logg: Match? = YES?

4. **Gå til Hold 2:**
   - Hvilken figur vises? (Skal være C35)
   - Sjekk logg: `entry.current_stage_number` = 2?
   - Sjekk logg: `stage.field_figure_code` = "C35"?
   - Sjekk logg: `figure.code` = "C35"?
   - Sjekk logg: Match? = YES?

## HVIS FEIL FIGUR VISES

### Scenario A: Loggen sier "Match? ✅ YES"

Dette betyr:
- Stage mapper riktig til figur
- Men du STARTET på feil stage
- Problem: `entry.current_stage_number` initialiseres feil
- Sjekk: CompetitionStart.tsx eller entry creation

### Scenario B: Loggen sier "Match? ❌ NO"

Dette betyr:
- `field_figure_id` på stage er feil i databasen
- Problem: CompetitionConfigure lagret feil ID
- Løsning: Kjør SQL query for å se hva som faktisk er lagret

### Scenario C: Loggen sier "NOT FOUND"

Dette betyr:
- `entry.current_stage_number` matcher ingen stage
- Problem: Stage_number på stages stemmer ikke med entry
- Løsning: Sjekk at stages har stage_number 1, 2, 3... (ikke 0, 1, 2)

## SQL VERIFICATION

For å verifisere data i databasen:

```sql
-- Se alle stages for et stevne
SELECT
  stage_number,
  field_figure_id,
  field_figure_code,
  field_figure_name,
  distance_m,
  clicks
FROM competition_stages
WHERE competition_id = 'xxx'
ORDER BY stage_number;

-- Se hvilken figur hver stage faktisk har
SELECT
  cs.stage_number,
  cs.field_figure_id,
  cs.field_figure_code,
  ff.code AS actual_code,
  ff.name AS actual_name,
  CASE
    WHEN cs.field_figure_code = ff.code THEN '✅'
    ELSE '❌ MISMATCH'
  END as match
FROM competition_stages cs
LEFT JOIN field_figures ff ON cs.field_figure_id = ff.id
WHERE cs.competition_id = 'xxx'
ORDER BY cs.stage_number;

-- Se current state på entry
SELECT
  current_stage_number,
  current_stage_state,
  status
FROM competition_entries
WHERE id = 'yyy';
```

## FORVENTET RESULTAT

Når alt fungerer skal du se:

```
Hold 1: entry.current_stage_number = 1
        stage.stage_number = 1
        stage.field_figure_code = "B65"
        figure.code = "B65"
        Match? ✅ YES
        → VISER B65 ✅

Hold 2: entry.current_stage_number = 2
        stage.stage_number = 2
        stage.field_figure_code = "C35"
        figure.code = "C35"
        Match? ✅ YES
        → VISER C35 ✅
```

## NESTE STEG

1. Start en test-kompetanse
2. Åpne browser console
3. Kopier HELE loggen
4. Sammenlign med forventet resultat ovenfor
5. Identifiser hvor det svikter

**Rapporten skal inneholde:**
- Hva du valgte i configure
- Hva som vises i run
- Full console.log output
- Screenshot av feil figur
