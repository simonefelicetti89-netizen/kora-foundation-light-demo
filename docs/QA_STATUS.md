# KORA — QA & Test Status

**Last verified date:** 2026-07-03
**Last verified commit:** `8210247` (main)
**Audience:** CTO, technical reviewer, QA

---

## Scope

Current test coverage and verification checkpoint status, across unit/integration, authenticated E2E, and manual Production verification. For *how* to run the E2E fixtures, see `testing-e2e-auth.md`. This doc is the *what's actually been verified* summary.

---

## What is proven

**Unit/integration (vitest):**
- 204 test files, 8656 tests passing, ~4s runtime, verified at this doc's commit (`npm test`).
- Includes static/structural version-consistency tests (e.g. `b100-versioning-consistency.test.ts`) that assert forbidden stale labels don't appear in client-facing strings, tenant-isolation source-analysis tests, and role/auth-routing structural tests.
- **Important caveat on what these prove:** most of this suite is static source-code analysis (reading files as text, asserting patterns) or pure-function logic testing — not runtime rendering or live-database verification. A test named "golden path" or "tenant isolation" in this suite does not necessarily mean the actual runtime behavior was exercised end-to-end; check what a given test file actually does before citing it as proof of a live behavior.

**Authenticated E2E (Playwright, `tests/e2e/authenticated-smoke.spec.ts`):**
- Infrastructure built GOLDEN-02: skip-safe fixtures (`tests/e2e/helpers/{env,roles,auth}.ts`) for KORA_ADMIN, COMPANY_A, COMPANY_B, with a production guard (`E2E_BASE_URL` must be local unless `E2E_ALLOW_PRODUCTION=true`) and no credentials ever hardcoded or logged.
- `A01` (KORA_ADMIN) — **PASS**, run by the operator with real staging credentials, ~4.7s, GOLDEN-03B.
- `A02`/`A03`/`A04` — not yet run (see `GOLDEN_PATH.md` checkpoint log for detail and blockers).

**RLS negative testing, local direct-Postgres (RLS-03, merged to `main` via PR #26):**
- `tests/integration/rls-two-tenant-negative.test.ts` connects directly to a local Supabase Postgres instance (`pg`, no PostgREST/`@supabase/supabase-js` involved) and proves Postgres RLS itself — not application code — rejects cross-tenant reads on `analytics.source_batch`, `analytics.kora_index_result`, and `analytics.activation_result`. Own-tenant reads (positive control) pass and cross-tenant reads return zero rows, for both synthetic tenants in both directions.
- Run 2026-07-04 against local Supabase (migrations `001`–`028`, `030`, `031` applied, no seed): **13/13 tests passed** (`RLS03_ALLOW_RUN=true RLS03_PG_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm test -- tests/integration/rls-two-tenant-negative.test.ts`). Synthetic fixture rows fully cleaned up afterward (verified directly against the DB). No cloud/staging/production Supabase or Vercel involved at any point.
- **What this does NOT prove:** GoTrue/Supabase Auth sign-in (claims are simulated via a transaction-local `request.jwt.claims` GUC, not a real signed-in session), PostgREST schema-exposure correctness (this test never goes through PostgREST — `analytics`/`personal`/`commons`/`gov`/`audit`/`network` remain unexposed via the API), browser/authenticated E2E flows (RLS-04/05), worker-vs-worker isolation (`personal.*`, reserved for RLS-05), or report/export-level privacy suppression. Skip-safe by default (`RLS03_ALLOW_RUN` unset in CI/normal `npm test` runs).

**Manual Production verification (VERCEL-01 through VERCEL-05, ROLE-SWITCHER-01 through 03):**
- Public pages smoke-checked manually in Production — pass.
- Vercel Production env var *names* confirmed present and correct (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); `KORA_OPERATOR_SECRET` correctly absent.
- A Supabase env var misconfiguration was found and corrected in Production (`NEXT_PUBLIC_SUPABASE_URL` was a placeholder/wrong value).
- KORA_ADMIN login verified manually in Production, twice: once revealing a client-state bug (false access-denied via a stale demo-state role — `AdminDemoGuard` checking `lib/demo-state`'s `activeRole`, independent of the real, correctly-enforced server-side `requireKoraAdmin()`), once after the fix (`fix/role-switcher-session-sync`) confirming it resolved.

---

## What is NOT proven

- **RLS negative testing exists but only at the direct-Postgres/local level.** See "RLS negative testing, local direct-Postgres" above — merged to `main` via PR #26. It closes the original GOLDEN-01 gap for DB-level tenant isolation on the four tables it covers, but does not cover `personal.*` (worker-vs-worker, RLS-05) and does not run through PostgREST or GoTrue (RLS-04's job). Treat "RLS negative testing" as partially, not fully, closed until RLS-04/RLS-05/RLS-06 land.
- **No authenticated E2E has been run against Production** — only against local dev (backed by real staging Supabase). The mechanism exists (`E2E_BASE_URL` + production guard, wired GOLDEN-03B) but has not been exercised against the actual Production URL.
- **COMPANY_A/COMPANY_B E2E and manual Production checks are incomplete** — see `GOLDEN_PATH.md` for detail. COMPANY_B is not just untested, it doesn't exist yet.
- **No automated test exercises the golden path's data-bearing steps** (upload, UEF approval, scoring run, Decision Pack generation) end-to-end. `tests/unit/b103-golden-path.test.ts` — despite its name — only checks that static files exist; it does not call the real API. Do not cite it as functional golden-path coverage.
- **Lint status was not re-verified in this reconciliation pass.** A prior (now-stale, unmerged) audit catalogued specific ESLint error counts and React anti-pattern locations; those numbers are not restated here as current — re-run `npm run lint` rather than trust an old count.

---

## Minimum E2E additions recommended (unchanged assessment from GOLDEN-01, still open)

1. `A02` run locally and against Production (no new code — just execution).
2. COMPANY_B provisioning, then `A03`/`A04`.
3. A golden-path E2E covering generate→approve UEF→run scoring→assert KORA Index value present.
4. A Decision Pack E2E asserting the v1.0 label, Confidence Score, Safeguard, and all 10 components render.
5. RLS negative tests — **partially done:** cross-tenant read denial now proven at the direct-Postgres/local level for `analytics.source_batch`/`kora_index_result`/`activation_result` (see above), merged to `main`. Still open: API-level tenant-override rejection through PostgREST/the app (RLS-04); worker-vs-worker isolation (RLS-05); a control test confirming KORA_ADMIN's legitimate cross-tenant access still works (RLS-06), so the negative tests don't become a false regression trap.

---

## Related docs

`testing-e2e-auth.md` (how to run), `GOLDEN_PATH.md` (golden path specifically), `STATUS.md`, `ARCHITECTURE.md` §10 (known technical debt).
