# KORA Data Intake Studio — Technical Documentation

**Status:** Implemented · Synthetic Live v1  
**Route:** `/admin/data-intake`  
**Auth:** KORA_ADMIN session only  
**Data:** Synthetic deterministic (OP-001) · No real people or company data  
**Scope:** Preview only — no file upload, no real data intake, no scoring recalculation

---

## Scopo

Il KORA Data Intake Studio è una UI didattica che rende visibile il percorso con cui KORA trasforma un batch sintetico in output:

> Synthetic batch preview → PII Guard → Eligibility Gate → UEF Preview → Run Scoring → Decision Pack

Aiuta a spiegare KORA in demo: "Il dato entra, viene controllato, normalizzato, trasformato in UEF, passa nel motore, produce risultati e genera Decision Pack."

---

## Solo dati sintetici — nessun upload reale

- **Nessun `<input type="file">`** — la UI non ha form di upload.
- **Nessun CSV/XLSX parsing** — i record sono costruiti deterministicamente da `getOp001SyntheticRecords()`.
- **Nessuna scrittura DB** dal preview endpoint — solo lettura read-only per il result snapshot.
- **Nessun dato reale** — tutti i record sono sintetici, etichettati `syntheticData: true` e `notRealPeople: true`.
- **Gate 3B required** prima di qualsiasi intake con dati reali di persone o aziende.

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

- Solo dati sintetici OP-001 — non personalizzabile per altri tenant nella UI
- Nessun upload reale — by design (Gate 3B required)
- Nessun pillar mapping nel preview (il Pillar Mapper è un modulo separato non ancora integrato nel flow)
- Il result snapshot è read-only — per aggiornarlo bisogna usare "Run operator flow"
- La UI mostra i dati del solo batch sintetico predefinito, non batch reali

---

## Cosa manca per il data intake reale

1. **Gate 3B chiuso** — legal/privacy review completa
2. **Upload form sicuro** — con validazione, limite dimensione, tipi file consentiti
3. **CSV/XLSX parser** — server-side, con strict PII check prima di qualsiasi persistenza
4. **PII policy strict reject** — TODO-004 (attualmente `review_required`)
5. **Source pseudonymization pipeline** — pseudonimizzazione all'origine prima del caricamento
6. **Consent worker check** — verifica consenso worker per ogni record
7. **DPA e clausole contrattuali** — prerequisiti legali per dati reali
8. **Batch management UI** — gestione batch multipli, storico, rollback

---

## File

| File | Ruolo |
|---|---|
| `app/admin/data-intake/page.tsx` | Server Component, `requireKoraAdmin()`, accesso negato o `DataIntakeStudio` |
| `app/admin/data-intake/_components/DataIntakeStudio.tsx` | Client Component, tutte le sezioni A–I |
| `app/api/admin/data-intake/preview/route.ts` | Preview endpoint (KORA_ADMIN, read-only, no DB writes) |
| `lib/live/op001-synthetic-records.ts` | Record sintetici condivisi tra operator-flow e preview |
