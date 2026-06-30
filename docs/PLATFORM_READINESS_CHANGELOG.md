# KORA — Platform Readiness Changelog

**Branch:** `platform/readiness`
**Base:** `value-freeze-v1` (`eaecdad`)
**Non mergiare in main senza CTO review.**

---

## CC-07 — ESLint Runtime Fixes Pass 1

**Data:** 2026-06-30
**Commit:** `bcd0c54`
**Branch:** `platform/readiness`

### Cluster 1 — `no-unescaped-entities` (11 errori → 0)

**File modificati:**
- `app/admin/partners/page.tsx` — `"network"` → `{'"network"'}` in `<strong>`
- `app/commons/page.tsx` — `"quale opportunità..."` → espressione JSX
- `app/commons/publish/page.tsx` — `l'iniziativa` → `l&apos;iniziativa`
- `app/company/commons/page.tsx` — `dell'attivazione` e `l'azienda` → `&apos;`
- `app/company/pillars/page.tsx` — `l'integrazione` → `l&apos;integrazione`
- `app/worker/workspace/page.tsx` — `l'azienda` → `l&apos;azienda`
- `components/commons/AdminBookingModerationSection.tsx` — `"Segna..."` → espressione JSX

**Test aggiornati** (source-reading tests che cercavano stringa raw):
- `tests/unit/kora-space-operating-model.test.ts` — 3 asserzioni aggiornate a `&apos;`
- `tests/unit/kora-space-pilot-usability.test.ts` — 1 asserzione aggiornata

**Nota:** questi test leggono il source file raw con `readFileSync`. Aggiornati correttamente
per riflettere il nuovo encoding JSX. Il testo semantico reso nel browser è identico.

### Cluster 2 — `set-state-in-effect` in `useCountUp.ts` (1 errore → 0)

**File modificato:** `components/hooks/useCountUp.ts`

Fix: `setValue(Math.round(target))` sincrono nel caso `prefers-reduced-motion`
→ `requestAnimationFrame(() => setValue(...))` con cleanup `cancelAnimationFrame`.

Comportamento identico: un frame di delay imperceptibile per utenti che preferiscono
reduced motion. API dell'hook `{ ref, value }` invariata.

### Cluster 3 — `static-components` in `kora-space/page.tsx` (3 errori → 0)

**File modificato:** `app/my-kora/kora-space/page.tsx`

Fix: `PageHeader` era definito come `const PageHeader = () => (...)` DENTRO
`WorkerKoraSpacePage()` — ricreato a ogni render.
→ Spostato a module level come `function PageHeader()`.

`PageHeader` non ha chiusure su stato o props del parent — estrazione sicura.
UI identica. Tre siti di utilizzo (mode live / empty / demo) rimangono invariati.

### Metriche

| Metrica | Prima (baseline) | Dopo CC-07 | Δ |
|---------|-----------------|-----------|---|
| ESLint totale | 206 (118 err, 88 warn) | 191 (103 err, 88 warn) | -15 err |
| `no-unescaped-entities` | 11 | 0 | -11 |
| `static-components` | 3 | 0 | -3 |
| `set-state-in-effect` (useCountUp) | 1 | 0 | -1 |
| TypeScript (`tsc --noEmit`) | CLEAN | CLEAN | — |
| vitest | 8079/8079 | 8079/8079 | — |
| Build Next.js | OK | OK | — |

### Cosa NON è stato toccato

- `components/layout/Sidebar.tsx` — setState in effect — richiede pair review
- `app/worker/dynamic-cv/_components/DynamicCVClient.tsx` — richiede pair review
- `components/admin/CompanyWorkspacePanel.tsx` — richiede pair review
- Supabase, SQL, migrations, RLS, auth, middleware — non toccati
- KORA Engine, methodology config — non toccati
- Produzione — non toccata

### Rischi residui

**`set-state-in-effect` rimanenti (7 file):**
- `components/layout/Sidebar.tsx` — chrome condiviso, massimo impatto, pair review
- `app/worker/dynamic-cv/_components/DynamicCVClient.tsx` — area worker privacy
- `components/admin/CompanyWorkspacePanel.tsx` — area company
- `app/admin/companies/new/_components/CreateLiveCompanyForm.tsx` — admin
- `app/admin/impact-units/_components/ImpactUnitsExplorer.tsx` — admin
- `components/admin/AdminSubmissionQueue.tsx` — admin
- `components/hooks/useCountUp.ts` — FIXED ✅

