import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B80-B — Platform Boundary Clarity: unit tests ────────────────────────────
//
// Task 1: lib/platform-boundaries.ts — BoundaryMode type + constants
// Task 2: Admin sidebar — LIVE OPERATIONS / Demo Preview groups
// Task 3: inactive/comingSoon items → non-navigable (no <Link>)
// Task 4: Boundary badges on admin LIVE pages
// Task 5: Board-pack route redirects to canonical Decision Pack
// Task 6: docs/platform-boundaries.md exists with LIVE/DEMO/PREVIEW/FUTURE definitions
// Task 7: Dual-path comments on company pages
// Task 8: Worker pages show PREVIEW boundary label

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── Task 1: lib/platform-boundaries.ts ───────────────────────────────────────

describe('B80-B Task 1 — platform-boundaries.ts constants', () => {
  const src = read('lib/platform-boundaries.ts');

  it('exports BoundaryMode type with all 4 modes', () => {
    expect(src).toContain("'LIVE'");
    expect(src).toContain("'DEMO'");
    expect(src).toContain("'PREVIEW'");
    expect(src).toContain("'FUTURE_VISION'");
  });

  it('exports BOUNDARY_LABEL with all 4 modes', () => {
    expect(src).toContain('BOUNDARY_LABEL');
    expect(src).toContain('DATI LIVE');
    expect(src).toContain('DATI DEMO');
    expect(src).toContain('PREVIEW');
    expect(src).toContain('FUTURE VISION');
  });

  it('exports BOUNDARY_BADGE_STYLE_DARK', () => {
    expect(src).toContain('BOUNDARY_BADGE_STYLE_DARK');
  });

  it('exports BOUNDARY_BADGE_STYLE_LIGHT', () => {
    expect(src).toContain('BOUNDARY_BADGE_STYLE_LIGHT');
  });

  it('exports BOUNDARY_BANNER_STYLE for LIVE and DEMO', () => {
    expect(src).toContain('BOUNDARY_BANNER_STYLE');
  });
});

// ── Task 1: BoundaryBadge component ──────────────────────────────────────────

describe('B80-B — BoundaryBadge component', () => {
  const src = read('components/ui/BoundaryBadge.tsx');

  it('accepts mode prop typed as BoundaryMode', () => {
    expect(src).toContain('BoundaryMode');
    expect(src).toContain('mode');
  });

  it('accepts variant prop (dark/light)', () => {
    expect(src).toContain('variant');
    expect(src).toContain("'dark'");
    expect(src).toContain("'light'");
  });

  it('accepts suffix prop', () => {
    expect(src).toContain('suffix');
  });

  it('accepts style prop', () => {
    expect(src).toContain('React.CSSProperties');
  });

  it('renders label from BOUNDARY_LABEL', () => {
    expect(src).toContain('BOUNDARY_LABEL');
  });
});

// ── Task 1: BoundaryBanner component ─────────────────────────────────────────

describe('B80-B — BoundaryBanner component', () => {
  const src = read('components/ui/BoundaryBanner.tsx');

  it('accepts isLive prop', () => {
    expect(src).toContain('isLive');
  });

  it('accepts liveLabel and demoLabel props', () => {
    expect(src).toContain('liveLabel');
    expect(src).toContain('demoLabel');
  });

  it('uses BOUNDARY_BANNER_STYLE', () => {
    expect(src).toContain('BOUNDARY_BANNER_STYLE');
  });

  it('has role=status for accessibility', () => {
    expect(src).toContain('role="status"');
  });
});

// ── Task 2+3: Admin sidebar restructure ───────────────────────────────────────

describe('B80-B Task 2+3 — Admin sidebar LIVE/DEMO groups + non-navigable items', () => {
  const src = read('components/layout/Sidebar.tsx');

  it('has Provisioning group heading', () => {
    expect(src).toContain('Provisioning');
  });

  it('has Demo & Preview group heading (B154-B renamed from Demo · Sintetico)', () => {
    expect(src).toContain('Demo & Preview');
  });

  it('has Future Vision group heading', () => {
    expect(src).toContain('Future Vision');
  });

  it('renders disabled items as aria-hidden div with no pointer events', () => {
    expect(src).toContain('aria-hidden="true"');
    // inline style object uses camelCase string value
    expect(src).toContain("'not-allowed'");
    expect(src).toContain("'none'");
  });

  it('does not render inactive items as <Link> — uses div instead', () => {
    // The disabled path renders a div, not a navigable Link
    expect(src).toContain('if (isDisabled)');
    expect(src).toContain('aria-hidden="true"');
  });

  it('uses internal BADGE style map for group badges', () => {
    // Sidebar renders group badges via its own internal BADGE constant, not BoundaryBadge
    expect(src).toContain('BADGE');
    expect(src).toContain('badgeKey');
  });
});

