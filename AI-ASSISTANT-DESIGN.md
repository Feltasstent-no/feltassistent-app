# AI-ASSISTENTOPPSUMMERING - DESIGNDOKUMENT

**Versjon:** 1.0
**Dato:** 2026-03-19
**Fase:** Design (før implementering)

---

## FORMÅL

En AI-assistent som gir kontekstuell oppsummering av stevnegjennomføring basert på faktisk data. Assistenten skal være en støttespiller som hjelper skytteren å reflektere over egen prestasjon, IKKE en autorisert dommer som setter offisiell score.

---

## DESIGNPRINSIPPER

### 1. Assistent, ikke dommer
- AI setter aldri offisiell poengsum
- AI gir ikke absolutte sannheter
- AI presenterer observasjoner og forsiktige forslag
- Skiller tydelig mellom fakta og vurdering

### 2. Transparent usikkerhet
- Klar kommunikasjon om hva AI vet vs. hva den gjetter
- Innrømmer begrensninger (f.eks. "uten bilde kan jeg ikke vite...")
- Bruker modalverb: "kan tyde på", "muligens", "ser ut til"

### 3. Datadrevet, ikke fabrikkert
- Kun bruk data som faktisk finnes i databasen
- Aldri oppfinn detaljer eller tall
- Hvis data mangler, si det eksplisitt

### 4. Støttende tone
- Oppmuntrende uten å være falsk positiv
- Konstruktiv uten å være kritisk
- Fokus på læring og forbedring

---

## UI-PLASSERING

### Variant A: Egen seksjon i CompetitionSummary (ANBEFALT)

**Plassering:** Etter alle hold-kortene, før bunnen av siden

```
┌─────────────────────────────────────────┐
│ [Header: Stevnenavn, dato, status]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Hold 1 - Grovfelt figur                 │
│ [Gravlapp, notater hvis finnes]        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Hold 2 - Grovfelt skive                 │
│ [Gravlapp, notater hvis finnes]        │
└─────────────────────────────────────────┘

... (resten av holdene)

┌─────────────────────────────────────────┐
│ 🤖 AI-ASSISTENT                         │
│                                         │
│ [Generér oppsummering] knapp            │
│                                         │
│ (eller hvis allerede generert:)        │
│                                         │
│ 📊 Oppsummering av stevnet              │
│                                         │
│ Samlet inntrykk:                        │
│ "Basert på notatene og dataene ser det │
│ ut til at du håndterte korte distanser │
│ godt, men lang avstand (245m) hadde     │
│ ingen dokumentasjon..."                 │
│                                         │
│ Hold-for-hold:                          │
│ • Hold 1: [kort AI-kommentar]          │
│ • Hold 2: [kort AI-kommentar]          │
│ • Hold 3: [kun bilde, ingen tekst]     │
│ • Hold 4: [ingen dokumentasjon]        │
│                                         │
│ Forslag til forbedring:                 │
│ • [forslag 1]                           │
│ • [forslag 2]                           │
│                                         │
│ ⚠️ Dette er en AI-generert vurdering    │
│ basert på tilgjengelige data. Den       │
│ erstatter ikke offisiell poengsum.      │
│                                         │
│ [Regenerér] [Lukk]                      │
└─────────────────────────────────────────┘

[Tilbake til stevner]
```

**Fordeler:**
- Naturlig flyt: først fakta, så refleksjon
- Bruker ikke skjult data, alt AI ser vises også til bruker
- Enkel å hoppe over hvis ikke ønsket
- Klar visuell separasjon fra faktiske data

**Ulemper:**
- Tar plass på siden
- Kan bli lang hvis mange hold

### Variant B: Modal/overlay

Knapp: "Se AI-analyse" som åpner fullskjerm-overlay

**Fordeler:**
- Tar ikke plass i hovedflyten
- Mer fokusert opplevelse
- Lettere å lukke hvis ikke interessert

**Ulemper:**
- Ett ekstra klikk
- Bryter navigasjonen
- Kan føles "gjemt"

### Variant C: Kollapsbar seksjon

Lukket som standard, åpnes ved klikk

**Fordeler:**
- Kompromiss mellom A og B
- Synlig men ikke påtrengende
- Kan ha preview-tekst når lukket

**Ulemper:**
- Noe mer kompleks UI
- Risiko for "out of sight, out of mind"

---

## ANBEFALING: Variant A (Egen seksjon)

