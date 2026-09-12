# Company-Scoped RLS Pattern (KORA-WP-010)

Canonical reference for the RLS pattern any new **Company-scoped** table
introduced by an I1+ work package must follow. This is not a new
authorization framework — both patterns below already exist and are proven
across 17+ migrations; this document only names them so a future
implementer does not need to rediscover them by reading migration history.

Partner-scoped RLS is a separate template, out of scope here — see
`KORA-WP-051`.

## Pattern A — Tenant-claim-bound (ordinary Company-owned operational data)

Use when the table holds data that **belongs to** a tenant, and the
session's tenant claim is the correct authority for "which tenant is this."

```sql
CREATE POLICY "<table>_company_own_read" ON <schema>.<table>
  FOR SELECT USING (
    kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')  -- narrow to roles that legitimately apply
    AND tenant_id = kora.tenant_id()
  );
```

Precedent: `analytics.tenant.company_own_tenant_read` (migrations 001/002).
`kora.tenant_id()` reads `app_metadata.kora_tenant_id` from the session's own
JWT (canonical definition: migration 006) — trusted because it is set only by
server-side provisioning code, never by the client.

## Pattern B — Identity-bound (rows that ARE an ownership/membership fact)

Use when the row itself constitutes an identity's relationship to something
— i.e. when trusting the tenant claim to decide visibility would be circular
(the row is part of what establishes whether that claim is even legitimate).

```sql
CREATE POLICY "<table>_<role>_own_select" ON <schema>.<table>
  FOR SELECT USING (
    kora.kora_role() = '<ROLE>'
    AND auth_user_id = auth.uid()   -- cryptographically verified, not a claim
    -- AND status = 'active'         -- if the table has a lifecycle column
  );
```

Precedent: `personal.worker_identity.worker_identity_worker_own_select`
(migration 007); `analytics.company_memberships.company_memberships_company_admin_own_active_select`
(migration 052, KORA-WP-010).

`auth.uid()` resolves from the session's `sub` claim, which — unlike
`app_metadata.*` claims — cannot be influenced by any application code path
this repo's provisioning writes to; it always reflects who actually
authenticated.

## Choosing between A and B

Ask: **is this table's tenant_id the fact I'm protecting, or is this row
itself the fact that establishes a relationship?** Tenant-owned operational
data (scores, uploads, reports) → Pattern A. Identity/membership/ownership
records → Pattern B. A table can combine both (e.g. a tenant-claim check
plus a status column) — see migration 052 for a worked example (Pattern B +
an added `status = 'active'` lifecycle guard).

## Required companion: the negative-access test contract

Every new Company-scoped table's RLS must be proven against a **real**
Postgres instance, not a mock — Row Level Security is enforced by the
database, and only a real database run can prove it. The reusable harness is
`tests/integration/rls-two-tenant-negative.test.ts` (RLS-03) and its sibling
`tests/integration/rls-worker-isolation.test.ts` (RLS-05, identity-bound
precedent) — extend the appropriate one with a new `describe` block for the
new table rather than building a new harness from scratch. At minimum, a
new table's test block must prove:

1. **Own access** — the legitimate role can read its own row(s) (positive
   control — without this, a 0-row negative result is meaningless, see
   `docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md` §F).
2. **Cross-tenant/cross-identity denial** — the same query, run as a
   different tenant/identity, returns zero rows.
3. **Claim-tampering resistance** (Pattern B tables only) — presenting a
   different tenant claim must not change which rows are visible, since
   visibility is bound to `auth.uid()`, not the claim.
4. **Lifecycle-state denial** (if applicable) — an ended/inactive row must
   not remain visible via the membership-based policy.
5. **KORA_ADMIN positive control** — the legitimate cross-tenant admin
   bypass (`kora.kora_role() = 'KORA_ADMIN'`) must still work; a suite that
   blocks every role, including the legitimate admin path, is not a PASS
   (RLS-06's own stated principle).

This document does not itself run any test — it is the contract a future
WP's own real-DB validation must satisfy.
