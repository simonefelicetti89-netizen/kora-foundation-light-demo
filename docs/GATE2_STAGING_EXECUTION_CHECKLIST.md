# GATE 2 STAGING EXECUTION CHECKLIST

**Status:** Gate 2 OPEN — migrations written, NOT applied to any database.  
**Target environment:** kora-staging ONLY — project ref `haqflkurpmeaxpikozjl`  
**Production:** MUST NOT be touched at any point during Gate 2 staging execution.

---

## A. PRECONDITIONS — Verify ALL before running any migration

- [ ] Dedicated staging project confirmed — project name contains "staging" or is explicitly recorded as staging
- [ ] Project ref recorded: `haqflkurpmeaxpikozjl` — staging only
- [ ] Production project ref is NOT linked (verify with `cat supabase/.temp/project-ref`)
- [ ] Supabase CLI installed (`supabase --version`)
- [ ] CLI linked to staging ref only (`supabase link --project-ref haqflkurpmeaxpikozjl`)
- [ ] Secrets, keys, connection strings, passwords NOT printed to terminal or logs
- [ ] Rollback plan documented: only a follow-on migration can reverse schema changes — no `db reset` in staging with live data
- [ ] `lib/supabase/worker-provisioning-service-key.ts` exists and is deployed (required before applying mig 027)
- [ ] `app/api/admin/workers/provision/route.ts` uses `insertWorkerIdentity()` from service-key path (required before applying mig 027)
- [ ] Gate 2 (CTO architecture review) has been formally reviewed — mig 027 requires Gate 2 close
- [ ] Gate 3 (Legal/DPO review) has reviewed personal-schema RLS design — mig 027 requires Gate 3 sign-off

---

## B. APPLY ORDER — Strict sequence, no exceptions

### Pass 1: Apply migrations 001–026

Apply in numeric order: `001` → `002` → … → `026`

Run checkpoint queries after each high-risk migration (see section D).

### Pass 2: Apply migration 028

Apply `028_audit_log_enrichment.sql` after 026 is verified.

Verify audit log enrichment is correctly applied (see checkpoint D.028).

### Pass 3: Verify Pass 1 + 2

Run all verification targets in section E before proceeding to mig 027.

### Pass 4: Apply migration 027 SEPARATELY

`027_worker_individual_rls_refactor.sql` MUST be applied in an isolated pass, AFTER:

1. Passes 1 and 2 are complete and verified
2. All preconditions in the 027 block comment are confirmed (see migration file header)
3. Worker provisioning via service-role path has been smoke-tested in staging
4. **`029_rollback_027_if_needed.sql` exists in the repository** — do not apply 027 without 029 present
5. 029 has NOT been applied yet (it is the emergency safety net, not a prerequisite to apply)

> **Do not apply migration 027 without 029 present in the repository.**  
> `supabase/migrations/029_rollback_027_if_needed.sql` must exist before 027 is applied to any environment.  
> As of Gate 2 Phase 1 Safety Sprint, 029 is present and committed. It has NOT been applied.

**WHY 027 must be separate:**
- It removes `KORA_ADMIN INSERT` on `personal.worker_identity` permanently
- If the service-role provisioning path (`worker-provisioning-service-key.ts`) is not in the production build at the time of application, worker provisioning breaks with no RLS rollback path
- Reverting requires a follow-on migration — there is no instant undo
- Gate 2 AND Gate 3 sign-off are both required before applying 027
- Applying 027 together with 001–026 on the first pass would prevent safe abort if the preconditions above are not yet met

### Pass 5: Verify 027

Run checkpoint queries in section D.027.

---

## C. STOP CONDITIONS — Abort immediately if any of these are true

