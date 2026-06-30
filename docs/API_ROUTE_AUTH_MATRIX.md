# KORA — API Route Auth Matrix

**Branch:** `platform/readiness`
**Generato:** CC-10 · 2026-06-30
**Route analizzate:** 84 file route.ts (corrispondenti a ~110 HTTP handler)
**Scope:** Foundation Light · staging · nessuna route pubblica produzione attiva

---

## 1. Executive Summary

| Metrica | Valore |
|---------|--------|
| Route file totali | 84 |
| Handler HTTP totali (approx.) | ~110 |
| Aree | admin (46) · company (17) · worker (17) · commons (3) · auth (1) |
| Guard `requireKoraAdmin` | 46 file |
| Guard `requireCompanyUser` | 17 file |
| Guard `requireWorkerUser` | 17 file |
| Multi-role sequenziale | 3 file (commons) |
| Dual-auth worker/admin | 2 file |
| Nessun guard esplicito | 1 file (`auth/logout`) |
| Route HIGH RISK | **0** |
| Route NEEDS REVIEW | **8** |
| Route OK | **75** |
| Route UNKNOWN | 0 |

**Pattern auth dominante:** ogni area ha la propria guard function (`requireKoraAdmin` / `requireCompanyUser` / `requireWorkerUser`) che legge il JWT Supabase dal cookie di sessione e lo verifica contro `app_metadata.kora_role`. Non ci sono route completamente prive di auth.

**Principal risks (stato post CC-11):**
- ~~`commons/posts` (GET+POST) e `commons/posts/[id]` (PATCH) usano service-role client per i path company/worker~~ **RISOLTO CC-11** — ora usa `getSupabaseServerClient()` con RLS backstop.
- ~~`data-intake/accept` e `decision-pack/status` istanziano direttamente `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)`~~ **RISOLTO CC-11** — ora usa `getSupabaseServiceClient()`.
- Zero rate limiting su tutte le 84 route.
- Zero schema validation (Zod) — solo controlli `typeof` manuali, inconsistenti tra route.
- `auth/logout` non ha guard esplicito (harmless ma inconsistente).

**Cosa serve prima di real data:**
- ~~Migrare `commons/posts` a `getSupabaseServerClient` per i path company/worker.~~ **FATTO CC-11**
- ~~Standardizzare istanziazione service client (no `createClient` diretto).~~ **FATTO CC-11**
- Aggiungere rate limiting almeno sulle route di scrittura (POST/PATCH/DELETE).
- Schema validation strutturata su route di intake (data-intake/accept, workers/provision, live-company).

**Impatto su KORA Link:**
Nessuna route pubblica attuale è modellata correttamente per un endpoint `/link/[token]`. Serve un pattern dedicato: no PII in risposta, rate limiting, token revocation check, no session cookie richiesta.

---

## 2. Route Matrix — Admin (46 file)

> Tutte le route admin richiedono `requireKoraAdmin`. La maggior parte usa `getSupabaseServiceClient` (corretto per accesso cross-tenant).

