# TEST AI-ASSISTENT - Steg-for-steg

## Forutsetninger
- Du er logget inn som bruker
- Du har minst ett fullført stevne i systemet

## Test-steg

### 1. Naviger til stevne-oppsummering
1. Gå til `/competitions`
2. Klikk på et fullført stevne
3. Klikk "Se oppsummering" eller naviger til `/competitions/summary/:entryId`

### 2. Finn AI-assistentseksjonen
- Scroll helt ned på siden
- Du skal se en blå boks med:
  - Header: "AI-Assistent" med ✨ ikon
  - Undertekst: "Refleksjon basert på dine data"

### 3. Generer oppsummering
1. Klikk knappen **"Generér AI-oppsummering"**
2. Du vil se en spinner med tekst "Genererer oppsummering..."
3. Vent 1-2 sekunder

### 4. Verifiser resultat

Du skal nå se 4 seksjoner:

#### A) Introduction
- Blå ramme øverst
- Tekst som oppsummerer stevnet:
  ```
  "Du gjennomførte [stevnenavn] ([type]) med [X] hold den [dato].
   Dokumentasjonen varierer i detalj mellom holdene."
  ```

#### B) Hold-for-hold
- Én kort per hold
- Hver kort viser:
  - Hold nummer i blå sirkel
  - Data-basis indikator (✅/⚠️/❓)
  - Kommentar basert på dine notater

**Eksempler på kommentarer du kan se:**

Hold med tekstnotat (✅ "Basert på notat"):
```
Du skrev: "God vind, holdt rett på. Alle treff i figur..."
Positiv opplevelse.
```

Hold kun med bilde (⚠️ "Begrenset data"):
```
Bilde dokumentert, men uten tekstnotater. 7 knepp på 100m.
```

Hold uten dokumentasjon (❓ "Ingen data"):
```
Ingen dokumentasjon fra dette holdet. 12 knepp brukt på 245m.
```

#### C) Samlede observasjoner
- Bullet points om:
  - Hvor mange hold du dokumenterte
  - Hvor mange bilder du tok
  - Avstandsvariasjoner

#### D) Forslag til forbedring
- Konstruktive tips, for eksempel:
  - "Dokumentér alle hold med notater"
  - "Ta bilde av alle gravlapper"

#### E) Disclaimers (gul warning-boks)
- Viktig informasjon:
  - "Dette er en AI-generert vurdering basert på tilgjengelige data"
  - "Jeg har ikke sett faktiske treffbilder eller offisiell poengsum"
  - "Vurderingen erstatter ikke feedback fra instruktør"

### 5. Test regenerering
1. Scroll ned til bunnen av AI-resultatene
2. Klikk **"Regenerér oppsummering"**
3. Spinner vises igjen
4. Ny oppsummering lastes (kan være identisk siden det er samme data)

### 6. Test cache
1. Refresh siden (F5)
2. AI-oppsummeringen skal være der allerede (lastet fra database)
3. Klikk "Regenerér" igjen
4. Innen 1 time: Får cached versjon raskt
5. Etter 1 time: Genererer ny versjon

## Forventet oppførsel

### Hvis du har god dokumentasjon (notater på de fleste hold)
- Mange ✅ "Basert på notat" indikatorer
- AI siterer fra dine faktiske notater
- Data quality: "complete"
- Færre forbedringsforslag

### Hvis du har delvis dokumentasjon (noen notater, noen bilder)
- Mix av ✅/⚠️ indikatorer
- AI kommenterer både notater og manglende data
- Data quality: "partial"
- Forslag om å dokumentere mer

### Hvis du har lite dokumentasjon (kun knepp-tall)
- Mange ❓ "Ingen data" indikatorer
- Minimale kommentarer per hold
- Data quality: "minimal"
- Tydelige forslag om å starte dokumentering

## Teknisk verifisering (valgfritt)

### Sjekk database etter generering
```sql
SELECT
  id,
  version,
  is_active,
  model_used,
  data_quality,
  generated_at
FROM competition_ai_summaries
WHERE entry_id = '[din-entry-id]'
ORDER BY version DESC;
```

Du skal se:
- `version: 1` første gang
- `is_active: true` for nyeste
- `model_used: "mock-v1"` (fordi det er mock)
- `data_quality: "complete" | "partial" | "minimal"`

### Sjekk summary_json innhold
```sql
SELECT summary_json->'summary'->'per_hold' as hold_comments
FROM competition_ai_summaries
WHERE entry_id = '[din-entry-id]' AND is_active = true;
```

Du skal se JSON-array med kommentarer per hold.

## Feilhåndtering

### Hvis du får feil
- Sjekk at du er logget inn
- Sjekk at entry_id finnes
- Sjekk browser console for detaljer
- Edge function logger finnes i Supabase dashboard

### Hvis ingenting skjer
- Sjekk at knappen er klikkbar (ikke disabled)
- Åpne Network tab og se om request sendes
- Sjekk at edge function er deployet

## Hva dette IKKE er

Dette er IKKE ekte AI ennå. Det er mock-logikk som:
- Analyserer nøkkelord i notater ("vind", "bra", "problem")
- Teller dokumentasjon
- Gir generiske råd

For å få ekte AI-analyse, må vi:
1. Legge til Anthropic API key
2. Koble til Claude API i edge function
3. Sende strukturert prompt
4. Parse Claude sin respons

Men strukturen, UI-en, og dataflow er 100% klar for ekte AI.
