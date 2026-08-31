# KORA Master Plan v2.1 — Governance Patch 02

**Status:** ACTIVE ADDENDUM — does not modify the frozen Master Plan
**Date:** 2026-08-31
**Applies to:** `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` (FINAL FREEZE VERSION)
**Trigger:** B-CI closure verification and N1 prerequisite recheck (CC-007, §19/§20/§29)

---

## Authority

- `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` remains frozen and is **not edited** by this patch.
- This patch records B-CI's closure criteria and the actual repository evidence meeting them, plus an independent recheck of N1's prerequisites. It changes no commercial or product scope, no methodology, no pillar, no KORA Index component, and no privacy rule.
- Where this patch and the frozen Master Plan appear to disagree, the frozen Master Plan's literal text governs.

---

## B-CI closure

**B-CI (CC-007, "CI / migration truth") is COMPLETE.**

Per §19 (line 554), B-CI's own stated scope is "migration & E2E truth," with no prerequisite and the explicit purpose of blocking N1's new migrations until it exists ("blocca N1: nessuna nuova migrazione prima"). §30 (line 860) types it as CC-007, `A-audit`. Neither this row nor any other section of the frozen text names staging infrastructure, a specific spec-file set, or a browser-authenticated environment as a B-CI requirement — "E2E catena completa" is a separate, later item (CC-043, block "release," §30 line 884), and the Fresh Tenant Test (§24) and Security/Privacy "E2E genuinely executed" criterion (§26) are likewise distinct, later gates.

Current `main` (`6da8d9f`) contains, verified on the actual merged commit's CI run (7/7 checks green):

- **Clean-clone reproducibility** — `actions/checkout` + `npm ci` on every job; `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run lint` (a real blocking gate, ESLint's own `--suppress-all` baseline mechanism).
- **DB-backed migration/RLS gate** — `kora-link-local-integration` job: Docker-mandatory, `supabase start` applying every current migration fresh, a real-query Postgres readiness proof, mandatory zero-skip RLS-03/05/06/07/08/09/10, and the KORA Link behavioral suite.
- **Public E2E smoke** — `e2e-smoke` job: `tests/e2e/kora-smoke.spec.ts`, 6/6 passing, credential-free, real `next dev` + real Chromium, blocking.
- **Local authenticated golden-path E2E** — `e2e-golden-path-local` job: `tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts`, 4/4 passing, against a real ephemeral local Supabase/Postgres stack seeded with real (synthetic, per-run) `KORA_ADMIN`/`COMPANY_ADMIN`/`WORKER` identities via `scripts/e2e/seed-local-golden-path.ts`; proves real login, role-scoped session routing, and cross-role access denial. Blocking, zero staging dependency, zero committed secrets.
- **Dependency audit and secret scan** — `security.yml`'s `npm-audit` (blocking on high/critical) and `gitleaks` (full-history scan), both pre-existing and passing.

The 4 remaining Playwright spec files under `tests/e2e/` (`authenticated-smoke.spec.ts`, `golden-admin-company.spec.ts`, `two-tenant-isolation.spec.ts`, `golden-data-bearing.spec.ts`) require real browser-side authentication against a real `*.supabase.co` domain — `next.config.ts`'s CSP `connect-src` has no `localhost`/`127.0.0.1` exception, so these are structurally incapable of running against local infrastructure regardless of credentials. They are **explicitly deferred**, not owned by B-CI: they belong to CC-043 "E2E catena completa" (block "release"), the Fresh Tenant Test (§24, FT-1/FT-2/FT-3 — full N1–N14 pipeline against adversarial/messy/listening data, not yet buildable since that pipeline doesn't exist yet), and the Security/Privacy (§26) and Pilot Release (§27) gates. No staging credential, secret, or CI job was added to reach this closure.

---

## N1 prerequisite status

Both B-SPEC and B-CI were independently verified in this task (§20, line 574: `N1 | ... | B-SPEC, B-CI | L | START`).

- **B-CI — COMPLETE.** See above.
- **B-SPEC — NOT COMPLETE.** §19 (line 564): `B-SPEC | ontologia + spec nel repo | D-K | S | blocca tutto Phase B`. B-SPEC's own prerequisite is founder decision **D-K**. The domain ontology content itself (Program/Investment/Decision/Survey/Needs three-level model) is substantively present in the frozen Master Plan's own §3, but D-K — the founder decision gating B-SPEC's formal closure — has not been resolved or recorded anywhere in this repository (checked `lib/architecture/registry.ts`, where D-A/D-B/D-C were each explicitly resolved and recorded this session with a `decisionRef`; checked `docs/21-founder-gate-resolution-log.md`, a distinct D-01–D-21 scheme; checked the Master Plan's own text for any resolution marker). No such record exists for D-K. Content existing is not the same as the block's own stated gate being satisfied — the same distinction this session already applied to CC-010/D-C before that gate was explicitly closed.

**N1 is not pre-approved by this patch.** Beyond the B-SPEC gap, an independent sequencing constraint applies regardless of B-SPEC's status: §29 (line 842), the Master Plan's own "Sicuri" (safe-to-parallelize) list, states `N1…N6 ∥ qualunque consolidamento tranne B-TRUTH` — N1 through N6 are explicitly **not** listed as safe to run alongside B-TRUTH specifically (every other consolidation block, yes; B-TRUTH, no), and line 843's "Mai" (never) list separately states `B-TRUTH con qualunque codice` (B-TRUTH is never combined with any other code). B-TRUTH has not closed (I9 is not 0; CC-022/CC-023 have not run). This is a second, independent reason N1 cannot begin now, on top of the B-SPEC gap.

`N1_TECHNICALLY_UNBLOCKED (prerequisite row alone) = NO — B-SPEC unmet`

`N1_CAN_START_NOW (full sequencing) = NO — B-SPEC unmet AND B-TRUTH open`
