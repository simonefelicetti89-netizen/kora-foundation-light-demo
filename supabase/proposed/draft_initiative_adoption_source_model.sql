-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   draft_initiative_adoption_source_model
--              DRAFT / PROPOSED — migration number not assigned.
-- Feature:     B168-ext — commons.initiative_adoption — Company Adoption /
--              Sponsorship Source Model for KORA Contribution V2
-- Author:      KORA Foundation Light · 2026-06-24
-- Gate:        Gate 3 OPEN — PROPOSED, NOT APPLIED TO ANY DATABASE.
-- NUMBERING HISTORY (retired/never-to-be-reused numbers this file has held):
--              Originally proposed as 033. Renumbered to 038 (B173-FIX-01,
--              2026-07-10) because active migration
--              033_personal_worker_identity_service_role_grant.sql was applied
--              on 2026-07-09, reusing 033 without checking this directory.
--              Renumbered again to 041 (B173-FIX-02, KORA-LINK-HARDENING-
--              AUTOMATION-13A) because 039_kora_link_audit_hardening.sql was
--              created directly in supabase/migrations/. Renumbered again to
--              044 (B173-FIX-03, KORA-LINK-HARDENING-AUTOMATION-13B) because
--              042_kora_link_company_partner_provisioning.sql was, in turn,
--              created directly in supabase/migrations/ — the same
--              recurring risk class, three times.
--
--              B173-FIX-04 (KORA-LINK-HARDENING-AUTOMATION-13B, governance
--              correction): carrying a canonical-looking 3-digit number on
--              an unapplied, un-gated proposed file is what caused all
--              three prior renumberings. This file is now named WITHOUT a
--              number at all (draft_*.sql). It will receive its FIRST real
--              migration number only at promotion time, computed as the
--              next free number after the then-current highest canonical
--              migration in supabase/migrations/ — never before. See
--              tests/unit/b173-migration-numbering-guard.test.ts for the
--              guard enforcing this convention and retiring
--              029/037/038/040/041/043/044 permanently.
--
--              Before promoting this file into supabase/migrations/, check
--              that directory for the next free number — do not assume any
--              number this file has ever historically held above is still,
--              or was ever meant to be, available.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- ───────
-- This migration creates commons.initiative_adoption — the source table that
-- records company-level adoption, sponsorship, support, co-funding, promotion,
-- or make-available decisions for KORA Space initiatives.
--
-- This closes the source gap identified in the KORA Space Contribution Source
-- Layer Pre-Pilot Plan (gap G-2 taxonomy B — Adoption/Sponsorship). Without
-- this table, contribution_kind values added to migration 025's CHECK constraint
-- (company_adoption, company_sponsorship, company_support, company_cofunding,
-- kora_originated_adoption, kora_enabled_adoption) cannot be generated — there
-- is no source event to trigger them.
--
-- DESIGN PRINCIPLE
-- ────────────────
-- initiative_adoption is a COMPANY-LEVEL decision record.
-- It records that a company decided to adopt/sponsor/support an initiative.
-- It is NOT worker activity. It does NOT record individual participation.
-- It does NOT record who attended, who booked, who viewed, or who commented.
--
-- CONSTITUTIONAL PRIVACY EXCLUSIONS
-- ──────────────────────────────────
-- The following fields must NEVER appear in commons.initiative_adoption:
--   ✗ worker_identity_id
--   ✗ worker_id
--   ✗ individual booking_id
--   ✗ individual participation records
--   ✗ individual comments, ratings, evaluations, or feedback
-- Employer roles must never be able to infer individual worker activity
-- from adoption records alone or in combination with contribution_event rows.
--
-- N≥10 PRIVACY THRESHOLD
-- ───────────────────────
-- Adoption itself is a company decision — no N≥10 threshold applies to the
-- adoption record. However:
--   • When adoption signals are COMBINED with booking/participation data to
--     compute Activation Depth in KORA Contribution V2, the N≥10 threshold
--     (safe_aggregation_threshold = 10) applies to the booking count.
--   • privacy_threshold_met defaults to false in contribution_event rows
--     generated from adoption. It should only be set to true by a separate
--     RPC once the initiative has confirmed N≥10 real participants.
--   • No exact worker participation count should be exposed to employer roles
--     through any path involving this table.
--
-- CONTRIBUTION V2 COMPONENTS ENABLED
-- ────────────────────────────────────
-- Adoption signals primarily feed:
--   • Adoption & Reach (15%)          — formal_adoption, sponsorship, support
--   • Ecosystem Contribution (20%)    — cofunding, kora_originated, kora_enabled
-- Secondary feeds when combined with verified participation:
--   • Evidence Quality (25%)          — partner_verified or advisor_verified adoption
--   • Strategic Breadth (10%)         — adoption across multiple KORA pillars
-- KORA Contribution remains a companion indicator — NOT a KORA Index component.
--
-- PREREQUISITES
-- ─────────────
--   1. commons schema must exist (migration 013 applied)
--   2. commons.post table must exist (migration 013)
--   3. commons.post.opening_grade must exist (migration 024, if applicable)
--   4. commons.contribution_event must exist with M025-6 + M025-7 fields/constraints:
--      M025-6 fields: source_type, event_type, contribution_component_hint, aggregate_count,
--        privacy_threshold_met, is_cross_company, is_kora_originated, is_kora_enabled, adoption_type
--      M025-7 constraint: uq_contribution_external must be (tenant_id, source_post_id,
--        contribution_kind, role, reporting_period) — the 5-column form. The attribution
--        function uses ON CONFLICT ON CONSTRAINT uq_contribution_external DO NOTHING and
--        inserts all 5 constraint columns. Apply migration 025 REVISED (M025-7) before this draft.
--   5. kora.kora_role() and kora.tenant_id() must exist (migration 006)
--   6. set_updated_at() must exist (migration 001)
--   7. draft_contribution_atomic_attribution.sql (attribute_contribution_for_booking_atomic)
--      should be applied before or after this draft — no ordering dependency between them
--
-- APPLY ORDER
-- ───────────
--   025 (REVISED) → draft_contribution_atomic_attribution.sql → this draft [suggested order]
--   or the reverse — this draft does not depend on draft_contribution_atomic_attribution.sql
-- Both depend on 025. They are independent of each other. Neither has a
-- migration number yet — see NUMBERING HISTORY above.
--
-- GATE STATUS
-- ───────────
-- Gate 3 OPEN — this file is for design review only.
-- Do NOT run supabase db push. Do NOT run supabase migration up.
-- Apply only after CTO review (Gate 2) and Gate 3 closure.
-- REVIEW REQUIRED: CTO + Gate 3 sign-off before production apply.
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. commons.initiative_adoption ───────────────────────────────────────────
-- Company-level adoption/support/sponsorship decision record for an initiative.
-- NOT worker activity. NOT individual participation.

