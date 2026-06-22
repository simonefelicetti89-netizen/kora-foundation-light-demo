# Gate 2 — CTO Architecture Review & Close Decision

**Verdict:** CLOSE GATE 2 WITH CONDITIONS  
**Reviewer:** CTO Architecture Review (automated evidence synthesis)  
**Date:** 2026-06-22  
**HEAD at review:** `6fb2b2e`  
**Staging project:** `haqflkurpmeaxpikozjl` — only  
**Production:** NOT touched

> **Migration 027 NOT applied.**  
> **Migration 029 NOT applied.** Emergency safety net only.  
> No secrets, passwords, tokens, or connection strings are included in this document.

---

## 1. Evidence Reviewed

| Document | Version | Status |
|---|---|---|
| `docs/GATE2_STAGING_EXECUTION_CHECKLIST.md` | v1.0 | Reviewed |
| `docs/GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md` | v1.1 | Reviewed |
| `docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md` | v1.4 | Reviewed |
| `docs/GATE2_PHASE1_AUTH_USERS_AND_SMOKE_READY.md` | — | Reviewed |
| `docs/GATE2_PHASE1_AUTH_INTEGRITY_AUDIT.md` | — | Reviewed |
| `docs/GATE2_PHASE1_VALID_AUTH_USERS_READY.md` | v1.1 | Reviewed |
| `docs/GATE2_STAGING_APP_ENV_WIRING.md` | — | Reviewed |
| `tests/unit/gate2-*.test.ts` | 18 files | All PASS |
| `tests/unit/route-privacy.test.ts` | — | PASS |
| `tests/unit/tenant-isolation.test.ts` | — | PASS |
| Full unit suite | 175 files, 7047 tests | PASS |
| `tsc --noEmit` | — | PASS |

---

## 2. Assessment Matrix

| Area | Verdict | Notes |
|---|---|---|
| Migration safety | **PASS WITH NOTE** | 001–026 + 028 applied clean. 027 deliberately suspended — requires Gate 3 + service-role smoke. Correct decision. |
| Staging/production separation | **PASS** | Only `haqflkurpmeaxpikozjl` touched. Production never linked. All secrets gitignored. No connection strings in commits. |
| Auth integrity | **PASS** | Ghost user incident identified, documented, and resolved. 4 valid users with `auth.identities`. Sign-in 4/4 PASS. Passwords in gitignored file. Direct `auth.users` INSERT rule established. |
| Tenant resolution | **PASS** | `kora.tenant_id()` confirmed present on staging. `kora_tenant_id` in `raw_app_meta_data`. STAGE-001 at known UUID. |
| Worker identity resolution | **PASS WITH NOTE** | `kora_worker_ref` set in `raw_app_meta_data`. Worker identity rows linked to real auth UUIDs. Note: metadata uses `kora_worker_ref` not `kora_worker_id` — verify claim name is consistent with what RLS policies evaluate before applying 027. |
| Personal data boundary | **PASS** | RLS enabled and FORCE RLS on all 10 `personal.*` tables. No COMPANY_ADMIN policies on any `personal.*` table. C-11 PASS. C-12 PASS. W-04 PASS (cross-worker isolation). |
| Company aggregation boundary | **PASS** | All 4 SECURITY DEFINER functions confirmed with fixed `search_path`. `workforce_baseline` scoped by `kora.tenant_id()`. No employer-facing component reaches individual worker data. |
| RLS posture | **PASS WITH NOTE** | Pre-027 `kora_admin_all` policies on `personal.*` and `analytics.impact_unit` are expected and documented. Not a defect — 027 removes them. Current posture is understood and tracked. |
| PostgREST exposure | **PASS** | No `anon` grants on `personal.*`, `analytics.*`, or `commons.*`. PostgREST schema exposure fix applied. SECURITY DEFINER functions fixed. |
| Browser smoke credibility | **PASS** | Manual smoke was technically credible: login, routing, Status Center, privacy boundary all observed. Operator signed off. |
| Empty onboarding state interpretation | **PASS** | Empty dashboards correctly classified as EMPTY BY DESIGN / ONBOARDING STATE. No fake fallback. No synthetic data added for dashboard inflation. Status Center accurately reflects onboarding stage. |
| Test coverage | **PASS** | 7047 tests across 175 files. Gate2-specific tests cover auth, provisioning, smoke, privacy, tenant isolation. All pass. |
| TypeScript / build readiness | **PASS** | `tsc --noEmit` clean. No type errors. |
| Documentation quality | **PASS** | Comprehensive docs for every phase. Migration state clearly tracked. Authority hierarchy documented. Privacy verification queries included. Ghost user incident documented as process improvement. |
| Operational reproducibility | **PASS WITH NOTE** | Full checklist and correct Auth Admin API method documented. Note: no Vercel project linked — staging is local-run only. A Vercel Preview environment is not yet verified. |
| Residual risk | **PASS WITH NOTE** | See section 5. Principal risks are expected and gated: 027 suspended, Gate 3 not started, no real data. These are not defects in Phase 1. |

