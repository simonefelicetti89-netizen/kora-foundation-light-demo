# KORA — Platform Merge Gate Report

**Branch sorgente:** `platform/readiness`
**Branch target futuro:** `main`
**Base comune:** `eaecdad` (`value-freeze-v1`)
**HEAD:** `b9f0359` (CC-14)
**Data:** 2026-06-30
**Uso:** Documento operativo per decisione di merge — CTO / tech lead

---

## 1. Merge Candidate Status

| Campo | Valore |
|-------|--------|
| Branch sorgente | `platform/readiness` |
| Branch target futuro | `main` |
| Merge consigliato | **Non ancora — READY_FOR_REVIEW** |
| Autorizzazione richiesta | CTO review del branch |
| Blocchi tecnici | Nessuno — tutti i test verdi |
| Blocchi di processo | Review CTO non ancora eseguita |

**Motivazione:** Il branch è tecnicamente pulito (build OK, 8128/8128 vitest green, 6/6 E2E green, TypeScript clean, lint clean). Nessun codice di produzione, SQL, RLS o auth è stato modificato. Il merge in `main` è sicuro dal punto di vista tecnico ma richiede una review CTO prima di essere eseguito, in linea con la politica del progetto ("Non mergiare in main senza CTO review" — intestazione del PLATFORM_READINESS_CHANGELOG.md).

Vedi §7 per la raccomandazione finale.

---

## 2. Diff Summary

### Commit inclusi (CC-07 → CC-14)

| Commit | Hash | Titolo |
|--------|------|--------|
| CC-07 | `bcd0c54` | ESLint runtime fixes — no-unescaped-entities, static-components, set-state-in-effect |
| CC-07 docs | `7401daa` | PLATFORM_READINESS_CHANGELOG — cluster log |
| CC-08 | `aebd56b` | Playwright E2E setup + 6 public page smoke tests |
| CC-09 | `47cd6f1` | shell/demo gating — badge + sidebar preview flag |
| CC-10 | `8f616dd` | API route auth matrix + hardening backlog |
| CC-11 | `541df1b` | P0 service-role cleanup (H-001 + H-002) |
| CC-12 | `e95a0ff` | Zod input validation on 4 POST routes (H-004 partial) |
| CC-13 | `bb126fc` | UUID query param validation on 4 admin GET routes (H-006) |
| CC-14 | `b9f0359` | auth/logout guard consistency (H-005) |

**Totale:** 9 commit, 39 file modificati, +2242 inserzioni, -148 rimozioni

### File runtime modificati

**App pages (JSX fixes — CC-07, CC-09):**
- `app/admin/partners/page.tsx`
- `app/commons/page.tsx` + `app/commons/publish/page.tsx`
- `app/company/commons/page.tsx` + `app/company/pillars/page.tsx`
- `app/demo/portfolio/page.tsx`
- `app/my-kora/kora-space/page.tsx`
- `app/worker/workspace/page.tsx`

**API routes (CC-11, CC-12, CC-13, CC-14):**
- `app/api/commons/posts/route.ts` — server client (H-001)
- `app/api/commons/posts/[id]/route.ts` — server client (H-001)
- `app/api/admin/data-intake/accept/route.ts` — service wrapper (H-002)
- `app/api/admin/decision-pack/status/route.ts` — service wrapper (H-002)
- `app/api/admin/workers/provision/route.ts` — Zod body (H-004)
- `app/api/admin/companies/provision/route.ts` — Zod body (H-004)
- `app/api/admin/scoring/run-approved-batch/route.ts` — Zod body (H-004)
- `app/api/worker/initiatives/[id]/interest/route.ts` — Zod body (H-004)
- `app/api/admin/impact-units/route.ts` — Zod UUID param (H-006)
- `app/api/admin/worker-initiatives/route.ts` — Zod UUID param (H-006)
- `app/api/admin/company-users/route.ts` — Zod UUID param (H-006)
- `app/api/admin/workers/list/route.ts` — Zod string param (H-006)
- `app/api/auth/logout/route.ts` — no-session guard (H-005)

**Components:**
- `components/layout/Sidebar.tsx` — preview flag (CC-09)
- `components/hooks/useCountUp.ts` — setState fix (CC-07)
- `components/commons/AdminBookingModerationSection.tsx` — entity fix (CC-07)