CREATE TABLE IF NOT EXISTS commons.initiative_adoption (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The KORA Space initiative being adopted (FK to commons.post).
  -- ON DELETE RESTRICT — prevents accidental deletion of adopted initiatives.
  initiative_id             uuid          NOT NULL REFERENCES commons.post (id)
                                          ON DELETE RESTRICT,

  -- Tenant of the adopting company (the company making the adoption decision).
  -- This is the tenant that will receive the contribution_event row.
  adopting_company_tenant_id uuid         NOT NULL,

  -- Tenant of the company that originally created the initiative (nullable).
  -- NULL when the initiative was created by KORA itself (is_kora_originated=true)
  -- or by a partner (source_origin='partner_originated').
  origin_company_tenant_id  uuid          NULL,

  -- FK to partner profile (future: partner.profile, currently nullable).
  -- Only set when source_origin='partner_originated' or adoption_type='partner_delivery'.
  partner_id                uuid          NULL,

  -- How the adopting company is engaging with this initiative.
  -- M025-3 aligned: maps directly to role values in contribution_event.
  adoption_type             text          NOT NULL
                                          CHECK (adoption_type IN (
                                            'formal_adoption',       -- company formally adopts an external initiative
                                            'sponsorship',           -- company provides financial sponsorship
                                            'support',               -- company provides non-financial support
                                            'cofunding',             -- company co-funds with other parties
                                            'promotion',             -- company promotes without full adoption
                                            'made_available',        -- company makes initiative available to workers
                                            'partner_delivery',      -- partner delivers on behalf of company
                                            'kora_enabled_adoption', -- adoption facilitated by KORA platform
                                            'kora_originated_adoption' -- KORA-created initiative now adopted by company
                                          )),

  -- Lifecycle state of the adoption.
  adoption_status           text          NOT NULL DEFAULT 'proposed'
                                          CHECK (adoption_status IN (
                                            'proposed',   -- company has expressed interest
                                            'approved',   -- KORA Admin or eligible party approved
                                            'active',     -- adoption currently in effect
                                            'completed',  -- initiative concluded, adoption closed
                                            'cancelled',  -- adopting company withdrew
                                            'rejected'    -- KORA Admin or initiative owner rejected
                                          )),

  -- Who or what originated this initiative.
  -- Propagated to contribution_event.is_kora_originated / is_kora_enabled.
  source_origin             text          NOT NULL DEFAULT 'company_originated'
                                          CHECK (source_origin IN (
                                            'company_originated',   -- another KORA company created it
                                            'cross_company',        -- cross-tenant collaborative initiative
                                            'partner_originated',   -- a KORA partner created it
                                            'territory_originated', -- territorial/community origin
                                            'kora_originated',      -- KORA Foundation created it
                                            'kora_enabled'          -- KORA platform enabled the connection
                                          )),

  -- Whether KORA created the initiative (propagated to contribution_event).
  is_kora_originated        boolean       NOT NULL DEFAULT false,

  -- Whether KORA enabled the adoption connection (propagated to contribution_event).
  is_kora_enabled           boolean       NOT NULL DEFAULT false,

  -- Whether this is a cross-company adoption (adopter ≠ initiative origin tenant).
  is_cross_company          boolean       NOT NULL DEFAULT false,

  -- Verification level of this adoption record.
  -- Aligned with migration 025 M025-2 expanded evidence_status values.
  evidence_status           text          NOT NULL DEFAULT 'self_declared'
                                          CHECK (evidence_status IN (
                                            'self_declared',   -- company self-declares adoption
                                            'verified',        -- KORA Admin verified
                                            'partner_verified', -- partner confirms adoption
                                            'advisor_verified', -- KORA Advisor confirms
                                            'system_verified'  -- automatic/integration-verified
                                          )),

  -- Temporal scope of the adoption (optional — events may be point-in-time).
  effective_from            timestamptz   NULL,
  effective_to              timestamptz   NULL,

  -- Free-text notes (internal use — KORA Admin / Company Admin only).
  -- Never surfaced to worker-facing UI.
  notes                     text          NULL,

  -- Audit: who created this record (auth.users.id of the creator, nullable for system).
  created_by                uuid          NULL REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now(),

  -- Idempotency: a company can only have one adoption of a given type per initiative.
  -- Allows a company to both 'sponsor' AND 'promote' the same initiative (different rows).
  CONSTRAINT uq_initiative_adoption UNIQUE (initiative_id, adopting_company_tenant_id, adoption_type)

  -- CONSTITUTIONAL PRIVACY EXCLUSIONS (hard constraints at schema level):
  -- ✗ NO worker_identity_id column
  -- ✗ NO worker_id column
  -- ✗ NO individual booking reference
  -- ✗ NO individual participation, comment, rating, or feedback field
  -- Any future ALTER TABLE must preserve these exclusions.
);

