# KORA Docs — Index

Quick pointers into `docs/`. This is an index, not a canonical source — see `CLAUDE.md` (repo root) for the authoritative document hierarchy.

## Current status (start here)

- **`STATUS.md`** — current platform status: what's proven, what's not, last-verified commit. Supersedes `archive/PLATFORM_READINESS_SUMMARY.md`/`archive/PLATFORM_READINESS_CHANGELOG.md` as the primary status reference (moved to archive in PILOT-SAAS-01, confirmed historical).
- `GOLDEN_PATH.md` — golden path readiness status and E2E checkpoint log
- `QA_STATUS.md` — test coverage and verification checkpoint detail
- `KORA_LINK_STATUS.md` — KORA Link's current frozen status
- `GATE2_STATUS.md` — canonical Gate 2 (CTO Architecture Review) status: closed with conditions, what's still gated by Gate 3/5
- `KORA_LINK_ADR.md` — KORA Link pilot architecture decision + current-state inventory (docs/SQL/code/flags)
- `CHANGELOG.md` — dated log of documentation consolidation/reconciliation work
- `PILOT_SAAS_READINESS.md` — what's ready/not ready for a first real pilot, operator flow, top blockers, top feature-expansion opportunities
- `FUTURE_ROLES_AND_SURFACES.md` — Partner Platform and Advisor Platform: current state, role model recommendation, privacy boundaries, suggested build order

## Golden path (operational)

- `GOLDEN_PATH_RUNBOOK.md` — file → UEF → approvazione → scoring → Decision Pack, passo per passo per KORA_ADMIN
- `PILOT_INTAKE_PROTOCOL.md` — pilot company onboarding, step by step

## Architecture & methodology

- **`ARCHITECTURE.md`** — current repository/runtime architecture reference (repo map, engine, roles, Supabase, off-limits areas)
- **`METHODOLOGY.md`** — KORA Index v1.0 / KORA Methodology Architecture v3, current 10-component names, IU formula — the single unambiguous versioning reference
- `kora-canonical-product-architecture-v1.md` — canonical product architecture (read first, per `CLAUDE.md`)
- `10-architecture-v3-layer-specification.md` — 14-stage algorithm, IU formula, KORA Index components (canonical detail)
- `kora-scoring-kernel-contract.md` — technical handoff contract for the scoring kernel
- `12-technical-data-model-database-schema.md` — schema reference (post Gate 2, canonical for schema)
- `21-founder-gate-resolution-log.md` — founder decision record (D-01–D-21)

## Testing

- `testing-e2e-auth.md` — how to run the authenticated E2E fixtures (KORA_ADMIN, COMPANY_A, COMPANY_B)
- `E2E_TESTING.md` — general E2E testing guide
- `RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md` — operational checklist for RLS-03 (synthetic two-tenant negative DB test); executed locally against direct Postgres (not the originally-planned hosted throwaway project — see the doc's own superseded-section note) and merged to `main` via PR #26

## Deploy & migrations

- `DEPLOY_CHECKLIST.md` — manual pre/post-deploy checklist for any deploy a pilot company could be affected by
- `MIGRATION_SEQUENCE_NOTE.md` — why `supabase/migrations/` has no `029` (quarantined rollback for 027, moved to `supabase/rollback/`, never applied)

## Archived / historical docs

- `archive/strategy/` — early product/redesign docs, pre-build audits, and completed build-phase plans (`KORA_DOCTRINE.md`, `KORA_REDESIGN.md`, `PLATFORM_STRATEGIC_AUDIT.md`, `SPRINT_0_AUDIT.md`, `phase-*.md`, `build-readiness-brief.md`, `synthetic-seed-file-plan.md`, `demo-walkthrough.md`)
- `archive/handoffs/` — point-in-time handoff snapshots (`HANDOFF_NEXT.md`)
- `archive/contribution-source-layer/` — KORA Contribution source layer audits and handoff
- `archive/kora-space/` — KORA Space contribution integration audits
- `archive/gate2/` — historical Gate 2 staging and review docs, each archived with a redirect note; canonical current Gate 2 status now lives in `docs/GATE2_STATUS.md` (`docs/` root). Gate 3 status is unaffected by this reconciliation and still lives in `GATE3_LEGAL_DPO_READINESS_REVIEW.md` at `docs/` root.
- `archive/kora-link/` — historical KORA Link design, migration review, and decision docs (KORA Link is frozen; current status source is `KORA_LINK_GATE_REPORT.md` and `KORA_LINK_CHANGELOG.md`, still at `docs/` root)
- `archive/qa/` — historical QA/staging-access results and reports (live QA references remain at `docs/` root: `E2E_TESTING.md`, `ENVIRONMENT_SAFETY_CHECK.md`, `API_ROUTE_AUTH_MATRIX.md`)
- `archive/sprints/` — raw working notes from specific completed sprints (`sprint-B168-5/`, `sprint-B168-6/`, `sprint-B169/`)
- `archive/legacy-schema/` — early superseded schema draft, pre-dates the current `12-technical-data-model-database-schema.md`

Archived documents are historical records and may not reflect the current runtime state. Current status and canonical docs will be consolidated in a later Professionalization Sprint step.