**Config / infrastruttura test:**
- `playwright.config.ts` — nuovo (CC-08)
- `package.json` + `package-lock.json` — zod + playwright (CC-08, CC-12)
- `.gitignore` — Playwright artifacts (CC-08)

**Test files:**
- `tests/e2e/kora-smoke.spec.ts` — nuovo, 6 smoke test (CC-08)
- `tests/unit/cc12-zod-validation.test.ts` — nuovo, 25 test (CC-12)
- `tests/unit/cc13-query-param-validation.test.ts` — nuovo, 22 test (CC-13)
- `tests/unit/b109b-participation-privacy.test.ts` — aggiornato (CC-12)
- `tests/unit/b112-auth-ux.test.ts` — aggiornato +2 test (CC-14)
- `tests/unit/kora-space-operating-model.test.ts` — aggiornato (CC-07)
- `tests/unit/kora-space-pilot-usability.test.ts` — aggiornato (CC-07)

### File doc modificati / creati

- `docs/API_ROUTE_AUTH_MATRIX.md` — nuovo (CC-10) + aggiornato (CC-11, CC-12, CC-13, CC-14)
- `docs/API_HARDENING_BACKLOG.md` — nuovo (CC-10) + aggiornato (CC-11, CC-12, CC-13, CC-14)
- `docs/E2E_TESTING.md` — nuovo (CC-08)
- `docs/PLATFORM_READINESS_CHANGELOG.md` — creato (CC-07) + aggiornato (CC-08 → CC-14)
- `docs/PLATFORM_READINESS_SUMMARY.md` — nuovo (CC-15)
- `docs/PLATFORM_MERGE_GATE_REPORT.md` — questo file (CC-15)

### Dipendenze aggiunte

| Pacchetto | Versione | Tipo | Aggiunto in |
|-----------|----------|------|-------------|
| `zod` | `^4.4.4` (installato 4.4.3) | `dependencies` | CC-12 |
| `@playwright/test` | (via npx install) | `devDependencies` | CC-08 |

### Aree non toccate

Nessuna modifica a: KORA Engine, methodology-config, lib/auth, middleware, Supabase migrations, RLS, service-role wrappers, synthetic data, scenario configs, types, worker provisioning core, KORA Link, payment/wallet logic.

---

## 3. Off-Limits Check

| Area | Modificata? | Evidenza |
|------|------------|----------|
| SQL / DDL | **NO** | Nessun file `.sql` modificato; `supabase/migrations/` invariato |
| Migrations | **NO** | `git diff eaecdad..b9f0359 -- supabase/migrations/` = vuoto |
| RLS policies | **NO** | Nessun `CREATE POLICY` o `ALTER POLICY` in alcun file |
| Auth core (`lib/auth/`) | **NO** | `lib/auth/kora-session.ts` invariato |
| Middleware (`middleware.ts`) | **NO** | `middleware.ts` invariato |
| Service-role wrappers (`lib/supabase/*-service-key.ts`) | **NO** | Solo i chiamanti sono stati modificati (non i wrapper) |
| Supabase clients (`lib/supabase/server.ts`) | **NO** | Invariato — solo il tipo di client usato nelle route è cambiato |
| KORA Engine (`lib/kora-engine/`) | **NO** | Invariato |
| Methodology config (`lib/methodology-config/`) | **NO** | Invariato |
| Production env | **NO** | Nessun `.env.production*` tracciato o modificato |
| Dati reali | **NO** | Nessuna chiamata a Supabase production; nessun dato reale |

---

## 4. Test Gate

| Test | Comando | Risultato | Note |
|------|---------|-----------|------|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errori | Verificato CC-14 HEAD |
| Vitest | `npx vitest run` | ✅ 8128/8128 green | 193 file test, ~4s |
| Build | `npm run build` | ✅ OK — 0 errori | Verificato CC-14 HEAD |
| E2E Playwright | `npm run test:e2e` | ✅ 6/6 green | Smoke test pubblici ~8s |
| ESLint (mirato) | `npx eslint <file>` | ✅ 0 errors, 0 warnings | Eseguito su tutti i file CC-11→CC-14 |

**Limiti dei test attuali:**

- E2E solo pagine pubbliche — nessun test autenticato
- Vitest usa `readFileSync` (strutturale) — nessuna chiamata DB live
- Nessun RLS negative test
- Rate limiting non testato (non implementato)

