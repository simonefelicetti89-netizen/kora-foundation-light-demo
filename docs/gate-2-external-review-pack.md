# KORA — Gate 2 External Technical Review Pack

**Documento:** `docs/gate-2-external-review-pack.md`
**Preparato il:** 2026-05-29
**Branch:** `main` — commit `979ad7e` — sincronizzato con `origin/main`
**Gate status:** Gate 2 OPEN (CTO review richiesta prima del provisioning)
**Scopo:** pacchetto di revisione per reviewer tecnico esterno — nessuna modifica al codice in questo documento

---

## A. Executive Summary Tecnico

### Cosa è stato fatto (Fase 1 + Fase 2)

**Fase 1 — Scoring Seam (commit `ee08dce`, `8ec4a72`, `f1a7303`)**

- Introdotto `lib/scoring-result/index.ts`: l'unico punto di consumo per i dati di scoring in tutte le pagine output.
- Definiti i tipi canonici `ScoringResult`, `UseScoringResultReturn`, `KoraIndexSnapshot`, `CompanyAggregateSnapshot`.
- Implementato `useScoringResult()`: hook con contratto stabile `{ data, loading, error }` valido da Fase 1 a Fase 2B senza cambi ai consumer.
- Cablate 8 pagine output (`/company/kora-index`, `/company/activation`, `/company/reports`, `/company/pillars`, `/company/page`, `/company/onboarding`, `/company/profile`, `/company/shared`) a `useScoringResult`.
- Introdotte `useDemoScenarioComparison()` e `isDemoScenarioComparison()` per il confronto S1/S2 demo-only.
- Verificato: tsc 0 errori, lint 0 errori su build post-wiring.

**Fase 2 — Supabase LIVE v1 (commit `5868370`, `979ad7e`)**

- Creati i client Supabase: `lib/supabase/client.ts` (browser, anon key), `lib/supabase/server.ts` (SSR + service role).
- Creati i tipi TypeScript hand-written `lib/supabase/types.ts` che mappano esattamente lo schema SQL.
- Creata la migration `supabase/migrations/001_live_v1_foundation.sql`:
  - 5 schemi: `analytics`, `personal`, `gov`, `audit`, `kora`
  - 12 tabelle con RLS abilitata
  - Helper JWT spostati da `auth` (schema Supabase-managed) a `kora` (schema dedicato controllato da KORA)
  - Policy `application_insert_audit` rimossa (audit writes solo via service role)
  - Commento `PSEUDONYMIZATION BOUNDARY` aggiunto (da confermare con DPA)
- Aggiunto `.env.local.example` con le variabili richieste.

### Cosa NON è stato fatto

- La migration **non è stata applicata** a nessun database — nessun Supabase project è stato provisionato.
- Auth/JWT claims (`kora_role`, `tenant_id`) non sono ancora implementati lato applicazione.
- Il fetch live da Supabase (`fetchLiveScoringResult`) è scritto come struttura ma restituisce `status: 'not_implemented'` — il corpo è commentato e documentato per Phase 2B.
- Il mapper DB → `ScoringResult` (`mapDbRowToScoringResult`) è un placeholder Phase 2B.
- La soppressione N≥10 nel layer di lettura aggregata non è implementata.
- Nessuna pagina nuova, nessun upload reale, nessun auth reale.

### Perché questa fase esiste

KORA ha un'architettura a doppio runtime: **demo** (dati sintetici in memoria) e **live** (Supabase). La Fase 1+2 introduce lo _scoring seam_: un'interfaccia di isolamento che garantisce che le pagine output non dipendano mai direttamente né dal seed demo né dalla DB live. Il seam è il punto di giunzione tra i due runtime. Lo schema Supabase LIVE v1 è il contratto di dati che il reviewer deve validare prima che qualsiasi dato reale entri nel sistema.

### Cosa deve validare il reviewer

1. Lo schema SQL è architetturalmente corretto per un sistema multi-tenant con separazione privacy?
2. Le policy RLS sono coerenti e impediscono cross-tenant access e employer access a dati individuali?
3. Lo schema `personal` ha un livello di protezione adeguato per dati pseudonimizzati?
4. Lo scoring seam è progettato in modo da non poter fare fallback a dati demo in produzione?
5. Esistono rischi GDPR evidenti prima che il primo dato reale venga caricato?

