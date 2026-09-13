/**
 * Consolidation Audit Wave 2 — Remediation of Item 9 (Advisor Case
 * operational eligibility enforcement) and Item 10a (Trial Readiness
 * worker_profile_private query-contract defect). Code/auth-only — no
 * migration in this file's own scope (see Item 10b's separate test file
 * for the migration 062 GRANT).
 *
 * See .kora-audit/output/127_KORA_CONSOLIDATION_AUDIT_IMPLEMENTATION_WAVE_2.md
 * for the findings; behavioral proof (real, unmocked service functions
 * against clean local Postgres) was performed via disposable scripts,
 * deleted after use, per this engagement's established methodology — this
 * file is the permanent regression guard, source-level where a full
 * behavioral mock of an 8-parallel-query admin route would cost more than
 * it proves.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('AUD-W2-ITEM-9 — redundant raw Advisor Case route retired', () => {
  it('app/api/advisor/cases/route.ts no longer exists', () => {
    expect(existsSync(join(process.cwd(), 'app/api/advisor/cases/route.ts'))).toBe(false);
  });

  it('app/api/advisor/cases/[caseId]/route.ts no longer exists', () => {
    expect(existsSync(join(process.cwd(), 'app/api/advisor/cases/[caseId]/route.ts'))).toBe(false);
  });

  it('KORA-WP-034\'s own Assignment-scoped Case routes are still present (the sole surviving Advisor Case entry path)', () => {
    expect(existsSync(join(process.cwd(), 'app/api/advisor/companies/[assignmentId]/cases/route.ts'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'app/api/advisor/companies/[assignmentId]/cases/[caseId]/route.ts'))).toBe(true);
  });

  it('the KORA_ADMIN Case route (a separate, unrelated flow) is untouched', () => {
    expect(existsSync(join(process.cwd(), 'app/api/admin/cases/route.ts'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'app/api/admin/cases/[caseId]/route.ts'))).toBe(true);
  });

  it('the shared Operational Case primitive and service are untouched', () => {
    const src = readFileSync(join(process.cwd(), 'lib/operations/operational-case-service.ts'), 'utf-8');
    expect(src).toMatch(/export async function createOperationalCase/);
    expect(src).toMatch(/export async function transitionOperationalCaseStatus/);
    // assertAdvisorTiedToCompany() itself is retained (still the correct,
    // narrower check for its own remaining callers — none, post-retirement,
    // but the function is not deleted; only its sole insecure call site
    // via the raw route is gone) — no service-layer change was required
    // once the raw route itself was removed.
  });
});

describe('AUD-W2-ITEM-10a — Trial Readiness worker_profile_private query contract fixed', () => {
  const src = readFileSync(join(process.cwd(), 'app/api/admin/trial-readiness/route.ts'), 'utf-8');

  it('no longer selects a nonexistent tenant_id column from worker_profile_private', () => {
    // The defect was: .from('worker_profile_private').select('tenant_id, ...')
    const badPattern = /from\('worker_profile_private'\)\s*\n?\s*\.select\(['"]tenant_id/;
    expect(src).not.toMatch(badPattern);
  });

  it('resolves worker_profile_private rows by worker_id, not by a direct tenant_id column', () => {
    expect(src).toMatch(/from\('worker_profile_private'\)\s*\n?\s*\.select\(['"]worker_id/);
    expect(src).toMatch(/\.in\('worker_id', workerIds\)/);
  });

  it('attributes onboarding-complete counts to a tenant via the worker_identity id map, not a nonexistent column', () => {
    expect(src).toMatch(/workerIdToTenantId/);
    expect(src).toMatch(/workerIdToTenantId\.get\(p\.worker_id\) === tid/);
  });

  it('worker_identity is now selected with its own id (needed for the join), alongside tenant_id/status', () => {
    expect(src).toMatch(/from\('worker_identity'\)\s*\n?\s*\.select\('id, tenant_id, status'\)/);
  });

  it('still never selects or returns worker email, worker_ref, or private_note (privacy contract unchanged)', () => {
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/worker_ref|email|private_note/);
  });
});