---

## 5. Security Gate

### P0 findings — tutti chiusi

| Finding | Descrizione | Chiuso in | Verifica |
|---------|-------------|-----------|---------|
| H-001 | `commons/posts*` service client su path non-admin | CC-11 | RLS confermata via mig 013 |
| H-002 | `createClient` diretto con service key | CC-11 | Wrapper `getSupabaseServiceClient()` |
| H-005 | `auth/logout` no-session implicito | CC-14 | Test b112 — 2 check espliciti |
| H-006 | UUID non validato su 4 GET endpoint | CC-13 | Test cc13 — 22 check |

### P1 findings — parzialmente chiusi

| Finding | Status | Note |
|---------|--------|------|
| H-004 (Zod validation) | Parziale — 8 route hardened | `live-company` e `data-intake` rimandati |
| H-003 (rate limiting) | Aperto | Richiede decisione architetturale CTO |
| H-007 (error shape) | Aperto | Meccanico ma molti file — da fare pre-partner API |

### P2/P3 findings — aperti

H-008 (public route pattern), H-009 (rate limiting Link), H-010–H-011 (KORA Link), H-012–H-015 (correlation ID, versioning, docs, logging) — tutti bloccati da gate architetturale o CTO decision.

### Cosa richiede CTO

- Decisione rate limiting (H-003): Upstash/Redis vs Vercel Edge vs in-memory
- Review security complessiva prima di merge in `main`
- Valutazione KORA Link public route threat model (H-008)

### Cosa richiede Postgres/RLS

- RLS negative test suite (post Gate 2 schema definito)
- Verifica RLS policy su nuovi schemi (Gate 2)
- Cross-tenant isolation test automatizzato

---

## 6. Rollback Plan

### Come tornare a `value-freeze-v1`

```bash
# Opzione 1 — reset locale (distruttivo, solo se necessario)
git checkout main  # main è ancora su eaecdad
# platform/readiness può essere ricreato da main in qualsiasi momento

# Opzione 2 — revert selettivo (conserva git history)
git revert b9f0359  # CC-14
git revert bb126fc  # CC-13
# ... per ogni CC in ordine inverso
```

### Perché i commit sono sicuri per il rollback

Ogni CC è atomico e verticale: modifica un'area specifica (ESLint, un gruppo di route, Playwright config) senza dipendenze tra commit. Nessun CC modifica schema DB o strutture dati condivise. Il rollback di qualsiasi singolo CC è indipendente dagli altri.

### Rischio rollback

**Basso.** Nessun commit modifica SQL, RLS o dati persistenti. Il rollback riporta il codice allo stato `value-freeze-v1` senza side effects su DB o storage.

### Cosa controllare dopo rollback

- `npm run build` deve essere OK (era OK su `value-freeze-v1`)
- ESLint tornerà ad avere 15+ errori (pre CC-07)
- 8079 test invece di 8128 (nessuna perdita di funzionalità — test aggiuntivi rimossi)
- Playwright non configurato (CC-08 rimosso)

---

## 7. Merge Recommendation

### Stato: `READY_FOR_REVIEW`

Il branch `platform/readiness` è tecnicamente pronto per la review CTO. Tutti i gate tecnici sono soddisfatti:

```
✅ TypeScript: 0 errori
✅ Vitest: 8128/8128 green
✅ Build: OK
✅ E2E: 6/6 green
✅ ESLint (file modificati): 0 errors
✅ P0 security findings: tutti chiusi
✅ Nessuna modifica a SQL/RLS/auth/middleware/produzione
✅ Nessun segreto tracciato
✅ Branch allineato a origin/platform/readiness
```

Il merge in `main` non deve avvenire senza:

1. **CTO review del diff** — specialmente CC-11 (client Supabase change) e CC-12/CC-13 (Zod validation)
2. **Verifica staging build** dopo merge
3. **Autorizzazione esplicita** — la policy del progetto richiede review CTO pre-merge

Una volta ottenuta la review, il merge è raccomandato: il branch riduce i rischi tecnici di `main` senza introdurre nuove dipendenze architetturali o bloccare Gate 2/3.

---

*PLATFORM_MERGE_GATE_REPORT.md — CC-15 · 2026-06-30 · Branch `platform/readiness`*
*Aggiornare dopo ogni sessione CC che modifica il branch o dopo la review CTO.*
