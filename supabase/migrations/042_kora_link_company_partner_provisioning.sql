-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   042_kora_link_company_partner_provisioning
-- Feature:     KORA-LINK-HARDENING-AUTOMATION-13B — server-side provisioning
--              for COMPANY_ADMIN, COMPANY_VIEWER, and PARTNER
-- Depends on:  036_kora_link_rpc_functions.sql (fn_company_link_status_aggregate),
--              012_partner_identity.sql (network.partner_identity),
--              001_live_v1_foundation.sql (analytics.tenant, set_updated_at())
-- Author:      KORA Foundation Light · 2026-07-26
-- Gate status: Gate 2 CLOSED (KL-19) for the KORA Link surface this migration
--              touches. This migration is created canonical per KORA-LINK-
--              HARDENING-AUTOMATION-13B but is NOT yet applied to any database
--              (local or staging) as of this commit — local ephemeral
--              validation only. Staging application is a separate, explicitly
--              authorized step, following the same pattern already used for
--              032-036 and 039.
-- ───────────────────────────────────────────────────────────────────────────────
-- STATUS CLASSIFICATION (do not conflate these three — see FASE 3
-- authorization matrix in tests/unit/kora-link-company-partner-
-- provisioning-13b.test.ts for the full per-role evidence):
--
--   COMPANY provisioning:          IMPLEMENTED AND ENFORCED.
--     analytics.company_identity exists, and kora_link.fn_company_link_
--     status_aggregate's COMPANY_ADMIN branch requires an active, role- and
--     tenant-matching row via kora_link.is_provisioned_company_role(). A
--     syntactically valid COMPANY_ADMIN/COMPANY_VIEWER JWT claim is no
--     longer sufficient on its own for this RPC.
--
--   PARTNER provisioning foundation: IMPLEMENTED, NOT YET WIRED.
--     kora_link.is_provisioned_partner(uuid) exists, is correct (validated:
--     valid mapping → true; missing/disabled mapping or partner_id mismatch
--     → false), and is tested — but it is not called by any KORA Link RPC
--     or policy today. This is explicitly NOT "PARTNER provisioning
--     implemented end-to-end" — there is nothing end-to-end to provision
--     into yet.
--
--   PARTNER KORA Link access:      DENY-BY-DEFAULT, unchanged.
--     PARTNER has zero live KORA Link surface before or after this
--     migration (Gate 4, C6: 49/49 deny-by-default). This migration adds no
--     PARTNER-facing RPC, route, or policy.
-- ───────────────────────────────────────────────────────────────────────────────
-- Purpose:
--   Closes Gate 4 finding 2 (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10, §14
--   action E) and the FASE 4 recommendation of
--   /tmp/KORA_LINK_HARDENING_AUTOMATION_13_PLAN.md §4: COMPANY_ADMIN,
--   COMPANY_VIEWER, and PARTNER had no server-side provisioning table
--   analogous to personal.worker_identity — the database trusted signed JWT
--   claims alone, with zero cross-check that the claimed account was ever
--   actually provisioned, is still active, or still belongs to the claimed
--   tenant. A revoked/disabled account's existing JWT would keep working
--   until natural token expiry/refresh, with no immediate server-side kill
--   switch — unlike WORKER, where fn_activate_link_for_worker already
--   resolves identity from personal.worker_identity and rejects a disabled
--   row immediately (KORA-LINK-SECURITY-FOUNDATION-08).
--
--   This migration:
--     1. Creates analytics.company_identity — a new provisioning table for
--        COMPANY_ADMIN/COMPANY_VIEWER, following the exact structural pattern
--        of personal.worker_identity (same auth_user_id/tenant_id/status
--        shape, same RLS convention: KORA_ADMIN full access, self-select
--        only for the owning role, FORCE ROW LEVEL SECURITY, no policy for
--        any other role). Lives in the analytics schema (alongside
--        analytics.tenant, which it references) — NOT in personal, which is
--        constitutionally reserved for worker-individual data (CLAUDE.md
--        §13) and would be the wrong boundary for company-user identity.
--     2. Reuses network.partner_identity for PARTNER as-is (already exists,
--        migration 012, already has its own RLS and grants) — no new table,
--        no data duplication.
--     3. Adds two SECURITY-INVOKER helper functions in the kora_link schema,
--        scoped to this migration's blast radius (mirrors
--        kora_link.is_kora_admin()'s placement/pattern exactly):
--          - kora_link.is_provisioned_company_role() — true only if the
--            caller has an active analytics.company_identity row whose OWN
--            role and tenant_id columns match what the JWT claims (kora.
--            kora_role() / kora.tenant_id()) — this is what makes role
--            mismatch and tenant mismatch fail even with a syntactically
--            valid claim.
--          - kora_link.is_provisioned_partner(p_partner_id uuid) — true only
--            if the caller has an active network.partner_identity row for
--            the given partner_id and the JWT claims PARTNER. Not called
--            from any KORA Link RPC in this migration — PARTNER has zero
--            live KORA Link surface today (Gate 4, C6: 49/49 deny-by-
--            default) and this migration does not add one. The helper exists
--            so a FUTURE partner-facing surface has a ready, tested
--            provisioning check instead of repeating this migration's design
--            work from scratch, and so the FASE 3 authorization matrix for
--            PARTNER (docs/KORA_LINK_HARDENING_AUTOMATION_13B — see the
--            companion test file) can be verified today in isolation.
--     4. Updates the ONLY KORA Link surface that today trusts a company-role
--        claim without any provisioning check:
--        kora_link.fn_company_link_status_aggregate. The COMPANY_ADMIN
--        branch now also requires kora_link.is_provisioned_company_role() —
--        exactly the same silent-empty-result denial shape already used by
--        every other branch in this function (no new error code, no
--        response-shape change). The KORA_ADMIN branch is untouched: KORA_
--        ADMIN's cross-tenant access was never claim+mapping gated and stays
--        that way (Gate 4 finding 4: KORA_ADMIN is deliberately, structurally
--        cross-tenant by design).
--
--   No RLS policy on any kora_link table is touched — none currently grants
--   COMPANY_ADMIN, COMPANY_VIEWER, or PARTNER any access (confirmed by
--   direct read of 035_kora_link_rls.sql: zero CREATE POLICY statements
--   reference those role literals). fn_company_link_status_aggregate is
--   therefore the only KORA Link RPC/policy in scope for this migration.
--
-- What this migration does NOT do:
--   - Does not create a generic "principal" table for all non-worker roles
--     (plan §4 Option B, explicitly not recommended — see the plan file).
--   - Does not modify personal.worker_identity, its RLS, or any function
--     that reads it (fn_activate_link_for_worker unchanged).
--   - Does not modify KORA_ADMIN's behavior anywhere.
--   - Does not modify service_role's grants or behavior anywhere.
--   - Does not add any new PARTNER-facing KORA Link RPC or route — PARTNER
--     remains deny-by-default on every kora_link surface, unchanged.
--   - Does not grant analytics.company_identity or network.partner_identity
--     any direct access to kora_link.* tables — all access continues to go
--     through the existing SECURITY DEFINER RPC layer only.
--   - Does not modify 034, 035, 036, or 039 — those files remain the
--     unmodified historical record. This migration adds a new table/
--     functions and issues ONE CREATE OR REPLACE FUNCTION for
--     fn_company_link_status_aggregate, the same promotion pattern already
--     used by 039 for fn_revoke_link/fn_replace_link.
--   - Does not seed any real or test account into company_identity or
--     partner_identity. Fixture provisioning (KL11_COMPANY_ADMIN_A,
--     KL11_COMPANY_VIEWER_A, KL11_PARTNER_P1) is handled by a separate,
--     staging-only, untracked script — never in a canonical migration.
--
-- Rollback:
--   See supabase/rollback/042_rollback_042_if_needed.sql.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. analytics.company_identity ─────────────────────────────────────────────
-- Maps a Supabase auth user (kora_role IN ('COMPANY_ADMIN','COMPANY_VIEWER'))
-- to a specific tenant and company role. Structural mirror of
-- personal.worker_identity — see that table (migration 007) for the
-- established pattern this follows.

