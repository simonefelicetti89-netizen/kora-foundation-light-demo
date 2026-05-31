# KORA — Technical Backlog

Registro dei TODO tecnici differiti, deferred o condizionati a milestone future.
Aggiornato a mano al termine di ogni blocco di lavoro significativo.

---

## TODO-001 — Supabase Generated Types automatici

| Campo | Valore |
|---|---|
| **Stato** | DEFERRED |
| **Priorità** | Medium — non blocker immediato |
| **Aggiunto** | 2026-05-30 |
| **Blocco di riferimento** | Supabase Generated Types Cleanup (commit `a2be6c7`) |

### Motivo del differimento

`SUPABASE_ACCESS_TOKEN` (personal access token Supabase dashboard) non configurato nell'ambiente di sviluppo corrente. Il comando `npx supabase gen types typescript` richiede questo token per interrogare l'API Management di Supabase; non è sostituibile con `SUPABASE_SERVICE_ROLE_KEY`.

### Stato attuale

- **Pragmatic types cleanup: PASS** — `lib/supabase/types.ts` aggiornato al formato `GenericSchema` richiesto da `@supabase/supabase-js` v2 (aggiunto `Views`, `Functions`, `Enums`, `CompositeTypes`, `Relationships`, schema `kora` e `public`).
- **12 `as any` rimossi** — tutti i cast a livello di client Supabase eliminati da `lib/live/`, `app/api/admin/`, `app/api/test/`.
- **1 cast residuo** in `lib/scoring-result/index.ts` sul risultato di una join select complessa (`as unknown as { data: LiveRow | null; ... }`) — non rimuovibile senza inferenza join nativa di Supabase JS.
- `tsc --noEmit` CLEAN, lint 0 errori, build OK, tutti i test verdi.

### Non blocker per

- Auth UI minima
- Operator flow (live)
- Decision Pack read
- Gate 3B (legal/privacy)

### Da riprendere prima di

- Pre-produzione
- Onboarding dei primi dati reali cliente
- Stabilizzazione Auth UI / operator flow completo

### Azione futura

1. Ottenere `SUPABASE_ACCESS_TOKEN` dal dashboard Supabase (Profile → Access Tokens).
2. Aggiungere a `.env.local` (non committare).
3. Eseguire:
   ```bash
   npx supabase gen types typescript \
     --project-id <project-ref> \
     --schema analytics,personal,gov,audit,kora,public \
     > lib/supabase/types.generated.ts
   ```
4. Confrontare `types.generated.ts` con `lib/supabase/types.ts`.
5. Valutare sostituzione diretta o allineamento incrementale.
6. Verificare che i tipi generati includano tutti gli schemi custom.
7. Rimuovere il cast residuo su join select se Supabase JS ha migliorato il type narrowing.
8. Aggiornare questo TODO a DONE.

---

---

## TODO-002 — Rimozione fallback `x-kora-operator-secret` da operator-flow ✅ DONE

| Campo | Valore |
|---|---|
| **Stato** | ~~DEFERRED~~ **DONE** — commit Security Boundary Final Closure |
| **Priorità** | High — shared secret fallback non è acceptable in produzione |
| **Aggiunto** | 2026-05-30 |
| **Blocco di riferimento** | Auth UI Minima — KORA Admin Login (commit post-auth-ui) |

### Motivo del differimento

La route `/api/admin/operator-flow` supporta temporaneamente `x-kora-operator-secret` come fallback dev-only per compatibilità con i flussi di test che esistevano prima dell'auth UI. Il fallback è marcato DEPRECATED e bloccato in production (`NODE_ENV === 'production'` → fallback ignorato), ma deve essere rimosso completamente prima del deploy in produzione.

### Stato finale

- **`checkAuth()` rimossa** — `requireKoraAdmin(request)` chiamata direttamente in POST e GET.
- **`x-kora-operator-secret` rimosso** — nessun riferimento in codice, solo commento storico.
- **`KORA_OPERATOR_SECRET`** — può essere rimossa da `.env.local` e CI (non più letta).
- **Auth unica**: sessione KORA_ADMIN sia in production che in dev.

### Non blocker per

- Auth UI stabilization
- Operator flow con sessione reale
- Gate 3B (legal/privacy)

### Trigger per rimozione

Auth UI KORA_ADMIN stabile: login, sessione persistente, logout funzionante in ambiente reale.

### Azione futura

