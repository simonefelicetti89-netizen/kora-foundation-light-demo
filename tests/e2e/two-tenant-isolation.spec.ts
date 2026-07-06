/**
 * PILOT-TWO-TENANT-ISOLATION-01 — Authenticated Two-Tenant Isolation Scaffold
 *
 * Scope: prove, once COMPANY_B exists, that a COMPANY_A session cannot
 * resolve COMPANY_B's tenant-scoped company-facing data and vice versa —
 * both through the rendered page and through a direct authenticated call
 * to the underlying `/api/company/*` route (server-side proof, not just
 * UI-hiding). See docs/E2E_TWO_TENANT_ISOLATION.md for full context.
 *
 * Skip-safe by construction: every test below reads credentials via
 * tests/e2e/helpers/env.ts and calls test.skip(...) before any network
 * activity if either COMPANY_A or COMPANY_B credentials are absent. As of
 * this sprint, COMPANY_B does not exist in any environment (see
 * docs/GOLDEN_PATH.md, docs/STATUS.md) — this file has never been run live.
 *
 * No mutation gate: every request here is a GET against read-only
 * `/api/company/*` summary endpoints (`workspace`, `kora-index/history`).
 * Nothing is uploaded, approved, scored, or written. This mirrors the
 * no-extra-gate precedent set by A01–A04 / G01/G02 (plain login + read
 * reachability checks), not GD01's `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN`
 * gate (which exists specifically because that test mutates real tenant
 * data). See docs/E2E_TWO_TENANT_ISOLATION.md for the explicit reasoning.
 *
 * Reused helpers only — no new login/env/privacy logic is introduced here:
 *   tests/e2e/helpers/env.ts, auth.ts, roles.ts, privacy.ts.
 */

import { test, expect } from 'playwright/test';
import { getCompanyACredentials, getCompanyBCredentials, guardBaseUrl } from './helpers/env';
import { ROLE_HOME } from './helpers/roles';
import { loginViaUI, assertReachedWorkspace } from './helpers/auth';
import { assertNoWorkerLevelIdentifiers, assertNoWorkerLevelIdentifiersInText } from './helpers/privacy';

interface CompanyWorkspaceResponse {
  ok: boolean;
  tenant: {
    id: string;
    tenantCode: string;
    companyName: string;
  };
}