| Path (sotto `/api/admin/`) | Methods | Area | Guard | Client DB | Service-Role | Input Valid | Risk | Note |
|---------------------------|---------|------|-------|-----------|-------------|------------|------|------|
| `commons/bookings` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | lista pending, no PII worker |
| `commons/bookings/[id]` | PATCH | admin | `requireKoraAdmin` | service | SÌ | basic | OK | approve/reject/attended |
| `companies/provision` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | typeof+trim, email check |
| `company-console` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | read-only, no raw payload |
| `company-evidence-archive` | GET | admin | `requireKoraAdmin` | service | SÌ | basic | OK | lineage, no PII |
| `company-evidence-record` | GET | admin | `requireKoraAdmin` | service | SÌ | basic | OK | safe canonical fields |
| `company-live-preview` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | aggregated, no individual |
| `company-submissions/[id]/review` | PATCH | admin | `requireKoraAdmin` | service | SÌ | basic | OK | action enum validato |
| `company-submissions` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | queue, no worker data |
| `company-users` | GET, POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | email typeof+lower |
| `company-workspace` | GET | admin | `requireKoraAdmin` | service | SÌ | basic | OK | aggregato, no individual |
| `data-intake/accept` | POST | admin | `requireKoraAdmin` | service | SÌ | estesa | OK | Usava `createClient` diretto — **fixato CC-11** con `getSupabaseServiceClient()` |
| `data-intake/preview` | GET | admin | `requireKoraAdmin` | (mock/computed) | NO | nessuna | OK | dry-run, no write |
| `data-intake/upload-preview` | POST | admin | `requireKoraAdmin` | (parse only) | NO | estesa | OK | dry-run, zero write a DB |
| `data-lifecycle/archive` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | batchId richiesto |
| `data-lifecycle/delete` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | batchId richiesto |
| `data-lifecycle` | GET | admin | `requireKoraAdmin` | service | SÌ | basic | OK | read-only lifecycle |
| `decision-pack/pdf` | GET | admin | `requireKoraAdmin` | (renderer) | NO | basic | OK | no DB query diretta |
| `decision-pack/preview` | GET | admin | `requireKoraAdmin` | (renderer) | NO | basic | OK | no DB query diretta |
| `decision-pack/status` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | Usava `createClient` diretto — **fixato CC-11** con `getSupabaseServiceClient()` |
| `demo/provision-viewer` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | DEMO_VIEWER only |
| `diagnostics` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | critico: service key mai in response |
| `evidence-attachments/lifecycle` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | action enum validato |
| `evidence-attachments/preview` | POST | admin | `requireKoraAdmin` | (parse only) | NO | basic | OK | no write |
| `evidence-attachments/register` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | metadata safe |
| `evidence-attachments/signed-url` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | short-lived, no GET |
| `impact-units` | GET | admin | `requireKoraAdmin` | service (via lib) | SÌ | basic | OK | tenantId req, UUID check assente |
| `live-company` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | compound provisioning |
| `live-spine-diagnostics` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | read-only diagnostics |
| `operator-flow` | POST, GET | admin | `requireKoraAdmin` | service | SÌ | basic | OK | pipeline sintetica |
| `partners/[id]/invite-user` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | no self-signup |
| `partners/[id]/status` | PATCH | admin | `requireKoraAdmin` | service | SÌ | basic | OK | status enum validato |
| `partners` | GET, POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | pillar enum validato |
| `scoring/run-approved-batch` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | solo approved_for_scoring=true |
| `tenants/[id]/promote-to-pilot` | POST | admin | `requireKoraAdmin` | **server** (RLS) | NO | nessuna | OK | RLS policy covers it |
| `tenants` | GET, POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | tenant_kind filtrato |
| `trial-readiness` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | aggregato multi-tenant |
| `uef/enrich` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | rule-based, no LLM |
| `uef/generate-candidates` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | approved_for_scoring=false default |
| `uef/review` | GET, POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | action enum validato |
| `worker-diagnostics` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | aggregati, no individual |
| `worker-initiatives/[id]` | PATCH | admin | `requireKoraAdmin` | service | SÌ | basic | OK | no worker_participation |
| `worker-initiatives` | GET, POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | no private_note espose |
| `workers/list` | GET | admin | `requireKoraAdmin` | service | SÌ | nessuna | OK | worker_identity, no profilo privato |
| `workers/provision` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | email+tenantCode, inviteUserByEmail |
| `workforce-baseline` | POST | admin | `requireKoraAdmin` | service | SÌ | basic | OK | headcount ≥ 10 check |

---

## 3. Route Matrix — Company (17 file)

> Tutte le route company richiedono `requireCompanyUser`. Il `tenant_id` proviene **sempre** dalla sessione JWT — mai da request params. Mix di client: server (RLS) o SQL function con `kora.tenant_id()`.

