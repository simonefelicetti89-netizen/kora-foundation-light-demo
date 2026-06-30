# KORA — Technical Debt Map

**Branch:** `docs/consolidation`
**Versione:** CC-06 · 2026-06-30
**Dati rilevati da:** analisi statica del codebase — nessuna connessione a DB, nessuna modifica

---

## 1. Executive Summary

**Stato generale:** KORA è una piattaforma con un'architettura solida e un debito tecnico gestibile. Il core engine e l'infrastruttura di sicurezza sono production-grade. Il debito si concentra in aree di qualità del codice e copertura test — non in vulnerabilità strutturali.

**Cosa è solido:**
- TypeScript compila senza errori (`tsc --noEmit` clean)
- 8079/8079 test passanti — ampia copertura vitest (186 file unit + 5 integration)
- Build Next.js pulita (161 route)
- Architettura triple-protection privacy (RLS + service layer + access matrix) coerente
- Middleware di protezione route robusto (`middleware.ts` con `canAccess()`)
- Route API con commenti architetturali chiari e guard esplicite (`requireCompanyUser`, `requireWorkerUser`)
- Nessun segreto tracciato in git

**Cosa è fragile:**
- 206 problemi ESLint (118 errori, 88 warning) — quasi tutti in aree non-runtime-critical o in test
- 8 casi `setState` sincrono in `useEffect` — anti-pattern React che può causare cascading renders
- 3 casi "cannot create components during render" — source di state loss silenzioso
- Alcuni file molto grandi (>1000 righe) — rischio di accoppiamento implicito
- `lib/supabase/types.ts` hand-written — drift silenzioso con migrations

**Cosa può danneggiare una demo cliente:**
- Pagine shell senza label chiara (alcune route `/admin/` molto brevi)
- Direct JSON import in `app/demo/page.tsx`, `app/page.tsx`, `components/demo/` — accettabile in demo, ma non in live
- `app/my-kora/kora-space/page.tsx` — componente creato durante render (può causare flash/reset stato visibile)

**Cosa può preoccupare un CTO/investitore:**
- 94 errori ESLint runtime (ma 70 sono `any` e 11 `unescaped-entities` — non security risks)
- Zero E2E browser test (Playwright assente)
- `lib/supabase/types.ts` non generato automaticamente — rischio drift schema

**Cosa è bloccante per dati reali:**
- Migration 025 M025-7 non applicata a staging (prerequisito per 032/033)
- Gate 2 OPEN — blocca apply migrations a produzione
- Gate 3 OPEN — blocca dati reali worker/aziende

**Cosa non è bloccante ora:**
- ESLint warning (81 no-unused-vars in test — non impattano build)
- File grandi — leggibilità, non correttezza
- Tipi `any` in layer admin/diagnostics — non esposti a path company/worker

---

## 2. Quality Baseline

| Metrica | Valore | Stato |
|---------|--------|-------|
| TypeScript (`tsc --noEmit`) | 0 errori | 🟢 CLEAN |
| Test suite (vitest) | 8079/8079 passing, 191 file | 🟢 VERDE |
| Build Next.js | OK, 161 route | 🟢 VERDE |
| ESLint totale | 206 problemi (118 errori, 88 warning) | 🟡 GIALLO |
| ESLint runtime | 94 errori, 53 warning | 🟡 GIALLO |
| ESLint test | 24 errori, 35 warning | 🟡 GIALLO (solo test) |
| Route buildate | 161 | 🟢 |
| E2E browser test | 0 (nessun Playwright/Cypress) | 🔴 ASSENTE |
| Supabase local | Non disponibile (Docker assente) | 🔴 |
| Supabase staging | `haqf****` — `.env.local` punta a staging | 🟢 SAFE |
| Env safety | `.env.local` staging, prod in backup gitignored | 🟢 |
| TODOs nel runtime | 9 occorrenze (3 metodologia, 3 seed, 2 SDK, 1 Gate 3) | 🟡 |
| eslint-disable runtime | ~15 occorrenze | 🟡 |
| `@ts-ignore` runtime | 1 (onMouseOver undefined in trial-control-center) | 🟡 |

