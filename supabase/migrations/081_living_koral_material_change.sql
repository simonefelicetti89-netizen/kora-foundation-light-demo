-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 081: Living KORAL Material Change Layer
-- Migration:   081_living_koral_material_change
-- Created:     2026-09-18
-- Block:       KORA-WP-112 — Material Change Layer + Initiative Domain Adapter (Candidate-Only)
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file (registry 142's own
--              WP-112 Acceptance does not name a staging-run requirement —
--              pre-check 168 §V — so no staging rollout accompanies this WP).
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Registry 142's own KORA-WP-112 entry, Proposed New, verbatim: "gov.
-- living_koral_material_change table (CANDIDATE/RECOGNIZED/SUPERSEDED
-- lifecycle), domain-adapter contract (so future adapters — Advisor
-- Assignment, Company Membership, Need Hypothesis once its transition
-- mechanism exists — can plug in without changing this package)."
--
-- Founder Correction 4 (registry 142, binding): "an initiative status
-- transition (draft→published→closed) produces a Material Change
-- CANDIDATE only. It MUST NOT automatically produce a RECOGNIZED Material
-- Change. Promotion to RECOGNIZED requires the Change Protocol's own
-- evidence/persistence assessment (this package) — never a bare
-- status-transition rule."
--
-- FIELD-BY-FIELD JUSTIFICATION — every column below traces to a specific
-- report 129 Part (the Stage 0 Material Change Change Protocol design),
-- reconciled in pre-check report 168 §F. Nothing here is speculative or
-- added "because it may be useful to KORA-WP-113+" (explicit Founder
-- instruction, this task's own §5):
--   tenant_id                  — doc 129 Part 19: "every KORA object is
--                                 tenant-scoped"
--   status                     — registry's own CANDIDATE/RECOGNIZED/
--                                 SUPERSEDED lifecycle; NO other state
--                                 (REJECTED/EXPIRED/DISMISSED/ARCHIVED)
--                                 is implemented — none is canonically
--                                 named (Founder decision, this task's
--                                 own §6/§22A)
--   category                   — doc 129 Part 19: "one of the seven
--                                 retained taxonomy categories" (KORA-WP-111)
--   affected_domain            — doc 129 Part 19: "which canonical domain
--                                 attested it... needed for locality" —
--                                 CHECK-pinned to 'initiative' only, this
--                                 WP's own sole V1 domain source
--   source_entity_type/_id     — doc 129 Part 19's own "evidence_references
--                                 ... canonical object ids... never
--                                 denormalized text, so provenance survives
--                                 engine changes"
--   occurred_at                — doc 129 Part 19: "the transformation may
--                                 have unfolded over a window... not a
--                                 single instant" — for this WP's own
--                                 discrete categories it is the initiative's
--                                 own transition instant
--   recognized_at              — doc 129 Part 19: "when KORA recognized
--                                 it — distinct from when it happened"
--   recognition_source         — doc 129 Part 19/12: KORA-automatic vs.
--                                 Advisor-confirmed; this WP's own domain
--                                 (Emergence/Disappearance, both discrete)
--                                 only ever writes 'kora-automatic'
--                                 (doc 129 Part 12)
--   provenance                 — doc 129 Part 19: "which specific facts...
--                                 justify this exact recognition — the
--                                 explanation payload"
--   previous_state_reference,
--   superseded_by_id           — doc 129 Parts 10/19/20: required for
--                                 future reversal/supersession, even
--                                 though no KORA-WP-112-domain event
--                                 populates them yet (pre-check 168 §E)
--   taxonomy_config_version    — doc 129 Part 25: "every Material Change
--                                 Event records which Change-Protocol
--                                 version recognized it" — reconciled with
--                                 KORA-WP-111's own getLivingKoralConfigVersion()
--   actor_role/actor_id        — this schema's own established provenance
--                                 idiom, unchanged since migration 005
--
-- DELIBERATELY EXCLUDED (doc 129 Part 19, verbatim): "anything geometric,
-- any 'visual weight' field, any cross-tenant comparative field, any
-- field implying positive/negative valence." Also excluded per pre-check
-- 168 §F: `magnitude`/`evidence_confidence` (named in doc 129 but
-- formula-less in canon — DERIVED/OPTIONAL, correctly omitted rather than
-- invented at V1); any REJECTED/EXPIRED lifecycle state (Founder decision,
-- not canonically defined).
--
-- APPEND-ONLY, LIKE EVERY OTHER LANE-B GOVERNANCE-ADJACENT TABLE IN THIS
-- SCHEMA (a disclosed, deliberate design choice, matching doc 129 Part 20's
-- own "the original event is never deleted, only marked" — applied here
-- from CANDIDATE creation onward, not only after recognition, consistent
-- with this table's own governance-history role). This is the fourth
-- instance of the identical hard DELETE-reject pattern this engagement has
-- now built (analytics.review_advisor_assessment, migration 080;
-- audit.governance_event, pre-existing) — the same future tenant-
-- retirement/GDPR-erasure implication audit 163 §R already named is
-- disclosed again here, NOT solved by this migration (explicit Founder
-- instruction, this task's own §13).
--
-- SCOPE BOUNDARY: no Transformation Ledger, no Morphogenesis Engine, no
-- Continuity Contract, no analytics.living_koral_state, no Company Hub,
-- no Edition, no KORAL Review, no Expression Mode, no Commons integration,
-- no Public KORAL — all KORA-WP-113+'s own scope, untouched here.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. gov.living_koral_material_change ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS gov.living_koral_material_change (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  status                   text          NOT NULL DEFAULT 'CANDIDATE'
                                          CHECK (status IN ('CANDIDATE', 'RECOGNIZED', 'SUPERSEDED')),

  -- The seven retained taxonomy categories (KORA-WP-111) — kept as its
  -- own CHECK here (not a foreign-keyed lookup table) since KORA-WP-111's
  -- own canonical source of truth is the versioned config module, not a
  -- DB table; this CHECK is a structural safety net, not a second source
  -- of truth (the service layer always reads the real category list from
  -- lib/living-koral-config/v1.ts).
  category                 text          NOT NULL
                                          CHECK (category IN ('Emergence', 'Disappearance', 'Strengthening', 'Weakening', 'Consolidation', 'Reorientation', 'Stabilization')),

  -- Pinned to 'initiative' only — this WP's own sole V1 domain source.
  -- Widened additively (never destructively), matching this schema's own
  -- established discriminator-column convention, when a future adapter
  -- (Advisor Assignment, Company Membership, Need Hypothesis) exists.
  affected_domain          text          NOT NULL CHECK (affected_domain = 'initiative'),
  source_entity_type       text          NOT NULL CHECK (source_entity_type = 'initiative'),
  source_entity_id         uuid          NOT NULL,

  occurred_at              timestamptz   NOT NULL,
  recognized_at            timestamptz   NULL,
  recognition_source       text          NULL
                                          CHECK (recognition_source IS NULL OR recognition_source IN ('kora-automatic', 'advisor-confirmed')),

  provenance               text          NOT NULL CHECK (char_length(provenance) BETWEEN 1 AND 2000),

  previous_state_reference uuid          NULL REFERENCES gov.living_koral_material_change (id),
  superseded_by_id         uuid          NULL REFERENCES gov.living_koral_material_change (id),

  taxonomy_config_version  text          NOT NULL,

  actor_role                text          NOT NULL,
  actor_id                  text          NOT NULL,

  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now(),

  -- Structural consistency: recognized_at/recognition_source are set
  -- if and only if status has left CANDIDATE.
  CONSTRAINT living_koral_material_change_recognition_consistency
    CHECK ((status = 'CANDIDATE') = (recognized_at IS NULL AND recognition_source IS NULL))
);

COMMENT ON TABLE gov.living_koral_material_change IS
  'KORA-WP-112 — Material Change Candidate/Recognized record. Append-only '
  'from creation (see migration header) — the original row is never '
  'deleted, only marked SUPERSEDED. KORA-WP-113''s own Transformation '
  'Ledger consumes RECOGNIZED rows from this table; it does not itself '
  'materialize canonical KORAL state, ledger entries, or visual '
  'representation (that remains KORA-WP-113''s own scope entirely).';

-- Idempotency (pre-check 168 §M): the same real transition (one
-- initiative's one draft→published event, say) must never produce two
-- candidate rows. A second observation of the same already-recorded
-- transition is a safe no-op via ON CONFLICT DO NOTHING at the service
-- layer, enforced here as a real DB constraint, not only an application
-- convention.
CREATE UNIQUE INDEX IF NOT EXISTS uq_living_koral_material_change_source
  ON gov.living_koral_material_change (tenant_id, source_entity_type, source_entity_id, category);

CREATE INDEX IF NOT EXISTS idx_living_koral_material_change_tenant  ON gov.living_koral_material_change (tenant_id);
CREATE INDEX IF NOT EXISTS idx_living_koral_material_change_status  ON gov.living_koral_material_change (tenant_id, status);

-- ── 2. Tenant-match / lifecycle invariants (BEFORE INSERT) ───────────────────

CREATE OR REPLACE FUNCTION gov.enforce_living_koral_material_change_insert_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only CANDIDATE rows may ever be inserted directly — RECOGNIZED and
  -- SUPERSEDED are reached only via the promotion path (§3 below), never
  -- created as such from the start (matches Founder Correction 4: no bare
  -- status-transition rule may produce a RECOGNIZED row).
  IF NEW.status <> 'CANDIDATE' THEN
    RAISE EXCEPTION 'kora/candidate-only-insert: a new living_koral_material_change row must always start as CANDIDATE — recognition is a separate, later promotion, never an insert-time value';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_living_koral_material_change_insert_invariants
  BEFORE INSERT ON gov.living_koral_material_change
  FOR EACH ROW
  EXECUTE FUNCTION gov.enforce_living_koral_material_change_insert_invariants();

-- ── 3. Post-CANDIDATE immutability (BEFORE UPDATE) ────────────────────────────
-- Once a row leaves CANDIDATE, its own evidentiary fields become
-- immutable — the only permitted further mutations are: the one-time
-- CANDIDATE→RECOGNIZED promotion (setting recognized_at/recognition_source),
-- and a later RECOGNIZED→SUPERSEDED transition (setting superseded_by_id).
-- No backward transition (RECOGNIZED→CANDIDATE, SUPERSEDED→anything) is
-- ever permitted.

CREATE OR REPLACE FUNCTION gov.enforce_living_koral_material_change_update_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.affected_domain IS DISTINCT FROM OLD.affected_domain
    OR NEW.source_entity_type IS DISTINCT FROM OLD.source_entity_type
    OR NEW.source_entity_id IS DISTINCT FROM OLD.source_entity_id
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.provenance IS DISTINCT FROM OLD.provenance
    OR NEW.taxonomy_config_version IS DISTINCT FROM OLD.taxonomy_config_version
    OR NEW.actor_role IS DISTINCT FROM OLD.actor_role
    OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
  THEN
    RAISE EXCEPTION 'kora/immutable: living_koral_material_change evidentiary fields cannot change once set — a correction is always a new, superseding record (doc 129 Part 10), never a mutation of this one';
  END IF;

  IF OLD.status = 'CANDIDATE' AND NEW.status = 'RECOGNIZED' THEN
    NULL; -- the one legal forward promotion
  ELSIF OLD.status = 'RECOGNIZED' AND NEW.status = 'SUPERSEDED' THEN
    IF NEW.superseded_by_id IS NULL THEN
      RAISE EXCEPTION 'kora/supersession-requires-reference: a SUPERSEDED row must reference the event that supersedes it';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'kora/invalid-transition: only CANDIDATE->RECOGNIZED and RECOGNIZED->SUPERSEDED are permitted — never a backward transition';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_living_koral_material_change_update_invariants
  BEFORE UPDATE ON gov.living_koral_material_change
  FOR EACH ROW
  EXECUTE FUNCTION gov.enforce_living_koral_material_change_update_invariants();

-- ── 4. Append-only — no DELETE, ever, from any role including a privileged one ─
-- The same unconditional hard-reject pattern already established for
-- analytics.review_advisor_assessment (migration 080) and
-- audit.governance_event — disclosed, not silently copied: this is the
-- fourth confirmed instance of the same future tenant-retirement/GDPR-
-- erasure implication audit 163 §R already named. NOT solved here.

CREATE OR REPLACE FUNCTION gov.reject_living_koral_material_change_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: gov.living_koral_material_change rows cannot be deleted — this is an append-only substrate. A correction is always a new, superseding record, never a deletion of an existing one.';
END;
$$;

CREATE TRIGGER trg_living_koral_material_change_reject_delete
  BEFORE DELETE ON gov.living_koral_material_change
  FOR EACH ROW
  EXECUTE FUNCTION gov.reject_living_koral_material_change_delete();

-- ── 5. Row Level Security — Pattern A, KORA_ADMIN read/write only ────────────
-- Registry 142's own explicit text: "tenant-scoped, KORA_ADMIN read/write;
-- no Company/Worker write path." No Advisor policy either — this WP's own
-- V1 domain (initiative, both discrete categories) never reaches the
-- Advisor-confirmation path (KORA-WP-116's own, later, different scope).
-- No Company/Worker read policy either (pre-check 168 §H): Company-facing
-- visibility is architected to arrive later, indirectly, through
-- KORA-WP-114's own read layer over KORA-WP-113's derived canonical
-- state — never a direct read of this WP's own raw candidate/recognition
-- table.

ALTER TABLE gov.living_koral_material_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.living_koral_material_change FORCE ROW LEVEL SECURITY;

CREATE POLICY "living_koral_material_change_kora_admin_all" ON gov.living_koral_material_change
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 6. GRANTs ──────────────────────────────────────────────────────────────────
-- service_role: SELECT/INSERT/UPDATE only — the initiative domain adapter's
-- own system-context write, and the recognition-promotion update. No
-- DELETE grant to any role, matching the append-only trigger above.
-- authenticated: SELECT only (self-read via the KORA_ADMIN RLS policy
-- above) — no direct authenticated write path, matching registry's own
-- "no Company/Worker write path" and this WP's own "no manual human-
-- approval workflow" design (pre-check 168 §G).

GRANT SELECT, INSERT, UPDATE ON gov.living_koral_material_change TO service_role;
GRANT SELECT ON gov.living_koral_material_change TO authenticated;

-- ── 7. Prerequisite grant fix — real-DB finding, disclosed ──────────────────
-- Real-DB validation for this WP's own construction found that
-- personal.worker_initiative (migration 008) grants SELECT/INSERT/UPDATE
-- to `authenticated` only — `service_role` has NO grant on this table at
-- all (confirmed live via \dp). Without SELECT, the initiative domain
-- adapter's own "evidence/persistence assessment" (Founder Correction 4,
-- registry 142's own binding requirement) can never re-read the real
-- source record, meaning NO Material Change could ever be promoted to
-- RECOGNIZED — a blocking prerequisite for this WP's own core Acceptance
-- criterion, not a tangential, unrelated-WP defect. Narrow, minimal,
-- read-only fix: this WP's own migration adds exactly the one grant its
-- own new read path requires — no other privilege, no RLS-policy change,
-- no write-capability expansion. personal.worker_initiative's own RLS
-- (KORA_ADMIN-all, migration 008) is unaffected — service_role already
-- bypasses RLS by its own platform-level nature; this GRANT only closes
-- the separate, ordinary Postgres object-privilege gate that was blocking
-- it.

GRANT SELECT ON personal.worker_initiative TO service_role;

-- ── ROLLBACK (documented, not executed) ──────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_living_koral_material_change_reject_delete ON gov.living_koral_material_change;
-- DROP TRIGGER IF EXISTS trg_living_koral_material_change_update_invariants ON gov.living_koral_material_change;
-- DROP TRIGGER IF EXISTS trg_living_koral_material_change_insert_invariants ON gov.living_koral_material_change;
-- DROP FUNCTION IF EXISTS gov.reject_living_koral_material_change_delete();
-- DROP FUNCTION IF EXISTS gov.enforce_living_koral_material_change_update_invariants();
-- DROP FUNCTION IF EXISTS gov.enforce_living_koral_material_change_insert_invariants();
-- DROP TABLE IF EXISTS gov.living_koral_material_change;
-- Rollback is safe only if no row has actually been created yet — once any
-- row exists, it is (by design) permanent, so this rollback path is
-- realistically only viable in the earliest post-deploy window.