---

## 3. Gate 2 Decision

**CLOSE GATE 2 WITH CONDITIONS**

Gate 2 Phase 1 is complete. The evidence base is credible, documented, and reproducible. The staging environment is a correctly isolated synthetic environment with no real worker data. All privacy invariants hold. Auth integrity was repaired and verified. The test suite is clean.

Gate 2 is closed for the purpose of authorizing the next product and architectural phases (Next.js build, demo scaffold, pilot preparation).

### Conditions

1. **Migration 027 remains suspended** until Gate 3 (Legal/DPO) is formally closed.  
   027 must not be applied before Gate 3 sign-off on the personal-schema RLS design.

2. **Before applying migration 027**, a staging smoke test of the service-role worker provisioning path (`/api/admin/workers/provision` → `insertWorkerIdentity()`) must pass after 027 is applied. Rollback migration 029 must be available (it already is).

3. **Worker identity claim name consistency** must be verified before applying 027: confirm that `kora_worker_ref` in `raw_app_meta_data` is the correct claim name evaluated by RLS policies, or that `kora_worker_id` is used consistently. Discrepancy must be resolved.

4. **Gate 3 (Legal/DPO) must open** before any real worker data is introduced into any environment.

5. **Gate 5 (Tax/Fiscal) must open** before any live fiscal or incentive outputs are enabled.

---

## 4. Migration 027 Recommendation

**Recommendation: A — Remain suspended. Prepare for Gate 2.2 hardening sprint after Gate 3 closes.**

Rationale:

- The current staging smoke passed without 027. Browser smoke, privacy isolation, and auth integrity all verified with pre-027 posture. There is no technical pressure to apply 027 now.
- 027 removes `kora_admin_all` policies on `personal.*`. This is a privacy hardening step that is correct and necessary — but it requires Gate 3 (Legal/DPO sign-off on the personal-schema design) before it can be applied to any environment where real data may appear.
- The service-role provisioning path (`worker-provisioning-service-key.ts`, `insertWorkerIdentity()`) exists and is confirmed in the build. It has not yet been smoke-tested on staging with 027 applied — that test is the final prerequisite.
- Rollback migration 029 is prepared, committed, and NOT applied. Its rules are documented.
- Applying 027 immediately would cross into Gate 3 scope (RLS design review) before that gate has opened. That is out of sequence.
- Discarding or reworking 027 is not warranted — the migration is technically correct. It simply requires the right gate order.

**Action:** Schedule Gate 2.2 hardening sprint after Gate 3 close. Scope: apply 027 to staging, run service-role provisioning smoke test, verify no worker provisioning breakage, leave 029 unapplied.

---

## 5. Residual Risks

### Technical risks

| Risk | Severity | Status |
|---|---|---|
| 027 not applied — `kora_admin_all` on `personal.*` remains | Medium | Expected. Gated on Gate 3. Not a defect. |
| `kora_worker_ref` vs `kora_worker_id` naming inconsistency in app_metadata | Low | Document and resolve before 027 sprint. |
| No Vercel Preview environment verified | Low | Staging is local-only. Vercel Preview is unverified. |
| No real data smoke test | Informational | Intentional — no real data. Staging uses synthetic data only. |

### Privacy risks

| Risk | Severity | Status |
|---|---|---|
| Gate 3 (Legal/DPO) not started | High | Must open before real worker data introduced. Blocks 027, live data, and any real worker onboarding. |
| KORA_ADMIN direct access to `personal.*` remains (pre-027) | Medium | Expected. Documented. Removed by 027 when Gate 3 clears. |

