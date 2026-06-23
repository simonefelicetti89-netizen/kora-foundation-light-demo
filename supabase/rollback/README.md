# supabase/rollback — Manual Rollback Artifacts

This directory contains SQL rollback files that are **manual-only emergency artifacts**.

They are intentionally removed from `supabase/migrations/` so that
`supabase migration up` will never apply them automatically.

---

## Rules

### 1. Never apply via `supabase migration up`

Files in this directory are **not migration files**. They must never be executed
through the Supabase CLI migration pipeline. Applying them via `migration up`
would be a silent, uncontrolled schema change.

**Only valid execution paths:**

```
supabase db query --linked --file supabase/rollback/<file>.sql
```

or an equivalent controlled SQL execution with explicit operator confirmation.

### 2. Explicit CTO / technical-owner approval required

No file in this directory may be applied to any environment without:

- Written confirmation from the CTO or technical owner that rollback is authorized.
- A documented incident or change record identifying the root cause that requires rollback.
- Confirmation that a forward fix (new migration, patch, config change) is not viable.

### 3. Staging and production targets must be confirmed separately

Applying a rollback to staging does **not** authorize the same rollback on production.
Production rollback requires a separate, explicit approval process and must be treated
as an incident change — not a routine deployment step.

### 4. Rollbacks are temporary

A rollback file restores a previous state to unblock a broken environment.
It is not a permanent fix. After rollback:

- Identify and document the root cause.
- Deploy a forward fix (new migration).
- Re-apply the original hardening migration (or its successor) as soon as feasible.

---

## Files

### `029_rollback_027_if_needed.sql`

| Property | Value |
|---|---|
| Rolls back | Migration 027 (`027_worker_individual_rls_refactor.sql`) |
| Effect | Re-adds 6 KORA_ADMIN policies on `personal.*` and `analytics.impact_unit` |
| Trigger condition | 027 applied AND confirmed staging breakage (e.g., worker provisioning fails, service-role path not deployed) |
| Authorization required | Explicit CTO / technical-owner approval |
| Staging target | `haqflkurpmeaxpikozjl` only — confirmed in writing before execution |
| Production target | Separate approval required — treat as incident change |
| Forward-fix preference | Always prefer deploying the service-role path and re-running provisioning over this rollback |
| Status | **NOT APPLIED** — retained as safety net only |

**Do not apply 029 unless all of the following are true:**

1. Migration 027 has been applied and verified.
2. 027 has caused a confirmed, reproducible breakage that cannot be resolved forward.
3. The rollback has been explicitly approved by the technical owner in writing.
4. The target environment is confirmed (staging = `haqflkurpmeaxpikozjl`; production = separate approval).
5. A post-rollback recovery plan (forward fix) is in place.

---

### `030_rollback_030_if_needed.sql`

| Property | Value |
|---|---|
| Rolls back | Migration 030 (`030_uef_admin_access_hardening.sql`) |
| Effect | Re-adds `kora_admin_all_uef` policy on `analytics.uef_record`; drops 030 SECURITY DEFINER functions |
| Trigger condition | 030 applied AND confirmed staging breakage (e.g., UEF review workflow broken, generate-candidates fails) |
| Authorization required | Explicit CTO / technical-owner approval |
| Staging target | `haqflkurpmeaxpikozjl` only — confirmed in writing before execution |
| Production target | Separate approval required — treat as incident change |
| Forward-fix preference | Always prefer a 031 patch migration over this rollback |
| Status | **NOT APPLIED** — retained as safety net only |
| Privacy note | Applying this file restores raw payload access for KORA_ADMIN JWT AND ADVISOR JWT (advisor_tenant_uef_read). Both are PRIVACY REGRESSIONS. DPO must be informed if applied to real-data environments. |

**Do not apply 030 rollback unless all of the following are true:**

1. Migration 030 has been applied and verified.
2. 030 has caused a confirmed, reproducible breakage that cannot be resolved forward.
3. The rollback has been explicitly approved by the technical owner in writing.
4. The target environment is confirmed (staging = `haqflkurpmeaxpikozjl`; production = separate approval).
5. A post-rollback recovery plan (forward fix) is in place.
6. DPO is informed if the rollback touches an environment with real worker data.

---

### `031_rollback_031_if_needed.sql`

| Property | Value |
|---|---|
| Rolls back | Migration 031 (`031_revoke_public_execute_uef_definer_functions.sql`) |
| Effect | Re-grants PUBLIC EXECUTE on 4 UEF SECURITY DEFINER functions; removes explicit service_role grant added by 031 |
| Trigger condition | 031 applied AND confirmed staging breakage that cannot be resolved forward (e.g., service_role path fails despite explicit grant) |
| Authorization required | Explicit CTO / technical-owner approval |
| Staging target | `haqflkurpmeaxpikozjl` only — confirmed in writing before execution |
| Production target | Separate approval required — treat as incident change |
| Forward-fix preference | Always prefer a 032 patch migration over this rollback |
| Status | **NOT APPLIED** — retained as safety net only |
| Security note | Applying this file restores PUBLIC EXECUTE on all 4 UEF SECURITY DEFINER functions. Gate 2.3 M-04 finding is REOPENED. Internal auth checks continue to protect data, but anon can call the functions. DPO must be informed if applied to any real-data environment. |

**Do not apply 031 rollback unless all of the following are true:**

1. Migration 031 has been applied and verified.
2. 031 has caused a confirmed, reproducible breakage that cannot be resolved forward.
3. The rollback has been explicitly approved by the technical owner in writing.
4. The target environment is confirmed (staging = `haqflkurpmeaxpikozjl`; production = separate approval).
5. A post-rollback recovery plan (forward fix) is in place.
6. DPO is informed if the rollback touches an environment with real worker data.

---

**Maintained by:** KORA Engineering  
**Last updated:** 2026-06-23