CREATE TABLE IF NOT EXISTS analytics.company_identity (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant this company account belongs to. FK within the same schema
  -- (analytics.tenant), consistent with the rest of this schema.
  tenant_id     uuid        NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Supabase auth.users.id for this company user. No FK across the
  -- auth/analytics boundary — same no-cross-schema-FK convention already
  -- used by personal.worker_identity and network.partner_identity.
  -- Must match app_metadata claims written by
  -- app/api/admin/companies/provision/route.ts.
  auth_user_id  uuid        NOT NULL UNIQUE,

  -- Company role this identity is provisioned for. Must match
  -- app_metadata.kora_role on the JWT for kora_link.is_provisioned_company_
  -- role() to succeed — this is what makes a role-mismatched claim (e.g.
  -- JWT says COMPANY_ADMIN, mapping says COMPANY_VIEWER) fail closed.
  role          text        NOT NULL
                            CHECK (role IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')),

  -- Lifecycle status. 'disabled' must block access immediately at the
  -- database level, independent of whether the JWT itself has expired yet.
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'disabled')),

  -- KORA_ADMIN auth_user_id who provisioned this row. Nullable for
  -- system-provisioned rows. No FK (same convention as elsewhere in this
  -- migration set) — informational only, not an access-control input.
  created_by    uuid        NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE analytics.company_identity IS
  'KORA-LINK-HARDENING-AUTOMATION-13B — server-side provisioning mapping for '
  'COMPANY_ADMIN/COMPANY_VIEWER, structural mirror of personal.worker_identity. '
  'Provisioned by KORA_ADMIN only — no self-signup. '
  'Access without a matching active row here is denied regardless of JWT claims '
  '(see kora_link.is_provisioned_company_role()).';