| Path (sotto `/api/company/`) | Methods | Area | Guard | Client DB | Service-Role | Tenant Scoped | Input Valid | Risk | Note |
|-----------------------------|---------|------|-------|-----------|-------------|--------------|------------|------|------|
| `commons/bookings/aggregate` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | SECURITY DEFINER SQL func |
| `contribution/live` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | production_ready gate |
| `data-submissions/[id]/files` | POST | company | `requireCompanyUser` | server | NO | session | basic | OK | file upload scoped |
| `data-submissions/[id]` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | read-only scoped |
| `data-submissions/[id]/submit` | POST | company | `requireCompanyUser` | server | NO | session | basic | OK | status transition |
| `data-submissions/history` | GET | company | `requireCompanyUser` | server | NO | session | nessuna | OK | history cross-type |
| `data-submissions` | GET, POST | company | `requireCompanyUser` | server | NO | session | basic | OK | list+create |
| `decision-pack/pdf` | GET | company | `requireCompanyUser` | (renderer) | NO | session | basic | OK | no raw worker data |
| `decision-pack` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | aggregated output |
| `evidence-archive` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | v_company_uploaded_record_safe |
| `evidence-record` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | v_company_uploaded_record_safe |
| `initiatives/explainability` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | aggregato per pillar |
| `kora-index/history` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | period history |
| `live-eligibility` | GET | company | `requireCompanyUser` | server | NO | session | basic | OK | aggregato eligibility |
| `workers/activation-aggregate` | GET | company | `requireCompanyUser` | server (SQL fn) | NO | `kora.tenant_id()` | nessuna | OK | fn_company_activation_summary(), N<10 in SQL |
| `workers/aggregate` | GET | company | `requireCompanyUser` | server (SQL fn) | NO | `kora.tenant_id()` | nessuna | OK | fn_company_worker_status() |
| `workspace` | GET | company | `requireCompanyUser` | server | NO | session | nessuna | OK | summary aggregato |

---

## 4. Route Matrix — Worker (17 file)

> Tutte le route worker richiedono `requireWorkerUser`. `worker_id` e `tenant_id` **sempre** da sessione JWT — mai da request params o body. Due route hanno dual-auth (worker OR admin).

| Path (sotto `/api/worker/`) | Methods | Area | Guard | Client DB | Service-Role | Worker Scoped | Input Valid | Risk | Note |
|----------------------------|---------|------|-------|-----------|-------------|--------------|------------|------|------|
| `activation-profile` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | PIB light privato |
| `commons/bookings/[id]` | DELETE | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | RLS mig 025 |
| `commons/bookings` | GET, POST | worker | `requireWorkerUser` | server (RLS) | NO | session | basic | OK | RLS mig 025 |
| `dynamic-cv` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | workerId SOLO da sessione |
| `dynamic-cv/share` | POST | worker | `requireWorkerUser` | server (RLS) | NO | session | basic | OK | share link controllato |
| `dynamic-cv/shares/[id]/revoke` | PATCH | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | [id]=share_record_id, worker da sessione |
| `dynamic-cv/shares` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | lista proprie share |
| `history` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | partecipazioni private |
| `impact-cv` | GET | worker | `requireWorkerUser` **OR** `requireKoraAdmin` | server (RLS) / mock | NO / NO | session / mock | nessuna | OK | admin → mock data sintetici |
| `initiatives/[id]/interest` | POST | worker | `requireWorkerUser` | server (RLS) | NO | session | basic | OK | status enum, private_note max len |
| `initiatives` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | solo published del tenant |
| `onboarding` | GET, POST | worker | `requireWorkerUser` | server (RLS) | NO | session | basic | OK | consent completion |
| `partner-catalog` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | basic | OK | solo published, no price |
| `pib/redistribute` | POST | worker | `requireWorkerUser` (solo, no admin) | server (RLS) | NO | session | basic | OK | worker-owned, no admin path |
| `pib` | GET | worker | `requireWorkerUser` **OR** `requireKoraAdmin` | server (RLS) / mock | NO / NO | session / mock | basic | OK | admin → persona/scenario params |
| `privacy-settings` | GET | worker | `requireWorkerUser` | server (RLS) | NO | session | nessuna | OK | informational only |
| `profile` | GET, PATCH | worker | `requireWorkerUser` | server (RLS) | NO | session | basic | OK | display_name, onboarding_done |

---

## 5. Route Matrix — Commons (3 file) e Auth (1 file)

