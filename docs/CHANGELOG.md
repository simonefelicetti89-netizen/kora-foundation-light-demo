# KORA Docs — Changelog

A dated log of documentation consolidation/reconciliation work — distinct from `KORA_LINK_CHANGELOG.md` (KORA Link specifically) and `PLATFORM_READINESS_CHANGELOG.md` (the earlier `platform/readiness` branch's own log, historical).

---

## 2026-07-03 — CLEANUP-01: docs/consolidation reconciliation

**Branch:** `cleanup/docs-consolidation-reconcile`, based on `main` @ `8210247`.

**What this did:** the branch `docs/consolidation` (CC-01 through CC-06, based off `main` @ `eaecdad`, 2026-06-30 — 58 commits behind `main` by the time of this reconciliation) contained genuinely valuable but unmerged documentation: a repository architecture reference, a 25-area platform inventory, a technical debt map, a vibecoding risk-reduction plan, a product doctrine, a data model reference, and a large invariants catalog. None of it had been reconciled with everything that happened on `main` since: KORA-INDEX-VERSION-02 (public label unification to KORA Index v1.0), the GOLDEN-01 through GOLDEN-04-DOCS track (golden path audit, E2E fixtures, doc corrections), Vercel Production deployment verification, and the role-switcher bug fix.

**What was created/updated as canonical docs (in `docs/`):**
- `STATUS.md` — new. Master current-state doc; supersedes `PLATFORM_READINESS_SUMMARY.md`/`PLATFORM_READINESS_CHANGELOG.md` as the "what's actually true right now" reference.
- `ARCHITECTURE.md` — new. Reconciled from the old branch's `ARCHITECTURE.md` + `docs/KORA_PLATFORM_INVENTORY.md`: repo map, engine pipeline, roles/access model, Supabase architecture, off-limits areas, known debt — with component names, version labels, and status claims updated to match current `main` rather than the 2026-06-30 snapshot.
- `GOLDEN_PATH.md` — new. Status/readiness doc (proven vs. not proven, E2E checkpoint log), distinct from the existing operational runbooks (`GOLDEN_PATH_RUNBOOK.md`, `PILOT_INTAKE_PROTOCOL.md`), which it cross-references rather than duplicates.
- `METHODOLOGY.md` — new. The KORA Index v1.0 / KORA Methodology Architecture v3 distinction, current 10-component names, IU formula — a single unambiguous reference after historical label drift.
- `QA_STATUS.md` — new. Test/E2E/Production-verification checkpoint status, including the RLS-negative-test gap and what "golden path" tests actually do vs. their names imply.
- `KORA_LINK_STATUS.md` — new. Current frozen status, correcting an oversimplified "not implemented" framing — a real Gate-1-complete runtime skeleton exists behind a default-off flag, but is blocked on open CTO/DPO/RLS review gates.
- `README.md` — updated to index the new canonical docs.

**What was deliberately NOT merged, and why:**
- `lib/constants/feature-flags.ts` (a `KORA_LINK_ENABLED` flag file) and the matching `.env.local.example` addition — this is runtime code and KORA Link scaffolding; out of scope for a docs-only cleanup, and KORA Link already has its own flag/config module (`lib/kora-link/config.ts`) on the `feat/kora-link-v1-platform` branch, which is the more current source of truth if that work is ever reconciled.
- Root-level `ARCHITECTURE.md`, `CHANGELOG_CONSOLIDATION.md`, `DATA_MODEL.md` — the source branch placed these at repo root, which conflicts with the PROF-01/PROF-02B-LIGHT root-cleanliness rule (root holds only `README.md` and `CLAUDE.md`). Their durable content was folded into `docs/ARCHITECTURE.md` instead; `DATA_MODEL.md` specifically overlaps with the existing canonical `docs/12-technical-data-model-database-schema.md` and was not merged — a dedicated compare between the two is a reasonable follow-up, not attempted here.
- `spec/INVARIANTS.md` (2008 lines, 35+ documented invariants across at least three sections) and `spec/KORA_PRODUCT_DOCTRINE.md` — genuinely valuable, but importing either faithfully in this pass would have been a large, rushed undertaking working against this sprint's own "keep changes reviewable and not massive" instruction. Flagged as a recommended dedicated follow-up sprint (compare against `CLAUDE.md`'s existing constitutional rules for overlap/gaps before deciding whether to formally adopt).
- `docs/TECHNICAL_DEBT_MAP.md` and `docs/VIBECODING_RISK_REDUCTION_PLAN.md` — the *categories* of debt they identified (React anti-patterns, `no-explicit-any` usage, migration promotion status, shell/placeholder pages) are noted qualitatively in `ARCHITECTURE.md` §10, but their specific counts/line numbers (ESLint error counts, etc.) were not re-verified and are not restated as current fact — they're 58 commits stale and would need a fresh lint run to trust.