COMMENT ON COLUMN analytics.company_identity.auth_user_id IS
  'Supabase auth.users.id for this company user. Must match app_metadata.sub '
  'and correspond to the same account app_metadata.kora_role/kora_tenant_id were set on.';

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_company_identity_tenant
  ON analytics.company_identity (tenant_id);

CREATE INDEX IF NOT EXISTS idx_company_identity_auth_user_id
  ON analytics.company_identity (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_company_identity_status
  ON analytics.company_identity (tenant_id, status);

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE analytics.company_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.company_identity FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_identity_kora_admin_all"  ON analytics.company_identity;
DROP POLICY IF EXISTS "company_identity_own_select"       ON analytics.company_identity;

-- KORA_ADMIN: full access for provisioning and diagnostics.
CREATE POLICY "company_identity_kora_admin_all" ON analytics.company_identity
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- COMPANY_ADMIN / COMPANY_VIEWER: read own row only (own auth_user_id AND
-- own tenant). The tenant_id clause is defense-in-depth, not strictly load-
-- bearing on top of auth_user_id = auth.uid() (a row's auth_user_id is
-- already unique, so self-scoping alone already implies single-row/single-
-- tenant visibility) — added explicitly so this policy is directly, visibly
-- tenant-scoped rather than only transitively so, matching
-- tests/unit/rls-policy-inventory.test.ts's constitutional invariant that
-- every COMPANY_ADMIN/COMPANY_VIEWER-facing policy reference tenant scoping.
-- Mirrors network.partner_identity's "partner_identity_partner_own_select"
-- and personal.worker_identity's own-select pattern.
CREATE POLICY "company_identity_own_select" ON analytics.company_identity
  FOR SELECT
  USING (
    kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND auth_user_id = auth.uid()
    AND tenant_id = kora.tenant_id()
  );

-- WORKER, PARTNER, anon: NO policy. FORCE ROW LEVEL SECURITY ensures zero
-- rows visible without a matching policy.

-- ── 4. Grants ─────────────────────────────────────────────────────────────────
-- service_role granted directly here (not deferred to a later patch
-- migration) — avoids the exact bug class migrations 032/033 had to fix
-- retroactively (service_role forgotten on a newly created table).

GRANT SELECT, INSERT, UPDATE ON analytics.company_identity TO authenticated;
GRANT SELECT, INSERT, UPDATE ON analytics.company_identity TO service_role;

-- ── 5. updated_at trigger ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_company_identity_updated_at ON analytics.company_identity;

CREATE TRIGGER trg_company_identity_updated_at
  BEFORE UPDATE ON analytics.company_identity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. kora_link.is_provisioned_company_role() — provisioning check helper
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- True only if the caller (auth.uid()) has an active analytics.company_identity
-- row whose OWN role and tenant_id match what the current JWT claims. A claim
-- with no matching row, a disabled row, a role mismatch, or a tenant mismatch
-- all return false. SECURITY INVOKER (not DEFINER) — this function only reads
-- rows the caller's own RLS policy (company_identity_own_select) already lets
-- them see, so no elevated privilege is needed or granted.

CREATE OR REPLACE FUNCTION kora_link.is_provisioned_company_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM analytics.company_identity ci
    WHERE ci.auth_user_id = auth.uid()
      AND ci.status = 'active'
      AND ci.role = kora.kora_role()
      AND ci.tenant_id = kora.tenant_id()
  );
$$;

REVOKE ALL ON FUNCTION kora_link.is_provisioned_company_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.is_provisioned_company_role() TO authenticated;

COMMENT ON FUNCTION kora_link.is_provisioned_company_role() IS
  'KORA-LINK-HARDENING-AUTOMATION-13B — true only if the caller has an active '
  'analytics.company_identity row whose role and tenant_id match the current '
  'JWT claims. Used by fn_company_link_status_aggregate''s COMPANY_ADMIN branch.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. kora_link.is_provisioned_partner(uuid) — provisioning check helper
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- True only if the caller (auth.uid()) claims PARTNER and has an active
-- network.partner_identity row for the given partner_id. Not called from any
-- KORA Link RPC in this migration — see the migration header. network.
-- partner_identity has no tenant_id column (partners are not tenant-scoped),
-- so there is no tenant check here by design, not by omission.

