# FASE 3B - STRUKTURERT DATA PER HOLD

**Status:** Implementert og bygget
**Dato:** 2026-03-19
**Formål:** Samle strukturert data fra hvert hold som grunnlag for senere AI-analyse

---

## IMPLEMENTERTE FUNKSJONER

### 1. Hold-notater (valgfritt)

**Database:**
- Ny kolonne `notes` i `competition_stage_images` (text, nullable)
- Storage_path gjort nullable for å tillate kun notater uten bilde

**UI i post_hold:**
```
┌─────────────────────────────────┐
│ 📷 Gravlapp (valgfritt)        │
│                                 │
│ [Bilde hvis opplastet]         │
│ eller                           │
│ [Velg eller ta bilde] knapp    │
│                                 │
├─────────────────────────────────┤
│ 📝 Notater (valgfritt)         │
│                                 │
│ Notér observasjoner, vind,     │
│ eller andre detaljer fra holdet│
│                                 │
│ ┌─────────────────────────────┐│
│ │ F.eks: Sterk motvind,       ││
│ │ måtte holde venstre...      ││
│ │                             ││
│ └─────────────────────────────┘│
│                                 │
│ [Lagre notater] ← kun synlig   │
│                   ved endring  │
└─────────────────────────────────┘
```

**Funksjonalitet:**
- Tekstfelt med 4 rader
- Placeholder med eksempel
- Auto-lagring ved endring (vises "Lagre notater" knapp)
- Kan lagres uten bilde
- Kan lagres sammen med bilde
- State synkroniseres med existingImage.notes

### 2. Strukturert lagring

**Data per hold i competition_stage_images:**
```typescript
{
  entry_id: string;          // Hvilket stevne
  stage_number: number;       // Hvilket hold (1-N)
  user_id: string;           // Hvem

  // Bilde (valgfritt)
  storage_path: string | null;
  image_url: string | null;
  uploaded_at: string | null;

  // Notater (valgfritt)
  notes: string | null;

  // Metadata
  created_at: string;
}
```

**Kombinasjoner:**
- ✅ Kun bilde (notes = null, storage_path != null)
- ✅ Kun notater (notes != null, storage_path = null)
- ✅ Både bilde og notater (begge != null)
- ✅ Ingen dokumentasjon (ingen rad i tabellen)

### 3. Oppsummering etter stevne

**Ny side:** `/competitions/entry/{entryId}/summary`

**Visning:**
```
┌──────────────────────────────────────────┐
│ ← Tilbake til stevner                    │
│                                           │
│ ╔═══════════════════════════════════════╗│
│ ║ Feltkarusell 2026          ✓ Fullført ║│
│ ║ 19. mars 2026 • Grovfelt             ║│
│ ╚═══════════════════════════════════════╝│
│                                           │
│ ┌─────────────────────────────────────┐ │
│ │ ① Hold 1          Stående dyr    15m │ │
│ │                         3 knepp      │ │
│ ├─────────────────────────────────────┤ │
│ │ 🎯 Gravlapp                         │ │
│ │ [Bilde vises her]                   │ │
│ │                                     │ │
│ │ Notater                             │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ God vind, holdt rett på.        │ │ │
│ │ │ Alle treff i figur.             │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
│                                           │
│ ┌─────────────────────────────────────┐ │
│ │ ② Hold 2          Liggende elg   30m │ │
│ │                         5 knepp      │ │
│ ├─────────────────────────────────────┤ │
│ │ Ingen dokumentasjon fra dette holdet│ │
│ └─────────────────────────────────────┘ │
│                                           │
│ ┌─────────────────────────────────────┐ │
│ │ ③ Hold 3          Rådyr          50m │ │
│ │                         8 knepp      │ │
│ ├─────────────────────────────────────┤ │
│ │ Notater                             │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Sterk motvind, måtte holde høyre│ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Hvert hold viser:**
- Hold nummer (1, 2, 3...)
- Figurnavn
- Avstand (m)
- Knepp (hvis satt)
- Gravlapp-bilde (hvis lastet opp)
- Notater (hvis skrevet)
- "Ingen dokumentasjon" hvis både bilde og notater mangler

### 4. Navigasjon til oppsummering

**Automatisk:**
- Når stevne fullføres → redirect til `/competitions/entry/{entryId}/summary`
- Erstatter tidligere redirect til `/competitions/{competitionId}`

**Fra stevneliste:**
- Fullførte stevner (entries med completed_at) linker direkte til oppsummering
- Pågående stevner linker til run-siden som før

**Logikk:**
```typescript
// Competitions.tsx linje 102
to={entry.completed_at
  ? `/competitions/entry/${entry.id}/summary`
  : `/competitions/${competition.id}/run/${entry.id}`}
```

---

## DATAFLYT

### Lagre notater (uten bilde)

```
1. Bruker skriver i tekstfelt
   → notes state oppdateres

2. Bruker klikker "Lagre notater"
   → handleSaveNotes()

3. Hvis existingImage finnes:
   → UPDATE competition_stage_images SET notes = ...

   Hvis ikke:
   → INSERT INTO competition_stage_images (entry_id, stage_number, user_id, notes)

4. onImageUploaded() callback
   → CompetitionRun.loadData()
   → oppdatert existingImage returneres
   → UI viser "Notater lagret"
```

### Lagre både bilde og notater

```
1. Last opp bilde først
   → INSERT competition_stage_images (entry_id, stage_number, storage_path, image_url, ...)

2. Skriv notater
   → notes state oppdateres

3. Klikk "Lagre notater"
   → UPDATE competition_stage_images SET notes = ... WHERE id = existingImage.id

4. Samme rad inneholder nå både bilde og notater
```

### Hente oppsummering

```
1. Naviger til /competitions/entry/{entryId}/summary

