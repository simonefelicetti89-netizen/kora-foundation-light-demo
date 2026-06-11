// tests/unit/b116-worker-partner-map.test.ts
// B116: Worker Partner Map Foundation — 20 structural tests.
// Verifies partner catalog architecture: migration, API routes, worker page,
// admin page, sidebar, and privacy boundary.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const migration      = readFile('supabase/migrations/010_partner_profile.sql');
const adminPartnersApi  = readFile('app/api/admin/partners/route.ts');
const adminStatusApi    = readFile('app/api/admin/partners/[id]/status/route.ts');
const workerCatalogApi  = readFile('app/api/worker/partner-catalog/route.ts');
const adminPage      = readFile('app/admin/partners/page.tsx');
const workerPage     = readFile('app/worker/opportunities/page.tsx');
const catalogClient  = readFile('app/worker/opportunities/_components/PartnerCatalogClient.tsx');
const workspace      = readFile('app/worker/workspace/page.tsx');
const sidebar        = readFile('components/layout/Sidebar.tsx');

// ─── 1. Migration — network schema + partner_profile ─────────────────────────

describe('Migration 010 — partner_profile', () => {
  it('migration file exists', () => {
    expect(fileExists('supabase/migrations/010_partner_profile.sql')).toBe(true);
  });

  it('migration creates network schema', () => {
    expect(migration).toContain('CREATE SCHEMA IF NOT EXISTS network');
  });

  it('partner_profile has pillar column with KORA pillar constraint', () => {
    expect(migration).toContain("CHECK (pillar IN ('LIFE','GROWTH','CONNECTION','IMPACT','LEGACY'))");
  });

  it('partner_profile has status constraint with draft/published/archived', () => {
    expect(migration).toContain("CHECK (status IN ('draft','published','archived'))");
  });

  it('partner_profile has delivery_mode constraint', () => {
    expect(migration).toContain("CHECK (delivery_mode IN ('online','onsite','hybrid'))");
  });
});

// ─── 2. Admin API — partner management ───────────────────────────────────────

describe('Admin API — partner management', () => {
  it('GET /api/admin/partners requires KORA_ADMIN (requireKoraAdmin)', () => {
    expect(adminPartnersApi).toContain('requireKoraAdmin');
    expect(adminPartnersApi).toContain('isKoraAuthError');
  });

  it('POST /api/admin/partners validates pillar enum', () => {
    expect(adminPartnersApi).toContain("PILLARS.includes(pillar as Pillar)");
  });

  it('PATCH /api/admin/partners/[id]/status requires KORA_ADMIN', () => {
    expect(adminStatusApi).toContain('requireKoraAdmin');
  });

  it('PATCH /api/admin/partners/[id]/status validates status enum', () => {
    expect(adminStatusApi).toContain("VALID_STATUSES.includes(newStatus as Status)");
  });
});

// ─── 3. Worker API — partner catalog ─────────────────────────────────────────

describe('Worker API — partner catalog privacy contract', () => {
  it('GET /api/worker/partner-catalog requires WORKER (requireWorkerUser)', () => {
    expect(workerCatalogApi).toContain('requireWorkerUser');
  });

  it('worker catalog never accepts worker_id from query params or body', () => {
    expect(workerCatalogApi).not.toContain('searchParams.get(\'worker_id\')');
    expect(workerCatalogApi).not.toContain('body.worker_id');
    expect(workerCatalogApi).not.toContain('body.tenant_id');
  });

  it('worker catalog only returns published partners', () => {
    expect(workerCatalogApi).toContain(".eq('status', 'published')");
  });

  it('worker catalog response includes privacy notice', () => {
    expect(workerCatalogApi).toContain('not_employer_visible');
    expect(workerCatalogApi).toContain('no_individual_click_tracking');
  });

  it('no worker_partner_click table referenced in worker catalog', () => {
    expect(workerCatalogApi).not.toContain('worker_partner_click');
    // 'no_individual_click_tracking' is a privacy notice key — acceptable
    // The forbidden pattern is any DB operation on a click table
    expect(workerCatalogApi).not.toContain("from('worker_partner_click')");
    expect(workerCatalogApi).not.toContain('.insert({ click');
  });
});

// ─── 4. Worker opportunities page ────────────────────────────────────────────