### Prossimi cluster raccomandati (CC-08)

**Opzione A — Cluster B (shell/demo gating):**
Priorità alta per demo cliente. Board Pack shell, label sintetici, sidebar inactive flag.
Nessun rischio tecnico. Claude Code: sì.

**Opzione B — Cluster D (Playwright E2E setup):**
Priorità alta per CTO credibility. Setup Playwright + E2E-01 (company → KORA Index).
Claude Code: sì per setup. Test E2E richiedono sessione staging valida.

**Opzione C — Cluster E (Supabase types update):**
Aggiornamento `lib/supabase/types.ts` con campi mancanti da migrations.
Claude Code: sì. Basso rischio.

Consiglio: procedere con **Opzione B** (Playwright E2E) — è il debito più visibile
per un CTO esterno. Poi Opzione A per completare la demo readiness.

---

## CC-08 — Playwright E2E Setup + Primo Golden Path

**Data:** 2026-06-30
**Commit:** (vedi log post-commit)
**Branch:** `platform/readiness`

### Cosa è stato aggiunto

| File | Tipo | Contenuto |
|------|------|-----------|
| `playwright.config.ts` | Config | Playwright setup: Chromium, webServer, baseURL localhost:3000 |
| `tests/e2e/kora-smoke.spec.ts` | Test E2E | 6 smoke test su pagine pubbliche |
| `docs/E2E_TESTING.md` | Documentazione | Guida completa: comandi, golden path futuri, limiti, troubleshooting |
| `package.json` | Script | `test:e2e`, `test:e2e:headed`, `test:e2e:ui` |

### Playwright — stato pre-setup

- `playwright` 1.60.0 era già in devDependencies — **non reinstallato**
- `playwright/test` subpath funzionava già (no `@playwright/test` separato necessario)
- Chromium era già in cache (`/Users/.../ms-playwright/chromium-1223`)
- Zero config E2E, zero test E2E

### Test E2E creati (6/6 green)

| ID | Percorso | Asserzione chiave | Risultato |
|----|---------|-----------------|---------|
| S01 | `/` | "Human Impact Intelligence Platform" visibile | ✅ |
| S02 | `/login` | "Accedi a KORA" + `data-testid="login-email-input"` | ✅ |
| S03 | `/login?role_hint=company` | "Area Aziendale" visibile | ✅ |
| S04 | `/login?role_hint=worker` | "Il tuo spazio privato KORA" visibile | ✅ |
| S05 | `/request-access` | `data-testid="request-access-page"` + h1 "Richiedi accesso" | ✅ |
| S06 | `/demo` | Status < 500, no runtime error, "KORA" in body | ✅ |

**Tempo totale run:** ~6 secondi (con dev server già caldo)

### Comandi

```bash
npm run test:e2e           # headless
npm run test:e2e:headed    # con browser visibile
npm run test:e2e:ui        # UI interattiva
```

### Metriche

| Metrica | Prima CC-08 | Dopo CC-08 |
|---------|------------|-----------|
| E2E browser test | 0 | 6 (6/6 green) |
| TypeScript | CLEAN | CLEAN |
| vitest | 8079/8079 | 8079/8079 |
| Build | OK | OK |
| Playwright config | assente | presente |
| Scripts E2E in package.json | 0 | 3 |

### Rischi residui

- Nessun test autenticato — golden path company/worker richiedono account staging dedicati
- Solo Chromium — Firefox/Safari non testati
- No CI/CD integration — Playwright non è ancora in pipeline CI
- `@sparticuz/chromium` in dependencies (per uso server-side) è separato da Playwright browser — nessun conflitto

### Cosa NON è stato toccato

- Nessun codice runtime modificato
- Nessun SQL, RLS, migrations
- Nessun Supabase client usato
- Produzione non toccata
- Auth/middleware non toccati
- Business logic invariata

### Prossimi step raccomandati (CC-09)

**Opzione A — Cluster B (Shell/Demo Gating):**
Board Pack shell label, sidebar inactive flag, verifica sistematica pagine vuote.
Claude Code: sì. Nessun rischio tecnico.