// ── Task 4: Boundary badges on admin LIVE pages ───────────────────────────────

describe('B80-B Task 4 — Admin LIVE pages have LIVE boundary badge', () => {
  const livePaths = [
    'app/admin/uef-review/_components/UefReviewQueue.tsx',
    'app/admin/data-intake/_components/DataIntakeStudio.tsx',
    'app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx',
    'app/admin/company-users/_components/CompanyUserProvisioningPanel.tsx',
    'app/admin/tenants/_components/TenantOnboardingPanel.tsx',
    'app/admin/data-lifecycle/_components/DataLifecyclePanel.tsx',
    'app/admin/company-submissions/_components/AdminSubmissionQueue.tsx',
    'app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel.tsx',
    'app/admin/companies/new/_components/CreateLiveCompanyForm.tsx',
    'app/admin/impact-units/_components/ImpactUnitsExplorer.tsx',
    'app/admin/workers/_components/WorkersAdminClient.tsx',
  ];

  for (const filePath of livePaths) {
    it(`${filePath} imports BoundaryBadge`, () => {
      const src = read(filePath);
      expect(src).toContain('BoundaryBadge');
    });

    it(`${filePath} renders LIVE mode badge`, () => {
      const src = read(filePath);
      expect(src).toContain("mode=\"LIVE\"");
    });
  }
});

describe('B80-B Task 4 — Admin DEMO pages have DEMO boundary badge', () => {
  it('admin main page has DEMO badge', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain("mode=\"DEMO\"");
  });

  it('ACME demo hub has DEMO badge', () => {
    const src = read('app/admin/demo/acme-001/_components/AcmeDemoHub.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain("mode=\"DEMO\"");
  });
});

