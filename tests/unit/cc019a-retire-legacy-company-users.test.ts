/**
 * CC-019A — Retire Legacy Company Users Surface (2026-08-31).
 *
 * First implementation sub-slice of CC-019 (One Truth Seed Group #2 —
 * TenantService / legacy [companyId] tenant-identity cluster decomposition).
 * CC-019A is a sub-slice label, not a new Master Plan CC number.
 *
 * Retires app/admin/companies/[companyId]/users/page.tsx — a 100% synthetic,
 * read-only demo account display (TenantService + AccountProvisioningService)
 * whose only "create user" CTA pointed at an already-broken flat route
 * (/admin/company-users, unrelated pre-existing dangling link, untouched
 * here). A real, more capable replacement already existed and was left
 * untouched: app/admin/company-users-live (Supabase-backed
 * /api/admin/company-users — real GET/POST/PATCH, independent of
 * TenantService/AccountProvisioningService).
 *
 * The Users tab was removed from CompanyTabNav rather than relinked:
 * company-users-live is keyed by tenantId (analytics.tenant.id, a UUID),
 * while the tab nav only carries tenant_code (companyId) — bridging the two
 * would require inventing a new resolver, out of scope for this slice.
 *
 * If any of these assertions start failing, the underlying situation has
 * changed — re-run the audit rather than "fixing" this test to match.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

describe('CC-019A — legacy page no longer exists', () => {
  it('app/admin/companies/[companyId]/users/page.tsx is gone', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/users/page.tsx'))).toBe(false);
  });

  it('the now-empty users/ directory is gone too', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/users'))).toBe(false);
  });
});

describe('CC-019A — no runtime navigation points at the retired route', () => {
  it('CompanyTabNav no longer defines a Users tab', () => {
    const src = read('app/admin/companies/[companyId]/_components/CompanyTabNav.tsx');
    expect(src).not.toContain("slug: 'users'");
    expect(src).not.toContain("label: 'Users'");
  });

  it('CompanyTabNav still defines the 4 remaining canonical tabs', () => {
    const src = read('app/admin/companies/[companyId]/_components/CompanyTabNav.tsx');
    for (const slug of ['workspace', 'preview', 'submissions', 'evidence']) {
      expect(src).toContain(`slug: '${slug}'`);
    }
  });

  it('admin/pipeline no longer links to the retired route', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).not.toContain('/users`');
    expect(src).not.toContain("label: 'Utenti Aziendali'");
  });

  it('admin/pipeline keeps its other quick links untouched', () => {
    // B-TRUTH TenantService Canonical Migration (2026-09-04) moved this
    // content from page.tsx into the new client component it renders.
    const src = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(src).toContain("label: 'Worker Provisioning (live)'");
    expect(src).toContain("label: 'Submission Queue'");
    expect(src).toContain("label: 'UEF Review & Scoring'");
  });
});

describe('CC-019A — canonical replacement remains intact, untouched', () => {
  it('app/admin/company-users-live still exists', () => {
    expect(existsSync(resolve(root, 'app/admin/company-users-live/page.tsx'))).toBe(true);
  });

  it('company-users-live is keyed by tenantId (a UUID), read-only per its own header', () => {
    const src = read('app/admin/company-users-live/page.tsx');
    expect(src).toContain('tenantId');
    expect(src).toContain('Read-only');
  });

  it('the backing API (/api/admin/company-users) is untouched and remains independent of TenantService/AccountProvisioningService', () => {
    const src = read('app/api/admin/company-users/route.ts');
    expect(src).not.toContain('TenantService');
    expect(src).not.toContain('AccountProvisioningService');
    expect(src).toContain('getSupabaseServiceClient');
  });
});

describe('CC-019A — the legacy synthetic subsystem was not migrated into the live route', () => {
  it('company-users-live has no real TenantService/AccountProvisioningService import (prose mentions in its own explanatory header comment are not a violation)', () => {
    const page = read('app/admin/company-users-live/page.tsx');
    const panel = read('app/admin/company-users-live/_components/CompanyUsersPanel.tsx');
    const importPattern = /from\s*['"][^'"]*(TenantService|AccountProvisioningService)['"]/;
    for (const src of [page, panel]) {
      expect(src).not.toMatch(importPattern);
    }
  });
});

describe('CC-019A — TenantService and AccountProvisioningService implementations were not touched', () => {
  // TenantService.ts was accurately untouched by CC-019A at the time this
  // test was written. B-TRUTH TenantService Canonical Migration
  // (2026-09-04), a later, unrelated slice, retired it entirely (all 3 real
  // callers migrated to canonical analytics.tenant reads). See
  // tests/unit/b-truth-tenantservice-canonical-migration.test.ts. That same
  // migration split app/admin/pipeline/page.tsx into a thin Server
  // Component (page.tsx) plus a new client component
  // (_components/PilotLifecycleClient.tsx) that now holds the
  // still-unmigrated accountProvisioningService call checked below —
  // page.tsx itself no longer contains it.
  it('TenantService.ts has been retired (historical note, not a live assertion of this test)', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
  });

  // PilotLifecycleClient.tsx was accurately a real caller of
  // accountProvisioningService at the time this test was written. B-TRUTH
  // AccountProvisioningService Pipeline Role Migration (2026-09-06) later,
  // separately, migrated that one pipeline-only call
  // (getAccountsForCompany()) to a canonical Supabase Auth read — see
  // lib/live/account-provisioning-status-view.ts. The service itself
  // remains alive (NARROWED, not retired) solely for its other real caller,
  // app/my-kora/page.tsx's My KORA/session-identity role
  // (getCurrentDemoUser()), which is untouched. See
  // tests/unit/b-truth-accountprovisioning-pipeline-role-migration.test.ts
  // for the current, correct state.
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): also
  // asserted app/my-kora/page.tsx contained 'accountProvisioningService'.
  // CC-00 Final Scoring Canonicalization (2026-09-05) removed that page's
  // getCurrentDemoUser() call — it only ever fed the now-retired
  // scoringSimulatorService.getCompanyAggregate(). The service file itself
  // was untouched at that time (not modified, not deleted); it then simply
  // had zero real callers. See
  // tests/unit/cc00-final-scoring-canonicalization.test.ts. B-WORKER
  // AccountProvisioning dead-code retirement (2026-09-06, a later, separate
  // slice) exhaustively re-verified zero real callers across all 18
  // remaining methods and deleted the file entirely. See
  // tests/unit/bworker-accountprovisioning-retirement.test.ts.
  it('AccountProvisioningService.ts no longer exists, and PilotLifecycleClient.tsx does not reference it', () => {
    expect(existsSync(resolve(root, 'services/account/AccountProvisioningService.ts'))).toBe(false);
    const pipelineSrc = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    const pipelineCodeOnly = pipelineSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(pipelineCodeOnly).not.toMatch(/accountProvisioningService\s*\./);
  });
});

// CC-019A's own "layout.tsx deferred to CC-019B" assertion was SUPERSEDED the
// same week by CC-019B itself landing — see
// tests/unit/cc019b-canonicalize-gen3-tenant-identity.test.ts for the current,
// correct state (layout.tsx now queries analytics.tenant directly, no
// TenantService import).
