-- KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
--
-- Canonical authority: Registry 142 (`142_...md:277`), pre-check 174
-- (`.kora-audit/output/174_KORA_WP_115_CANONICAL_PRE_CHECK.md`), this WP's
-- own Founder-authorized implementation task and its four binding
-- adjudications (source-label snapshot; SECURITY DEFINER write path;
-- no UNIQUE(tenant_id, ledger_id); Portrait = narrative/document rendering
-- only, no visual grammar).
--
-- AN EDITION IS: a frozen REFERENCE — one gov.living_koral_transformation_
-- ledger row id + the Morphogenesis Engine version that produced it (doc
-- 129 Part 26: "freeze the transformation ledger as of event X, recognized
-- under Change Protocol version Y") — Company-chosen, Company-named,
-- immutable once created. It is NOT current mutable state, NOT a
-- transformation, NOT a Review, NOT a Mark, NOT a public artifact.
--
-- REFERENCE, NOT COPY, for the Ledger side: the referenced Ledger row is
-- ALREADY immutable (append-only, WP-113's own guarantee) — referencing
-- its id is structurally equivalent to freezing it. Denormalized columns
-- below (category, affected_domain, taxonomy_config_version,
-- morphogenesis_engine_version, resulting_state_revision, occurred_at,
-- recognized_at) are copied at write time from that same immutable row —
-- a display convenience mirroring the Ledger's own established
-- "structural safety net, not a second source of truth" convention
-- (migration 082's own header), never a second source of truth for these
-- fields either.
--
-- SNAPSHOT, NOT REFERENCE, for source_label: personal.worker_initiative
-- carries NO immutability guarantee — a title can be renamed after this
-- Edition is created. Founder adjudication #1 (this task): the resolved,
-- already-Company-safe initiative title (via the existing
-- analytics.fn_company_living_koral_source_initiative() bridge, migration
-- 084 — never re-derived, never broadened) is snapshotted into
-- source_label ONCE, at creation, and never re-resolved live. Only that
-- one already-authorized text field is frozen — no Worker identity, no
-- description/body, no other worker_initiative column, ever.
--
-- NO UNIQUE(tenant_id, ledger_id) — Founder adjudication #3 (this task):
-- multiple, independently Company-named Editions may legitimately
-- reference the same frozen ledger point (e.g. "Board Presentation
-- Snapshot" and "Q1 Handoff," both anchored to the same real moment).
-- Retry-safety is NOT this table's own concern — it is solved entirely at
-- the TypeScript/service layer by reusing KORA-WP-011's existing, already-
-- reviewed, already-allowlisted generic idempotency contract
-- (lib/async-contract/idempotency-contract.ts + postgres-idempotency-
-- store.ts, backed by the EXISTING analytics.idempotency_claim table,
-- migration 077 — no new idempotency table/mechanism is created here).
--
-- WRITE PATH — Founder adjudication #2 (this task): a single SECURITY
-- DEFINER function, hardened from first implementation (never repeating
-- migration 084's own initially-discovered, since-fixed implicit PUBLIC
-- EXECUTE gap — REVOKE FROM PUBLIC is included below from the start).
-- COMPANY_ADMIN triggers it via its own EXECUTE grant; the function's own
-- internal role+tenant check is the real authorization boundary — no raw
-- `authenticated` INSERT/UPDATE/DELETE grant exists on the table at all.
--
-- IMMUTABLE ONCE CREATED — the 6th confirmed instance of this codebase's
-- own append-only pattern (after analytics.kora_ready_attainment WP-027,
-- analytics.review_advisor_assessment WP-043, audit.governance_event
-- WP-045, gov.living_koral_material_change WP-112, gov.living_koral_
-- transformation_ledger WP-113). Same inherited, disclosed,
-- NOT-solved-here tenant-retirement/GDPR-erasure architectural gap every
-- prior instance already carries — not opportunistically fixed here,
-- per this task's own explicit §22 instruction.
--
-- NO KORAL MARK, NO VISUAL GRAMMAR — Founder adjudication #4: Portrait in
-- this WP means only the narrative/document-form rendering, computed from
-- the frozen fields below at read time (no separate stored payload) — no
-- shape/color/geometry/SVG/image field exists anywhere in this table.
--
-- OUT OF SCOPE, explicitly, no placeholder field added for any of it:
-- review status (WP-116), publication/visibility/public slug (WP-118/119),
-- export/download status (WP-117), Mark payload/image path (WP-117),
-- Edition sequence number (not canonical, pre-check 174 §15).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.living_koral_edition — append-only immutable anchor ───────

CREATE TABLE IF NOT EXISTS analytics.living_koral_edition (
  id                           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Company-provided at creation, atomically, never editable after
  -- (§ header — "Company chooses moment, not morphology"; the name is
  -- part of the one, single, immutable creation act).
  name                         text          NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 200),

  -- The frozen anchor — deliberately NOT UNIQUE (§ header, Founder
  -- adjudication #3). No ON DELETE CASCADE: a Ledger row is itself
  -- append-only/immutable and never deleted, so this FK can never dangle.
  ledger_id                    uuid          NOT NULL REFERENCES gov.living_koral_transformation_ledger (id),

  -- Denormalized from the referenced (already-immutable) Ledger row at
  -- write time — display convenience, not a second source of truth.
  category                     text          NOT NULL
                                              CHECK (category IN ('Emergence', 'Disappearance', 'Strengthening', 'Weakening', 'Consolidation', 'Reorientation', 'Stabilization')),
  affected_domain              text          NOT NULL CHECK (affected_domain = 'initiative'),
  taxonomy_config_version      text          NOT NULL,
  morphogenesis_engine_version text          NOT NULL,
  resulting_state_revision     integer       NOT NULL CHECK (resulting_state_revision > 0),
  occurred_at                  timestamptz   NOT NULL,
  recognized_at                timestamptz   NOT NULL,

  -- Frozen Company-safe provenance snapshot (Founder adjudication #1) —
  -- resolved once, at creation, via the EXISTING analytics.fn_company_
  -- living_koral_source_initiative() bridge (migration 084) — never
  -- re-resolved live, never broadened beyond that one already-authorized
  -- field. NULL when no source could be resolved at creation time (e.g.
  -- a future non-initiative domain, or resolution genuinely unavailable)
  -- — never fabricated.
  source_label                 text,

  -- System-attributable, human-initiated — a hard DB CHECK, not merely
  -- convention (matches the actor_role discipline every prior Living
  -- KORAL table already enforces).
  actor_role                   text          NOT NULL DEFAULT 'COMPANY_ADMIN' CHECK (actor_role = 'COMPANY_ADMIN'),
  actor_id                     text          NOT NULL,

  created_at                   timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE analytics.living_koral_edition IS
  'KORA-WP-115 — Company-created, immutable, named anchor into one frozen '
  'gov.living_koral_transformation_ledger point + engine version. Never '
  'updated, never deleted (see trigger below). Portrait (the narrative/'
  'document-form rendering) is computed from this row''s own frozen '
  'fields at read time — never a separate stored payload, never a visual '
  'artifact. No KORAL Mark visual grammar of any kind exists here.';

CREATE INDEX IF NOT EXISTS idx_living_koral_edition_tenant
  ON analytics.living_koral_edition (tenant_id, created_at DESC);

-- Never updated, never deleted — the 6th confirmed instance of this
-- codebase's own append-only pattern (see header). Disclosed, not solved.

CREATE OR REPLACE FUNCTION analytics.reject_living_koral_edition_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.living_koral_edition rows are never updated or deleted — a KORAL Edition is Living KORAL''s own permanent, Company-chosen historical record (doc 129 Part 26)';
END;
$$;

CREATE TRIGGER trg_living_koral_edition_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.living_koral_edition
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_living_koral_edition_mutation();

-- ── 2. analytics.fn_create_living_koral_edition() — the ONLY write path ────
-- SECURITY DEFINER, hardened from first implementation (Founder
-- adjudication #2 + this task's own §16 instruction — never repeating
-- migration 084's own initially-discovered, since-fixed PUBLIC EXECUTE
-- gap). Re-derives tenant/role exclusively from the session's own JWT
-- claims (kora.kora_role()/kora.tenant_id()) — accepts no caller-provided
-- tenant or role authority of any kind. Reads the tenant's OWN latest
-- Ledger row server-side (never trusts a client-supplied ledger_id or any
-- denormalized field) — this is the structural guarantee behind "Company
-- chooses moment, not morphology": the Company supplies only a name; every
-- other field is read from real, already-immutable source data.

CREATE OR REPLACE FUNCTION analytics.fn_create_living_koral_edition(
  p_name text
)
RETURNS TABLE (
  id                           uuid,
  name                         text,
  ledger_id                    uuid,
  category                     text,
  affected_domain              text,
  taxonomy_config_version      text,
  morphogenesis_engine_version text,
  resulting_state_revision     integer,
  occurred_at                  timestamptz,
  recognized_at                timestamptz,
  source_label                 text,
  created_at                   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = gov, analytics, kora, public
AS $$
#variable_conflict use_column
DECLARE
  v_role      text;
  v_tenant_id uuid;
  v_ledger    gov.living_koral_transformation_ledger;
  v_source    text;
  v_edition_id uuid;
BEGIN
  v_role := kora.kora_role();
  v_tenant_id := kora.tenant_id();

  -- Role gate — COMPANY_ADMIN only. KORA_ADMIN, WORKER, ADVISOR, and any
  -- other role are all structurally rejected here, not merely undocumented
  -- (this task's own §3: "KORA_ADMIN: read only; no Edition create action").
  IF v_role IS DISTINCT FROM 'COMPANY_ADMIN' THEN
    RAISE EXCEPTION 'kora/forbidden: only COMPANY_ADMIN may create a Living KORAL Edition';
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'kora/forbidden: no tenant context for this session';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'kora/invalid-name: Edition name is required';
  END IF;

  IF char_length(p_name) > 200 THEN
    RAISE EXCEPTION 'kora/invalid-name: Edition name is too long';
  END IF;

  -- The Company's OWN latest recognized transformation — server-side,
  -- never client-supplied (this task's own §2: "from the Company's
  -- current/latest eligible Living KORAL transformation").
  SELECT * INTO v_ledger
  FROM gov.living_koral_transformation_ledger
  WHERE tenant_id = v_tenant_id
  ORDER BY recognized_at DESC, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/no-recognized-transformation: no recognized Living KORAL transformation exists yet for this tenant';
  END IF;

  -- Frozen source-label snapshot (Founder adjudication #1) — reuses the
  -- EXISTING, already-hardened bridge function verbatim, never
  -- re-implemented, never broadened. Only ever populated for the
  -- currently live 'initiative' domain — structurally guaranteed dormant
  -- for any other value, since affected_domain is itself CHECK-pinned to
  -- 'initiative' on the Ledger table today.
  IF v_ledger.affected_domain = 'initiative' THEN
    SELECT f.title INTO v_source
    FROM analytics.fn_company_living_koral_source_initiative(v_ledger.material_change_id) f;
  END IF;

  INSERT INTO analytics.living_koral_edition (
    tenant_id, name, ledger_id, category, affected_domain,
    taxonomy_config_version, morphogenesis_engine_version,
    resulting_state_revision, occurred_at, recognized_at,
    source_label, actor_id
  )
  VALUES (
    v_tenant_id, btrim(p_name), v_ledger.id, v_ledger.category, v_ledger.affected_domain,
    v_ledger.taxonomy_config_version, v_ledger.morphogenesis_engine_version,
    v_ledger.resulting_state_revision, v_ledger.occurred_at, v_ledger.recognized_at,
    v_source, COALESCE(auth.uid()::text, 'unknown')
  )
  RETURNING living_koral_edition.id INTO v_edition_id;

  RETURN QUERY
  SELECT e.id, e.name, e.ledger_id, e.category, e.affected_domain,
         e.taxonomy_config_version, e.morphogenesis_engine_version,
         e.resulting_state_revision, e.occurred_at, e.recognized_at,
         e.source_label, e.created_at
  FROM analytics.living_koral_edition e
  WHERE e.id = v_edition_id;
END;
$$;

-- SECURITY DEFINER HARDENING (applied from first implementation, per this
-- task's own explicit §16 instruction — not discovered after the fact):
--   - explicit, safe search_path (above) — every table/function reference
--     in the body is additionally already schema-qualified regardless;
--   - owner is postgres (CREATE FUNCTION's own default definer — matching
--     every other SECURITY DEFINER function in this codebase, migration
--     015/084's own established convention);
--   - REVOKE FROM PUBLIC and FROM anon, explicit, both applied BEFORE the
--     narrow authenticated GRANT (order matters only for readability here,
--     not correctness — PostgreSQL evaluates the final ACL state);
--   - no caller-controlled tenant_id or role of any kind — both are read
--     exclusively from kora.kora_role()/kora.tenant_id();
--   - no dynamic SQL, no string-built query, no EXECUTE format(...) —
--     p_name is used only as a plain, typed, bound parameter;
--   - enumeration-safe by construction: this function creates a NEW row
--     from the caller's OWN latest state — there is no "does X exist"
--     probe surface, unlike a pure read/resolution function.
REVOKE EXECUTE ON FUNCTION analytics.fn_create_living_koral_edition(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION analytics.fn_create_living_koral_edition(text) FROM anon;
GRANT EXECUTE ON FUNCTION analytics.fn_create_living_koral_edition(text) TO authenticated;

-- ── 3. RLS — read is a normal own-tenant policy (mirrors migration 079/083's
-- own company_own_..._read precedent exactly); write is EXCLUSIVELY the
-- SECURITY DEFINER function above — no authenticated INSERT/UPDATE/DELETE
-- grant exists on the table at all (this task's own §15: "no unintended
-- raw INSERT/UPDATE/DELETE path"). ───────────────────────────────────────

ALTER TABLE analytics.living_koral_edition ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.living_koral_edition FORCE ROW LEVEL SECURITY;

CREATE POLICY "living_koral_edition_kora_admin_read" ON analytics.living_koral_edition
  FOR SELECT USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_living_koral_edition_read" ON analytics.living_koral_edition
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 4. GRANTs — least privilege ──────────────────────────────────────────
-- SELECT only, for the RLS-gated read paths above (both KORA_ADMIN and
-- COMPANY_ADMIN sessions use the `authenticated` PostgREST role). NO
-- INSERT/UPDATE/DELETE grant to `authenticated` at all — the SECURITY
-- DEFINER function above (owned by postgres, itself bypassing RLS/grants)
-- is the only path that ever writes this table. `service_role` is not
-- granted anything on this table — no code path in this WP calls it via
-- the service-role client (the idempotency wrapper's own service-role use
-- is confined to the pre-existing analytics.idempotency_claim table, a
-- separate, already-established, already-allowlisted mechanism — see
-- lib/async-contract/postgres-idempotency-store.ts, unmodified by this
-- migration).

GRANT SELECT ON analytics.living_koral_edition TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT ON analytics.living_koral_edition FROM authenticated;
-- DROP POLICY IF EXISTS "company_own_living_koral_edition_read" ON analytics.living_koral_edition;
-- DROP POLICY IF EXISTS "living_koral_edition_kora_admin_read" ON analytics.living_koral_edition;
-- REVOKE EXECUTE ON FUNCTION analytics.fn_create_living_koral_edition(text) FROM authenticated;
-- DROP FUNCTION IF EXISTS analytics.fn_create_living_koral_edition(text);
-- DROP TRIGGER IF EXISTS trg_living_koral_edition_no_mutation ON analytics.living_koral_edition;
-- DROP FUNCTION IF EXISTS analytics.reject_living_koral_edition_mutation();
-- DROP TABLE IF EXISTS analytics.living_koral_edition;
