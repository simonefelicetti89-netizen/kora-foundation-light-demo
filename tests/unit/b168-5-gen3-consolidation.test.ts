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
import { readFileSync } from 'fs';
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

// ── Gen 1 standalone pages are redirects ──────────────────────────────────────

describe('B168.5 Phase 2.3 — Gen 1 pages converted to redirects', () => {

  it('company-workspace page uses redirect, not panel render', () => {
    const src = read("app/admin/company-workspace/page.tsx");
    expect(src).toContain('redirect(');
    expect(src).not.toContain('<CompanyWorkspacePanel');
  });

  it('company-workspace redirects to drill-in when tenantCode present', () => {
    const src = read("app/admin/company-workspace/page.tsx");
    expect(src).toContain('/admin/companies/');
    expect(src).toContain('/workspace');
    expect(src).toContain('tenantCode');
  });

  it('company-workspace redirects to ?from=workspace when no tenantCode', () => {
    const src = read("app/admin/company-workspace/page.tsx");
    expect(src).toContain('?from=workspace');
  });

  it('company-live-preview page uses redirect, not panel render', () => {
    const src = read("app/admin/company-live-preview/page.tsx");
    expect(src).toContain('redirect(');
    expect(src).not.toContain('<CompanyLivePreviewPanel');
  });

  it('company-live-preview redirects to ?from=preview when no tenantCode', () => {
    const src = read("app/admin/company-live-preview/page.tsx");
    expect(src).toContain('?from=preview');
  });

  it('company-evidence-archive page uses redirect, not panel render', () => {
    const src = read("app/admin/company-evidence-archive/page.tsx");
    expect(src).toContain('redirect(');
    expect(src).not.toContain('<CompanyEvidenceArchivePanel');
  });

  it('company-evidence-archive redirects to ?from=evidence when no tenantCode', () => {
    const src = read("app/admin/company-evidence-archive/page.tsx");
    expect(src).toContain('?from=evidence');
  });

  it('company-submissions page uses redirect, not panel render', () => {
    const src = read("app/admin/company-submissions/page.tsx");
    expect(src).toContain('redirect(');
    expect(src).not.toContain('<AdminSubmissionQueue');
  });

  it('company-submissions redirects to ?from=submissions when no tenantCode', () => {
    const src = read("app/admin/company-submissions/page.tsx");
    expect(src).toContain('?from=submissions');
  });

  it('company-users page uses redirect, not panel render', () => {
    const src = read("app/admin/company-users/page.tsx");
    expect(src).toContain('redirect(');
    expect(src).not.toContain('<CompanyUserProvisioningPanel');
  });

  it('company-users redirects to ?from=users when no tenantCode', () => {
    const src = read("app/admin/company-users/page.tsx");
    expect(src).toContain('?from=users');
  });
});

// ── Gen 1 components have initialTenantCode prop ─────────────────────────────

describe('B168.5 Phase 2.1 — Gen 1 components accept initialTenantCode prop', () => {

  it('CompanyWorkspacePanel Props includes initialTenantCode', () => {
    const src = read("app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('showSelector');
  });

  it('CompanyWorkspacePanel pre-seeds tenantCode from prop', () => {
    const src = read("app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx");
    expect(src).toContain('useState(initialTenantCode ?? \'\')');
  });

  it('CompanyWorkspacePanel hides selector when prop present', () => {
    const src = read("app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx");
    expect(src).toContain('showSelector &&');
  });

  it('CompanyLivePreviewPanel accepts initialTenantCode prop', () => {
    const src = read("app/admin/company-live-preview/_components/CompanyLivePreviewPanel.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('showSelector');
    expect(src).toContain('useState(initialTenantCode ?? \'\')');
  });

  it('CompanyEvidenceArchivePanel accepts initialTenantCode prop with searchParams fallback', () => {
    const src = read("app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('initialTenantCode ?? searchParams');
  });

  it('AdminSubmissionQueue accepts initialTenantCode prop', () => {
    const src = read("app/admin/company-submissions/_components/AdminSubmissionQueue.tsx");
    expect(src).toContain('initialTenantCode?: string');
    expect(src).toContain('initialTenantCode');
  });

  it('AdminSubmissionQueue filters by tenantCode when prop present', () => {
    const src = read("app/admin/company-submissions/_components/AdminSubmissionQueue.tsx");
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
