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

*Aggiornare questo documento dopo ogni CC-XX che tocca `platform/readiness`.*
