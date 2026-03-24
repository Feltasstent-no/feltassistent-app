# AI-ASSISTENT UI - Visuelle eksempler

## UI-plassering

```
┌─────────────────────────────────────────┐
│  CompetitionSummary Page                │
│                                         │
│  [← Tilbake til stevner]                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ FASE 3B VERIFIKASJONSTEST       │   │
│  │ 19. mars 2026 • Grovfelt        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Hold 1                          │   │
│  │ [Gravlapp bilde hvis tilgjengelig]│ │
│  │ [Notater hvis tilgjengelig]     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Hold 2                          │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Hold 3                          │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Hold 4                          │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃ ✨ AI-Assistent                 ┃   │ ← AI-seksjonen her
│  ┃ Refleksjon basert på dine data  ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│  │                                 │   │
│  │ [AI-innhold her]                │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## State 1: Initial (før generering)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎯 AI-Assistent                               ┃
┃ Refleksjon basert på dine data                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────┐
│                                             │
│  Få en AI-generert analyse av stevnet      │
│  basert på notater og data du har          │
│  dokumentert.                               │
│                                             │
│       ┌──────────────────────────┐         │
│       │ ✨ Generér AI-oppsummering│         │
│       └──────────────────────────┘         │
│                                             │
└─────────────────────────────────────────────┘
```

---

## State 2: Loading

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎯 AI-Assistent                               ┃
┃ Refleksjon basert på dine data                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────┐
│                                             │
│              ⟳ [Spinner]                    │
│                                             │
│         Genererer oppsummering...           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## State 3: Resultat med varierte data-basis

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎯 AI-Assistent                               ┃
┃ Refleksjon basert på dine data                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────┐
│ Du gjennomførte FASE 3B VERIFIKASJONSTEST  │
│ (grovfelt) med 4 hold den 19.03.2026.      │
│ Dokumentasjonen varierer i detalj mellom    │
│ holdene.                                    │
└─────────────────────────────────────────────┘

HOLD-FOR-HOLD

┌─────────────────────────────────────────────┐
│  ① ✅ Basert på notat                       │
│                                             │
│  Du skrev: "God vind, holdt rett på.        │
│  Alle treff i figur. Føltes bra!"           │
│  Positiv opplevelse.                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ② ✅ Basert på notat                       │
│                                             │
│  Du skrev: "Sterk motvind fra høyre.        │
│  Måtte holde 2 knepp venstre. Ett treff     │
│  utenfor." Bevisst vindforhold.             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ③ ⚠️  Begrenset data                       │
│                                             │
│  Bilde dokumentert, men uten tekstnotater.  │
│  7 knepp på 100m.                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ④ ❓ Ingen data                            │
│                                             │
│  Ingen dokumentasjon fra dette holdet.      │
│  12 knepp brukt på 245m.                    │
└─────────────────────────────────────────────┘

SAMLEDE OBSERVASJONER

┌─────────────────────────────────────────────┐
│  • Du dokumenterte 2 av 4 hold med          │
│    tekstnotater                             │
│  • 2 hold har bildebevis                    │
│  • Avstander varierte fra 100m til 245m     │
└─────────────────────────────────────────────┘

FORSLAG TIL FORBEDRING

┌─────────────────────────────────────────────┐
│  → Dokumentér alle hold med notater - selv  │
│    korte observasjoner hjelper i            │
│    etteranalyse                             │
│  → Ta bilde av alle gravlapper for          │
│    komplett dokumentasjon                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⚠️  VIKTIG Å VITE                           │
│                                             │
│ • Dette er en AI-generert vurdering basert  │
│   på tilgjengelige data                     │
│ • Jeg har ikke sett faktiske treffbilder    │
│   eller offisiell poengsum                  │
│ • Vurderingen erstatter ikke feedback fra   │
│   instruktør eller offisiell evaluering     │
└─────────────────────────────────────────────┘

            [Regenerér oppsummering]
```

---

## Data-basis indikator detaljer

### ✅ Grønn - "Basert på notat"
**Når:**
- `stage.documentation.notes` finnes

**Visuelt:**
- Grønn CheckCircle ikon
- Tekst: "Basert på notat"

**AI-kommentar:**
- Siterer direkte fra brukerens notat
- Analyserer nøkkelord (vind, bra, problem, etc.)
- Gir kontekstuell feedback

**Eksempel:**
```
① ✅ Basert på notat

Du skrev: "Litt skrå vind fra venstre, holdt
0.5 knepp høyre. Alle 4 i figur!"
Bevisst vindforhold. Positiv opplevelse.
```

---

### ⚠️ Gul - "Begrenset data"
**Når:**
- `stage.documentation.image_url` finnes
- MEN `stage.documentation.notes` mangler

**Visuelt:**
- Gul AlertCircle ikon
- Tekst: "Begrenset data"

**AI-kommentar:**
- Kun faktaopplysninger fra stage-data
- Nevner at bilde finnes men notater mangler
- Oppfordrer til tekstlig dokumentasjon

**Eksempel:**
```
③ ⚠️  Begrenset data

