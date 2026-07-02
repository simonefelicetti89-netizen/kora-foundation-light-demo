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
} as const;
