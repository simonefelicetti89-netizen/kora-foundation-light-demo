-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 077: Ingestion Idempotency Claim
-- Migration:   077_ingestion_idempotency_claim
-- Created:     2026-09-16
-- Block:       KORA-WP-028 — Ingestion Hardening — Sync Path + Retry Contract
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/disposable-DB only by this task. NOT applied to
--              staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Registry 142's own KORA-WP-028 entry: "Purpose: real Company data ingests
-- reliably, per the evidence-gated jobs/queue decision... Proposed New:
-- hardened sync ingestion path using KORA-WP-011's contract... Async/
-- Idempotency: retry-safe per KORA-WP-011's contract... Tests: load test with
-- realistic file, idempotent-retry test."
--
-- WHY A NEW TABLE, DESPITE REGISTRY'S OWN "Data/Migration Impact: NONE" FIELD
-- ─────────────────────────────────────────────────────────────────────────────
-- Disclosed, sourced departure (same class as this engagement's own prior,
-- accepted "registry citation is a pointer/summary, not literal text"
-- precedents — WP-024's migration 070 header, WP-062's Arch Source pointer).
-- `KORA-WP-011`'s own completion module (`lib/async-contract/
-- idempotency-contract.ts`) explicitly foreshadows this exact migration,
-- verbatim: *"`KORA-WP-028`... plugs in a REAL Postgres-backed implementation
-- — `INSERT ... ON CONFLICT (tenant_id, operation, key) DO NOTHING RETURNING
-- id`, this repository's own established idiom... without this contract's own
-- type signatures changing at all."* `KORA-WP-011`'s own Persistence Decision
-- section reasons explicitly that `KORA-WP-028` — not `011` — is "positioned
-- to choose that write's own persistence shape." This task's own founder
-- authorization (§6/§9/§15) independently instructs exactly this: "Determine
-- whether WP-028 is that canonical point [for durable persistence]... If yes:
-- implement the smallest durable store required by the actual WP-028 write."
-- Registry's "no new tables" field is read as describing the *domain*
-- ingestion data (correctly true — no new `source_batch`/`uploaded_record`
-- shape is introduced; both existing tables are reused unmodified), not the
-- generic cross-cutting idempotency infrastructure this WP's own Async/
-- Idempotency line explicitly calls out as its deliverable.
--
-- TARGET WRITE — FOUNDER-CONFIRMED, DISCLOSED DOMAIN-INVENTORY FINDING
-- ───────────────────────────────────────────────────────────────────────────
-- Registry's own "Existing Paths: `app/company/data/upload`" is read
-- literally: WP-001's own Runtime Evidence Spike (`105`) proved this exact
-- page has ZERO server-side write today ("No server calls. No
-- persistence" — the parser module's own doctrine comment) and states
-- verbatim: *"`KORA-WP-028` ... is the package that will need to *add* the
-- server-side persistence step this spike found does not yet exist."* A
-- separate, already-live, Company-scoped write (`POST /api/company/
-- data-submissions/[id]/files`, "B39") was found during inventory and
-- considered as an alternative target — Founder-confirmed NOT to be touched;
-- this migration/route is a wholly new, additive path for `app/company/
-- data/upload`'s own domain, leaving `data-submissions` completely
-- untouched (confirmed zero-diff on every `data-submissions` file, §below).
--
-- WHAT THIS MIGRATION DOES AND DOES NOT DO
-- ───────────────────────────────────────────
-- Adds exactly one new, generic, tenant-scoped idempotency-claim table plus
-- one atomic claim RPC — reusable by ANY future caller of `KORA-WP-011`'s
-- contract, not `KORA-WP-028`-specific in shape (matching WP-011's own
-- generic `IdempotencyKey{tenantId, operation, key}` design). Does NOT
-- create a new `source_batch`/`uploaded_record` shape (both existing tables,
-- unmodified, GRANT-unchanged — `service_role` already holds full
-- INSERT/SELECT/UPDATE/DELETE on `analytics.source_batch`, confirmed by
-- inspection, so no grant change was needed there). Does NOT modify
-- `gov.policy_config_version` (`KORA-WP-013`) or `analytics.fee_charge_event`
-- (`KORA-WP-062`) in any way. Does NOT touch `analytics.source_batch`'s own
-- existing RLS policies (`analytics_source_batch_company_insert`/`_update`,
-- both scoped to `source_type = 'company_submission'` — the new ingestion
-- path uses a distinct `source_type` and writes exclusively via
-- `service_role`, never the `authenticated`-scoped client, so those
-- policies are structurally never reached by this WP's own write, and a
-- direct `authenticated`-role INSERT attempt using the new `source_type`
-- remains correctly rejected by the existing, unmodified policy — proven in
-- this task's own real-DB validation).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.idempotency_claim ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.idempotency_claim (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Namespaces the key so two different operations can safely reuse the
  -- same caller-supplied key string (KORA-WP-011's own IdempotencyKey shape).
  operation        text          NOT NULL CHECK (operation <> ''),
  idempotency_key  text          NOT NULL CHECK (idempotency_key <> ''),

  payload_hash     text          NOT NULL CHECK (payload_hash <> ''),
  status           text          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),

  -- The exact value a replay returns (KORA-WP-011's own contract) — a
  -- small, caller-chosen summary object, never a raw file/payload body
  -- (privacy discipline, this WP's own §14).
  result           jsonb,
  error_message    text,

  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- The real concurrency guarantee (KORA-WP-011's own header: "claim() MUST
-- be a single atomic DB operation... never a SELECT followed by a separate
-- INSERT"). A key belonging to Tenant A can structurally never collide with
-- the same literal key string for Tenant B (KORA-WP-011's own §9 tenant
-- boundary, enforced here at the DB level, not only in TypeScript).
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_claim_key
  ON analytics.idempotency_claim (tenant_id, operation, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_claim_tenant ON analytics.idempotency_claim (tenant_id);

-- ── 2. Terminal-state immutability ──────────────────────────────────────────
-- Once a claim resolves (succeeded/failed), its result/error is frozen —
-- "Idempotent-safe to call once per successful claim" (KORA-WP-011's own
-- contract) is upheld at the DB level too: a second complete()/fail() call
-- for an already-terminal row is a safe no-op at the service layer (WHERE
-- status='pending'), and this trigger is the defense-in-depth backstop that
-- makes a bypass of that WHERE clause structurally impossible, matching
-- this engagement's established "stronger domain invariant" discipline.

CREATE OR REPLACE FUNCTION analytics.enforce_idempotency_claim_terminal_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'kora/immutable: analytics.idempotency_claim "%" is already terminal ("%") — a resolved claim is never re-resolved', OLD.id, OLD.status;
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.operation IS DISTINCT FROM OLD.operation
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'kora/immutable: analytics.idempotency_claim identity fields (tenant_id/operation/idempotency_key/payload_hash/created_at) never change after creation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_idempotency_claim_terminal_immutability
  BEFORE UPDATE ON analytics.idempotency_claim
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_idempotency_claim_terminal_immutability();

-- Never deleted — full claim history remains inspectable (matches this
-- engagement's established never-delete-operational-history discipline).

CREATE OR REPLACE FUNCTION analytics.reject_idempotency_claim_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.idempotency_claim rows are never deleted';
END;
$$;

CREATE TRIGGER trg_idempotency_claim_no_delete
  BEFORE DELETE ON analytics.idempotency_claim
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_idempotency_claim_delete();

-- ── 3. analytics.claim_idempotency_key() — the ONLY atomic claim path ──────
-- `INSERT ... ON CONFLICT ... DO NOTHING RETURNING` — genuinely atomic, no
-- SELECT-then-INSERT race window. If the INSERT returns no row (conflict),
-- the conflicting row is, by definition, already committed and visible — so
-- the follow-up SELECT is not a race, it observes a fact already true at
-- the moment the INSERT's own atomic conflict check ran.

CREATE OR REPLACE FUNCTION analytics.claim_idempotency_key(
  p_tenant_id   uuid,
  p_operation   text,
  p_key         text,
  p_payload_hash text
)
RETURNS TABLE (
  claimed         boolean,
  id              uuid,
  status          text,
  payload_hash    text,
  result          jsonb,
  error_message   text,
  created_at      timestamptz,
  updated_at      timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new analytics.idempotency_claim;
BEGIN
  IF p_operation IS NULL OR p_operation = '' OR p_key IS NULL OR p_key = '' THEN
    RAISE EXCEPTION 'kora/invalid-key: operation and key are required';
  END IF;

  INSERT INTO analytics.idempotency_claim (tenant_id, operation, idempotency_key, payload_hash, status)
  VALUES (p_tenant_id, p_operation, p_key, p_payload_hash, 'pending')
  ON CONFLICT (tenant_id, operation, idempotency_key) DO NOTHING
  RETURNING * INTO v_new;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_new.id, v_new.status, v_new.payload_hash, v_new.result, v_new.error_message, v_new.created_at, v_new.updated_at;
    RETURN;
  END IF;

  -- Conflict — the row already exists (created by this call or a prior one).
  RETURN QUERY
    SELECT false, c.id, c.status, c.payload_hash, c.result, c.error_message, c.created_at, c.updated_at
    FROM analytics.idempotency_claim c
    WHERE c.tenant_id = p_tenant_id AND c.operation = p_operation AND c.idempotency_key = p_key;
END;
$$;

REVOKE ALL ON FUNCTION analytics.claim_idempotency_key(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics.claim_idempotency_key(uuid, text, text, text) TO service_role;

-- ── 4. RLS — no Company-facing access; this is internal plumbing ───────────
-- The Company never queries this table directly — it only ever observes an
-- outcome via the calling API route's own response. KORA_ADMIN keeps
-- read access for operational visibility/debugging, matching this
-- engagement's "gov"-schema-adjacent internal-primitive convention even
-- though this table lives in `analytics` (tenant-scoped like its own
-- domain write, `source_batch`).

ALTER TABLE analytics.idempotency_claim ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.idempotency_claim FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_read_idempotency_claim" ON analytics.idempotency_claim
  FOR SELECT USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 5. GRANTs — service_role only; zero Company-facing grant ───────────────
-- No DELETE grant for any role (append/resolve-only, defense-in-depth
-- alongside the no-delete trigger above).

GRANT SELECT, INSERT, UPDATE ON analytics.idempotency_claim TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE EXECUTE ON FUNCTION analytics.claim_idempotency_key(uuid, text, text, text) FROM service_role;
-- DROP FUNCTION IF EXISTS analytics.claim_idempotency_key(uuid, text, text, text);
-- REVOKE SELECT, INSERT, UPDATE ON analytics.idempotency_claim FROM service_role;
-- DROP POLICY IF EXISTS "kora_admin_read_idempotency_claim" ON analytics.idempotency_claim;
-- DROP TRIGGER IF EXISTS trg_idempotency_claim_no_delete ON analytics.idempotency_claim;
-- DROP FUNCTION IF EXISTS analytics.reject_idempotency_claim_delete();
-- DROP TRIGGER IF EXISTS trg_idempotency_claim_terminal_immutability ON analytics.idempotency_claim;
-- DROP FUNCTION IF EXISTS analytics.enforce_idempotency_claim_terminal_immutability();
-- DROP TABLE IF EXISTS analytics.idempotency_claim;
-- Rollback is safe at any time — this migration inserts no seeded row, and
-- no other object references this table.
