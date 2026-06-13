// tests/unit/b142a-kora-space-foundation-light.test.ts
// B142-A — KORA Space Foundation Light MVP.
//
// Pure structural/static tests — no DB, no Supabase, no runtime rendering.
// Verifies:
//   - Company view at /company/shared (KORA Space Foundation Light)
//   - Worker view at /my-kora/kora-space
//   - Sidebar navigation entries
//   - Permissions: /my-kora/kora-space in worker routes, /company/shared in COMPANY_DEMO_ROUTES
//   - Privacy invariants: no individual worker data in company view
//   - Synthetic data only: no DB queries

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

const companySrc  = read('app/company/shared/page.tsx');
const workerSrc   = read('app/my-kora/kora-space/page.tsx');
const sidebarSrc  = read('components/layout/Sidebar.tsx');
const permsSrc    = read('lib/permissions/index.ts');

// ── 1–4: Company view structure ───────────────────────────────────────────────

describe('B142-A — KORA Space company view structure', () => {
  it('1. company view renders kora-space-company testid', () => {
    expect(companySrc).toContain('data-testid="kora-space-company"');
  });

  it('2. company view has privacy boundary with non-suppressible copy', () => {
    expect(companySrc).toContain('data-testid="kora-space-privacy-boundary"');
    expect(companySrc).toContain('KORA Space mostra contenuti e opportunità condivise. Non espone dati individuali dei lavoratori.');
    expect(companySrc).toContain('Le richieste dei lavoratori sono gestite solo in forma aggregata o supervisionata.');
    expect(companySrc).toContain('La partecipazione individuale non è visibile all');
    expect(companySrc).toContain('KORA misura l');
  });

  it('3. company view renders space cards with dynamic testid pattern', () => {
    // Cards use template literal: data-testid={`kora-space-card-${item.id}`}
    expect(companySrc).toContain('`kora-space-card-${item.id}`');
    // All 4 item ids are present in the KORA_SPACE_ITEMS data
    expect(companySrc).toContain("'ks-001'");
    expect(companySrc).toContain("'ks-002'");
    expect(companySrc).toContain("'ks-003'");
    expect(companySrc).toContain("'ks-004'");
  });

  it('4. company view includes synthetic_demo_data disclaimer', () => {
    expect(companySrc).toContain('synthetic_demo_data: true');
    expect(companySrc).toContain('Foundation Light Preview');
    expect(companySrc).toContain('KORA Space v0.1');
    expect(companySrc).toContain('B142-A');
  });
});

// ── 5–7: Company view privacy — no individual worker data ─────────────────────

describe('B142-A — Company view privacy invariants', () => {
  it('5. company view has no worker_id in JSX data paths (only permitted in comments)', () => {
    // Remove single-line comments before checking to avoid comment false positives
    const withoutComments = companySrc.replace(/\/\/[^\n]*/g, '');
    expect(withoutComments).not.toContain('worker_id');
  });

  it('6. company view has no pib_light reference', () => {
    expect(companySrc).not.toContain('pib_light');
  });

  it('7. company view has no dynamic-cv individual data reference', () => {
    // Company view must not import or render dynamic-cv personal data
    expect(companySrc).not.toContain('dynamic-cv-items');
    expect(companySrc).not.toContain('DynamicCVService');
    expect(companySrc).not.toContain('pillar_breakdown');
  });
});

// ── 8–11: Worker view structure ───────────────────────────────────────────────

describe('B142-A — KORA Space worker view structure', () => {
  it('8. worker view renders kora-space-worker testid', () => {
    expect(workerSrc).toContain('data-testid="kora-space-worker"');
  });

  it('9. worker view has privacy notice with all 4 required strings', () => {
    expect(workerSrc).toContain('data-testid="kora-space-worker-privacy"');
    expect(workerSrc).toContain('KORA Space mostra contenuti e opportunità condivise. Non espone dati individuali dei lavoratori.');
    expect(workerSrc).toContain('Le richieste dei lavoratori sono gestite solo in forma aggregata o supervisionata.');
    expect(workerSrc).toContain('La partecipazione individuale non è visibile all');
    expect(workerSrc).toContain('KORA misura l');
  });

  it('10. worker view renders space cards with dynamic worker testid pattern', () => {
    // Cards use template literal: data-testid={`kora-space-worker-card-${item.id}`}
    expect(workerSrc).toContain('`kora-space-worker-card-${item.id}`');
    // All 4 item ids are present
    expect(workerSrc).toContain("'ks-001'");
    expect(workerSrc).toContain("'ks-002'");
    expect(workerSrc).toContain("'ks-003'");
    expect(workerSrc).toContain("'ks-004'");
  });

  it('11. worker view guards access via myKoraPreviewService.canAccess', () => {
    expect(workerSrc).toContain('myKoraPreviewService');
    expect(workerSrc).toContain('canAccess');
    expect(workerSrc).toContain('data-testid="access-denied"');
  });
});

// ── 12: Worker view privacy — no company KPIs ─────────────────────────────────

describe('B142-A — Worker view privacy invariants', () => {
  it('12. worker view has no company KPI or KORA Index references', () => {
    expect(workerSrc).not.toContain('kora_index_value');
    expect(workerSrc).not.toContain('activation_rate');
    expect(workerSrc).not.toContain('ScoringSimulator');
    expect(workerSrc).not.toContain('KoraIndexEngine');
  });
});

// ── 13: Sidebar navigation ────────────────────────────────────────────────────

describe('B142-A — Sidebar navigation', () => {
  it('13. sidebar includes KORA Space links for worker nav', () => {
    expect(sidebarSrc).toContain('/my-kora/kora-space');
    expect(sidebarSrc).toContain('KORA Space');
  });
});

// ── 14–15: Permissions ────────────────────────────────────────────────────────

describe('B142-A — Permissions', () => {
  it('14. /my-kora/kora-space is in worker routes in both permission functions', () => {
    expect(permsSrc).toContain("'/my-kora/kora-space'");
    // Should appear twice: once in getAccessibleRoutes, once in getDemoNavigationRoutes
    const occurrences = (permsSrc.match(/\/my-kora\/kora-space/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('15. /company/shared is in COMPANY_DEMO_ROUTES', () => {
    const demoRoutesStart = permsSrc.indexOf('const COMPANY_DEMO_ROUTES');
    const demoRoutesEnd   = permsSrc.indexOf('] as const;', demoRoutesStart);
    const demoRoutesBlock = permsSrc.substring(demoRoutesStart, demoRoutesEnd);
    expect(demoRoutesBlock).toContain("'/company/shared'");
  });
});
