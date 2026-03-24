# FIGURE MAPPING TEST PROTOCOL

## 🎯 FORMÅL
Finne nøyaktig hvor hold-til-figur mapping feiler i flyten fra Configure → DB → Run.
- Configure viser: Hold 1 = B65, Hold 2 = Stripe 30/10
- Run viser: Hold 1 = C35, Hold 2 = C35 (samme figur på begge)

---

## LOGGING-PUNKTER IMPLEMENTERT

### 1. CONFIGURE - LASTING AV EKSISTERENDE STAGES

**Når:** Du åpner Configure-siden  
**Logger:** Hva som ligger i databasen fra før

```
[CompetitionConfigure] ========== LOADING EXISTING STAGES ==========
[CompetitionConfigure] Found existing stages: 2
[CompetitionConfigure] Loaded Stage 1: {
  id: "...",
  stage_number: 1,
  field_figure_id: "uuid-XYZ",
  distance_m: 100,
  clicks: 8
}
[CompetitionConfigure] Loaded Stage 2: {
  id: "...",
  stage_number: 2,
  field_figure_id: "uuid-ABC",
  distance_m: 150,
  clicks: 12
}
```

**HVA Å SJEKKE:**
- Er field_figure_id forskjellig for hold 1 og hold 2?
- Hvis like → problemet er i DB allerede

---

### 2. CONFIGURE - TILGJENGELIGE FIGURER

**Når:** Etter stages er lastet  
**Logger:** Hvilke figurer som er tilgjengelige for valg

```
[CompetitionConfigure] ========== LOADING AVAILABLE FIGURES ==========
[CompetitionConfigure] Competition type: grovfelt
[CompetitionConfigure] Filtering for grovfelt figures
[CompetitionConfigure] Loaded figures: 15
[CompetitionConfigure] Available figure: {
  id: "uuid-B65",
  code: "B65",
  name: "Grovfelt stående 65cm",
  category: "grovfelt"
}
[CompetitionConfigure] Available figure: {
  id: "uuid-C35",
  code: "C35",
  name: "Grovfelt sirkel 35cm",
  category: "grovfelt"
}
[CompetitionConfigure] Available figure: {
  id: "uuid-stripe",
  code: "S30/10",
  name: "Stripe 30/10",
  category: "grovfelt"
}
... (flere figurer)
```

**HVA Å SJEKKE:**
- Finnes både B65 og Stripe 30/10 i listen?
- Noter UUID for B65 og Stripe 30/10

---

### 3. CONFIGURE - NÅR DU ENDRER FIGUR

**Når:** Du velger en figur i dropdown for et hold  
**Logger:** Hvilken figur som ble valgt

```
[StageConfigCard] ========== FIGURE CHANGED FOR HOLD 1 ==========
[StageConfigCard] Hold 1 selected: {
  field_figure_id: "uuid-B65",
  figure_code: "B65",
  figure_name: "Grovfelt stående 65cm"
}

[CompetitionConfigure] ========== UPDATE STAGE 1 ==========
[CompetitionConfigure] Updates for stage 1: {
  field_figure_id: "uuid-B65"
}
[CompetitionConfigure] Stage 1 after update: {
  stage_number: 1,
  field_figure_id: "uuid-B65",
  distance_m: 100,
  clicks: 8
}
```

**HVA Å SJEKKE:**
- Når du velger B65 på hold 1, logger det riktig UUID?
- Når du velger Stripe 30/10 på hold 2, logger det riktig UUID?
- Er UUID forskjellig for hold 1 og hold 2?

---

### 4. CONFIGURE - NÅR DU LAGRER

**Når:** Du trykker "Lagre konfigurasjon"  
**Logger:** Hva som sendes til database

```
[CompetitionConfigure] ========== SAVING STAGES ==========
[CompetitionConfigure] Stage 1 (stage_number=1): {
  field_figure_id: "uuid-B65",
  figure_code: "B65",
  figure_name: "Grovfelt stående 65cm",
  distance_m: 100,
  clicks: 8
}
[CompetitionConfigure] Stage 2 (stage_number=2): {
  field_figure_id: "uuid-stripe",
  figure_code: "S30/10",
  figure_name: "Stripe 30/10",
  distance_m: 150,
  clicks: 12
}
```

