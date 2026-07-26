-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 046                                        ║
-- ║  (046_commons_schema_usage_grant.sql).                                      ║
-- ║  It is NOT part of the normal apply sequence.                              ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 046 has been applied and caused confirmed breakage.         ║
-- ║    2. A forward fix (047+) is not viable.                                  ║
-- ║    3. Rollback has been explicitly approved by the technical owner.        ║
-- ║    4. The target environment is confirmed (staging vs. production —       ║
-- ║       production has never received this migration at all).                ║
-- ║                                                                              ║
-- ║  WHAT THIS RESTORES:                                                       ║
-- ║    Revokes USAGE ON SCHEMA commons from authenticated — reverts to the     ║
-- ║    pre-046 state where commons.* was unreachable by any non-owner role     ║
-- ║    (table-level grants from migration 013 become inert again).            ║
-- ║                                                                              ║
-- ║  CONSEQUENCE OF ROLLING BACK:                                              ║
-- ║    app/company/commons/page.tsx and app/worker/commons/page.tsx (both on   ║
-- ║    the RLS-respecting session client, not service-role) would immediately  ║
-- ║    fail with "permission denied for schema commons" for every request.     ║
-- ║    Do not roll this back without also reverting those two pages to the     ║
-- ║    service-role client, or accepting that outage.                          ║
-- ║                                                                              ║
-- ║  WHAT THIS DOES NOT TOUCH:                                                 ║
-- ║    - Table-level grants on commons.post/booking/contribution_event         ║
-- ║      (migration 013) — untouched, become inert again as a side effect,     ║
-- ║      not directly revoked here.                                            ║
-- ║    - Any RLS policy, any other schema, any other role.                     ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/046_rollback_046_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

REVOKE USAGE ON SCHEMA commons FROM authenticated;

-- ── POST-APPLY VERIFICATION ───────────────────────────────────────────────────
/*
SELECT has_schema_privilege('authenticated', 'commons', 'USAGE');
-- Expected: false.
*/

COMMIT;
