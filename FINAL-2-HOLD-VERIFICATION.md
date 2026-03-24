# FINAL VERIFISERING - 2 HOLDS GROVFELT

## TESTCASE
- Hold 1 = C35
- Hold 2 = B65

---

## ✅ SJEKKLISTE

### 1. Configure - Visning

**Test:**
- Opprett nytt grovfelt-stevne med 2 hold
- Velg C35 på hold 1
- Velg B65 på hold 2

**Forventet:**
- [ ] Hold 1 viser "C35" i dropdown
- [ ] Hold 2 viser "B65" i dropdown
- [ ] Begge hold viser riktig figur-preview/navn
- [ ] "Lagre konfigurasjon" button fungerer

**Console Check:**
```
[StageConfigCard] Hold 1 selected: { figure_code: "C35" }
[StageConfigCard] Hold 2 selected: { figure_code: "B65" }
```

---

### 2. Run - Hold 1 (C35)

**Test:**
- Gå til Run
- Observer pre-hold screen
- Trykk "Start hold"
- Observer figur under klokke

**Forventet:**
- [ ] Pre-hold viser C35 figur
- [ ] Pre-hold viser "C35" tekst
- [ ] Under klokke vises C35 figur
- [ ] Timer starter og teller ned fra 15

**Console Check:**
```
[HoldPreState] Stage: { stage_number: 1, field_figure_id: "..." }
[HoldPreState] Figure: { code: "C35" }
[FieldClockDisplay] Figure: { code: "C35" }
```

---

### 3. Run - Hold 2 (B65)

**Test:**
- La hold 1 timeout eller trykk "Neste hold"
- Observer post-hold screen for hold 1
- Trykk "Neste hold"
- Observer pre-hold screen for hold 2
- Trykk "Start hold"
- Observer figur under klokke

**Forventet:**
- [ ] Post-hold hold 1 viser "Hold 1 ferdig"
- [ ] Pre-hold hold 2 viser B65 figur
- [ ] Pre-hold hold 2 viser "B65" tekst
- [ ] Under klokke vises B65 figur (IKKE C35!)
- [ ] Timer starter og teller ned fra 15

**Console Check:**
```
[HoldPreState] Stage: { stage_number: 2, field_figure_id: "..." }
[HoldPreState] Figure: { code: "B65" }
[FieldClockDisplay] Figure: { code: "B65" }
```

---

### 4. Timeout på Hold 2 - Avslutning

**Test:**
- La hold 2 timer gå ut (eller vent 15 sekunder)
- Observer hva som skjer

**Forventet:**
- [ ] Timer når 0
- [ ] "TID UTE" vises
- [ ] Post-hold screen vises automatisk
- [ ] Post-hold viser "Hold 2 ferdig"
- [ ] Knapp viser "AVSLUTT STEVNE" (grønn, ikke blå)
- [ ] Ingen freeze/hang

**Console Check:**
```
[FieldClockDisplay] ========== TIMEOUT REACHED ==========
[FieldClockDisplay] Calling onTimeUp handler
[TIMEOUT] ========== TIMEOUT REACHED ==========
[TIMEOUT] Is last stage: true
[HoldPostState] ========== COMPONENT MOUNTED/RENDERED ==========
[HoldPostState] isLastStage: true
[HoldPostState] Button that WILL render: AVSLUTT STEVNE (green)
```

**Klikk "AVSLUTT STEVNE":**
- [ ] Navigerer til summary page
- [ ] Ingen error i console
- [ ] Summary page viser begge hold

---

## 🚨 FEIL SOM SKAL VÆRE FIKSET

### Figurmapping
- ~~Run viser samme figur på begge hold~~ → SKAL VÆRE FIKSET
- ~~Run viser feil figur (C35 når B65 forventet)~~ → SKAL VÆRE FIKSET
- ~~Fallback figur brukes isteden for valgt figur~~ → SKAL VÆRE FIKSET

### Timeout/Freeze
- ~~Timeout på siste hold freezer appen~~ → SKAL VÆRE FIKSET
- ~~onComplete() kaller setState under render~~ → SKAL VÆRE FIKSET
- ~~Timeout trigger ikke post-hold state~~ → SKAL VÆRE FIKSET

---

## 📊 RAPPORTERING

Hvis alt fungerer:
```
✅ Configure viser C35 og B65 korrekt
✅ Run hold 1 viser C35
✅ Run hold 2 viser B65
✅ Timeout på hold 2 går til avslutning
✅ Ingen freeze/hang
```

Hvis noe feiler:
```
❌ [Beskriv hva som feilet]
Console output: [Lim inn relevant logging]
Screenshot: [Hvis mulig]
```

---

## 🧹 NESTE STEG

Når alt er verifisert:
1. Fjern omfattende debug-logging
2. Behold minimal logging for kritiske punkter
3. Gå videre til neste feil/feature
