# Fra Mock til Ekte AI - Implementeringsguide

## Status akkurat nå

**MOCK:** Edge function bruker `generateMockSummary()` med hardkodet logikk.

**Modell:** `"mock-v1"` (lagret i database)

---

## Hva skal til for ekte AI

### 1. Legg til Anthropic API key (2 min)

**Via Supabase Dashboard:**
```bash
# 1. Gå til Supabase Dashboard
# 2. Project → Edge Functions → Manage Secrets
# 3. Add new secret:

Name:  ANTHROPIC_API_KEY
Value: sk-ant-api03-...
```

**Eller via CLI (hvis støttet):**
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

### 2. Erstatt mock-funksjon med ekte API-kall (30 min)

**Fil:** `supabase/functions/generate-competition-summary/index.ts`

**Finn denne blokken (linje ~180):**
```typescript
// Generate AI summary (mock for now - will use Claude API later)
const aiResponse: AIResponse = generateMockSummary(aiInput);
```

**Erstatt med:**
```typescript
// Generate AI summary using Claude
const aiResponse: AIResponse = await generateClaudeSummary(aiInput);
```

---

### 3. Implementer `generateClaudeSummary()` funksjon

**Legg til før `Deno.serve()`:**

```typescript
async function generateClaudeSummary(input: AIInput): Promise<AIResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  // Build structured prompt
  const prompt = buildPromptForClaude(input);

  // Call Claude API
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Parse JSON response from Claude
  const parsed = JSON.parse(content);

  // Map to our AIResponse format
  return {
    summary: {
      introduction: parsed.introduction,
      per_hold: parsed.per_hold.map((h: any) => ({
        stage_number: h.stage_number,
        comment: h.comment,
        data_basis: h.data_basis,
      })),
      overall_observations: parsed.overall_observations,
      improvement_suggestions: parsed.improvement_suggestions,
    },
    metadata: {
      generated_at: new Date().toISOString(),
      model_used: "claude-3-5-sonnet-20241022",
      data_quality: calculateDataQuality(input.stages),
    },
    disclaimers: [
      "Dette er en AI-generert vurdering basert på tilgjengelige data",
      "Jeg har ikke sett faktiske treffbilder eller offisiell poengsum",
      "Vurderingen erstatter ikke feedback fra instruktør eller offisiell evaluering",
    ],
  };
}
```

---

### 4. Bygg strukturert prompt

```typescript
function buildPromptForClaude(input: AIInput): string {
  const { competition, stages } = input;

  // Build stages description
  const stagesDesc = stages
    .map((s) => {
      let desc = `\n**Hold ${s.stage_number}:**`;
      desc += `\n- Figur: ${s.field_figure.code} (${s.field_figure.name})`;
      desc += `\n- Avstand: ${s.field_figure.distance_m}m`;
      desc += `\n- Knepp brukt: ${s.clicks}`;

      if (s.documentation?.notes) {
        desc += `\n- Brukerens notat: "${s.documentation.notes}"`;
      } else if (s.documentation?.has_image) {
        desc += `\n- Dokumentasjon: Kun bilde, ingen tekstnotat`;
      } else {
        desc += `\n- Dokumentasjon: Ingen`;
      }

      return desc;
    })
    .join("\n");

  return `Du er en hjelpsom assistent for feltskyttere. En bruker har gjennomført et stevne og ønsker refleksjon over prestasjonen.

**Stevne:**
- Navn: ${competition.name}
- Type: ${competition.type}
- Dato: ${competition.date}
- Antall hold: ${stages.length}

**Hold-data:**
${stagesDesc}

**Din oppgave:**

Generer en refleksjon i JSON-format med følgende struktur:

\`\`\`json
{
  "introduction": "En kort intro (2-3 setninger) som oppsummerer stevnet",
  "per_hold": [
    {
      "stage_number": 1,
      "comment": "Kommentar om dette holdet",
      "data_basis": "notater" | "begrenset" | "ingen"
    }
  ],
  "overall_observations": [
    "Observasjon 1",
    "Observasjon 2"
  ],
  "improvement_suggestions": [
    "Forslag 1",
    "Forslag 2"
  ]
}
\`\`\`

**Viktige regler:**

1. **Data-forankring:**
   - Hvis bruker har skrevet notat: SITER fra notatet eksplisitt. Bruk format: "Du skrev: '[sitat]'. [analyse]"
   - Hvis kun bilde: Vær beskjeden, nevn at tekstnotat ville hjulpet
   - Hvis ingen data: Kun faktaopplysninger, ingen gjetninger

2. **Data_basis klassifisering:**
   - "notater": Hvis tekstnotat finnes
   - "begrenset": Hvis kun bilde finnes
   - "ingen": Hvis ingen dokumentasjon

3. **Tone:**
   - Støttende og konstruktiv
   - Unngå floskler og generelle råd
   - Fokus på det brukeren faktisk har dokumentert
   - Norsk språk

4. **Ikke gjør:**
   - Ikke spekuler om treffbilder
   - Ikke gi poengsum
   - Ikke sammenlign med andre
   - Ikke kritiser hardt

5. **Output:**
   - Returner KUN valid JSON
   - Ingen markdown, ingen forklaring
   - Bare JSON-objektet

Svar nå med JSON:`;
}
```

---

### 5. Håndter feil og fallback

**Legg til try-catch:**

```typescript
async function generateClaudeSummary(input: AIInput): Promise<AIResponse> {
  try {
    // ... API call code ...

  } catch (error) {
    console.error("Claude API failed, falling back to mock:", error);

    // Fallback to mock if API fails
    return generateMockSummary(input);
  }
}
```

**Eller alternativt, kast feil til bruker:**

```typescript
catch (error) {
  throw new Error(
    `Kunne ikke generere AI-oppsummering: ${error.message}`
  );
}
```

---

### 6. Oppdater metadata

**I hovedfunksjonen:**

```typescript
// Save new summary
const { error: insertError } = await supabase
  .from("competition_ai_summaries")
  .insert({
    entry_id,
    user_id: user.id,
    summary_json: aiResponse,
    model_used: aiResponse.metadata.model_used, // ← Nå "claude-3-5-sonnet-20241022"
    data_quality: aiResponse.metadata.data_quality,
    tokens_used: data.usage.input_tokens + data.usage.output_tokens, // ← Fra Claude respons
    version: (existingSummary?.version || 0) + 1,
    is_active: true,
  });