Mest transparent og letteste å implementere. Bruker ser eksplisitt at AI får samme data som dem selv.

---

## BRUKERAKTIVERING

### On-demand generering (ANBEFALT)

**Flow:**
1. Bruker fullfører stevne → redirect til summary
2. Summary viser alle hold som vanlig
3. Nederst: AI-seksjon med knapp "Generér AI-oppsummering"
4. Ved klikk: API-kall til edge function, laster i 2-5 sekunder
5. Viser resultat, lagrer i database (se datamodell under)

**Fordeler:**
- Bruker har kontroll
- Sparer API-kall hvis ikke ønsket
- Kan regenerere hvis utilfreds
- Ingen overraskelser

**Ulemper:**
- Krever aktivt valg fra bruker

### Auto-generering ved fullføring

Genereres automatisk når entry settes til 'completed'

**Fordeler:**
- Alltid tilgjengelig
- Ingen ekstra handling nødvendig

**Ulemper:**
- Koster API-kall selv om ikke brukt
- Mindre kontroll for bruker
- Kan oppleves påtrengende

---

## ANBEFALING: On-demand med cache

Generer kun ved forespørsel, men lagre resultat så det ikke må regenereres.

---

## DATAINNGANG TIL AI

### Hva sendes til AI-modellen?

**Strukturert input:**

```typescript
interface AIAssistantInput {
  competition: {
    name: string;
    type: string;              // 'grovfelt' | 'finfelt' | etc.
    date: string;
    location?: string;
  };

  stages: Array<{
    stage_number: number;
    field_figure: {
      code: string;            // '1/3', '1/4', etc.
      name: string;            // 'Grovfelt figur'
      distance_m: number;
    };
    clicks: number;            // Antall knepp justert
    clicks_to_zero: number;    // Tilbake til null (hvis brukt)

    // Dokumentasjon (kan være null/undefined)
    documentation?: {
      has_image: boolean;
      image_analysis?: string; // Hvis vi implementerer bildeanalyse senere
      notes?: string;          // Brukerens egne notater
    };

    // Kontekst
    wind?: {
      speed?: number;
      direction?: string;
    };
    time_used?: number;        // Hvis vi tracker tid senere
  }>;

  overall_context: {
    total_shots?: number;
    weather_notes?: string;    // Fra competition-nivå notater
    shooter_notes?: string;    // Generelle notater
  };
}
```

**Eksempel payload for FASE 3B TEST-stevne:**

```json
{
  "competition": {
    "name": "FASE 3B VERIFIKASJONSTEST",
    "type": "grovfelt",
    "date": "2026-03-19"
  },
  "stages": [
    {
      "stage_number": 1,
      "field_figure": {
        "code": "1/3",
        "name": "Grovfelt figur",
        "distance_m": 100
      },
      "clicks": 3,
      "clicks_to_zero": 0,
      "documentation": {
        "has_image": false,
        "notes": "God vind, holdt rett på. Alle treff i figur. Føltes bra!"
      }
    },
    {
      "stage_number": 2,
      "field_figure": {
        "code": "1/4",
        "name": "Grovfelt skive",
        "distance_m": 100
      },
      "clicks": 5,
      "clicks_to_zero": 0,
      "documentation": {
        "has_image": true,
        "notes": "Sterk motvind fra høyre. Måtte holde 2 knepp venstre. Ett treff utenfor."
      }
    },
    {
      "stage_number": 3,
      "field_figure": {
        "code": "1/4V",
        "name": "Grovfelt skive venstre",
        "distance_m": 100
      },
      "clicks": 7,
      "clicks_to_zero": 0,
      "documentation": {
        "has_image": true
      }
    },
    {
      "stage_number": 4,
      "field_figure": {
        "code": "1/6",
        "name": "Grovfelt skive",
        "distance_m": 245
      },
      "clicks": 12,
      "clicks_to_zero": 0
    }
  ],
  "overall_context": {}
}
```

**Hva sendes IKKE:**
- ❌ Faktisk poengsum (vi har den ikke)
- ❌ Bildefiler (for tungt, bildeanalyse er fase 2)
- ❌ Bruker-ID eller persondata
- ❌ Andre brukeres data

---

## AI-PROMPT DESIGN

### System prompt (fast):