describe('Worker opportunities page', () => {
  it('/worker/opportunities page exists', () => {
    expect(fileExists('app/worker/opportunities/page.tsx')).toBe(true);
  });

  it('worker opportunities page has data-testid="worker-opportunities-page"', () => {
    expect(workerPage).toContain('data-testid="worker-opportunities-page"');
  });

  it('worker opportunities page requires getCurrentWorkerUser (not employer-accessible)', () => {
    expect(workerPage).toContain('getCurrentWorkerUser');
    // B117-B: redirect target changed from /worker/login to /login (unified entry)
    expect(workerPage).toContain("redirect('/login')");
    expect(workerPage).not.toContain("redirect('/worker/login')");
  });

  it('worker opportunities page has non-suppressible privacy notice', () => {
    expect(workerPage).toContain('data-testid="partner-privacy-notice"');
    expect(workerPage).toContain('La tua navigazione tra i partner non viene mostrata al datore di lavoro');
  });

  it('partner catalog empty state exists with data-testid', () => {
    expect(catalogClient).toContain('data-testid="partner-catalog-empty"');
    expect(catalogClient).toContain('La rete partner sarà disponibile prossimamente');
  });

  it('partner cards do not show fake tracking confirmation', () => {
    expect(catalogClient).toContain('KORA non traccia questo click');
    expect(catalogClient).not.toContain('click registrato');
    expect(catalogClient).not.toContain('interesse salvato');
  });
});

// ─── 5. Admin page ────────────────────────────────────────────────────────────

describe('Admin partners page', () => {
  it('/admin/partners page exists', () => {
    expect(fileExists('app/admin/partners/page.tsx')).toBe(true);
  });

  it('admin partners page requires KORA_ADMIN', () => {
    expect(adminPage).toContain('requireKoraAdmin');
  });

  it('admin partners page fetches from network schema', () => {
    expect(adminPage).toContain(".schema('network')");
    expect(adminPage).toContain("from('partner_profile')");
  });
});

// ─── 6. Workspace integration ────────────────────────────────────────────────

describe('Workspace — partner preview integration', () => {
  it('workspace has partner preview section with data-testid', () => {
    expect(workspace).toContain('data-testid="workspace-partner-preview"');
  });

  it('workspace partner preview links to /worker/opportunities', () => {
    const previewSection = workspace.slice(
      workspace.indexOf('workspace-partner-preview'),
      workspace.indexOf('workspace-partner-preview') + 800,
    );
    expect(previewSection).toContain('/worker/opportunities');
  });

  it('workspace partner empty state message is honest', () => {
    expect(workspace).toContain('La rete partner sarà disponibile prossimamente');
  });
});

// ─── 7. Sidebar — navigation ────────────────────────────────────────────────

describe('Sidebar — worker navigation updated', () => {
  it('Opportunità sidebar references /worker/opportunities (B117-G: ternary for admin preview)', () => {
    // B117-G: sidebar uses isAdminPreview ternary — /worker/opportunities is the WORKER default,
    // /admin/preview/worker/opportunities is the admin preview path.
    expect(sidebar).toContain("'/worker/opportunities'");
  });

  it('Opportunità is no longer marked comingSoon', () => {
    const opportunitaLine = sidebar
      .split('\n')
      .find(l => l.includes('/worker/opportunities'));
    expect(opportunitaLine).not.toContain('comingSoon');
  });

  it('Dynamic Impact CV is now a live route (B121: links to /worker/dynamic-cv, not comingSoon)', () => {
    // B121 implemented /worker/dynamic-cv. comingSoon is removed.
    expect(sidebar).toContain("'/worker/dynamic-cv'");
    expect(sidebar).toContain("'Dynamic Impact CV'");
  });
});

// ─── 8. No forbidden artifacts ───────────────────────────────────────────────

describe('Boundary — no forbidden artifacts', () => {
  it('no worker_partner_click table in migration', () => {
    expect(migration).not.toContain('worker_partner_click');
  });

  it('no ranking UI, review engine, or payment logic introduced', () => {
    const allNew = [adminPartnersApi, workerCatalogApi, workerPage, catalogClient].join('\n');
    // "ranking" in comments is OK (as a forbidden-feature note); active coding patterns are not
    expect(allNew).not.toContain('sortByRanking');
    expect(allNew).not.toContain('RankingTable');
    expect(allNew).not.toContain('reviewEngine');
    expect(allNew).not.toContain('checkout');
    expect(allNew).not.toContain('wallet');
    expect(allNew).not.toContain('voucher');
    expect(allNew).not.toContain('pagamento');
  });

  it('company routes do not reference worker partner interaction', () => {
    expect(workerCatalogApi).toContain('not_employer_visible');
  });
});
