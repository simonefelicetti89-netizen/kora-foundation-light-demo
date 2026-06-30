-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   034_kora_link_schema
-- Feature:     KL-05 — KORA Link v1 — Physical-Digital Bridge Schema
-- Author:      KORA Foundation Light · 2026-06-30
-- Gate:        Gate 2 OPEN + Gate 3 OPEN — PROPOSED, NOT APPLIED TO ANY DATABASE.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: PROPOSED / NOT APPLIED
-- ─────────────────────────────────────────────────────────────────────────────
-- This file is a DESIGN DRAFT for CTO/Postgres/RLS review only.
-- DO NOT run `supabase db push`.
-- DO NOT run `supabase migration up`.
-- DO NOT apply to staging or production without:
--   (1) CTO review and sign-off on schema, indexes, and token model
--   (2) DPO review of privacy boundary and consent model
--   (3) Gate 2 closure (CTO architecture review)
--   (4) Gate 3 closure (legal/privacy for real worker data)
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
-- FUTURE MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
--   035_kora_link_rls.sql  — RLS policies, grants, SECURITY DEFINER functions
--                             for public route lookup (fn_kora_link_public_lookup)
--                             and worker activation (fn_kora_link_activate).
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
--   • Partner scan: structural placeholder — no automatic Index scoring in v1
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
--   ✗ partner_scans must NEVER expose worker_id to partner roles
--   ✗ No automatic KORA Index or IU attribution from partner_scans in this migration
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
  'consent, partner scan placeholders, and audit. '
  'RLS policies and SECURITY DEFINER functions are in 035_kora_link_rls.sql. '
  'Gate 2+3 OPEN: NOT applied to any database.';


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
  -- TODO [FK-034-1]: consider FK to analytics.tenant(id) ON DELETE RESTRICT
  --                  if analytics schema is confirmed stable before 034 apply.
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
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_batches.tenant_id IS
  'Tenant this batch was assigned to. Nullable for pre-produced stock. '
  'TODO [FK-034-1]: add FK to analytics.tenant(id) if confirmed stable.';

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
  tenant_id                   uuid          NULL,

  -- HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET) — 64-char hex string.
  -- This is the ONLY token identifier stored in the DB.
  -- token_value (cleartext) is NEVER stored here.
  -- token_value is NEVER logged.
  -- Lookup: SELECT * FROM kora_link.links WHERE token_digest = $computed_digest
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
  pre_activation_expires_at   timestamptz   NULL,

  -- Populated when status transitions to 'active'.
  activated_at                timestamptz   NULL,

  -- Populated when status transitions to 'revoked' or 'replaced'.
  revoked_at                  timestamptz   NULL,

  -- Self-reference to the replacement token, if this token was replaced.
  -- NULL if not replaced. Populated when status = 'replaced'.
  -- NOTE: self-FK deferred to avoid circular dependency on INSERT order.
  replaced_by_link_id         uuid          NULL,

  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  -- CONSTITUTIONAL: no token_value column — never store cleartext.
  -- CONSTITUTIONAL: no nfc_url column — the URL is computed from token_value externally.

  CONSTRAINT uq_link_token_digest UNIQUE (token_digest)
);

