-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   034_kora_link_schema
-- Feature:     KL-05 — KORA Link v1 — Physical-Digital Bridge Schema
-- Author:      KORA Foundation Light · 2026-06-30
-- Amended:     KL-16 — Engineering provisional amendments · 2026-07-01
-- Reviewed:    KL-19 — Gate 2 technical review closure · 2026-07-04
-- Amended:     KORA-LINK-S3B — corrected stale RLS-035-K aggregate-view
--              wording (superseded by 036's fn_company_link_status_aggregate
--              RPC); comment-only, no schema/logic change · 2026-07-12
-- Ratified:    KORA-LINK-DPO-DECISIONS-09 — titolare approved all 4 genuine
--              Gate 3 (DPO) blockers · 2026-07-16. Changes: request_fingerprint
--              column removed (deemed unnecessary — existing controls
--              sufficient, see docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 2);
--              kora_link.link_consents renamed to
--              kora_link.link_activation_acknowledgements — consent_version →
--              activation_notice_version, accepted_at → acknowledged_at,
--              withdrawn_at → deactivated_at, status values 'accepted'/
--              'withdrawn' → 'acknowledged'/'deactivated' (terminology
--              alignment: this is a voluntary activation acknowledgement, not
--              GDPR Art. 6(1)(a) consent — see docs/KORA_LINK_DPO_DECISIONS_09.md
--              §5 and BLOCCO 3); link_delivery_records.delivered_to_label
--              replaced by a structured delivery_channel enum (BLOCCO 5);
--              category-based audit_log retention documented (BLOCCO 1).
--              Legal basis: Art. 6(1)(f) legitimate interest (primary), not
--              consent. Gate 3 is NOT fully closed by this ratification —
--              remaining items (DPIA prudential recommendation, worker
--              self-service deactivation RPC, Gate 4 RLS) are tracked in
--              docs/KORA_LINK_DPO_DECISIONS_09.md §9/§24.
-- Amended:     KORA-LINK-DPO-DECISIONS-09 (terminology cleanup pass) —
--              remaining "consent"-flavored identifiers not covered by the
--              table/column rename above are also renamed, since 034-036
--              have never been applied and have no real consumer:
--              link_events.event_type value 'consent_accepted' →
--              'activation_acknowledged'; residual prose ("explicit
--              consent", "consent, and audit", status-comment wording on
--              links/link_assignments) reworded to "activation
--              acknowledgement" terminology. No schema/logic behavior
--              change — comments and one CHECK-constrained enum literal
--              only · 2026-07-24
-- Gate:        Gate 2 SUBSTANTIVELY CLOSED (engineering) + Gate 3 DPO blockers
--              RATIFIED 2026-07-16 (KORA-LINK-DPO-DECISIONS-09), Gate 3 overall
--              NOT fully closed (see docs/KORA_LINK_DPO_DECISIONS_09.md)
--              — PROPOSED, NOT APPLIED TO ANY DATABASE.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: PROPOSED_GATE2_TECHNICALLY_REVIEWED
-- ─────────────────────────────────────────────────────────────────────────────
-- KL-19 closes the ENGINEERING/technical portion of Gate 2 review: every
-- TODO-CTO item that was a pure engineering/architecture tradeoff has been
-- resolved with documented rationale (see §OPEN TODOS below — "RESOLVED BY
-- KL-19"). This is an engineering technical-review pass; a human CTO should
-- still ratify these resolutions before promotion, but no further schema
-- engineering work blocks that ratification. The 4 items that were genuine
-- Gate 3 (DPO/legal) blockers have since been ratified by the titolare —
-- KORA-LINK-DPO-DECISIONS-09, 2026-07-16 — see §OPEN TODOS below
-- ("RESOLVED BY KORA-LINK-DPO-DECISIONS-09").
-- The file remains PROPOSED. Do not promote to supabase/migrations/ until:
--   (1) Human CTO ratifies the KL-19 resolutions below (formality — no open
--       engineering questions remain)
--   (2) [RATIFIED — KORA-LINK-DPO-DECISIONS-09] DPO review of privacy
--       boundary and activation-acknowledgement model — the 4 items that
--       were genuine BLOCKERs are ratified; Gate 3 overall remains open
--       (DPIA prudential recommendation, worker self-service deactivation,
--       Gate 4 RLS) — see docs/KORA_LINK_DPO_DECISIONS_09.md
--   (3) Gate 2 formal sign-off (technical substance complete as of KL-19)
--   (4) Gate 3 closure (legal/privacy for real worker data — remaining items
--       above, not the 4 ratified BLOCKERs)
--
-- DO NOT run `supabase db push`.
-- DO NOT run `supabase migration up`.
-- DO NOT apply to staging or production.
-- DO NOT copy to supabase/migrations/ without CTO + DPO sign-off.
--
-- KL-16 AMENDMENTS APPLIED (internal Engineering provisional)
-- ─────────────────────────────────────────────────────────────────────────────
--   A-01 D-01: No FK on tenant_id/worker_id/partner_id — pattern migration 033.
--              Boundary enforced by RLS 035 + SECURITY DEFINER + app invariants.
--   A-02 D-02: Removed PG15-only constructs (UNIQUE NULLS NOT DISTINCT was in
--              partner_scans, which is now deferred). No PG15 dependency remains.
--   A-03 D-03: partner_scans table DEFERRED to migration 036 (Track A, v1.1+).
--              Eliminates GENERATED ALWAYS AS scan_date and timezone concern.
--   A-04 D-04: pre_activation_expires_at kept. TTL enforcement: app/job-level.
--              No pg_cron in this file.
--   A-05 D-05: audit_log kept. Retention policy: external, DPO-approved (Gate 3).
--   A-06 D-06: public_lookup_attempts REMOVED. Upstash handles rate limiting.
--              No high-volume GDPR table without consumer in v1.
--   A-07 D-07: No key_version column. v1 stable secret policy documented.
--   A-08 D-08: Removed replaced_by_link_id column and deferred self-FK.
--              link_replacements is now the sole source of replacement chain.
--   A-09:      Removed redundant idx_links_token_digest index
--              (UNIQUE constraint already creates the btree index).
--   A-10:      link_delivery_records kept with DPO note on delivered_to_label.
--              [SUPERSEDED — KORA-LINK-DPO-DECISIONS-09] delivered_to_label
--              replaced by a structured delivery_channel enum (see §9 below).
--   A-11:      link_consents clarified as append-only consent events.
--              [SUPERSEDED — KORA-LINK-DPO-DECISIONS-09] table renamed to
--              link_activation_acknowledgements — this is a voluntary
--              activation acknowledgement, not GDPR Art. 6(1)(a) consent
--              (see §4 below and docs/KORA_LINK_DPO_DECISIONS_09.md §5/BLOCCO 3).
--   A-12:      partner_scans deferred to migration 036 (see A-03).
--
-- Table set v1 after amendments: 9 tables (was 11)
--   Removed:  public_lookup_attempts
--   Deferred: partner_scans (→ 036), link_delivery_records (→ 036 if not needed)
--   Core 8:   link_batches, links, link_assignments,
--             link_activation_acknowledgements (KORA-LINK-DPO-DECISIONS-09,
--             renamed from link_consents), link_events, revocations,
--             link_replacements, audit_log
--   Plus:     link_delivery_records (kept for pilot logistics)
--
-- DEPENDENCY
-- ─────────────────────────────────────────────────────────────────────────────
-- Prerequisiti:
--   • set_updated_at() trigger function must exist (migration 001)
--   • kora.kora_role() must exist (migration 006)
--   • kora.tenant_id() must exist (migration 006)
--   • auth.users must exist (Supabase standard)
--   • All prior migrations (001–033) applied
--
-- APPLY ORDER
-- ─────────────────────────────────────────────────────────────────────────────
--   033 → 034 → 035 (RLS)
--   035_kora_link_rls.sql must be applied AFTER this migration.
--   RLS is NOT enabled in this file — see TODO [RLS-035] comments.
--
-- FUTURE MIGRATIONS
-- ─────────────────────────────────────────────────────────────────────────────
--   035_kora_link_rls.sql  — RLS policies, grants, SECURITY DEFINER functions
--                             for public route lookup (fn_kora_link_public_lookup)
--                             and worker activation (fn_kora_link_activate).
--   036_kora_link_partner.sql — partner_scans table + Track A RLS (v1.1+).
--
-- DESIGN DECISIONS (from KL-04 Token Threat Model)
-- ─────────────────────────────────────────────────────────────────────────────
--   • token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)
--   • token_value (cleartext) NEVER stored in this schema — not in any column
--   • token_digest is the only identifier of a token in the DB
--   • UNIQUE(token_digest) enforced at schema level
--   • Token format: kl1_<48 chars base62> — version prefix kl1_
--   • TTL: pre_activation_expires_at = created_at + INTERVAL '180 days'
--   • No TTL post-activation in v1 — only manual revocation
--   • Association token↔worker: server-side only, post login + explicit voluntary activation acknowledgement
--   • Company visibility: aggregate counts only — never individual worker activity
--   • Secret rotation: v1 uses stable secret. No key_version column.
--     Emergency procedure: revoke all tokens + re-issue chips. See KL-16 docs.
--   • FK policy: no FK on tenant_id/worker_id — follows migration 033 pattern.
--     Canonical targets documented in comments. Boundary enforced by 035 RLS.
--
-- ENUM / CHECK CONSTRAINT STYLE NOTE
-- ─────────────────────────────────────────────────────────────────────────────
-- This migration uses text + CHECK constraints, following the repo convention
-- established in migrations 033 and 025. PostgreSQL CREATE TYPE ENUM is NOT
-- used. Text + CHECK provides easier ALTER (no DROP TYPE cascade), simpler
-- migration, and identical query performance for this cardinality.
--
-- PRIVACY INVARIANTS (constitutional — must never be violated)
-- ─────────────────────────────────────────────────────────────────────────────
--   ✗ No token cleartext column in any table
--   ✗ No raw NFC URL column in any table
--   ✗ No PII in metadata JSONB columns (enforced by application layer)
--   ✗ kora_link.link_assignments must NEVER be visible to company roles via RLS
--   ✗ No automatic KORA Index or IU attribution from link events in this migration
--   ✗ No individual worker activity visible to employer roles (enforced in 035)
--
-- ROLLBACK
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP SCHEMA kora_link CASCADE;
-- This drops all tables, indexes, and constraints defined here.
-- Requires CTO approval. Do not apply rollback without review.
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 0. Schema ─────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS kora_link;

