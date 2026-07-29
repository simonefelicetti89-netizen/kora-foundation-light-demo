-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 048                                        ║
-- ║  (048_worker_identity_lifecycle_protection.sql).                           ║
-- ║  It is NOT part of the normal apply sequence.                              ║
-- ║                                                                              ║
-- ║  ⚠ WARNING — THIS RESTORES A CONFIRMED, EXPLOITABLE VULNERABILITY ⚠        ║
-- ║                                                                              ║
-- ║  Applying this file removes the BEFORE UPDATE trigger that stops a WORKER  ║
-- ║  from self-reactivating a disabled personal.worker_identity mapping,       ║
-- ║  changing tenant_id, changing worker_ref, or changing created_at via the   ║
-- ║  existing worker_identity_worker_own_update RLS policy (migration 022).    ║
-- ║  This was reproduced and confirmed empirically in PILOT-TRUST-05.          ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 048 has been applied and caused confirmed breakage of a    ║
-- ║       legitimate consumer (worker onboarding completion) that cannot be    ║
-- ║       fixed forward.                                                       ║
-- ║    2. A forward fix (049+) is not viable in the required timeframe.        ║
-- ║    3. Rollback has been explicitly approved by the technical owner, WITH   ║
-- ║       explicit acknowledgment that this reopens a self-reactivation        ║
-- ║       bypass on personal.worker_identity.                                  ║
-- ║    4. The target environment is confirmed (staging vs. production —       ║
-- ║       production has never received migration 048).                       ║
-- ║                                                                              ║
-- ║  WHAT THIS RESTORES:                                                       ║
-- ║    Drops trg_worker_identity_lifecycle_protection and the trigger          ║
-- ║    function. The worker_identity_worker_own_update RLS policy itself       ║
-- ║    (migration 022) is untouched either way — this migration never          ║
-- ║    modified it.                                                            ║
-- ║                                                                              ║
-- ║  WHAT THIS DOES NOT TOUCH:                                                 ║
-- ║    - Any RLS policy, any GRANT/REVOKE, any other schema, any data.         ║
-- ║    - trg_worker_identity_updated_at (pre-existing, unrelated).             ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/048_rollback_048_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

DROP TRIGGER IF EXISTS trg_worker_identity_lifecycle_protection ON personal.worker_identity;
DROP FUNCTION IF EXISTS personal.enforce_worker_identity_lifecycle_protection();

NOTIFY pgrst, 'reload schema';

-- ── POST-APPLY VERIFICATION ───────────────────────────────────────────────────
/*
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'personal.worker_identity'::regclass
  AND tgname = 'trg_worker_identity_lifecycle_protection';
-- Expected: 0 rows (dropped).
*/

COMMIT;