- [ ] Target project ref is production (not `haqflkurpmeaxpikozjl`)
- [ ] Target project ref is unknown or unconfirmed
- [ ] Rollback plan is not documented
- [ ] Any migration fails — do not continue to the next migration
- [ ] Helper function `kora.kora_role()` missing after mig 003
- [ ] Helper function `kora.tenant_id()` missing after mig 006
- [ ] Unexpected GRANT on `personal.*` tables to non-authenticated roles
- [ ] RLS is disabled on any sensitive table (`personal.*`, `analytics.impact_unit`)
- [ ] `COMPANY_ADMIN` can SELECT from `personal.*` tables
- [ ] `KORA_ADMIN` can directly SELECT/INSERT `personal.worker_pib` after mig 027 is applied
- [ ] `KORA_ADMIN` can directly SELECT/INSERT `personal.worker_pseudonym_map` after mig 027 is applied
- [ ] `KORA_ADMIN` can directly INSERT `personal.worker_identity` after mig 027 is applied
- [ ] `personal.worker_identity` INSERT fails via service-role path after mig 027

---

## D. CHECKPOINT QUERIES — Run after each high-risk migration

> These are verification queries only. Run via Supabase SQL Editor (staging) or `supabase db query` (staging).  
> Do NOT run these against production.

### After mig 001
```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('personal','analytics','kora','commons','governance');
```
Expected: all 5 schemas present.

### After mig 003
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'kora' AND routine_name IN ('kora_role','tenant_id');
```
Expected: both `kora_role` and `tenant_id` returned.

### After mig 006
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'kora' AND routine_name = 'tenant_id';
```
Expected: `tenant_id` present and updated.

### After mig 007
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'personal'
AND table_name IN ('worker_identity','worker_profile_private');
```
Expected: both tables present.

### After mig 013
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'commons'
AND table_name IN ('initiative','booking_request','contribution_event');
```
Expected: all 3 present.

### After mig 015
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'analytics'
AND routine_name LIKE 'fn_%aggregate%';
```
Expected: at least one aggregate function present.

### After mig 018
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'personal' AND table_name = 'worker_pib';
```
Expected: `worker_pib` present.

```sql
SELECT relrowsecurity, relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'personal' AND c.relname = 'worker_pib';
```
Expected: both `true`.

### After mig 022
```sql
SELECT policyname FROM pg_policies
WHERE schemaname = 'personal' AND tablename = 'worker_identity';
```
Verify no unexpected policies; expected worker-only and kora_admin read-only patterns.

### After mig 025
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'commons'
AND table_name IN ('booking_request','contribution_event');
```
Expected: both present.

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'commons'
AND routine_name LIKE 'fn_booking%';
```
Expected: booking aggregate/helper functions present.

### After mig 026
```sql
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'personal';
```
Verify: no policy grants COMPANY_ADMIN access to personal.* tables.

