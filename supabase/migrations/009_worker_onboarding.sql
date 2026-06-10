-- =============================================================================
-- KORA Foundation Light — B113: Worker Onboarding & Privacy Consent Flow
-- Migration:   009_worker_onboarding
-- Created:     2026-06-10
-- =============================================================================
--
-- Adds consent and onboarding tracking fields to personal.worker_profile_private.
--
-- These fields:
--   - Are owned by the worker (only worker can write their own row)
--   - Are NOT visible to company roles (no RLS policy, intentional)
--   - Allow KORA_ADMIN to check technical readiness (onboarding_status) without
--     accessing private content (display_name, notes, participation data)
--
-- PRIVACY DOCTRINE:
--   - Company sees only aggregate onboarding counts (via service-role app layer)
--   - Company never sees individual consent timestamps or profile content
--   - consent_version allows future methodology updates to prompt re-consent
-- =============================================================================

-- ── 1. Add onboarding + consent fields to worker_profile_private ──────────────

ALTER TABLE personal.worker_profile_private
  ADD COLUMN IF NOT EXISTS onboarding_status        text        NOT NULL DEFAULT 'pending'
                                                    CHECK (onboarding_status IN ('pending', 'completed')),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_consent_version  text,
  ADD COLUMN IF NOT EXISTS privacy_consent_accepted_at timestamptz;

-- Index for admin readiness diagnostics (counts only, never individual reads)
CREATE INDEX IF NOT EXISTS idx_worker_profile_onboarding_status
  ON personal.worker_profile_private (onboarding_status);

-- ── 2. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
