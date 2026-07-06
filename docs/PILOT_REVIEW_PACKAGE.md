# KORA — Pilot Review Package

**Audience:** technical reviewer, academic/methodology advisor, venture studio, investor, pilot partner stakeholder.
**Purpose:** a single, honest entry point for anyone evaluating KORA before or during a pilot decision — what it is, what is proven, what is scaffolded, what is blocked, and what must not be claimed yet.
**Introduced:** PILOT-PACKAGE-01 (2026-07-06)

This document does not replace `docs/PILOT_GOVERNANCE.md` (the canonical internal governance index) — it is a reviewer-facing front door to it and to the rest of `docs/`. Where this doc and `docs/PILOT_GOVERNANCE.md` disagree, `docs/PILOT_GOVERNANCE.md` governs.

---

## 1. Executive overview

KORA is a **Human Impact Intelligence Platform**: it turns an organization's existing people-related activity — welfare participation, training completions, volunteering, collective initiatives, partner activity — into a structured, explainable, privacy-safe measure of organizational activation. The output is the **KORA Index**, a company-level score built from five activation pillars (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY); it measures organizations, not individuals, and no individual worker score is ever shown to an employer.

KORA Foundation Light is the current pilot-grade build: a real Next.js/Supabase application with a working scoring engine, real authentication and row-level security, and a real (though pre-empirical) methodology — running today on synthetic and staging data, not yet validated against a real pilot company's live data. It is a working prototype with genuine engineering substance behind it, not a market-ready product and not an empirically calibrated instrument yet. The rest of this document is about being precise on exactly that line.

## 2. Current pilot state

| Status | Meaning | Applies to |
|---|---|---|
| **Proven** | Exercised live, with real credentials, against a real (staging or Production) environment, with results recorded. | KORA_ADMIN login (`A01`); Postgres RLS tenant-vs-tenant and worker-vs-worker rejection (RLS-03, RLS-05); public page smoke in Production; unit/integration suite (green on every `npm test` run). |
| **Scaffolded but not live-run** | Fully implemented and statically/skip-safe-verified, but never executed with real credentials against a live environment. | `GD01` (full data-bearing golden path E2E); `T01`/`T02` (two-tenant isolation E2E); `A02`/`A03`/`A04` (COMPANY_A/B login + separation E2E); RLS-06's live direct-Postgres control test. |
| **Blocked** | Cannot run yet because a prerequisite doesn't exist. | `A03`, `A04`, `T01`, `T02` — all blocked specifically on COMPANY_B, which does not exist in any environment. |
| **Deferred** | Intentionally postponed to a later, explicitly-scheduled point in the roadmap — not forgotten, not blocked by a technical gap. | Credential cleanup, deferred to the end of the roadmap by deliberate decision. |

Five load-bearing facts, stated plainly:

1. **Gate 2 (CTO architecture review) is CLOSED WITH CONDITIONS** (2026-06-22) — it authorizes continued staging-only work; it does **not** authorize Production Supabase provisioning or live worker data (both remain blocked by Gate 3, still OPEN). See `docs/GATE2_STATUS.md`.
2. **CI runs `tsc --noEmit`, the unit/integration suite, and a production build on every PR/push to `main`.** It does **not** run E2E/Playwright, and never touches Supabase, Production, or any repository secret. See `docs/CI.md`.
3. **`GD01` (the full upload → UEF → scoring → Decision Pack golden path) exists as a fully implemented, skip-safe E2E scaffold — it has never been run live.**
4. **COMPANY_B does not exist yet**, in any environment. This is a provisioning gap, not a code or credentials gap.
5. **`T01`/`T02` (authenticated two-tenant isolation) exist as a skip-safe E2E scaffold — blocked on COMPANY_B, never run live.** Credential cleanup is deferred to the end of the roadmap by deliberate decision. Static and direct-Postgres-with-simulated-claims tests (the bulk of the automated suite) are **not** the same claim as a live, authenticated, runtime proof — see §5.

## 3. Evidence matrix