### After mig 028
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'governance' AND table_name = 'audit_log';
```
Expected: `audit_log` present with enriched columns.

### After mig 027
```sql
-- Confirm removed policies are gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'personal'
AND policyname IN (
  'worker_identity_kora_admin_all',
  'worker_pib_kora_admin_all',
  'worker_pseudonym_map_kora_admin_all',
  'worker_profile_kora_admin_all'
);
```
Expected: 0 rows.

```sql
-- Confirm KORA_ADMIN impact_unit direct policies are gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'analytics' AND tablename = 'impact_unit'
AND policyname IN ('kora_admin_impact_unit_read','kora_admin_impact_unit_insert');
```
Expected: 0 rows.

```sql
-- Confirm service-role provisioning still works
-- (Run smoke test: provision a test worker via /api/admin/workers/provision)
-- Expected: worker_identity row created, no RLS error.
```

---

## E. VERIFICATION TARGETS

### Schemas
- [ ] `personal` schema exists
- [ ] `analytics` schema exists
- [ ] `kora` schema exists
- [ ] `commons` schema exists
- [ ] `governance` schema exists

### Helper functions
- [ ] `kora.kora_role()` exists and returns correct role string
- [ ] `kora.tenant_id()` exists and returns correct tenant uuid

### RLS
- [ ] RLS ENABLED on `personal.worker_identity`
- [ ] RLS ENABLED on `personal.worker_pib`
- [ ] RLS ENABLED on `personal.worker_pseudonym_map`
- [ ] RLS ENABLED on `personal.worker_profile_private`
- [ ] RLS ENABLED on `personal.worker_cv_share`
- [ ] RLS ENABLED on `analytics.impact_unit`
- [ ] FORCE RLS enabled on all personal.* tables

### Policies
- [ ] Worker-own-read policy on `personal.worker_identity`
- [ ] Worker-own-read policy on `personal.worker_pib`
- [ ] No COMPANY_ADMIN policy on any `personal.*` table
- [ ] After mig 027: no `kora_admin_all` policy on `personal.*` tables

### personal.* privacy boundaries
- [ ] Worker can SELECT only own `personal.worker_identity` row
- [ ] Worker can SELECT only own `personal.worker_pib` row
- [ ] COMPANY_ADMIN SELECT on `personal.worker_pib` returns 0 rows (RLS blocks)
- [ ] KORA_ADMIN SELECT on `personal.worker_pib` returns 0 rows after mig 027
- [ ] `personal.worker_pseudonym_map` accessible only via SECURITY DEFINER functions

### Worker reads only self
- [ ] Authenticated worker JWT returns only rows where `worker_id = kora_worker_id claim`

### Tenant isolation
- [ ] Tenant A workers cannot read Tenant B `analytics.uef_record`
- [ ] Tenant A cannot read Tenant B `personal.*` data
- [ ] `kora.tenant_id()` scopes all multi-tenant queries correctly

### commons tables
- [ ] `commons.booking_request` exists with correct columns
- [ ] `commons.contribution_event` exists with correct columns
- [ ] Booking aggregate functions exist in `commons` schema

---

## F. MIGRATION 029 — ROLLBACK RULES

> These rules apply to `029_rollback_027_if_needed.sql`.

- **DO NOT apply 029 unless 027 has already been applied** and has caused a confirmed staging breakage.
- **DO NOT apply 029 preemptively** — it is not part of the normal apply sequence.
- **DO NOT apply 029 to production** without a separate, explicit technical-owner approval.
- **DO NOT use 029 to bypass 027** — the goal is always to fix the root cause and re-apply 027.
- After applying 029, fix the root cause (typically: deploy the service-role provisioning path), then re-apply 027 or a forward granularization migration.

---

## H. EXPLICIT WARNINGS

> **DO NOT run migrations against production.**  
> **DO NOT use production connection strings or project refs.**  
> **DO NOT run `supabase db push` until staging ref `haqflkurpmeaxpikozjl` is confirmed linked.**  
> **DO NOT apply mig 027 until Gate 2 AND Gate 3 are both formally closed.**  
> **DO NOT apply mig 027 until service-role worker provisioning path is confirmed in the build.**

---

## I. MIGRATION 027 — SEPARATE APPLY RATIONALE

Migration `027_worker_individual_rls_refactor.sql` must be applied separately from 001–026 because:

1. **Permanent removal**: It permanently drops `KORA_ADMIN INSERT` on `personal.worker_identity`. No instant rollback — only a follow-on migration can restore the policy.
2. **Service-role dependency**: Worker provisioning must transition to the service-role isolated path (`worker-provisioning-service-key.ts`) BEFORE applying. If the path is not deployed, worker onboarding breaks immediately after apply.
3. **Gate 2 + Gate 3 dual dependency**: Unlike 001–026 which require only Gate 2, mig 027 requires Gate 3 (Legal/DPO) sign-off on the personal-schema RLS design.
4. **Smoke test requirement**: A staging smoke test (provision a worker via service-role path) must pass AFTER applying mig 027, before any other environment is touched.
5. **Independent abort window**: Applying separately ensures mig 001–026 can succeed and be verified independently — if mig 027 preconditions are not yet met, the rest of the schema is still functional and staging is not blocked.

**Rollback considerations for mig 027:**
- Create a `029_rollback_027_if_needed.sql` with the original policies if staging smoke test fails
- The rollback migration re-adds `worker_identity_kora_admin_all`, `worker_pib_kora_admin_all`, `worker_pseudonym_map_kora_admin_all`, `worker_profile_kora_admin_all`
- Rollback must be prepared BEFORE applying mig 027 to staging

---

**Checklist version:** v1.0  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Prepared:** 2026-06-21  
**Applies to:** kora-staging only (`haqflkurpmeaxpikozjl`)
