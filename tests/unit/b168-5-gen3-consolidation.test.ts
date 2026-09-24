/**
 * B168.5 Phase 2 — Gen 1 → Gen 3 Consolidation
 *
 * Structural tests verifying:
 * - 4 new drill-in pages exist with correct companyId param
 * - 5 Gen 1 pages are now redirects (no longer render components)
 * - Gen 1 components accept initialTenantCode prop
 * - Sidebar links updated to ?from= pattern
 * - Companies page handles ?from= param for contextual banner
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function exists(relPath: string): boolean {
  try { readFileSync(resolve(root, relPath)); return true; } catch { return false; }
}

// ── New drill-in pages existence ──────────────────────────────────────────────

describe('B168.5 Phase 2.2 — Gen 3 drill-in pages created', () => {

  it('workspace drill-in page exists', () => {
    expect(exists("app/admin/companies/[companyId]/workspace/page.tsx")).toBe(true);
  });

  it('preview drill-in page exists', () => {
    expect(exists("app/admin/companies/[companyId]/preview/page.tsx")).toBe(true);
  });

  it('evidence drill-in page exists', () => {
    expect(exists("app/admin/companies/[companyId]/evidence/page.tsx")).toBe(true);
  });

  it('submissions drill-in page exists', () => {
    expect(exists("app/admin/companies/[companyId]/submissions/page.tsx")).toBe(true);
  });
});

// ── Drill-in pages pass initialTenantCode ─────────────────────────────────────

describe('B168.5 Phase 2.2 — Drill-in pages wire initialTenantCode', () => {

  it('workspace page passes initialTenantCode={companyId}', () => {
    const src = read("app/admin/companies/[companyId]/workspace/page.tsx");
    expect(src).toContain('initialTenantCode={companyId}');
    expect(src).toContain('CompanyWorkspacePanel');
  });

  it('preview page passes initialTenantCode={companyId}', () => {
    const src = read("app/admin/companies/[companyId]/preview/page.tsx");
    expect(src).toContain('initialTenantCode={companyId}');
    expect(src).toContain('CompanyLivePreviewPanel');
  });

  it('evidence page passes initialTenantCode={companyId}', () => {
    const src = read("app/admin/companies/[companyId]/evidence/page.tsx");
    expect(src).toContain('initialTenantCode={companyId}');
    expect(src).toContain('CompanyEvidenceArchivePanel');
  });

  it('submissions page passes initialTenantCode={companyId}', () => {
    const src = read("app/admin/companies/[companyId]/submissions/page.tsx");
    expect(src).toContain('initialTenantCode={companyId}');
    expect(src).toContain('AdminSubmissionQueue');
  });

  it('all drill-in pages call requireKoraAdmin', () => {
    for (const route of ['workspace', 'preview', 'evidence', 'submissions']) {
      const src = read(`app/admin/companies/[companyId]/${route}/page.tsx`);
      expect(src, `${route} page missing requireKoraAdmin`).toContain('requireKoraAdmin');
    }
  });

  it('all drill-in pages call notFound() for unknown companyId', () => {
    for (const route of ['workspace', 'preview', 'evidence', 'submissions']) {
      const src = read(`app/admin/companies/[companyId]/${route}/page.tsx`);
      expect(src, `${route} page missing notFound()`).toContain('notFound()');
    }
  });
});

// ── Gen 1 standalone pages removed (B171 cleanup) ────────────────────────────

describe('B171 — Gen 1 standalone pages removed, components in components/admin/', () => {
  const gen1Folders = [
    'app/admin/company-workspace',
    'app/admin/company-live-preview',
    'app/admin/company-evidence-archive',
    'app/admin/company-submissions',
    'app/admin/company-users',
  ];

  for (const folder of gen1Folders) {
    it(`${folder}/ directory no longer exists (B171 cleanup)`, () => {
      expect(exists(`${folder}/page.tsx`)).toBe(false);
    });
  }

  it('CompanyWorkspacePanel lives in components/admin/', () => {
    expect(exists('components/admin/CompanyWorkspacePanel.tsx')).toBe(true);
  });

  it('CompanyLivePreviewPanel lives in components/admin/', () => {
    expect(exists('components/admin/CompanyLivePreviewPanel.tsx')).toBe(true);
  });

  it('CompanyEvidenceArchivePanel lives in components/admin/', () => {
    expect(exists('components/admin/CompanyEvidenceArchivePanel.tsx')).toBe(true);
  });

  it('AdminSubmissionQueue lives in components/admin/', () => {
    expect(exists('components/admin/AdminSubmissionQueue.tsx')).toBe(true);
  });
});

// ── Gen 1 components have initialTenantCode prop ─────────────────────────────

describe('B168.5 Phase 2.1 — Gen 1 components accept initialTenantCode prop', () => {

  it('CompanyWorkspacePanel Props includes initialTenantCode', () => {
    const src = read("components/admin/CompanyWorkspacePanel.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('showSelector');
  });

  it('CompanyWorkspacePanel pre-seeds tenantCode from prop', () => {
    const src = read("components/admin/CompanyWorkspacePanel.tsx");
    expect(src).toContain('useState(initialTenantCode ?? \'\')');
  });

  it('CompanyWorkspacePanel hides selector when prop present', () => {
    const src = read("components/admin/CompanyWorkspacePanel.tsx");
    expect(src).toContain('showSelector &&');
  });

  it('CompanyLivePreviewPanel accepts initialTenantCode prop', () => {
    const src = read("components/admin/CompanyLivePreviewPanel.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('showSelector');
    expect(src).toContain('useState(initialTenantCode ?? \'\')');
  });

  it('CompanyEvidenceArchivePanel accepts initialTenantCode prop with searchParams fallback', () => {
    const src = read("components/admin/CompanyEvidenceArchivePanel.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('initialTenantCode ?? searchParams');
  });

  it('AdminSubmissionQueue accepts initialTenantCode prop', () => {
    const src = read("components/admin/AdminSubmissionQueue.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('initialTenantCode');
  });

  it('AdminSubmissionQueue filters by tenantCode when prop present', () => {
    const src = read("components/admin/AdminSubmissionQueue.tsx");
    expect(src).toContain('s.tenantCode === initialTenantCode');
  });
});

// ── Sidebar updated ───────────────────────────────────────────────────────────

// B169 FASE 3: sidebar links restructured. Gen 1 ?from= query-param sidebar links replaced.
// - Evidence Archive: no longer a sidebar item (drill-in via CompanyTabNav Evidence tab)
// - Submission Queue: now at /admin/data-intake (Operations group)
// - Anteprima Live Cockpit: removed as RIDONDANTE (B169 FASE 4)
describe('B168.5 Phase 2.3 — Sidebar links restructured (B169 FASE 3+4)', () => {
  const sidebar     = read("components/layout/Sidebar.tsx");
  const adminNavGroups = read("lib/navigation/admin-nav-groups.ts");

  it('Evidence Archive ?from=evidence link no longer in sidebar (replaced by CompanyTabNav Evidence tab)', () => {
    expect(adminNavGroups).not.toContain("?from=evidence");
  });

  it('Submission Queue is now at /admin/data-intake (Operations group)', () => {
    expect(adminNavGroups).toContain("href: '/admin/data-intake'");
    expect(adminNavGroups).not.toContain("?from=submissions");
  });

  it('Anteprima Live Cockpit ?from=preview link removed (RIDONDANTE — B169 FASE 4)', () => {
    expect(adminNavGroups).not.toContain("?from=preview");
  });

  it('Gen 1 flat routes no longer in sidebar', () => {
    expect(sidebar).not.toContain("href: '/admin/company-live-preview'");
    expect(sidebar).not.toContain("href: '/admin/company-submissions'");
    expect(sidebar).not.toContain("href: '/admin/company-evidence-archive'");
  });
});

// ── Gen1 → Gen3 navigation residue closed ────────────────────────────────────
//
// B168.5 turned /admin/company-submissions into a redirect shim whose
// no-tenant branch went to /admin/companies?from=submissions; B171 then
// deleted the shim. Three Product entry points kept pointing at the deleted
// route (two missed by B171, one added afterwards), and a fourth was found in
// the Acme demo hub — so each 404'd. They now use the canonical entry the shim
// itself used. This closes the migration; it does not reinstate the flat page,
// and the aggregate capability (the API and AdminSubmissionQueue's no-filter
// mode) is untouched either way.

describe('B171 residue — no active Product navigation targets the retired flat route', () => {
  const CANONICAL = '/admin/companies?from=submissions';
  const RETIRED = '/admin/company-submissions';

  const ENTRY_POINTS: Array<[string, string]> = [
    ['app/admin/page.tsx', 'Admin console quick grid'],
    ['app/admin/pipeline/_components/PilotLifecycleClient.tsx', 'Pilot Lifecycle'],
    ['lib/admin-lifecycle/lifecycle-rules.ts', 'admin lifecycle rules'],
    ['app/admin/demo/acme-001/_components/AcmeDemoHub.tsx', 'Acme demo hub'],
  ];

  for (const [file, label] of ENTRY_POINTS) {
    it(`${label} uses the canonical Gen-3 entry`, () => {
      const src = read(file);
      expect(src, `${file} still targets the retired flat route`).toContain(CANONICAL);
      // The retired route must not survive as a navigation target. A quoted
      // occurrence is a link; the bare string may still appear in prose.
      for (const quoted of [`'${RETIRED}'`, `"${RETIRED}"`]) {
        expect(src, `${file} still links to ${RETIRED}`).not.toContain(quoted);
      }
    });
  }

  it('the retired page stays absent — B171 is not reversed', () => {
    expect(existsSync(resolve(root, 'app/admin/company-submissions'))).toBe(false);
  });

  it('the canonical company-scoped drill-in still exists', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/submissions/page.tsx'))).toBe(true);
  });

  it('the companies page still recognises from=submissions', () => {
    expect(read('app/admin/companies/page.tsx')).toContain('submissions:');
  });
});

// ── Companies page handles ?from= banner ─────────────────────────────────────

describe('B168.5 Phase 2.3 — Companies page renders contextual banner', () => {
  const src = read("app/admin/companies/page.tsx");

  it('companies page reads searchParams.from', () => {
    expect(src).toContain('searchParams');
    expect(src).toContain('from?:');
  });

  it('companies page renders FROM_LABELS banner', () => {
    expect(src).toContain('FROM_LABELS');
    expect(src).toContain('fromSection');
  });

  it('companies page covers workspace, preview, evidence, submissions, users in FROM_LABELS', () => {
    expect(src).toContain("workspace:");
    expect(src).toContain("preview:");
    expect(src).toContain("evidence:");
    expect(src).toContain("submissions:");
    expect(src).toContain("users:");
  });
});