COMMENT ON SCHEMA kora_link IS
  'KL-05 — KORA Link physical-digital bridge schema. '
  'Isolated schema for NFC chip lifecycle, token digest storage, worker activation, '
  'activation acknowledgement, and audit. '
  'partner_scans deferred to migration 036. '
  'RLS policies and SECURITY DEFINER functions are in 035_kora_link_rls.sql. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied to any database.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. kora_link.link_batches
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- A batch is an administrative grouping of NFC chips generated in a single
-- operation by KORA_ADMIN for a specific tenant. The batch tracks:
--   • how many chips were produced
--   • which tenant they were assigned to
--   • operational lifecycle state
--
-- PRIVACY NOTE
-- Batch records are KORA_ADMIN visible. Company sees only aggregate counts.
-- No individual worker data is ever stored in a batch record.

CREATE TABLE IF NOT EXISTS kora_link.link_batches (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant this batch was assigned to. Nullable: batch may be created before
  -- tenant assignment (e.g., pre-produced stock). Tenant isolation enforced by RLS (035).
  -- FK POLICY (A-01/D-01): intentionally no FK in v1 (pattern: migration 033).
  -- Canonical target: analytics.tenant(id). FK deferred until schema confirmed stable.
  -- Boundary: RLS 035 WHERE tenant_id = kora.tenant_id().
  tenant_id           uuid          NULL,

  -- Human-readable batch identifier for admin operations (e.g., "B2026-07-001").
  -- Unique to allow lookup by batch_code without scanning by UUID.
  batch_code          text          NOT NULL UNIQUE,

  -- Optional label for admin reference (e.g., "Pilot batch — Acme Corp July 2026").
  label               text          NULL,

  -- Number of chips/tokens in this batch. Must be positive.
  quantity            integer       NOT NULL CHECK (quantity > 0),

  -- Lifecycle state of the batch.
  -- Values: created | assigned_to_tenant | in_production | delivered | closed | cancelled
  status              text          NOT NULL DEFAULT 'created'
                                    CHECK (status IN (
                                      'created',           -- batch generated, not yet assigned
                                      'assigned_to_tenant', -- tenant assigned, chips in production
                                      'in_production',     -- chips being manufactured
                                      'delivered',         -- chips physically delivered to tenant
                                      'closed',            -- all chips activated or accounted for
                                      'cancelled'          -- batch cancelled before delivery
                                    )),

  -- Admin who created the batch. Nullable for system-generated batches.
  -- REFERENCES auth.users: FK to Supabase auth — safe to reference.
  created_by          uuid          NULL REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  -- Free-text notes for admin reference. Never surfaced to company or worker UI.
  notes               text          NULL
);

CREATE TRIGGER trg_link_batches_updated_at
  BEFORE UPDATE ON kora_link.link_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_link_batches_tenant_id
  ON kora_link.link_batches (tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_link_batches_status
  ON kora_link.link_batches (status);

COMMENT ON TABLE kora_link.link_batches IS
  'KL-05 — Administrative batch of NFC chips generated by KORA_ADMIN. '
  'Company sees only aggregate counts (via 035 view). '
  'PRIVACY: no worker data stored here. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied.';

COMMENT ON COLUMN kora_link.link_batches.tenant_id IS
  'Tenant this batch was assigned to. Nullable for pre-produced stock. '
  'FK POLICY (D-01): no FK in v1 — pattern migration 033. '
  'Canonical target: analytics.tenant(id). Enforced by RLS 035.';

COMMENT ON COLUMN kora_link.link_batches.quantity IS
  'Number of chips produced in this batch. Immutable after creation.';

COMMENT ON COLUMN kora_link.link_batches.notes IS
  'Internal admin notes. NEVER surfaced to company or worker UI.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. kora_link.links
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Core token record. One row per physical NFC chip. Stores only the
-- HMAC-SHA256 digest of the token — the cleartext is NEVER stored here.
--
-- TOKEN MODEL (from KL-04 Token Threat Model §5)
--   token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)
--   token_version = 1 corresponds to kl1_ prefix tokens (48 char base62)
--   UNIQUE(token_digest) is the primary lookup key for the public route
--
-- SECRET ROTATION POLICY (D-07/A-07)
--   v1 uses a stable KORA_LINK_TOKEN_SECRET throughout the pilot lifecycle.
--   No key_version column. No rotation in ordinary operations.
--   Emergency procedure: revoke all tokens + re-issue chips.
--   See docs/KORA_LINK_034_ENGINEERING_DECISION_RECORD.md §D-07.
--
-- REPLACEMENT CHAIN (A-08/D-08)
--   The replacement chain (old token → new token) is tracked exclusively
--   via kora_link.link_replacements. No self-FK on this table.
--   This avoids DEFERRABLE FK and Supabase pooler concerns.
--
-- PRIVACY NOTE
-- This table is NEVER directly accessible to company roles.
-- Company sees only aggregate counts via a view in 035.
-- Worker activation creates a record in kora_link.link_assignments (table 3),
-- which is also company-invisible via RLS.

