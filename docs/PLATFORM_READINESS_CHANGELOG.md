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

*Aggiornare questo documento dopo ogni CC-XX che tocca `platform/readiness`.*