---

## B. Architettura Dati LIVE v1

### Schemi Supabase creati

| Schema | Scopo |
|---|---|
| `analytics` | Aggregati aziendali, risultati Index, scoring output, batch ingestion |
| `personal` | Record pseudonimizzati (RLS più restrittiva, nessun accesso employer) |
| `gov` | Governance finanziaria, evidenze budget |
| `audit` | Audit trail append-only |
| `kora` | Helper JWT interni (non contiene tabelle dati) |

### Tabelle create (12 totali)

**Schema `analytics` — 8 tabelle**

| Tabella | Contenuto |
|---|---|
| `analytics.tenant` | Registry aziende onbordate — una riga per organizzazione |
| `analytics.source_batch` | Un record per file/source di ingestion — metadati batch, no dati individuali |
| `analytics.uef_record` | Unified Event Frame — una riga per iniziativa/categoria, non per lavoratore |
| `analytics.activation_result` | Aggregato di attivazione aziendale per periodo (AR, MAR, VR, CO) |
| `analytics.confidence_result` | Confidence Score — esterno al KORA Index v3, weight = 0 |
| `analytics.bti_result` | Budget-to-Human-Impact engine output — macroblocco 4, peso 20% |
| `analytics.kora_index_result` | Output primario KORA Index v3 — immutabile dopo insert, gestito con `is_current` |
| `analytics.decision_pack_version` | Versioni del Decision Pack — collega i risultati di scoring |

**Schema `personal` — 2 tabelle**

| Tabella | Contenuto |
|---|---|
| `personal.workforce_baseline` | Headcount aggregato per tenant × periodo — nessuna riga individuale |
| `personal.uploaded_record` | Record pseudonimizzati da file caricati — `pseudonym_id` + `raw_hash`, nessuna PII |

**Schema `gov` — 1 tabella**

| Tabella | Contenuto |
|---|---|
| `gov.budget_governance` | Record di governance finanziaria per BTI — nessun `gov.kip_records` (escluso esplicitamente) |

**Schema `audit` — 1 tabella**

| Tabella | Contenuto |
|---|---|
| `audit.audit_log` | Audit trail immutabile — nessun `updated_at`, nessuna policy UPDATE/DELETE |

### Relazioni principali

```
analytics.tenant (1)
  ├── analytics.source_batch (N)
  │     └── personal.uploaded_record (N)
  │     └── analytics.uef_record (N)
  ├── analytics.activation_result (N)
  ├── analytics.confidence_result (N)
  ├── analytics.bti_result (N)
  ├── analytics.kora_index_result (N)
  │     ├── → analytics.confidence_result (FK)
  │     └── → analytics.activation_result (FK)
  ├── analytics.decision_pack_version (N)
  │     ├── → analytics.kora_index_result (FK)
  │     ├── → analytics.bti_result (FK)
  │     ├── → analytics.activation_result (FK)
  │     └── → analytics.confidence_result (FK)
  ├── personal.workforce_baseline (N)
  └── gov.budget_governance (N)
```

`audit.audit_log.tenant_id` è nullable (eventi di sistema senza tenant).

---

## C. RLS e Sicurezza

### Helper JWT (schema `kora`)

Le funzioni helper per leggere i JWT claim sono definite nel schema `kora` — non in `auth` (gestito da Supabase e non controllato da KORA):

```sql
kora.kora_role()  -- legge il claim 'kora_role' dal JWT, default 'anonymous'
kora.tenant_id()  -- legge il claim 'tenant_id' dal JWT, NULL se assente o vuoto
```

`GRANT EXECUTE` è concesso a `authenticated` e `anon`. Nessun claim falso è possibile senza controllo del JWT lato Supabase Auth.

### Policy RLS per ruolo

**`KORA_ADMIN`**
- Accesso `FOR ALL` su tutte le tabelle di tutti i tenant, tutti gli schemi.
- Unico ruolo con accesso SELECT su `audit.audit_log`.
- Unico ruolo con accesso a `personal.uploaded_record` e `analytics.uef_record`.