**HVA Å SJEKKE:**
- Er field_figure_id forskjellig for stage 1 og stage 2?
- Stemmer figure_code med det du valgte?
- Hvis begge viser samme UUID → bug i save-logikk

---

### 5. RUN - LASTING FRA DATABASE

**Når:** Du åpner Run-siden  
**Logger:** Hva som faktisk ligger i database

```
[CompetitionRun] ========== STAGES FROM DATABASE ==========
[CompetitionRun] Total stages: 2
[CompetitionRun] Stage 1: {
  id: "...",
  stage_number: 1,
  field_figure_id: "uuid-B65",
  distance_m: 100,
  clicks: 8,
  clicks_to_zero: 8
}
[CompetitionRun] Stage 2: {
  id: "...",
  stage_number: 2,
  field_figure_id: "uuid-stripe",
  distance_m: 150,
  clicks: 12,
  clicks_to_zero: 12
}

[CompetitionRun] ========== FIGURES FROM DATABASE ==========
[CompetitionRun] Total figures: 15
[CompetitionRun] Figure: {
  id: "uuid-B65",
  code: "B65",
  name: "Grovfelt stående 65cm"
}
[CompetitionRun] Figure: {
  id: "uuid-C35",
  code: "C35",
  name: "Grovfelt sirkel 35cm"
}
... (flere figurer)
```

**HVA Å SJEKKE:**
- Stemmer field_figure_id fra stages med det du lagret i Configure?
- Er field_figure_id forskjellig for stage 1 og stage 2?
- Hvis like → problemet skjedde i database save
- Hvis forskjellige men feil → problem i Configure

---

### 6. RUN - MAPPING TIL CURRENTSTAGE

**Når:** Run bestemmer hvilket hold som skal vises  
**Logger:** Hvilken stage som matches med current_stage_number

```
[CompetitionRun] ========== FINDING CURRENT STAGE ==========
[CompetitionRun] entry.current_stage_number: 1
[CompetitionRun] Available stages: [1, 2]

[CompetitionRun] currentStage found: true
[CompetitionRun] currentStage details: {
  id: "...",
  stage_number: 1,
  field_figure_id: "uuid-B65"
}
```

**HVA Å SJEKKE:**
- Matcher entry.current_stage_number med riktig hold (1 for første hold, 2 for andre)?
- Er field_figure_id riktig for dette holdet?

---

### 7. RUN - FIGURE LOOKUP

**Når:** Run matcher field_figure_id med faktisk figure-objekt  
**Logger:** Hvilken figur som ble funnet

```
[CompetitionRun] currentFigure found: true
[CompetitionRun] ========== FIGURE MAPPING ==========
[CompetitionRun] Stage field_figure_id: "uuid-B65"
[CompetitionRun] Figure matched: {
  id: "uuid-B65",
  code: "B65",
  name: "Grovfelt stående 65cm",
  has_svg: true
}
[CompetitionRun] ⚠️ IF THIS IS WRONG, CHECK DB: What is field_figure_id in competition_stages?
```

**HVA Å SJEKKE:**
- Stemmer figure_code med forventet figur for dette holdet?
- Hvis feil → problem i figure lookup eller feil field_figure_id

---

### 8. RUN - PRE-HOLD RENDER

**Når:** HoldPreState vises (før du starter holdet)  
**Logger:** Hvilken stage og figure som faktisk rendres

```
[HoldPreState] ========== RENDERING PRE-HOLD ==========
[HoldPreState] Stage: {
  stage_number: 1,
  distance_m: 100,
  clicks: 8,
  field_figure_id: "uuid-B65"
}
[HoldPreState] Figure: {
  id: "uuid-B65",
  code: "B65",
  name: "Grovfelt stående 65cm",
  has_svg: true,
  has_image: false
}
[HoldPreState] Competition type: grovfelt
```

**HVA Å SJEKKE:**
- Stemmer figure.code med forventet figur?
- Hvis feil her men riktig i steg 7 → problem i component props