-- Trigger: keep updated_at current.
-- set_updated_at() defined in migration 001.
CREATE TRIGGER trg_initiative_adoption_updated_at
  BEFORE UPDATE ON commons.initiative_adoption
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Operational indexes
CREATE INDEX IF NOT EXISTS idx_adoption_initiative
  ON commons.initiative_adoption (initiative_id);

CREATE INDEX IF NOT EXISTS idx_adoption_adopting_tenant
  ON commons.initiative_adoption (adopting_company_tenant_id);

CREATE INDEX IF NOT EXISTS idx_adoption_origin_tenant
  ON commons.initiative_adoption (origin_company_tenant_id)
  WHERE origin_company_tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_adoption_status
  ON commons.initiative_adoption (adoption_status);

CREATE INDEX IF NOT EXISTS idx_adoption_type
  ON commons.initiative_adoption (adoption_type);

CREATE INDEX IF NOT EXISTS idx_adoption_kora_originated
  ON commons.initiative_adoption (is_kora_originated)
  WHERE is_kora_originated = true;

COMMENT ON TABLE commons.initiative_adoption IS
  'B168-ext — Company-level adoption/sponsorship/support decisions for KORA Space initiatives. '
  'COMPANY-LEVEL RECORD ONLY — no worker_identity_id, no individual activity. '
  'Source of contribution_kind: company_adoption, company_sponsorship, company_support, '
  'company_cofunding, kora_originated_adoption, kora_enabled_adoption (migration 025 M025-1). '
  'Gate 3 OPEN: NOT applied to any live database.';