---

## 3. ESLint Debt

### 3a. Distribuzione per regola

| Regola | Errori | Warning | Tipo | Area primaria |
|--------|--------|---------|------|---------------|
| `@typescript-eslint/no-unused-vars` | 0 | 81 | Warning | Test (70%) + runtime (30%) |
| `@typescript-eslint/no-explicit-any` | 70 | 0 | Error | Runtime: admin, diagnostics, engine |
| `@typescript-eslint/no-require-imports` | 23 | 0 | Error | Test files (require() invece di import) |
| `react/no-unescaped-entities` | 11 | 0 | Error | UI componenti — apostrofi/virgolette non escaped |
| `react-hooks/set-state-in-effect` | 8 | 0 | Error | Anti-pattern rendering |
| `react-hooks/static-components` | 3 | 0 | Error | Component during render |
| `@typescript-eslint/ban-ts-comment` | 1 | 0 | Error | `@ts-ignore` residuo |
| `react-hooks/preserve-manual-memoization` | 1 | 0 | Error | Memoization incoerente |
| `prefer-const` | 1 | 0 | Error | Triviale |
| `None` (unused eslint-disable) | 0 | 7 | Warning | Direttive disable obsolete |

### 3b. Cluster critici

#### Cluster RUNTIME-1 — `setState` sincrono in `useEffect` (8 casi)
**Rischio: ALTO — può causare cascading renders e loop**

| File | Impatto | Fix sicuro | Review umana |
|------|---------|-----------|--------------|
| `components/layout/Sidebar.tsx` | Chrome condiviso — visible su ogni route | Medio (refactor logica init) | Sì |
| `app/admin/companies/new/_components/CreateLiveCompanyForm.tsx` | Modulo admin | Basso | Sì |
| `app/admin/impact-units/_components/ImpactUnitsExplorer.tsx` | Admin diagnostics | Basso | Sì |
| `app/worker/dynamic-cv/_components/DynamicCVClient.tsx` | Worker privacy area | Medio | Sì |
| `components/admin/AdminSubmissionQueue.tsx` | Admin area | Basso | Sì |
| `components/admin/CompanyWorkspacePanel.tsx` | Company area | Medio | Sì |
| `components/commons/AdminBookingModerationSection.tsx` | Moderation area | Basso | Sì |
| `components/hooks/useCountUp.ts` | Hook generico animazione | Basso (isolato) | No |

**Fix pattern:** spostare setState dentro la callback dell'effect o usare `useReducer`. Non è una riscrittura — è una correzione localizzata. Priorità: **Sidebar** per primo (chrome condiviso).

**Claude Code:** Sì per i casi isolati (useCountUp). Sì per admin/diagnostics con review. No per Sidebar e componenti company senza pair review.

#### Cluster RUNTIME-2 — Components created during render (3 casi)
**Rischio: MEDIO-ALTO — causa state reset invisibile in produzione**

| File | Dove | Impatto |
|------|------|---------|
| `app/my-kora/kora-space/page.tsx` | 3 componenti definiti durante render (righe 340, 524, 565) | Worker Space — flash/reset stato visibile in demo |

**Fix:** estrarre i 3 componenti a livello modulo (fuori dalla funzione page). Fix meccanico, basso rischio. Verificare che estrarre non rompa closure necessarie.
**Claude Code:** Sì, con test prima/dopo.

#### Cluster RUNTIME-3 — `no-explicit-any` (70 casi, 0 in test)
**Rischio: BASSO-MEDIO — non security risk, ma type safety gap**

