# KORA — Vibecoding Risk Reduction Plan

**Branch:** `docs/consolidation`
**Versione:** CC-06 · 2026-06-30
**Input:** `docs/TECHNICAL_DEBT_MAP.md`, `spec/INVARIANTS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`

---

## Cos'è il "vibecoding risk"

Il vibecoding risk è il rischio che il sistema evolva in modo non governato: feature aggiunte senza design doc, pattern copiati senza comprenderne le implicazioni, refactor casuali che rompono invarianti privacy/metodologici, test non scritti perché "tanto funziona". In KORA questo rischio è particolarmente alto perché il prodotto ha confini hard: privacy, metodologia, output aggregati. Un singolo errore in queste aree non è un bug — è una violazione dell'identità del prodotto.

---

## 1. Strategia

Il piano non è "rifare tutto". KORA ha un'architettura solida — 31 migration, 8079 test, build clean, triple-protection privacy. Riscrivere sarebbe distruggere valore.

La strategia è:

**Congelare il valore esistente.** I documenti CC-00→CC-05 (ARCHITECTURE.md, DATA_MODEL.md, INVARIANTS.md, KORA_PRODUCT_DOCTRINE.md) sono il freeze della comprensione attuale. Qualsiasi sviluppo futuro parte da questa base — non da zero.

**Documentare i confini.** I confini non sono chiari se non sono scritti. `spec/INVARIANTS.md` è la bussola. `ARCHITECTURE.md §12` identifica le no-go zone. Ogni PR che tocca aree sensibili deve citare l'invariante che rispetta o modifica.

**Isolare le ambiguità.** Aree dove lo stato è incerto (migration 025 M025-7 su staging, tipi Supabase drift, Board Pack shell) devono essere identificate e risolte prima di costruire sopra.

**Correggere pattern rischiosi — con priorità.** Non ogni errore ESLint è uguale. Gli 8 `setState` in `useEffect` in Sidebar e company panel sono più urgenti di 23 `require()` nei test. La prioritizzazione è l'arma contro il refactor casuale.

**Aggiungere test prima di toccare il codice.** La regola è: se non esiste un test che cattura il comportamento attuale, non toccare il codice finché non esiste. Questo vale soprattutto per componenti privacy-critical.

**Rendere la demo/client experience più pulita.** Shell pages, label mancanti, componenti con flash visibili — questi danneggiano la percezione prima ancora di qualsiasi analisi tecnica.

**Costruire KORA Link su base gated.** KORA Link v1 entra su `feat/kora-link-v1` con il flag OFF, design doc, data model (034/035), e test prima di qualsiasi codice. Non si fa il contrario.

---

## 2. Priorità P0/P1/P2/P3

### P0 — Safety / Readiness (fai ora, blocca tutto il resto)

Questi item non richiedono coding — richiedono verifica e documentazione.

