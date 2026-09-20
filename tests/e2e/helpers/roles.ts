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

// ADVISOR is deliberately NOT in getRoleHome(): lib/auth/role-home.ts fails
// closed to '/login' for it, and lib/permissions/index.ts is what grants
// ADVISOR its '/advisor' route tree. Naming the landing path here would
// duplicate a mapping the app does not make — so the advisor entry point is
// stated once, explicitly, as the route its own layout guards.
export const ADVISOR_HOME = '/advisor';
