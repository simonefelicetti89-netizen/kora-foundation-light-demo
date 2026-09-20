/**
 * GOLDEN-02 — Role → expected workspace path mapping for E2E fixtures.
 *
 * Reuses the app's own single source of truth (`lib/auth/role-home.ts`)
 * instead of duplicating the KORA_ROLE → home-path mapping in tests.
 */

import { getRoleHome } from '@/lib/auth/role-home';

export const ROLE_HOME = {
  ADMIN: getRoleHome('KORA_ADMIN'),
  COMPANY: getRoleHome('COMPANY_ADMIN'),
  // KORA-WP-088 — the two remaining role environments the Founder's
  // multi-viewport validation must cover. Still read from the app's own
  // mapping, never hardcoded here.
  WORKER: getRoleHome('WORKER'),
  PARTNER: getRoleHome('PARTNER'),
} as const;

// KORA-WP-088 (Founder Decision 3): the Worker case must reach the ACTUAL
// worker environment, not the onboarding wizard.
//
// getRoleHome('WORKER') is '/worker/onboarding' by design, and the gate in
// app/worker/onboarding/page.tsx forwards a COMPLETED worker to
// /worker/workspace (the reverse gate in app/worker/workspace/page.tsx sends an
// incomplete one back). So asserting the workspace is what proves onboarding is
// genuinely complete: an onboarding-incomplete worker can never reach it, and
// the case fails loudly instead of silently validating the wizard.
//
// Completion is marked by personal.worker_profile_private.onboarding_completed_at
// being non-null — written ONLY by POST /api/worker/onboarding, i.e. by the
// worker completing the wizard. There is no admin path and no metadata flag.
export const WORKER_WORKSPACE_HOME = '/worker/workspace';

// KORA-WP-088 (Founder Decision 1): ADVISOR now HAS a role-home mapping —
// the missing branch was a product defect that looped an authenticated advisor
// back to /login. This reads the app's own mapping like every other role
// rather than restating a path the tests would have to keep in sync.
export const ADVISOR_HOME = getRoleHome('ADVISOR');
