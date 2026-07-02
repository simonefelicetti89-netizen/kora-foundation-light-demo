# KORA Data Intake Studio — Technical Documentation

**Status:** Implemented — synthetic OP-001 preview **and** real tenant upload  
**Route:** `/admin/data-intake`  
**Auth:** KORA_ADMIN session only  
**Data:** Synthetic (OP-001, preview/demo) **or** real tenant data (real upload, real tenant code)  
**Scope:** Preview + real file upload/accept for real tenants; scoring recalculation happens separately in `/admin/uef-review`

> **Update:** real CSV/XLSX upload for real tenants was added after this
> document was first written and is documented end-to-end in
> `docs/GOLDEN_PATH_RUNBOOK.md` (Step 3) and `docs/PILOT_INTAKE_PROTOCOL.md`
> (Steps 4–5). The sections below describing the **OP-001 synthetic preview**
> flow (`GET /api/admin/data-intake/preview`) are still accurate for that
> specific, still-synthetic-only code path — they do not describe the whole
> `/admin/data-intake` route anymore.

---

## Scopo

Il KORA Data Intake Studio serve due scopi sulla stessa route `/admin/data-intake`:

1. **Preview didattico OP-001** (sintetico, invariato da questo documento):
   > Synthetic batch preview → PII Guard → Eligibility Gate → UEF Preview → Run Scoring → Decision Pack
2. **Upload reale per tenant reali** (aggiunto successivamente — vedi
   `docs/GOLDEN_PATH_RUNBOOK.md` Step 3): selezione tenant reale → upload
   CSV/XLSX → dry-run preview → conferma pseudonimizzazione → accept →
   generazione candidati UEF.

Il preview OP-001 aiuta a spiegare KORA in demo: "Il dato entra, viene controllato, normalizzato, trasformato in UEF, passa nel motore, produce risultati e genera Decision Pack" — senza toccare dati reali.

---

## OP-001: solo dati sintetici — nessun upload reale (per questo tenant)

Quanto segue si applica **solo alla selezione del tenant OP-001**, non alla route nel suo complesso:

- **Nessun `<input type="file">` nel percorso preview OP-001** — il preview endpoint (`GET /api/admin/data-intake/preview`) non ha form di upload, i record sono costruiti deterministicamente da `getOp001SyntheticRecords()`.
- **Nessuna scrittura DB** dal preview endpoint OP-001 — solo lettura read-only per il result snapshot.
- **Nessun dato reale in OP-001** — tutti i record sono sintetici, etichettati `syntheticData: true` e `notRealPeople: true`.

Per un **tenant reale** selezionato nella stessa UI, esistono invece form di
upload reali (`<input type="file" accept=".csv,.xlsx">`) e due route reali:
`POST /api/admin/data-intake/upload-preview` (dry-run, nessuna scrittura) e
`POST /api/admin/data-intake/accept` (persiste su `analytics.source_batch` e
`personal.uploaded_record`). **Gate 3B resta un prerequisito legale/privacy
per l'onboarding di dati reali di persone o aziende** — non blocca
tecnicamente l'upload, ma è un prerequisito di processo prima di usarlo con
un cliente reale.

---

## Sezioni UI

| Sezione | Contenuto |
|---|---|
| A. Header | Titolo, tenant OP-001, periodo, badge KORA_ADMIN, label Synthetic data |
| B. Flow timeline | 6 fasi con stato dinamico (Ready / Passed / Completed / Not run yet) |
| C. Synthetic batch preview | Tabella 6 record sintetici (nome iniziativa, categoria, tipo, partecipanti, eligibility) |
| D. PII Guard status | Checked / PII found / status / policy / nota tecnica |
| E. Eligibility Gate | Conteggi per stato + lista dettagliata per record con confidence e reason |
| F. UEF Preview | Totali + distribuzione categorie + tabella UEF records con approvals |
| G. Actions | Run operator flow · Read result · Decision Pack Preview · Download PDF |
| H. Result snapshot | KORA Index · Safeguard · Confidence · AR · MAR · Decision Pack status |
| I. Safety boundaries | Badge strip: No real data, No file upload, N≥10, PII Guard, KORA_ADMIN only |

---

## Come legge i dati OP-001

### Preview endpoint

`GET /api/admin/data-intake/preview?tenantCode=OP-001&reportingPeriod=2026-Q1`

**Nessuna scrittura DB. Nessun scoring. Nessuna duplicazione di logica.**

1. Chiama `getOp001SyntheticRecords('preview')` — 6 record deterministici (condivisi con operator-flow)
2. Chiama `classifyEligibilityBatch` da `lib/kora-engine/eligibility-gate.ts` — riusa il motore esistente
3. Chiama `detectPiiInPayload` + `summarizePiiFindings` da `lib/privacy/pii-guard.ts` — riusa il PII Guard esistente
4. Costruisce UEF preview dalla stessa logica di operator-flow (senza scrivere a DB)
5. Chiama `fetchPdfData` da `lib/decision-pack/pdf-data.ts` per il result snapshot (read-only da DB)