describe('B80-B Task 4 — Company live-only pages: no dual-path-era boundary residues (B147 P1)', () => {
  // B147 P1: BoundaryBanner isLive={true} and BoundaryBadge mode="LIVE" were dual-path-era
  // signals. Removed from all company live-only pages — server layout is the only auth gate.
  // kora-index keeps BoundaryBadge (status indicator) but loses BoundaryBanner.
  const liveOnlyPaths = [
    'app/company/activation/page.tsx',
    'app/company/pillars/page.tsx',
    'app/company/reports/page.tsx',
    'app/company/financial/page.tsx',
  ];

  for (const filePath of liveOnlyPaths) {
    it(`${filePath} has no BoundaryBanner or isLive={true} (B147 P1 cleanup)`, () => {
      const src = read(filePath);
      expect(src).not.toContain('BoundaryBanner');
      expect(src).not.toContain('BoundaryBadge');
      expect(src).not.toContain('isLive={true}');
      expect(src).not.toContain('isLive ?');
    });
  }

  it('kora-index keeps BoundaryBadge (status) but loses BoundaryBanner (B147 P1)', () => {
    const src = read('app/company/kora-index/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).not.toContain('BoundaryBanner');
    expect(src).not.toContain('isLive={true}');
  });
});

// B130: All company intelligence pages are now live-only. No remaining dual-path pages.

describe('B80-B Task 4 — Company executive cockpit (B133: migrated to live nav hub)', () => {
  it('company page has no DEMO badge — B133 removed demo cockpit content, page is now live nav hub', () => {
    const src = read('app/company/page.tsx');
    expect(src).not.toContain("mode=\"DEMO\"");
    expect(src).toContain('useCompanySession');
  });
});

// ── Task 7: Dual-path comments on company pages ───────────────────────────────

describe('B80-B Task 7 — All company intelligence pages are now live-only (no dual-path)', () => {
  // B130: all five pages migrated — no remaining dual-path comments

  it('app/company/kora-index/page.tsx is live-only (no B80-B dual-path comment)', () => {
    const src = read('app/company/kora-index/page.tsx');
    expect(src).toContain('C-02');
    expect(src).not.toContain('B80-B dual-path');
  });

  it('app/company/activation/page.tsx is live-only (no B80-B dual-path comment)', () => {
    const src = read('app/company/activation/page.tsx');
    expect(src).toContain('C-08');
    expect(src).not.toContain('B80-B dual-path');
  });

  it('app/company/pillars/page.tsx is live-only (no B80-B dual-path comment)', () => {
    const src = read('app/company/pillars/page.tsx');
    expect(src).toContain('C-05');
    expect(src).not.toContain('B80-B dual-path');
  });

  it('app/company/reports/page.tsx is live-only (no B80-B dual-path comment)', () => {
    const src = read('app/company/reports/page.tsx');
    expect(src).toContain('C-09');
    expect(src).not.toContain('B80-B dual-path');
  });

  it('app/company/financial/page.tsx is live-only (no B80-B dual-path comment)', () => {
    const src = read('app/company/financial/page.tsx');
    expect(src).toContain('C-06');
    expect(src).not.toContain('B80-B dual-path');
  });
});

// ── Worker pages: PREVIEW boundary label ──────────────────────────────────────

describe('B80-B — Worker pages show PREVIEW boundary label', () => {
  const workerPaths = [
    'app/my-kora/page.tsx',
    'app/my-kora/dynamic-cv/page.tsx',
    'app/my-kora/opportunities/page.tsx',
    'app/my-kora/privacy/page.tsx',
    'app/my-kora/collective/page.tsx',
  ];

  for (const filePath of workerPaths) {
    it(`${filePath} imports BoundaryBadge`, () => {
      const src = read(filePath);
      expect(src).toContain('BoundaryBadge');
    });

    it(`${filePath} renders PREVIEW mode badge`, () => {
      const src = read(filePath);
      expect(src).toContain("mode=\"PREVIEW\"");
    });
  }
});

// ── Partner/Advisor pages: DEMO boundary label ────────────────────────────────

describe('B80-B — Partner and Advisor pages have DEMO badge', () => {
  it('partner page has DEMO badge', () => {
    const src = read('app/partner/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain("mode=\"DEMO\"");
  });

  it('advisor page has DEMO badge', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain("mode=\"DEMO\"");
  });
});

// ── Task 5: Board-pack route redirects ────────────────────────────────────────

describe('B80-B Task 5 — Board-pack route canonicalization', () => {
  const src = read('app/company/reports/board-pack/page.tsx');

  it('imports redirect from next/navigation', () => {
    expect(src).toContain("from 'next/navigation'");
    expect(src).toContain('redirect');
  });

  it('redirects to canonical Decision Pack route', () => {
    expect(src).toContain('/api/company/decision-pack');
  });

  it('no longer contains hardcoded Meridiana S1 values', () => {
    expect(src).not.toContain('Meridiana Group S.r.l.');
    expect(src).not.toContain('Q1–Q3 2025');
    expect(src).not.toContain('S1 Baseline');
  });

  it('no longer exports old component with hardcoded data', () => {
    expect(src).not.toContain('COMPANY   =');
    expect(src).not.toContain('PERIOD    =');
    expect(src).not.toContain('SCENARIO  =');
  });
});

// ── Task 6: docs/platform-boundaries.md ──────────────────────────────────────

describe('B80-B Task 6 — docs/platform-boundaries.md', () => {
  it('file exists', () => {
    expect(exists('docs/platform-boundaries.md')).toBe(true);
  });

  const doc = exists('docs/platform-boundaries.md') ? read('docs/platform-boundaries.md') : '';

  it('defines LIVE mode', () => {
    expect(doc).toContain('LIVE');
    expect(doc).toContain('Supabase');
  });

  it('defines DEMO mode', () => {
    expect(doc).toContain('DEMO');
    expect(doc).toContain('Synthetic');
  });

  it('defines PREVIEW mode', () => {
    expect(doc).toContain('PREVIEW');
  });

  it('defines FUTURE VISION mode', () => {
    expect(doc).toContain('FUTURE');
  });

  it('documents dual-path pages', () => {
    expect(doc).toContain('DUAL-PATH');
  });

  it('documents deprecated board-pack route', () => {
    expect(doc).toContain('board-pack');
    expect(doc).toContain('REDIRECTS');
  });

  it('has guidance for Next on what to reuse vs ignore', () => {
    expect(doc).toContain('Reuse');
    expect(doc).toContain('Ignore');
  });
});

// ── Invariant checks: no methodology/scoring changes ─────────────────────────

describe('B80-B invariants — no forbidden changes', () => {
  it('lib/platform-boundaries.ts contains no IU formula or scoring logic', () => {
    const src = read('lib/platform-boundaries.ts');
    expect(src).not.toContain('IU_');
    expect(src).not.toContain('AGF');
    expect(src).not.toContain('computeScore');
  });

  it('BoundaryBadge contains no scoring logic', () => {
    const src = read('components/ui/BoundaryBadge.tsx');
    expect(src).not.toContain('IU_');
    expect(src).not.toContain('computeScore');
    expect(src).not.toContain('supabase');
  });

  it('BoundaryBanner contains no scoring logic', () => {
    const src = read('components/ui/BoundaryBanner.tsx');
    expect(src).not.toContain('IU_');
    expect(src).not.toContain('computeScore');
    expect(src).not.toContain('supabase');
  });

  it('board-pack page contains no SQL or Prisma artifacts', () => {
    const src = read('app/company/reports/board-pack/page.tsx');
    expect(src).not.toContain('prisma');
    expect(src).not.toContain('CREATE TABLE');
    expect(src).not.toContain('supabase');
  });
});
