-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   034_kora_link_schema
-- Feature:     KL-05 — KORA Link v1 — Physical-Digital Bridge Schema
-- Author:      KORA Foundation Light · 2026-06-30
-- Amended:     KL-16 — Engineering provisional amendments · 2026-07-01
-- Gate:        Gate 2 OPEN + Gate 3 OPEN — PROPOSED, NOT APPLIED TO ANY DATABASE.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: PROPOSED_AMENDED_INTERNAL_ENGINEERING
-- ─────────────────────────────────────────────────────────────────────────────
-- This file is a DESIGN DRAFT amended by Engineering based on KL-14 plan.
-- These are internal Engineering provisional decisions — NOT CTO-approved yet.
-- The file remains PROPOSED. Do not promote to supabase/migrations/ until:
--   (1) CTO review and formal sign-off on the amended schema
--   (2) DPO review of privacy boundary and consent model
--   (3) Gate 2 closure (CTO architecture review)
--   (4) Gate 3 closure (legal/privacy for real worker data)
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
--   A-11:      link_consents clarified as append-only consent events.
--   A-12:      partner_scans deferred to migration 036 (see A-03).
--
-- Table set v1 after amendments: 9 tables (was 11)
--   Removed:  public_lookup_attempts
--   Deferred: partner_scans (→ 036), link_delivery_records (→ 036 if not needed)
--   Core 8:   link_batches, links, link_assignments, link_consents,
--             link_events, revocations, link_replacements, audit_log
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
--   • Association token↔worker: server-side only, post login + explicit consent
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
  'consent, and audit. '
  'partner_scans deferred to migration 036. '
  'RLS policies and SECURITY DEFINER functions are in 035_kora_link_rls.sql. '
  'KL-16 amended. Gate 2+3 OPEN: NOT applied to any database.';


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
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

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
                                              'activation_pending', -- worker scanning, consent not yet completed
                                              'active',             -- worker activated + consent accepted
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
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

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
--   (3) Worker has accepted the KORA Link privacy notice (link_consents record)
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
                                        'pending',   -- consent started, not yet confirmed
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
  'Created ONLY after: authenticated worker session + tenant match + explicit consent. '
  'PRIVACY INVARIANT: NEVER accessible to company roles via any RLS path. '
  'RLS (035): SELECT only for kora_admin OR worker self. '
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_assignments.worker_id IS
  'Worker identity. FK POLICY (D-01): no FK in v1 — pattern migration 033. '
  'Canonical target: personal.worker_identity(id). '
  'Validated by fn_kora_link_activate (035) before INSERT.';

COMMENT ON COLUMN kora_link.link_assignments.tenant_id IS
  'Must match kora_link.links.tenant_id. Validated by activation function (035 SECDEF).';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. kora_link.link_consents
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Records explicit worker consent to the KORA Link privacy notice.
-- A consent record must exist (status = 'accepted') before link_assignments
-- can be created. Withdrawal of consent triggers revocation of the assignment.
--
-- APPEND-ONLY SEMANTICS (A-11)
-- Consent records are append-only events. Each state transition (pending →
-- accepted, accepted → withdrawn, etc.) should be modeled as a new record
-- in a future v2 event-sourced design. In v1, a single mutable record per
-- (worker, link, consent_version) is used for simplicity, with accepted_at
-- and withdrawn_at capturing the key timestamps.
-- The UNIQUE constraint prevents duplicate consent for the same combination.
--
-- GDPR NOTE
-- consent_version must reference the exact version of the privacy notice
-- shown to the worker (text content approved by DPO before activation goes live).
-- Retention policy: to be defined with DPO (Gate 3).

