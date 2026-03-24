# UI VERIFICATION CHECKLIST
**Dato:** 2026-03-20
**Formål:** Verifisere alle UI-fikser i faktisk browser

---

## FØR DU STARTER

1. Åpne http://localhost:5173
2. Logg inn
3. Ha browser console åpen (F12) for å se debug logging
4. Test på mobil-viewport (375px bredde) i Chrome DevTools

---

## TEST 1: SLETTEKNAPP PÅ SUMMARY ✅/❌

### Steg:
1. Gå til /competitions
2. Hvis du ikke har fullført stevne: Opprett og fullfør et kort stevne (1 hold)
3. Klikk på det fullførte stevnet
4. Gå til summary-siden
5. **Scroll helt til bunnen**

### Forventet:
```
┌────────────────────────────────────┐
│                                    │
│  [Stevne detaljer her...]          │
│                                    │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐  │
│  │  🗑️  Slett denne deltakelsen │  │ <- Full bredde, RØD
│  └──────────────────────────────┘  │
│  Dette vil slette alle notater...  │ <- Hjelpetekst
│                                    │
└────────────────────────────────────┘
```

### ✅ PASS hvis:
- Knappen er full bredde
- Knappen er tydelig rød
- Teksten er "Slett denne deltakelsen" (ikke bare "Slett deltakelse")
- Det er hjelpetekst under knappen
- Knappen er lett å se uten å lete

### ❌ FAIL hvis:
- Knappen er liten
- Knappen er i tre-prikker meny
- Knappen er vanskelig å finne
- Ingen hjelpetekst

### Screenshot:
- [ ] Ta screenshot av bunnen av summary-siden
- [ ] Legg merke til knapp-størrelse og synlighet

---

## TEST 2: RUN-VIEW MOBIL KOMPAKTHET ✅/❌

### Steg:
1. Sett viewport til 375px bredde (iPhone SE) i DevTools
2. Opprett nytt stevne (Finfelt, 1 hold, B100)
3. Start stevnet
4. Du er nå i pre-hold view
5. **Ta screenshot UTEN Å SCROLLE**
6. Klikk "Start hold"
7. Du er nå i running view (klokke teller)
8. **Ta screenshot UTEN Å SCROLLE**

### Forventet PRE-HOLD (før start):
```
┌─────────────────────┐  <- Topp av skjerm
│   Hold 1            │
│ [🎯] B100 Bane 100  │  <- Liten figur, horisontalt
│                     │
│ ┌─────────────────┐ │
│ │ Avstand: 100m   │ │
│ │ Stil opp: 5     │ │
│ └─────────────────┘ │
│                     │
│ [Start hold]        │  <- Knapp synlig
│                     │
└─────────────────────┘  <- Bunn av skjerm
```

### Forventet RUNNING (under kjøring):
```
┌─────────────────────┐  <- Topp av skjerm
│ [1] [🎯] B100       │  <- Veldig liten figur inline
│                     │
│      ⏱ 00:15        │  <- Stor klokke
│    ●●●●●●●●○○       │  <- Progress dots
│                     │
│ [Fullfør hold]      │  <- Knapp synlig
│                     │
└─────────────────────┘  <- Bunn av skjerm
```

### ✅ PASS hvis:
- **PRE-HOLD:** Figur, info, og knapp er alle synlige uten scrolling
- **RUNNING:** Hold-nummer, figur-code, klokke, og knapp er alle synlige uten scrolling
- Figuren er LITEN (ikke dominerer skjermen)
- Alt er innenfor viewport på 375px høyde

### ❌ FAIL hvis:
- Du må scrolle for å se "Start hold" / "Fullfør hold" knappen
- Figuren er stor og tar mye plass
- Klokken er ikke synlig
- Du må scrolle for å se viktig info

### Screenshot:
- [ ] Screenshot av pre-hold på 375px viewport (ALT synlig)
- [ ] Screenshot av running på 375px viewport (ALT synlig)

---

## TEST 3: RIKTIG FIGUR PÅ HOLD 1 OG 2 ✅/❌

### Steg:
1. Opprett nytt stevne (Finfelt, 3 hold)
2. Hold 1: Velg **B100**
3. Hold 2: Velg **B105** (viktig: ANNEN figur)
4. Hold 3: Velg **B110** (viktig: TREDJE figur)
5. Start stevnet
6. Åpne browser console (F12)

### I console, se etter:
```
[CompetitionRun] ALL STAGES: [
  { stage_number: 1, field_figure_id: "...", figure_code: "B100" },
  { stage_number: 2, field_figure_id: "...", figure_code: "B105" },
  { stage_number: 3, field_figure_id: "...", figure_code: "B110" }
]
```

### Steg (fortsettelse):
7. Du er nå på hold 1
8. **Ta screenshot av pre-hold view** - se at figuren viser B100
9. I console, se etter:
   ```
   [CompetitionRun] Current Stage: {
     stage_number: 1,
     figure_found: { code: "B100", ... }
   }
   ```
10. Start hold 1, la tiden gå ut eller fullfør
11. Klikk "Neste hold"
12. Du er nå på hold 2
13. **Ta screenshot av pre-hold view** - se at figuren viser B105
14. I console, se etter:
    ```
    [CompetitionRun] Current Stage: {
      stage_number: 2,
      figure_found: { code: "B105", ... }
    }
    ```