**Opzione B — E2E autenticati (staging):**
Richiede account di test dedicati su staging e configurazione variabili env E2E.
Non implementabile senza credenziali. Documentare in CC-09 come prerequisiti.

**Opzione C — Cluster E (Supabase types):**
Aggiornare `lib/supabase/types.ts` con campi mancanti dalle migrations (tenant_kind, ecc.).
Claude Code: sì. Basso rischio.

Consiglio: **Opzione A** (Shell/Demo Gating) — immediato, nessun prerequisito esterno, alta visibilità demo.

---

## CC-09 — Shell/Demo Page Gating + Client-Safe Navigation

**Data:** 2026-06-30
**Branch:** `platform/readiness`

### Obiettivo

Ridurre il rischio "vibecoded" durante demo cliente/investitore: label, badge e gating
leggero sulle superfici shell/demo/preview. Nessuna nuova feature. Nessuna business logic.

### Audit sistematico eseguito

Pagine ispezionate (data-gathering):
- Tutte le route `/demo/*` — audit badge DEMO / DemoAccessBanner
- Tutte le route `/company/*` in sidebar — audit flag comingSoon / inactive / preview
- `/app/demo/future-vision/page.tsx` — già "NON ATTIVO" ✓
- `/app/company/contribution/page.tsx` — già "PRE-PILOT PREVIEW" ✓
- `/app/company/scoring/page.tsx` — già `OperatorToolBoundary` ✓
- `/app/company/financial/page.tsx` — già `NoDataState` ✓

### Modifiche applicate

| File | Tipo | Cambio |
|------|------|--------|
| `app/demo/portfolio/page.tsx` | Badge | Aggiunto `BoundaryBadge mode="DEMO" · dati sintetici` all'header |
| `components/layout/Sidebar.tsx` | Flag nav | Aggiunto `preview: true` a `/company/opportunities` |

#### `app/demo/portfolio/page.tsx`

Unica pagina demo priva di `BoundaryBadge` nell'header — le pagine gemelle
(`index-registry`, `benchmarks`, `network`, `ai-onboarding`) lo avevano già.
Fix: wrap eyebrow in flex + badge, pattern identico alle altre demo pages.

Il testo "dati sintetici" era già presente nella descrizione e nei demo notes
(`synthetic_demo_data: true`). Il badge non riduplica — lo porta in posizione
standard visibile immediatamente.

#### `components/layout/Sidebar.tsx`

`/company/opportunities` compariva nel sidebar senza flag: l'utente cliccava
e vedeva "Modulo non ancora attivo per questo tenant". Aggiunto `preview: true`
→ badge arancio "preview" compare prima del click, setta aspettative corrette.

Il cambio tocca SOLO la entry nav (array di oggetti) — nessuna logica sidebar
modificata. La pagina `/company/opportunities` stessa è invariata.

### Metriche

| Metrica | Prima CC-09 | Dopo CC-09 |
|---------|------------|-----------|
| Demo pages con BoundaryBadge header | 5/6 | 6/6 |
| Sidebar company items con flag | 3/N | 4/N (+ opportunities preview) |
| TypeScript (`tsc --noEmit`) | CLEAN | CLEAN |
| vitest | 8079/8079 | 8079/8079 |

### Cosa NON è stato toccato

- Nessun codice runtime modificato oltre label/badge/flag nav
- Nessun SQL, RLS, migrations
- Nessun Supabase client usato
- Produzione non toccata
- Auth/middleware non toccati
- Business logic invariata

### Prossimi step raccomandati (CC-10)

**Opzione A — Cluster A rimanente (ESLint setState):**
`Sidebar.tsx`, `DynamicCVClient.tsx`, `CompanyWorkspacePanel.tsx` — richiedono pair review.

**Opzione B — E2E autenticati (staging):**
Account di test staging dedicati + golden path E2E-01/E2E-03.
Richiede credenziali — non implementabile automaticamente.

**Opzione C — Cluster E (Supabase types):**
Aggiornare `lib/supabase/types.ts` con campi mancanti dalle migrations (tenant_kind, ecc.).
Claude Code: sì. Basso rischio.

---

## CC-10 — API Route Auth Matrix + Hardening Backlog

**Data:** 2026-06-30
**Branch:** `platform/readiness`
**Tipo:** documentale — nessun codice runtime modificato