I 70 casi si concentrano in:
- `app/admin/platform/diagnostics/live-spine/page.tsx` (6+ casi con eslint-disable)
- `lib/scoring-result/index.ts` (commento TODO LiveRow cast)
- `app/admin/trial-control-center/page.tsx` (2 casi con eslint-disable)
- `app/admin/commons/page.tsx` (3 casi con eslint-disable)
- File `services/` (vari — JSONB payload handling)

**Priorità reale:** i `any` in aree diagnostics admin hanno impatto limitato (non esposti a company/worker). I `any` in services che gestiscono payload KORA Index sono più rilevanti.
**Claude Code:** Sì per casi banali (JSONB typing). No per `lib/scoring-result/` senza CTO review.

#### Cluster TEST-4 — `no-require-imports` (23 casi, tutti in test)
**Rischio: BASSO — non impatta runtime, sono test files**

`require()` usato in test per dynamic import o per read files. Non è un errore runtime. Fix meccanico: convertire a `import` ESM o usare `await import()`.
**Claude Code:** Sì — fix puramente stilistico nei test.

#### Cluster RUNTIME-5 — `react/no-unescaped-entities` (11 casi)
**Rischio: BASSO — solo rendering HTML errato di apostrofi/virgolette**

Apostrofi (`'`) e virgolette (`"`) non escaped in JSX. Può causare warning browser ma non crash. Fix: `&apos;`, `&quot;`, o template literal.
**Claude Code:** Sì — fix meccanico, nessun rischio logico.

#### Cluster RUNTIME-6 — `react-hooks/exhaustive-deps` (4 eslint-disable)
**Rischio: MEDIO — dependency array manuale può causare stale closure**

4 `eslint-disable-next-line react-hooks/exhaustive-deps` nel runtime. Ogni caso è una decisione deliberata ma non documentata. Richiedono verifica one-by-one.
**Claude Code:** No — richiedono comprensione del ciclo di vita del componente.

---

## 4. Type Safety Debt

### `as any` e cast pericolosi

| Area | Pattern | Rischio | Nota |
|------|---------|---------|------|
| `lib/scoring-result/index.ts` | `LiveRow cast` — TODO residuo | Medio | Supabase multi-schema join non tipizzato |
| `services/*` JSONB payload | `any` per payload JSONB non tipizzato | Medio | `factor_trace`, `components`, `payload` JSONB |
| `app/admin/platform/diagnostics/` | 6+ `any` con eslint-disable | Basso | Diagnostics admin — non in path company |
| `app/admin/commons/page.tsx` | 3 `any` con eslint-disable | Basso | Admin-only |
| API route responses | `NextResponse.json({ data: any })` | Medio | Rischio se schema evolve |

### Tipi Supabase — drift risk

`lib/supabase/types.ts` è hand-written (542 righe, 19 interfacce). Le migration aggiungono colonne (014, 021, 024, 028) che potrebbero non essere riflesse nei tipi.

**Gap identificati:**
- `TenantRow` — mancano `tenant_kind` (mig 014), `production_ready*` (mig 021)
- `AuditLogRow` — mancano `environment`, `ip_hash`, `user_agent_hash` (mig 028)
- `CommonPost` — mancano `opening_grade`, geolocation fields (mig 024)
- `CommonContributionEvent` — M025-6 fields (`source_type`, `event_type`, `is_cross_company`, etc.) da verificare
- Schema `commons.*`, `network.*` — copertura parziale

**Rischio:** `undefined` silenzioso dove ci si aspetta un campo. Non è un crash immediato ma può causare comportamento inatteso in logic che dipende da `tenant_kind` o `production_ready`.

### Tipi in KORA Engine

`lib/kora-engine/` usa interfacce interne ben definite (IU formula, pillar types). Rischio basso — il tsc è clean. I tipi JSONB (`components`, `macroblocks` in `kora_index_result`) sono `Json` generico — necessità di Zod schema per parse runtime.

---

## 5. Runtime Architecture Debt

### File molto grandi (potenziale accoppiamento)