```

---

### 7. Test med ekte API

**Test command:**

```typescript
// I edge function, legg til logging:
console.log("Calling Claude API with prompt:", prompt);
console.log("Claude response:", content);
```

**Deploy:**
```bash
# Edge function deployes automatisk via tool
# Eller manuelt (hvis CLI støttes):
supabase functions deploy generate-competition-summary
```

**Test via UI:**
1. Gå til CompetitionSummary
2. Klikk "Generér AI-oppsummering"
3. Sjekk console for logger
4. Verifiser at respons er fra Claude (ikke mock)

**Sjekk database:**
```sql
SELECT
  model_used,
  tokens_used,
  data_quality,
  summary_json->'metadata'->>'model_used' as json_model
FROM competition_ai_summaries
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

Skal vise:
- `model_used`: "claude-3-5-sonnet-20241022"
- `tokens_used`: >0 (f.eks. 1500)

---

## Forventet forskjell: Mock vs Ekte AI

### Mock-output eksempel
```
Hold 1:
"Du skrev: 'God vind, holdt rett på. Alle treff i figur.'
 Bevisst vindforhold. Positiv opplevelse."
```

**Logikk:** Enkel if-contains("vind") + if-contains("god")

---

### Ekte AI-output eksempel
```
Hold 1:
"Du skrev: 'God vind, holdt rett på. Alle treff i figur. Føltes bra!'
 Ditt notat viser god bevissthet rundt vindforhold og en trygg
 holdavvikling. Det at alle treff kom i figur tyder på solid
 fokus gjennom hele holdet. Hold denne tilnærmingen fremover."
```

**Logikk:** Språkmodell med kontekstuell forståelse

---

## Kostnadsestimering

**Claude 3.5 Sonnet priser (per 1M tokens):**
- Input: $3
- Output: $15

**Typisk oppsummering:**
- Input: ~1000 tokens (prompt + data)
- Output: ~500 tokens (respons)

**Kostnad per oppsummering:**
- Input: $0.003
- Output: $0.0075
- **Total: ~$0.01 per oppsummering**

**Med 1000 brukere som genererer 10 oppsummeringer hver:**
- 10,000 oppsummeringer × $0.01 = **$100 totalt**

---

## Estimert tidsbruk

| Steg | Tid |
|------|-----|
| Få API key fra Anthropic | 5 min |
| Legg til secret i Supabase | 2 min |
| Implementere generateClaudeSummary() | 20 min |
| Implementere buildPromptForClaude() | 10 min |
| Testing og debugging | 30 min |
| **TOTALT** | **~1 time** |

---

## Verifisering at ekte AI fungerer

### 1. Sjekk model_used i database
```sql
SELECT model_used, tokens_used
FROM competition_ai_summaries
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

**Forventet:**
- `model_used`: "claude-3-5-sonnet-20241022" (IKKE "mock-v1")
- `tokens_used`: >0

---

### 2. Sjekk kvalitet på kommentarer

**Mock vil si:**
```
"Du skrev: '[første 50 tegn]...' Positiv opplevelse."
```

**Ekte AI vil si:**
```
"Du skrev: '[helt notat]' Dette viser god situasjonsforståelse.
 Din observasjon om vindskifte indikerer bevissthet som er
 verdifull i felt. Fortsett å dokumentere slike detaljer."
```

---

### 3. Test med komplekst notat

**Skriv et langt notat:**
```
"Hold 2 var utfordrende. Vinden skiftet midt i holdet fra
venstre til høyre. Første skudd traff venstre kant, så
korrigerte jeg 1 knepp høyre. Skudd 2-4 kom bedre, men siste
gikk litt for høyt. Tror jeg trakk pusten feil på det siste.
Må jobbe mer med pusteprogram."
```

**Mock vil:**
- Gi generisk respons om "utfordringer"

**Ekte AI vil:**
- Kommentere vindskiftet
- Notere korreksjon underveis
- Gi feedback på pusteteknikk-observasjonen
- Foreslå konkrete øvelser

---

## Oppsummering

**Nå (mock):**
- ✅ Struktur klar
- ✅ UI ferdig
- ✅ Database ferdig
- ✅ Testbar med mock-data
- ❌ Ikke ekte AI-analyse

**Etter upgrade (ekte AI):**
- ✅ Alt over +
- ✅ Claude API integrert
- ✅ Kontekstuell analyse
- ✅ Naturlig språkforståelse
- ✅ Personlige, spesifikke tilbakemeldinger

**Tidsbruk:** ~1 time
**Kostnad:** ~$0.01 per oppsummering
**Kompleksitet:** Lav (strukturen er klar)