-- Self-FK added after table creation to avoid circular dependency.
ALTER TABLE kora_link.links
  ADD CONSTRAINT fk_links_replaced_by
  FOREIGN KEY (replaced_by_link_id) REFERENCES kora_link.links (id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER trg_links_updated_at
  BEFORE UPDATE ON kora_link.links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PRIMARY LOOKUP INDEX: used by public route for every scan.
-- UNIQUE constraint already creates a btree index on token_digest.
-- Explicit index below for clarity and to support INCLUDE if needed in future.
CREATE INDEX IF NOT EXISTS idx_links_token_digest
  ON kora_link.links (token_digest);

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
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.links.token_digest IS
  'HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET) — 64-char hex. '
  'The ONLY token identifier stored in the DB. '
  'Cleartext token_value: NEVER stored, NEVER logged.';

COMMENT ON COLUMN kora_link.links.token_version IS
  'Token format version: 1 = kl1_ prefix + 48 char base62. '
  'Increment when hash algorithm or format changes to allow dual-digest migration.';

COMMENT ON COLUMN kora_link.links.pre_activation_expires_at IS
  'TTL for unactivated tokens. Set to created_at + 180 days at generation. '
  'Post-activation TTL: NOT implemented v1. Revoke manually for offboarding.';

COMMENT ON COLUMN kora_link.links.replaced_by_link_id IS
  'Self-FK to replacement token. Populated when status = replaced. '
  'Old chip is inert; worker must activate the new chip separately.';


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

  -- Tenant of the worker. Must match the token's tenant_id (validated by application).
  tenant_id             uuid          NOT NULL,

  -- Worker identity. FK to personal.worker_identity if schema confirmed.
  -- TODO [FK-034-2]: add FK REFERENCES personal.worker_identity(id) ON DELETE RESTRICT
  --                  once personal schema FK stability is confirmed pre-034-apply.
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
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_assignments.worker_id IS
  'Worker identity. TODO [FK-034-2]: FK to personal.worker_identity(id) pending schema confirmation.';

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
-- GDPR NOTE
-- consent_version must reference the exact version of the privacy notice
-- shown to the worker (text content approved by DPO before activation goes live).
-- Retention policy: to be defined with DPO (Gate 3).

CREATE TABLE IF NOT EXISTS kora_link.link_consents (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token this consent relates to. Nullable if consent pre-dates full activation.
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
  -- TODO [FK-034-3]: FK to personal.worker_identity(id) pending schema confirmation.
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
  CONSTRAINT uq_link_consent UNIQUE (worker_id, link_id, consent_version)
);

CREATE INDEX IF NOT EXISTS idx_consents_link_id
  ON kora_link.link_consents (link_id);

CREATE INDEX IF NOT EXISTS idx_consents_worker_id
  ON kora_link.link_consents (worker_id);

COMMENT ON TABLE kora_link.link_consents IS
  'KL-05 — Worker consent to KORA Link privacy notice. '
  'Required before link_assignments can be created. '
  'GDPR: consent_version must reference DPO-approved notice text. '
  'Retention policy: define with DPO (Gate 3) before production apply. '
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_consents.consent_version IS
  'Version string of the privacy notice shown to the worker. '
  'Must match a known, DPO-approved version (e.g. kora-link-privacy-v1.0). '
  'Gate 3: DPO must approve notice text before this field can be populated in production.';


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
  -- TODO [FK-034-4]: FK to personal.worker_identity(id) pending schema confirmation.
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
                                  'partner_scan_received',
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
                                  'partner',
                                  'admin_test'
                                )),

  -- Who performed the action.
  actor_type      text          NOT NULL
                                CHECK (actor_type IN (
                                  'kora_admin',
                                  'company_admin',
                                  'worker',
                                  'partner',
                                  'system'
                                )),

  -- Actor UUID (admin user, worker, partner). Nullable for system events.
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
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_events.metadata IS
  'Structured event metadata. '
  'PROHIBITED keys: token_value, nfc_url, full_token, worker_name, worker_email. '
  'Allowed keys: event_category, result_category, rate_limit_bucket, request_id.';


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
  -- TODO [FK-034-5]: FK to personal.worker_identity(id) pending schema confirmation.
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
                                          'partner',
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
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.revocations.details IS
  'Free-text detail. Required for admin_override actor_type and reason=other. '
  'Enforced at application layer. Must not contain token cleartext.';


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
  -- TODO [FK-034-6]: FK to personal.worker_identity(id) pending schema confirmation.
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
                                            'partner',
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
  'old_link_id UNIQUE: one canonical successor per replaced token. '
  'Gate 2+3 OPEN: NOT applied.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. kora_link.partner_scans
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Structural placeholder for future Track A partner scan events (v1.1+).
-- Records the minimal data needed to validate a partner scan:
--   - which token was scanned (link_id, not token_digest — internal reference)
--   - which partner scanned it
--   - what event was referenced
--   - validation outcome
--
-- WHAT THIS TABLE DOES NOT DO IN v1
--   • Does NOT automatically feed IU/PIB/KORA Index
--   • Does NOT expose worker_id to partner_id (via application + RLS 035)
--   • Does NOT record cross-partner visibility
--   • No scoring trigger defined here
--
-- IDEMPOTENCY
-- UNIQUE(partner_id, link_id, event_ref, scan_date) prevents duplicate scans
-- for the same partner+link+event on the same day.
--
-- PRIVACY NOTE
-- partner_id identifies the partner, not the worker.
-- worker_id is populated internally for KORA_ADMIN audit only.
-- Partners query their own scan results, never worker identity.