```
Du er en hjelpsom feltskytingsassistent som analyserer stevnedata for en skytte.

VIKTIGE REGLER:
1. Du er IKKE dommer og setter IKKE offisiell score
2. Du kan kun observere data som er gitt deg
3. Vær ALLTID forsiktig med konklusjoner
4. Bruk språk som "kan tyde på", "muligens", "ser ut til"
5. Hvis data mangler, si det eksplisitt
6. Vær konstruktiv og oppmuntrende, men ærlig
7. Svar alltid på norsk (bokmål)

TILGJENGELIG DATA:
- Figur og avstand per hold
- Antall knepp justert
- Brukerens egne notater (hvis skrevet)
- Om bilde ble lastet opp (men ikke bildeinnhold)
- Vinddata (hvis notert)

DU KAN IKKE SE:
- Faktiske treffbilder (selv om bilde er lastet opp)
- Nøyaktig poengsum
- Andre skytteres prestasjoner
- Offisielle resultater

OPPGAVE:
Gi en kort, støttende oppsummering per hold og samlet.
Fokuser på mønstre, forbedringspunkter og positive observasjoner.
```

### User prompt (dynamisk, per stevne):

```
Analyser dette gjennomførte feltskyting-stevnet og gi en støttende oppsummering.

[JSON-data settes inn her]

Struktur på svaret:
1. En kort innledning (1-2 setninger) om stevnet generelt
2. Kort kommentar per hold (1-2 setninger per hold)
3. Samlede observasjoner (2-3 punkter)
4. Forslag til forbedring (1-2 konkrete forslag)

Husk: Vær ærlig om hva du kan og ikke kan se.
```

---

## AI-OUTPUTFORMAT

### Strukturert JSON-respons fra edge function:

```typescript
interface AIAssistantResponse {
  summary: {
    introduction: string;        // 1-2 setninger

    per_hold: Array<{
      stage_number: number;
      comment: string;           // 1-2 setninger
      confidence: 'high' | 'medium' | 'low';  // Basert på datatilgang
    }>;

    overall_observations: string[];  // 2-3 punktliste-elementer

    improvement_suggestions: string[];  // 1-2 konkrete forslag
  };

  metadata: {
    generated_at: string;        // ISO timestamp
    model_used: string;          // 'claude-3-haiku' eller lignende
    data_quality: 'complete' | 'partial' | 'minimal';  // Hvor mye data var tilgjengelig
  };

  disclaimers: string[];         // Standard disclaimers
}
```

### Eksempel-output for FASE 3B TEST:

```json
{
  "summary": {
    "introduction": "Du gjennomførte et grovfelt-stevne med 4 hold på varierende avstander fra 100m til 245m. Dokumentasjonen varierer mellom holdene, men der du har notert ser jeg et bevisst forhold til vindpåvirkning.",

    "per_hold": [
      {
        "stage_number": 1,
        "comment": "Du noterer god vind og at du holdt rett på med alle treff i figur. Dette tyder på gode forhold og trygg gjennomføring på kort avstand.",
        "confidence": "high"
      },
      {
        "stage_number": 2,
        "comment": "Tydelig notert motvind fra høyre og at du kompenserte ved å holde venstre. At du registrerer ett treff utenfor viser god selvevaluering.",
        "confidence": "high"
      },
      {
        "stage_number": 3,
        "comment": "Du har dokumentert med bilde, men uten skriftlige notater kan jeg ikke si noe om opplevelsen av holdet. 7 knepp justert på 100m kan tyde på annen vinkel eller skråning.",
        "confidence": "low"
      },
      {
        "stage_number": 4,
        "comment": "Ingen dokumentasjon fra lang avstand (245m). Dette var et krevende hold med 12 knepp elevering, og det hadde vært verdifullt å notere hvordan det gikk.",
        "confidence": "low"
      }
    ],

    "overall_observations": [
      "Du har god bevissthet om vindpåvirkning og noterer dette tydelig",
      "Dokumentasjonen er grundigst på de første holdene, mindre på slutten (kanskje tidspress eller mental tretthet?)",
      "Teknisk håndtering av knepp-justering ser ut til å være gjort riktig (fra 3 til 12 knepp over økende avstand)"
    ],

    "improvement_suggestions": [
      "Forsøk å opprettholde notatvaner også på siste hold - det er ofte der viktigst læring skjer",
      "Hvis mulig, noter kort hvordan skuddet 'føltes' selv på hold uten bilde - dette hjelper i etteranalyse"
    ]
  },

  "metadata": {
    "generated_at": "2026-03-19T17:30:00Z",
    "model_used": "claude-3-haiku",
    "data_quality": "partial"
  },

  "disclaimers": [
    "Dette er en AI-generert vurdering basert på tilgjengelige data",
    "Jeg har ikke sett faktiske treffbilder eller offisiell poengsum",
    "Vurderingen erstatter ikke feedback fra instruktør eller offisiell evaluering"
  ]
}
```