| Claim | Current status | Evidence | Caveat |
|---|---|---|---|
| Gate 2 governance | Closed with conditions (staging-only authorization) | `docs/GATE2_STATUS.md` | Does not authorize Production Supabase or live worker data (Gate 3 still OPEN) |
| CI baseline | Green on every PR/push to `main` | `.github/workflows/ci.yml`, `docs/CI.md` | Runs `tsc`/unit tests/build only — no E2E, no Supabase, no secrets |
| RLS/static controls | Tenant-vs-tenant (RLS-03) and worker-vs-worker (RLS-05) rejection proven live against local Postgres; app/API static audit (RLS-04) and KORA_ADMIN positive control (RLS-06) statically verified | `tests/integration/rls-two-tenant-negative.test.ts`, `tests/integration/rls-worker-isolation.test.ts`, `tests/unit/rls04-app-api-tenant-enforcement.test.ts` | Direct-Postgres with simulated JWT claims, not a live PostgREST/GoTrue request; RLS-06's live run is implemented but not yet executed |
| Golden path scaffold (`GD01`) | Fully implemented, skip-safe-verified | `tests/e2e/golden-data-bearing.spec.ts`, `docs/E2E_GOLDEN_PATH.md` | **Never run live** — no `E2E_*` credentials/staging access exercised yet |
| Two-tenant isolation scaffold (`T01`/`T02`) | Fully implemented, skip-safe-verified | `tests/e2e/two-tenant-isolation.spec.ts`, `docs/E2E_TWO_TENANT_ISOLATION.md` | **Never run live** — blocked entirely on COMPANY_B not existing |
| Pilot governance package | Canonical cross-referenced index merged | `docs/PILOT_GOVERNANCE.md`, `tests/unit/pilot-governance-inventory.test.ts` | Static inventory test guards existence/key claims only, not runtime behavior |
| Visible surface cleanup | Stale Gate 2 wording and a sidebar nav ambiguity fixed | PR #34 (`README.md`, `components/layout/Sidebar.tsx`, `docs/README.md`) | Copy/label fixes only — no behavior change |
| Privacy boundary | Three-layer defense in depth (middleware → server layout → RLS); authoritative access matrix | `docs/access-matrix.md`, `docs/API_ROUTE_AUTH_MATRIX.md`, `docs/privacy-escalation-model.md` | Enforcement is layered and documented; no live authenticated cross-tenant HTTP request has yet exercised it end-to-end |
| COMPANY_B status | Does not exist | `docs/PILOT_GOVERNANCE.md` §10, `docs/GOLDEN_PATH.md` | Provisioning gap, not a credentials/code gap — requires an explicitly-approved action |
| GD01 status | Not run live | `docs/E2E_GOLDEN_PATH.md` "Known gaps" | Deferred to the final pilot-validation session by design |

## 4. Reviewer reading path

**Technical reviewer / developer**
1. `docs/ARCHITECTURE.md` — repo map, engine, roles, Supabase layout.
2. `docs/PILOT_GOVERNANCE.md` — proven/scaffolded/blocked/deferred status in full.
3. `docs/access-matrix.md` — authoritative privacy/role enforcement rules.
4. `docs/API_ROUTE_AUTH_MATRIX.md` — per-route static auth audit (84 routes).
5. `docs/E2E_GOLDEN_PATH.md` / `docs/E2E_TWO_TENANT_ISOLATION.md` — exactly what the E2E scaffolds do and don't prove.

**Academic advisor / methodology reviewer**
1. `docs/METHODOLOGY.md` — versioning, 10 components, IU formula, quick reference.
2. `docs/10-architecture-v3-layer-specification.md` — canonical 14-stage algorithm and formula detail.
3. `docs/kora-canonical-product-architecture-v1.md` — full product/methodology philosophy and boundaries.
4. `docs/GATE2_STATUS.md` — what "pre-empirical calibration" means for methodology validity today.

**Venture studio / investor**
1. This document (executive overview + evidence matrix + blockers).
2. `docs/PILOT_SAAS_READINESS.md` — what's ready/not ready, operator flow, top blockers and expansion opportunities.
3. `docs/STATUS.md` — current platform status snapshot.
4. `docs/PILOT_GOVERNANCE.md` §16 — the final validation sequence remaining before a live pilot demonstration.