**`COMPANY_ADMIN` / `COMPANY_VIEWER`**
- Accesso SELECT limitato al proprio `tenant_id` (via `kora.tenant_id()` dal JWT).
- Tabelle accessibili: `analytics.tenant`, `analytics.source_batch`, `analytics.activation_result`, `analytics.confidence_result`, `analytics.bti_result`, `analytics.decision_pack_version` (solo status `ready`/`exported`), `analytics.kora_index_result` (solo `is_current = true`), `personal.workforce_baseline`, `gov.budget_governance`.
- **Nessuna policy** su `personal.uploaded_record` — accesso fisicamente impossibile via RLS.
- **Nessuna policy** su `analytics.uef_record` per ruoli employer — solo ADVISOR e KORA_ADMIN.
- **Nessuna policy** su `audit.audit_log` — i client non possono leggere il log.

**`ADVISOR`**
- SELECT su `analytics.uef_record` limitato al proprio `tenant_id`.
- SELECT su `analytics.tenant` (tramite policy `company_own_tenant_read` che include ADVISOR).

### Isolamento per `tenant_id`

Ogni policy per ruoli company controlla `tenant_id = kora.tenant_id()`. La funzione `kora.tenant_id()` legge il claim dal JWT firmato da Supabase Auth — un tenant non può forgiare il `tenant_id` di un altro tenant senza compromettere la chiave JWT.

### Schema `personal` — trattamento

- RLS abilitata su entrambe le tabelle.
- `personal.uploaded_record`: policy SOLO per `KORA_ADMIN`. Nessun employer role può leggere questo schema nemmeno in lettura.
- `personal.workforce_baseline`: COMPANY_ADMIN/VIEWER possono leggere solo aggregati del proprio tenant. La soppressione N≥10 è dichiarata nel commento dello schema e nei campi `privacy_threshold_applied` / `minimum_group_size`, ma l'enforcement è attualmente a livello applicazione (non CHECK constraint SQL).

### `audit.audit_log` — append-only

- Nessuna policy INSERT per `authenticated`/`anon` — le scritture passano esclusivamente via service role server-side (che bypassa RLS).
- `REVOKE UPDATE, DELETE ON audit.audit_log FROM PUBLIC` nel DDL.
- Nessuna colonna `updated_at` — il tipo TypeScript `AuditLogRow` dichiara esplicitamente `Update: never` nel Database type map.

### Limiti e assunzioni attuali

1. **JWT claims non ancora emessi dall'applicazione** — `kora_role` e `tenant_id` devono essere injettati nel JWT da un sistema auth non ancora implementato. Le policy RLS esistono ma non sono verificabili senza claims reali.
2. **N≥10 enforcement è applicativo, non SQL** — un bug nel layer applicativo potrebbe consentire insert di segmenti sotto soglia.
3. **`REVOKE UPDATE, DELETE FROM PUBLIC`** copre utenti non-superuser, ma un service role mal configurato potrebbe teoricamente aggirarlo. Da verificare nella configurazione Supabase effettiva al momento del provisioning.
4. **La migration non è stata applicata** — lo schema non è stato testato su un Supabase reale; potrebbero emergere errori di sintassi o incompatibilità di versione PostgreSQL.

---

## D. ScoringResultProvider

### Dove si trova

`lib/scoring-result/index.ts` — esportato come hook pubblico `useScoringResult()`.

### Cosa fa

È il **single consumption point** per tutti i dati di scoring nelle pagine output. Nessuna pagina importa direttamente seed file o chiama servizi di scoring. Il contratto `{ data, loading, error }` è stabile: i consumer non richiedono modifiche quando il fetch live sarà completato.

### Comportamento DEMO (`environment === 'demo'`)

- Sincrono, `loading = false` sempre.
- Legge da `ScoringSimulatorService` che a sua volta legge i seed sintetici in memoria.
- Restituisce `ScoringResult.environment = 'demo'`.
- S1/S2 scenario comparison attiva (`useDemoScenarioComparison`).

### Comportamento LIVE (`environment === 'live'`)

- Asincrono: `loading = true` mentre il fetch è in corso.
- `fetchLiveScoringResult()` è strutturata e documentata ma il corpo della query Supabase è commentato (Phase 2B TODO).
- Attualmente restituisce `status: 'not_implemented'`, `koraIndex: null`, `aggregate: null`, `confidence: null`.
- S1/S2 scenario comparison **disabilitata** in live (`useDemoScenarioComparison` restituisce `{ s1: null, s2: null, isDemo: false }`).

