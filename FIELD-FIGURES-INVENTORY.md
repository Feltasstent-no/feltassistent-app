# FIELD FIGURES DATABASE INVENTARISERING

**Dato:** 2026-03-20
**Formål:** Fullstendig kartlegging før total opprydding

---

## PROBLEM IDENTIFISERT

**Forrige oppryddingsforsøk feilet:** 
- UPDATE-statement satte `svg_content = svg_data` ETTER CASE-statement
- Dette resulterte i at svg_data IKKE ble oppdatert
- Alle "oppdaterte" figurer har fortsatt `<svg></svg>` (11 bytes)

**Bevis:**
```sql
1/10:  svg_data = '<svg></svg>' (11 bytes)
C15:   svg_data = '<svg></svg>' (11 bytes)  
Hjul:  svg_data = '<svg></svg>' (11 bytes)
B100:  svg_data = korrekt (115 bytes) ✅
```

---

## FULLSTENDIG INVENTAR: ALLE 34 FIGURER

### KRITISKE FIGURER MED TOM SVG (13 figurer)

**Aktive figurer med <svg></svg> (11 bytes) - I BRUK:**

| Code | ID | Refs (holds) | Refs (stages) | Total | Status |
|------|-----|--------------|---------------|-------|--------|
| 1/10 | 2134d15b... | 6 | 2 | 8 | ❌ TOM SVG |
| C15 | 5f299c6f... | 2 | 0 | 2 | ❌ TOM SVG |
| Hjul | ab340e92... | 5 | 1 | 6 | ❌ TOM SVG |
| Mini-1/3 | 220505b9... | 0 | 0 | 0 | ❌ TOM SVG |
| Mini-1/4 | c39182e1... | 3 | 2 | 5 | ❌ TOM SVG |
| Minismåen | 78b572ec... | 3 | 0 | 3 | ❌ TOM SVG |
| Prisme | f2711e04... | 1 | 0 | 1 | ❌ TOM SVG |
| Sirkel Finfelt | 0ca140ac... | 1 | 0 | 1 | ❌ TOM SVG |
| Stripe finfelt | 731aa16b... | 1 | 0 | 1 | ❌ TOM SVG |
| Tønne finfelt | a98757c8... | 3 | 0 | 3 | ❌ TOM SVG |

**Inaktive figurer med tom SVG:**

| Code | ID | Refs (holds) | Refs (stages) | Total | Status |
|------|-----|--------------|---------------|-------|--------|
| 1/6 | 907ada57... | 0 | 1 | 1 | ❌ TOM SVG (inactive) |
| 1/8 | 8a32c9e5... | 4 | 1 | 5 | ❌ TOM SVG (inactive) |

**TOTALT:** 12 figurer med tom SVG og referanser som må fikses!

---

### FINFELT_XXX FIGURER (3 figurer) - SKAL SLETTES

Disse er IKKE laget av oss og skal fjernes:

| Code | ID | Refs (holds) | Refs (stages) | SVG Size | Status |
|------|-----|--------------|---------------|----------|--------|
| FINFELT_100 | 4709d071... | 1 | 0 | 437 bytes | ⚠️ SLETT |
| FINFELT_150 | 5a60c1df... | 1 | 0 | 436 bytes | ⚠️ SLETT |
| FINFELT_200 | f00478a7... | 0 | 0 | 436 bytes | ⚠️ SLETT |

**Blokkeres av:** 2 match_holds referanser

---

### OK FIGURER (18 figurer)

Disse har korrekt SVG og kan beholdes som er:

**Grovfelt (OK):**
- 1/3, 1/4, 1/4V: 210 bytes ✅
- C20, C25, C30, C35, C40, C50: 270-271 bytes ✅
- Småen: 193 bytes ✅
- Stripe-13/40, Stripe-30/10: 217-219 bytes ✅
- Tønne: 417 bytes ✅

**B-serie (Simple men korrekt):**
- B100, B65, B45: 111-115 bytes ⚠️ (korrekt proporsjon)

**Grovfelt små:**
- S-25H, S-25V: 134 bytes ⚠️

**Inaktiv (OK SVG men unused):**
- Sirkel (grovfelt): 271 bytes, 0 refs, inactive ✅

---

## REFERANSE-ANALYSE

### Tabeller som peker til field_figures:
1. **match_holds** - 52 referanser totalt
2. **competition_stages** - 13 referanser totalt  
3. **shot_logs** - 0 referanser ✅

### Figurer med flest referanser:
1. **C35** - 15 refs (13 holds + 2 stages)
2. **1/10** - 8 refs (6 holds + 2 stages) ❌ TOM SVG
3. **Stripe-30/10** - 7 refs (7 holds)
4. **B100** - 6 refs (5 holds + 1 stage)
5. **Hjul** - 6 refs (5 holds + 1 stage) ❌ TOM SVG

**KRITISK:** 2 av top-5 mest brukte figurer har TOM SVG!

---

## OPPRYDDINGSPLAN

### STEG 1: RETT FIGURER MED TOM SVG (12 figurer)

**Må fikses riktig denne gangen:**
- 1/10, C15, Hjul, Mini-1/3, Mini-1/4, Minismåen, Prisme
- Sirkel Finfelt, Stripe finfelt, Tønne finfelt
- 1/6, 1/8 (inactive men har refs)

**Metode:** Direkte UPDATE med korrekt SQL (ikke CASE som refererer svg_data i samme statement)

### STEG 2: MIGRER FINFELT_XXX REFERANSER

**Finn mapping:**
- FINFELT_100 → til hvilken figur?
- FINFELT_150 → til hvilken figur?

**Utfør:**
- UPDATE match_holds SET field_figure_id = ny_id WHERE field_figure_id = gammel_id

### STEG 3: SLETT FINFELT_XXX FIGURER

Når alle refs er migrert:
- DELETE FROM field_figures WHERE code IN ('FINFELT_100', 'FINFELT_150', 'FINFELT_200')

### STEG 4: FIKSE APP-KODE

**Sjekk at alle disse kun bruker aktive figurer:**
1. CompetitionConfigure.tsx
2. CompetitionRun.tsx
3. MatchConfigure.tsx
4. MatchActive.tsx
5. ShotAssistant.tsx (Kneppassistent)
6. AdminFieldFigures.tsx

**Ingen fallback, ingen default SVG.**

---

## FORVENTET SLUTTRESULTAT

**Totalt figurer:** 31 (slett 3)
**Aktive figurer:** 29 (deaktiver 1/6, 1/8 hvis ingen refs, eller fikse SVG)
**Figurer med tom SVG:** 0 ❌
**Figurer med korrekt SVG:** 31 ✅

---

## NESTE AKSJON

1. Rett UPDATE-statement for å faktisk oppdatere svg_data
2. Verifiser at alle 12 figurer nå har >100 bytes SVG
3. Identifiser mapping for FINFELT_XXX
4. Migrer referanser
5. Slett FINFELT_XXX
6. Verifiser i alle UI-flater

---

**Status:** INVENTAR FULLFØRT
**Klar for:** OPPRYDDING
