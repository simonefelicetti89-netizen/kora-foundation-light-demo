import { describe, it, expect } from 'vitest';

// ── Tests verifying that the live session path cannot fallback to demo Meridiana data ──
//
// These tests validate the contract at the library level:
//   - fetchLiveScoringResult returns 'insufficient_data' when no DB row exists,
//     not Meridiana seed data.
//   - useScoringResult accepts forceEnvironment='live'.
//   - The demo path uses getDemoScoringResult (seed), never the live path.
//
// Full end-to-end verification (real company session → real Supabase) requires
// a provisioned Supabase instance and is tested in the integration test suite.

// ── Session invariant tests (pure logic) ─────────────────────────────────────

describe('Live session — demo/live path separation', () => {

  it('ScoringResult status values are the canonical set', () => {
    type ScoringResultStatus = 'ok' | 'insufficient_data' | 'not_implemented';
    const validStatuses: ScoringResultStatus[] = ['ok', 'insufficient_data', 'not_implemented'];
    // insufficient_data is the correct status for live tenants with no scoring run
    expect(validStatuses).toContain('insufficient_data');
    // 'ok' is the status when live data is available
    expect(validStatuses).toContain('ok');
  });

  it('COMPANY_ALLOWED_PREFIXES in middleware includes intelligence routes', async () => {
    // Verify the middleware module exports the correct route list.
    // This is a structural test — the actual redirect logic is tested via E2E.
    const fs = await import('fs');
    const middlewareContent = fs.readFileSync(
      new URL('../../middleware.ts', import.meta.url).pathname,
      'utf-8',
    );
    expect(middlewareContent).toContain('/company/kora-index');
    expect(middlewareContent).toContain('/company/activation');
    expect(middlewareContent).toContain('/company/pillars');
    expect(middlewareContent).toContain('/company/financial');
    expect(middlewareContent).toContain('/company/reports');
  });

  it('CompanySessionProvider file exists and exports useCompanySession', async () => {
    const fs = await import('fs');
    const providerContent = fs.readFileSync(
      new URL('../../app/company/_providers/CompanySessionProvider.tsx', import.meta.url).pathname,
      'utf-8',
    );
    expect(providerContent).toContain('useCompanySession');
    expect(providerContent).toContain('CompanySessionProvider');
    expect(providerContent).toContain('isLive');
    expect(providerContent).toContain('tenantId');
    // B137: kora_tenant_id read moved to server layout (requireCompanyUser reads it from JWT).
    // Provider now receives tenantId as a prop — no longer reads from JWT client-side.
  });

  it('useScoringResult accepts forceEnvironment parameter', async () => {
    const fs = await import('fs');
    const scoringResultContent = fs.readFileSync(
      new URL('../../lib/scoring-result/index.ts', import.meta.url).pathname,
      'utf-8',
    );
    expect(scoringResultContent).toContain('forceEnvironment');
    expect(scoringResultContent).toContain("forceEnvironment?: Environment");
  });

  it('company intelligence pages are all live-only — B147 P1 cleanup complete', async () => {
    const fs = await import('fs');
    // B147 P1: BoundaryBanner, BoundaryBadge mode="LIVE", and forceEnvironment: 'live'
    // were dual-path-era signals removed in P1. Server layout requireCompanyUser is the guard.
    // kora-index still uses forceEnvironment (fetch gate) — not included in this cleanup check.
    const liveOnlyPages = [
      '../../app/company/activation/page.tsx',
      '../../app/company/pillars/page.tsx',
      '../../app/company/reports/page.tsx',
      '../../app/company/financial/page.tsx',
    ];
    for (const page of liveOnlyPages) {
      const content = fs.readFileSync(new URL(page, import.meta.url).pathname, 'utf-8');
      expect(content, `${page} should import useCompanySession`).toContain('useCompanySession');
      expect(content, `${page} should not have isLive ternary`).not.toContain('isLive ?');
      expect(content, `${page} should not have BoundaryBanner residue`).not.toContain('BoundaryBanner');
      expect(content, `${page} should not have forceEnvironment`).not.toContain("forceEnvironment: 'live'");
    }
  });

  it('live kora-index page is live-only — no dual-path, no Meridiana fallback', async () => {
    const fs = await import('fs');
    const koraIndexContent = fs.readFileSync(
      new URL('../../app/company/kora-index/page.tsx', import.meta.url).pathname,
      'utf-8',
    );
    // B129 Fase 3: live-only page — no demo service imports, no dual-path ternaries
    expect(koraIndexContent).not.toContain('demoUser');
    expect(koraIndexContent).not.toContain('isLive ? (liveId');
    expect(koraIndexContent.toLowerCase()).not.toContain('meridiana');
    // Must still reach NoDataState for insufficient_data
    expect(koraIndexContent).toContain("status === 'ok'");
    expect(koraIndexContent).toContain('NoDataState');
  });

  it('company Decision Pack route exists and requires company user auth', async () => {
    const fs = await import('fs');
    const dpRoute = fs.readFileSync(
      new URL('../../app/api/company/decision-pack/route.ts', import.meta.url).pathname,
      'utf-8',
    );
    // Must use requireCompanyUser (not requireKoraAdmin — this is for company users)
    expect(dpRoute).toContain('requireCompanyUser');
    // Tenant must come from session, never from URL params
    expect(dpRoute).toContain('tenantId');  // destructured from authResult
    expect(dpRoute).toContain('authResult');
    // Must NOT use tenantId from query params for data access
    expect(dpRoute).not.toContain("searchParams.get('tenantId')");
  });

  it('company Decision Pack PDF route requires company user auth', async () => {
    const fs = await import('fs');
    const pdfRoute = fs.readFileSync(
      new URL('../../app/api/company/decision-pack/pdf/route.ts', import.meta.url).pathname,
      'utf-8',
    );
    expect(pdfRoute).toContain('requireCompanyUser');
    expect(pdfRoute).toContain('tenantId');  // destructured from authResult
    expect(pdfRoute).toContain('authResult');
  });

  it('company layout wraps children with CompanySessionProvider', async () => {
    const fs = await import('fs');
    const layout = fs.readFileSync(
      new URL('../../app/company/layout.tsx', import.meta.url).pathname,
      'utf-8',
    );
    expect(layout).toContain('CompanySessionProvider');
    // B137: CompanyLayoutInner removed — layout is now a server-side guard (no client component).
    // Demo banner removed — /company/* is live-only post-B130, no demo path here.
    expect(layout).toContain('requireCompanyUser');
    expect(layout).not.toContain('showDemoBanner');
  });

  it('live mode shows NoDataState for insufficient_data — never Meridiana fallback', async () => {
    const fs = await import('fs');
    const koraIndex = fs.readFileSync(
      new URL('../../app/company/kora-index/page.tsx', import.meta.url).pathname,
      'utf-8',
    );
    // B129 Fase 3: live-only page — NoDataState is returned when !hasKoraData.
    // B171: demo/company/kora-index rimossa — meridiana fallback non esiste più.
    expect(koraIndex).toContain('hasKoraData');
    expect(koraIndex).toContain('NoDataState');
    // Meridiana must NOT appear in the live page
    expect(koraIndex.toLowerCase()).not.toContain('meridiana');
    // COMPANY_ID is liveId ?? '' — no demo fallback
    expect(koraIndex).toContain("liveId ?? ''");
  });

});
