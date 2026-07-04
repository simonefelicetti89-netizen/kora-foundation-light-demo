# KORA — Pilot SaaS Readiness

**Date:** 2026-07-04
**Sprint:** PILOT-SAAS-01
**Audience:** anyone deciding what to work on before the first real client pilot, or scoping Partner/Advisor work after it

Practical, short. See `docs/STATUS.md`/`docs/QA_STATUS.md` for full verification detail, `docs/ARCHITECTURE.md` for structure, `docs/access-matrix.md` for the authoritative access rules, `docs/FUTURE_ROLES_AND_SURFACES.md` for Partner/Advisor specifics.

---

## What is ready for a first pilot

- **Service-assisted golden path** works manually: upload → UEF → approval → scoring → KORA Index → Decision Pack, operated by KORA_ADMIN (`docs/GOLDEN_PATH_RUNBOOK.md`).
- **COMPANY_ADMIN** can log in and view their own live KORA Index, activation, pillars, reports — read-only, tenant-isolated.
- **WORKER** access exists and is privacy-safe by construction (own PIB only, never company-visible).
- **Tenant isolation at the DB level** is now proven, not just designed — RLS-03 (merged, PR #26) shows Postgres RLS itself rejects cross-tenant reads on `analytics.source_batch`/`kora_index_result`/`activation_result`.
- **Privacy architecture is real, not aspirational**: three-layer defense in depth (middleware → server layout → RLS), documented in `docs/access-matrix.md`, worker-individual data structurally unreachable from employer-facing code paths.
- **PARTNER is a real, working login-gated role today** — more built than commonly assumed (see `FUTURE_ROLES_AND_SURFACES.md`), though its useful surface is currently just a profile workspace, not an operational feature.

## What is not ready

- **No automated golden path E2E for the data-bearing steps** — the full upload→Decision Pack chain has only been driven manually. `tests/unit/b103-golden-path.test.ts` checks file existence, not behavior — don't cite it as coverage. `tests/e2e/golden-admin-company.spec.ts` (GOLDEN-E2E-01) now automates the admin/company workspace + data-surface-reachability half, plus a markup-level privacy smoke check — but not upload/UEF/scoring/Decision-Pack generation itself.
- **RLS negative testing is partial** — DB-level proven (RLS-03), but PostgREST/app-level (RLS-04) and worker-vs-worker (RLS-05) are still open.
- **COMPANY_B doesn't exist** — blocks any real two-tenant demonstration to a prospective client beyond synthetic data.
- **No authenticated E2E has run against Production** — only against local dev backed by real staging Supabase.
- **`app/my-kora/layout.tsx` gates role client-side**, not server-side like every other role area — the same bug class that already caused one production incident (ROLE-SWITCHER-01/02, now fixed elsewhere). Not fixed this sprint (real refactor, out of low-risk scope) — flagged as a top blocker below.
- ~~Two independent `KoraRole` type definitions exist~~ — **reconciled in ROLE-01** (2026-07-04, see `access-matrix.md`); this line itself was missed in that sprint's doc pass and is corrected now.
- **KORA Link, Partner Platform beyond profile view, and Advisor Platform are all explicitly not part of the pilot** — see below.

## Intended operator flow (pilot v1)

1. KORA_ADMIN onboards the company (setup, tenant config).
2. KORA_ADMIN performs data intake (upload, AI mapping review).
3. KORA_ADMIN reviews/approves UEF records.
4. KORA_ADMIN runs scoring, reviews Activation Safeguard status.
5. KORA_ADMIN generates and shares the Decision Pack / Board Pack.
6. COMPANY_ADMIN logs in separately to view their own live dashboard, reports, and pillar breakdowns — read-only.
7. WORKER (optional in v1, real but not the pilot's selling point) can log in to see their own PIB/Dynamic CV.

## What KORA_ADMIN does
Everything data-facing: intake, UEF approval, scoring, reporting, tenant provisioning, troubleshooting. This is the entire "service" in service-assisted SaaS — do not promise self-service to a pilot client yet.

## What COMPANY_ADMIN can see
Own tenant's aggregate KORA Index (all 10 components + Confidence Score + Activation Safeguard), pillar distribution, activation rates, financial/BTI indicators, department/cohort trends only at N≥10. Never: any named individual worker's PIB, UEF, or profile data.

## What WORKER can see
Own PIB, own Dynamic CV, own privacy/consent settings, own booking requests. Never another worker's data; never visible to their employer's admin view.

## What PARTNER might do in future
Today: view/manage own `network.partner_profile`/`partner_identity` record only. Future (deferred, not pilot v1): initiative participation visibility, service offering catalog, scan-point operational role (Gate 8, KORA Link). See `FUTURE_ROLES_AND_SURFACES.md`.

## What ADVISOR might do in future
Today: nothing live — no login, no route, no session guard, `/advisor` redirects to a static demo showcase. DB-layer read access (`fn_advisor_uef_read()`) already exists, hardened, unused. Future: Decision Pack review/comment, methodology feedback, onboarding support — always aggregate/anonymized unless explicitly authorized per engagement. See `FUTURE_ROLES_AND_SURFACES.md`.

## What must remain admin-operated (do not promise self-service yet)
Data upload, UEF approval, scoring runs, tenant provisioning, user creation. COMPANY_ADMIN is view-only by design in pilot v1.

## What must not be promised to clients yet
- Partner or Advisor login/dashboards as a real product surface.
- KORA Link / NFC activation of any kind.
- Self-service data upload or scoring trigger by COMPANY_ADMIN.
- A second company tenant for side-by-side demonstration (COMPANY_B doesn't exist).
- Any causal/predictive claim from HR KPI or ESG correlation views (explicitly non-causal by design, per CLAUDE.md §12.18).

## Top 10 blockers before a real pilot

1. Provision a real COMPANY_B (or the pilot client's actual second reference tenant) — currently blocks any live two-tenant demonstration.
2. Run `A02` (COMPANY_A E2E) locally and in Production — fixture exists, unexecuted.
3. Build at least one automated golden-path E2E (upload → scoring → Decision Pack) — **partially done:** `golden-admin-company.spec.ts` (GOLDEN-E2E-01) automates admin/company workspace reachability + a real data/report surface + a privacy smoke check; the upload → UEF → scoring → Decision Pack chain itself remains manual-only.
4. Extend RLS negative testing to PostgREST/app level (RLS-04) before claiming full tenant isolation, not just DB-level.
5. Convert `app/my-kora/layout.tsx` to server-side role gating, matching every other role area (admin/company/partner) — currently the one architectural outlier and a repeat-incident risk.
6. ~~Reconcile the two `KoraRole` type definitions before adding any new role~~ — **done in ROLE-01** (2026-07-04): both derive from `KORA_ROLES` in `lib/constants/kora.ts`, see `access-matrix.md`.
7. Resolve the KORA Link Gate 2 CTO TODOs (8 items in migration 034) — not pilot-blocking itself, but the longest-running open item on the roadmap.
8. Decide and document whether `/partner` (root, synthetic demo) or `/partner/workspace` (live) is the intended landing page for a real partner — currently both sit behind the same login with no visual distinction.
9. Re-verify lint status — not re-checked in the last several reconciliation passes per `QA_STATUS.md`'s own caveat.
10. Confirm Gate 2 status resolution — `CLAUDE.md` says OPEN, `docs/GATE2_CTO_CLOSE_REVIEW.md` recommends closing with conditions; unreconciled, per `STATUS.md`.

## Top 5 feature-expansion opportunities after pilot base is stable

1. **Partner Platform, phase 1**: extend the existing real `PARTNER` role/login to show initiative participation and aggregate-only outcome data — the auth/DB foundation already exists (`network.partner_profile`, `requirePartnerUser()`), this is additive, not greenfield.
2. **Advisor Platform, phase 1**: give `fn_advisor_uef_read()` an actual consumer — a real `ADVISOR` session guard + a read-only Decision Pack review route. DB-layer hardening is already done; this is almost entirely app-layer work.
3. **COMPANY_ADMIN self-service data intake** — once the golden path is automated/proven, consider letting COMPANY_ADMIN trigger their own uploads under supervision.
4. **Automated E2E golden path in CI** — turns every future change into a regression-checked one instead of manual-only verification.
5. **RLS-04/05/06** — complete the tenant-isolation test suite through PostgREST/app level and worker-vs-worker, closing the gap this sprint's role/access audit surfaced.