| File | Righe | Problema |
|------|-------|---------|
| `app/company/data/upload/page.tsx` | 3292 | Massimo — business logic + UI mescolati |
| `lib/decision-pack/html-template.ts` | 2707 | Template HTML inline gigante |
| `lib/types/index.ts` | 1972 | Barrel file unico per tutti i tipi |
| `app/admin/data-intake/_components/DataIntakeStudio.tsx` | 1666 | Componente monolitico |
| `services/my-kora-preview/MyKoraPreviewService.ts` | 1168 | Service molto lungo |
| `services/report-generator/ReportGeneratorService.ts` | 1110 | Generazione report monolitica |
| `services/kora-contribution/KoraContributionService.ts` | 1027 | Logica Contribution complessa |

**Priorità refactor:** nessuna urgente. I file grandi non causano bug — riducono leggibilità. Non toccare prima di avere test copertura adeguata.

### Accesso diretto a seed JSON in componenti

| File | Import diretto | Valutazione |
|------|---------------|-------------|
| `app/demo/page.tsx` | `kora-index-outputs.json` | Accettabile in demo page |
| `app/page.tsx` | `kora-index-outputs.json`, `company-aggregates.json` | Da valutare — root page |
| `app/demo/gtm/page.tsx` | `kora-index-outputs.json` | Accettabile in demo |
| `components/demo/DemoGuideContent.tsx` | `kora-index-outputs.json` | Accettabile in demo component |

**Valutazione:** le demo pages importano direttamente JSON sintetici — comportamento atteso per Foundation Light. Non viola gli invarianti perché sono route `/demo/` e `/` (landing), non company/worker workspace. Non è un debito critico, ma la root `app/page.tsx` merita attenzione se diventa landing per clienti reali.

### Pattern architetturali da segnalare

- **`eslint-disable-next-line react-hooks/exhaustive-deps`** in 4 punti runtime — dependency manuale non documentata
- **TODO residui (9):** 3 relativi a seed dati S2, 3 metodologici, 2 SDK, 1 Gate 3 strategy — nessuno critico
- **`@ts-ignore` (1):** in `admin/trial-control-center/page.tsx` su `onMouseOver` — triviale, da rimuovere
- **eslint-disable totali runtime:** ~15 — la maggior parte `any` in diagnostics admin

---

## 6. Security/Privacy Debt

### Route API — guard model

Le 84 route API usano due meccanismi di protezione:
1. **`lib/auth/kora-session.ts`** — `requireWorkerUser()`, `requireCompanyUser()`, `requireKoraAdmin()` — used esplicitamente nei route handler
2. **`middleware.ts`** — protezione a livello route prefix con `canAccess()` e redirect

**Osservazione dal grep "grep -c canAccess|getSession|auth":** le route mostrano 0 match perché usano `requireWorkerUser()` / `requireCompanyUser()` (funzioni di `kora-session`) — non la chiamata diretta a `canAccess()`. Questo è il pattern corretto per Next.js App Router.

**Aree da verificare (non blocchi, ma da documentare):**
- Route `app/api/auth/logout/route.ts` — nessuna guard visibile nel grep, ma logicamente non deve averne (è il logout)
- Route `company/data-submissions/*` — pattern di guard da verificare in code review

### Middleware

`middleware.ts` è ben strutturato:
- Aggiorna sessione Supabase cookie
- Redirect per role out-of-bounds (COMPANY vs WORKER vs ADMIN)
- `COMPANY_ALLOWED_PREFIXES` lista esplicita di path ammessi
- Dipende da `canAccess()` dell'access matrix

**Rischio:** se un nuovo path viene aggiunto senza aggiungerlo a `COMPANY_ALLOWED_PREFIXES`, COMPANY_ADMIN potrebbe essere redirectato anche se il path è legittimo. Non è un security risk (redirect conservativo) ma è un debito operativo.

### Logging potenzialmente rischioso

