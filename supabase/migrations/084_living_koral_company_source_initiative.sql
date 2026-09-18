-- KORA-WP-114 — Living KORAL Company Hub — OBJECT-LEVEL PROVENANCE REMEDIATION.
--
-- Canonical authority: Registry 142 (`142_...md:275`, "referencing the real
-- underlying object (e.g. the real initiative record)"), pre-check 172,
-- report 173 (updated in place by this remediation), this explicit narrow
-- Founder-authorized remediation task.
--
-- GAP BEING CLOSED: the original WP-114 implementation (migration 083)
-- surfaced DOMAIN-level provenance only (category + affected_domain +
-- timestamps, all already on gov.living_koral_transformation_ledger) —
-- accepted at the time as a disclosed, narrow limitation, now identified as
-- part of the ORIGINAL accepted WP-114 contract, not deferred debt. This
-- migration closes it for the one currently live source domain
-- (initiative), per this remediation task's own explicit narrow scope —
-- no speculative future-domain support is added.
--
-- WHY NOT A RAW RLS POLICY ON personal.worker_initiative OR
-- gov.living_koral_material_change (the two options considered and
-- rejected):
--   1. migration 015's own header is an EXISTING, BINDING repository
--      constitution: "These objects are the ONLY permitted bridge between
--      company users and personal.* ... Company routes MUST NEVER query
--      personal.* ... directly." A raw COMPANY_ADMIN SELECT policy directly
--      on personal.worker_initiative would violate this already-established
--      rule — not a new judgment call, an existing one this remediation
--      must respect.
--   2. Even a policy scoped to the whole row would expose every column
--      (description, pillar, eligibility_class, dates, mode, location,
--      provider, created_by) merely to obtain one title string — this
--      remediation task's own explicit minimalism instruction (§3, §4).
--   3. A raw policy on gov.living_koral_material_change would additionally
--      expose source_entity_id (a raw UUID — this task's own explicit "do
--      not expose internal UUID as the normal label" instruction),
--      provenance (free text with an embedded UUID), and version/config
--      fields never intended for Company display.
--
-- MECHANISM CHOSEN (matches this remediation task's own preference-order
-- §2/§3, option "a narrowly authorized RPC/read projection", and reuses
-- the EXACT existing, canonical, already-constitutional pattern migration
-- 015 established for exactly this class of problem — a SECURITY DEFINER
-- function, not a service-role bypass, callable through the ordinary
-- session-forwarding client):
--
--   analytics.fn_company_living_koral_source_initiative(uuid) — SECURITY
--   DEFINER, STABLE, returns ONLY `title` (a single text column) — no id,
--   no raw UUID, no description, no other worker_initiative column, no
--   gov.living_koral_material_change column of any kind. Joins
--   gov.living_koral_material_change -> personal.worker_initiative
--   internally (both currently COMPANY_ADMIN-unreadable directly, and
--   remain so — this migration adds no table-level RLS policy anywhere).
--
-- AUTHORIZATION LOGIC (role + tenant, matching this codebase's own RLS
-- doctrine, just expressed inside the function body since a plain function
-- call has no attachable RLS policy of its own):
--   - COMPANY_ADMIN: only its own tenant's material_change row
--     (kora.tenant_id(), the session's own JWT claim) ever resolves.
--   - KORA_ADMIN: resolves cross-tenant (matching its existing, unchanged
--     `FOR ALL` posture on every other Living KORAL table) — KORA_ADMIN
--     sessions carry no kora_tenant_id JWT claim at all (confirmed,
--     app/company/layout.tsx's own comment), so a tenant-equality check
--     would incorrectly always fail for KORA_ADMIN; the role check alone
--     is therefore this branch's own correct, sufficient gate — the
--     material_change_id supplied was itself already resolved through a
--     tenant-correct path (the Ledger row read, RLS-gated) before ever
--     reaching this function, so no additional tenant check is needed or
--     possible for this role.
--   - WORKER / ADVISOR / any other role: never resolves, regardless of
--     tenant match — closes a real, disclosed nuance this remediation
--     found: personal.worker_initiative's own existing WORKER policy only
--     ever exposes a PUBLISHED initiative's title; this function must
--     never become a wider back door exposing a draft/closed initiative's
--     title to a WORKER session merely because it happens to share a
--     tenant. The role check is the structural guarantee (not merely
--     "no caller currently does this").
--
-- Returns zero rows (never an error, never a fabricated title) when: the
-- material_change row doesn't belong to the resolvable tenant/role; it is
-- not an initiative-sourced row; the referenced initiative no longer
-- exists. The calling service (lib/living-koral-company-view) treats a
-- zero-row result as a safe, silent fall-back to domain-level provenance —
-- never a fake empty state, never an error (this remediation task's own
-- §5 instruction).
--
-- NO new table, NO new column, NO RLS policy of any kind added by this
-- migration — a single SECURITY DEFINER function + its own EXECUTE grant,
-- exactly mirroring migration 015's own established object shape.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION analytics.fn_company_living_koral_source_initiative(
  p_material_change_id uuid
)
RETURNS TABLE (
  title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = gov, personal, analytics, kora, public
AS $$
  SELECT wi.title
  FROM gov.living_koral_material_change mc
  JOIN personal.worker_initiative wi
    ON wi.id = mc.source_entity_id
   AND wi.tenant_id = mc.tenant_id
  WHERE mc.id = p_material_change_id
    AND mc.source_entity_type = 'initiative'
    AND (
      (kora.kora_role() = 'COMPANY_ADMIN' AND mc.tenant_id = kora.tenant_id())
      OR kora.kora_role() = 'KORA_ADMIN'
    );
$$;

-- SECURITY DEFINER HARDENING (final narrow verification pass, before this
-- migration was ever applied to any shared environment): PostgreSQL grants
-- EXECUTE on a newly created function to PUBLIC by default. This is the
-- exact same, already-established shape migration 015's own two precedent
-- functions carry (`fn_company_worker_status`/`fn_company_activation_
-- summary` — confirmed via a direct pg_proc.proacl query: identical
-- `{=X/postgres,...}` PUBLIC entry on all three). It is not independently
-- exploitable here: `anon` has no USAGE on the `analytics` schema at all
-- (confirmed via has_schema_privilege — a structural, schema-level block
-- that applies before the function's own ACL is ever consulted), and
-- `authenticated` already carries its own explicit grant below regardless.
-- The one role this PUBLIC grant is NOT otherwise redundant for is
-- `service_role` (which does have `analytics` USAGE) — though `service_
-- role` already bypasses RLS entirely and can read the same underlying
-- tables directly with strictly more authority than this function ever
-- grants, so this was never a real privilege escalation. Revoked anyway,
-- explicitly, as a narrow, zero-behavior-changing hardening measure (no
-- legitimate caller's access changes) rather than relying on the
-- schema-USAGE side effect to carry the load.
REVOKE EXECUTE ON FUNCTION analytics.fn_company_living_koral_source_initiative(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION analytics.fn_company_living_koral_source_initiative(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_company_living_koral_source_initiative(uuid) FROM anon;

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- REVOKE ALL ON FUNCTION analytics.fn_company_living_koral_source_initiative(uuid) FROM authenticated;
-- DROP FUNCTION IF EXISTS analytics.fn_company_living_koral_source_initiative(uuid);
