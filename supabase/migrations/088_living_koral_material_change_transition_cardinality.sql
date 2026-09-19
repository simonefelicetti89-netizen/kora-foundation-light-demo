-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 088: Living KORAL Material Change — Transition Cardinality Remediation
-- Migration:   088_living_koral_material_change_transition_cardinality
-- Created:     2026-09-19
-- Block:       KORA Morphology Package A — Canonical Cardinality Remediation
--              (Founder task, following report 183's own disclosed finding).
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Corrects a genuine, mechanically discovered substrate mismatch in
-- gov.living_koral_material_change's own uniqueness constraint (originally
-- migration 081, KORA-WP-112) — reported, not yet fixed, in report 183.
--
-- WHY 088, NOT AN EDIT TO 081 OR 087 (Founder task's own §8, answered here):
-- migration 081 is a PRIOR, distinct WP's own migration — this repository's
-- own established discipline throughout this entire engagement (migrations
-- 082/083/084/085/086/087 each widen an EARLIER migration's own constraint
-- via a NEW, narrow, additive file, never by editing the earlier file in
-- place) is followed here unchanged, even though nothing has been pushed:
-- consistency with every other decision point in this engagement outweighs
-- the fact that 081/087 are both still local-only. Migration 087 itself is
-- also already a complete, self-contained, correctly-scoped unit (the
-- Transformation Ledger's own operation vocabulary) — folding an unrelated
-- table's (gov.living_koral_material_change, not gov.living_koral_
-- transformation_ledger) constraint fix into it would blur two genuinely
-- distinct concerns into one migration file for no benefit, since both are
-- equally easy to apply locally in sequence (088 depends on 081 having
-- already run, which it always has by the time 088 runs).
--
-- ── 1. RECONSTRUCTED RATIONALE FOR THE ORIGINAL CONSTRAINT ──────────────────
-- Migration 081's own index (`uq_living_koral_material_change_source`, on
-- (tenant_id, source_entity_type, source_entity_id, category)) was created
-- per pre-check 168 §M, whose own text says: "Duplicate candidate
-- generation prevented? ... the same real transition (e.g. one initiative's
-- one draft->published event) must never produce two candidate rows."
-- This was an IDEMPOTENCY mechanism (re-observing the SAME real-world
-- transition, e.g. a retried adapter call, must be a safe no-op) — never a
-- deliberate "this category can happen at most once ever for this source
-- entity" design decision. It was written and reasoned about EXCLUSIVELY
-- against KORA-WP-112's own sole domain adapter at the time
-- (initiative-adapter.ts), whose only two live categories (Emergence,
-- Disappearance) both happen to be genuinely one-time, discrete transitions
-- per source entity (draft->published happens once ever; any->closed
-- happens once ever) — so the coarse (source, category) grain was
-- ACCIDENTALLY correct for that narrow domain, never evaluated against a
-- category doc 129 itself defines as recurring.
--
-- ── 2. CANONICAL RECURRENCE ANALYSIS (doc 129 Part 2's own taxonomy table,
-- re-read directly for this task) ──────────────────────────────────────────
-- Emergence         — ONE-TIME PER LINEAGE. A source entity emerges once.
-- Disappearance     — ONE-TIME PER LINEAGE (after Emergence). A source
--                      entity disappears once; nothing further is expected
--                      to apply to an already-retired slot (report 179's
--                      own established slot-retirement invariant).
-- Strengthening     — RECURRENT. Doc 129 Part 2's own row, verbatim:
--                      "Need moves Hypothesis->Emerging->Supported" —
--                      TWO distinct hops, i.e. two distinct, later,
--                      genuinely separate Strengthening events for the
--                      SAME source entity. Its own "Morphology or
--                      confidence-only?" column: "ONLY if classification
--                      actually TRANSITIONS — not on repeated confirmation"
--                      — confirms recurrence is canonical, while a mere
--                      repeated confirmation of an ALREADY-settled
--                      classification (Category B, Part 3) is correctly
--                      excluded (a separate mechanism from this migration,
--                      unaffected — Category B evidence never reaches
--                      createMaterialChangeCandidate() as a genuine new
--                      transition in the first place, so this migration's
--                      own dedup logic is never even asked to distinguish
--                      it).
-- Weakening         — RECURRENT (Strengthening's own mirror — a
--                      classification may reclassify downward more than
--                      once over an entity's own history).
-- Consolidation     — Package B, semantics only, not remediated here. Doc
--                      129 Part 2: "multiple smaller elements resolve into
--                      fewer, clearer ones" — for a GIVEN resulting
--                      identity this reads as one-time (report 182 §7's own
--                      already-fixed identity model); its own multi-source
--                      persistence (a dedicated join table, not this
--                      table's own uniqueness) remains entirely Package B's
--                      later, separate scope.
-- Reorientation     — RECURRENT. Doc 129 Part 2's own row: "new Decision
--                      Pack SUPERSEDING A PRIOR ONE's direction" — "a
--                      prior one" presupposes more than one may exist over
--                      time.
-- Stabilization     — ONE-TIME PER LINEAGE by canon (doc 129 Part 2:
--                      "reversible? N/A (this IS the stable state)" — no
--                      canonical "un-stabilize then re-stabilize" sequence
--                      exists in V1). The widened index below is applied
--                      uniformly across all seven categories for one
--                      simple, generic, auditable mechanism rather than
--                      seven different per-category DB rules; this is
--                      disclosed as an accepted, non-blocking nuance for
--                      Stabilization specifically (no live producer exists
--                      for it at all today, and the REPLAY layer already
--                      treats a second Stabilization event as a safe,
--                      idempotent no-op state-wise regardless — see
--                      edition-lineage-service.ts's own stabilize handler,
--                      unchanged by this migration).
--
-- ── 3. THE FIX — canonical event identity, not a fingerprint ────────────────
-- previous_state_reference (already a real, doc-129-Part-10/19/20-named
-- column on this table since migration 081 — nullable, an FK to this same
-- table, previously unpopulated by any adapter) now becomes PART of the
-- effective transition identity. lib/living-koral-material-change/
-- material-change-service.ts's own createMaterialChangeCandidate() (this
-- task's own companion application change) computes it server-side, never
-- caller-supplied: the id of the MOST RECENTLY CREATED Material Change row
-- (any status, any category) for the exact same (tenant, source_entity_type,
-- source_entity_id) — or NULL if this is the first-ever Material Change for
-- that source entity. This is NOT a fingerprint, NOT a timestamp, NOT a
-- random UUID, NOT a user-supplied key, NOT Company name, NOT renderer
-- state — it is the existing, already-canonical "what state did this
-- transition move away from" reference the schema already named for
-- exactly this purpose, simply finally populated.
--
-- Re-observing the SAME real transition (e.g. a retried adapter call with
-- nothing new created in between) computes the SAME previous_state_reference
-- both times -> collides on the widened unique index below -> correctly
-- caught as a duplicate, exactly as before. A genuinely NEW, later
-- transition (of the SAME or a different category) necessarily has a
-- DIFFERENT, more recent predecessor -> a distinct row is correctly
-- permitted. Material Change history remains append-only and immutable —
-- no row is ever mutated to represent a later transition; each hop is its
-- own new row, independently provenance-recoverable via its own
-- previous_state_reference chain.
--
-- NULLS NOT DISTINCT (Postgres 15+, confirmed available — local stack runs
-- Postgres 17): by default Postgres treats every NULL as distinct from
-- every other NULL in a UNIQUE index, which would silently defeat dedup for
-- the FIRST-EVER occurrence of a given (source, category) pair (two
-- different "first Strengthening ever" candidates, both with
-- previous_state_reference IS NULL, would NOT collide under default
-- semantics). NULLS NOT DISTINCT closes this gap explicitly.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS gov.uq_living_koral_material_change_source;

CREATE UNIQUE INDEX uq_living_koral_material_change_transition
  ON gov.living_koral_material_change
  (tenant_id, source_entity_type, source_entity_id, category, previous_state_reference)
  NULLS NOT DISTINCT;

COMMENT ON INDEX gov.uq_living_koral_material_change_transition IS
  'KORAL Morphology Package A cardinality remediation (migration 088, '
  '2026-09-19) — replaces migration 081''s own coarser (tenant, source, '
  'category) uniqueness. previous_state_reference (the id of the most '
  'recently created Material Change row for this exact source entity, any '
  'status, any category, computed server-side by createMaterialChangeCandidate()'
  ' — NULL for a source entity''s first-ever Material Change) is now part of '
  'the transition identity, so recurring categories (Strengthening, '
  'Weakening, Reorientation) can be recognized more than once for the same '
  'lineage while re-observing the SAME real transition remains a safe, '
  'idempotent no-op. NULLS NOT DISTINCT so two different "first occurrence" '
  'rows for the same (tenant, source, category) still correctly collide.';

-- Idempotency-adjacent lookup index — supports material-change-service.ts's
-- own new "most recent prior row for this source entity" query
-- (ORDER BY created_at DESC, id DESC LIMIT 1) with a real index rather than
-- a sequential scan. Narrow, additive; does not replace or duplicate the
-- unique index above (different column set, different purpose).
CREATE INDEX IF NOT EXISTS idx_living_koral_material_change_source_recency
  ON gov.living_koral_material_change (tenant_id, source_entity_type, source_entity_id, created_at DESC, id DESC);