2. CompetitionSummary.loadData():
   → SELECT * FROM competition_entries WHERE id = entryId
   → SELECT * FROM competition_stages WHERE competition_id = ...
   → SELECT * FROM competition_stage_images WHERE entry_id = entryId
   → SELECT * FROM field_figures WHERE is_active = true

3. For hvert stage:
   → Finn figure basert på field_figure_id
   → Finn stageImage basert på stage_number
   → Render kort med all info
```

---

## MIGRASJONER

### add_notes_to_competition_stage_images.sql
```sql
ALTER TABLE competition_stage_images
ADD COLUMN notes text DEFAULT NULL;
```

### make_storage_path_nullable_in_stage_images.sql
```sql
ALTER TABLE competition_stage_images
ALTER COLUMN storage_path DROP NOT NULL;
```

**Rasjonale:**
Når kun notater lagres (uten bilde), må storage_path kunne være null.

---

## FILER ENDRET

### Nye filer:
1. `src/pages/CompetitionSummary.tsx` - Oppsummeringsside
2. `supabase/migrations/add_notes_to_competition_stage_images.sql`
3. `supabase/migrations/make_storage_path_nullable_in_stage_images.sql`

### Endrede filer:
1. `src/components/competition/HoldImageUpload.tsx`
   - Lagt til notes state og handleSaveNotes()
   - Lagt til notat-seksjon i UI
   - FileText ikon importert

2. `src/types/database.ts`
   - Lagt til `notes: string | null` i CompetitionStageImage
   - Endret `storage_path` til nullable

3. `src/App.tsx`
   - Importert CompetitionSummary
   - Lagt til rute `/competitions/entry/:entryId/summary`

4. `src/pages/CompetitionRun.tsx`
   - Endret handleFinish() til å navigere til summary i stedet for competitions

5. `src/pages/Competitions.tsx`
   - Endret Link til å peke på summary for fullførte entries

---

## TESTING

### Manuell testplan:

**Test 1: Lagre kun notater**
1. Start stevne
2. Fullfør hold 1
3. IKKE last opp bilde
4. Skriv notater: "Test notat uten bilde"
5. Klikk "Lagre notater"
6. Gå til neste hold
7. Fullfør stevnet
8. Verifiser i oppsummering at hold 1 viser kun notater (ikke bilde)

**Test 2: Lagre kun bilde**
1. Start stevne
2. Fullfør hold 1
3. Last opp bilde
4. IKKE skriv notater
5. Gå til neste hold
6. Fullfør stevnet
7. Verifiser i oppsummering at hold 1 viser kun bilde (ikke notat-seksjon)

**Test 3: Lagre både bilde og notater**
1. Start stevne
2. Fullfør hold 1
3. Last opp bilde
4. Skriv notater: "Test med både bilde og notat"
5. Klikk "Lagre notater"
6. Gå til neste hold
7. Fullfør stevnet
8. Verifiser i oppsummering at hold 1 viser både bilde og notater

**Test 4: Hoppe over alt**
1. Start stevne
2. Fullfør hold 1
3. IKKE last opp bilde
4. IKKE skriv notater
5. Klikk "Neste hold" direkte
6. Fullfør stevnet
7. Verifiser i oppsummering at hold 1 viser "Ingen dokumentasjon fra dette holdet"

**Test 5: Navigasjon**
1. Fullfør et stevne
2. Verifiser redirect til oppsummering (ikke til competitions-liste)
3. Gå tilbake til competitions-liste
4. Klikk på fullført stevne
5. Verifiser at oppsummering åpnes

---

## DATAMODELL FOR AI (FREMTIDIG)

Strukturert data nå tilgjengelig per hold:

```typescript
interface HoldData {
  // Fra competition_stages:
  stage_number: number;
  field_figure_id: string;
  distance: number;
  clicks: number;
  clicks_to_zero: number;

  // Fra field_figures:
  figure_name: string;
  figure_code: string;

  // Fra competition_stage_images:
  image_url?: string;      // Visuell analyse
  notes?: string;          // Tekstanalyse

  // Kontekst:
  competition_type: 'grovfelt' | 'finfelt';
  competition_name: string;
  date: string;
}
```

**AI kan senere:**
- Analysere treffbilder (image_url)
- Tolke brukernotater (notes)
- Kombinere med teknisk data (distance, clicks)
- Gi personaliserte forbedringstips
- Identifisere mønstre over tid

---

## BEGRENSNINGER

**Bevisst IKKE implementert i denne fasen:**
- AI-analyse av bilder
- AI-genererte oppsummeringer
- Treffanalyse
- Statistikk over flere stevner
- Eksport til PDF/delbare formater

**Rasjonale:**
Fase 3B fokuserer kun på datainnsamling. AI-funksjonalitet kommer senere når grunndata er etablert.

---

## BUILD STATUS

```bash
npm run build
✓ built in 7.13s
```

**Bundle size:**
- CSS: 52.58 kB (gzip: 8.65 kB)
- JS: 780.37 kB (gzip: 172.63 kB)

**Type-sjekk:**
- Ingen feil

---

## NESTE STEG (IKKE I DENNE FASEN)

Fremtidige faser kan bygge på denne strukturen:

1. **Fase 3C: AI-oppsummering**
   - Bruk existingImage.notes som input
   - Generer oppsummering av hele stevnet
   - Vis i CompetitionSummary

2. **Fase 3D: Bilde-analyse**
   - Bruk existingImage.image_url
   - Detekter treffsoner
   - Beregn presisjon

3. **Fase 3E: Langsiktig analyse**
   - Sammenlign flere stevner
   - Identifiser forbedringsområder
   - Personaliserte anbefalinger

Men disse implementeres IKKE nå. Fase 3B er komplett.