COMMENT ON COLUMN commons.initiative_adoption.adopting_company_tenant_id IS
  'Tenant of the company making the adoption decision. '
  'Receives the contribution_event row as role=adopter/sponsor/etc.';

COMMENT ON COLUMN commons.initiative_adoption.origin_company_tenant_id IS
  'Tenant of the originating company. NULL if KORA-originated or partner-originated. '
  'Originating company receives role=promoter contribution_event if is_cross_company=true.';

COMMENT ON COLUMN commons.initiative_adoption.is_kora_originated IS
  'True if KORA Foundation created this initiative (not a tenant company). '
  'Propagated to contribution_event.is_kora_originated. '
  'Config declares kora_originated_if_adopted=true — this field is the runtime implementation.';

COMMENT ON COLUMN commons.initiative_adoption.notes IS
  'Internal notes for KORA Admin / Company Admin only. '
  'NEVER surfaced in worker-facing UI or company-facing aggregate outputs.';


-- ── 2. RLS commons.initiative_adoption ───────────────────────────────────────
-- Policy design rationale:
--   • KORA_ADMIN: full access for oversight, moderation, audit
--   • COMPANY_ADMIN/VIEWER: SELECT their own adoption records only
--     (either as adopter OR as origin company — they can see both perspectives)
--   • WORKER: no policy — deny-by-default (workers do not see adoption decisions)
--   • anon: no policy — deny-by-default
--   • Direct INSERT/UPDATE from authenticated: explicitly restricted (see grants)

ALTER TABLE commons.initiative_adoption ENABLE ROW LEVEL SECURITY;

-- KORA_ADMIN: full access
DROP POLICY IF EXISTS "initiative_adoption_kora_admin_all" ON commons.initiative_adoption;
CREATE POLICY "initiative_adoption_kora_admin_all"
  ON commons.initiative_adoption FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- COMPANY_ADMIN / COMPANY_VIEWER: select own adoption records.
-- A company can see adoptions where it is the adopter.
-- It can also see adoptions where it is the origin company — useful for
-- the initiative promoter to see how widely their initiative has been adopted.
-- PRIVACY: this does NOT reveal worker identity. The adoption record is
-- company-to-initiative, not worker-to-initiative.
DROP POLICY IF EXISTS "initiative_adoption_company_select" ON commons.initiative_adoption;
CREATE POLICY "initiative_adoption_company_select"
  ON commons.initiative_adoption FOR SELECT
  USING (
    kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND (
      adopting_company_tenant_id = kora.tenant_id()
      OR origin_company_tenant_id = kora.tenant_id()
    )
  );

-- WORKER: no policy — deny-by-default.
-- Workers do not see adoption decisions. Initiative availability to workers
-- is surfaced through commons.post (the initiative itself), not through the
-- adoption record.