### Obiettivo

Audit sistematico di tutte le API route KORA per:
- ridurre rischio vibecoding/security su demo CTO/investitore;
- preparare infrastruttura per KORA Link v1;
- identificare finding P0/P1/P2/P3 e distinguere fix Claude Code vs CTO.

### File creati

| File | Contenuto |
|------|-----------|
| `docs/API_ROUTE_AUTH_MATRIX.md` | Matrice completa 84 route: guard, client, tenant isolation, privacy, findings |
| `docs/API_HARDENING_BACKLOG.md` | Backlog operativo P0→P3 + KORA Link readiness section |

### Risultati audit

| Metrica | Valore |
|---------|--------|
| Route file analizzate | 84 |
| Handler HTTP totali (approx.) | ~110 |
| Aree | admin(46) · company(17) · worker(17) · commons(3) · auth(1) |
| Route HIGH RISK | **0** |
| Route NEEDS REVIEW | **8** |
| Route OK | **75** |
| Route UNKNOWN | 0 |

### Top findings

| ID | Priorità | Route | Problema | Claude Code |
|----|----------|-------|----------|------------|
| H-001 | P0 | `commons/posts` (3 file) | Service client per path company/worker — nessun RLS backstop | SÌ |
| H-002 | P0 | `data-intake/accept`, `decision-pack/status` | `createClient` diretto con service role key | SÌ |
| H-003 | P1 | Tutte le 84 route | Zero rate limiting | NO — CTO |
| H-004 | P1 | Route POST/PATCH | Zero Zod schema validation | SÌ parzialmente |
| H-005 | P1 | `auth/logout` | Nessuna guard esplicita | SÌ |
| H-006 | P1 | `admin/impact-units`, `admin/worker-initiatives`, `admin/workers/list` | UUID non validato su query param | SÌ |
| H-007 | P1 | Tutte | Formato errori non standardizzato | SÌ |
| H-008 | P2 | `/link/[token]` (futura) | Pattern route pubblica mancante | SÌ (struttura) |
| H-009 | P2 | KORA Link | Rate limiting public route | NO — CTO |
| H-010 | P2 | KORA Link | Endpoint admin/company/worker KORA Link | SÌ (post Gate 2+3) |

### KORA Link readiness

Nessuno dei 5 endpoint KORA Link è implementato. Prerequisiti prima del merge:
- H-001 risolto
- H-003 infrastruttura rate limiting
- Gate 2 chiuso (schema DB, RLS)
- Gate 3 chiuso (legal/privacy su scan worker)
- Security review CTO

### Cosa può fare Claude Code (prossimi CC)

- H-001: refactor commons service client → P0
- H-002: refactor createClient diretto → P0
- H-004: aggiungere Zod su route prioritarie
- H-005: fix logout guard
- H-006: UUID validation
- H-007: standardizzare error shape

### Cosa richiede CTO/Security

- H-003: rate limiting (decisione architetturale)
- H-009: rate limiting public route KORA Link
- H-013: API versioning
- Review pre-merge KORA Link

### Metriche

| Metrica | Valore |
|---------|--------|
| Codice runtime modificato | **NO** |
| TypeScript | CLEAN (nessuna modifica) |
| vitest | 8079/8079 (nessuna modifica) |
| Supabase usato | **NO** |

---

---

## CC-11 — API Hardening P0: commons RLS backstop + service-role canonicalization

**Data:** 2026-06-30
**Branch:** `platform/readiness`
**Tipo:** hardening sicurezza — 4 file runtime modificati, 3 doc aggiornati

### Obiettivo

Risolvere i due finding P0 emersi da CC-10:
- **H-001:** `commons/posts` usava `getSupabaseServiceClient()` per path company/worker, senza RLS backstop — solo filtro applicativo `tenant_id`
- **H-002:** `data-intake/accept` e `decision-pack/status` istanziavano `createClient` direttamente con service role key invece del wrapper canonico

### Analisi pre-fix (H-001)

Verifica RLS su `commons.post` (mig 013) — policies presenti e complete:
- `commons_post_kora_admin_all` — FOR ALL, nessuna restrizione tenant
- `commons_post_company_admin_select/insert/update` — WITH `tenant_id = kora.tenant_id()`
- `commons_post_worker_published_select` — WITH `tenant_id = kora.tenant_id() AND status='published'`