---

## USIKKERHETSKOMMUNIKASJON

### Confidence-nivåer i UI:

**HIGH** (mye data, tydelige notater):
- Vises som normal tekst
- Ikon: ✓ (grønn)

**MEDIUM** (noe data, men huller):
- Tekst med "(basert på begrenset info)"
- Ikon: ~ (gul)

**LOW** (ingen/minimal data):
- Tekst i kursiv med "uten dokumentasjon kan jeg ikke vite..."
- Ikon: ? (grå)

**Eksempel i UI:**

```
Hold 1 ✓
Du noterer god vind og at du holdt rett på med alle treff i figur.

Hold 3 ?
Du har lastet opp bilde, men uten skriftlige notater kan jeg kun se
tekniske data (7 knepp på 100m).
```

---

## DATALAGRING

### Ny tabell: `competition_ai_summaries`

```sql
CREATE TABLE competition_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- AI-generated innhold
  summary_json JSONB NOT NULL,          -- AIAssistantResponse struktur

  -- Metadata
  model_used TEXT NOT NULL,             -- 'claude-3-haiku', etc.
  data_quality TEXT NOT NULL,           -- 'complete', 'partial', 'minimal'
  tokens_used INTEGER,                  -- For kostnadsestimering

  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Versioning (for regenerering)
  version INTEGER NOT NULL DEFAULT 1,

  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_summaries_entry ON competition_ai_summaries(entry_id);
CREATE INDEX idx_ai_summaries_user ON competition_ai_summaries(user_id);
CREATE INDEX idx_ai_summaries_active ON competition_ai_summaries(entry_id, is_active)
  WHERE is_active = true;

-- RLS
ALTER TABLE competition_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
  ON competition_ai_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON competition_ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Kun én aktiv summary per entry
CREATE UNIQUE INDEX unique_active_summary_per_entry
  ON competition_ai_summaries(entry_id)
  WHERE is_active = true;
```

**Regenerering:**
- Setter `is_active = false` på gammel summary
- Inserter ny rad med `version = old_version + 1`
- Historikk bevares for debugging/analyse

---

## EDGE FUNCTION: `generate-competition-summary`

### Input:
```typescript
{
  entry_id: string;
}
```

### Prosess:
1. Validér at entry tilhører user (auth check)
2. Sjekk om summary allerede finnes og er nylig (<1 time)
   - Hvis ja: returner cached
   - Hvis nei: fortsett
3. Hent competition + stages + stage_images + field_figures
4. Bygg AIAssistantInput struktur
5. Kall AI-modell (Claude 3 Haiku via OpenRouter eller direkte Anthropic API)
6. Parse og validér respons
7. Lagre i `competition_ai_summaries`
8. Returner til frontend

### Output:
```typescript
{
  success: boolean;
  summary?: AIAssistantResponse;
  error?: string;
  cached?: boolean;  // true hvis fra cache, false hvis ny generering
}
```

---

## TEKNISK STACK

### AI-modell: Claude 3 Haiku (ANBEFALT)

**Hvorfor Haiku:**
- Rask respons (viktig for UX)
- God norsk-støtte
- Billig (~$0.25 per 1M input tokens)
- Godt nok for denne use casen (trenger ikke Opus)
- God instruksjonslyding for "vær forsiktig" prompts

**Alternativer:**
- GPT-4o-mini (billigere, men svakere norsk)
- Claude 3.5 Sonnet (dyrere, overkill for dette)

### API-tilgang:

**Via OpenRouter (ENKLESTE):**
- Anbefales for prototyping
- Flat monthly billing
- Enkel å bytte modell
- Ingen direktekontrakt med Anthropic nødvendig

**Direkte Anthropic API:**
- Beste for produksjon ved stor skala
- Litt mer oppsett
- Lavere per-token kostnad

---

## KOSTNADSESTIMERING

### Per summary:
- Input: ~1500 tokens (competition + stages + prompts)
- Output: ~800 tokens (strukturert respons)
- Totalt: ~2300 tokens