| Item | Azione | Responsabile | Stato |
|------|--------|-------------|-------|
| Env safety | `.env.local` punta a staging ✅ | Done in CC-00C | ✅ |
| Route auth matrix | Documentare per tutte le 84 route API quale guard viene usata | Claude Code (read-only) | Da fare |
| Migration 025 M025-7 su staging | Verificare se applicata: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='contribution_event'` — 5 colonne? | CTO | Urgente |
| Demo/live/mock gating | Verificare label sintetici su pagine critiche — Board Pack shell | Claude Code | Da fare |
| Migration proposed status | Documentare stato attuale 032/033: READY_FOR_REVIEW, prerequisiti chiari | ✅ Done in DATA_MODEL.md | ✅ |
| Produzione safety | `.env.production.local.backup` gitignored ✅ | Done in CC-00C | ✅ |

### P1 — Technical Credibility (fai entro 30 giorni)

| Item | Cluster | Rischio se non fatto | Claude Code |
|------|---------|---------------------|-------------|
| Fix `setState` sincrono in `useEffect` (8 casi) | RUNTIME-1 | Cascading renders in demo/prod | Sì per casi isolati, pair per Sidebar |
| Fix "component during render" in `app/my-kora/kora-space/page.tsx` | RUNTIME-2 | State reset visibile in demo worker | Sì |
| Fix `react/no-unescaped-entities` (11 casi) | RUNTIME-5 | Warning browser, testo malformato in UI | Sì — meccanico |
| Rimuovere `@ts-ignore` in trial-control-center | RUNTIME-3 | Segnale negativo in code review | Sì |
| Aggiungere label a Board Pack shell | DEMO | Demo danneggiata | Sì |
| Pulizia `eslint-disable` obsoleti (7 warning `None`) | RUNTIME-6 | Direttive false positive confondono | Sì |
| Verifica `COMPANY_ALLOWED_PREFIXES` aggiornato | ARCH | Redirect errati per nuove route | Sì (review) |

### P2 — Test Maturity (fai entro 60 giorni)

| Item | Tool | Perché è importante |
|------|------|-------------------|
| Playwright E2E — 6 golden path | Playwright | Zero E2E è il punto più debole per CTO review |
| RLS negative test (app-layer) | vitest + mock | Verifica che company non ottenga righe personal |
| Route auth test (company/worker/admin) | vitest | Testa che guard rifiutino ruoli sbagliati |
| KORA Index golden path test | vitest | Verifica output completo: 10 componenti, CS, safeguard |
| Worker privacy test (PIB non in company response) | vitest | Invariant test per INV-A04 |
| KORA Space contribution test | vitest | Attribution dual-row, N≥10 threshold |

### P3 — Product Polish (fai entro 90 giorni)

| Item | Impatto |
|------|---------|
| Demo script investor-ready | Riduce varianza nella presentazione |
| Investor demo mode toggle | Nasconde shell pages, mostra solo feature live/preview |
| Client-safe navigation | Sidebar senza link a route incomplete |
| Empty states coerenti | Stato vuoto = design deliberato, non dimenticanza |
| Loading/error states | Ogni async action ha feedback visivo |
| Documentation package CTO | ARCHITECTURE.md + DATA_MODEL.md + spec/ bundlati per review esterna |

---

## 3. Fix Clusters

### Cluster A — ESLint Critical Runtime Fixes

**Obiettivo:** eliminare gli errori ESLint che impattano il comportamento runtime

**File probabili:**
- `components/layout/Sidebar.tsx` — setState in effect
- `app/my-kora/kora-space/page.tsx` — component during render (3 istanze)
- `app/worker/dynamic-cv/_components/DynamicCVClient.tsx` — setState in effect
- `components/hooks/useCountUp.ts` — setState in effect (isolato)
- `components/admin/CompanyWorkspacePanel.tsx` — setState in effect
- `components/commons/AdminBookingModerationSection.tsx` — setState in effect
- Tutti i file con `no-unescaped-entities`

**Rischio:** Medio per Sidebar (chrome condiviso). Basso per componenti admin isolati.

**Test richiesti:** snapshot test before/after per i componenti modificati

**Branch:** `platform/readiness`

**Claude Code:** Sì per casi isolati (useCountUp, unescaped-entities, admin components). No per Sidebar senza pair review.

**Richiede review umana:** Sì per Sidebar.tsx, DynamicCVClient.tsx, CompanyWorkspacePanel.tsx

**Ordine:** (1) useCountUp → (2) unescaped-entities → (3) admin components → (4) Sidebar

---

### Cluster B — Shell/Demo Page Gating

**Obiettivo:** garantire che nessuna route shell appaia come feature live in demo

**File probabili:**
- `app/company/reports/board-pack/page.tsx` — aggiungere label o redirect
- Sidebar.tsx — verificare che route a pagine shell abbiano `comingSoon` o `inactive` flag
- Tutte le route con page.tsx < 30 righe — verifica sistematica

**Rischio:** Basso — solo UI, nessuna logica privacy/metodologica

**Test:** visivo (non automatizzabile facilmente). E2E potrebbe verificare presenza di label.

**Branch:** `platform/readiness`

**Claude Code:** Sì

**Richiede review umana:** No, ma CTO deve approvare la lista finale di route da gating

**Ordine:** (1) verifica sistematica → (2) Board Pack → (3) altri shell

---

### Cluster C — API Route Hardening Backlog

**Obiettivo:** documentare la route auth matrix e identificare gap

**File probabili:**
- Tutti i 84 file `app/api/**/route.ts`
- `lib/auth/kora-session.ts` — funzioni di guard
- `middleware.ts` — `COMPANY_ALLOWED_PREFIXES`

**Rischio:** Nessun cambio runtime in questo cluster — è solo documentazione/audit

**Test:** non applicabile (è una review)

**Branch:** `docs/consolidation`

**Claude Code:** Sì — legge e documenta, non modifica

**Richiede review umana:** Sì — CTO deve approvare la route auth matrix risultante

**Ordine:** (1) lista route → (2) verifica guard per area → (3) documento route-auth-matrix.md → (4) CTO review

---

### Cluster D — E2E Golden Path Setup

**Obiettivo:** configurare Playwright e implementare i 6 golden path E2E

**File probabili (nuovi):**
- `playwright.config.ts`
- `e2e/company-golden-path.spec.ts`
- `e2e/worker-golden-path.spec.ts`
- `e2e/admin-provisioning.spec.ts`
- `e2e/kora-link-token.spec.ts` (futuro)

**Rischio:** Zero per il codebase esistente — aggiunta pura

**Test:** sono i test stessi

**Branch:** `platform/readiness`

**Claude Code:** Sì per setup Playwright e scaffolding spec. No per test che richiedono sessioni reali su staging.

**Richiede review umana:** Sì — i test devono essere validati su staging con sessioni reali

**Ordine:** (1) `npm install @playwright/test` → (2) config → (3) E2E-01 (company → KORA Index) → (4) E2E-03 (worker) → (5) E2E-06 (link token invalid)

**Nota:** E2E con Supabase reale richiede staging aperto e sessioni test dedicate. Configurare `PLAYWRIGHT_BASE_URL=staging URL` nel CI.

---

### Cluster E — Supabase Types Readiness

**Obiettivo:** eliminare il drift tra migrations e `lib/supabase/types.ts`

**File:**
- `lib/supabase/types.ts` — aggiornare campi mancanti (tenant_kind, production_ready*, ip_hash, environment, opening_grade)

**Rischio:** Basso — aggiunta di campi opzionali, non modifica di quelli esistenti

**Test:** tsc clean dopo le modifiche

**Branch:** `platform/readiness`

**Claude Code:** Sì per campi derivabili direttamente dalle migration. No per rimpiazzo totale con types generati (richiede accesso staging).

**Richiede review umana:** Breve — verifica alignment migration ↔ tipi

**Ordine:** (1) leggi ogni migration con ADD COLUMN → (2) aggiorna interfacce TypeScript → (3) tsc --noEmit → (4) verifica

**Post Gate 2:** generare automaticamente con `supabase gen types typescript --project-id haqf****`

---

### Cluster F — KORA Link Pre-Build Gates

**Obiettivo:** definire tutti i prerequisiti prima che inizi l'implementazione di KORA Link v1

**File (nuovi, su `feat/kora-link-v1`):**
- `spec/KORA_LINK_DESIGN.md` — design doc completo
- `supabase/proposed/034_kora_link_schema.sql` — candidato schema (non applicato)
- `supabase/proposed/035_kora_link_rls.sql` — RLS candidata
- `lib/constants/feature-flags.ts` — già presente con `KORA_LINK_ENABLED=false`

**Rischio:** Controllato dal feature flag. Nessun rischio finché `KORA_LINK_ENABLED=false`.

**Test:** INV-C32 verifica che flag OFF = zero funzionalità attiva

**Branch:** `feat/kora-link-v1`

**Claude Code:** Sì per design doc e migration candidate. No per implementazione route pubblica `/link/[token]` senza security review.

**Richiede review umana:** Sì — CTO review migration 034/035. Security review route pubblica. Legal/DPIA per Gate 3.

**Ordine:** (1) design doc → (2) migration candidata 034 → (3) RLS candidata 035 → (4) CTO review → (5) implementazione route con feature flag → (6) E2E-06 test token invalido → (7) security review → (8) staging test → (9) abilitazione flag

---

## 4. Branch Strategy

### Branch correnti e loro scopo

| Branch | Scopo | Cosa può andare | Cosa non può andare |
|--------|-------|----------------|---------------------|
| `main` | Freeze stabile — `value-freeze-v1` | Solo merge reviewati e approvati | Nessun push diretto, nessun force |
| `docs/consolidation` | Documentazione consolidamento | Markdown, spec, docs | Codice runtime, SQL, migrations |
| `platform/readiness` | Fix tecnici e qualità | Cluster A (ESLint), B (shell), C (audit route), D (E2E), E (types) | SQL, RLS, production config |
| `feat/kora-link-v1` | KORA Link v1 | Cluster F (design, migration candidate), stub con flag OFF | Qualsiasi codice attivo con flag ON senza review |

### Regole di merge

```
docs/consolidation → main: PR con CTO review docs, nessun codice runtime
platform/readiness → main: PR con test green, CTO review per fix critici
feat/kora-link-v1 → main: SOLO dopo Gate 3, CTO review, security review
```

### Branch opzionale `fix/eslint-critical`

Se si preferisce tenere i fix ESLint separati da `platform/readiness`, creare `fix/eslint-critical` da `value-freeze-v1`:
```
git checkout -b fix/eslint-critical value-freeze-v1
```
Pro: diff più pulito, più facile da revieware. Contro: un branch in più da gestire. Consiglio: usare `platform/readiness` per semplicità, a meno che i fix ESLint siano molti file contemporaneamente.

---

## 5. No-Go Zones

Aree che non si toccano senza review esplicita CTO + security/privacy (e dove applicabile, legal/DPIA). Non è "difficile da modificare" — è "non si modifica senza processo".

| Area | Perché | Review richiesta |
|------|--------|-----------------|
| **RLS migrations** | Triple protection layer DB — un errore espone dati reali | CTO + Postgres/RLS + security/privacy |
| **Migrations production apply** | Gate 2 aperto — nessuna apply a prod | CTO (Gate 2 closure) |
| **`lib/auth/kora-session.ts`** | Funzioni guard di tutte le route API | CTO + security/privacy |
| **`middleware.ts`** | Protezione a livello route — un errore apre accessi | CTO + security/privacy |
| **Supabase service-role clients** | Bypass RLS — scoped ai 5 moduli documentati | CTO + security/privacy |
| **`personal.*` schema** | Dati individuali worker — massima protezione | Postgres/RLS + legal/DPIA |
| **`lib/kora-engine/`** | Formula IU, 14-stage pipeline, metodologia | CTO + review metodologica |
| **`lib/methodology-config/v0.1.ts`** | Pesi KORA Index — cambia output per tutti i tenant | CTO + founder |
| **Route pubblica KORA Link `/link/[token]`** | Surface di attacco esterna — senza auth | CTO + security/privacy + pen-test |
| **`services/worker-provisioning/`** | Provisioning worker — RLS e identity chain | CTO + Postgres/RLS |
| **Partner EV resolver** | EV determination — impatta formula IU | CTO + review metodologica |
| **`audit.audit_log`** — UPDATE/DELETE | Immutabilità audit trail | CTO + security/privacy |
| **`gov.kip_records`** | Non esiste — non creare mai | CTO + legal + Gate 5 |

---

## 6. 30/60/90 Day Readiness Plan

### 30 giorni — Foundation Consolidation

**Obiettivo:** KORA pronta per review CTO esterna e demo cliente sicura

| Task | Cluster | Branch | Claude Code |
|------|---------|--------|------------|
| Docs package completo (CC-00→CC-06) | — | docs/consolidation | ✅ Done |
| Route auth matrix documentation | C | docs/consolidation | Sì |
| Fix `setState` in effect — isolati (useCountUp, admin) | A | platform/readiness | Sì |
| Fix component during render (`kora-space/page.tsx`) | A | platform/readiness | Sì |
| Fix `no-unescaped-entities` (11 casi) | A | platform/readiness | Sì |
| Rimuovere `@ts-ignore` residuo | A | platform/readiness | Sì |
| Board Pack shell → label o redirect | B | platform/readiness | Sì |
| Verifica label sintetici su demo pages | B | platform/readiness | Sì |
| Aggiornare `lib/supabase/types.ts` campi mancanti | E | platform/readiness | Sì |
| Playwright setup + E2E-01 (company → KORA Index) | D | platform/readiness | Sì (setup) |
| Playwright E2E-03 (worker → My KORA) | D | platform/readiness | Sì (setup) |
| Playwright E2E-06 (link token invalido — 404 generico) | D | platform/readiness | Sì |
| Verifica migration 025 M025-7 su staging | — | — | No (CTO + DB) |
| ESLint critical zero per runtime | A | platform/readiness | Sì (cluster A) |

**Exit criteria 30gg:** ESLint runtime errors < 20 (solo `any` non security-critical), E2E-01 e E2E-03 green su staging, Board Pack labellato, docs package completo e linkato.

---

### 60 giorni — Technical Credibility

**Obiettivo:** KORA pronta per first Pilot client e review esterna sicura

| Task | Cluster | Branch | Claude Code |
|------|---------|--------|------------|
| KORA Link design doc | F | feat/kora-link-v1 | Sì |
| Migration candidata 034 (schema) | F | feat/kora-link-v1 | Sì (proposta) |
| Migration candidata 035 (RLS) | F | feat/kora-link-v1 | Sì (proposta) |
| CTO review 034/035 | F | — | No (CTO) |
| RLS negative test (app-layer) | D | platform/readiness | Sì |
| Route auth test per area company/worker/admin | D | platform/readiness | Sì |
| KORA Index golden path test | D | platform/readiness | Sì |
| Worker privacy test (PIB non in company response) | D | platform/readiness | Sì |
| KORA Space contribution test | D | platform/readiness | Sì |
| Partner accreditation design review | — | docs/consolidation | Sì (docs) |
| Contribution idempotency test (mock) | D | platform/readiness | Sì |
| Apply migration 025 M025-7 a staging | — | — | No (CTO + DB) |
| Apply migration 032/033 a staging | — | — | No (CTO + DB) |
| `supabase gen types typescript` da staging | E | platform/readiness | Con accesso staging |

**Exit criteria 60gg:** RLS negative test green, 5+ E2E golden path green su staging, KORA Link design doc approvato da CTO, 032/033 applicati a staging.

---

### 90 giorni — Pilot Readiness

**Obiettivo:** KORA pronta per primo cliente Pilot+ con dati reali

| Task | Branch | Responsabile |
|------|--------|-------------|
| CTO/security review completo | — | CTO esterno |
| DPIA (Data Protection Impact Assessment) | — | Legal/DPO |
| Pen-test route pubblica KORA Link | — | Security esterno |
| Gate 3 closure (legal/privacy) | — | Legal + CTO |
| Primo client Pilot+ onboarding | — | Team |
| Investor tech package (docs + demo + review) | docs/consolidation | Claude Code |
| ESLint zero errori runtime | platform/readiness | Claude Code |
| E2E full suite (6 golden path) su staging | platform/readiness | Claude Code + CTO validate |
| KORA Link v1 — feature flag ON su staging | feat/kora-link-v1 | CTO sign-off |
| Methodology calibration baseline | — | Founder + metodologia |

**Exit criteria 90gg:** Gate 3 chiuso, DPIA completata, pen-test passato, Pilot+ client attivo su staging, KORA Link testabile su staging con flag ON.

---

## 7. Success Criteria

Criteri misurabili — verificabili senza soggettività.

| Criterio | Come verificare | Target |
|----------|----------------|--------|
| ✅ TypeScript clean | `tsc --noEmit` = 0 errori | Mantenuto |
| ✅ Test green | `vitest run` = 0 failure | Mantenuto ≥8079 |
| 🎯 ESLint runtime critical zero | `npx eslint . --ext .ts,.tsx` errori non-`any` = 0 | 30 giorni |
| 🎯 E2E golden path present | Playwright: E2E-01, E2E-03, E2E-06 green su staging | 30 giorni |
| 🎯 Demo/live/mock labeled | Verifica visiva: ogni pagina shell/preview ha label visibile | 30 giorni |
| 🎯 No production env locale | `.env.local` punta a staging = `haqf****` | ✅ Mantenuto |
| 🎯 No real data in dev | `data/synthetic/` = unica source per demo | ✅ Mantenuto |
| 🎯 Route auth matrix complete | `docs/ROUTE_AUTH_MATRIX.md` con 84 route documentate | 30 giorni |
| 🎯 CTO package complete | `ARCHITECTURE.md` + `DATA_MODEL.md` + `spec/` bundlati e reviewati | 30 giorni |
| 🎯 KORA Link gated behind flag | `KORA_LINK_ENABLED=false` default — zero codice attivo senza flag | ✅ Mantenuto |
| 🎯 Migration 025 M025-7 su staging | Constraint `uq_contribution_external` a 5 colonne verificato | 30 giorni (CTO) |
| 🎯 Playwright installato | `npx playwright --version` OK | 30 giorni |
| 🎯 ESLint any in runtime < 20 | Solo `any` non-security (JSONB, diagnostics) | 60 giorni |
| 🎯 5 E2E golden path green | E2E-01 → E2E-05 su staging | 60 giorni |
| 🎯 KORA Link design doc approvato | CTO sign-off su 034/035 migration candidate | 60 giorni |
| 🎯 RLS negative test | vitest: company → personal.* = 0 righe | 60 giorni |
| 🎯 Gate 3 closed | Legal sign-off + DPO review | 90 giorni |
| 🎯 DPIA completata | Documento formale approvato | 90 giorni |
| 🎯 Pen-test passato | Nessuna finding critica su route pubblica KORA Link | 90 giorni |

---

*Vibecoding Risk Reduction Plan — CC-06 · Branch `docs/consolidation`*
*Aggiornare questo documento dopo ogni sprint che completa un cluster.*
*Il piano è uno strumento operativo — non un contratto. Adattare se il contesto cambia.*
