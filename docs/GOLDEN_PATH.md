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
- **No automated golden path test exists** — nothing in CI/local test runs actually drives upload → UEF → scoring → Decision Pack end-to-end. All verification of that chain to date has been manual.
- **RLS negative testing is missing** — see `QA_STATUS.md`.

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

---

## Minimum path to closing the gap (not a commitment, an assessment)

1. Run `A02` against local dev, then Production, using the existing fixture — no new code needed.
2. Provision a COMPANY_B tenant (a deliberate, explicitly-confirmed action — this repo's own precedent treats staging/Production Auth writes as requiring explicit sign-off, not something to bundle into a routine task).
3. Extend the E2E suite to cover at least one real upload → scoring → Decision Pack run, ideally against a disposable test tenant, before claiming the golden path is proven in Production rather than just locally.
4. Add RLS negative tests (see `QA_STATUS.md`) before treating tenant isolation as verified rather than designed-correctly-but-unproven.

---

## Related docs

`GOLDEN_PATH_RUNBOOK.md`, `PILOT_INTAKE_PROTOCOL.md`, `QA_STATUS.md`, `STATUS.md`, `testing-e2e-auth.md`.