`audit.audit_log` usa `ip_hash` (SHA-256) da migration 028 — ma il codice applicativo deve ancora migrare da `ip_address raw` a `ip_hash`. Da verificare in `lib/auth/audit-logger.ts` o equivalente.

### Worker PII in scope admin

`app/admin/impact-units/_components/ImpactUnitsExplorer.tsx` ha `setState` in effect — componente che accede a dati IU. Da verificare che l'explorer non esporti accidentalmente `pseudonym_id` in logging o debug output.

---

## 7. Data/Model Debt

### Migration pending/proposed

| Migration | Stato | Prerequisito | Rischio |
|-----------|-------|-------------|---------|
| 025 REVISED (M025-7) | Scritta, **DA APPLICARE A STAGING** | Prerequisito per 032/033 | ALTO se 032/033 vanno su staging con constraint vecchio |
| 032 (contribution_atomic) | PROPOSED — READY_FOR_REVIEW | 025 M025-7 applicata | Bloccante per attribution atomica |
| 033 (initiative_adoption) | PROPOSED — READY_FOR_REVIEW | 025 M025-7 + 032 | Bloccante per Contribution V2 adoption |
| 034 (KORA Link schema) | NON SCRITTA | CTO review, Gate 3 | N/A ora |
| 035 (KORA Link RLS) | NON SCRITTA | 034 | N/A ora |

**Rischio principale:** se 032 viene applicata a staging prima di 025 M025-7, il constraint `uq_contribution_external` ha la forma a 3 colonne (vecchia) e la funzione 032 che usa ON CONFLICT sulla constraint a 5 colonne fallirebbe.

### Schema/types drift

19 interfacce TypeScript hand-written vs ~26+ tabelle migrate. Campi mancanti certi: `tenant_kind`, `production_ready*`, `environment`/`ip_hash`/`user_agent_hash`, `opening_grade`. Nessuno è un bug immediato ma aumenta il rischio di `undefined` silenzioso.

### Contribution idempotency

Migration 025 M025-7 ha espanso `uq_contribution_external` a 5 colonne per supportare multi-period reporting. La funzione 032 usa `ON CONFLICT ON CONSTRAINT uq_contribution_external DO NOTHING`. Se la constraint non è aggiornata, i conflitti potrebbero non essere gestiti correttamente.

### Worker PIB — staging dependency

`personal.worker_pib` è definita in migration 018. Dipende da `personal.worker_participation` (FK `source_participation_id`). La catena completa richiede che le migration 016-019 siano applicate in ordine su staging. Stato staging: sconosciuto senza query diretta.

---

## 8. Product/Demo Debt

### Pagine shell e route brevi

Alcune route hanno page.tsx molto breve (≤30 righe effettive), che può indicare contenuto placeholder o shell non completata:

| Route | Categoria | Rischio demo |
|-------|-----------|-------------|
| `app/company/reports/board-pack/` | Shell non completata | Medio — link da company reports ma pagina vuota |
| `app/admin/companies/[id]/evidence/` | Admin shell | Basso — admin-only |
| `app/admin/companies/[id]/submissions/` | Admin shell | Basso |
| `app/admin/companies/[id]/workspace/` | Admin shell | Basso |
| `app/admin/platform/diagnostics/` | Admin diagnostics | Basso |

### Aree che danneggiano credibilità in demo

1. **Board Pack** (`/company/reports/board-pack/`) — se linkato dalla navigation e arriva su pagina vuota, il CTO percepisce funzionalità promessa ma non consegnata
2. **`app/my-kora/kora-space/page.tsx`** — 3 componenti creati durante render → possibile flash/reset in demo live worker
3. **Label "sintetico"** — le demo page non mostrano sempre chiaramente che i dati sono sintetici (solo in alcune)
4. **`app/demo/future-vision/page.tsx`** — contiene label corretta ("ESPLORAZIONE METODOLOGICA · NON ATTIVI") ma la navigazione verso questa pagina deve essere chiaramente disambiguata