### Regola non negoziabile: LIVE must never fall back to demo seed data

Questa regola è dichiarata esplicitamente in 4 punti del codice:

- JSDoc di `ScoringResult` (riga 49–50)
- JSDoc di `useScoringResult()` (riga 175)
- JSDoc di `fetchLiveScoringResult()` (riga 114)
- Commento inline nel `useEffect` live (riga 211)

Il client browser (`lib/supabase/client.ts`) lancia un errore esplicito se le variabili d'ambiente Supabase non sono configurate — non degrada silenziosamente.

### Stato attuale del ramo LIVE

- Struttura completa, typsafe, pronta per Phase 2B.
- La query Supabase commentata in `fetchLiveScoringResult` è il reference esatto per l'implementatore:
  - `analytics.kora_index_result` con join a `confidence_result` e `activation_result`
  - filtro `is_current = true`
  - `mapDbRowToScoringResult()` è il mapper placeholder con shape reference documentato
- Blocker Phase 2B: `KoraIndexOutput.synthetic_demo_data` è un literal obbligatorio nel tipo esistente — va reso opzionale in `lib/types/index.ts` prima di poter mappare righe DB senza type assertion.

---

## E. Confini Non Toccati

Conferma esplicita che i seguenti file e directory **non sono stati modificati** in Fase 1+2:

| Perimetro | Stato |
|---|---|
| `lib/kora-engine/**` | Non toccato |
| Formule IU (`IU = NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]`) | Non modificate |
| `lib/methodology-config/v0.1.ts` | Non toccato |
| `data/synthetic/**` (29 seed file doc 25) | Non toccati |
| `data/scenarios/**` | Non toccati |
| `services/**` (tutti i 15 mock service) | Non toccati |
| Route `/admin`, `/my-kora`, `/partner`, `/advisor`, `/future-vision` | Non toccate |
| Componenti (`components/**`) | Non toccati |
| Design system / Tailwind / shadcn | Non toccati |
| `lib/types/index.ts` | Non toccato |
| `lib/constants/**` | Non toccati |

La verifica è confermata dalla lista file dei 5 commit Fase 1+2 (vedi §Appendice A).

---

## F. Rischi Tecnici Aperti

| # | Rischio | Impatto | Fase di risoluzione |
|---|---|---|---|
| F1 | **S1/S2 sono demo-only** — lo scenario comparison non ha semantica in live; un tenant live non ha "S1" o "S2" ma un `reporting_period` | UX nulla/crash se esposta in live senza guard | Phase 2B |
| F2 | **Hook async non completato** — `fetchLiveScoringResult` restituisce `not_implemented`; le pagine live mostrano stato vuoto | Nessun dato live visibile | Phase 2B (dopo Gate 2) |
| F3 | **`ConfidenceRecord` da consolidare** — il tipo `ConfidenceRecord` è importato da `ScoringSimulatorService` nel seam; in live deve provenire da `analytics.confidence_result` | Disallineamento tipo demo/live | Phase 2B |
| F4 | **Safeguard live da leggere da risultato persistito** — in demo viene calcolato on-the-fly; in live deve leggere `safeguard_status` da `analytics.kora_index_result` | Safeguard potenzialmente inconsistente | Phase 2B |
| F5 | **N≥10 da applicare nel layer di lettura aggregata** — attualmente solo commento/app layer; nessun CHECK SQL o funzione server-side rifiuta segmenti sotto soglia | Re-identification risk su segmenti piccoli | Phase 2B — implementare e testare prima di qualsiasi scrittura reale |
| F6 | **Auth/JWT claims non implementati** — `kora_role` e `tenant_id` non vengono ancora emessi; le RLS policy esistono ma non sono attivabili senza claims reali | RLS inerte senza auth | Phase 3+ |
| F7 | **RLS da validare esternamente** — la migration non è stata applicata a nessun Supabase reale; potrebbero emergere errori di sintassi, incompatibilità PostgreSQL, o policy logicamente incomplete | Schema non verificato in produzione | Gate 2 prerequisito |
| F8 | **`synthetic_demo_data` literal nel tipo** — `KoraIndexOutput` richiede `synthetic_demo_data: true`; le righe DB non hanno questo campo | Type assertion necessaria per il mapper live | Phase 2B — rendere il campo opzionale in `lib/types/index.ts` |
| F9 | **Service role key in server.ts** — `SUPABASE_SERVICE_ROLE_KEY` letta da `process.env` server-side; se esposta nel bundle client sarebbe critica | Rischio se misconfigured | Verificare a build time con `NEXT_PUBLIC_` prefix check |

