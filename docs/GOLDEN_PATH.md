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
- **`A02` (COMPANY_A login) has not been run** — neither the E2E fixture nor a manual Production check. The account is known-good from an earlier, separate manual QA pass (2026-06-22, pre-dating this fixture).
- **`A03` (COMPANY_B login) and `A04` (tenant separation) cannot run at all** — COMPANY_B does not exist as a provisioned tenant/account. This is a provisioning gap, not a credentials or code gap.
- **An automated golden path test now exists but has not been run live.** `tests/e2e/golden-data-bearing.spec.ts` (GOLDEN-E2E-02, test `GD01`) drives upload → UEF generation/approval → scoring → Decision Pack end-to-end through the real UI — skip-safe-verified locally, but not yet executed against staging with real credentials. **Manual/staging authenticated tests are deferred until the final pilot-validation session. GD01 exists as a skip-safe E2E and remains implemented-but-not-live-proven until that session.** See `QA_STATUS.md`'s GOLDEN-E2E-02 entry.
- **RLS negative testing is mostly closed at the DB level, still open at the authenticated-request level.** Direct-Postgres tests prove Postgres RLS itself rejects cross-tenant reads (RLS-03, merged) and worker-vs-worker reads (RLS-05, merged, live run). App/API-level source code is statically audited (RLS-04, merged). KORA_ADMIN's legitimate cross-tenant access is proven statically (RLS-06, merged); its live direct-Postgres run is implemented skip-safe but not yet executed. None of RLS-03/04/05/06 has a live authenticated-request/PostgREST proof yet — see `QA_STATUS.md`.

---

## E2E checkpoint log

| ID | Flow | Status | Where verified |
|---|---|---|---|
| A01 | KORA_ADMIN login → `/admin` | **PASS** | Local dev (real staging Supabase), operator-run, GOLDEN-03B |
| A02 | COMPANY_A login → `/company/workspace` | Not run via fixture | Account verified manually in a separate 2026-06-22 QA pass only |
| A03 | COMPANY_B login → `/company/workspace` | **Blocked** | COMPANY_B does not exist |
| A04 | COMPANY_A/B tenant separation | **Blocked** | Depends on A03 |
| — | KORA_ADMIN login, manual, Production | **PASS** | VERCEL-05 |
| — | Public smoke, manual, Production | **PASS** | VERCEL-03 |
| — | Golden path steps 2–6 (upload → Decision Pack), Production | **Not attempted** | — |
| G01 | KORA_ADMIN → `/admin`, COMPANY_ADMIN → `/company/workspace` (one narrative) | Not run via fixture | GOLDEN-E2E-01, skip-safe implemented |
| G02 | COMPANY_ADMIN → `/company/kora-index` reachability + privacy smoke | Not run via fixture | GOLDEN-E2E-01, skip-safe implemented |
| GD01 | Upload → UEF → scoring → Decision Pack → company visibility | Not run via fixture | GOLDEN-E2E-02, skip-safe implemented; deferred to the final pilot-validation session |

---

## Minimum path to closing the gap (not a commitment, an assessment)

1. Run `A02` against local dev, then Production, using the existing fixture — no new code needed.
2. Provision a COMPANY_B tenant (a deliberate, explicitly-confirmed action — this repo's own precedent treats staging/Production Auth writes as requiring explicit sign-off, not something to bundle into a routine task).
3. ~~Extend the E2E suite to cover at least one real upload → scoring → Decision Pack run~~ — **done (GOLDEN-E2E-02, test `GD01`)**: implemented and skip-safe-verified. Running it live against a disposable staging tenant is deferred to the final pilot-validation session, not a remaining build task.
4. ~~Extend RLS negative tests to PostgREST/app-level (RLS-04) and worker-vs-worker isolation (RLS-05)~~ — **done**: RLS-04 (static audit) and RLS-05 (live direct-Postgres proof) are both merged — see `QA_STATUS.md`. The remaining RLS gap is a live authenticated-request/PostgREST proof, not unbuilt negative tests.

---

## Related docs

`GOLDEN_PATH_RUNBOOK.md`, `PILOT_INTAKE_PROTOCOL.md`, `QA_STATUS.md`, `STATUS.md`, `testing-e2e-auth.md`.
