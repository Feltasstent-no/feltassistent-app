# OPPRYDDING AV GAMLE STEVNER

**Dato:** 2026-03-20

---

## STEVNER I DATABASEN

### Nyere test-stevner (2026-03-19):

| Navn | Type | Entries | Status | Formål |
|------|------|---------|--------|--------|
| FASE 3B VERIFIKASJONSTEST | grovfelt | 2 | 1 completed, 1 in_progress | Test-stevne |
| FASE 2 TEST - Finfelt | finfelt | 1 | 1 not_started | Test-stevne |
| FASE 2 TEST - Grovfelt | grovfelt | 2 | 1 in_progress, 1 not_started | Test-stevne |
| Test Finfelt | finfelt | 0 | - | Test-stevne |
| Test Grovfelt | grovfelt | 0 | - | Test-stevne |

### Eldre stevner (2026-03-15/16):

| Navn | Type | Entries | Status | Formål |
|------|------|---------|--------|--------|
| Grovfelt stevne | grovfelt | 0 | - | Test-stevne |
| Grovfelt Klipa | grovfelt | 0 | - | Test-stevne |
| Feltkarusell 2026 (2x) | grovfelt | 0 | - | Duplikat test-stevner |

**Totalt:** 9 stevner, hvorav 8 er test-stevner

---

## ANBEFALING

### Slettes trygt (5 stevner):
- Test Finfelt (0 entries)
- Test Grovfelt (0 entries)
- Grovfelt stevne (0 entries)
- Grovfelt Klipa (0 entries)
- Feltkarusell 2026 x2 (0 entries, duplikat)

### Beholdes for testing (3 stevner):
- FASE 3B VERIFIKASJONSTEST (har 2 entries, brukes for testing)
- FASE 2 TEST - Finfelt (har 1 entry)
- FASE 2 TEST - Grovfelt (har 2 entries)

### Rydder også:
- 1 completed entry i FASE 3B (kan slettes etter testing)

---

## STATUS: SLETTEKNAPP I UI

### CompetitionSummary.tsx (Entry-sletting):
✅ **Sletteknapp finnes allerede**
- Linje 202-222: MoreVertical meny med "Slett deltakelse"
- Bruker `deleteCompetitionEntry()` fra deletion-service
- Fungerer for entries

### Competitions.tsx (Competition-sletting):
❌ **Sletteknapp mangler**
- Ingen UI for å slette hele competitions
- `deleteCompetition()` finnes i deletion-service men brukes ikke

---

## LØSNING

### 1. Legg til sletteknapp i Competitions.tsx
For competitions uten entries kan vi tilby sletting direkte fra listen.

### 2. Manuel cleanup for gamle test-stevner
Slett de 5 stevnene uten entries via SQL.

### 3. Verifiser sletting i UI
Test at både entry-sletting og competition-sletting fungerer.
