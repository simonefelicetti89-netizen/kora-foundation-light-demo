# KORA — Golden Path Readiness Status

**Last verified date:** 2026-07-03
**Last verified commit:** `8210247` (main)
**Audience:** CTO, technical advisor, pilot readiness reviewer

---

## Scope

This is a **status/readiness** document — proven vs. not proven, with checkpoint history. It does not duplicate operational steps: for the actual step-by-step walkthrough, see `GOLDEN_PATH_RUNBOOK.md` (KORA_ADMIN operator guide) and `PILOT_INTAKE_PROTOCOL.md` (pilot company onboarding). This doc exists because "is it real" and "how do I run it" are different questions and were previously answered only inside the runbook itself.

The golden path: **file/input → UEF → approval → scoring → KORA Index → Decision Pack/report**, service-assisted, KORA_ADMIN-operated.

---

## What is proven

**Manually, end-to-end, locally/staging (GOLDEN-01 audit + runbook walkthrough):**
- The full chain works when a KORA_ADMIN operator walks through it manually, per `GOLDEN_PATH_RUNBOOK.md`.
- `/company/kora-index` and `/company/workspace` are live-only per-tenant, no synthetic fallback (this corrected a prior doc claim that they fell back to demo data — see `docs/PILOT_INTAKE_PROTOCOL.md`'s GOLDEN-04-DOCS revision).
- Real file upload (CSV/XLSX) for real tenants exists and works at `/admin/data-intake` (this corrected a prior doc claim in `docs/data-intake-ui.md` that no real upload existed — that doc described only the older OP-001 synthetic-preview subset of the same route).

**Machine-verified, authenticated E2E (Playwright, local/staging):**
- `A01` — KORA_ADMIN login → `/admin`: **PASS**, run by the operator with real credentials against local dev (backed by real staging Supabase).

**Production (manual browser verification, VERCEL-01 through VERCEL-05):**
- Vercel Production deploys current `main` (`8210247`).
- Public pages load correctly (`/`, `/login`, `/request-access`).
- KORA_ADMIN login succeeds in Production and reaches `/admin` (after a Supabase env var fix and a role-switcher client-state fix — see `QA_STATUS.md`).

---

## What is NOT proven

- **No golden path step beyond login has been exercised in Production.** Upload, UEF generation/approval, scoring run, and Decision Pack generation have only been run manually against local dev / staging Supabase directly — never against the live Production deployment.
- **`A02`/`A03`/`A04`/`GD01`/`T01`/`T02` status (updated by B174-A2, 2026-07-12):** this section previously stated that `A02` had not been run via fixture, that `A03`/`A04` "cannot run at all" because COMPANY_B does not exist, and that `GD01` had not been run live. Since this document's last verification (2026-07-03), repo evidence indicates all of these were run live against staging on **2026-07-09**, with a documented pass result for each — see `docs/E2E_GOLDEN_PATH.md` (full pipeline log for `GD01`) and `docs/E2E_TWO_TENANT_ISOLATION.md` (per-test pass table for `A01`–`A04`, `T01`, `T02`). This has **not been independently re-verified in a later session** — this document's own last-verified date predates the 2026-07-09 runs and has not been re-walked since. A fresh, operator-approved confirmation is recommended before any of these are cited in a client-facing claim or used as the basis for further demo-tightening validation. See `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md` §4a for the full reconciliation.
- **RLS negative testing is mostly closed at the DB level, still open at the authenticated-request level.** Direct-Postgres tests prove Postgres RLS itself rejects cross-tenant reads (RLS-03, merged) and worker-vs-worker reads (RLS-05, merged, live run). App/API-level source code is statically audited (RLS-04, merged). KORA_ADMIN's legitimate cross-tenant access is proven statically (RLS-06, merged); repo evidence (`docs/QA_STATUS.md`) indicates its live direct-Postgres run was also executed, local-Postgres-only, on 2026-07-09, with 11/11 passing — not independently re-verified since. **None of RLS-03/04/05/06 has a live authenticated-request/PostgREST proof** (as distinct from direct-Postgres) — see `QA_STATUS.md`.

---

## E2E checkpoint log

| ID | Flow | Status | Where verified |
|---|---|---|---|
| A01 | KORA_ADMIN login → `/admin` | **PASS** | Local dev (real staging Supabase), operator-run, GOLDEN-03B |
| A02 | COMPANY_A login → `/company/workspace` | **Documented as PASS, staging, 2026-07-09** (not independently re-verified since) | `docs/E2E_TWO_TENANT_ISOLATION.md` live validation log; account previously verified manually in a separate 2026-06-22 QA pass |
| A03 | COMPANY_B login → `/company/workspace` | **Documented as PASS, staging, 2026-07-09** (not independently re-verified since) | `docs/E2E_TWO_TENANT_ISOLATION.md` live validation log |
| A04 | COMPANY_A/B tenant separation | **Documented as PASS, staging, 2026-07-09** (not independently re-verified since) | `docs/E2E_TWO_TENANT_ISOLATION.md` live validation log |
| — | KORA_ADMIN login, manual, Production | **PASS** | VERCEL-05 |
| — | Public smoke, manual, Production | **PASS** | VERCEL-03 |
| — | Golden path steps 2–6 (upload → Decision Pack), Production | **Not attempted** | — |
| G01 | KORA_ADMIN → `/admin`, COMPANY_ADMIN → `/company/workspace` (one narrative) | Not run via fixture | GOLDEN-E2E-01, skip-safe implemented |
| G02 | COMPANY_ADMIN → `/company/kora-index` reachability + privacy smoke | Not run via fixture | GOLDEN-E2E-01, skip-safe implemented |
| GD01 | Upload → UEF → scoring → Decision Pack → company visibility | **Documented as PASS, staging, 2026-07-09** (not independently re-verified since) | `docs/E2E_GOLDEN_PATH.md` live validation log — full pipeline steps, exact command, duration |
| T01/T02 | COMPANY_A/B cross-tenant isolation via `/api/company/workspace` | **Documented as PASS, staging, 2026-07-09** (not independently re-verified since) | `docs/E2E_TWO_TENANT_ISOLATION.md` live validation log |

**Caveat for every "Documented as PASS" row above:** repo evidence (dated validation logs, corroborating git history, corroborating local E2E env configuration) indicates these ran and passed on 2026-07-09. This has not been independently re-verified in a later session. A fresh, operator-approved confirmation is recommended before any of these are cited in a client-facing claim or used as the basis for further demo-tightening validation — see `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md`.

---

## Minimum path to closing the gap (not a commitment, an assessment)

1. ~~Run `A02` against local dev, then Production, using the existing fixture~~ — **documented as run against staging, 2026-07-09** (see checkpoint log above). Not yet run against Production specifically; not independently re-verified since 2026-07-09.
2. ~~Provision a COMPANY_B tenant~~ — **repo evidence indicates this was done in staging, 2026-07-09** (see `docs/E2E_TWO_TENANT_ISOLATION.md`). Not independently re-verified since.
3. ~~Extend the E2E suite to cover at least one real upload → scoring → Decision Pack run~~ — **done (GOLDEN-E2E-02, test `GD01`)**: implemented, skip-safe-verified, and **documented as run live against a disposable staging tenant on 2026-07-09** (see `docs/E2E_GOLDEN_PATH.md`). Not independently re-verified since.
4. ~~Extend RLS negative tests to PostgREST/app-level (RLS-04) and worker-vs-worker isolation (RLS-05)~~ — **done**: RLS-04 (static audit) and RLS-05 (live direct-Postgres proof) are both merged — see `QA_STATUS.md`. The remaining RLS gap is a live authenticated-request/PostgREST proof, not unbuilt negative tests.
5. **New, per B174-A2 (2026-07-12):** obtain a fresh, operator-approved re-confirmation of steps 1–3 above (a repeat `A02`–`A04`/`T01`/`T02`/`GD01` run) before citing any of them in a client-facing claim or using them as the basis for further demo-tightening validation. The 2026-07-09 record is documented, not re-verified — treat it as strong evidence, not as a currently-live-checked fact.

---

## Related docs

`GOLDEN_PATH_RUNBOOK.md`, `PILOT_INTAKE_PROTOCOL.md`, `QA_STATUS.md`, `STATUS.md`, `testing-e2e-auth.md`, `E2E_GOLDEN_PATH.md` (what `GD01` covers, env vars, how to run it, known gaps), `PILOT_GOVERNANCE.md` (single cross-referenced governance index).