---

## G. Checklist per il Reviewer

Rispondere sì/no a ciascuna domanda. Annotare osservazioni nella colonna note.

| # | Domanda | Risposta | Note |
|---|---|---|---|
| G1 | Lo schema è architetturalmente sensato per LIVE v1 multi-tenant? | ☐ Sì / ☐ No | |
| G2 | La separazione `analytics` / `personal` / `gov` / `audit` è corretta? | ☐ Sì / ☐ No | |
| G3 | Le policy RLS impediscono accesso cross-tenant (un tenant non può leggere dati di un altro)? | ☐ Sì / ☐ No | |
| G4 | Lo schema `personal` è sufficientemente protetto — nessun employer può accedere a `uploaded_record`? | ☐ Sì / ☐ No | |
| G5 | `audit_log` è davvero append-only — `REVOKE UPDATE/DELETE` è sufficiente o servono ulteriori garanzie? | ☐ Sì / ☐ No | |
| G6 | Esistono fallback a dati demo nel ramo LIVE? (atteso: no) | ☐ Sì / ☐ No | |
| G7 | Il design è compatibile con una futura separazione identity store (auth provider esterno, tenant claims nel JWT)? | ☐ Sì / ☐ No | |
| G8 | Ci sono rischi GDPR evidenti prima che il primo dato reale venga caricato? | ☐ Sì / ☐ No | |
| G9 | Lo spostamento degli helper JWT da `auth` a `kora` è corretto e sicuro? | ☐ Sì / ☐ No | |
| G10 | La `PSEUDONYMIZATION BOUNDARY` dichiarata nello schema è coerente con un modello DPA valido? | ☐ Sì / ☐ No | Da confermare con DPA |
| G11 | Il rischio F5 (N≥10 solo applicativo) è accettabile per il provisioning? | ☐ Sì / ☐ No | |
| G12 | Il rischio F9 (service role key) è mitigato correttamente dalla configurazione Next.js? | ☐ Sì / ☐ No | |

---

## Appendice A — File inclusi nei commit Fase 1+2

| Commit | Hash | File modificati |
|---|---|---|
| Fase 1+2: scoring seam + schema live v1 + correzioni RLS/audit | `979ad7e` | `supabase/migrations/001_live_v1_foundation.sql` |
| Fase 2: Supabase foundation + live branch provider + demo-only S1/S2 isolation | `5868370` | `supabase/migrations/001_live_v1_foundation.sql`, `lib/scoring-result/index.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/types.ts`, `package.json`, `package-lock.json`, `.env.local.example`, `app/company/kora-index/page.tsx` |
| Fase 1: verifica — tsc, lint, build passano senza errori | `f1a7303` | `PLATFORM_STRATEGIC_AUDIT.md` |
| Fase 1: wire 8 pagine di output a useScoringResult (wiring demo-only) | `8ec4a72` | `app/company/activation/page.tsx`, `app/company/kora-index/page.tsx`, `app/company/onboarding/page.tsx`, `app/company/page.tsx`, `app/company/pillars/page.tsx`, `app/company/profile/page.tsx`, `app/company/reports/page.tsx`, `app/company/shared/page.tsx` |
| Fase 1: introduce ScoringResultProvider — tipi, resolver e hook async-ready | `ee08dce` | `lib/scoring-result/index.ts` |

---

## Appendice B — Stato Repository al momento della review

```
Branch:       main
HEAD commit:  979ad7eeca72306087698c85e6cff6c4ae808f1d
Remote:       origin/main — sincronizzato (up to date)
Working tree: clean — nessun file modificato/untracked
tsc:          0 errori
lint:         0 errori, 7 warning pre-esistenti (unused vars in mock services)
```

**Migration non applicata a nessun database.**
**Nessun Supabase project provisionato.**
**Gate 2 (CTO review) è prerequisito per qualsiasi provisioning.**

---

*Documento generato in fase di audit/preparazione. Non è un documento di sviluppo — nessuna modifica al codice è stata introdotta con questo file.*