| Path | Methods | Area | Guard | Client DB | Service-Role | Tenant Scoped | Risk | Note |
|------|---------|------|-------|-----------|-------------|--------------|------|------|
| `/api/commons/initiatives` | GET | commons | Multi-role sequenziale (admin→company→worker→401) | server | NO | JWT + RLS | OK | Usa `getSupabaseServerClient` da prima di CC-11 (matrice CC-10 errata) |
| `/api/commons/posts` | GET, POST | commons | Multi-role sequenziale (admin→company→worker→401) | server | NO | JWT + RLS | OK | **Fixato CC-11**: `getSupabaseServerClient` per tutti i path — RLS gestisce scoping |
| `/api/commons/posts/[id]` | PATCH | commons | Multi-role sequenziale (admin→company→worker→401) | server | NO | JWT + RLS | OK | **Fixato CC-11**: `getSupabaseServerClient` per tutti i path — RLS gestisce scoping |
| `/api/auth/logout` | POST | auth | **Nessuna guard esplicita** | server | NO | N/A | **NEEDS_REVIEW** | Legge sessione per redirect, chiama `signOut()`. Harmless se no sessione, ma semanticamente incompleto. |

---

## 6. Route Pubbliche

**Route autenticate quasi-pubbliche (no session richiesta):**

### `/api/auth/logout`

- **Perché "pubblica":** nessun guard `requireXxx`. Legge `supabase.auth.getUser()` (può tornare null) prima di fare `signOut()`.
- **Cosa espone:** solo redirect HTTP, nessun dato.
- **Rischio:** minimo. `signOut()` su sessione vuota è no-op. La risposta è solo un redirect.
- **Cosa serve:** aggiungere check esplicito — se no sessione, redirect direttamente a `/company/login` senza chiamate DB.

### Future `/link/[token]` requirements

La route KORA Link sarà la prima route genuinamente pubblica con logica di business. Prima del merge:

| Requisito | Dettaglio |
|-----------|-----------|
| No PII in response | Mai worker_id, nome, email, tenant_id nell'output |
| No worker_id esposto | Token → worker_identity_id solo server-side, mai in response |
| No tenant_id esposto | Stesso principio |
| Token malformed safe | Risposta generica (non rivela se token esiste/non esiste) |
| Token revoked/lost safe | Risposta identica a malformed — no timing attack |
| Rate limiting | Obbligatorio — max N req/IP/minuto (valore da definire) |
| Audit scan privacy-safe | Scan registrato server-side senza dati worker |
| Security review prima del merge | CTO o security reviewer esterno |

---

## 7. Route Service-Role

Route che usano `getSupabaseServiceClient()` (corretto per area admin) o `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)` (**non canonico**):

### Uso canonico — `getSupabaseServiceClient()`

Tutte le route `/api/admin/*` eccetto:
- `tenants/[id]/promote-to-pilot` (usa `getSupabaseServerClient`)
- `data-intake/preview` e `data-intake/upload-preview` e `decision-pack/pdf` e `decision-pack/preview` (no DB diretta)

Queste sono **corrette**: l'admin ha accesso cross-tenant e il service role è necessario.

### Uso non canonico — `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)` ✅ RISOLTO CC-11

| Route | Stato |
|-------|-------|
| `app/api/admin/data-intake/accept/route.ts` | **FIXATO CC-11** — ora usa `getSupabaseServiceClient()` |
| `app/api/admin/decision-pack/status/route.ts` | **FIXATO CC-11** — ora usa `getSupabaseServiceClient()` |

### `commons/posts` + `commons/posts/[id]` — service client per path non-admin ✅ RISOLTO CC-11

| Route | Stato |
|-------|-------|
| `commons/posts` GET/POST | **FIXATO CC-11** — `getSupabaseServerClient()` per tutti i path; RLS mig 013 garantisce scoping |
| `commons/posts/[id]` PATCH | **FIXATO CC-11** — `getSupabaseServerClient()` per tutti i path; RLS mig 013 garantisce scoping |
| `commons/initiatives` GET | ✅ Già corretto prima di CC-11 — matrice CC-10 errata |