### Product / demo risks

| Risk | Severity | Status |
|---|---|---|
| Empty dashboards for staging tenant | Informational | Correct. Onboarding state. No dataset loaded. Not a bug. |
| No dataset/scoring/Decision Pack in staging | Informational | By design. Phase 2 scope if needed for demo. |

### Staging / provisioning risks

| Risk | Severity | Status |
|---|---|---|
| Ghost user failure mode is documented | Low | Root cause understood. Correct method (Auth Admin API) established. Unlikely to recur. |
| Staging is local-run only (no Vercel Preview) | Low | Acceptable for Gate 2 Phase 1. |

### Commercial readiness risks

| Risk | Severity | Status |
|---|---|---|
| Gate 3 not started — blocks live worker data | High | Must be addressed before any pilot with real workers. |
| Gate 5 not started — blocks fiscal outputs | Medium | Must be addressed before any fiscal/incentive activation. |
| No external-facing demo environment deployed | Medium | Local demo only. External demo requires separate provisioning decision. |

### What must happen before Gate 3

- Gate 2 formally closed (✓ done per this document).
- Legal/DPO review of personal-schema RLS design, KORA_ADMIN access model, and worker data flow.
- Migration 027 prerequisite checklist reviewed by DPO (in particular: SECURITY DEFINER function design and KORA_ADMIN access removal).
- Privacy notice / consent model defined for real worker onboarding.

### What must happen before any external demo

- Staging or dedicated demo environment accessible from external URLs (Vercel Preview or equivalent).
- Auth redirect URLs configured for external origin.
- Synthetic data loaded to populate a meaningful demo scenario (dataset, scoring run, Decision Pack).
- Demo role switcher confirmed working in live mode with staging Supabase.

### What must happen before production

- Gate 3 closed (Legal/DPO sign-off).
- Gate 5 closed (Tax/Fiscal sign-off).
- Migration 027 applied to staging and smoke-tested.
- Production Supabase project provisioned (separate project, not haqflkurpmeaxpikozjl).
- Production auth users and tenant provisioned via Auth Admin API.
- Full privacy DPIA completed.
- No real worker data until all gates closed.

---

## 6. Final Checklist

| Check | Status |
|---|---|
| Production was not touched | ✓ CONFIRMED |
| No production connection strings printed | ✓ CONFIRMED |
| No secrets printed | ✓ CONFIRMED |
| No passwords printed | ✓ CONFIRMED |
| No tokens printed | ✓ CONFIRMED |
| Only staging project `haqflkurpmeaxpikozjl` targeted | ✓ CONFIRMED |
| No migrations applied in this review | ✓ CONFIRMED |
| No `supabase db push` | ✓ CONFIRMED |
| No `supabase migration up` | ✓ CONFIRMED |
| Migration 027 remains not applied | ✓ CONFIRMED |
| Migration 029 remains not applied | ✓ CONFIRMED |
| No schema/RLS/grant/policy changes | ✓ CONFIRMED |
| No formulas changed | ✓ CONFIRMED |
| No product logic changed | ✓ CONFIRMED |
| No demo/fake fallback enabled | ✓ CONFIRMED |
| Local env files not committed | ✓ CONFIRMED |
| Auth users: 4 valid, no ghost users | ✓ CONFIRMED |
| Passwords in gitignored local file only | ✓ CONFIRMED |
| Full test suite PASS (7047 tests) | ✓ CONFIRMED |
| `tsc --noEmit` clean | ✓ CONFIRMED |

---

## 7. Recommended Next Step

**Open Gate 3 (Legal/DPO review).** Gate 2 is closed. The architecture is sound for the controlled pilot demo phase. No technical work is required before Gate 3 opens — but Gate 3 is the prerequisite for real worker data, migration 027, and any live deployment.

The Gate 2.2 hardening sprint (migration 027 + service-role provisioning smoke) should be scheduled after Gate 3 closes, as a controlled, scoped operation separate from the main product build.

---

**Document version:** v1.0  
**Prepared:** 2026-06-22  
**Gate 2 status:** **CLOSED WITH CONDITIONS** (per this document)  
**Gate 3 status:** OPEN — not started  
**Gate 5 status:** OPEN — not started  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