`commons/initiatives/route.ts` — già usa `getSupabaseServerClient()` da prima di CC-11. Matrice CC-10 errata: listava erroneamente questa route come NEEDS_REVIEW.

**Conclusione:** il passaggio a `getSupabaseServerClient()` per `commons/posts` è sicuro. La RLS garantisce lo stesso scoping tenant che il codice applicativo già implementava, con DB-level enforcement aggiuntivo.

### Modifiche applicate

| File | Cambio | H-finding |
|------|--------|-----------|
| `app/api/commons/posts/route.ts` | `getSupabaseServiceClient()` → `await getSupabaseServerClient()` (GET e POST) | H-001 |
| `app/api/commons/posts/[id]/route.ts` | `getSupabaseServiceClient()` → `await getSupabaseServerClient()` (PATCH) | H-001 |
| `app/api/admin/data-intake/accept/route.ts` | `createClient<Database>(url, key, opts)` → `getSupabaseServiceClient()`; rimosso `import { createClient }` e `import type { Database }` | H-002 |
| `app/api/admin/decision-pack/status/route.ts` | idem | H-002 |

### Cambiamenti comportamentali documentati

| Route | Path | Comportamento prima | Comportamento dopo | Valutazione |
|-------|------|--------------------|--------------------|-------------|
| `PATCH /api/commons/posts/[id]` | COMPANY_ADMIN cross-tenant | 403 "Accesso negato — post di un altro tenant" | 404 "Post non trovato" | Più sicuro: non rivela esistenza post altrui |
| `GET /api/commons/posts` | COMPANY_ADMIN | Filtro `tenant_id` applicativo | RLS `company_admin_select` (`tenant_id = kora.tenant_id()`) + filtro applicativo come backup | Identico per l'utente; più sicuro per il DB |
| `POST /api/commons/posts` | COMPANY_ADMIN | Status check applicativo; tenant da sessione | RLS `company_admin_insert` come backstop aggiuntivo | Identico per l'utente |
| `data-intake/accept`, `decision-pack/status` | KORA_ADMIN | Client diretto | Wrapper canonico (stesse opzioni, stessa key) | Identico — solo coerenza |

### Cosa NON è stato cambiato

- Logica business invariata — query, filtri, output, error messages
- Auth guards invariati — `requireKoraAdmin`, `requireCompanyUser`, `requireWorkerUser`
- Nessuna migrazione, nessun SQL, nessuna RLS modificata
- `commons/initiatives/route.ts` — non toccata (già corretto)
- `lib/supabase/server.ts` — non toccata (wrapper consumato, non modificato)
- Middleware, auth, KORA Engine — non toccati

### Metriche

| Metrica | Valore |
|---------|--------|
| File runtime modificati | 4 |
| Doc aggiornati | 3 (`API_ROUTE_AUTH_MATRIX.md`, `API_HARDENING_BACKLOG.md`, `PLATFORM_READINESS_CHANGELOG.md`) |
| TypeScript (`tsc --noEmit`) | CLEAN |
| vitest | 8079/8079 |
| Finding P0 risolti | **2/2** (H-001 + H-002) |
| Finding P0 rimanenti | 0 |
| Finding P1 rimanenti | H-003 (rate limiting — CTO), H-004 (Zod), H-005 (logout), H-006 (UUID), H-007 (errori) |

### Prossimi step raccomandati (CC-12)

**Opzione A — H-005: `auth/logout` guard** (3 righe, basso rischio)

**Opzione B — H-006: UUID validation su query param** (`admin/impact-units`, `admin/worker-initiatives`, `admin/workers/list`)

**Opzione C — H-004 Zod partial**: aggiungere schema Zod su route di intake prioritarie (`workers/provision`, `live-company`)

**Opzione D — CC-08 follow-up: E2E autenticati su staging** (richiede credenziali staging + account di test)

---

---

## CC-12 — API Input Validation P1: Zod su route selezionate

**Data:** 2026-06-30
**Branch:** `platform/readiness`
**Tipo:** hardening input validation — 4 route runtime + 1 test aggiornato + 1 test nuovo + 2 doc

### Obiettivo

Ridurre H-004 (zero schema validation strutturata): aggiungere Zod su 4 route POST ad alto valore.