**RLS analysis CC-11:** policies `commons_post_kora_admin_all` (FOR ALL), `commons_post_company_admin_select/insert/update` (WITH tenant_id = kora.tenant_id()), `commons_post_worker_published_select` (WITH tenant_id + status='published') garantiscono isolamento completo con server client. Cambio comportamentale documentato: PATCH company cross-tenant → 404 invece di 403 (più sicuro — non rivela esistenza post altrui).

---

## 8. Worker Privacy Routes

Route che gestiscono dati personali worker:

| Route | Dati personali | Output company | Aggregazione | Rischio |
|-------|---------------|---------------|-------------|---------|
| `worker/activation-profile` | PIB pillar breakdown | NO (worker-only) | N/A | OK — workerId da sessione |
| `worker/dynamic-cv` | CV items, partecipazioni | NO | N/A | OK — require workerId da sessione |
| `worker/dynamic-cv/share*` | Share link al CV | NO | N/A | OK — worker-owned |
| `worker/history` | Partecipazioni complete | NO | N/A | OK — workerId da sessione |
| `worker/pib` | PIB completo per pillar | NO (worker path) | N/A | OK — session-only |
| `worker/impact-cv` | CV items IU-based | NO (worker path) | N/A | OK — session-only |
| `worker/privacy-settings` | Modello privacy corrente | NO | N/A | OK — informational |
| `worker/profile` | Display name, onboarding | NO | N/A | OK — session-only |
| `company/workers/aggregate` | Aggregati (headcount) | SÌ | SÌ (N<10 check) | OK — SQL function, no individual |
| `company/workers/activation-aggregate` | Aggregati attivazione | SÌ | SÌ (N<10 in SQL) | OK — fn suppression garantita |
| `admin/workers/list` | `worker_identity` rows | SÌ (admin only) | NO | OK — KORA_ADMIN design intenzionale |
| `admin/worker-diagnostics` | Aggregati per tenant | NO | SÌ | OK — nessun individual record |

**Invariante critica:** nessuna route company espone dati individuali worker. Le route admin che espongono `worker_identity` richiedono `KORA_ADMIN` e non includono `worker_profile_private`.

---

## 9. Tenant Isolation Routes

| Route | Come tenant_id è enforced | Rischio |
|-------|--------------------------|---------|
| Tutte `/api/worker/*` | `requireWorkerUser` → sessione → `app_metadata.kora_tenant_id` | OK |
| Tutte `/api/company/*` | `requireCompanyUser` → sessione → `tenantId` restituito dalla guard | OK |
| `company/workers/aggregate` | `kora.tenant_id()` SQL function (JWT-based) | OK — DB-level |
| `company/workers/activation-aggregate` | `fn_company_activation_summary()` + JWT | OK — DB-level |
| `commons/posts` (company path) | JWT + RLS `commons_post_company_admin_select` (`tenant_id = kora.tenant_id()`) | OK — **fixato CC-11** |
| `commons/posts` (worker path) | JWT + RLS `commons_post_worker_published_select` (`tenant_id + status='published'`) | OK — **fixato CC-11** |
| Tutte `/api/admin/*` | Nessuna (admin cross-tenant per design) | OK — by design |
| `admin/workers/list` | `tenantCode` param → lookup tenant_id | OK (lookup server-side) |