### Med Claude 3 Haiku:
- Input: $0.25 / 1M tokens = $0.000375
- Output: $1.25 / 1M tokens = $0.001000
- **Per summary: ~$0.00138 (ca. 1.5 øre)**

### Med 1000 aktive brukere, 2 stevner/mnd:
- 2000 summaries/mnd
- Kostnad: $2.76/mnd (~30 kr/mnd)

**Konklusjon:** Neglisjerbar kostnad, kan tilbys gratis til alle brukere.

---

## SIKKERHET & PERSONVERN

### PII (Personally Identifiable Information):
- ❌ SEND ALDRI bruker-ID til AI-modell
- ❌ SEND ALDRI navn eller e-post
- ✅ Kun anonymiserte prestasjonsdata

### Rate limiting:
- Max 5 summaries per bruker per dag (hindrer misbruk)
- Max 1 regenerering per summary per time

### Content filtering:
- Hvis brukernotater inneholder støtende innhold → skip hele holdet i AI-input
- AI-output saniteres før visning (escape HTML)

### Logging:
- Logg kun metadata (timestamp, model, tokens)
- IKKE logg faktisk AI-output eller brukernotater (GDPR)

---

## IMPLEMENTERINGSPLAN (IKKE IMPLEMENTERT ENNÅ)

### Fase 1: Grunnleggende AI-oppsummering
1. Opprett `competition_ai_summaries` tabell (migrasjon)
2. Opprett edge function `generate-competition-summary`
3. Legg til "Generér AI-oppsummering" knapp i CompetitionSummary
4. Vis output i UI med disclaimers
5. Test med FASE 3B TEST-data

### Fase 2: Forbedringer
1. Cache-mekanisme (ikke regenerér unødvendig)
2. Rate limiting
3. Error handling (hva hvis AI feiler?)
4. Loading states
5. Regenerering-funksjonalitet

### Fase 3: Intelligens
1. Bildeanalyse (hvis feasible)
2. Trendsporing over tid (sammenlign med tidligere stevner)
3. Personalisering (husk hva bruker typisk sliter med)

---

## DESIGN-BESLUTNINGER: OPPSUMMERING

| Aspekt | Valg | Begrunnelse |
|--------|------|-------------|
| **UI-plassering** | Egen seksjon i summary-side | Transparent, ikke skjult |
| **Aktivering** | On-demand med cache | Gir kontroll, sparer API-kall |
| **AI-modell** | Claude 3 Haiku | Balanse mellom kvalitet, hastighet, kostnad |
| **Tone** | Forsiktig, støttende | Ikke overvurdere egen kunnskap |
| **Datalagring** | Egen tabell med versioning | Muliggjør historikk og analyse |
| **Kostnad** | ~1.5 øre per summary | Neglisjerbar, kan være gratis |

---

## NESTE STEG

1. **Godkjenning av design** - Er dette retningen vi vil?
2. **Velg AI-tilgang** - OpenRouter eller Anthropic direkte?
3. **Opprett migrasjon** - `competition_ai_summaries` tabell
4. **Implementer edge function** - Start med mock response
5. **Implementer UI** - Knapp + resultat-visning
6. **Test med ekte data** - FASE 3B TEST-stevne
7. **Iterér basert på feedback** - Tune prompt, forbedre output

---

## ÅPNE SPØRSMÅL

1. **Bildeanalyse?** Skal vi sende faktiske gravlapp-bilder til AI i fremtiden? (koster mer, gir mer verdi)
2. **Trendsporing?** Skal AI sammenligne med brukerens tidligere stevner?
3. **Timing?** Når skal summary bli tilgjengelig - umiddelbart etter fullføring eller etter noen timer?
4. **Brukerkontroll?** Skal brukere kunne slette/skjule AI-summaries permanent?
5. **Deling?** Skal AI-summaries kunne deles med instruktør eller lag?

---

## DISCLAIMER (vises i UI)

```
🤖 AI-ASSISTENT

Dette er en eksperimentell funksjon som bruker kunstig intelligens
til å analysere dine stevnedata.

Viktig å vite:
• Dette er IKKE en offisiell vurdering eller poengsum
• AI-en baserer seg kun på data du har dokumentert
• Vurderingen kan være unøyaktig eller ufullstendig
• Den erstatter ikke feedback fra instruktør

AI-en er ment som et refleksjonsverktøy for egen læring.
```

---

**Ende design-dokument**