### Setup

Zod v4.4.3 installato come dipendenza runtime (`npm install zod`). Nessun peer dependency.

### Route hardened

| Route | Schema Zod | Campi validati | Comportamento precedente |
|-------|------------|----------------|------------------------|
| `POST /api/admin/workers/provision` | `ProvisionWorkerSchema` | `tenantCode` min(1)+max(32), `email` format, `workerRef` optional | `typeof` + `.includes('@')` manual |
| `POST /api/admin/companies/provision` | `ProvisionCompanySchema` | `company_name` required+max(200), `admin_email` format+required | `typeof` + regex manual |
| `POST /api/admin/scoring/run-approved-batch` | `RunBatchSchema` | `batchId` required string, `workforcePopulation` optional number | `String().trim()` + empty check |
| `POST /api/worker/initiatives/[id]/interest` | `InterestSchema` | `status` z.enum (3 valori), `private_note` max(500) | Enum array check + slice/length |

### Invarianti rispettate per ogni route

- Auth guard invariata (requireKoraAdmin / requireWorkerUser)
- Query DB invariata — nessun cambio logica
- Output per payload valido identico
- Error shape `{ error: string }` — identico all'esistente
- `runKoraPipeline` non toccata — solo input validation prima della chiamata

### Pattern adottato

```typescript
// Schema locale in cima alla route
const Schema = z.object({ ... });

// Parse dopo JSON decode
const parsed = Schema.safeParse(rawBody);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues[0]?.message ?? 'Payload non valido.' },
    { status: 400 },
  );
}
// usa parsed.data.* — typed e safe
```

### Privacy: worker/initiatives/interest

`InterestSchema` include solo `status` e `private_note` — Zod rimuove per costruzione qualsiasi `worker_id` o `tenant_id` dal body (strip per default in Zod v4). Invariante più forte rispetto al pattern manuale precedente. `ALLOWED_STATUSES` aggiornato a `as const satisfies` per compatibilità con `z.enum()`.

### Route escluse (rimandare)

- `POST /api/admin/live-company` — 400+ righe, 10+ campi; troppo grande per questo round
- `POST /api/admin/data-intake/accept` — multipart; fuori scope CC-12
- Route GET con query param — trattare in H-006 (UUID validation)

### File modificati

| File | Tipo | Cambio |
|------|------|--------|
| `app/api/admin/workers/provision/route.ts` | Runtime | Schema Zod + safeParse |
| `app/api/admin/companies/provision/route.ts` | Runtime | Schema Zod + safeParse |
| `app/api/admin/scoring/run-approved-batch/route.ts` | Runtime | Schema Zod + safeParse |
| `app/api/worker/initiatives/[id]/interest/route.ts` | Runtime | Schema Zod + safeParse; ALLOWED_STATUSES as const |
| `tests/unit/cc12-zod-validation.test.ts` | Test nuovo | 25 structural test sulle 4 route |
| `tests/unit/b109b-participation-privacy.test.ts` | Test update | Asserzione aggiornata: Zod schema → pattern moderno |
| `docs/API_HARDENING_BACKLOG.md` | Doc | H-004 status aggiornato |
| `docs/PLATFORM_READINESS_CHANGELOG.md` | Doc | Aggiunto CC-12 |
| `package.json` / `package-lock.json` | Config | Aggiunto zod v4.4.3 |

### Metriche

| Metrica | Valore |
|---------|--------|
| Route hardened | 4 |
| Test nuovi (CC-12) | 25/25 green |
| Test aggiornati (B109-B) | 1 |
| vitest totale | **8104/8104** (was 8079, +25 CC-12) |
| TypeScript (`tsc --noEmit`) | CLEAN |
| Finding P1 H-004 | PARZIALE — 4 route done; live-company + data-intake pendenti |

### Prossimi step raccomandati (CC-13)

**Opzione A — H-005: `auth/logout` guard** (3 righe — minimale, basso rischio)

**Opzione B — H-006: UUID validation query param** (`admin/impact-units`, `admin/worker-initiatives`, `admin/workers/list`) — Zod già installato, meccanico

**Opzione C — H-004 continuazione: Zod su `live-company`** — più grande, separato

---

*Aggiornare questo documento dopo ogni CC-XX che tocca `platform/readiness`.*