1. Verificare che tutti i caller di `/api/admin/operator-flow` usino sessione KORA_ADMIN.
2. Rimuovere la funzione `checkAuth()` e sostituirla con chiamata diretta a `requireKoraAdmin()`.
3. Rimuovere `KORA_OPERATOR_SECRET` da `.env.local` e da qualsiasi CI/CD env.
4. Aggiornare questo TODO a DONE.
5. Aggiornare `docs/test-routes-removal-before-production.md`.

---

---

## TODO-003 — Gate 3B Privacy Readiness Pack

| Campo | Valore |
|---|---|
| **Stato** | DEFERRED — mandatory before real data |
| **Priorità** | Bloccante per qualunque dato reale cliente |
| **Aggiunto** | 2026-05-30 |
| **Documento di riferimento** | `docs/gate-3b-privacy-readiness-pack.md` |

### Nota chiave: distinzione enforce-by-code vs enforce-by-contract

KORA garantisce tecnicamente (enforce-by-code):
- N≥10 privacy threshold su segmenti employer-visible
- nessun accesso employer a `personal.uploaded_record`
- isolamento tenant via RLS + claims JWT
- accesso operator solo con sessione KORA_ADMIN
- audit log scritto da ogni step dell'operator flow
- production guard su tutte le route test (`NODE_ENV === 'production' → 404`)
- operator flow accessibile solo con sessione KORA_ADMIN verificata server-side

**Non** garantisce tecnicamente (enforce-by-contract/process):
- pseudonimizzazione all'origine (avviene prima dell'upload, fuori da KORA)
- divieto upload PII (policy contrattuale, non validazione tecnica completa)
- retention e cancellazione (non automatizzate)
- DPA / nomina responsabile / istruzioni del titolare (documenti legali)
- gestione file sorgenti del cliente

### Reminder tecnici specifici

- **Right-to-erasure / hard delete**: `analytics.tenant` ha `deleted_at` (soft-delete) e cascade FK, ma il hard delete di `personal.uploaded_record` per singolo pseudonym non è ancora automatizzato. Processo manuale oggi.
- **Audit explorer**: audit log scritto e accessibile a KORA_ADMIN via query diretta e console (ultimi 10 eventi). Non esiste ancora un audit explorer completo con filtri, export, ricerca per range di date.

### Non blocker per

- Demo Foundation Light
- Operator flow sintetico
- Auth UI KORA_ADMIN

### Bloccante per

- Qualunque onboarding di dati reali di aziende o lavoratori
- Gate 3 operativo (legal/privacy)

### Azione richiesta

Vedere checklist completa in `docs/gate-3b-privacy-readiness-pack.md`.

---

---

## TODO-004 — PII Guard production policy

| Campo | Valore |
|---|---|
| **Stato** | DEFERRED — mandatory before real data |
| **Priorità** | Bloccante per qualunque dato reale cliente |
| **Aggiunto** | 2026-05-30 |
| **Blocco di riferimento** | PII Upload Guard — Data Intake Safety Layer |

### Stato attuale

PII Guard implementato in `lib/privacy/pii-guard.ts` con policy **`review_required + redaction`** (Foundation Light).

- Email, telefono, CF, IBAN, chiavi sospette: rilevati e redatti
- Valori PII non salvati in audit, log o response
- OP-001 e TEST-001: safe, nessuna regressione
- Test: 42/42 PASS via `npx tsx scripts/test-pii-guard.ts`

### Decisione da prendere prima dei dati reali

Per Gate 3B con dati reali, la policy raccomandata è **strict reject**:
- Se PII rilevata → batch/record rifiutato, niente persistenza
- Operatore notificato
- Nessun `review_required` (che implica accesso al dato da parte di un operatore)

`review_required + redaction` è accettabile solo in dev con dati sintetici dove non ci sono reali implicazioni privacy.

### Azione richiesta

1. Confermare con legal/DPO la policy per dati reali (strict reject raccomandato)
2. Aggiornare `lib/privacy/pii-guard.ts` con behavior configurabile (env var `KORA_PII_POLICY=strict|review`)
3. Aggiornare operator-flow e seed-route per usare la policy configurata
4. Testare con fixture sintetiche che simulano il comportamento strict
5. Documentare la policy in DPA / istruzioni operative
6. Aggiornare questo TODO a DONE

### Non blocker per

- Demo Foundation Light
- Operator flow sintetico
- Test automatici

### Bloccante per

- Qualunque onboarding di dati reali

---

---

## TODO-005 — Decision Pack PDF — Production hardening

| Campo | Valore |
|---|---|
| **Stato** | PARTIALLY CLOSED — Vercel Pro: PASS expected · Vercel Hobby: CONDITIONAL |
| **Priorità** | Medium — richiesto per board delivery reale con dati reali |
| **Aggiunto** | 2026-05-31 |
| **Aggiornato** | 2026-05-31 |
| **Blocco di riferimento** | Decision Pack PDF — Production Hardening for Vercel |

