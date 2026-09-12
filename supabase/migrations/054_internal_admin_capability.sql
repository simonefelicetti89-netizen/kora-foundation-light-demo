-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 054: Internal Admin Operator Identity + Capability Grants
-- Migration:   054_internal_admin_capability
-- Created:     2026-09-12
-- Block:       KORA-WP-009 — Internal Admin Operator Identity + Capability/RBAC Grants
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Today the platform role `KORA_ADMIN` is coarse: `requireKoraAdmin()` proves
-- only "this authenticated identity carries the KORA_ADMIN role," never
-- "this specific internal operator is allowed to perform this specific
-- administrative capability." This migration adds the first explicit,
-- per-operator, per-capability authorization primitive — resolving doc 78
-- §4's "Internal Role/Capability" and "Action Permission" layers — so that
-- role alone never manufactures capability (`78` §2: least privilege).
--
-- CANONICAL CAPABILITY VOCABULARY — NOT INVENTED
-- ──────────────────────────────────────────────
-- `capability_domain` uses exactly the 11 capability/responsibility domains
-- named in `78` §3 ("Internal Operator Model" — "capability/responsibility
-- domains, not job titles"). `action` uses exactly the 12 Action Permission
-- verbs named in `78` §4 / `79` §1's header. Neither vocabulary is invented
-- here — both are frozen, cited text. The full domain × action AUTHORITY
-- MATRIX (`79` §1 — who specifically gets APPROVE vs. SUSPEND vs. OVERRIDE
-- for each governed workflow) is explicitly NOT encoded here: that matrix
-- governs individual later, domain-specific WPs (Partner Certification,
-- Advisor Qualification, Policy/Configuration, etc., several of which `79`
-- §1 itself marks "FOUNDER DECISION REQUIRED" on default policy) — WP-009's
-- own scope is the generic mechanism only, per its own text ("Out of Scope:
-- Admin console UI extensions (later I3 WPs)").
--
-- FOUNDATION ONLY — NOT A ROUTE-ENFORCEMENT CUTOVER
-- ────────────────────────────────────────────────────
-- This migration and its companion service create the capability-check
-- PRIMITIVE. No existing `app/admin/**` route is modified by this WP —
-- `102`'s own WP-009 entry names no route/cutover work ("Service/API:
-- capability-check helper," "UI: N/A at this WP"), unlike KORA-WP-004's own
-- explicit "old role-check paths kept until cutover" language, which WP-009
-- has no equivalent of. Existing Admin routes remain on the coarse
-- `requireKoraAdmin()` role gate until a later, separately-authorized WP
-- adopts this primitive — disclosed explicitly, not silently overclaimed.
--
-- ELEVATED / SUPPORT ACCESS — EXPLICITLY OUT OF SCOPE
-- ──────────────────────────────────────────────────────
-- `78` §3 names "Elevated/cross-tenant access" as "a distinct, non-default
-- capability, never bundled automatically into any domain above," and `78`
-- §20 defines it as Case-linked, time-bound, purpose-coded — it requires the
-- Operational Case primitive (`KORA-WP-007`, not built). Not modeled here;
-- no 12th "elevated access" domain value is added, to avoid inventing a
-- mechanism that cannot yet be properly scoped.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. gov.internal_operator ─────────────────────────────────────────────────
-- The recognized internal operator record — an authenticated identity plus a
-- governed operator status, distinct from the coarse KORA_ADMIN role itself
-- (`78` §5: "Internal Admin identity... just an authenticated identity plus
-- an internal-capability grant, no exception to this rule"). No FK to
-- auth.users, mirroring the existing personal.worker_identity.auth_user_id /
-- analytics.company_memberships.auth_user_id precedent exactly.

CREATE TABLE IF NOT EXISTS gov.internal_operator (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid          NOT NULL,
  status        text          NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'inactive')),
  deactivated_at timestamptz,

  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT internal_operator_deactivated_at_consistency
    CHECK ((status = 'inactive') = (deactivated_at IS NOT NULL))
);

-- One operator record per identity — mirrors the reassociation-safe pattern
-- (soft lifecycle, never hard delete) already used for company_memberships,
-- but unlike that table there is no multi-tenant re-association concept
-- here, so a single UNIQUE (not a partial "while active" index) is correct.
CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_operator_auth_user
  ON gov.internal_operator (auth_user_id);

-- ── 2. gov.capability_grant ──────────────────────────────────────────────────
-- Explicit, per-operator, per-domain, per-action authorization. Absence of a
-- matching ACTIVE row is DENY by construction — there is no "wildcard" or
-- "KORA_ADMIN gets everything" row shape possible in this schema.

CREATE TABLE IF NOT EXISTS gov.capability_grant (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id             uuid          NOT NULL REFERENCES gov.internal_operator (id) ON DELETE CASCADE,

  capability_domain       text          NOT NULL
    CHECK (capability_domain IN (
      'COMPANY_OPERATIONS', 'DATA_ONBOARDING_OPERATIONS', 'PARTNER_NETWORK_GOVERNANCE',
      'ADVISOR_GOVERNANCE', 'ACADEMY_GOVERNANCE', 'PRIVACY_TRUST', 'FINANCE_OPERATIONS',
      'COMMERCIAL_ENTITLEMENT_OPERATIONS', 'SUPPORT_EXCEPTION_OPERATIONS',
      'AUDIT_GOVERNANCE', 'PLATFORM_SYSTEM_OPERATIONS'
    )),
  action                  text          NOT NULL
    CHECK (action IN (
      'VIEW', 'SUPPORT', 'CREATE', 'PROPOSE', 'EDIT_DRAFT', 'ASSIGN',
      'APPROVE', 'GRANT', 'SUSPEND', 'REVOKE', 'OVERRIDE', 'AUDIT'
    )),

  status                  text          NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'revoked')),
  revoked_at              timestamptz,

  -- Provenance: who granted this. Nullable — bootstrapping the very first
  -- grant on a fresh install has no prior granting operator (`78` §4: "
  -- Bootstrapping the first such grant is a Master Plan implementation
  -- concern, not designed here") — a NULL here means service-role/founder
  -- bootstrap, never a fabricated self-grant.
  granted_by_operator_id  uuid          REFERENCES gov.internal_operator (id),
  granted_at              timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT capability_grant_revoked_at_consistency
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_capability_grant_operator ON gov.capability_grant (operator_id);
CREATE INDEX IF NOT EXISTS idx_capability_grant_lookup   ON gov.capability_grant (operator_id, capability_domain, action, status);

-- Prevents duplicate ACTIVE grants of the identical (operator, domain,
-- action) triple — ordinary referential integrity, not a business policy
-- invention. A revoked grant does not block re-granting the same triple.
CREATE UNIQUE INDEX IF NOT EXISTS uq_capability_grant_active
  ON gov.capability_grant (operator_id, capability_domain, action)
  WHERE status = 'active';

-- ── 3. RLS — KORA_ADMIN-governance-table convention, fail-closed for every
-- other role. This is NOT Company-scoped data (no tenant_id, no Pattern A/B
-- from KORA-WP-010 applies) — it follows the SAME "kora_admin_all_X" FOR ALL
-- shape already used by gov.budget_governance / personal.workforce_baseline
-- for internal governance tables. This RLS layer and the application-level
-- capability-check service (KORA-WP-009's own primitive) are two
-- INDEPENDENT enforcement layers (`78` §4: "Four conceptual layers (no RLS,
-- no DB roles)") — RLS keeps non-Admin roles out of this table entirely;
-- the capability-check service is what enforces least-privilege AMONG
-- operators who all coarsely carry the KORA_ADMIN role. Neither layer
-- substitutes for the other. ─────────────────────────────────────────────

ALTER TABLE gov.internal_operator ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.internal_operator FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_internal_operator" ON gov.internal_operator
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

ALTER TABLE gov.capability_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.capability_grant FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_capability_grant" ON gov.capability_grant
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 4. GRANTs ────────────────────────────────────────────────────────────────
-- Proactive, from the start — precedent: migrations 032/033/050 (missing
-- service_role GRANT) and migration 052 (missing authenticated GRANT) both
-- found this exact defect class in real-DB validation for earlier WPs.

GRANT SELECT, INSERT, UPDATE ON gov.internal_operator  TO service_role;
GRANT SELECT, INSERT, UPDATE ON gov.capability_grant   TO service_role;
GRANT SELECT ON gov.internal_operator TO authenticated;
GRANT SELECT ON gov.capability_grant  TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE SELECT ON gov.capability_grant FROM authenticated;
-- REVOKE SELECT ON gov.internal_operator FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON gov.capability_grant FROM service_role;
-- REVOKE SELECT, INSERT, UPDATE ON gov.internal_operator FROM service_role;
-- DROP POLICY IF EXISTS "kora_admin_all_capability_grant" ON gov.capability_grant;
-- DROP POLICY IF EXISTS "kora_admin_all_internal_operator" ON gov.internal_operator;
-- DROP INDEX IF EXISTS gov.uq_capability_grant_active;
-- DROP INDEX IF EXISTS gov.idx_capability_grant_lookup;
-- DROP INDEX IF EXISTS gov.idx_capability_grant_operator;
-- DROP TABLE IF EXISTS gov.capability_grant;
-- DROP INDEX IF EXISTS gov.uq_internal_operator_auth_user;
-- DROP TABLE IF EXISTS gov.internal_operator;
-- Rollback is safe at any time: this migration creates two new tables and
-- touches nothing else — no existing column, row, policy, or table
-- (including gov.budget_governance) is altered by this migration or by
-- rolling it back.