---

## TESTPROSEDYRE

### Steg 1: Configure

1. Gå til Configure for et grovfelt-stevne
2. **ÅPN CONSOLE FØR DU GJØR NOE**
3. Observer logg fra punkt 1 og 2 ovenfor
4. Velg B65 på hold 1
5. Observer logg fra punkt 3
6. Velg Stripe 30/10 på hold 2
7. Observer logg fra punkt 3
8. Trykk "Lagre konfigurasjon"
9. Observer logg fra punkt 4
10. **KOPIER ALL CONSOLE OUTPUT**

### Steg 2: Run Hold 1

1. Gå til Run
2. **ÅPN CONSOLE FØR DU STARTER**
3. Observer logg fra punkt 5, 6, 7, 8
4. **KOPIER ALL CONSOLE OUTPUT**
5. Ta screenshot av figur som vises
6. Noter: Er det B65 eller C35?

### Steg 3: Run Hold 2

1. Start hold 1, la det gå ut (eller avbryt)
2. Gå til hold 2
3. Observer logg fra punkt 6, 7, 8
4. **KOPIER ALL CONSOLE OUTPUT**
5. Ta screenshot av figur som vises
6. Noter: Er det Stripe 30/10 eller C35?

---

## MULIGE FEILSCENARIER

### Scenario A: Begge hold har samme UUID i Configure save
```
[CompetitionConfigure] Stage 1: field_figure_id: "uuid-C35"
[CompetitionConfigure] Stage 2: field_figure_id: "uuid-C35"  ← SAMME!
```
**Diagnose:** Bug i updateStage eller save-logikk  
**Fix:** Hold 2 overskriver hold 1, eller stages-array er korrupt

---

### Scenario B: UUID er forskjellig i Configure, men like i DB
```
[CompetitionConfigure] SAVING:
  Stage 1: field_figure_id: "uuid-B65"
  Stage 2: field_figure_id: "uuid-stripe"

[CompetitionRun] STAGES FROM DATABASE:
  Stage 1: field_figure_id: "uuid-C35"  ← FEIL!
  Stage 2: field_figure_id: "uuid-C35"  ← FEIL!
```
**Diagnose:** Database save feilet eller benytter feil data  
**Fix:** Sjekk stagesToInsert array eller DB constraints

---

### Scenario C: UUID er riktig i DB, men mapping feiler
```
[CompetitionRun] Stage 1: field_figure_id: "uuid-B65"  ← OK
[CompetitionRun] Figure matched: code: "C35"  ← FEIL!
```
**Diagnose:** Figure lookup matcher feil ID  
**Fix:** Sjekk figures.find() logikk

---

### Scenario D: Mapping er riktig, men feil stage brukes
```
[CompetitionRun] entry.current_stage_number: 2
[CompetitionRun] currentStage: stage_number: 1  ← FEIL!
```
**Diagnose:** stages.find() bruker feil kriterium  
**Fix:** Sjekk stage_number matching

---

## RAPPORTERING

Send meg:

1. **Console output fra Configure:**
   - Fra du åpner siden til etter lagring
   - Alle 4 logging-punkter

2. **Console output fra Run hold 1:**
   - Fra du åpner Run til hold starter
   - Alle 4 logging-punkter

3. **Console output fra Run hold 2:**
   - Når du går til hold 2
   - Samme 4 logging-punkter

4. **Screenshots:**
   - Configure med valgte figurer
   - Run hold 1 figur
   - Run hold 2 figur

5. **Sammendrag:**
   ```
   Hold 1:
   - Expected: B65
   - Configure saved: [UUID fra logg]
   - DB loaded: [UUID fra logg]
   - Figure matched: [code fra logg]
   - UI showed: [fra screenshot]

   Hold 2:
   - Expected: Stripe 30/10
   - Configure saved: [UUID fra logg]
   - DB loaded: [UUID fra logg]
   - Figure matched: [code fra logg]
   - UI showed: [fra screenshot]
   ```

Med dette kan jeg identifisere nøyaktig HVOR problemet er.
