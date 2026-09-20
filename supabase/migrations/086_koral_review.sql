-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 086: KORAL Review (KORA-WP-116)
-- Migration:   086_koral_review
-- Block:       KORA-WP-116 — KORAL Review
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO — exactly two narrow, additive schema changes. No new table.
--
-- 1. gov.operational_case.linked_object_type gains one new value,
--    'material_change'. KORAL Review is implemented, per report 176's own
--    §15-16 conclusion and this WP's own Founder Adjudication #6, as a Case
--    of the EXISTING KORA-WP-007 Operational Case primitive, linked to a
--    gov.living_koral_material_change row — never a new generic Review
--    table, never a second Case model. The pre-existing 'review' value
--    (KORA-WP-024, "Review — Thin State + Event," a fully distinct object
--    graph — see report 176 §14) is NOT reused, renamed, or touched: a
--    KORAL Review Case is linked_object_type='material_change', never
--    'review'.
--
-- 2. advisor.advisor_content_record (KORA-WP-036) gains two new NULLABLE
--    columns, linked_object_type/linked_object_id, so an Advisor's KORAL
--    Review interpretation content can be structurally linked to the one
--    specific Material Change it concerns. This is the resolution of this
--    WP's own Founder Adjudication #3 due-diligence requirement:
--    advisor_content_record, AS IT EXISTED THROUGH migration 060, is
--    scoped only by assignment_id — no column anywhere on it links a
--    record to a specific Case or Material Change. Storing Review
--    interpretation there un-widened would force either (a) encoding the
--    Material Change reference inside the free-text `body` field (a real
--    semantic-abuse hack this WP's own Founder Adjudication #3 explicitly
--    forbids), or (b) falling back to operational_case.resolution_note
--    (explicitly forbidden by the same adjudication: "Review interpretation
--    is domain content, not merely a Case closure note"). A narrow,
--    additive widening of the SAME existing table — not a second content
--    system — is the disclosed resolution: this is the identical
--    "narrow, additive extension over invention" discipline already
--    applied at every other decision point in this engagement (the
--    linked_object_type widening directly above; KORA-WP-114's own
--    fn_company_living_koral_source_initiative() bridge). No new class is
--    added to the five-class taxonomy (CONTENT_CLASSES is untouched);
--    Review interpretation is persisted as an ordinary
--    ORGANISATION_SHAREABLE_NOTE (ordinary content, per this WP's own
--    Founder Adjudication #3: "Review interpretation is domain content"),
--    now optionally linkable to the Material Change it concerns.
--
-- No table is created. No RLS policy on advisor_content_record is
-- modified — the three existing policies (kora_admin_all, advisor_own_select,
-- company_own_select, migration 060) already apply row-wise regardless of
-- these two new nullable columns; no new visibility class is introduced.
-- gov.living_koral_material_change (migration 081) is NOT altered —
-- recognition_source already allows CHECK (recognition_source IN
-- ('kora-automatic', 'advisor-confirmed')) from its own first migration;
-- Advisor-confirmed attribution requires no schema change, only the
-- application-level change (this WP's own lib/living-koral-material-change/
-- material-change-service.ts: recognitionSource becomes a required,
-- explicit parameter of assessMaterialChangeCandidate(), replacing the
-- prior hardcoded 'kora-automatic' literal — see that file's own diff).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Widen gov.operational_case.linked_object_type ───────────────────────────

ALTER TABLE gov.operational_case
  DROP CONSTRAINT operational_case_linked_object_type_check;

ALTER TABLE gov.operational_case
  ADD CONSTRAINT operational_case_linked_object_type_check
    CHECK (linked_object_type IS NULL OR linked_object_type IN (
      'commitment', 'program', 'review', 'certification', 'capability_validation',
      'material_change'
    ));

-- ── 2. Widen advisor.advisor_content_record with an optional subject link ──────

ALTER TABLE advisor.advisor_content_record
  ADD COLUMN linked_object_type text NULL,
  ADD COLUMN linked_object_id   uuid NULL;

ALTER TABLE advisor.advisor_content_record
  ADD CONSTRAINT advisor_content_record_linked_object_pair
    CHECK ((linked_object_type IS NULL) = (linked_object_id IS NULL));

-- Only one linkable object type exists today (KORAL Review's own Material
-- Change subject). Deliberately NOT a generic open vocabulary — widened
-- again, additively, the day a second linkable domain genuinely exists,
-- never speculatively reserved now.
ALTER TABLE advisor.advisor_content_record
  ADD CONSTRAINT advisor_content_record_linked_object_type_check
    CHECK (linked_object_type IS NULL OR linked_object_type = 'material_change');

CREATE INDEX IF NOT EXISTS idx_advisor_content_record_linked_object
  ON advisor.advisor_content_record (linked_object_type, linked_object_id);

COMMENT ON COLUMN advisor.advisor_content_record.linked_object_type IS
  'KORA-WP-116 addition. NULL for every pre-existing content record (general Assignment-scoped note). ''material_change'' when this content is an Advisor''s KORAL Review interpretation of one specific gov.living_koral_material_change row — see this migration''s own header.';
COMMENT ON COLUMN advisor.advisor_content_record.linked_object_id IS
  'KORA-WP-116 addition. Paired with linked_object_type (both NULL or both set). No native FK: the referenced table depends on linked_object_type, identically to gov.operational_case.linked_object_id''s own established polymorphic-link pattern (migration 061) — integrity is enforced at the service layer (lib/living-koral-review/review-service.ts), not by a cross-schema FK.';

-- ── Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the DROPs below
-- DROP INDEX IF EXISTS advisor.idx_advisor_content_record_linked_object;
-- ALTER TABLE advisor.advisor_content_record DROP CONSTRAINT IF EXISTS advisor_content_record_linked_object_type_check;
-- ALTER TABLE advisor.advisor_content_record DROP CONSTRAINT IF EXISTS advisor_content_record_linked_object_pair;
-- ALTER TABLE advisor.advisor_content_record DROP COLUMN IF EXISTS linked_object_id;
-- ALTER TABLE advisor.advisor_content_record DROP COLUMN IF EXISTS linked_object_type;
-- ALTER TABLE gov.operational_case DROP CONSTRAINT operational_case_linked_object_type_check;
-- ALTER TABLE gov.operational_case ADD CONSTRAINT operational_case_linked_object_type_check
--   CHECK (linked_object_type IS NULL OR linked_object_type IN ('commitment', 'program', 'review', 'certification', 'capability_validation'));