### Stato attuale (aggiornato)

Implementato `lib/decision-pack/pdf-runtime.ts` con dual-path strategy:
- **Linux / Vercel** → `@sparticuz/chromium` (67MB, binary bundled) + `puppeteer-core` (7.7MB)
- **macOS / dev** → `playwright` (Chromium installato localmente)
- **Platform detection**: `process.platform === 'linux'`
- **Fallback controllato**: se il runtime non si avvia → 501 JSON con hint alla preview HTML

Bundle analysis confermata:
- `.next/server/` = 44MB (nessun binary bundled in chunk)
- `@sparticuz/chromium` binary (67MB) rimane in `node_modules`
- `next.config.ts` → `serverExternalPackages` per entrambi i pacchetti

Test locali (macOS): tutti PASS — PDF 382KB, valid, no secret/PII, auth 401/403/200.

### Comportamento atteso per tier Vercel

| Tier | Limit | Totale stimato | Esito PDF endpoint |
|---|---|---|---|
| **Pro** | 250MB | ~125MB | **EXPECTED PASS** — @sparticuz/chromium avviabile |
| **Hobby** | 50MB | ~125MB (supera) | **501 + fallback HTML preview** |

Cold start Vercel Pro: prima richiesta decomprime il binary (~3–8s). Warm start: rapido.

### Azioni ancora aperte (residue)

1. **Verifica deploy Vercel Pro**: confermare PASS effettivo su Vercel dopo push e primo deploy
2. **Vercel Hobby hardening** (se necessario): microservice PDF dedicato o cloud HTML-to-PDF (Gotenberg, WeasyPrint)
3. **10-component breakdown**: aggiungere tabella completa componenti KORA Index v3 al template
4. **Company logo management**: upload logo cliente, storage, passaggio a `buildDecisionPackHtml`
5. **Advisor review flow**: promuovere Decision Pack da `draft` a `ready` dopo sign-off advisor
6. **Audit event `decision_pack.pdf_generated`**: scrivere evento audit al momento del download
7. **PDF signing/watermarking**: firma crittografica per document integrity
8. **Full Italian localization**: tradurre label inglesi residue nel template

### Non blocker per

- Demo Foundation Light
- Pilot discussion con investitori / potenziali clienti (HTML preview sempre disponibile)
- Gate 3A / Gate 3B documentale

### Bloccante per

- Board delivery reale con garanzia PDF su qualsiasi tier Vercel
- Client-facing PDF con dati reali

---

---

## TODO-006 — Data Intake reale — Gate 3B prerequisito

| Campo | Valore |
|---|---|
| **Stato** | BLOCKED — Gate 3B required before any real upload |
| **Priorità** | Bloccante per qualunque dato reale |
| **Aggiunto** | 2026-05-31 |
| **Blocco di riferimento** | Data Intake UI Minima — Synthetic Live v1 |

### Stato attuale

Data Intake Studio (`/admin/data-intake`) implementato come UI didattica su dati sintetici OP-001:
- Batch preview: 6 record sintetici deterministici
- PII Guard status: riusa `lib/privacy/pii-guard.ts`
- Eligibility Gate preview: riusa `lib/kora-engine/eligibility-gate.ts`
- UEF preview: costruito senza scritture DB
- Nessun upload reale. Nessun CSV/XLSX. Nessun dato reale.

### Azioni richieste per data intake reale

1. **Gate 3B chiuso** — legal/privacy review completa: pseudonimizzazione all'origine, DPA, consenso worker, retention, right-to-erasure
2. **Upload form sicuro** — validazione, limite dimensione, tipi file consentiti (no esecuzione server-side)
3. **CSV/XLSX parser server-side** — con strict PII check prima di qualsiasi persistenza (TODO-004 policy: strict reject)
4. **Source pseudonymization pipeline** — pseudonimizzazione all'origine prima del caricamento su DB
5. **Batch management UI** — gestione batch multipli, storico, rollback
6. **Worker consent check** — verifica consenso per ogni record prima della classificazione
7. **DPA e clausole contrattuali** — prerequisiti legali per dati reali di aziende e lavoratori

### Non blocker per

- Demo Foundation Light
- Pilot discussion con dati sintetici
- Data Intake Studio UI (già implementato su dati sintetici)

### Bloccante per

- Qualunque caricamento di dati reali di lavoratori o aziende
- Gate 3B operativo

---

*Nuovi TODO vanno aggiunti in coda con numerazione progressiva (TODO-007, TODO-008, ...).*