**Cross-tenant risk:** Nessuna route company o worker legge `tenant_id` da query param o body. Il rischio cross-tenant in Commons è teorico (se `tenantId` da sessione è errato non c'è RLS backstop) ma non exploitabile dall'esterno.

---

## 10. Findings

### P0 — Critici

Nessuno trovato per il perimetro Foundation Light corrente.

---

### P1 — High

**F-001 — Commons service client per path non-admin** ✅ **RISOLTO CC-11**
- Route: `commons/posts` (GET+POST), `commons/posts/[id]` (PATCH)
- Nota: `commons/initiatives` era già corretto (matrice CC-10 errata)
- Fix applicato: `getSupabaseServerClient()` per tutti i path — RLS mig 013 garantisce scoping a DB level
- Cambiamento comportamentale: PATCH company cross-tenant → 404 invece di 403 (più sicuro)
- CTO review: consigliata prima di real data

**F-002 — Direct `createClient` con service role key** ✅ **RISOLTO CC-11**
- Route: `data-intake/accept`, `decision-pack/status`
- Fix applicato: `getSupabaseServiceClient()` wrapper canonico; `createClient` diretto rimosso
- Test: tsc clean + 8079/8079 vitest post-fix

**F-003 — Zero rate limiting**
- Route: tutte le 84 route
- Problema: nessuna route implementa rate limiting. Le route di scrittura (provision, intake, scoring) sono esposte a uso intensivo.
- Rischio: in staging è basso. In produzione con real data è alto — provisioning spam, scoring flood.
- Fix: aggiungere middleware rate limiting (upstash/redis o edge middleware) su route di scrittura P0: `workers/provision`, `companies/provision`, `data-intake/accept`, `scoring/run-approved-batch`
- Claude Code: **NO** — richiede decisione architetturale (quale soluzione rate limiting, dove nel middleware)
- CTO review: **richiesta** prima di produzione

**F-004 — Zero schema validation strutturata**
- Route: tutte le route con body (POST/PATCH)
- Problema: validazione solo con `typeof` e `trim()` — nessun Zod, nessun schema formale
- Rischio: input malevolo può produrre 500 invece di 400; inconsistenza tra route
- Fix: introdurre Zod per almeno le route più critiche (`workers/provision`, `live-company`, `data-intake/accept`)
- Claude Code: **SÌ** parzialmente — aggiungere Zod è meccanico, ma richiede definire i schema
- CTO review: scelta libreria e approccio

---

### P2 — Medium

**F-005 — `auth/logout` senza guard esplicita**
- Route: `auth/logout`
- Problema: nessuna `requireXxx`. Legge `getUser()` che può ritornare null.
- Rischio: minimo — `signOut()` su no-session è no-op. La risposta è solo un redirect.
- Fix: aggiungere check `if (!user) return redirect('/company/login')` prima di `signOut()`
- Claude Code: **SÌ** — 3 righe

**F-006 — Formato errori non strutturato**
- Route: tutte
- Problema: alcune route ritornano `{ error: 'msg' }`, altre `{ ok: false, error: 'msg' }`. Nessuna convenzione unica.
- Rischio: difficile consumare gli errori lato client in modo uniforme
- Fix: standardizzare su `{ ok: false, error: string, code?: string }`
- Claude Code: **SÌ** parzialmente — cambio meccanico ma alto numero di file

**F-007 — UUID validation assente su query param tenantId**
- Route: `admin/impact-units`, `admin/worker-initiatives`, `admin/workers/list`
- Problema: `tenantId` da query param accettato come stringa senza validazione UUID
- Rischio: input malevolo produce errore DB invece di 400 pulito
- Fix: aggiungere regex UUID o Zod `z.string().uuid()`
- Claude Code: **SÌ**

**F-008 — Nessun audit log per read company/worker**
- Route: tutte le route company e worker GET
- Problema: le route write (admin) hanno `audit.audit_log`. Le read company/worker no.
- Rischio: in staging basso. Prima di pilot real data, serve tracciabilità accesso.
- Fix: aggiungere audit log selettivo per dati sensibili (pib, activation-profile, dynamic-cv)
- Claude Code: **NO** — richiede schema audit e decisione quali eventi loggare

---

### P3 — Low

**F-009 — Nessun request correlation ID**
- Problema: impossibile correlare log di richieste across middleware, route, service
- Fix: aggiungere `X-Request-ID` header in middleware

**F-010 — Nessun API versioning**
- Problema: nessun prefisso `/v1/` o header `API-Version`
- Fix: stabilire convenzione prima di partner API (post-pilot)

**F-011 — Errore 500 vs 400 per input malformati**
- Route: varie (dove validazione assente)
- Fix: catch `request.json()` con try/catch (già fatto in molte route, non tutte)

---

*API_ROUTE_AUTH_MATRIX.md — CC-10 generato · CC-11 aggiornato · Branch `platform/readiness`*
*Aggiornare dopo ogni route nuova o modifica auth significativa.*