test.describe('KORA — Two-Tenant Isolation (PILOT-TWO-TENANT-ISOLATION-01)', () => {

  test('T01 · COMPANY_A and COMPANY_B sessions resolve to disjoint tenant data via /api/company/workspace', async ({ browser }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const credsA = getCompanyACredentials();
    const credsB = getCompanyBCredentials();
    test.skip(
      !credsA || !credsB,
      'E2E_COMPANY_A_* / E2E_COMPANY_B_* non impostate entrambe — test saltato (COMPANY_B non esiste ancora, vedi docs/GOLDEN_PATH.md).',
    );

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      // Each session reaches its own company workspace, own browser context —
      // genuinely separate sessions, not the same page continuing.
      await loginViaUI(pageA, credsA!);
      await assertReachedWorkspace(pageA, ROLE_HOME.COMPANY);
      await assertNoWorkerLevelIdentifiers(pageA);

      await loginViaUI(pageB, credsB!);
      await assertReachedWorkspace(pageB, ROLE_HOME.COMPANY);
      await assertNoWorkerLevelIdentifiers(pageB);

      // Server-side proof (not merely rendered markup): call the same
      // read-only company API each session is entitled to, and confirm each
      // resolves only to its own tenant — this is the actual isolation
      // guarantee /api/company/workspace/route.ts documents in its own
      // header ("Tenant is ALWAYS derived from authenticated session ...
      // NEVER accepts tenantId from query params or request body").
      const responseA = await pageA.request.get('/api/company/workspace');
      const responseB = await pageB.request.get('/api/company/workspace');

      expect(responseA.ok(), 'COMPANY_A /api/company/workspace must succeed for its own session').toBe(true);
      expect(responseB.ok(), 'COMPANY_B /api/company/workspace must succeed for its own session').toBe(true);

      const bodyA = (await responseA.json()) as CompanyWorkspaceResponse;
      const bodyB = (await responseB.json()) as CompanyWorkspaceResponse;

      assertNoWorkerLevelIdentifiersInText(JSON.stringify(bodyA), '/api/company/workspace response (COMPANY_A session)');
      assertNoWorkerLevelIdentifiersInText(JSON.stringify(bodyB), '/api/company/workspace response (COMPANY_B session)');

      expect(bodyA.tenant.tenantCode, 'tenant code must not be empty').not.toEqual('');
      expect(bodyB.tenant.tenantCode, 'tenant code must not be empty').not.toEqual('');
      expect(bodyA.tenant.tenantCode, 'COMPANY_A must never resolve to COMPANY_B\'s tenant code').not.toEqual(bodyB.tenant.tenantCode);
      expect(bodyA.tenant.companyName, 'COMPANY_A must never resolve to COMPANY_B\'s company name').not.toEqual(bodyB.tenant.companyName);
      expect(bodyA.tenant.id, 'COMPANY_A must never resolve to COMPANY_B\'s tenant id').not.toEqual(bodyB.tenant.id);

      // If the operator supplied the expected tenant codes, pin each session
      // to the tenant it is actually supposed to be — not just "different
      // from each other" (two wrong-but-different tenants would otherwise
      // pass the checks above).
      if (credsA!.tenantCode) {
        expect(bodyA.tenant.tenantCode).toEqual(credsA!.tenantCode);
      }
      if (credsB!.tenantCode) {
        expect(bodyB.tenant.tenantCode).toEqual(credsB!.tenantCode);
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('T02 · /api/company/* ignores a client-supplied foreign tenant identifier (cross-tenant injection has no effect)', async ({ page }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const credsA = getCompanyACredentials();
    const credsB = getCompanyBCredentials();
    test.skip(
      !credsA || !credsB || !credsB?.tenantCode,
      'E2E_COMPANY_A_* / E2E_COMPANY_B_* (+ E2E_COMPANY_B_TENANT_CODE) non impostate — test saltato.',
    );

    // Current /api/company/* routes (workspace, kora-index/history) take no
    // tenant selector at all — tenant is derived solely from the session's
    // app_metadata.kora_tenant_id (confirmed by source inspection of both
    // route files as part of this sprint's read-only analysis). There is no
    // real "switch tenant" parameter to attack, so the strongest honest proxy
    // for a cross-tenant access attempt is: supply COMPANY_B's tenant code
    // as a query parameter on a COMPANY_A session, on every plausible
    // parameter name, and confirm the response is unaffected — i.e. the
    // server never even looks at it, rather than rejecting it after looking.
    await loginViaUI(page, credsA!);
    await assertReachedWorkspace(page, ROLE_HOME.COMPANY);

    const foreignTenantCode = credsB!.tenantCode!;
    const candidateParamNames = ['tenantId', 'tenant_id', 'tenantCode', 'tenant_code', 'companyId', 'company_id'];

    for (const paramName of candidateParamNames) {
      const response = await page.request.get('/api/company/workspace', {
        params: { [paramName]: foreignTenantCode },
      });
      expect(response.ok(), `/api/company/workspace?${paramName}=<foreign> must still succeed for the caller's own session`).toBe(true);
      const body = (await response.json()) as CompanyWorkspaceResponse;

      expect(
        body.tenant.tenantCode,
        `/api/company/workspace?${paramName}=<COMPANY_B tenant code> must never resolve to COMPANY_B's tenant — server must ignore client-supplied tenant hints entirely`,
      ).not.toEqual(foreignTenantCode);

      if (credsA!.tenantCode) {
        expect(
          body.tenant.tenantCode,
          `/api/company/workspace?${paramName}=<foreign> must still resolve to the caller's own tenant (COMPANY_A), not be altered by the query param`,
        ).toEqual(credsA!.tenantCode);
      }
    }
  });

});