### ✅ PASS hvis:
- Console ALL STAGES viser: B100, B105, B110
- Hold 1 screenshot viser B100 figur OG tekst "B100"
- Hold 2 screenshot viser B105 figur OG tekst "B105"
- Console logging for hold 1 sier "B100"
- Console logging for hold 2 sier "B105"
- Figuren på skjermen matcher console logging

### ❌ FAIL hvis:
- Hold 2 viser samme figur som hold 1
- Hold 2 viser feil figur (ikke B105)
- Console sier én ting, skjermen viser noe annet
- Console ALL STAGES viser feil figure_code

### Screenshot:
- [ ] Console output med ALL STAGES
- [ ] Hold 1 pre-hold (viser B100)
- [ ] Console output Current Stage for hold 1
- [ ] Hold 2 pre-hold (viser B105)
- [ ] Console output Current Stage for hold 2

### Hvis FAIL:
Rapporter:
- Hva console ALL STAGES viser
- Hva console Current Stage viser for hold 2
- Hva skjermen faktisk viser
- Ta screenshot av både console og UI

---

## TEST 4: SISTE HOLD STUCK STATE ✅/❌

### Steg:
1. Opprett nytt stevne (Finfelt, 3 hold, korte tider)
2. Fullfør hold 1 og 2
3. Start hold 3 (siste)
4. **La tiden gå helt ut** (ikke fullfør manuelt)
5. Åpne browser console

### I console, se etter:
```
[CompetitionRun] post_hold state: {
  current_stage: 3,
  total_stages: 3,
  isLastStage: true
}
```

### Steg (fortsettelse):
6. **Ta screenshot av post-hold view**
7. Se etter knapp tekst

### Forventet UI:
```
┌────────────────────────────┐
│  ✅ Hold 3 ferdig           │
│  Tid ute                   │
│                            │
│  [Last opp bilde] (opt)    │
│  [Legg til notater] (opt)  │
│                            │
│  ┌──────────────────────┐  │
│  │ ✓ Avslutt stevne     │  │  <- GRØNN knapp
│  └──────────────────────┘  │
│                            │
└────────────────────────────┘
```

**VIKTIG:** Knappen skal si **"Avslutt stevne"**, IKKE "Neste hold"

### Steg (fortsettelse):
8. Klikk "Avslutt stevne"
9. I console, se etter:
   ```
   [CompetitionRun] handleFinish called {
     current_stage: 3,
     total_stages: 3,
     entryId: "..."
   }
   ```
10. **Vent 2 sekunder**
11. **Verifiser at du er på summary-siden**

### ✅ PASS hvis:
- Console viser `isLastStage: true`
- Knappen sier "Avslutt stevne" (IKKE "Neste hold")
- Når du klikker, console logger `handleFinish called`
- Appen navigerer til summary-siden (/competitions/entry/{id}/summary)
- Du ser oppsummering av alle 3 hold
- Appen låser seg IKKE

### ❌ FAIL hvis:
- Knappen sier "Neste hold"
- Console viser `isLastStage: false`
- Når du klikker, ingenting skjer
- Appen forblir på samme side
- Appen fryser/låser seg
- Du må refreshe for å komme videre

### Screenshot:
- [ ] Console output med `post_hold state` og `isLastStage: true`
- [ ] Post-hold view på siste hold (viser "Avslutt stevne")
- [ ] Console output med `handleFinish called`
- [ ] Summary-siden etter klikk (viser oppsummering)

### Hvis FAIL:
Rapporter:
- Hva console viser for isLastStage
- Hva knappen faktisk sier
- Om console logger handleFinish
- Om navigation skjer
- Ta screenshot av stuck state

---

## OPPSUMMERING

Fyll ut:

| Test | Pass/Fail | Notater |
|------|-----------|---------|
| 1. Sletteknapp synlig | ⬜ | |
| 2a. Pre-hold kompakt | ⬜ | |
| 2b. Running kompakt | ⬜ | |
| 3a. Hold 1 riktig figur | ⬜ | |
| 3b. Hold 2 riktig figur | ⬜ | |
| 4a. Siste hold viser "Avslutt" | ⬜ | |
| 4b. Navigerer til summary | ⬜ | |

**Totalt:** ___ / 7 PASS

---

## HVIS NOEN TESTER FEILER

For hver feilende test, rapporter:

1. **Hva console viser** (copy/paste)
2. **Screenshot av UI**
3. **Screenshot av console**
4. **Beskrivelse av hva som er feil**

Eksempel:
```
TEST 3b FAILED: Hold 2 viser feil figur

Console viser:
[CompetitionRun] Current Stage: {
  stage_number: 2,
  figure_found: { code: "B100", ... }  <- Skulle vært B105!
}

UI viser:
- Hold 2 heading
- B100 figur (feil!)
- "B100" tekst (feil!)

Konklusjon:
Hold 2 viser samme figur som hold 1. field_figure_id i database
er sannsynligvis feil for hold 2.
```

---

## VIKTIG

**Ikke rapporter "fikset" før alle 7 tester er PASS!**

Jeg trenger konkrete screenshots og console output for å verifisere.
