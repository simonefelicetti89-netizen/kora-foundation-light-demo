/**
 * ROLE-SWITCHER-02 — reconcileActiveRole unit tests.
 *
 * Covers the pure reconciliation logic in lib/demo-state/index.ts that
 * fixes the stale-role bug found in ROLE-SWITCHER-01: a real KORA_ADMIN
 * session initially showing the fallback COMPANY_ADMIN demo-state role
 * (blocking /admin via AdminDemoGuard) until manually corrected.
 *
 * No React renderer is used — this project has no React rendering-test
 * dependency, so the reconciliation decision is tested as a pure function
 * (same pattern as tests/unit/golden-02-e2e-env-guard.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { reconcileActiveRole } from '@/lib/demo-state';

describe('ROLE-SWITCHER-02 · reconcileActiveRole', () => {

  it('stays on the fallback role when initialRole is not yet known (unauthenticated)', () => {
    expect(reconcileActiveRole('COMPANY_ADMIN', null, false)).toBe('COMPANY_ADMIN');
    expect(reconcileActiveRole('COMPANY_ADMIN', undefined, false)).toBe('COMPANY_ADMIN');
  });

  it('reconciles from fallback COMPANY_ADMIN to KORA_ADMIN once initialRole becomes available', () => {
    expect(reconcileActiveRole('COMPANY_ADMIN', 'KORA_ADMIN', false)).toBe('KORA_ADMIN');
  });

  it('reconciles to any real role, not just KORA_ADMIN', () => {
    expect(reconcileActiveRole('COMPANY_ADMIN', 'WORKER', false)).toBe('WORKER');
  });

  it('does not overwrite a deliberate manual switch, even when initialRole disagrees', () => {
    // Operator is real KORA_ADMIN (initialRole) but manually switched the
    // preview to COMPANY_ADMIN — reconciliation must not fight that choice.
    expect(reconcileActiveRole('COMPANY_ADMIN', 'KORA_ADMIN', true)).toBe('COMPANY_ADMIN');
  });

  it('is a no-op when current role already matches initialRole', () => {
    expect(reconcileActiveRole('KORA_ADMIN', 'KORA_ADMIN', false)).toBe('KORA_ADMIN');
  });

  it('leaves current role untouched when manualOverride is true and initialRole is null', () => {
    expect(reconcileActiveRole('WORKER', null, true)).toBe('WORKER');
  });

});
