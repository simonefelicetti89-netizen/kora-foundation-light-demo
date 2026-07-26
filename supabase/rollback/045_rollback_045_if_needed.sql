-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 045                                        ║
-- ║  (045_worker_initiative_own_participation_rls.sql).                        ║
-- ║  It is NOT part of the normal apply sequence.                              ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 045 has been applied and caused confirmed breakage.         ║
-- ║    2. A forward fix (046+) is not viable.                                  ║
-- ║    3. Rollback has been explicitly approved by the technical owner.        ║
-- ║    4. The target environment is confirmed (staging vs. production —       ║
-- ║       production has never received this migration at all).                ║
-- ║                                                                              ║
-- ║  WHAT THIS RESTORES:                                                       ║
-- ║    personal.worker_initiative visibility for WORKER reverts to             ║
-- ║    published-only (migration 008's "worker_initiative_worker_published_    ║
-- ║    select" policy, untouched by 045, remains in place either way).         ║
-- ║                                                                              ║
-- ║  WHAT THIS DROPS:                                                          ║
-- ║    - "worker_initiative_worker_own_participation_select" policy on         ║
-- ║      personal.worker_initiative.                                           ║
-- ║                                                                              ║
-- ║  CONSEQUENCE OF ROLLING BACK:                                              ║
-- ║    Any app/worker/workspace or app/worker/dynamic-cv/print code path that  ║
-- ║    has already been migrated off getSupabaseServiceClient() (PILOT-TRUST-  ║
-- ║    01 FASE 5) and now relies on this policy for its own-participation-     ║
-- ║    history embedded joins will silently lose title/pillar/delivery_mode    ║
-- ║    for any CLOSED initiative a worker previously participated in. Do not   ║
-- ║    roll this back without also reverting those two pages back to the      ║
-- ║    service-role client, or accepting that regression.                      ║
-- ║                                                                              ║
-- ║  WHAT THIS DOES NOT TOUCH:                                                 ║
-- ║    - "worker_initiative_worker_published_select" (migration 008).          ║
-- ║    - "worker_initiative_kora_admin_all" (migration 008).                   ║
-- ║    - Any other table, policy, or function.                                 ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/045_rollback_045_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

DROP POLICY IF EXISTS "worker_initiative_worker_own_participation_select" ON personal.worker_initiative;

-- ── POST-APPLY VERIFICATION ───────────────────────────────────────────────────
/*
SELECT count(*) FROM pg_policies
WHERE schemaname = 'personal' AND tablename = 'worker_initiative'
  AND policyname = 'worker_initiative_worker_own_participation_select';
-- Expected: 0.
*/

COMMIT;
