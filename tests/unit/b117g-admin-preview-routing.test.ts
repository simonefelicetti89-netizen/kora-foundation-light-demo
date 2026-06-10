// tests/unit/b117g-admin-preview-routing.test.ts
// B117-G: Admin Preview Routing for Worker/Company Sections — 13 structural tests.
//
// Root cause: KORA_ADMIN in demo-state WORKER mode → sidebar shows /worker/opportunities.
// Clicking sends to /worker/opportunities → server-side getCurrentWorkerUser() returns null
// (session is KORA_ADMIN, not WORKER) → redirect('/login'). KORA_ADMIN ends up at login.
//
// Fix:
// 1. buildNavGroups(role, id, isAdminPreview=true) routes WORKER Opportunità to
//    /admin/preview/worker/opportunities instead of /worker/opportunities.
// 2. /worker/opportunities now redirects KORA_ADMIN to admin preview (not login).
// 3. /admin/preview/worker/opportunities: KORA_ADMIN-only page with preview banner + disabled CTA.
// 4. Sidebar detects real Supabase session role and sets isAdminPreview when KORA_ADMIN
//    is in WORKER demo mode.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const sidebar              = readFile('components/layout/Sidebar.tsx');
const workerOpportunities  = readFile('app/worker/opportunities/page.tsx');
const adminPreview         = readFile('app/admin/preview/worker/opportunities/page.tsx');

// ─── 1. buildNavGroups — admin preview routing ────────────────────────────────

describe('buildNavGroups — admin preview mode (isAdminPreview=true)', () => {
  it('WORKER with isAdminPreview=false routes Opportunità to /worker/opportunities', () => {
    const groups = buildNavGroups('WORKER');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).toContain('/worker/opportunities');
    expect(allHrefs).not.toContain('/admin/preview/worker/opportunities');
  });

  it('WORKER with isAdminPreview=true routes Opportunità to /admin/preview/worker/opportunities', () => {
    const groups = buildNavGroups('WORKER', undefined, true);
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).toContain('/admin/preview/worker/opportunities');
    expect(allHrefs).not.toContain('/worker/opportunities');
  });

  it('COMPANY_ADMIN has no worker preview links', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).not.toContain('/admin/preview/worker/opportunities');
    expect(allHrefs).not.toContain('/worker/opportunities');
  });

  it('KORA_ADMIN admin nav has no /worker/opportunities link', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).not.toContain('/worker/opportunities');
  });

  it('Opportunità item in admin preview mode has preview=true flag', () => {
    const groups = buildNavGroups('WORKER', undefined, true);
    const allItems = groups.flatMap(g => g.items);
    const opportunitaItem = allItems.find(i => i.href === '/admin/preview/worker/opportunities');
    expect(opportunitaItem).toBeDefined();
    expect(opportunitaItem?.preview).toBe(true);
  });
});

// ─── 2. /worker/opportunities — KORA_ADMIN fallback ──────────────────────────

describe('/worker/opportunities — KORA_ADMIN fallback to admin preview', () => {
  it('imports requireKoraAdmin and isKoraAuthError', () => {
    expect(workerOpportunities).toContain('requireKoraAdmin');
    expect(workerOpportunities).toContain('isKoraAuthError');
  });

  it('redirects KORA_ADMIN to /admin/preview/worker/opportunities (not login)', () => {
    expect(workerOpportunities).toContain('/admin/preview/worker/opportunities');
    // Must redirect admin to preview, not directly to /login
    const adminCheckIdx = workerOpportunities.indexOf('requireKoraAdmin');
    const previewRedirectIdx = workerOpportunities.indexOf('/admin/preview/worker/opportunities');
    expect(adminCheckIdx).toBeGreaterThan(0);
    expect(previewRedirectIdx).toBeGreaterThan(adminCheckIdx);
  });

  it('still redirects non-admin, non-worker to /login', () => {
    expect(workerOpportunities).toContain("redirect('/login')");
  });

  it('still requires getCurrentWorkerUser for actual WORKER access', () => {
    expect(workerOpportunities).toContain('getCurrentWorkerUser');
  });
});

// ─── 3. Admin preview page ────────────────────────────────────────────────────

describe('/admin/preview/worker/opportunities — admin-only preview page', () => {
  it('admin preview page file exists', () => {
    expect(fileExists('app/admin/preview/worker/opportunities/page.tsx')).toBe(true);
  });

  it('admin preview page requires KORA_ADMIN (requireKoraAdmin)', () => {
    expect(adminPreview).toContain('requireKoraAdmin');
    expect(adminPreview).toContain('isKoraAuthError');
  });

  it('admin preview page has data-testid="admin-preview-banner"', () => {
    expect(adminPreview).toContain('data-testid="admin-preview-banner"');
  });

  it('admin preview banner says KORA_ADMIN is not logged as real worker', () => {
    expect(adminPreview).toContain('non sei loggato come worker reale');
  });

  it('CTA in admin preview are disabled with explanation', () => {
    expect(adminPreview).toContain('data-testid="admin-preview-cta-disabled"');
    expect(adminPreview).toContain('Disponibile solo in accesso lavoratore');
  });

  it('admin preview does NOT call getCurrentWorkerUser (no worker session required)', () => {
    expect(adminPreview).not.toContain('getCurrentWorkerUser');
  });
});

// ─── 4. Sidebar — isAdminPreview detection ───────────────────────────────────

describe('Sidebar — isAdminPreview detection', () => {
  it('Sidebar reads real Supabase session role', () => {
    expect(sidebar).toContain('getSupabaseBrowserClient');
    expect(sidebar).toContain('getSession');
  });

  it('Sidebar computes isAdminPreview flag', () => {
    expect(sidebar).toContain('isAdminPreview');
  });

  it("isAdminPreview checks realRole === 'KORA_ADMIN' and isWorkerRole(activeRole)", () => {
    expect(sidebar).toContain("realRole === 'KORA_ADMIN'");
    expect(sidebar).toContain('isWorkerRole');
    expect(sidebar).toContain('isAdminPreview');
  });
});