**Pilot partner / company stakeholder**
1. This document, §1–2 only (what KORA is, current honest state).
2. `docs/PILOT_INTAKE_PROTOCOL.md` — what onboarding as a pilot company actually involves.
3. `docs/GOLDEN_PATH_RUNBOOK.md` — the operator-run workflow that will process their data.
4. `docs/privacy-escalation-model.md` — the privacy guarantee specific to their workers' data.

## 5. Technical validation map

- **Statically checked (source-text/structural analysis, no execution):** app/API route auth-guard derivation (RLS-04), access-matrix consistency (RLS-06's static half), doc/scaffold existence and key-claim inventory (`tests/unit/pilot-governance-inventory.test.ts`), version-label consistency (`b100-versioning-consistency.test.ts`), and the large majority of `tests/unit/*`.
- **Unit-tested (pure-function/logic, no live DB or network):** scoring engine (`lib/kora-engine/`), methodology weight resolution, permission-resolution helpers — 218 test files, 8999 tests passing, 30 skipped as of this sprint's last full run.
- **Only scaffolded (implemented, never executed live):** `GD01`, `T01`/`T02`, `A02`/`A03`/`A04`, RLS-06's live direct-Postgres run.
- **Requires live staging validation before it can be called proven:** the entire golden path beyond login, both two-tenant isolation checks, and any authenticated-request-level (PostgREST/GoTrue) proof of RLS enforcement — none of RLS-03/04/05/06 goes through PostgREST or GoTrue; all are either direct-Postgres with simulated claims or static.
- **Where the final validation sequence lives:** `docs/PILOT_GOVERNANCE.md` §16 — this document does not duplicate it, only points to it (see §10 below).

## 6. Known blockers and residual risks

| Blocker/risk | Status | Why it matters | Next action |
|---|---|---|---|
| COMPANY_B absent | Blocked | No live two-tenant demonstration is possible; blocks `A03`/`A04`/`T01`/`T02` | Explicit, approved provisioning action via `/api/admin/companies/provision` (KORA_ADMIN only) |
| `GD01` not live-run | Scaffolded | The full commercial golden path has never been proven against a real environment end-to-end | Deferred to the final pilot-validation session by design |
| Live PostgREST/GoTrue proof not completed | Open | RLS-03/04/05/06 prove Postgres-level and static-code correctness, not a live authenticated HTTP request through the real auth stack | Authenticated E2E extension of the RLS test suite (see `docs/QA_STATUS.md`'s RLS-04 entry for priority routes) |
| Credential cleanup deferred | Deferred (deliberate) | A known credential-hygiene topic is intentionally postponed to the end of the roadmap, not forgotten | Explicitly scheduled after final pilot validation, per `docs/PILOT_GOVERNANCE.md` §15 |
| Production Supabase / live worker data still gated | Blocked (Gate 3) | No real worker data may be processed until Legal/DPO review closes | Gate 3 closure — outside engineering's control |
| External package must never include secrets/raw env files | Constitutional | `.env.local`, `.env.staging.local`, and any credential value must never be shared with an external reviewer | Enforced by §8 below and by standing repository practice — no exception |

## 7. Do-not-claim boundaries

These are hard lines. Do not present any of the following to an external reviewer, partner, or investor as true:

- **Do not claim pilot production readiness.** The service-assisted golden path works manually and is being progressively automated and proven — it is not yet a production-ready, self-service SaaS product.
- **Do not claim `GD01` passed live.** It is implemented and skip-safe-verified only.
- **Do not claim COMPANY_B exists.** It does not, in any environment.
- **Do not claim two-tenant live isolation passed.** `T01`/`T02` have never executed with real credentials.
- **Do not claim static tests prove runtime behavior.** Most of the automated suite is source-text analysis or pure-function logic — it is real and valuable, but it is not the same claim as "this was observed working live."
- **Do not claim `tests/unit/b103-golden-path.test.ts` is functional E2E coverage.** Despite its name, it only asserts static files exist.
- **Do not claim credential cleanup is complete** while it remains deferred per `docs/PILOT_GOVERNANCE.md` §15.

## 8. External sharing guidance

| Document | Share externally? | Audience | Notes |
|---|---|---|---|
| `docs/PILOT_REVIEW_PACKAGE.md` (this doc) | Yes | All reviewer types | Designed for exactly this purpose |
| `docs/PILOT_GOVERNANCE.md` | Yes, with context | Technical reviewer, investor | Internal-governance tone — safe content, but denser than this doc; hand it over alongside this one, not instead of it |
| `docs/GATE2_STATUS.md` | Yes | Technical reviewer, investor | Safe, factual, already externally-appropriate |
| `docs/PILOT_SAAS_READINESS.md` | Yes | Investor, venture studio | Safe; written for exactly this audience already |
| `docs/METHODOLOGY.md` | Yes | Academic/methodology reviewer | Safe; concise and accurate |
| `docs/access-matrix.md` | Yes, technical audiences only | Technical reviewer | Safe content, but dense/internal in tone — best paired with a verbal walkthrough |
| `docs/API_ROUTE_AUTH_MATRIX.md` | Yes, technical audiences only | Technical reviewer | Safe; highly technical, low value to non-engineers |
| `docs/E2E_GOLDEN_PATH.md` | Yes | Technical reviewer | Safe; already discloses "not run live" honestly |
| `docs/E2E_TWO_TENANT_ISOLATION.md` | Yes | Technical reviewer | Safe; already discloses "not run live" honestly |
| `docs/DEPLOY_CHECKLIST.md` | Yes, technical audiences only | Technical reviewer | Safe but purely operational — low value outside engineering |
| `docs/archive/**` | No, not by default | — | Historical/superseded snapshots; sharing them risks a reviewer citing stale status as current — point to the canonical doc instead |
| `CLAUDE.md` | No, not as a reviewer artifact | — | This is operating-instructions material for an AI coding assistant working in this repo, not a document written for a human reviewer audience — it will read as strange/internal outside that context |
| env files / secrets (`.env.local`, `.env.staging.local`, any credential value) | **Never** | — | No exception, under any circumstance, for any audience |

## 9. Recommended reviewer questions

- **"What is proven live?"** → §2 and §3 above; the short answer is KORA_ADMIN login and Postgres-level RLS rejection — everything past that is scaffolded, not yet live-proven.
- **"What is only scaffolded?"** → §5; `GD01`, `T01`/`T02`, `A02`–`A04`, RLS-06's live run.
- **"How is tenant isolation handled?"** → `docs/access-matrix.md` for the design, `tests/integration/rls-two-tenant-negative.test.ts` for the DB-level proof, `docs/E2E_TWO_TENANT_ISOLATION.md` for the not-yet-live authenticated-request proof.
- **"What prevents worker-level data exposure?"** → `docs/privacy-escalation-model.md` and `docs/access-matrix.md` — three-layer defense in depth; no employer-facing component ever accesses individual worker data by design.
- **"What remains before a real pilot?"** → §6 above and `docs/PILOT_GOVERNANCE.md` §16's final validation sequence.
- **"What data is needed to run the first real pilot?"** → `docs/PILOT_INTAKE_PROTOCOL.md` — tenant/workforce baseline creation, then real data intake.
- **"What claims should not be made externally yet?"** → §7 above, verbatim.

## 10. Final validation checklist

Canonical detail lives in `docs/PILOT_GOVERNANCE.md` §16 — this is a summary, not a replacement:

1. Run `A02` (COMPANY_A) live against local dev, then Production.
2. Provision COMPANY_B — a deliberate, explicitly-approved action, never bundled into a routine sprint.
3. Run `A03`/`A04` live once COMPANY_B exists.
4. Run `T01`/`T02` (two-tenant isolation) live once COMPANY_B exists.
5. Run `GD01` (full data-bearing golden path) live — deferred to the final pilot-validation session by design.
6. Run RLS-06's live direct-Postgres control test, if still outstanding at that point.
7. Execute the deferred credentials reset/cleanup sequence.
8. Final review against this package and `docs/PILOT_GOVERNANCE.md` before any external pilot commitment is confirmed.

## 11. Next roadmap steps

- `PILOT-OPERATING-RUNBOOK-01`
- `PILOT-DATA-INTAKE-01`
- `PILOT-PRIVACY-GOVERNANCE-01`
- `PILOT-DEMO-SCRIPT-01`
- `CREDENTIALS-RESET-01` — at the end, once every step in §10 above is complete.

---

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-PACKAGE-01)