CREATE TABLE IF NOT EXISTS kora_link.links (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Batch this token belongs to.
  batch_id                    uuid          NOT NULL
                                            REFERENCES kora_link.link_batches (id)
                                            ON DELETE RESTRICT,

  -- Tenant this token is assigned to (copied from batch at generation time).
  -- Denormalized for query performance and RLS. Nullable if batch has no tenant yet.
  -- FK POLICY (A-01/D-01): intentionally no FK in v1 (pattern: migration 033).
  -- Canonical target: analytics.tenant(id). Enforced by RLS 035 + SECURITY DEFINER.
  tenant_id                   uuid          NULL,

  -- HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET) — 64-char hex string.
  -- This is the ONLY token identifier stored in the DB.
  -- token_value (cleartext) is NEVER stored here.
  -- token_value is NEVER logged.
  -- Lookup: SELECT * FROM kora_link.links WHERE token_digest = $computed_digest
  -- SECRET POLICY (D-07): v1 stable secret. No key_version. See header §Secret Rotation.
  token_digest                text          NOT NULL
                                            CHECK (length(token_digest) = 64),

  -- Token format version. v1 = kl1_ prefix + 48 char base62.
  -- Allows future hash algorithm migration without invalidating existing tokens.
  token_version               integer       NOT NULL DEFAULT 1
                                            CHECK (token_version > 0),

  -- Token lifecycle state.
  -- See KL-04 §6 for full state machine and transitions.
  status                      text          NOT NULL DEFAULT 'generated'
                                            CHECK (status IN (
                                              'generated',          -- token created, chip not yet in production
                                              'assigned_to_tenant', -- tenant assigned, chip in production
                                              'delivered',          -- chip physically handed to company
                                              'activation_pending', -- worker scanning, activation notice not yet acknowledged
                                              'active',             -- worker activated + activation notice acknowledged
                                              'suspended',          -- temporarily disabled by KORA_ADMIN
                                              'revoked',            -- permanently invalidated (lost/stolen/offboarding)
                                              'replaced',           -- superseded by a new token (see link_replacements)
                                              'expired',            -- pre_activation_expires_at passed without activation
                                              'orphaned'            -- tenant deactivated; no worker can activate
                                            )),

  -- TTL for unactivated tokens. Tokens not activated by this date auto-expire.
  -- Application: set to created_at + INTERVAL '180 days' at generation time.
  -- NULL = no TTL (edge case for pre-existing tokens migrated to this schema).
  -- Post-activation TTL: NOT implemented in v1 — revoke manually for offboarding.
  -- TTL ENFORCEMENT (D-04/A-04): app-layer check in route + fn_kora_link_public_lookup.
  -- Batch expiry job (pg_cron or Edge Function) deferred to post-Gate-3.
  -- Aggregate views in 035 must filter on this field alongside status.
  pre_activation_expires_at   timestamptz   NULL,

  -- Populated when status transitions to 'active'.
  activated_at                timestamptz   NULL,

  -- Populated when status transitions to 'revoked' or 'replaced'.
  revoked_at                  timestamptz   NULL,

  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  -- CONSTITUTIONAL: no token_value column — never store cleartext.
  -- CONSTITUTIONAL: no nfc_url column — the URL is computed from token_value externally.
  -- A-08/D-08: no replaced_by_link_id column — replacement chain via link_replacements.

  CONSTRAINT uq_link_token_digest UNIQUE (token_digest)
);

CREATE TRIGGER trg_links_updated_at
  BEFORE UPDATE ON kora_link.links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PRIMARY LOOKUP INDEX: UNIQUE constraint above already creates a btree index.
-- A-09: removed redundant explicit idx_links_token_digest (UNIQUE is sufficient).

CREATE INDEX IF NOT EXISTS idx_links_status
  ON kora_link.links (status);