Bilde dokumentert, men uten tekstnotater.
7 knepp på 100m.
```

---

### ❓ Grå - "Ingen data"
**Når:**
- Verken `notes` eller `image_url` finnes

**Visuelt:**
- Grå HelpCircle ikon
- Tekst: "Ingen data"

**AI-kommentar:**
- Minimalt statement
- Kun tall fra stage-data (knepp, avstand)
- Ingen analyse mulig

**Eksempel:**
```
④ ❓ Ingen data

Ingen dokumentasjon fra dette holdet.
12 knepp brukt på 245m.
```

---

## Scenario-eksempler

### Scenario A: Erfaren skytter med god dokumentasjon
```
Stevne: 6 hold, alle dokumentert med notater + bilder

HOLD-FOR-HOLD:
① ✅ "Du skrev: 'Perfekt vind, holdt midt...' Positiv opplevelse."
② ✅ "Du skrev: 'Sterk motvind, 2 knepp...' Bevisst vindforhold."
③ ✅ "Du skrev: 'Litt nervøs, en enkelt...' Utfordringer notert."
④ ✅ "Du skrev: 'God flyt, alle i...' Positiv opplevelse."
⑤ ✅ "Du skrev: 'Skifte i vindretning...' Bevisst vindforhold."
⑥ ✅ "Du skrev: 'Solid avslutning...' Positiv opplevelse."

OBSERVASJONER:
• Du dokumenterte 6 av 6 hold med tekstnotater
• 6 hold har bildebevis
• Avstander varierte fra 100m til 300m

FORSLAG:
→ Fortsett dokumenteringsvanen - du er på rett vei

Data quality: complete
```

---

### Scenario B: Nybegynner med minimal dokumentasjon
```
Stevne: 4 hold, kun systemdata (knepp-tall)

HOLD-FOR-HOLD:
① ❓ "Ingen dokumentasjon fra dette holdet. 3 knepp brukt på 100m."
② ❓ "Ingen dokumentasjon fra dette holdet. 5 knepp brukt på 100m."
③ ❓ "Ingen dokumentasjon fra dette holdet. 7 knepp brukt på 150m."
④ ❓ "Ingen dokumentasjon fra dette holdet. 10 knepp brukt på 200m."

OBSERVASJONER:
• Avstander varierte fra 100m til 200m

FORSLAG:
→ Dokumentér alle hold med notater - selv korte observasjoner hjelper
→ Ta bilde av alle gravlapper for komplett dokumentasjon

Data quality: minimal
```

---

### Scenario C: Delvis dokumentasjon (typisk)
```
Stevne: 5 hold, 2 med notater, 2 med kun bilde, 1 ingen

HOLD-FOR-HOLD:
① ✅ "Du skrev: 'God start...' Positiv opplevelse."
② ⚠️  "Bilde dokumentert, men uten tekstnotater. 5 knepp på 100m."
③ ✅ "Du skrev: 'Vind fra høyre...' Bevisst vindforhold."
④ ⚠️  "Bilde dokumentert, men uten tekstnotater. 8 knepp på 150m."
⑤ ❓ "Ingen dokumentasjon fra dette holdet. 12 knepp brukt på 200m."

OBSERVASJONER:
• Du dokumenterte 2 av 5 hold med tekstnotater
• 4 hold har bildebevis
• Avstander varierte fra 100m til 200m

FORSLAG:
→ Dokumentér alle hold med notater - selv korte observasjoner hjelper
→ Ta bilde av alle gravlapper for komplett dokumentasjon

Data quality: partial
```

---

## Mock-logikk nøkkelord-analyse

AI-en (mock) gjenkjenner disse nøkkelordene:

**Vindrelatert:**
- "vind", "vindretning", "motvind", "medvind"
- → "Bevisst vindforhold."

**Positiv opplevelse:**
- "bra", "god", "gode", "perfekt", "solid", "alle i figur"
- → "Positiv opplevelse."

**Utfordringer:**
- "dårlig", "problem", "utenfor", "treff utenfor", "nervøs"
- → "Utfordringer notert."

**Eksempel mock-analyse:**
```javascript
const notes = "God vind fra høyre, alle treff i figur";

// Mock-logikk:
if (notes.toLowerCase().includes("vind"))
  → comment += "Bevisst vindforhold. "

if (notes.toLowerCase().includes("god"))
  → comment += "Positiv opplevelse."

// Resultat:
"Du skrev: 'God vind fra høyre, alle treff i figur.'
 Bevisst vindforhold. Positiv opplevelse."
```

---

## Fargepalett

```
Header gradient:     from-blue-600 to-indigo-600
Background:          from-blue-50 to-indigo-50
Border:              border-blue-200

Data-basis ikoner:
  ✅ Notater:       text-green-600
  ⚠️  Begrenset:    text-yellow-600
  ❓ Ingen:        text-gray-400

Disclaimers:        bg-amber-50, border-amber-200
                    text-amber-900
```

---

## Responsivt design

Mobile (< 640px):
- AI-box tar full bredde
- Hold-kort stabler vertikalt
- Tekst justeres for lesbarhet

Desktop (> 640px):
- AI-box max-width: 4xl (896px)
- Hold-kort i grid hvis plass
- Mer luft rundt elementer