**Stale claims explicitly avoided or corrected while doing this** (not reintroduced from the old branch): KORA Index version labels other than v1.0/Methodology Architecture v3; `/company/kora-index` falling back to synthetic/Meridiana data (it doesn't); `/admin/data-intake` having no real file upload (it does, for real tenants); KORA_ADMIN not existing in staging; the role-switcher bug being unfixed; Vercel having no linked project.

**Checks run:** `npx tsc --noEmit`, `npm test`, `npm run build` — see the reconciliation's final report for results. Authenticated E2E was not run. No Supabase, DB, migration, KORA Link implementation, or scoring/methodology-logic changes were made.

**Recommended next sprint:** see `STATUS.md` and `QA_STATUS.md` for the current punch list (COMPANY_B provisioning, RLS negative tests, Production E2E). Separately: a dedicated `spec/INVARIANTS.md` reconciliation sprint, and a `DATA_MODEL.md` vs. `docs/12-technical-data-model-database-schema.md` compare, are both reasonable follow-ups not attempted here.

---

## 2026-07-12 — B174-A2: Company B / STAGE-001 documentation reconciliation

**Context:** `DEMO-DEP-RO` (demo dependency audit) and `B174-PLAN-01` (Company B provisioning plan) found that `docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/PILOT_SAAS_READINESS.md`, and most of `docs/PILOT_GOVERNANCE.md` still stated "COMPANY_B does not exist" and that `A02`–`A04`/`T01`/`T02`/`GD01` had never run live — while `docs/E2E_TWO_TENANT_ISOLATION.md` and `docs/E2E_GOLDEN_PATH.md` (updated 2026-07-09, already on `main` before these audits ran) documented the opposite: a live staging session in which Company B/`STAGE-001` was provisioned and all of the above ran and passed, with explicit founder approval.

**B174-A** (read-only) investigated this using only repo docs, git history (notably `FIX-A04-TENANT-HEADING-RACE`, a bug fix only discoverable by actually executing the test), and local non-secret `.env.e2e.local` configuration presence (variable names/non-emptiness only, no values). Concluded repo evidence strongly indicates the 2026-07-09 session genuinely occurred, not independently re-verified live.

**B174-A2** (this entry) reconciled the stale docs identified above, plus `docs/PILOT_OPERATING_RUNBOOK.md`, `docs/PILOT_REVIEW_PACKAGE.md`, `docs/PILOT_PRIVACY_GOVERNANCE.md`, `docs/PILOT_DEMO_SCRIPT.md`, and `tests/unit/pilot-governance-inventory.test.ts`, so none of them present the pre-2026-07-09 state as current fact. Every updated claim carries an explicit "documented as passed/provisioned, 2026-07-09 — not independently re-verified since" caveat rather than asserting the 2026-07-09 record as a freshly-confirmed fact. `docs/PILOT_GOVERNANCE.md` §15a is the canonical record of this reconciliation; `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md` §0 cross-references it.

**Checks run:** `npx tsc --noEmit`, `npm test` (required — `tests/unit/pilot-governance-inventory.test.ts` was restructured), `npm run build`. No Supabase, migration, GD01, authenticated E2E, user creation, or Vercel/deploy action was taken.

**Recommended next step:** a fresh, operator-approved re-confirmation of the 2026-07-09 staging session (`A02`–`A04`, `T01`/`T02`, `GD01`) before any of it is relied upon for a client-facing claim or further B174 demo-tightening validation.