CREATE TABLE IF NOT EXISTS kora_link.link_consents (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token this consent relates to.
  link_id             uuid          NOT NULL
                                    REFERENCES kora_link.links (id)
                                    ON DELETE RESTRICT,

  -- The assignment created as a result of this consent. Nullable until assignment committed.
  assignment_id       uuid          NULL
                                    REFERENCES kora_link.link_assignments (id)
                                    ON DELETE SET NULL,

  -- Tenant of the consenting worker.
  tenant_id           uuid          NOT NULL,

  -- Worker who gave or withdrew consent.
  -- FK POLICY (A-01/D-01): no FK in v1. Enforced by fn_kora_link_activate (035).
  -- Canonical target: personal.worker_identity(id).
  worker_id           uuid          NOT NULL,

  -- Version identifier of the privacy notice shown to the worker.
  -- Must match a known, DPO-approved version string (e.g., "kora-link-privacy-v1.0").
  consent_version     text          NOT NULL CHECK (length(consent_version) > 0),

  -- Consent lifecycle.
  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN (
                                      'pending',     -- worker initiated activation, notice not yet accepted
                                      'accepted',    -- worker accepted — assignment can proceed
                                      'withdrawn',   -- worker withdrew consent — assignment revoked
                                      'superseded'   -- superseded by a newer consent version (re-consent flow)
                                    )),

  accepted_at         timestamptz   NULL,
  withdrawn_at        timestamptz   NULL,

  created_at          timestamptz   NOT NULL DEFAULT now(),

  -- One consent record per (worker, link, version) to prevent duplicates.
  -- In v1: single mutable record per combination. v2: append-only event log.
  CONSTRAINT uq_link_consent UNIQUE (worker_id, link_id, consent_version)
);

CREATE INDEX IF NOT EXISTS idx_consents_link_id
  ON kora_link.link_consents (link_id);

CREATE INDEX IF NOT EXISTS idx_consents_worker_id
  ON kora_link.link_consents (worker_id);

COMMENT ON TABLE kora_link.link_consents IS
  'KL-05 — Worker consent to KORA Link privacy notice. '
  'Required before link_assignments can be created. '
  'A-11: v1 uses single mutable record per (worker,link,version); v2 target: append-only events. '
  'GDPR: consent_version must reference DPO-approved notice text. '
  'Retention policy: define with DPO (Gate 3) before production apply. '
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_consents.consent_version IS
  'Version string of the privacy notice shown to the worker. '
  'Must match a known, DPO-approved version (e.g. kora-link-privacy-v1.0). '
  'Gate 3: DPO must approve notice text before this field can be populated in production.';

