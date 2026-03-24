# FASE 3A - FUNKSJONELL VERIFISERINGSGUIDE

## TESTSCENARIOER

### ✅ Test 1: Upload til første hold

**Steg:**
1. Start et nytt Grovfelt-stevne (5 hold)
2. Start Hold 1
3. Vent til tiden går ut
4. Du skal se HoldPostState med:
   - ✓ Hold 1 ferdig
   - 📸 Gravlapp (valgfritt)
   - "Velg eller ta bilde" knapp
   - "Neste hold" knapp

**Utfør:**
```
Klikk "Velg eller ta bilde"
→ Velg en JPG/PNG fil
→ Vent på upload (1-3 sekunder)
```

**Forventet resultat:**
- ✅ Spinner/laster melding vises
- ✅ "Bilde lagret!" success melding dukker opp
- ✅ Thumbnail av bildet vises
- ✅ "Lagret" tekst med tidsstempel
- ✅ "Last opp nytt bilde" knapp vises
- ✅ Slett-knapp (rød X) vises i hjørnet

**Database verifisering:**
```sql
SELECT
  id,
  entry_id,
  stage_number,
  image_url,
  storage_path,
  uploaded_at
FROM competition_stage_images
WHERE stage_number = 1
ORDER BY created_at DESC
LIMIT 1;
```

**Forventet output:**
```
entry_id:      <din-entry-uuid>
stage_number:  1
image_url:     https://...supabase.co/storage/v1/object/public/target_images/entries/...
storage_path:  entries/<entry-uuid>/stage-1-<timestamp>.jpg
uploaded_at:   2026-03-19T...
```

---

### ✅ Test 2: Gå videre uten å laste opp

**Steg:**
1. Fra Test 1, klikk "Neste hold" UTEN å laste opp bilde
2. Hold 2 skal starte normalt

**Forventet resultat:**
- ✅ HoldPreState for Hold 2 vises umiddelbart
- ✅ Ingen feilmeldinger
- ✅ Ingen blokkering

**Database verifisering:**
```sql
SELECT COUNT(*) as image_count
FROM competition_stage_images
WHERE stage_number = 2;
```

**Forventet output:**
```
image_count: 0
```

---

### ✅ Test 3: Erstatt bilde på samme hold

**Steg:**
1. Fullfør Hold 2
2. Last opp et bilde (bilde_A.jpg)
3. Vent på "Bilde lagret!"
4. Noter storage_path fra første upload
5. Klikk "Last opp nytt bilde"
6. Velg et ANNET bilde (bilde_B.jpg)

**Forventet resultat:**
- ✅ Nytt bilde lastes opp
- ✅ Thumbnail oppdateres til bilde_B
- ✅ Nytt tidsstempel vises
- ✅ "Bilde lagret!" melding vises igjen

**Database verifisering:**
```sql
SELECT
  id,
  storage_path,
  image_url,
  uploaded_at
FROM competition_stage_images
WHERE stage_number = 2
ORDER BY uploaded_at DESC;
```

**Forventet output:**
```
Kun 1 rad (IKKE 2 rader!)
storage_path: entries/<entry-uuid>/stage-2-<NYT-timestamp>.jpg (IKKE det gamle)
uploaded_at:  <nyere tidspunkt>
```

**Storage verifisering:**
```
Den gamle filen (stage-2-<GAMMELT-timestamp>.jpg) skal IKKE lenger eksistere i storage.
Kun den nye filen skal finnes.
```

---

### ✅ Test 4: Vis eksisterende bilde igjen

**Viktig:** Denne testen verifiserer at bildet persisteres og vises senere.

**Steg:**
1. Fra Test 3, klikk "Neste hold" (til Hold 3)
2. Fullfør Hold 3
3. **IKKE** last opp bilde på Hold 3
4. Gå til neste hold (Hold 4)
5. Fullfør Hold 4
6. **Naviger bort** fra stevnet (tilbake til oversikt)
7. **Gå tilbake** til samme stevne
8. Fortsett til Hold 5
9. Fullfør Hold 5

**Forventet resultat på Hold 2 (når du kommer tilbake):**
- ✅ Thumbnail av bilde_B vises automatisk
- ✅ "Lagret" status vises
- ✅ Tidsstempel matcher database

**Forventet resultat på Hold 3, 4, 5:**
- ✅ "Velg eller ta bilde" knapp vises (ingen eksisterende bilde)

---

### ✅ Test 5: Feiltesting - upload feil filtype

**Steg:**
1. Fullfør et hold
2. Klikk "Velg eller ta bilde"
3. Velg en PDF eller TXT fil (ikke bilde)

