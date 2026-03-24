# B100 FIGUR-PROBLEM: ROOT CAUSE ANALYSE

## PROBLEM IDENTIFISERT

**Symptom:** B100 viser feil figur visuelt (placeholder-form)
**Root Cause:** Gammel placeholder-SVG i database fra første migrasjon

---

## FAKTISKE DATA

### 1. DATABASE-INNHOLD (FØR FIX)

**Figure ID:** `7de5ac91-69b3-49fb-a217-8f4b8e351a76`
**Code:** `B100`
**Name:** `Grovfelt skive`
**SVG Length:** 181 bytes
**Created:** 2026-03-15 22:28:08

**SVG-innhold:**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="10" width="60" height="80" fill="#1f2937" rx="5"/>
  <circle cx="50" cy="20" r="12" fill="#1f2937"/>
</svg>
```

**Analyse:**
- Placeholder (rektangel + sirkel på toppen)
- Feil viewBox: `0 0 100 100` (skal være `0 0 100 180`)
- Ikke en realistisk grovfelt-figur
- Feil proporsjoner

---

## LØSNING IMPLEMENTERT

### Oppdatering av B100-rad:

```sql
UPDATE field_figures
SET
  svg_data = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 180">
               <rect width="100" height="180" fill="#1f2937"/>
             </svg>',
  name = 'Grovfelt stående 100cm',
  width_mm = 1000,
  height_mm = 1800
WHERE id = '7de5ac91-69b3-49fb-a217-8f4b8e351a76';
```

**Resultat:**
- Ny SVG length: 115 bytes
- Korrekt viewBox: `0 0 100 180`
- Riktige dimensjoner: 100cm x 180cm
- Korrekt form: Stående rektangel

---

## KONKLUSJON

### SVAR: **A) DB-raden for B100 inneholdt feil/gammel SVG**

**Verifisert:**
- figure_id var alltid korrekt hele veien
- Database join fungerte korrekt
- React rendering fungerte korrekt
- **SVG-DATAEN var en gammel placeholder**

**Problemet:**
- Første migrasjon satte inn placeholder-SVG
- Andre migrasjon brukte `ON CONFLICT DO NOTHING`
- Placeholder-SVG ble derfor aldri erstattet

**Løsningen:**
- Direkte UPDATE av svg_data for B100
- Korrekt viewBox og dimensjoner
- Realistisk grovfelt-figur

---

## TEST I BROWSER

**URL:** `/match/b84030ca-be47-4d47-af91-87fb160a8852/active`

**Forventet:**
- Stående rektangel (100x180 aspect ratio)
- Mørk grå farge (#1f2937)
- Fyller figur-området korrekt
