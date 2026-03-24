# AI-GENERERING VERIFISERING - FAKTISK TEST

## KRITISK BUG FIKSET

**Problem:** Edge function brukte `stage.distance` i stedet for `stage.distance_m`
**Løsning:** Fikset og redeployed
**Status:** Edge function er oppdatert og klar for test

---

## TEST-ENTRY

**Entry ID:** `58131c9c-1520-4538-8a30-b46d938695fb`

**Stevne:** FASE 3B VERIFIKASJONSTEST (Grovfelt)

**Stages:**
```
Stage 1: 100m, 3 knepp, figur 1/3
  Notat: "God vind, holdt rett på. Alle treff i figur. Føltes bra!"
  Bilde: Nei

Stage 2: 100m, 5 knepp, skive 1/4
  Notat: "Sterk motvind fra høyre. Måtte holde 2 knepp venstre. Ett treff utenfor."
  Bilde: Ja

Stage 3: 100m, 7 knepp, skive 1/4V
  Notat: Nei
  Bilde: Ja

Stage 4: 245m, 12 knepp, skive 1/6
  Notat: Nei
  Bilde: Nei
```

**Forventet data_quality:** "partial" (2 av 4 hold har notater)

---

## VERIFISERINGSSTEG

### Steg 1: Generer AI-oppsummering

1. Gå til applikasjonen
2. Naviger til: `/competitions/entry/58131c9c-1520-4538-8a30-b46d938695fb/summary`
3. Scroll ned til "AI-Assistent" seksjonen
4. Klikk "Generér AI-oppsummering"
5. Vent ~3-5 sekunder mens Claude API kalles

**Forventet:**
- Loading spinner vises
- Ingen feilmeldinger
- AI-oppsummering vises med introduksjon, hold-for-hold kommentarer, observasjoner og forslag

### Steg 2: Verifiser database-lagring

Kjør denne SQL-querien:

```sql
SELECT
  model_used,
  tokens_used,
  data_quality,
  version,
  is_active,
  generated_at,
  summary_json->'metadata'->>'model_used' as json_model
FROM competition_ai_summaries
WHERE entry_id = '58131c9c-1520-4538-8a30-b46d938695fb'
  AND is_active = true;
```

**FORVENTET MED EKTE CLAUDE:**
```
model_used:   claude-3-5-sonnet-20241022
tokens_used:  [mellom 1200-2000]
data_quality: partial
version:      1
is_active:    true
json_model:   claude-3-5-sonnet-20241022
```

**HVIS FALLBACK TIL MOCK:**
```
model_used:   mock-v1
tokens_used:  0
data_quality: partial
version:      1
is_active:    true
json_model:   mock-v1
```

### Steg 3: Inspiser AI-output kvalitet

Se på kommentarene for Stage 1 og Stage 2 (som har notater).

**MOCK output (generisk):**
```
Stage 1: "Du skrev: 'God vind, holdt rett på. Alle treff i figur. F...' Bevisst vindforhold. Positiv opplevelse."
Stage 2: "Du skrev: 'Sterk motvind fra høyre. Måtte holde 2 knepp...' Bevisst vindforhold."
```

**EKTE CLAUDE output (spesifikk og kontekstuell):**
```
Stage 1: "Du skrev: 'God vind, holdt rett på. Alle treff i figur. Føltes bra!' Dette viser god situasjonsforståelse og trygg holdavvikling. Det at alle treff kom i figur tyder på solid fokus gjennom hele holdet."

Stage 2: "Du skrev: 'Sterk motvind fra høyre. Måtte holde 2 knepp venstre. Ett treff utenfor.' Bra observasjon av vindforhold og bevisst korreksjon. Ett treff utenfor kan tyde på at vindskiftet var krevende, men kompensasjonen din viser god vindforståelse."
```

**FORSKJELLER:**
- Mock: Kort, 1-2 setninger, nøkkelord-matching
- Claude: Lengre, 2-3 setninger, kontekstuell analyse, siterer fullt notat