CREATE TABLE IF NOT EXISTS kora_link.partner_scans (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The token that was scanned. Nullable if scan arrived before token lookup.
  link_id             uuid          NULL
                                    REFERENCES kora_link.links (id)
                                    ON DELETE SET NULL,

  -- Tenant of the worker (for internal admin visibility). Never exposed to partner.
  tenant_id           uuid          NULL,

  -- The partner who performed the scan.
  -- TODO [FK-034-7]: FK to partner.profile(id) or equivalent when partner schema confirmed.
  partner_id          uuid          NULL,

  -- Partner-side reference for the event being validated.
  -- E.g., "gym-session-2026-07-15" or the partner's internal event ID.
  event_ref           text          NULL,

  -- Validation outcome.
  scan_status         text          NOT NULL DEFAULT 'received'
                                    CHECK (scan_status IN (
                                      'received',   -- scan received, validation pending
                                      'validated',  -- confirmed valid — token active, consent present
                                      'rejected',   -- invalid token, missing consent, or policy violation
                                      'duplicate',  -- idempotency: same scan already recorded today
                                      'cancelled'   -- scan cancelled by partner or admin
                                    )),

  -- Context type — should always be 'partner' for this table.
  scan_context        text          NOT NULL DEFAULT 'partner'
                                    CHECK (scan_context IN (
                                      'quick_access',
                                      'activation',
                                      'initiative',
                                      'partner',
                                      'admin_test'
                                    )),

  -- When the scan event occurred (partner-reported or server-received).
  occurred_at         timestamptz   NOT NULL,

  -- Date component for idempotency index (no timestamp needed for dedup logic).
  scan_date           date          NOT NULL GENERATED ALWAYS AS (occurred_at::date) STORED,

  -- When validated by KORA system (null until validation completes).
  validated_at        timestamptz   NULL,

  -- If rejected, optional reason for the partner's reference.
  -- Must NOT contain worker identity.
  rejection_reason    text          NULL,

  -- Structured metadata. NEVER include worker_id, worker_name, or token_digest here.
  -- Allowed: event_category, partner_event_type, scan_source.
  metadata            jsonb         NOT NULL DEFAULT '{}'::jsonb,

  created_at          timestamptz   NOT NULL DEFAULT now(),

  -- Idempotency: one validated scan per partner+link+event_ref per day.
  -- UNIQUE on (partner_id, link_id, event_ref, scan_date) for non-null combinations.
  -- Partial unique: only when all four fields are populated.
  CONSTRAINT uq_partner_scan_daily
    UNIQUE NULLS NOT DISTINCT (partner_id, link_id, event_ref, scan_date)

  -- NO automatic IU/PIB/Index scoring — Track A scoring requires v2 + methodology review.
  -- KORA Index impact from partner scans: BLOCKED until CTO + methodology team sign-off.
);

CREATE INDEX IF NOT EXISTS idx_partner_scans_partner_occurred
  ON kora_link.partner_scans (partner_id, occurred_at DESC)
  WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_scans_link_id
  ON kora_link.partner_scans (link_id)
  WHERE link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_scans_scan_date
  ON kora_link.partner_scans (scan_date);

