# FIGUR-DEBUG TEST - ENDE-TIL-ENDE

## Test-scenario: Grovfelt med figur "B100"

### Steg 1: Opprett nytt stevne
1. Gå til `/match`
2. Klikk "Nytt stevne"
3. Velg grovfelt
4. Opprett stevne

### Steg 2: Configure - Velg figur B100
1. Gå til configure
2. Hold 1 → Velg figur "B100" (Grovfelt skive)
3. Sett avstand 150m

**Forventet i DB:**
```sql
SELECT id, field_figure_id, distance_m
FROM match_holds
WHERE match_session_id = '<session_id>' AND order_index = 0;

-- Skal returnere:
-- field_figure_id: '7de5ac91-69b3-49fb-a217-8f4b8e351a76' (B100)
-- distance_m: 150
```

### Steg 3: Start stevne
1. Klikk "Start stevne"
2. Gå til run-view

**Forventet i console:**
```
[getCurrentHold] Raw data from DB: {
  sessionId: '<session_id>',
  holdIndex: 0,
  field_figure_id: '7de5ac91-69b3-49fb-a217-8f4b8e351a76',
  field_figure: {
    id: '7de5ac91-69b3-49fb-a217-8f4b8e351a76',
    name: 'Grovfelt skive',
    code: 'B100',
    short_code: 'B100',
    svg_data: '<svg>...</svg>',
    category: 'grovfelt'
  },
  field_figure_name: 'Grovfelt skive',
  field_figure_code: 'B100'
}
```

**Forventet i ActiveHoldScreen:**
```
[ActiveHoldScreen] Hold data: {
  hold_id: '<hold_id>',
  field_figure_id: '7de5ac91-69b3-49fb-a217-8f4b8e351a76',
  field_figure: {
    id: '7de5ac91-69b3-49fb-a217-8f4b8e351a76',
    name: 'Grovfelt skive',
    code: 'B100',
    ...
  },
  field_figure_name: 'Grovfelt skive',
  field_figure_code: 'B100',
  has_svg_data: true
}
```

**Forventet i FieldFigure:**
```
[FieldFigure] Rendering: {
  figure_name: 'Grovfelt skive',
  figure_code: 'B100',
  has_svg_data: true,
  svg_length: <number>
}
```

### Steg 4: Verifiser UI
**Skal vise:**
- Figurnavn: "Grovfelt skive"
- SVG-rendering av B100-figuren
- Ikke "Figur mangler" feilmelding

---

## Test-scenario 2: Finfelt med figur "1/10"

### Figur-ID for 1/10
```
id: '2134d15b-f48e-4580-8cc2-cb44dca0e332'
name: 'Finfelt skive'
code: '1/10'
short_code: '1/10'
category: 'finfelt'
```

### Test-flow
1. Opprett finfelt-stevne
2. Configure → Velg figur "1/10"
3. Start stevne
4. Verifiser console logs viser riktig figur-ID
5. Verifiser UI viser "Finfelt skive" med 1/10 SVG

---

## Debugging Checklist

Hvis feil figur vises:

1. **DB-lagring:**
   ```sql
   SELECT mh.id, mh.field_figure_id, ff.name, ff.code
   FROM match_holds mh
   LEFT JOIN field_figures ff ON ff.id = mh.field_figure_id
   WHERE mh.match_session_id = '<session_id>';
   ```
   → Sjekk at field_figure_id er riktig

2. **getCurrentHold() console log:**
   → Sjekk at field_figure-objektet returneres fra joinen

3. **ActiveHoldScreen console log:**
   → Sjekk at hold.field_figure inneholder riktig data

4. **FieldFigure console log:**
   → Sjekk at figure.svg_data finnes
   → Sjekk at svg_length > 0

5. **Feil SVG rendres:**
   → Sjekk om det finnes duplikat figurer i DB
   → Sjekk om svg_data inneholder riktig SVG-kode

---

## Forventet Resultat

**Før start:**
- Configure viser figur-preview korrekt

**Under run:**
- Samme figur vises i run-view
- Ingen fallback til annen figur
- Console logs matcher forventet output

**Hvis figur mangler:**
- Rød "Figur mangler" feilmelding
- "Start klokke" er disabled
- Console log viser `field_figure: null`