Il preview endpoint è protected da `requireKoraAdmin(request)`.

### Record condivisi

`lib/live/op001-synthetic-records.ts` esporta:
- `getOp001SyntheticRecords(batchId)` — usato da operator-flow (POST, scrive su DB) e dal preview (GET, read-only)
- `getOp001UploadedPayloads(tenantCode)` — usato da operator-flow e preview

Estrazione dalla funzione privata `buildDefaultRecords` che era in `operator-flow/route.ts`.

---

## Come mostra PII Guard

Il PII Guard viene eseguito lato server sui 10 payload sintetici (`PSY-OP-OP-001-001` … `-010`). I payload contengono solo `{ synthetic: true, tenant_code: "OP-001", row_index: N }` — nessun PII reale. Il risultato atteso è `piiFound: false, status: passed`.

La UI mostra:
- `checked: true` — il guard è stato eseguito
- `piiFound: false` — nessun PII rilevato nei payload sintetici
- `policy: review_required_plus_redaction` — policy attiva (Foundation Light)
- Nota esplicativa: PII Guard è un layer tecnico, non un sostituto per pseudonimizzazione all'origine

Nessun valore PII viene mai incluso nella risposta API o nei log.

---

## Come mostra Eligibility / UEF

**Eligibility Gate:** `classifyEligibilityBatch` viene richiamato con i 6 record sintetici. I risultati (eligible/limited/blocked/review_required) sono mostrati per record con confidence e reason. Nessuna logica nuova — riuso diretto del motore esistente.

**UEF Preview:** i `uefRows` sono costruiti con la stessa formula di operator-flow (senza persistere su DB). Mostra `approvedForScoring`, `approvedForBTI`, distribuzione categorie, impact treatment per record.

---

## Protezione KORA_ADMIN

- `/admin/data-intake` — Server Component con `requireKoraAdmin()`. No session → pagina access denied. Company user → pagina access denied.
- `/api/admin/data-intake/preview` — `requireKoraAdmin(request)` prima di qualsiasi operazione. No session → 401. Company user → 403.

Il rendering del client component avviene solo dopo che `requireKoraAdmin()` ha verificato la sessione lato server. Nessun dato viene passato se l'utente non è KORA_ADMIN.

---

## Limiti attuali

**Percorso OP-001 (preview sintetico):**
- Solo dati sintetici predefiniti — non personalizzabile, un solo batch fisso
- Nessun pillar mapping nel preview (il Pillar Mapper è un modulo separato non ancora integrato nel flow)
- Il result snapshot è read-only — per aggiornarlo bisogna usare "Run operator flow"

**Percorso tenant reale (upload):**
- L'upload reale esiste (`upload-preview` + `accept`) — vedi nota di aggiornamento in cima al documento
- Nessuna gestione batch multipli/storico/rollback in UI dedicata (vedi punto 8 sotto)

---

## Cosa manca per il data intake reale end-to-end

1. **Gate 3B chiuso** — legal/privacy review completa (ancora aperto)
2. ~~Upload form sicuro~~ — **implementato**: `DataIntakeStudio.tsx` ha upload CSV/XLSX reale con validazione, dry-run preview e conferma pseudonimizzazione
3. ~~CSV/XLSX parser server-side~~ — **implementato**: `upload-preview` (dry-run) + `accept` (persistenza), con PII guard prima di qualsiasi scrittura
4. **PII policy strict reject** — TODO-004 (attualmente `review_required`, non ancora verificato in questa revisione)
5. **Source pseudonymization pipeline** — pseudonimizzazione all'origine prima del caricamento (non ancora verificato in questa revisione)
6. **Consent worker check** — verifica consenso worker per ogni record (non ancora verificato in questa revisione)
7. **DPA e clausole contrattuali** — prerequisiti legali per dati reali (fuori ambito tecnico)
8. **Batch management UI** — gestione batch multipli, storico, rollback (non ancora verificato in questa revisione)

Items 4–6 e 8 non sono stati riverificati contro il codice in questa revisione
documentale (GOLDEN-04-DOCS, solo allineamento versioning/upload) — trattali
come stato all'ultima verifica nota, non come confermati aggiornati.

---

## File

| File | Ruolo |
|---|---|
| `app/admin/data-intake/page.tsx` | Server Component, `requireKoraAdmin()`, accesso negato o `DataIntakeStudio` |
| `app/admin/data-intake/_components/DataIntakeStudio.tsx` | Client Component, tutte le sezioni A–I |
| `app/api/admin/data-intake/preview/route.ts` | Preview endpoint (KORA_ADMIN, read-only, no DB writes) |
| `lib/live/op001-synthetic-records.ts` | Record sintetici condivisi tra operator-flow e preview |