COMMENT ON TABLE kora_link.partner_scans IS
  'KL-05 — Structural placeholder for Track A partner scan events (v1.1+). '
  'NO automatic IU/PIB/Index scoring — methodology review required before v2. '
  'PRIVACY: partner_id NEVER receives worker_id via any RLS path (enforced in 035). '
  'Idempotency: UNIQUE(partner_id, link_id, event_ref, scan_date). '
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.partner_scans.scan_date IS
  'Date component of occurred_at. Generated column. Used for idempotency index.';

COMMENT ON COLUMN kora_link.partner_scans.metadata IS
  'PROHIBITED keys: worker_id, worker_name, token_value, token_digest. '
  'Allowed: event_category, partner_event_type, scan_source.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. kora_link.audit_log
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
-- RETENTION
-- Retention policy: to be defined with DPO (Gate 3).
-- TODO [RLS-035-AUDIT]: add INSERT-only policy — no UPDATE, no DELETE.

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
                                          'partner',
                                          'system'
                                        )),

  -- Actor UUID. May be NULL for system events.
  -- MINIMIZATION: only log if needed for audit purpose (not every event requires actor_id).
  actor_id                uuid          NULL,

  -- Audit action description (enum-like text).
  -- Suggested values: BATCH_CREATED, TOKEN_GENERATED, ACTIVATION_ATTEMPTED,
  --   ACTIVATION_COMPLETED, CONSENT_ACCEPTED, CONSENT_WITHDRAWN,
  --   TOKEN_REVOKED, TOKEN_SUSPENDED, TOKEN_REPLACED, QUICK_ACCESS,
  --   PARTNER_SCAN_RECEIVED, PARTNER_SCAN_VALIDATED, PARTNER_SCAN_REJECTED,
  --   BREAK_GLASS_ACCESS, ADMIN_OVERRIDE.
  action                  text          NOT NULL CHECK (length(action) > 0),

  -- Outcome category. E.g., 'ok', 'failed', 'not_found', 'forbidden'.
  result                  text          NULL,

  -- Privacy-safe request fingerprint (hash of IP+UA, never raw IP).
  -- Requires DPO sign-off before logging any fingerprint in production.
  -- TODO [DPO-034-1]: confirm IP hashing strategy with DPO before enabling this field.
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
  'Retention policy: define with DPO (Gate 3) before production apply. '
  'INSERT-only: no UPDATE, no DELETE — enforced by 035 RLS. '
  'No FK on link_id: audit survives token deletion. '
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.audit_log.request_fingerprint IS
  'Privacy-safe hash of IP+UA. NEVER raw IP. '
  'TODO [DPO-034-1]: DPO must confirm hashing strategy before enabling in production.';

COMMENT ON COLUMN kora_link.audit_log.token_digest_prefix IS
  'First 8 chars of token_digest — correlation only, not a lookup key. '
  'NOT the full digest. Cannot be used to reconstruct the token.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. kora_link.public_lookup_attempts
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Lightweight log of public route scan attempts, for rate limiting support and
-- anomaly detection. Stores NO token cleartext and NO worker identity.
-- Used by: rate limiting middleware, anomaly detection (future), DPO audit.
--
-- RETENTION
-- This table can grow large (every scan = one row). Aggressive retention policy
-- required (e.g., 7–30 days). Implement with pg_cron or Supabase Edge Function.
-- TODO [RETENTION-034-1]: define and implement retention policy before production.

CREATE TABLE IF NOT EXISTS kora_link.public_lookup_attempts (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- First 8 chars of token_digest for correlation — NOT full digest, NOT cleartext.
  -- NULL if the token was malformed (no digest computed).
  token_digest_prefix     text          NULL
                                        CHECK (token_digest_prefix IS NULL OR length(token_digest_prefix) = 8),

  -- Categorized result of the lookup.
  -- 'ok_active' | 'ok_activation_pending' | 'not_found' | 'rate_limited'
  -- | 'malformed' | 'feature_flag_off' | 'error'
  result_category         text          NOT NULL CHECK (length(result_category) > 0),

  -- Privacy-safe request fingerprint. See audit_log note above.
  -- TODO [DPO-034-2]: confirm with DPO before logging any fingerprint.
  request_fingerprint     text          NULL,

  -- Rate limiting bucket key (hashed — no raw IP).
  rate_limit_bucket       text          NULL,

  created_at              timestamptz   NOT NULL DEFAULT now()

  -- NO token cleartext. NO worker_id. NO tenant_id. NO actor_id.
  -- Minimal data by design (GDPR minimization).
);