**Forventet resultat:**
- ✅ Feilmelding: "Vennligst velg en bildefil"
- ✅ Ingen upload utføres
- ✅ "Neste hold" knapp fungerer fortsatt
- ✅ Ingen rad opprettet i database

---

### ✅ Test 6: Slett bilde

**Steg:**
1. Last opp bilde på et hold
2. Klikk den røde X-knappen (slett)
3. Bekreft at bildet forsvinner

**Forventet resultat:**
- ✅ Thumbnail forsvinner
- ✅ "Velg eller ta bilde" knapp vises igjen
- ✅ Ingen feilmelding

**Database verifisering:**
```sql
SELECT COUNT(*) as image_count
FROM competition_stage_images
WHERE stage_number = <hold-nummer>;
```

**Forventet output:**
```
image_count: 0
```

---

## KRITISKE VERIFISERINGER

### 1. Ett bilde per hold (UNIQUE constraint)

**Test:**
```sql
-- Forsøk å sette inn to bilder for samme (entry_id, stage_number)
INSERT INTO competition_stage_images (
  entry_id,
  stage_number,
  user_id,
  storage_path,
  image_url
) VALUES (
  '<entry-uuid>',
  1,
  '<user-uuid>',
  'test/path1.jpg',
  'http://test1.jpg'
);

-- Prøv igjen med samme entry_id og stage_number
INSERT INTO competition_stage_images (
  entry_id,
  stage_number,
  user_id,
  storage_path,
  image_url
) VALUES (
  '<entry-uuid>',
  1,
  '<user-uuid>',
  'test/path2.jpg',
  'http://test2.jpg'
);
```

**Forventet resultat:**
```
ERROR: duplicate key value violates unique constraint "unique_entry_stage_image"
```

### 2. Gammel fil slettes ved erstatning

**Verifiser i kode:**
```typescript
// HoldImageUpload.tsx:69-73
if (existingImage.storage_path) {
  await supabase.storage
    .from('target_images')
    .remove([existingImage.storage_path]);
}
```

**Manuell test:**
1. Last opp bilde → noter storage_path
2. Sjekk at filen finnes: `https://...supabase.co/storage/v1/object/public/target_images/<storage_path>`
3. Erstatt med nytt bilde
4. Prøv å aksessere gammel URL → skal gi 404

### 3. Navigation blokkeres ALDRI

**Verifiser i kode:**
```typescript
// HoldPostState.tsx:51-56
<HoldImageUpload ... />

{isLastStage ? (
  <button onClick={onFinish}>Avslutt stevne</button>
) : (
  <button onClick={onNextHold}>Neste hold</button>
)}
```

**Knappene er ALLTID rendret, uavhengig av upload-status.**

---

## SAMPLE DATABASE STATE

Etter fullført Grovfelt med bilder på hold 1, 2, og 4:

```sql
SELECT
  stage_number,
  substring(image_url from 1 for 50) as image_url_preview,
  uploaded_at
FROM competition_stage_images
WHERE entry_id = '<din-entry>'
ORDER BY stage_number;
```

**Forventet output:**
```
stage_number | image_url_preview                               | uploaded_at
-------------+-------------------------------------------------+-------------------
1            | https://xxx.supabase.co/storage/v1/object/...   | 2026-03-19 10:23:45
2            | https://xxx.supabase.co/storage/v1/object/...   | 2026-03-19 10:24:12
4            | https://xxx.supabase.co/storage/v1/object/...   | 2026-03-19 10:25:33

(3 rows)
```

Hold 3 og 5 har ingen bilder → ingen rader i tabellen.

---

## SUCCESS CRITERIA

- ✅ Bilde lastes opp og vises som thumbnail
- ✅ Nytt bilde erstatter gammelt (kun 1 rad per hold i database)
- ✅ Gammel storage-fil slettes ved erstatning
- ✅ "Neste hold" fungerer alltid (med eller uten bilde)
- ✅ Upload-feil blokkerer ikke navigasjon
- ✅ Bilde persisteres og vises igjen ved retur til stevne
- ✅ Slett-funksjon fungerer
- ✅ RLS policies hindrer tilgang til andres bilder

---

## FEILSITUASJONER SOM SKAL HÅNDTERES GRASIØST

1. **Nettverksfeil under upload:** Error melding vises, bruker kan prøve igjen eller gå videre
2. **Feil filtype:** Validering før upload, tydelig melding
3. **Storage fullt:** Error vises, bruker kan gå videre uten bilde
4. **Ugyldig entry_id:** Skal ikke skje (props fra parent), men RLS vil blokkere
5. **Session utløpt:** Supabase auth error, bruker må logge inn på nytt

Alle disse skal **ALDRI** blokkere "Neste hold" knappen.
