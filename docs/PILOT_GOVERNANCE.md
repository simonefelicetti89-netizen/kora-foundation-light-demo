# PILOT_GOVERNANCE — Canonical Pilot Readiness Index

**Status:** Canonical governance index. This document does not replace any of the docs it links to — it is a single entry point that summarizes and cross-references them, so a reviewer does not have to reconstruct the full picture from six separate files.
**Introduced:** PILOT-GOVERNANCE-01 (2026-07-06)

---

## 1. Scope

This doc answers one question: **"where does KORA's pilot readiness actually stand, and where is the authoritative detail for each claim?"** It does not restate operational how-to steps (see the runbooks linked below) or re-derive architecture (see `docs/ARCHITECTURE.md`). Where this doc and a linked source doc appear to disagree, the source doc governs — this index is a summary, not a new source of truth. For an external-reviewer-facing version of this material (executive overview, reading paths by audience, external sharing guidance), see `docs/PILOT_REVIEW_PACKAGE.md`.

---

## 2. Current pilot-readiness state (one paragraph)

The service-assisted golden path (upload → UEF → approval → scoring → KORA Index → Decision Pack) works when walked through manually by a KORA_ADMIN operator, and is proven with real staging credentials for login only (`A01`, KORA_ADMIN). Every other authenticated flow — `A02`–`A04`, `G01`/`G02`, `GD01`, `T01`/`T02` — is implemented as a skip-safe, credential-gated Playwright scaffold that has never been executed with real credentials against any live environment. Tenant isolation is proven at the direct-Postgres level (RLS-03/05) and statically at the app/API level (RLS-04, RLS-06's static half); no live authenticated-request/PostgREST proof exists yet for any of it. See `docs/QA_STATUS.md` for full detail — this section is a compressed pointer, not a replacement.

## 3. Gate 2 status

**Canonical source: `docs/GATE2_STATUS.md`.** Current status: **CLOSED WITH CONDITIONS** (2026-06-22). Authorizes continued product/architecture work on the **staging** Supabase project only — does not authorize Production Supabase provisioning, live worker data (blocked by Gate 3, still OPEN), or live fiscal outputs (blocked by Gate 5, still OPEN).

**Known documentation drift (already flagged in `GATE2_STATUS.md` itself):** `CLAUDE.md`'s footer still reads "Gate 2 OPEN (blocks SQL)" — stale, predates the close-with-conditions decision. Reconciling it is a founder-governance decision, out of scope for this doc and for this sprint.

## 4. CI scope and limits

**Canonical source: `docs/CI.md`, `.github/workflows/ci.yml`.** CI (`KORA CI`) runs on every PR/push to `main`: `npm ci` → `npx tsc --noEmit` → `npm test` (Vitest unit/integration) → `npm run build` → `npm run lint` (report-only, `|| true`, non-blocking — 103 pre-existing lint errors on `main`, not this sprint's concern).

**CI does not run:** Playwright/E2E (not installed, no browser step), anything against staging/Production Supabase, any migration. No repository secret is referenced anywhere in the workflow. This sprint did not modify `ci.yml`.

## 5. What is proven

- KORA_ADMIN login → `/admin`, real staging credentials, local dev (`A01`, PASS, GOLDEN-03B).
- KORA_ADMIN login → `/admin`, manual browser check, Production (VERCEL-05).
- Public pages (`/`, `/login`, `/request-access`) load correctly in Production (VERCEL-03).
- Postgres RLS itself (not application code) rejects cross-tenant reads on `analytics.source_batch`/`kora_index_result`/`activation_result` — direct-Postgres, simulated JWT claims, 13/13 tests, run live 2026-07-04 (RLS-03).
- Postgres RLS rejects worker-vs-worker reads on `personal.worker_identity`/`worker_pib` within the same tenant — direct-Postgres, 9/9 tests, run live (RLS-05).
- Every `app/api/**` route (84 files) derives tenant/worker identity from session `app_metadata`, never client input — static source audit, all passing (RLS-04).
- 217 unit/integration test files passing (as of this sprint) — static/structural correctness of route guards, access-matrix logic, and pure-function scoring/methodology code. **This is not the same as runtime/live-database proof** — see §8.

## 6. What is scaffolded but not live-run

All of the following are implemented, statically verified (`tsc` clean, Playwright registers the tests, skip-safe confirmed with no credentials set), and have **never executed against a live environment with real credentials**:

| Scaffold | File | Blocked by |
|---|---|---|
| `A02` COMPANY_A login | `tests/e2e/authenticated-smoke.spec.ts` | Never executed; no code/credential gap |
| `A03`/`A04` COMPANY_B login + tenant separation | `tests/e2e/authenticated-smoke.spec.ts` | COMPANY_B does not exist (§10) |
| `G01`/`G02` admin↔company narrative + KORA Index reachability | `tests/e2e/golden-admin-company.spec.ts` | Never executed |
| `GD01` full data-bearing golden path | `tests/e2e/golden-data-bearing.spec.ts` | Deferred to final pilot-validation session (§13); see `docs/E2E_GOLDEN_PATH.md` |
| `T01`/`T02` two-tenant isolation via `/api/company/workspace` | `tests/e2e/two-tenant-isolation.spec.ts` | COMPANY_B does not exist (§10); see `docs/E2E_TWO_TENANT_ISOLATION.md` |
| RLS-06 KORA_ADMIN positive control, live half | `tests/integration/rls-kora-admin-control.test.ts` | Static half done; live direct-Postgres run not yet executed |

## 7. What is explicitly not proven yet

- Any golden-path step beyond login, in Production.
- COMPANY_A's login and workspace reachability, via the E2E fixture (manually verified separately, 2026-06-22, but not through `A02`).
- Any cross-tenant isolation proof through a real authenticated HTTP request (UI or API) — RLS-03/05/06 are direct-Postgres with simulated claims, not PostgREST/GoTrue.
- Anything involving COMPANY_B, because COMPANY_B does not exist (§10).

## 8. RLS / static control status

Direct-Postgres, simulated-claims tests (RLS-03 tenant-vs-tenant, RLS-05 worker-vs-worker) are merged and **run live** against local Supabase with fixture cleanup verified. RLS-04 (app/API static audit) and RLS-06's static half are merged. **None of RLS-03/04/05/06 constitutes a live authenticated-request/PostgREST/GoTrue proof** — this is stated explicitly in `docs/QA_STATUS.md` and repeated here because it is the single most important caveat in this entire index: a passing static or direct-Postgres-with-simulated-claims test is not the same claim as "a real browser session was rejected by a running server." Do not conflate the two.

## 9. E2E scaffold status

See §6 table. Helpers (`tests/e2e/helpers/{env,auth,roles,privacy}.ts`) are shared across all scaffold files, are skip-safe by construction (missing credentials → `test.skip(...)`, never a failure), and are protected by a production guard (`guardBaseUrl()`, unit-tested in `tests/unit/golden-02-e2e-env-guard.test.ts`) that blocks any non-local `E2E_BASE_URL` unless `E2E_ALLOW_PRODUCTION=true` is explicitly set.

## 10. COMPANY_B status

**COMPANY_B does not exist.** No second company/tenant account exists in staging or Production, as of this sprint. This is a provisioning gap, not a credentials or code gap — the app's own admin route (`POST /api/admin/companies/provision`, KORA_ADMIN-only) already supports creating it. Provisioning it is an explicitly-approved, separate action (Gate: requires KORA_ADMIN session + Supabase Admin API path) — out of scope for every documentation/governance sprint including this one.

## 11. Two-tenant isolation status

Implemented as a skip-safe scaffold (`T01`/`T02`, `tests/e2e/two-tenant-isolation.spec.ts`, merged PR #32) proving, once COMPANY_B exists, that a COMPANY_A session cannot resolve COMPANY_B's tenant data via `/api/company/workspace` (and vice versa), both through rendered markup and a direct authenticated API call. **Has not been run live.** Blocked exclusively by COMPANY_B's absence (§10). See `docs/E2E_TWO_TENANT_ISOLATION.md`.

## 12. Privacy boundary status

Architecture is real, not aspirational: three-layer defense in depth (middleware → server layout → RLS), documented in `docs/access-matrix.md` (authoritative — overrides any hardcoded check in code) and `docs/API_ROUTE_AUTH_MATRIX.md` (84-route static audit). `docs/privacy-escalation-model.md` states the canonical principle that KORA_ADMIN access ≠ worker-PIB access. E2E-level privacy checks (`tests/e2e/helpers/privacy.ts`'s `assertNoWorkerLevelIdentifiers`/`assertNoWorkerLevelIdentifiersInText`) are markup/JSON smoke checks — they catch an accidental leak into rendered output, and are **not** a substitute for RLS enforcement.

## 13. Known remaining pilot blockers

1. COMPANY_B provisioning (§10) — blocks `A03`, `A04`, `T01`, `T02`.
2. `A02` has never been run via fixture (no blocker beyond execution).
3. `GD01` has never been run live — deferred to the final pilot-validation session, not an unbuilt-code gap.
4. RLS-06's live direct-Postgres run has not been executed.
5. No authenticated E2E has ever run against Production.
6. Gate 2 status line in `CLAUDE.md` is stale (§3) — a founder-governance reconciliation, not a technical blocker.
7. Credential cleanup remains deferred to the end of the roadmap (§15).

Full detail and history for each: `docs/PILOT_SAAS_READINESS.md`, `docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/QA_STATUS.md`.

## 14. "Do not claim" boundaries

These are the specific overclaiming traps this repo's own docs have already flagged — repeated here as a single checklist so no future session has to rediscover them independently:

- **Do not claim `GD01` has run live.** It is implemented and skip-safe-verified only.
- **Do not claim COMPANY_B exists.** It does not, in any environment.
- **Do not claim two-tenant isolation (`T01`/`T02`) has passed live.** It has never executed with real credentials.
- **Do not cite `tests/unit/b103-golden-path.test.ts` as functional E2E coverage.** Despite its name, it only asserts static files exist — it does not call any real API or drive any UI.
- **Do not claim a static or unit test proves runtime/live-database behavior.** Most of `tests/unit/` is source-text analysis or pure-function logic. A test named "tenant isolation" or "golden path" does not by itself mean the behavior was exercised end-to-end — check what the specific test file actually does before citing it.
- **Do not claim RLS-03/04/05/06 constitute a PostgREST/GoTrue/live-authenticated-request proof.** They are direct-Postgres-with-simulated-claims or static source audits.

## 15. Credential cleanup — deferred status

A credential cleanup topic exists and is **explicitly deferred until the end of the roadmap**. It is not in scope for `PILOT-GOVERNANCE-01` or any prior sprint referenced in this doc, and must not be started opportunistically inside an unrelated sprint. Any future session encountering credential-adjacent work should treat it as blocked-until-explicitly-scheduled, not as a task to fold in.

## 16. Final validation sequence (not yet executed — this is the intended order)

1. Run `A02` (COMPANY_A) against local dev, then Production, using the existing fixture — no new code needed.
2. Provision COMPANY_B — a deliberate, explicitly-approved action (§10), never bundled into a routine sprint.
3. Run `A03`/`A04` once COMPANY_B exists.
4. Run `T01`/`T02` (two-tenant isolation) once COMPANY_B exists — see `docs/E2E_TWO_TENANT_ISOLATION.md`.
5. Run `GD01` (full data-bearing golden path) against a disposable staging tenant — deferred to the final pilot-validation session by design, not before.
6. Run RLS-06's live direct-Postgres control test.
7. Only after all of the above: begin the deferred credential cleanup sequence (§15).

For the operating procedure behind this sequence — roles, pre-flight checklist, per-step read-only/mutating classification, stop conditions, evidence collection, closeout — see `docs/PILOT_OPERATING_RUNBOOK.md`.

This sequence is descriptive of intended order, not a commitment to a timeline — each step still requires its own explicit approval per this repo's established precedent (staging/Production Auth writes require explicit sign-off, not routine-task bundling).

## 17. Next roadmap sequence

This sprint (`PILOT-GOVERNANCE-01`) is followed by `PILOT-VISIBLE-CLEANUP-01` — Visible Pilot Surface Cleanup — recommended next, not started.

---

## Related canonical docs

`docs/GATE2_STATUS.md`, `docs/STATUS.md`, `docs/QA_STATUS.md`, `docs/PILOT_SAAS_READINESS.md`, `docs/GOLDEN_PATH.md`, `docs/GOLDEN_PATH_RUNBOOK.md`, `docs/CI.md`, `docs/DEPLOY_CHECKLIST.md`, `docs/access-matrix.md`, `docs/API_ROUTE_AUTH_MATRIX.md`, `docs/E2E_GOLDEN_PATH.md`, `docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/privacy-escalation-model.md`, `docs/PILOT_DEMO_SCRIPT.md` (controlled demo script for presenting this governance status live).

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-GOVERNANCE-01)