CREATE INDEX IF NOT EXISTS idx_public_attempts_created
  ON kora_link.public_lookup_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_attempts_result
  ON kora_link.public_lookup_attempts (result_category);

COMMENT ON TABLE kora_link.public_lookup_attempts IS
  'KL-05 — Lightweight log of public route /link/[token] scan attempts. '
  'NO token cleartext. NO worker_id. NO tenant_id. GDPR minimization by design. '
  'High-volume table: define aggressive retention policy (7–30 days) before production. '
  'TODO [RETENTION-034-1]: implement retention before production. '
  'Gate 2+3 OPEN: NOT applied.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. kora_link.link_delivery_records
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Optional record of chip physical delivery from KORA/batch to company,
-- and from company to a team member, WITHOUT associating to a specific worker.
-- Used for: batch fulfillment tracking, company operational reporting.
-- The delivery record uses 'delivered_to_label' (e.g., "HR Team", "Office Manager")
-- instead of a worker identity, to avoid creating an employer-visible
-- token↔worker mapping before the worker has activated and consented.

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
  tenant_id           uuid          NOT NULL,

  -- Admin who coordinated the delivery. Nullable for system-generated records.
  delivered_by        uuid          NULL REFERENCES auth.users (id) ON DELETE SET NULL,

  -- Non-identifying label for the delivery recipient (e.g., "HR Manager", "Office Reception").
  -- NEVER a worker name, worker ID, or email — this record must not create an
  -- employer-visible token↔worker mapping before activation and consent.
  delivered_to_label  text          NULL,

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
  'delivered_to_label: NEVER a worker name or ID — use role labels only. '
  'Prevents employer-visible token↔worker mapping before activation + consent. '
  'Gate 2+3 OPEN: NOT applied.';

