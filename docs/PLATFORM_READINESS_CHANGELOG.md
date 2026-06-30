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

*Aggiornare questo documento dopo ogni CC-XX che tocca `platform/readiness`.*