CREATE INDEX IF NOT EXISTS idx_links_tenant_id
  ON kora_link.links (tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_links_batch_id
  ON kora_link.links (batch_id);

-- Partial index: active tokens by tenant — used by aggregate count queries for company.
CREATE INDEX IF NOT EXISTS idx_links_tenant_active
  ON kora_link.links (tenant_id, status)
  WHERE status = 'active';

COMMENT ON TABLE kora_link.links IS
  'KL-05 — Core KORA Link token record. One row per NFC chip. '
  'Stores HMAC-SHA256 digest only — cleartext token NEVER stored. '
  'UNIQUE(token_digest) is the primary lookup for the public route. '
  'PRIVACY: NEVER directly accessible to company roles (RLS in 035). '
  'A-08: no self-FK; replacement chain via link_replacements. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied.';

COMMENT ON COLUMN kora_link.links.token_digest IS
  'HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET) — 64-char hex. '
  'The ONLY token identifier stored in the DB. '
  'Cleartext token_value: NEVER stored, NEVER logged. '
  'v1 stable secret policy: no key_version. See docs/KORA_LINK_034_ENGINEERING_DECISION_RECORD.md §D-07.';

COMMENT ON COLUMN kora_link.links.token_version IS
  'Token format version: 1 = kl1_ prefix + 48 char base62. '
  'Increment when hash algorithm or format changes to allow dual-digest migration.';

COMMENT ON COLUMN kora_link.links.pre_activation_expires_at IS
  'TTL for unactivated tokens. Set to created_at + 180 days at generation. '
  'Post-activation TTL: NOT implemented v1. Revoke manually for offboarding. '
  'Enforcement: app-layer (route + fn_kora_link_public_lookup in 035). No pg_cron in 034.';

COMMENT ON COLUMN kora_link.links.tenant_id IS
  'Denormalized tenant for query performance and RLS. '
  'FK POLICY (D-01): no FK in v1 — pattern migration 033. '
  'Canonical target: analytics.tenant(id). Enforced by RLS 035 + SECURITY DEFINER.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. kora_link.link_assignments
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Server-side association between a token and a worker, created ONLY after:
--   (1) Worker has an active session (authenticated)
--   (2) Worker's tenant matches the token's batch tenant
--   (3) Worker has acknowledged the KORA Link activation notice
--       (link_activation_acknowledgements record — KORA-LINK-DPO-DECISIONS-09)
--
-- PRIVACY INVARIANT — NEVER RELAX
-- This table is the most sensitive in the schema.
-- It directly maps token_digest → worker identity.
-- Company roles MUST NEVER see this table via any query path.
-- RLS (035) enforces: SELECT only for kora_admin OR worker self (worker_id = current_worker).
--
-- One token has at most one active assignment (UNIQUE partial index enforces this).

CREATE TABLE IF NOT EXISTS kora_link.link_assignments (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token being assigned. One active assignment per token enforced below.
  link_id               uuid          NOT NULL
                                      REFERENCES kora_link.links (id)
                                      ON DELETE RESTRICT,

  -- Tenant of the worker. Must match the token's tenant_id (validated by SECURITY DEFINER).
  -- FK POLICY (A-01/D-01): no FK in v1. Enforced by fn_kora_link_activate in 035.
  tenant_id             uuid          NOT NULL,

  -- Worker identity. FK POLICY (A-01/D-01): no FK in v1 (pattern: migration 033).
  -- Canonical target: personal.worker_identity(id).
  -- Enforced by fn_kora_link_activate: validates worker exists in tenant before INSERT.
  worker_id             uuid          NOT NULL,

  -- Assignment lifecycle state.
  status                text          NOT NULL DEFAULT 'pending'
                                      CHECK (status IN (
                                        'pending',   -- activation started, notice not yet acknowledged
                                        'active',    -- fully activated — worker can use the link
                                        'revoked',   -- worker or admin revoked the assignment
                                        'replaced',  -- assignment ended due to token replacement
                                        'ended'      -- worker offboarded or account closed
                                      )),

  -- Timestamp when status first became 'active'.
  assigned_at           timestamptz   NULL,

  -- Timestamp when assignment ended (revoked/replaced/ended).
  ended_at              timestamptz   NULL,

  -- Reason for ending the assignment (populated when status IN (revoked, replaced, ended)).
  revocation_reason     text          NULL
                                      CHECK (revocation_reason IS NULL OR revocation_reason IN (
                                        'lost',
                                        'stolen',
                                        'worker_request',
                                        'company_request',
                                        'security',
                                        'turnover',
                                        'replacement',
                                        'expired',
                                        'other'
                                      )),

  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_link_assignments_updated_at
  BEFORE UPDATE ON kora_link.link_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_assignments_link_id
  ON kora_link.link_assignments (link_id);

CREATE INDEX IF NOT EXISTS idx_assignments_worker_id
  ON kora_link.link_assignments (worker_id);

-- CRITICAL: one active assignment per token.
-- Prevents two workers from simultaneously holding the same link as 'active'.
CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_link_active
  ON kora_link.link_assignments (link_id)
  WHERE status = 'active';

COMMENT ON TABLE kora_link.link_assignments IS
  'KL-05 — Server-side token↔worker association. '
  'Created ONLY after: authenticated worker session + tenant match + explicit activation acknowledgement. '
  'PRIVACY INVARIANT: NEVER accessible to company roles via any RLS path. '
  'RLS (035): SELECT only for kora_admin OR worker self. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied.';

COMMENT ON COLUMN kora_link.link_assignments.worker_id IS
  'Worker identity. FK POLICY (D-01): no FK in v1 — pattern migration 033. '
  'Canonical target: personal.worker_identity(id). '
  'Validated by fn_kora_link_activate (035) before INSERT.';

COMMENT ON COLUMN kora_link.link_assignments.tenant_id IS
  'Must match kora_link.links.tenant_id. Validated by activation function (035 SECDEF).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. kora_link.link_activation_acknowledgements
-- ═══════════════════════════════════════════════════════════════════════════════
-- [RENAMED — KORA-LINK-DPO-DECISIONS-09, 2026-07-16] Formerly
-- kora_link.link_consents. Terminology alignment, not a behavior change: the
-- titolare ratified that this table records a voluntary confirmation of
-- having read the KORA Link activation notice, NOT GDPR Art. 6(1)(a) consent
-- (which the platform already does not use as a general/residual legal basis
-- — see lib/legal/privacy-content.ts §5). Legal basis for the underlying
-- treatments is Art. 6(1)(f) legitimate interest. See
-- docs/KORA_LINK_DPO_DECISIONS_09.md §5 and BLOCCO 3.
--
-- PURPOSE
-- Records the worker's explicit acknowledgement of the KORA Link activation
-- notice. An acknowledgement record must exist (status = 'acknowledged')
-- before link_assignments can be created. Deactivation ends the assignment.
--
-- APPEND-ONLY SEMANTICS (A-11)
-- Acknowledgement records are append-only events. Each state transition
-- (pending → acknowledged, acknowledged → deactivated, etc.) should be
-- modeled as a new record in a future v2 event-sourced design. In v1, a
-- single mutable record per (worker, link, activation_notice_version) is
-- used for simplicity, with acknowledged_at and deactivated_at capturing the
-- key timestamps. The UNIQUE constraint prevents duplicate records for the
-- same combination.
--
-- GDPR NOTE [RESOLVED — KORA-LINK-DPO-DECISIONS-09]
-- activation_notice_version must reference the exact version of the
-- activation notice shown to the worker. Canonical value ratified:
-- 'kora-link-activation-notice-v1.0' (docs/KORA_LINK_DPO_DECISIONS_09.md
-- BLOCCO 4). Retention: durata dell'assegnazione attiva + 24 mesi dopo la
-- cessazione (docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 1, categoria 5/7).
-- Retention enforcement job is not implemented by this schema — see
-- audit_log RETENTION POLICY note below for the same caveat.

CREATE TABLE IF NOT EXISTS kora_link.link_activation_acknowledgements (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token this acknowledgement relates to.
  link_id             uuid          NOT NULL
                                    REFERENCES kora_link.links (id)
                                    ON DELETE RESTRICT,

  -- The assignment created as a result of this acknowledgement. Nullable until assignment committed.
  assignment_id       uuid          NULL
                                    REFERENCES kora_link.link_assignments (id)
                                    ON DELETE SET NULL,

  -- Tenant of the acknowledging worker.
  tenant_id           uuid          NOT NULL,

  -- Worker who acknowledged or deactivated.
  -- FK POLICY (A-01/D-01): no FK in v1. Enforced by fn_kora_link_activate (035).
  -- Canonical target: personal.worker_identity(id).
  worker_id           uuid          NOT NULL,

  -- Version identifier of the activation notice shown to the worker.
  -- Must match a known, DPO-ratified version string
  -- (ratified: "kora-link-activation-notice-v1.0").
  activation_notice_version  text   NOT NULL CHECK (length(activation_notice_version) > 0),

  -- Acknowledgement lifecycle.
  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN (
                                      'pending',       -- worker initiated activation, notice not yet acknowledged
                                      'acknowledged',  -- worker acknowledged — assignment can proceed
                                      'deactivated',   -- worker deactivated — assignment revoked
                                      'superseded'     -- superseded by a newer notice version (re-acknowledgement flow)
                                    )),

  acknowledged_at     timestamptz   NULL,
  deactivated_at      timestamptz   NULL,

  created_at          timestamptz   NOT NULL DEFAULT now(),

  -- One acknowledgement record per (worker, link, version) to prevent duplicates.
  -- In v1: single mutable record per combination. v2: append-only event log.
  CONSTRAINT uq_link_activation_ack UNIQUE (worker_id, link_id, activation_notice_version)
);

CREATE INDEX IF NOT EXISTS idx_activation_acks_link_id
  ON kora_link.link_activation_acknowledgements (link_id);

CREATE INDEX IF NOT EXISTS idx_activation_acks_worker_id
  ON kora_link.link_activation_acknowledgements (worker_id);

COMMENT ON TABLE kora_link.link_activation_acknowledgements IS
  'KL-05 — Worker acknowledgement of the KORA Link activation notice. '
  'Renamed from link_consents by KORA-LINK-DPO-DECISIONS-09 (2026-07-16): this '
  'is a voluntary activation acknowledgement, NOT GDPR Art. 6(1)(a) consent. '
  'Legal basis for the underlying treatment: Art. 6(1)(f) legitimate interest. '
  'Required before link_assignments can be created. '
  'A-11: v1 uses single mutable record per (worker,link,version); v2 target: append-only events. '
  'activation_notice_version ratified value: kora-link-activation-notice-v1.0. '
  'Retention: active assignment duration + 24 months post-cessation (see '
  'docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 1) — enforcement job not yet implemented. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed, KORA-LINK-DPO-DECISIONS-09 ratified. '
  'Gate 2 substantively closed (engineering); Gate 3 (DPO) overall still open (DPIA, Gate 4). NOT applied.';

COMMENT ON COLUMN kora_link.link_activation_acknowledgements.activation_notice_version IS
  'Version string of the activation notice shown to the worker. '
  'Ratified canonical value (KORA-LINK-DPO-DECISIONS-09): kora-link-activation-notice-v1.0. '
  'Immutable once published — any substantive text change requires a new version string, never a silent edit.';

COMMENT ON COLUMN kora_link.link_activation_acknowledgements.worker_id IS
  'FK POLICY (D-01): no FK in v1 — canonical target: personal.worker_identity(id). '
  'Enforced by fn_kora_link_activate (035).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. kora_link.link_events
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Operational event log for KORA Link lifecycle. Records technical/operational
-- events (batch created, token generated, activation attempted, quick access, etc.)
-- NOT an Impact Unit source — no scoring in v1.
--
-- PRIVACY NOTE
-- worker_id is nullable — some events (batch_created, token_generated) have no
-- associated worker. For scan events post-activation, worker_id is populated.
-- metadata JSONB must NEVER contain: token cleartext, full NFC URL, PII not
-- strictly required for the event type.
-- Company roles: NEVER see individual rows. Aggregate counts only via 035 view.

CREATE TABLE IF NOT EXISTS kora_link.link_events (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token involved. Nullable for batch-level events (e.g., batch_created).
  link_id         uuid          NULL
                                REFERENCES kora_link.links (id)
                                ON DELETE SET NULL,

  -- Tenant context. Nullable for system events.
  tenant_id       uuid          NULL,

  -- Worker involved. Nullable for admin/system events.
  -- FK POLICY (A-01/D-01): no FK in v1. Canonical target: personal.worker_identity(id).
  worker_id       uuid          NULL,

  -- Event type — what happened.
  event_type      text          NOT NULL
                                CHECK (event_type IN (
                                  'batch_created',
                                  'token_generated',
                                  'assigned_to_tenant',
                                  'delivered_to_company',
                                  'activation_attempted',
                                  'activation_completed',
                                  'activation_acknowledged',
                                  'quick_access',
                                  'revoked',
                                  'replaced',
                                  'suspended',
                                  'expired',
                                  'admin_override'
                                )),

  -- Context of the scan/event, if applicable.
  scan_context    text          NULL
                                CHECK (scan_context IS NULL OR scan_context IN (
                                  'quick_access',
                                  'activation',
                                  'initiative',
                                  'admin_test'
                                )),

  -- Who performed the action.
  actor_type      text          NOT NULL
                                CHECK (actor_type IN (
                                  'kora_admin',
                                  'company_admin',
                                  'worker',
                                  'system'
                                )),

  -- Actor UUID (admin user, worker). Nullable for system events.
  actor_id        uuid          NULL,

  -- Result category (e.g., 'ok', 'not_found', 'forbidden', 'error').
  result          text          NULL,

  -- Structured metadata. Must NOT contain: token cleartext, full NFC URL, PII beyond minimum.
  -- Keys should be: event_category, result_category, rate_limit_bucket, request_id.
  -- NEVER set token_value or full_url keys.
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,

  created_at      timestamptz   NOT NULL DEFAULT now()

  -- NO updated_at — this is an append-only log table.
);

CREATE INDEX IF NOT EXISTS idx_link_events_link_id_created
  ON kora_link.link_events (link_id, created_at DESC)
  WHERE link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_link_events_tenant_created
  ON kora_link.link_events (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_link_events_worker_created
  ON kora_link.link_events (worker_id, created_at DESC)
  WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_link_events_event_type
  ON kora_link.link_events (event_type);

COMMENT ON TABLE kora_link.link_events IS
  'KL-05 — Operational event log for KORA Link lifecycle. Append-only. '
  'NOT an IU/PIB/Index source — no scoring. '
  'PRIVACY: company NEVER sees individual rows. Aggregate counts via 035 view only. '
  'metadata JSONB: NEVER store token cleartext, full NFC URL, or unnecessary PII. '
  'A-03: partner scan events deferred to migration 036 (partner scan context removed). '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied.';

COMMENT ON COLUMN kora_link.link_events.metadata IS
  'Structured event metadata. '
  'PROHIBITED keys: token_value, nfc_url, full_token, worker_name, worker_email. '
  'Allowed keys: event_category, result_category, rate_limit_bucket, request_id.';

COMMENT ON COLUMN kora_link.link_events.worker_id IS
  'FK POLICY (D-01): no FK in v1. Canonical target: personal.worker_identity(id).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. kora_link.revocations
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Explicit revocation/suspension record for a token.
-- Created when a token is revoked, suspended, or a replacement is initiated.
-- Append-only: each revocation event is a separate row (audit trail).
-- The token's status in kora_link.links is the authoritative current state;
-- this table provides the immutable audit trail of revocation events.

CREATE TABLE IF NOT EXISTS kora_link.revocations (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token being revoked.
  link_id                 uuid          NOT NULL
                                        REFERENCES kora_link.links (id)
                                        ON DELETE RESTRICT,

  -- Tenant context. Nullable for cross-tenant admin operations.
  tenant_id               uuid          NULL,

  -- Worker whose assignment is affected. Nullable if token was never activated.
  -- FK POLICY (A-01/D-01): no FK in v1. Canonical target: personal.worker_identity(id).
  worker_id               uuid          NULL,

  -- Why the token was revoked.
  reason                  text          NOT NULL
                                        CHECK (reason IN (
                                          'lost',
                                          'stolen',
                                          'worker_request',
                                          'company_request',
                                          'security',
                                          'turnover',
                                          'replacement',
                                          'expired',
                                          'other'
                                        )),

  -- Optional free-text detail. Required when reason = 'other' or actor_type = 'kora_admin'
  -- with admin_override events (enforced at application layer, not DB constraint).
  details                 text          NULL,

  -- Who performed the revocation.
  revoked_by_actor_type   text          NOT NULL
                                        CHECK (revoked_by_actor_type IN (
                                          'kora_admin',
                                          'company_admin',
                                          'worker',
                                          'system'
                                        )),

  -- UUID of the actor. Nullable for system-triggered revocations.
  revoked_by_actor_id     uuid          NULL,

  -- If this revocation is part of a replacement, link to the new token.
  replacement_link_id     uuid          NULL
                                        REFERENCES kora_link.links (id)
                                        ON DELETE SET NULL,

  revoked_at              timestamptz   NOT NULL DEFAULT now(),

  created_at              timestamptz   NOT NULL DEFAULT now()

  -- NO updated_at — append-only.
);

CREATE INDEX IF NOT EXISTS idx_revocations_link_id
  ON kora_link.revocations (link_id);

CREATE INDEX IF NOT EXISTS idx_revocations_tenant_id
  ON kora_link.revocations (tenant_id)
  WHERE tenant_id IS NOT NULL;

COMMENT ON TABLE kora_link.revocations IS
  'KL-05 — Immutable revocation/suspension audit trail for KORA Link tokens. '
  'Append-only: each event is a new row. '
  'Authoritative current state is kora_link.links.status. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied.';

COMMENT ON COLUMN kora_link.revocations.details IS
  'Free-text detail. Required for admin_override actor_type and reason=other. '
  'Enforced at application layer. Must not contain token cleartext.';

COMMENT ON COLUMN kora_link.revocations.worker_id IS
  'FK POLICY (D-01): no FK in v1. Canonical target: personal.worker_identity(id).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. kora_link.link_replacements
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Records the replacement chain: old token → new token.
-- When a chip is lost/damaged/stolen, a new token is issued.
-- The old token's link_id is marked 'replaced'; the new token's link_id
-- may be pre-activated (if the worker already had an active assignment)
-- or starts fresh.
-- UNIQUE(old_link_id): one replacement record per old token (one successor at a time).
--
-- REPLACEMENT CHAIN (A-08/D-08)
-- This table is the SOLE SOURCE of the replacement chain in v1.
-- There is no replaced_by_link_id column on kora_link.links.
-- To navigate the replacement chain: JOIN link_replacements ON old_link_id = links.id.

CREATE TABLE IF NOT EXISTS kora_link.link_replacements (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token being replaced (must be in status 'revoked' or 'replaced').
  old_link_id               uuid          NOT NULL
                                          REFERENCES kora_link.links (id)
                                          ON DELETE RESTRICT,

  -- The new token issued as replacement.
  new_link_id               uuid          NOT NULL
                                          REFERENCES kora_link.links (id)
                                          ON DELETE RESTRICT,

  -- Tenant context.
  tenant_id                 uuid          NULL,

  -- Worker whose assignment is being migrated. Nullable if token was never activated.
  -- FK POLICY (A-01/D-01): no FK in v1. Canonical target: personal.worker_identity(id).
  worker_id                 uuid          NULL,

  -- Why the replacement was requested.
  reason                    text          NOT NULL
                                          CHECK (reason IN (
                                            'lost',
                                            'stolen',
                                            'worker_request',
                                            'company_request',
                                            'security',
                                            'turnover',
                                            'replacement',
                                            'expired',
                                            'other'
                                          )),

  -- Who initiated the replacement.
  created_by_actor_type     text          NOT NULL
                                          CHECK (created_by_actor_type IN (
                                            'kora_admin',
                                            'company_admin',
                                            'worker',
                                            'system'
                                          )),

  created_by_actor_id       uuid          NULL,

  created_at                timestamptz   NOT NULL DEFAULT now(),

  -- A token can only be replaced once (one canonical successor).
  CONSTRAINT uq_replacement_old_link UNIQUE (old_link_id),

  -- A token cannot replace itself.
  CONSTRAINT chk_replacement_distinct CHECK (old_link_id <> new_link_id)
);

CREATE INDEX IF NOT EXISTS idx_replacements_old_link_id
  ON kora_link.link_replacements (old_link_id);

CREATE INDEX IF NOT EXISTS idx_replacements_new_link_id
  ON kora_link.link_replacements (new_link_id);

COMMENT ON TABLE kora_link.link_replacements IS
  'KL-05 — Token replacement chain. One record per replaced token. '
  'A-08: SOLE SOURCE of replacement chain in v1. No self-FK on kora_link.links. '
  'old_link_id UNIQUE: one canonical successor per replaced token. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed. Gate 2 substantively closed (engineering); Gate 3 (DPO) open. NOT applied.';

COMMENT ON COLUMN kora_link.link_replacements.worker_id IS
  'FK POLICY (D-01): no FK in v1. Canonical target: personal.worker_identity(id).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTE: partner_scans TABLE DEFERRED (A-03/A-12/D-02/D-03)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- partner_scans is deferred to migration 036 (Track A / partner scan, v1.1+).
-- Deferral eliminates the following v1 concerns:
--   - UNIQUE NULLS NOT DISTINCT (PostgreSQL 15+ only — A-02/D-02)
--   - GENERATED ALWAYS AS scan_date (timezone UTC behavior — A-03/D-03)
--   - FK-034-7: partner_id → partner.profile(id) (schema not yet stable)
--   - RLS-035-I: PARTNER role policy in 035 (complexity deferred)
-- partner_scans will be introduced in 036_kora_link_partner.sql when:
--   - Track A scope is formally approved
--   - PostgreSQL version of target instance confirmed ≥ 15
--   - partner schema FK targets confirmed stable
--   - DPO approves partner scan privacy model


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. kora_link.audit_log
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Privacy-safe, append-only audit trail for all significant KORA Link events.
-- Intended for: KORA_ADMIN governance, DPO audit, security review, break-glass log.
--
-- DESIGN
--   • actor_id is stored as-is (UUID) — application layer is responsible for
--     minimizing what is logged (avoid logging UUIDs that are unnecessary)
--   • token_digest_prefix: first 8 chars of token_digest for correlation, not lookup
--   • metadata JSONB: structured audit data — no PII beyond minimum necessary
--   • Append-only enforced by RLS INSERT-only policy in 035
--
-- RETENTION POLICY [RATIFIED — KORA-LINK-DPO-DECISIONS-09] (A-05/D-05)
-- Category-based retention ratified by the titolare
-- (docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 1) — NOT a single duration:
--   • Security/anomaly events (ADMIN_OVERRIDE, BREAK_GLASS_ACCESS, forbidden/failed): 12 months
--   • Creation events (BATCH_CREATED, TOKEN_GENERATED): 24 months
--   • Delivery events: 12 months from delivery
--   • Activation/rejection/revocation/replacement events: active assignment
--     duration + 24 months post-cessation
--   • Expiry events (never-activated chip): 6 months
-- Mechanism: Supabase Edge Function scheduled (not pg_cron — avoids an extra
-- Postgres extension for a pilot-scale table). Enforcement job is NOT
-- implemented by this schema — see docs/KORA_LINK_DPO_DECISIONS_09.md §26
-- for the pre-staging plan. INSERT-only enforced by RLS (035). No UPDATE,
-- no DELETE policy in this file.
--
-- request_fingerprint [REMOVED — KORA-LINK-DPO-DECISIONS-09]
-- The column previously specified here (nullable hash of IP+user-agent,
-- never populated) has been removed. The necessity test in
-- docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 2 found the existing controls
-- (HMAC token space, Upstash rate limiting, TTL, origin guard, mandatory
-- authentication, uniform not-found/unusable response) sufficient for a
-- pilot of this scale — the same rationale A-06/D-06 already applied to
-- removing public_lookup_attempts. If a future need for device-level
-- anomaly detection emerges, introduce it as a NEW migration with: HMAC +
-- server-side secret (never a naive hash), explicit tenant/purpose scope, key
-- rotation, retention capped at the security category (12 months), and no
-- application-facing exposure to any role.

CREATE TABLE IF NOT EXISTS kora_link.audit_log (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token involved. Nullable for batch-level events.
  link_id                 uuid          NULL,  -- no FK: audit log must survive token deletion

  -- Tenant context. Nullable for system/admin events.
  tenant_id               uuid          NULL,

  -- Who performed the action.
  actor_type              text          NOT NULL
                                        CHECK (actor_type IN (
                                          'kora_admin',
                                          'company_admin',
                                          'worker',
                                          'system'
                                        )),

  -- Actor UUID. May be NULL for system events.
  -- MINIMIZATION: only log if needed for audit purpose (not every event requires actor_id).
  actor_id                uuid          NULL,

  -- Audit action description (enum-like text).
  -- Suggested values: BATCH_CREATED, TOKEN_GENERATED, ACTIVATION_ATTEMPTED,
  --   ACTIVATION_COMPLETED, ACTIVATION_ACKNOWLEDGED, ACTIVATION_DEACTIVATED,
  --   TOKEN_REVOKED, TOKEN_SUSPENDED, TOKEN_REPLACED, QUICK_ACCESS,
  --   BREAK_GLASS_ACCESS, ADMIN_OVERRIDE.
  action                  text          NOT NULL CHECK (length(action) > 0),

  -- Outcome category. E.g., 'ok', 'failed', 'not_found', 'forbidden'.
  result                  text          NULL,

  -- First 8 chars of token_digest for correlation. NOT the full digest.
  -- Useful for correlating audit events without storing full lookup key.
  token_digest_prefix     text          NULL
                                        CHECK (token_digest_prefix IS NULL OR length(token_digest_prefix) = 8),

  -- Structured audit metadata. No PII beyond minimum necessary.
  -- PROHIBITED: token_value, full token_digest, worker_name, worker_email.
  metadata                jsonb         NOT NULL DEFAULT '{}'::jsonb,

  created_at              timestamptz   NOT NULL DEFAULT now()

  -- NO updated_at — append-only. INSERT-only RLS in 035.
  -- NO FK on link_id: audit log must survive token deletion (retains historical record).
);

CREATE INDEX IF NOT EXISTS idx_audit_log_link_id_created
  ON kora_link.audit_log (link_id, created_at DESC)
  WHERE link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
  ON kora_link.audit_log (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON kora_link.audit_log (actor_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON kora_link.audit_log (action);

COMMENT ON TABLE kora_link.audit_log IS
  'KL-05 — Privacy-safe append-only audit trail for KORA Link. '
  'Accessible only to KORA_ADMIN and DPO (via 035 RLS). '
  'A-05/D-05 [RATIFIED KORA-LINK-DPO-DECISIONS-09]: category-based retention '
  '(12/24 months by event category, see table-level note above), not a single '
  'duration. Mechanism: Edge Function, post-Gate-3. No DELETE in 034. '
  'request_fingerprint column REMOVED (KORA-LINK-DPO-DECISIONS-09, BLOCCO 2). '
  'INSERT-only: no UPDATE, no DELETE — enforced by 035 RLS. '
  'No FK on link_id: audit survives token deletion. '
  'KL-16 amended, KL-19 Gate 2 technically reviewed, KORA-LINK-DPO-DECISIONS-09 ratified. '
  'Gate 2 substantively closed (engineering); Gate 3 (DPO) overall still open (DPIA, Gate 4). NOT applied.';

COMMENT ON COLUMN kora_link.audit_log.token_digest_prefix IS
  'First 8 chars of token_digest — correlation only, not a lookup key. '
  'NOT the full digest. Cannot be used to reconstruct the token.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTE: public_lookup_attempts TABLE REMOVED (A-06/D-06)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- public_lookup_attempts has been removed from 034 v1.
-- Rationale:
--   - No consumer in v1: anomaly detection is out of scope
--   - Upstash handles rate limiting operationally (sliding window Redis)
--   - High-volume GDPR-relevant table without utility in v1
--   - audit_log covers significant events; Upstash covers rate limit evidence
-- If anomaly detection is added in a future version, introduce this table in
-- a separate migration (036 or 037) at that time.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. kora_link.link_delivery_records
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Optional record of chip physical delivery from KORA/batch to company,
-- and from company to a team member, WITHOUT associating to a specific worker.
-- Used for: batch fulfillment tracking, company operational reporting.
-- The delivery record uses a structured 'delivery_channel' enum (e.g.
-- 'hr_admin', 'office_reception') instead of a worker identity or free text,
-- to avoid creating an employer-visible token↔worker mapping before the
-- worker has activated and acknowledged the notice.
--
-- DPO NOTE (A-10) [RESOLVED — KORA-LINK-DPO-DECISIONS-09, BLOCCO 5]
-- The free-text 'delivered_to_label' column (unbounded, risked site/role
-- detail re-identifying an individual in a small office) has been replaced
-- by 'delivery_channel', a restricted enum: 'hr_admin' | 'office_reception' |
-- 'site_admin' | 'other'. This eliminates the re-identification risk at the
-- schema level instead of relying on a procedural convention. NEVER a
-- person's name, worker_id, or email — structurally impossible now, since
-- the column only accepts one of 4 fixed values.
-- This column MUST NOT be used to derive a token↔worker association.

CREATE TABLE IF NOT EXISTS kora_link.link_delivery_records (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Batch this delivery is part of. Nullable for single-link deliveries.
  batch_id            uuid          NULL
                                    REFERENCES kora_link.link_batches (id)
                                    ON DELETE SET NULL,

  -- Specific link delivered (for single-chip replacement deliveries).
  link_id             uuid          NULL
                                    REFERENCES kora_link.links (id)
                                    ON DELETE SET NULL,

  -- Tenant receiving the delivery.
  -- FK POLICY (A-01/D-01): no FK in v1. Canonical target: analytics.tenant(id).
  tenant_id           uuid          NOT NULL,

  -- Admin who coordinated the delivery. Nullable for system-generated records.
  delivered_by        uuid          NULL REFERENCES auth.users (id) ON DELETE SET NULL,

  -- Structured, non-identifying delivery channel — restricted enum, not free
  -- text (KORA-LINK-DPO-DECISIONS-09, BLOCCO 5). NEVER a worker name, worker
  -- ID, or email — this record must not create an employer-visible
  -- token↔worker mapping before activation and acknowledgement.
  delivery_channel    text          NULL
                                    CHECK (delivery_channel IS NULL OR delivery_channel IN (
                                      'hr_admin',
                                      'office_reception',
                                      'site_admin',
                                      'other'
                                    )),

  delivered_at        timestamptz   NULL,

  created_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_records_batch_id
  ON kora_link.link_delivery_records (batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_records_tenant_id
  ON kora_link.link_delivery_records (tenant_id);

COMMENT ON TABLE kora_link.link_delivery_records IS
  'KL-05 — Optional chip physical delivery log. '
  'A-10: kept for pilot logistics; defer to 036 if not needed. '
  'delivery_channel is a restricted enum (KORA-LINK-DPO-DECISIONS-09, replacing '
  'the free-text delivered_to_label): NEVER a worker name or ID. '
  'Prevents employer-visible token↔worker mapping before activation + acknowledgement. '
  'Retention: 12 months from delivery (docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 1, categoria 3). '
  'KL-16 amended, KL-19 Gate 2 technically reviewed, KORA-LINK-DPO-DECISIONS-09 ratified. '
  'Gate 2 substantively closed (engineering); Gate 3 (DPO) overall still open (DPIA, Gate 4). NOT applied.';

COMMENT ON COLUMN kora_link.link_delivery_records.delivery_channel IS
  'Restricted enum: hr_admin | office_reception | site_admin | other. '
  'Replaces the free-text delivered_to_label (KORA-LINK-DPO-DECISIONS-09, BLOCCO 5) — '
  'eliminates the re-identification risk structurally, not just procedurally. '
  'NEVER worker name, worker ID, or email — not representable by this column. '
  'This column MUST NOT be used to derive token↔worker association.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS / SECURITY DEFINER / GRANTS — TODO [RLS-035]
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- All RLS policies, grants, and SECURITY DEFINER functions are in:
--   035_kora_link_rls.sql
--
-- This file intentionally does NOT enable RLS or create policies.
-- The following must be implemented in 035 (updated for KL-16 table set):
--
-- [RLS-035-A] Enable RLS on all kora_link.* tables with deny-by-default.
--
-- [RLS-035-B] link_batches:
--   • KORA_ADMIN: SELECT/INSERT/UPDATE
--   • COMPANY_ADMIN: SELECT own tenant via aggregate view (not direct table access)
--   • Others: deny-by-default
--
-- [RLS-035-C] links:
--   • KORA_ADMIN: SELECT/INSERT/UPDATE (full access for admin ops)
--   • Others: NO DIRECT ACCESS — use SECURITY DEFINER fn_kora_link_public_lookup()
--   • Company: view via v_kora_link_batch_stats(tenant_id) aggregate view only
--
-- [RLS-035-D] link_assignments:
--   • KORA_ADMIN: SELECT (full)
--   • WORKER: SELECT WHERE worker_id = kora.current_worker_id() (self only)
--   • COMPANY_ADMIN: NO ACCESS (zero tolerance — constitutional guarantee)
--   • Others: deny-by-default
--
-- [RLS-035-E] link_activation_acknowledgements (renamed from link_consents,
--   KORA-LINK-DPO-DECISIONS-09):
--   • KORA_ADMIN: SELECT
--   • WORKER: SELECT + INSERT WHERE worker_id = kora.current_worker_id()
--   • v1: single mutable record per (worker,link,version); INSERT + UPDATE status
--   • Others: deny-by-default
--
-- [RLS-035-F] link_events:
--   • KORA_ADMIN: SELECT
--   • WORKER: SELECT WHERE worker_id = kora.current_worker_id()
--   • COMPANY_ADMIN: NO individual row access — aggregate counts only
--   • Others: deny-by-default
--
-- [RLS-035-G] revocations:
--   • KORA_ADMIN: SELECT/INSERT
--   • WORKER: INSERT WHERE revoked_by_actor_type = 'worker' AND worker_id = self
--   • Others: deny-by-default
--
-- [RLS-035-H] link_replacements:
--   • KORA_ADMIN: SELECT/INSERT
--   • Others: deny-by-default
--
-- NOTE: partner_scans policy (RLS-035-I) deferred to 036 with partner_scans table.
--
-- [RLS-035-I] audit_log:
--   • KORA_ADMIN: SELECT
--   • Others: INSERT only via SECURITY DEFINER functions — no direct INSERT from app
--   • DPO: read access via break-glass function (documented, audited)
--
-- NOTE: public_lookup_attempts policy removed (table removed A-06).
--
-- [RLS-035-J] link_delivery_records:
--   • KORA_ADMIN: SELECT/INSERT
--   • COMPANY_ADMIN: SELECT WHERE tenant_id = kora.tenant_id()
--   • Others: deny-by-default
--
-- [RLS-035-K] Company aggregate view: HISTORICAL — superseded by KORA-LINK-S3B
--   (2026-07-12). The view sketched below (kora_link.v_batch_stats) was never
--   created. Company aggregate visibility is implemented instead as the
--   SECURITY DEFINER RPC kora_link.fn_company_link_status_aggregate(uuid) in
--   036_kora_link_rpc_functions.sql — tenant-scoped, returns only
--   (status, count) rows, never link_id/worker_id/token_digest. This
--   RPC-not-view sketch is kept only as the original design-rationale record;
--   do not create this view. No company-facing direct table SELECT policy
--   exists or is planned anywhere in this draft — aggregate visibility stays
--   RPC-only. [TODO-RPC-04] (036): whether a minimum-count suppression
--   threshold applies to chip counts remains an open CTO/DPO decision, not
--   resolved by this note.
--   CREATE VIEW kora_link.v_batch_stats AS
--   SELECT tenant_id,
--     COUNT(*) FILTER (WHERE status = 'active'
--       AND (pre_activation_expires_at IS NULL OR pre_activation_expires_at > now())) AS active_count,
--     COUNT(*) FILTER (WHERE status = 'activation_pending') AS pending_count,
--     COUNT(*) FILTER (WHERE status IN ('revoked','replaced','expired')) AS inactive_count,
--     COUNT(*) AS total_count
--   FROM kora_link.links
--   GROUP BY tenant_id;
--   NOTE: filter includes TTL check (A-04/D-04) for accurate counts.
--   RLS: tenant_id = kora.tenant_id() for COMPANY_ADMIN/COMPANY_VIEWER.
--   NEVER exposes link_id, worker_id, token_digest, or individual timestamps.
--
-- [RLS-035-L] SECURITY DEFINER functions:
--   fn_kora_link_public_lookup(p_token_digest text)
--     RETURNS TABLE(link_id uuid, status text, pre_activation_expires_at timestamptz)
--     — used by public route. Returns minimum fields. Never returns worker_id.
--     D-01: validates tenant via token record; no cross-schema FK needed.
--     D-07: single digest lookup (stable secret); no key_version branching.
--
--   fn_kora_link_activate(p_token_digest text, p_worker_id uuid, p_consent_version text)
--     RETURNS jsonb
--     — validates token, tenant match (explicit check — no FK), creates
--       link_assignments + link_activation_acknowledgements atomically
--       (table renamed by KORA-LINK-DPO-DECISIONS-09).
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- OPEN TODOS (updated post KL-19 Gate 2 technical review closure)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- RESOLVED BY KL-16 AMENDMENTS:
--   [RESOLVED A-02] TODO-CTO-02: UNIQUE NULLS NOT DISTINCT — eliminated (partner_scans deferred)
--   [RESOLVED A-03] TODO-CTO-03: Generated scan_date — eliminated (partner_scans deferred)
--   [RESOLVED A-08] TODO-CTO-08: DEFERRABLE self-FK — eliminated (replaced_by_link_id removed)
--   [RESOLVED A-09] Redundant token_digest index — eliminated
--
-- RESOLVED BY KL-19 GATE 2 TECHNICAL REVIEW (2026-07-04):
--
-- [RESOLVED TODO-CTO-01] FK policy on tenant_id/worker_id (no FK across schema
--   boundaries): CONFIRMED as the v1 pattern, not just Engineering-provisional.
--   Rationale: this is not a one-off shortcut — it is the same pattern already
--   used in supabase/proposed/038_initiative_adoption_source_model.sql
--   (renumbered from 033 by B173-FIX-01 — active migration 033 now exists)
--   (adopting_company_tenant_id/origin_company_tenant_id/partner_id: no FK;
--   initiative_id, an in-schema reference to commons.post: has an FK). The
--   convention is consistent: FK within the same schema (batch_id → link_batches,
--   link_id → links — all present in this file), no FK across the schema
--   boundary into analytics.tenant/personal.worker_identity, where RLS —
--   not referential integrity — governs the boundary. That boundary is no
--   longer a theoretical concern: RLS-03/RLS-05/RLS-06 (merged to main,
--   2026-07-04) proved live, direct-Postgres, that analytics.tenant-scoped
--   and personal.worker_identity-scoped RLS enforcement works correctly,
--   including for KORA_ADMIN's bounded cross-tenant access. No FK is added.
--
-- [RESOLVED TODO-CTO-04] Token TTL enforcement (app-layer vs DB-layer):
--   CONFIRMED as sufficient for v1 — and more precisely, TTL is NOT merely an
--   "application layer" check as the D-04 note originally framed it. The 036
--   SECURITY DEFINER functions (fn_public_lookup_link, fn_activate_link_for_worker)
--   already evaluate pre_activation_expires_at inline, on every lookup/activation
--   call — i.e. lazy expiry enforced at the query layer, not left to the Next.js
--   route alone. No pg_cron / scheduled batch-expiry job is needed for v1 pilot
--   volumes: a token past its TTL is correctly rejected the moment it's used,
--   which is the only time it matters. A scheduled job would only pre-flip the
--   `status` column for reporting/dashboard freshness — genuinely deferrable to
--   v1.1+ if a company dashboard ever needs "expired" counts to update without
--   a lookup happening first (fn_company_link_status_aggregate in 036 already
--   handles this today via a CASE expression, so even that need is covered).
--
-- [RESOLVED TODO-CTO-06] link_delivery_records scope (v1 vs defer to 036):
--   CONFIRMED kept in v1. Deferring it would not simplify anything — a company
--   receiving physical chips needs an operational delivery record before Gate 6
--   (public route enablement) is even meaningful, so the functionality is
--   needed at v1 launch regardless of which migration file it lives in.
--   Splitting it into a later migration would only fragment the schema for no
--   reduction in v1 scope. Table stays as-is (KORA_ADMIN-only, no worker
--   identity, role/team label only per A-10).
--
-- [RESOLVED TODO-CTO-07] Token secret rotation (stable secret vs key_version):
--   CONFIRMED — no key_version column in v1. A pilot-scale chip population
--   does not need live key rotation; the documented emergency procedure
--   (revoke all tokens + re-issue chips, using fn_revoke_link + a new batch)
--   is a proportionate compensating control for a security event, and adding
--   key_version now would be speculative complexity with no current consumer.
--   Revisit only if/when an actual rotation cadence requirement emerges
--   (e.g. a customer security requirement in a later contract) — that would
--   be a new migration, not a change to this file.
--
-- [RESOLVED — schema naming]: `kora_link` as a dedicated top-level schema is
--   CONFIRMED consistent with the existing repo convention of one schema per
--   domain (analytics, personal, commons, gov, audit, network). No rename.
--
-- [RESOLVED — Postgres version compatibility]: supabase/config.toml pins
--   `major_version = 17` for this project — well above the PostgreSQL 15
--   floor that mattered for the now-eliminated `UNIQUE NULLS NOT DISTINCT`
--   construct (A-02). Confirmed via config, not by applying this migration.
--
-- RATIFIED BY KORA-LINK-DPO-DECISIONS-09 (2026-07-16) — FORMERLY GENUINE
-- GATE 3 (DPO/LEGAL) BLOCKERS, NOT ENGINEERING DECISIONS:
-- These could not be resolved by a technical/CTO review — they required a
-- DPO/titolare decision. The titolare has now ratified all 4. Gate 3
-- OVERALL remains open (DPIA prudential recommendation, worker self-service
-- deactivation RPC, Gate 4 RLS) — see docs/KORA_LINK_DPO_DECISIONS_09.md §9/§24.
--
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] TODO-CTO-05 / GATE-3: audit_log
--   retention duration. Category-based retention ratified (not a single
--   duration) — see RETENTION POLICY note on kora_link.audit_log above and
--   docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 1. Mechanism: Supabase Edge
--   Function on a schedule. Enforcement job itself is not implemented by
--   this schema — tracked in docs/KORA_LINK_DPO_DECISIONS_09.md §26.
--
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] TODO-DPO-01 / GATE-3:
--   request_fingerprint hashing strategy. Resolved by REMOVING the column
--   (necessity test found existing controls sufficient — see
--   docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 2). Not populated, not needed.
--
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] TODO-DPO-02 / GATE-3:
--   link_activation_acknowledgements.activation_notice_version content
--   (formerly link_consents.consent_version). Canonical version string
--   ratified: 'kora-link-activation-notice-v1.0' — the proposed notice text
--   is in docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 3. Legal basis: Art.
--   6(1)(f) legitimate interest, not consent (§5).
--
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] TODO-DPO-03 / GATE-3:
--   link_delivery_records delivery-recipient semantics (formerly
--   delivered_to_label free text). Resolved by replacing the free-text
--   column with a restricted enum (delivery_channel: hr_admin |
--   office_reception | site_admin | other) — eliminates the
--   re-identification risk structurally instead of relying on a procedural
--   convention. See docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 5.
--
-- ═══════════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-APPLY VERIFICATION QUERIES (run manually after apply — DO NOT automate)
-- Updated for KL-16 table set (9 tables: removed public_lookup_attempts,
-- deferred partner_scans)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. Confirm schema created:
--    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'kora_link';
--
-- 2. Confirm all 9 tables created:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'kora_link' ORDER BY table_name;
--    Expected: audit_log, link_activation_acknowledgements, link_assignments,
--              link_batches, link_delivery_records, link_events,
--              link_replacements, links, revocations
--    NOT expected: partner_scans (deferred to 036), public_lookup_attempts (removed),
--              link_consents (renamed to link_activation_acknowledgements,
--              KORA-LINK-DPO-DECISIONS-09)
--
-- 2b. Confirm request_fingerprint no longer exists (KORA-LINK-DPO-DECISIONS-09):
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'kora_link' AND table_name = 'audit_log'
--      AND column_name = 'request_fingerprint';
--    Expected: 0 rows.
--
-- 2c. Confirm delivered_to_label no longer exists and delivery_channel does
--    (KORA-LINK-DPO-DECISIONS-09):
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'kora_link' AND table_name = 'link_delivery_records'
--      AND column_name IN ('delivered_to_label', 'delivery_channel');
--    Expected: 1 row — delivery_channel only.
--
-- 3. Confirm UNIQUE(token_digest) on kora_link.links:
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'links' AND schemaname = 'kora_link'
--      AND indexname = 'uq_link_token_digest';
--
-- 4. Confirm NO redundant non-unique token_digest index:
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'links' AND schemaname = 'kora_link'
--      AND indexname = 'idx_links_token_digest';
--    Expected: 0 rows (removed A-09)
--
-- 5. Confirm partial unique index on link_assignments (one active per link):
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'link_assignments' AND schemaname = 'kora_link'
--      AND indexname = 'uq_assignment_link_active';
--
-- 6. Confirm NO token_value column exists anywhere in kora_link:
--    SELECT column_name, table_name FROM information_schema.columns
--    WHERE table_schema = 'kora_link' AND column_name = 'token_value';
--    Expected: 0 rows.
--
-- 7. Confirm NO replaced_by_link_id column on kora_link.links:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'kora_link' AND table_name = 'links'
--      AND column_name = 'replaced_by_link_id';
--    Expected: 0 rows (removed A-08)
--
-- 8. Confirm NO DEFERRABLE constraints:
--    SELECT conname FROM pg_constraint
--    WHERE connamespace = 'kora_link'::regnamespace AND condeferrable = true;
--    Expected: 0 rows (removed A-08)
--
-- 9. Confirm triggers:
--    SELECT trigger_name, event_object_table FROM information_schema.triggers
--    WHERE trigger_schema = 'kora_link' ORDER BY event_object_table;
--    Expected: trg_link_assignments_updated_at, trg_link_batches_updated_at,
--              trg_links_updated_at
--
-- 10. Confirm RLS NOT enabled (RLS is in 035, not in 034):
--     SELECT tablename FROM pg_tables
--     WHERE schemaname = 'kora_link' AND rowsecurity = true;
--     Expected: 0 rows