CREATE OR REPLACE FUNCTION kora_link.is_provisioned_partner(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT kora.kora_role() = 'PARTNER' AND EXISTS (
    SELECT 1
    FROM network.partner_identity pi
    WHERE pi.auth_user_id = auth.uid()
      AND pi.status = 'active'
      AND pi.partner_id = p_partner_id
  );
$$;

REVOKE ALL ON FUNCTION kora_link.is_provisioned_partner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.is_provisioned_partner(uuid) TO authenticated;

COMMENT ON FUNCTION kora_link.is_provisioned_partner(uuid) IS
  'KORA-LINK-HARDENING-AUTOMATION-13B — true only if the caller claims PARTNER '
  'and has an active network.partner_identity row for the given partner_id. '
  'Not called by any KORA Link RPC today — PARTNER has no live KORA Link '
  'surface (deny-by-default, Gate 4 C6). Ready for a future surface.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. kora_link.fn_company_link_status_aggregate — add provisioning check
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Only the COMPANY_ADMIN branch changes: it now also requires
-- kora_link.is_provisioned_company_role(). Same silent-empty-result denial
-- shape as every other branch in this function — no new error code, no
-- response-shape change. KORA_ADMIN branch, the aggregate query itself, and
-- the RETURNS TABLE shape are byte-identical to 036.

CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(
  p_tenant_id uuid
)
RETURNS TABLE (
  status      text,
  count       bigint,
  suppressed  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
BEGIN
  -- ── Role check ────────────────────────────────────────────────────────────
  -- COMPANY_ADMIN or KORA_ADMIN may call this function.
  IF kora.kora_role() NOT IN ('COMPANY_ADMIN', 'KORA_ADMIN') THEN
    RETURN;
  END IF;

  -- ── Tenant validation ─────────────────────────────────────────────────────
  -- COMPANY_ADMIN: p_tenant_id must match JWT tenant (prevents cross-tenant queries).
  -- KORA_ADMIN: can query any tenant.
  IF kora.kora_role() = 'COMPANY_ADMIN' THEN
    IF p_tenant_id IS NULL OR p_tenant_id <> kora.tenant_id() THEN
      RETURN;
    END IF;

    -- ── Provisioning check (KORA-LINK-HARDENING-AUTOMATION-13B) ────────────
    -- A syntactically valid COMPANY_ADMIN claim with a matching tenant is no
    -- longer sufficient on its own: the caller must also have an active,
    -- role- and tenant-matching analytics.company_identity row. Closes Gate 4
    -- finding 2 (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10) for this RPC.
    IF NOT kora_link.is_provisioned_company_role() THEN
      RETURN;
    END IF;
  END IF;

  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- ── Aggregate query ───────────────────────────────────────────────────────
  -- Returns counts per status bucket, threshold-suppressed (KORA-LINK-S08).
  -- Includes TTL-aware 'expired' count.
  -- NEVER returns link_id, token_digest, worker_id, or any per-chip data.
  RETURN QUERY
  WITH raw_counts AS (
    SELECT
      CASE
        -- Effective expired: pre_activation_expires_at passed but status not yet updated
        WHEN l.status IN ('generated','assigned_to_tenant','delivered','activation_pending')
             AND l.pre_activation_expires_at IS NOT NULL
             AND l.pre_activation_expires_at <= now()
          THEN 'expired'
        ELSE l.status
      END AS status_bucket,
      COUNT(*)::bigint AS raw_count
    FROM kora_link.links l
    WHERE l.tenant_id = p_tenant_id
    GROUP BY 1
  )
  SELECT
    rc.status_bucket,
    CASE WHEN rc.raw_count BETWEEN 1 AND 9 THEN NULL ELSE rc.raw_count END,
    rc.raw_count BETWEEN 1 AND 9
  FROM raw_counts rc
  ORDER BY 1;

END;
$$;

-- ACL unchanged — REVOKE ALL FROM PUBLIC / GRANT EXECUTE TO authenticated,
-- service_role already applied in 036 and preserved by CREATE OR REPLACE.

COMMENT ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) IS
  'KORA-LINK-S08 — company-safe aggregate counts by status bucket, threshold- '
  'suppressed. COMPANY_ADMIN (own tenant only, now also requires an active '
  'analytics.company_identity row — KORA-LINK-HARDENING-AUTOMATION-13B) or '
  'KORA_ADMIN (any tenant, unchanged). Never returns link_id, token_digest, or '
  'worker_id. SECURITY DEFINER. search_path explicit.';


-- ── 9. PostgREST reload ───────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