### Navigation consistency

`Sidebar.tsx` usa `comingSoon`, `inactive`, `preview` flag per gestire stati navigazione — pattern corretto. Il debito è che alcune route arrivano a pagine shell senza questi flag attivati nella sidebar.

---

## 9. Testing Debt

### Copertura attuale

| Area | Test | Qualità |
|------|------|---------|
| KORA Engine (scoring, IU, BTI, safeguard) | ✅ Estesa | Buona — vitest |
| Methodology config | ✅ | Buona |
| Auth/session pattern | ✅ (b104, b106, b112) | Buona |
| Worker provisioning | ✅ (b104) | Buona |
| Company workspace live binding | ✅ (b105) | Buona |
| Privacy boundary | ✅ (b109b) | Buona |
| RLS (negative test) | ⚠️ Limitata | Solo app-layer, non DB-layer |
| Route API auth | ⚠️ Parziale | Integration test esistenti |
| E2E browser | ❌ Assente | Zero Playwright/Cypress |
| Contribution idempotency | ⚠️ Limitata | Logica attribution test parziali |
| KORA Link flow | ❌ Assente | Feature non implementata |
| Tenant isolation cross-tenant | ⚠️ | App-layer, non DB-query |

### Golden path E2E minimi proposti (da implementare)

| ID | Flow | Perché è critico |
|----|------|-----------------|
| E2E-01 | Company login → `/company/workspace` → KORA Index display | Happy path principale — 90% delle demo |
| E2E-02 | Company → `/company/commons` → iniziativa cross-company | KORA Space — feature in attivo sviluppo |
| E2E-03 | Worker login → `/worker/workspace` → My KORA overview | Worker flow — privacy guarantee |
| E2E-04 | Worker → `/my-kora/kora-space` → booking iniziativa | Worker KORA Space — componente con bug render |
| E2E-05 | Admin → provisioning worker → worker attiva account | Onboarding flow — critico per Pilot+ |
| E2E-06 | `/link/[token]` → invalid token → errore generico | KORA Link — security test route pubblica |

---

## 10. Investor/CTO Perception Risk

| Finding | CTO vede | Investitore vede | Rischio "vibecoding" | Correzione consigliata | Priorità |
|---------|----------|-----------------|---------------------|----------------------|---------|
| Zero E2E test | "Come verificate i golden path in produzione?" | "Come garantite qualità?" | ALTO | Playwright E2E per i 6 golden path | P1 |
| 94 errori ESLint runtime | "Il build è pulito ma ci sono pattern problematici" | "Ci sono bug nel codice?" | MEDIO | Fix cluster RUNTIME-1/2/5 | P1 |
| `setState` in `useEffect` (8 casi) | "Anti-pattern React — cascading renders in produzione" | N/A | ALTO | Fix Sidebar per primo | P1 |
| File 3292 righe (upload page) | "File ingestibile — impossibile mantenere" | N/A | ALTO | Split graduale (non urgente) | P2 |
| `lib/supabase/types.ts` hand-written | "Drift silenzioso schema → tipi" | N/A | MEDIO | `supabase gen types` post Gate 2 | P2 |
| Board Pack page vuota | N/A | "Avete detto che questo funziona" | CRITICO demo | Aggiungere label/placeholder | P0 |
| TODO residui (9) | "Debito non gestito" | N/A | BASSO | Cleanup sprint dedicato | P3 |
| `@ts-ignore` (1) | "Workaround non documentato" | N/A | BASSO | Rimuovere o documentare | P1 |
| Direct JSON import in app/page.tsx | "La root page legge dati sintetici direttamente?" | N/A | MEDIO | Refactor via service se live | P2 |
| 23 `require()` in test | "Stile misto ESM/CJS nei test" | N/A | BASSO | Fix meccanico nei test | P3 |
