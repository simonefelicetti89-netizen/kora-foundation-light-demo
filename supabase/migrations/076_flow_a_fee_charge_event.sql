-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 076: Flow A — Fee/Charge Event Ledger
-- Migration:   076_flow_a_fee_charge_event
-- Created:     2026-09-16
-- Block:       KORA-WP-062 — Platform Fee Flow / Flow A Billing
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/disposable-DB only by this task. NOT applied to
--              staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Registry 142's own KORA-WP-062 entry: "Platform Fee Flow / Flow A Billing —
-- Purpose: Company billing/entitlement visibility, structurally separate from
-- Program Funds... Proposed New: `commercial_entitlement`/fee-charge tables...
-- Acceptance: Company sees billing status; Flow A never sums with Program
-- Funds." Frozen source `86` Lock 1 override note names `83` §10/§27 as the
-- real semantic content (registry's own Arch Sources field is a pointer, not
-- the full text — `83` is read in full and used as the actual authority,
-- exactly as this engagement's established discipline requires when a
-- registry citation is a pointer rather than a literal quote).
--
-- DOC 83 §10, VERBATIM: "Flow A... Conceptually includes activation/
-- onboarding fee, annual/platform recurring fee, and contracted Company
-- Advisor service where commercially included or separately charged
-- (`PRIME-003`)... Needs its own conceptual objects — Commercial Entitlement
-- (already established, `78` §25, reused), a Fee/Charge record, a
-- billing-cadence reference, an invoice/payment-status reference (external
-- billing/accounting system, referenced not redesigned)."
--
-- WP-013 REUSE, NOT A SECOND CONFIG STORE
-- ─────────────────────────────────────────
-- Doc 78 §25 (Commercial / Entitlement Control Plane) explicitly ties its own
-- "effective date/change history" to "§24 versioning applies" — i.e. Commercial
-- Entitlement's own change-history discipline is the SAME discipline as the
-- Policy/Config Four-Tier Store (`KORA-WP-013`, migration 075), whose Tier 3
-- is literally named "Commercial Configuration." This migration therefore
-- creates NO new "commercial_entitlement" table, NO new versioning mechanism,
-- NO new policy store, and NO new audit trail for entitlement state — a
-- Company's current Commercial Entitlement (activation status, contract
-- tier, billing cadence, Advisor-service inclusion) is recorded as one
-- `gov.policy_config_version` row per Company: `tier =
-- 'commercial_configuration'`, `config_key = 'flow_a.commercial_entitlement'`,
-- `tenant_id = <company>` — written exclusively through the EXISTING
-- `gov.set_policy_config_version()` RPC and the EXISTING
-- `lib/policy-config/policy-config-service.ts` TS module (both migration 075,
-- both unmodified by this migration). This satisfies CLAUDE.md's own explicit
-- WP-062 boundary instruction: "REUSE the WP-013 store... do NOT create a
-- second config table/versioning-mechanism/policy store... any extension...
-- must be canonically proven necessary, not opportunistic" — here, proven
-- unnecessary, not merely avoided by convenience.
--
-- WHAT GENUINELY IS NEW: THE FEE/CHARGE EVENT
-- ───────────────────────────────────────────
-- A Fee/Charge is fundamentally different in kind from a Policy/Config value:
-- it is a discrete, amount-bearing, provenance-carrying occurrence (a Company
-- was charged an onboarding fee on date X; that charge was later invoiced,
-- then paid) — not a "current effective setting." Doc 83 §9's own event-
-- catalogue discipline for the (much larger) Program Funds Ledger applies
-- here at the correct, much smaller scale: "immutable, amount-bearing,
-- provenance-carrying events... from which every current balance is always
-- derived, never separately stored as an independent truth." No table for
-- this shape exists anywhere in the schema today (confirmed by inventory —
-- zero `commercial_entitlement`/`billing`/`flow_a`/`fee_charge` hits outside
-- an unrelated internal-admin RBAC capability-name string). This migration
-- adds exactly one new table for it: `analytics.fee_charge_event`.
--
-- SHAPE: ONE APPEND-ONLY EVENT PER STATUS OCCURRENCE, GROUPED BY `charge_id`
-- ───────────────────────────────────────────────────────────────────────────
-- Modeled directly on the established `analytics.review_event` /
-- `audit.governance_event` append-only convention (migration 070 et al.),
-- not on the WP-013 supersession pattern (no "active" row to supersede — a
-- Fee/Charge's current status is simply its own latest event, ordered by
-- `created_at`, for a given `charge_id`). `charge_id` is a stable identifier
-- shared by every event of the same underlying Fee/Charge (the first event
-- for a new charge is inserted with a fresh `charge_id`; every subsequent
-- status event for that same charge reuses it). The charge's own substantive
-- facts (category, amount, currency, billing cadence, effective date) are
-- fixed at the FIRST event and must be identical on every later event for
-- the same `charge_id` — enforced by trigger (§2 below) — so a "status
-- event" can never be used to silently rewrite what was actually charged.
--
-- FLOW A / PROGRAM FUNDS ANTI-CONTAMINATION (`83` §27, Test D)
-- ────────────────────────────────────────────────────────────
-- This table carries NO reference of any kind to a Program, Program Funds
-- Ledger, Funding Commitment, Partner Payable, or any `PRIME-002`/
-- `KORA-WP-101` object — none of those exist in this schema yet (`101` is
-- Code Truth ABSENT). Company/KORA fee amounts recorded here are
-- structurally incapable of being summed with Program Funds because no
-- shared table, no shared view, and no shared aggregate function exists
-- between the two — the separation is achieved by absence of connection, the
-- strongest possible form (Test D: "No one of these is ever silently treated
-- as another").
--
-- VERDICT-INDEPENDENCE (`KORA-WP-042`'s guard, extended)
-- ──────────────────────────────────────────────────────
-- No column, trigger, function, or RPC parameter in this migration reads,
-- stores, or references `analytics.review`, `analytics.review_event`, or any
-- verdict/decision value. A Fee/Charge's existence and status are
-- structurally independent of any Review outcome (doc 83 §15/§21, restated).
--
-- SCOPE BOUNDARY
-- ───────────────
-- No payment processing, no invoicing engine, no PSP integration — the
-- `invoice_reference` column is an opaque, external-system reference only
-- ("external billing/accounting system, referenced not redesigned," `83`
-- §10). No pricing values, no fee amounts, no billing cadence defaults are
-- seeded here (Commercial/Founder decision, out of scope, same discipline as
-- migration 075's own empty-seed rule). No UI, no Finance Operations console
-- (`KORA-WP-086`, not started). No Worker/PIB reference of any kind.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.fee_charge_event ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.fee_charge_event (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Stable across every event of the same underlying Fee/Charge.
  charge_id          uuid          NOT NULL,

  -- Doc 83 §10: "activation/onboarding fee, annual/platform recurring fee,
  -- and contracted Company Advisor service."
  charge_category    text          NOT NULL CHECK (charge_category IN ('onboarding_fee', 'platform_fee', 'advisor_service_fee')),

  amount             numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency           text          NOT NULL DEFAULT 'EUR' CHECK (currency <> ''),

  -- "billing-cadence reference" (`83` §10).
  billing_cadence    text          NOT NULL CHECK (billing_cadence IN ('one_time', 'monthly', 'annual')),

  effective_date     date          NOT NULL,

  -- "invoice/payment-status reference (external billing/accounting system,
  -- referenced not redesigned)" (`83` §10) — opaque, nullable, never parsed
  -- or validated against a real invoicing system here.
  invoice_reference  text,

  -- The event's own status — the charge's CURRENT status is simply the
  -- latest event for its `charge_id`, never a separately stored field.
  status             text          NOT NULL CHECK (status IN ('pending', 'invoiced', 'paid', 'failed', 'waived', 'cancelled')),

  actor_role         text          NOT NULL,
  actor_id           text          NOT NULL,
  reason             text,

  created_at         timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — immutable from creation, nothing to bump.
);

CREATE INDEX IF NOT EXISTS idx_fee_charge_event_tenant  ON analytics.fee_charge_event (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_charge_event_charge  ON analytics.fee_charge_event (charge_id, created_at DESC);

-- ── 2. Invariants — tenant consistency + immutable charge identity ─────────
-- (a) every event for a given charge_id must share the same tenant_id; (b)
-- every event for a given charge_id must share the same substantive facts
-- (category/amount/currency/cadence/effective_date) as the FIRST event for
-- that charge_id — a later "status event" changes only `status`,
-- `invoice_reference`, `reason`, `actor_role`/`actor_id`, `created_at`.

CREATE OR REPLACE FUNCTION analytics.enforce_fee_charge_event_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_first analytics.fee_charge_event;
BEGIN
  SELECT * INTO v_first
    FROM analytics.fee_charge_event
    WHERE charge_id = NEW.charge_id
    ORDER BY created_at ASC
    LIMIT 1;

  IF FOUND THEN
    IF v_first.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'kora/tenant-mismatch: fee_charge_event.tenant_id must match every prior event for the same charge_id';
    END IF;
    IF v_first.charge_category IS DISTINCT FROM NEW.charge_category
       OR v_first.amount           IS DISTINCT FROM NEW.amount
       OR v_first.currency         IS DISTINCT FROM NEW.currency
       OR v_first.billing_cadence  IS DISTINCT FROM NEW.billing_cadence
       OR v_first.effective_date   IS DISTINCT FROM NEW.effective_date
    THEN
      RAISE EXCEPTION 'kora/charge-identity-immutable: a Fee/Charge''s category/amount/currency/billing_cadence/effective_date are fixed at its first event — a later event may only change status/invoice_reference/reason';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fee_charge_event_invariants
  BEFORE INSERT ON analytics.fee_charge_event
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_fee_charge_event_invariants();

-- Append-only — same discipline as review_event/governance_event: zero
-- UPDATE/DELETE GRANT (§5) plus this unconditional trigger for every role.

CREATE OR REPLACE FUNCTION analytics.reject_fee_charge_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.fee_charge_event rows are never updated or deleted — a status change is always a new event';
END;
$$;

CREATE TRIGGER trg_fee_charge_event_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.fee_charge_event
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_fee_charge_event_mutation();

-- ── 3. analytics.record_fee_charge_event() — the ONLY write path ───────────
-- Mirrors migration 070's `conclude_review()` / migration 075's
-- `set_policy_config_version()` discipline: one plpgsql function body = one
-- implicit transaction; the event insert and the governance_event happen
-- together or not at all. Runs as whatever role calls it (service_role
-- only, via the GRANT below) — the real authorization check (KORA_ADMIN
-- only) is enforced by TypeScript before this RPC is ever invoked, exactly
-- like commit_commitment()/conclude_review()/set_policy_config_version().

CREATE OR REPLACE FUNCTION analytics.record_fee_charge_event(
  p_tenant_id        uuid,
  p_charge_category  text,
  p_amount           numeric,
  p_billing_cadence  text,
  p_effective_date   date,
  p_status           text,
  p_actor_role       text,
  p_actor_id         text,
  p_charge_id        uuid DEFAULT NULL,
  p_currency         text DEFAULT 'EUR',
  p_invoice_reference text DEFAULT NULL,
  p_reason           text DEFAULT NULL
)
RETURNS analytics.fee_charge_event
LANGUAGE plpgsql
AS $$
DECLARE
  v_charge_id  uuid := COALESCE(p_charge_id, gen_random_uuid());
  v_new        analytics.fee_charge_event;
BEGIN
  IF p_actor_role IS NULL OR p_actor_role = '' OR p_actor_id IS NULL OR p_actor_id = '' THEN
    RAISE EXCEPTION 'kora/actor-required: record_fee_charge_event requires actor_role and actor_id';
  END IF;

  INSERT INTO analytics.fee_charge_event (
    tenant_id, charge_id, charge_category, amount, currency, billing_cadence,
    effective_date, invoice_reference, status, actor_role, actor_id, reason
  ) VALUES (
    p_tenant_id, v_charge_id, p_charge_category, p_amount, p_currency, p_billing_cadence,
    p_effective_date, p_invoice_reference, p_status, p_actor_role, p_actor_id, p_reason
  )
  RETURNING * INTO v_new;

  INSERT INTO audit.governance_event (
    source_module, actor_role, actor_id, event_type, object_type, object_id, tenant_id, payload
  ) VALUES (
    'flow_a_billing', p_actor_role, p_actor_id, 'fee_charge.event_recorded', 'fee_charge_event', v_new.id::text, p_tenant_id,
    jsonb_build_object('charge_id', v_charge_id, 'status', p_status, 'charge_category', p_charge_category)
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION analytics.record_fee_charge_event(uuid, text, numeric, text, date, text, text, text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics.record_fee_charge_event(uuid, text, numeric, text, date, text, text, text, uuid, text, text, text) TO service_role;

-- ── 4. RLS — Pattern A (identical shape to migration 070's review/review_event) ──

ALTER TABLE analytics.fee_charge_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.fee_charge_event FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_fee_charge_event" ON analytics.fee_charge_event
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_fee_charge_event_read" ON analytics.fee_charge_event
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 5. GRANTs ────────────────────────────────────────────────────────────────
-- service_role: SELECT+INSERT only — never UPDATE/DELETE (append-only,
-- enforced twice: no grant, plus the trigger). authenticated: SELECT only
-- (RLS restricts to the caller's own tenant via Pattern A above).

GRANT SELECT, INSERT ON analytics.fee_charge_event TO service_role;
GRANT SELECT ON analytics.fee_charge_event TO authenticated;

GRANT EXECUTE ON FUNCTION analytics.record_fee_charge_event(uuid, text, numeric, text, date, text, text, text, uuid, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE EXECUTE ON FUNCTION analytics.record_fee_charge_event(uuid, text, numeric, text, date, text, text, text, uuid, text, text, text) FROM service_role;
-- DROP FUNCTION IF EXISTS analytics.record_fee_charge_event(uuid, text, numeric, text, date, text, text, text, uuid, text, text, text);
-- REVOKE SELECT ON analytics.fee_charge_event FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.fee_charge_event FROM service_role;
-- DROP POLICY IF EXISTS "company_own_fee_charge_event_read" ON analytics.fee_charge_event;
-- DROP POLICY IF EXISTS "kora_admin_all_fee_charge_event" ON analytics.fee_charge_event;
-- DROP TRIGGER IF EXISTS trg_fee_charge_event_no_mutation ON analytics.fee_charge_event;
-- DROP FUNCTION IF EXISTS analytics.reject_fee_charge_event_mutation();
-- DROP TRIGGER IF EXISTS trg_fee_charge_event_invariants ON analytics.fee_charge_event;
-- DROP FUNCTION IF EXISTS analytics.enforce_fee_charge_event_invariants();
-- DROP TABLE IF EXISTS analytics.fee_charge_event;
-- Rollback is safe at any time — this migration inserts no seeded row, and
-- no other object references this table (confirmed by inventory: no other
-- migration/view/function in this branch names fee_charge_event).