-- anon: no policy — deny-by-default.
-- PUBLIC: explicitly revoked in grants section.


-- ── 3. SECURITY DEFINER function — create adoption record ─────────────────────
-- Validates input, enforces KORA_ADMIN/service_role authorization, creates the
-- adoption record, and returns the new id.
-- Companies request adoption via the API (authenticated path); KORA_ADMIN approves.
-- This function handles the CREATE path. The APPROVE path is a separate UPDATE
-- via KORA_ADMIN policy.

DROP FUNCTION IF EXISTS commons.create_initiative_adoption(
  uuid, uuid, uuid, uuid, text, text, text, boolean, boolean, boolean, text, text, timestamptz, timestamptz
);
CREATE OR REPLACE FUNCTION commons.create_initiative_adoption(
  p_initiative_id                uuid,
  p_adopting_company_tenant_id   uuid,
  p_origin_company_tenant_id     uuid    DEFAULT NULL,
  p_partner_id                   uuid    DEFAULT NULL,
  p_adoption_type                text    DEFAULT 'formal_adoption',
  p_adoption_status              text    DEFAULT 'proposed',
  p_source_origin                text    DEFAULT 'company_originated',
  p_is_kora_originated           boolean DEFAULT false,
  p_is_kora_enabled              boolean DEFAULT false,
  p_is_cross_company             boolean DEFAULT false,
  p_evidence_status              text    DEFAULT 'self_declared',
  p_notes                        text    DEFAULT NULL,
  p_effective_from               timestamptz DEFAULT NULL,
  p_effective_to                 timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = commons, analytics, kora, public
AS $$
DECLARE
  v_caller_role   text;
  v_caller_tenant uuid;
  v_new_id        uuid;
BEGIN
  v_caller_role   := kora.kora_role();
  v_caller_tenant := kora.tenant_id();

  -- Authorization: KORA_ADMIN or COMPANY_ADMIN of the adopting tenant.
  IF v_caller_role = 'KORA_ADMIN' THEN
    NULL; -- full access
  ELSIF v_caller_role = 'COMPANY_ADMIN' THEN
    IF v_caller_tenant <> p_adopting_company_tenant_id THEN
      RAISE EXCEPTION 'create_initiative_adoption: tenant mismatch — caller: %, requested: %',
        v_caller_tenant, p_adopting_company_tenant_id;
    END IF;
    -- COMPANY_ADMIN can only create in 'proposed' status — KORA_ADMIN approves.
    IF p_adoption_status <> 'proposed' THEN
      RAISE EXCEPTION 'create_initiative_adoption: COMPANY_ADMIN may only create proposed adoptions';
    END IF;
  ELSE
    RAISE EXCEPTION 'create_initiative_adoption: accesso negato — ruolo: %', v_caller_role;
  END IF;

  -- Validate initiative exists and is cross_company eligible (or accept any for KORA_ADMIN).
  IF NOT EXISTS (SELECT 1 FROM commons.post WHERE id = p_initiative_id) THEN
    RAISE EXCEPTION 'create_initiative_adoption: iniziativa non trovata — id: %', p_initiative_id;
  END IF;

  INSERT INTO commons.initiative_adoption (
    initiative_id,
    adopting_company_tenant_id,
    origin_company_tenant_id,
    partner_id,
    adoption_type,
    adoption_status,
    source_origin,
    is_kora_originated,
    is_kora_enabled,
    is_cross_company,
    evidence_status,
    notes,
    effective_from,
    effective_to,
    created_by
  ) VALUES (
    p_initiative_id,
    p_adopting_company_tenant_id,
    p_origin_company_tenant_id,
    p_partner_id,
    p_adoption_type,
    p_adoption_status,
    p_source_origin,
    p_is_kora_originated,
    p_is_kora_enabled,
    p_is_cross_company,
    p_evidence_status,
    p_notes,
    p_effective_from,
    p_effective_to,
    auth.uid()
  )
  ON CONFLICT ON CONSTRAINT uq_initiative_adoption DO NOTHING
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION commons.create_initiative_adoption IS
  'B168-ext — Creates a company adoption record for a KORA Space initiative. '
  'SECURITY DEFINER: COMPANY_ADMIN may create proposed adoptions for own tenant; '
  'KORA_ADMIN may create any status. '
  'ON CONFLICT DO NOTHING — idempotent for (initiative_id, tenant, adoption_type). '
  'Gate 3 OPEN: not callable until this migration is applied.';


-- ── 4. SECURITY DEFINER function — attribution from adoption ──────────────────
-- Creates commons.contribution_event rows from an approved/active adoption record.
-- Called by KORA_ADMIN or service_role after an adoption reaches 'approved'/'active'.
--
-- CONTRIBUTION EVENT MAPPING (from adoption_type):
--
--   adoption_type             → contribution_kind          → role (adopter)
--   ─────────────────────────────────────────────────────────────────────
--   formal_adoption           → company_adoption           → adopter
--   sponsorship               → company_sponsorship        → sponsor
--   support / promotion /
--   made_available            → company_support            → supporter
--   cofunding                 → company_cofunding          → cofunder
--   kora_enabled_adoption     → kora_enabled_adoption      → kora_enabler
--   kora_originated_adoption  → kora_originated_adoption   → kora_enabler
--   partner_delivery          → company_support            → partner
--
-- COMPONENT HINT MAPPING:
--   company_adoption, company_sponsorship, company_support → adoption_reach
--   company_cofunding, kora_originated_adoption,
--   kora_enabled_adoption                                  → ecosystem_contribution
--
-- CROSS-COMPANY DUAL ROW:
--   When is_cross_company=true and origin_company_tenant_id IS NOT NULL,
--   two rows are created:
--     Row 1: adopting_company_tenant_id, role=adopter/sponsor/etc., weight=1.0000
--     Row 2: origin_company_tenant_id,   role=promoter,              weight=0.5000
--   This mirrors the booking attribution pattern from draft_contribution_atomic_attribution.sql.
--
-- PRIVACY INVARIANTS:
--   • worker_identity_id NEVER written to contribution_event
--   • privacy_threshold_met = false at INSERT (N≥10 not yet confirmed for adoption-only)
--   • Only aggregate company-level adoption signals — no individual worker data

DROP FUNCTION IF EXISTS commons.attribute_contribution_for_adoption(uuid, text, numeric, numeric);
CREATE OR REPLACE FUNCTION commons.attribute_contribution_for_adoption(
  p_adoption_id      uuid,
  p_reporting_period text    DEFAULT '2026-Q2',
  p_adopter_weight   numeric DEFAULT 1.0000,
  p_origin_weight    numeric DEFAULT 0.5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = commons, analytics, kora, public
AS $$
DECLARE
  v_caller_role        text;
  v_adoption           commons.initiative_adoption%ROWTYPE;
  v_contribution_kind  text;
  v_adopter_role       text;
  v_component_hint     text;
  v_written            int := 0;
BEGIN
  v_caller_role := kora.kora_role();

  -- Auth check: KORA_ADMIN or service_role only.
  IF current_role NOT IN ('service_role', 'postgres') AND v_caller_role <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'attribute_contribution_for_adoption: accesso negato — ruolo: %', v_caller_role;
  END IF;

  -- Load adoption record.
  SELECT * INTO v_adoption
  FROM commons.initiative_adoption
  WHERE id = p_adoption_id;

  IF v_adoption.id IS NULL THEN
    RAISE EXCEPTION 'attribute_contribution_for_adoption: adoption record not found — id: %', p_adoption_id;
  END IF;

  -- Only attribute from active/completed adoptions.
  IF v_adoption.adoption_status NOT IN ('approved', 'active', 'completed') THEN
    RAISE EXCEPTION 'attribute_contribution_for_adoption: adoption status must be approved/active/completed — current: %',
      v_adoption.adoption_status;
  END IF;

  -- Map adoption_type → contribution_kind + adopter role
  CASE v_adoption.adoption_type
    WHEN 'formal_adoption' THEN
      v_contribution_kind := 'company_adoption';
      v_adopter_role      := 'adopter';
      v_component_hint    := 'adoption_reach';

    WHEN 'sponsorship' THEN
      v_contribution_kind := 'company_sponsorship';
      v_adopter_role      := 'sponsor';
      v_component_hint    := 'adoption_reach';

    WHEN 'support', 'promotion', 'made_available' THEN
      v_contribution_kind := 'company_support';
      v_adopter_role      := 'supporter';
      v_component_hint    := 'adoption_reach';

    WHEN 'cofunding' THEN
      v_contribution_kind := 'company_cofunding';
      v_adopter_role      := 'cofunder';
      v_component_hint    := 'ecosystem_contribution';

    WHEN 'kora_enabled_adoption' THEN
      v_contribution_kind := 'kora_enabled_adoption';
      v_adopter_role      := 'kora_enabler';
      v_component_hint    := 'ecosystem_contribution';

    WHEN 'kora_originated_adoption' THEN
      v_contribution_kind := 'kora_originated_adoption';
      v_adopter_role      := 'kora_enabler';
      v_component_hint    := 'ecosystem_contribution';

    WHEN 'partner_delivery' THEN
      v_contribution_kind := 'company_support';
      v_adopter_role      := 'partner';
      v_component_hint    := 'adoption_reach';

    ELSE
      RAISE EXCEPTION 'attribute_contribution_for_adoption: unknown adoption_type: %', v_adoption.adoption_type;
  END CASE;

  -- INSERT adopter row (primary contribution — the adopting company)
  -- privacy_threshold_met = false: adoption alone does not confirm N≥10 worker participation.
  -- This field should be updated by a separate RPC once booking data confirms N≥10.
  INSERT INTO commons.contribution_event (
    tenant_id,
    source_booking_id,
    source_post_id,
    role,
    contribution_kind,
    impact_weight,
    evidence_status,
    reporting_period,
    source_type,
    event_type,
    contribution_component_hint,
    is_cross_company,
    is_kora_originated,
    is_kora_enabled,
    adoption_type,
    privacy_threshold_met
  ) VALUES (
    v_adoption.adopting_company_tenant_id,
    NULL,                              -- source_booking_id NULL: not from a booking
    v_adoption.initiative_id,
    v_adopter_role,
    v_contribution_kind,
    p_adopter_weight,
    v_adoption.evidence_status,
    p_reporting_period,
    'adoption',
    v_adoption.adoption_type,
    v_component_hint,
    v_adoption.is_cross_company,
    v_adoption.is_kora_originated,
    v_adoption.is_kora_enabled,
    v_adoption.adoption_type,
    false  -- N≥10 not confirmed by adoption alone; updated by separate RPC if booking data supports it
  )
  ON CONFLICT ON CONSTRAINT uq_contribution_external DO NOTHING;

  GET DIAGNOSTICS v_written = ROW_COUNT;

  -- INSERT promoter row if cross-company and origin company exists.
  -- Mirrors booking attribution pattern (draft_contribution_atomic_attribution.sql): origin company gets
  -- a contribution credit for having their initiative adopted elsewhere.
  IF v_adoption.is_cross_company = true
     AND v_adoption.origin_company_tenant_id IS NOT NULL
     AND v_adoption.origin_company_tenant_id <> v_adoption.adopting_company_tenant_id
  THEN
    INSERT INTO commons.contribution_event (
      tenant_id,
      source_booking_id,
      source_post_id,
      role,
      contribution_kind,
      impact_weight,
      evidence_status,
      reporting_period,
      source_type,
      event_type,
      contribution_component_hint,
      is_cross_company,
      is_kora_originated,
      is_kora_enabled,
      adoption_type,
      privacy_threshold_met
    ) VALUES (
      v_adoption.origin_company_tenant_id,
      NULL,
      v_adoption.initiative_id,
      'promoter',
      v_contribution_kind,
      p_origin_weight,
      v_adoption.evidence_status,
      p_reporting_period,
      'adoption',
      v_adoption.adoption_type,
      'ecosystem_contribution',  -- origin company credit: ecosystem component
      v_adoption.is_cross_company,
      v_adoption.is_kora_originated,
      v_adoption.is_kora_enabled,
      v_adoption.adoption_type,
      false
    )
    ON CONFLICT ON CONSTRAINT uq_contribution_external DO NOTHING;

    GET DIAGNOSTICS v_written = v_written + ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'contribution_written', v_written,
    'contribution_kind',    v_contribution_kind,
    'adopter_role',         v_adopter_role,
    'component_hint',       v_component_hint,
    'errors',               0
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

COMMENT ON FUNCTION commons.attribute_contribution_for_adoption IS
  'B168-ext — Creates contribution_event rows from an approved/active initiative adoption. '
  'Maps adoption_type to contribution_kind and role (migration 025 M025-1/M025-3 aligned). '
  'SECURITY DEFINER: KORA_ADMIN or service_role only. '
  'Cross-company adoptions generate two rows: adopter + promoter (like booking attribution). '
  'privacy_threshold_met=false at INSERT — updated by separate RPC when N≥10 booking data confirmed. '
  'CONSTITUTIONAL: no worker_identity_id, no individual participation data. '
  'Gate 3 OPEN: not callable until migration 025 and this migration are applied.';


-- ── 5. Grants ─────────────────────────────────────────────────────────────────
-- Principle of least privilege (aligned with migration 025 M025-5 pattern):
--   • authenticated: SELECT only on initiative_adoption (RLS enforces row scope)
--   • authenticated: no direct INSERT/UPDATE — use create_initiative_adoption() RPC
--   • anon / PUBLIC: no access
--   • service_role: all (bypasses RLS — used by backend APIs)

REVOKE ALL ON commons.initiative_adoption FROM PUBLIC;
REVOKE ALL ON commons.initiative_adoption FROM anon;

-- authenticated may SELECT (RLS restricts to own-tenant rows).
-- No INSERT/UPDATE directly from authenticated — use RPC.
GRANT SELECT ON commons.initiative_adoption TO authenticated;

-- RPC access: any authenticated user may call create_initiative_adoption().
-- The function enforces role and tenant authorization internally.
GRANT EXECUTE ON FUNCTION commons.create_initiative_adoption TO authenticated;

-- attribute_contribution_for_adoption: KORA_ADMIN / service_role only.
REVOKE ALL ON FUNCTION commons.attribute_contribution_for_adoption FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commons.attribute_contribution_for_adoption TO service_role;

-- ── 6. PostgREST reload ───────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- POST-APPLY CALLER UPDATES
-- ═══════════════════════════════════════════════════════════════════════════════
-- After this migration is applied, update service layer:
--
-- 1. KoraContributionService.computeContributionV2() (or equivalent live path):
--    Add adoption row filter alongside existing cross/external filters:
--
--    const adoptionRows = rows.filter((r) =>
--      ['company_adoption', 'company_sponsorship', 'company_support',
--       'company_cofunding', 'kora_originated_adoption', 'kora_enabled_adoption']
--      .includes(r.contribution_kind)
--    );
--
-- 2. KoraContributionService live path (getContributionFromDB()):
--    Add contribution_event query for adoption source_type='adoption' rows.
--
-- 3. BookingService (or adoption workflow service):
--    After KORA_ADMIN approves an adoption (status → approved), call:
--    await db.rpc('attribute_contribution_for_adoption', {
--      p_adoption_id:       adoptionId,
--      p_reporting_period:  '2026-Q2',
--    });
--
-- 4. create_initiative_adoption() caller:
--    Companies request adoption via POST /api/commons/adoptions.
--    KORA_ADMIN approves via PATCH status=approved.
--    attribution RPC fires after approval webhook or explicit trigger.
-- ═══════════════════════════════════════════════════════════════════════════════