### Steg 4: Test cache-mekanisme

Klikk "Regenerér oppsummering" umiddelbart igjen.

**FORVENTET:**
- Returnerer nesten øyeblikkelig (ingen API-kall)
- Response inkluderer `"cached": true`
- Samme summary vises
- Ingen ny rad i database (ingen endring i `version`)

**Verifiser:**
```sql
SELECT COUNT(*) as total_versions
FROM competition_ai_summaries
WHERE entry_id = '58131c9c-1520-4538-8a30-b46d938695fb';
```
Skal fortsatt være `1`.

### Steg 5: Test regenerering etter cache-utløp

Oppdater `generated_at` til mer enn 1 time siden:

```sql
UPDATE competition_ai_summaries
SET generated_at = NOW() - INTERVAL '2 hours'
WHERE entry_id = '58131c9c-1520-4538-8a30-b46d938695fb'
  AND is_active = true;
```

Klikk "Regenerér oppsummering" igjen.

**FORVENTET:**
- Tar ~3-5 sekunder (nytt API-kall)
- Response inkluderer `"cached": false`
- Ny summary genereres (kan være litt forskjellig pga. temperature=0.7)
- Ny database-rad opprettes

**Verifiser:**
```sql
SELECT
  version,
  is_active,
  model_used,
  tokens_used,
  generated_at
FROM competition_ai_summaries
WHERE entry_id = '58131c9c-1520-4538-8a30-b46d938695fb'
ORDER BY version DESC;
```

**FORVENTET:**
```
version: 2, is_active: true,  model_used: claude-3-5-sonnet-20241022, tokens: [1200-2000]
version: 1, is_active: false, model_used: claude-3-5-sonnet-20241022, tokens: [1200-2000]
```

Den gamle versjonen er deaktivert, ny versjon er aktiv.

---

## SUKSESSKRITERIER

For at AI-integrasjonen skal være **godkjent som production-ready**, må følgende være sant:

### ✅ Kriterie 1: Ekte API-kall fungerer
```sql
SELECT model_used FROM competition_ai_summaries
WHERE entry_id = '58131c9c-...' AND is_active = true;
-- Resultat: "claude-3-5-sonnet-20241022" (IKKE "mock-v1")
```

### ✅ Kriterie 2: Token tracking fungerer
```sql
SELECT tokens_used FROM competition_ai_summaries
WHERE entry_id = '58131c9c-...' AND is_active = true;
-- Resultat: > 0 (typisk 1200-2000)
```

### ✅ Kriterie 3: Output-kvalitet er bedre enn mock
- Fullstendige sitater (ikke trunkert til 50 tegn)
- Kontekstuell analyse (ikke bare nøkkelord-matching)
- Spesifikk feedback (ikke generiske fraser)
- Norsk språk med riktig tone

### ✅ Kriterie 4: Cache fungerer
- Andre kall innen 1 time returnerer `cached: true`
- Ingen nye database-rader opprettes ved cache-hit
- `version` forblir uendret

### ✅ Kriterie 5: Versioning fungerer
- Regenerering etter 1 time skaper ny rad
- Gammel rad får `is_active = false`
- Ny rad får `version = [old] + 1` og `is_active = true`

### ✅ Kriterie 6: Fallback fungerer
Hvis API key fjernes eller API feiler:
- Ingen crash
- Fallback til mock-logikk
- Logger viser: "ANTHROPIC_API_KEY not configured" eller "Claude API failed"
- `model_used` blir "mock-v1"

---

## DEBUGGING

### Problem: model_used er fortsatt "mock-v1"

**Mulige årsaker:**
1. ANTHROPIC_API_KEY ikke satt
   ```bash
   # Check via Supabase Dashboard → Edge Functions → Manage Secrets
   ```

2. API key ugyldig
   - Edge function logger vil vise: "Claude API error: 401"