COMMENT ON COLUMN kora_link.link_consents.worker_id IS
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
                                  'consent_accepted',
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
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

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
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

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
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

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
--   • request_fingerprint: hash of IP + user-agent, NOT raw IP (GDPR)
--   • metadata JSONB: structured audit data — no PII beyond minimum necessary
--   • Append-only enforced by RLS INSERT-only policy in 035
--
-- RETENTION POLICY (A-05/D-05)
-- Retention policy: NOT defined in this schema. Duration must be approved by DPO (Gate 3).
-- Mechanism options: pg_cron, Supabase Edge Function scheduled, external archive.
-- INSERT-only enforced by RLS (035). No UPDATE, no DELETE policy in this file.
-- Implement retention job in a separate migration or Edge Function after Gate 3.
--
-- DPO NOTE ON request_fingerprint
-- request_fingerprint field is nullable. Do not populate in production until DPO
-- confirms IP hashing strategy and GDPR legal basis for storing fingerprints.

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
  --   ACTIVATION_COMPLETED, CONSENT_ACCEPTED, CONSENT_WITHDRAWN,
  --   TOKEN_REVOKED, TOKEN_SUSPENDED, TOKEN_REPLACED, QUICK_ACCESS,
  --   BREAK_GLASS_ACCESS, ADMIN_OVERRIDE.
  action                  text          NOT NULL CHECK (length(action) > 0),

  -- Outcome category. E.g., 'ok', 'failed', 'not_found', 'forbidden'.
  result                  text          NULL,

  -- Privacy-safe request fingerprint (hash of IP+UA, never raw IP).
  -- NULL until DPO confirms hashing strategy and GDPR basis (Gate 3).
  request_fingerprint     text          NULL,

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
  'A-05/D-05: retention policy NOT in this schema. Duration: DPO Gate 3. '
  'Mechanism: pg_cron or Edge Function, post-Gate-3. No DELETE in 034. '
  'INSERT-only: no UPDATE, no DELETE — enforced by 035 RLS. '
  'No FK on link_id: audit survives token deletion. '
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.audit_log.request_fingerprint IS
  'Privacy-safe hash of IP+UA. NEVER raw IP. '
  'NULL until DPO confirms hashing strategy (Gate 3).';

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
-- The delivery record uses 'delivered_to_label' (e.g., "HR Team", "Office Manager")
-- instead of a worker identity, to avoid creating an employer-visible
-- token↔worker mapping before the worker has activated and consented.
--
-- DPO NOTE (A-10)
-- delivered_to_label MUST be a role/team label only (e.g., "HR Manager", "Office Reception").
-- NEVER a person's name, worker_id, or email.
-- This column MUST NOT be used to derive a token↔worker association.
-- DPO must approve the semantics of delivered_to_label before production use.
-- If this table is not needed for pilot logistics, defer to migration 036.

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

  -- Non-identifying label for the delivery recipient (e.g., "HR Manager", "Office Reception").
  -- NEVER a worker name, worker ID, or email — this record must not create an
  -- employer-visible token↔worker mapping before activation and consent.
  -- DPO APPROVAL REQUIRED before populating in production (see table comment).
  delivered_to_label  text          NULL
                                    CHECK (delivered_to_label IS NULL OR length(delivered_to_label) < 200),

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
  'delivered_to_label: NEVER a worker name or ID — use role labels only. '
  'DPO must approve delivered_to_label semantics before production use. '
  'Prevents employer-visible token↔worker mapping before activation + consent. '
  'KL-16 amended. Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_delivery_records.delivered_to_label IS
  'Non-identifying role/team label ONLY (e.g., "HR Manager"). '
  'NEVER worker name, worker ID, or email. '
  'This column MUST NOT be used to derive token↔worker association. '
  'DPO approval required before production use.';


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
-- [RLS-035-E] link_consents:
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
-- [RLS-035-K] Company aggregate view:
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
--       link_assignments + link_consents atomically.
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- OPEN TODOS (updated post KL-16 amendments)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- RESOLVED BY KL-16 AMENDMENTS:
--   [RESOLVED A-02] TODO-CTO-02: UNIQUE NULLS NOT DISTINCT — eliminated (partner_scans deferred)
--   [RESOLVED A-03] TODO-CTO-03: Generated scan_date — eliminated (partner_scans deferred)
--   [RESOLVED A-08] TODO-CTO-08: DEFERRABLE self-FK — eliminated (replaced_by_link_id removed)
--   [RESOLVED A-09] Redundant token_digest index — eliminated
--
-- STILL OPEN (require CTO formal sign-off):
--
-- [TODO-CTO-01] FK-034-1 through FK-034-6 (partner FK-034-7 deferred with partner_scans):
--              Current approach (no FK) is Engineering provisional per D-01/A-01.
--              CTO should formally confirm this as the v1 pattern or require FKs.
--
-- [TODO-CTO-04] Token TTL enforcement: pre_activation_expires_at checked at
--              application layer. Engineering provisional per D-04/A-04.
--              CTO should confirm app-layer enforcement is acceptable for v1.
--
-- [TODO-CTO-05] audit_log retention: Engineering provisional — no retention in 034.
--              Duration and mechanism require DPO + CTO decision (Gate 3).
--
-- [TODO-CTO-06] link_delivery_records scope: kept for pilot logistics (A-10).
--              CTO may choose to defer to 036 if not needed for Foundation Light.
--
-- [TODO-CTO-07] Token version migration: stable secret policy adopted (D-07/A-07).
--              CTO should formally confirm no key_version in v1 and approve
--              emergency re-issue as the rotation procedure.
--
-- [TODO-DPO-01] request_fingerprint hashing strategy in audit_log: nullable,
--              not populated until DPO confirms (Gate 3).
--
-- [TODO-DPO-02] link_consents.consent_version: content of privacy notice v1.0
--              must be approved by DPO before production use (Gate 3).
--
-- [TODO-DPO-03] link_delivery_records.delivered_to_label semantics: DPO must
--              approve what constitutes a non-identifying label (Gate 3).
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
--    Expected: audit_log, link_assignments, link_batches, link_consents,
--              link_delivery_records, link_events, link_replacements,
--              links, revocations
--    NOT expected: partner_scans (deferred to 036), public_lookup_attempts (removed)
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