COMMENT ON COLUMN kora_link.link_delivery_records.delivered_to_label IS
  'Non-identifying label only (e.g., "HR Manager"). '
  'NEVER worker name, worker ID, or email. '
  'This column must NOT be used to derive token↔worker association.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS / SECURITY DEFINER / GRANTS — TODO [RLS-035]
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- All RLS policies, grants, and SECURITY DEFINER functions are in:
--   035_kora_link_rls.sql
--
-- This file intentionally does NOT enable RLS or create policies.
-- The following must be implemented in 035:
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
--   • COMPANY_ADMIN: NO ACCESS (zero tolerance — this is the constitutional guarantee)
--   • Others: deny-by-default
--
-- [RLS-035-E] link_consents:
--   • KORA_ADMIN: SELECT
--   • WORKER: SELECT + INSERT WHERE worker_id = kora.current_worker_id()
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
-- [RLS-035-I] partner_scans:
--   • KORA_ADMIN: SELECT
--   • PARTNER: SELECT WHERE partner_id = kora.current_partner_id()
--   • WORKER: SELECT WHERE link_id IN (own assignments) — limited
--   • COMPANY_ADMIN: NO ACCESS — no individual scan visibility
--   • Others: deny-by-default
--
-- [RLS-035-J] audit_log:
--   • KORA_ADMIN: SELECT
--   • Others: INSERT only via SECURITY DEFINER functions — no direct INSERT from app
--   • DPO: read access via break-glass function (documented, audited)
--
-- [RLS-035-K] public_lookup_attempts:
--   • KORA_ADMIN: SELECT
--   • System: INSERT only via SECURITY DEFINER or service_role
--   • Others: deny-by-default
--
-- [RLS-035-L] link_delivery_records:
--   • KORA_ADMIN: SELECT/INSERT
--   • COMPANY_ADMIN: SELECT WHERE tenant_id = kora.tenant_id()
--   • Others: deny-by-default
--
-- [RLS-035-M] Company aggregate view:
--   CREATE VIEW kora_link.v_batch_stats AS
--   SELECT tenant_id,
--     COUNT(*) FILTER (WHERE status = 'active') AS active_count,
--     COUNT(*) FILTER (WHERE status = 'activation_pending') AS pending_count,
--     COUNT(*) FILTER (WHERE status IN ('revoked','replaced','expired')) AS inactive_count,
--     COUNT(*) AS total_count
--   FROM kora_link.links
--   GROUP BY tenant_id;
--   RLS: tenant_id = kora.tenant_id() for COMPANY_ADMIN/COMPANY_VIEWER.
--   NEVER exposes link_id, worker_id, token_digest, or individual timestamps.
--
-- [RLS-035-N] SECURITY DEFINER functions:
--   fn_kora_link_public_lookup(p_token_digest text)
--     RETURNS TABLE(link_id uuid, status text, pre_activation_expires_at timestamptz)
--     — used by public route. Returns minimum fields. Never returns worker_id.
--
--   fn_kora_link_activate(p_token_digest text, p_worker_id uuid, p_consent_version text)
--     RETURNS jsonb
--     — validates token, tenant match, creates assignment + consent atomically.
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- OPEN TODOS FOR CTO REVIEW
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- [TODO-CTO-01] FK-034-1 through FK-034-7: confirm FK targets for tenant_id and
--               worker_id before promoting to migrations/. Current approach (no FK)
--               mirrors pattern in migration 033 for tenant_id.
--
-- [TODO-CTO-02] UNIQUE NULLS NOT DISTINCT on partner_scans: requires PostgreSQL 15+.
--               Confirm Supabase environment PostgreSQL version before apply.
--
-- [TODO-CTO-03] Generated column scan_date on partner_scans: confirm Supabase
--               support for GENERATED ALWAYS AS ... STORED on timestamptz→date.
--
-- [TODO-CTO-04] Token TTL enforcement: pre_activation_expires_at is checked at
--               application layer (route + fn_kora_link_public_lookup). Consider
--               pg_cron job to batch-update status='expired' for efficiency.
--
-- [TODO-CTO-05] audit_log retention: high-volume over time. Define pg_cron or
--               Supabase background job for retention enforcement (Gate 3 + DPO).
--
-- [TODO-CTO-06] public_lookup_attempts retention: very high-volume. 7–30 day
--               retention recommended. Partition by month if volume justifies it.
--
-- [TODO-CTO-07] Token version migration: when KORA_LINK_TOKEN_SECRET is rotated,
--               all existing token_digests must be recomputed. Define dual-digest
--               migration procedure before first secret rotation.
--
-- [TODO-CTO-08] Deferred self-FK on kora_link.links.replaced_by_link_id:
--               confirm DEFERRABLE INITIALLY DEFERRED behavior in Supabase.
--
-- ═══════════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-APPLY VERIFICATION QUERIES (run manually after apply — DO NOT automate)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. Confirm schema created:
--    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'kora_link';
--
-- 2. Confirm all 11 tables created:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'kora_link' ORDER BY table_name;
--    Expected: audit_log, link_assignments, link_batches, link_consents,
--              link_delivery_records, link_events, link_replacements,
--              links, partner_scans, public_lookup_attempts, revocations
--
-- 3. Confirm UNIQUE(token_digest) on kora_link.links:
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'links' AND schemaname = 'kora_link'
--      AND indexname = 'uq_link_token_digest';
--
-- 4. Confirm partial unique index on link_assignments (one active per link):
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'link_assignments' AND schemaname = 'kora_link'
--      AND indexname = 'uq_assignment_link_active';
--
-- 5. Confirm NO token_value column exists anywhere in kora_link:
--    SELECT column_name, table_name FROM information_schema.columns
--    WHERE table_schema = 'kora_link' AND column_name = 'token_value';
--    Expected: 0 rows.
--
-- 6. Confirm triggers:
--    SELECT trigger_name, event_object_table FROM information_schema.triggers
--    WHERE trigger_schema = 'kora_link' ORDER BY event_object_table;