3. Edge function ikke redeployed
   - Siste deployment: [sjekk timestamp i Supabase Dashboard]
   - Redeploy manuelt hvis nødvendig

### Problem: tokens_used er 0 selv med ekte modell

Dette skulle ikke skje hvis `model_used = claude-3-5-sonnet-20241022`.

**Debug:**
```typescript
// I edge function, linje 326:
tokens_used: data.usage.input_tokens + data.usage.output_tokens,
```

Sjekk at `data.usage` faktisk eksisterer i Claude API response.

### Problem: AI-output er på engelsk

**Prompt spesifiserer:**
```
- Norsk språk
```

Hvis output er på engelsk, kan det tyde på:
- Prompten blir ikke brukt (fallback til mock?)
- Claude ignorerer språk-instruksjonen (usannsynlig med eksplisitt "Norsk språk" i prompt)

---

## KONKRET SAMMENLIGNING

### Input (samme for begge):
```
Stage 1 notat: "God vind, holdt rett på. Alle treff i figur. Føltes bra!"
```

### Mock output:
```json
{
  "stage_number": 1,
  "comment": "Du skrev: \"God vind, holdt rett på. Alle treff i figur. F...\" Bevisst vindforhold. Positiv opplevelse.",
  "data_basis": "notater"
}
```

**Karakteristikk:**
- 50-tegns trunkering
- Nøkkelord "vind" → "Bevisst vindforhold"
- Nøkkelord "bra" → "Positiv opplevelse"
- Ingen dypere analyse

### Ekte Claude output (forventet):
```json
{
  "stage_number": 1,
  "comment": "Du skrev: 'God vind, holdt rett på. Alle treff i figur. Føltes bra!' Dette viser god situasjonsforståelse og trygg holdavvikling. Det at alle treff kom i figur tyder på solid fokus gjennom hele holdet.",
  "data_basis": "notater"
}
```

**Karakteristikk:**
- Fullt sitat
- Kontekstuell tolkning ("situasjonsforståelse", "trygg holdavvikling")
- Spesifikk observasjon ("alle treff kom i figur")
- Analyse av hva dette indikerer ("solid fokus")

**HVIS CLAUDE-OUTPUT SER UT SOM MOCK:**
Edge function bruker fortsatt fallback. Sjekk logs og API key.

---

## KOSTNADSESTIMERING

**Med Claude 3.5 Sonnet:**
- Pris: $3 per 1M input tokens, $15 per 1M output tokens
- Typisk bruk per oppsummering:
  - Input: ~800 tokens (prompt + data)
  - Output: ~600 tokens (JSON response)
  - Total: ~1400 tokens
- Kostnad per oppsummering: ~$0.012 (1.2 cent)

**Med 100 oppsummeringer per måned:**
- Kostnad: ~$1.20/måned

**Med cache (1 time):**
- Reduserer kostnad med ~70-90% (avhengig av bruksmønster)
- Typisk kostnad: $0.12-0.36/måned

---

## AKSEPTANSETEST

Før du godkjenner AI-implementasjonen som production-ready, gjennomfør denne testen:

1. ✅ Generer AI-oppsummering for entry `58131c9c-1520-4538-8a30-b46d938695fb`
2. ✅ Verifiser `model_used = "claude-3-5-sonnet-20241022"`
3. ✅ Verifiser `tokens_used > 0`
4. ✅ Sammenlign Stage 1 kommentar med forventet Claude-output ovenfor
5. ✅ Bekreft at fullt sitat vises (ikke trunkert til 50 tegn)
6. ✅ Test cache ved å regenerere umiddelbart
7. ✅ Test versioning ved å tvinge ny generering (etter cache-utløp)

**Hvis alle 7 punkter er ✅:**
AI-implementasjonen er **godkjent som production-ready**.

**Hvis noen punkter feiler:**
Se "DEBUGGING" seksjonen og feilsøk før godkjenning.
