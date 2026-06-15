-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 016: Worker Initiative — source_kind + source_uef_record_id
-- Migration:   016_worker_initiative_source
-- Created:     2026-06-15
-- Block:       B160 — Worker Grado 1
-- Gate:        Gate 2 OPEN — written, NOT applied
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Adds two columns to personal.worker_initiative:
--
--   source_kind:
--     Discriminates the origin of the initiative.
--     'company_sourced' = bridged from a UEF record uploaded by the company (active logic).
--     'partner_sourced' = future path, schema present, logic disabled.
--     'worker_declared' = future path, schema present, logic disabled.
--     Default 'company_sourced' — all existing rows keep this value.
--
--   source_uef_record_id:
--     FK to analytics.uef_record. Non-NULL only for initiatives created via the
--     bridge function (migration 019). NULL for initiatives created manually by
--     KORA_ADMIN. MAI esposto al worker in API responses.
--
-- PARTIAL UNIQUE INDEX — idempotenza bridge
-- ─────────────────────────────────────────
--   uq_worker_initiative_uef_bridge:
--     UNIQUE (tenant_id, source_uef_record_id) WHERE source_uef_record_id IS NOT NULL
--
--   Vincola SOLO le iniziative bridged — garantisce idempotenza nell'upsert (mig 019).
--   Le iniziative create a mano (source_uef_record_id IS NULL) non confliggono tra loro:
--   in PostgreSQL NULL ≠ NULL nei UNIQUE index, ma il WHERE esclude esplicitamente
--   i NULL per chiarezza di design intent.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal.worker_initiative
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'company_sourced'
    CHECK (source_kind IN ('company_sourced', 'partner_sourced', 'worker_declared')),
  ADD COLUMN IF NOT EXISTS source_uef_record_id uuid
    REFERENCES analytics.uef_record (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_worker_initiative_source_kind
  ON personal.worker_initiative (tenant_id, source_kind);

-- Partial unique index: idempotency for the UEF bridge (mig 019).
-- NULL source_uef_record_id (manual initiatives) are excluded — no conflict between them.
CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_initiative_uef_bridge
  ON personal.worker_initiative (tenant_id, source_uef_record_id)
  WHERE source_uef_record_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
