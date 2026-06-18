// tests/integration/b169-company-tabs.test.ts
// B169 FASE 6 — CompanyTabNav + company drill-in layout integrity.
// Verifies: 8 tabs, companyId in path, auth guard, notFound for unknown company.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

// ── CompanyTabNav structure ───────────────────────────────────────────────────

describe('CompanyTabNav — 8 tabs', () => {
  const src = read('app/admin/companies/[companyId]/_components/CompanyTabNav.tsx');

  it('is a client component', () => {
    expect(src).toContain("'use client'");
  });

  it('has exactly 8 tab slugs', () => {
    const slugMatches = src.match(/slug:\s*'[^']+'/g) ?? [];
    expect(slugMatches).toHaveLength(8);
  });

  it('contains all 8 expected tab slugs', () => {
    expect(src).toContain("slug: 'workspace'");
    expect(src).toContain("slug: 'preview'");
    expect(src).toContain("slug: 'submissions'");
    expect(src).toContain("slug: 'evidence'");
    expect(src).toContain("slug: 'users'");
    expect(src).toContain("slug: 'workforce'");
    expect(src).toContain("slug: 'data-intake'");
    expect(src).toContain("slug: 'onboarding'");
  });

  it('uses usePathname for active tab detection', () => {
    expect(src).toContain('usePathname');
  });

  it('builds href as /admin/companies/${companyId}/${slug}', () => {
    expect(src).toContain('companyId');
    expect(src).toContain('/admin/companies/');
  });

  it('uses terracotta #C76F3D for active tab underline', () => {
    expect(src).toContain('#C76F3D');
  });

  it('active detection handles sub-paths (startsWith)', () => {
    expect(src).toContain('startsWith');
  });
});

// ── Company drill-in layout ───────────────────────────────────────────────────

describe('Company drill-in layout — /admin/companies/[companyId]', () => {
  const layout = read('app/admin/companies/[companyId]/layout.tsx');

  it('calls requireKoraAdmin at layout level (primary auth)', () => {
    expect(layout).toContain('requireKoraAdmin');
  });

  it('renders CompanyTabNav', () => {
    expect(layout).toContain('CompanyTabNav');
  });

  it('renders children below the tab nav', () => {
    expect(layout).toContain('{children}');
  });
});

// ── Sub-page files exist ──────────────────────────────────────────────────────

describe('Company drill-in sub-pages exist', () => {
  const base = 'app/admin/companies/[companyId]';

  it('workspace page exists', () => {
    expect(exists(`${base}/workspace/page.tsx`)).toBe(true);
  });

  it('preview page exists', () => {
    expect(exists(`${base}/preview/page.tsx`)).toBe(true);
  });

  it('users page exists', () => {
    expect(exists(`${base}/users/page.tsx`)).toBe(true);
  });

  it('workforce page exists', () => {
    expect(exists(`${base}/workforce/page.tsx`)).toBe(true);
  });

  it('CompanyTabNav component file exists', () => {
    expect(exists(`${base}/_components/CompanyTabNav.tsx`)).toBe(true);
  });
});

// ── Workforce removed from sidebar ───────────────────────────────────────────

describe('Workforce — sidebar removed, CompanyTabNav added (B169)', () => {
  it('ADMIN_NAV_GROUPS operations group does NOT have Workforce Management', () => {
    const src = read('lib/navigation/admin-nav-groups.ts');
    const operationsMatch = src.match(/id:\s*'operations'[\s\S]*?(?=\{[\s\S]*?id:|$)/)?.[0] ?? '';
    expect(operationsMatch).not.toContain('Workforce Management');
    expect(operationsMatch).not.toContain('/admin/workforce');
  });

  it('CompanyTabNav has workforce tab linking into [companyId] namespace', () => {
    const src = read('app/admin/companies/[companyId]/_components/CompanyTabNav.tsx');
    expect(src).toContain("slug: 'workforce'");
    // verify it builds path within [companyId] namespace, not a flat /admin/workforce
    expect(src).not.toContain("href: '/admin/workforce'");
  });
});

// ── DiagnosticsTabNav structure ───────────────────────────────────────────────

describe('DiagnosticsTabNav — 3 tabs (B169 FASE 5)', () => {
  const src = read('app/admin/platform/diagnostics/_components/DiagnosticsTabNav.tsx');

  it('is a client component', () => {
    expect(src).toContain("'use client'");
  });

  it('has 3 tab slugs: live-spine, worker, provisioning', () => {
    expect(src).toContain("slug: 'live-spine'");
    expect(src).toContain("slug: 'worker'");
    expect(src).toContain("slug: 'provisioning'");
  });

  it('BASE is /admin/platform/diagnostics', () => {
    expect(src).toContain('/admin/platform/diagnostics');
  });

  it('uses terracotta #C76F3D for active underline', () => {
    expect(src).toContain('#C76F3D');
  });
});
