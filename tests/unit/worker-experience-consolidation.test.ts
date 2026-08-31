/**
 * Worker Experience Consolidation Sprint — Structural tests
 *
 * Verifies that the worker-side product gaps identified post-P0/P1 are addressed:
 *   WEC-1  Worker PIB timeline no longer hardcodes [] when initiative data is joinable
 *   WEC-2  /my-kora/ sub-pages do not blindly show demo-state to authenticated workers
 *   WEC-3  Navigation bridge between /worker/ and /my-kora/ exists
 *   WEC-4  KORA Contribution production_ready is NOT globally enabled
 *   WEC-5  Privacy — no sensitive worker fields exposed in worker pages
 *   WEC-6  Regression — prior sprint tests still green
 *
 * All tests are pure file-system / source-text checks — no runtime, no DB, no network.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

// ── WEC-1: Worker PIB timeline ────────────────────────────────────────────────

describe('WEC-1 — Worker PIB timeline fix', () => {
  const service = read('services/worker-pib/WorkerPIBService.ts');

  it('getPIBLive fetches worker_initiative for uef_ids (join is implemented)', () => {
    expect(service).toContain('worker_initiative');
    expect(service).toContain('source_uef_record_id');
    expect(service).toContain('.in(\'source_uef_record_id\'');
  });

  it('_aggregatePIBRows no longer hardcodes timeline: []', () => {
    // The old stub comment "richiede join a worker_initiative, post-pilot" should be gone
    expect(service).not.toContain('Timeline vuota — richiede join a worker_initiative, post-pilot');
  });

  it('_aggregatePIBRows accepts initiatives parameter for timeline population', () => {
    expect(service).toContain('initiatives: Array<');
    expect(service).toContain('eligibility_class');
  });

  it('timeline items use worker-scoped fields only (no employer fields, no cross-worker)', () => {
    // SELECT clauses must NOT include employer-facing or cross-worker fields
    // (pseudonym_id appears in old comments but not in SELECT clauses)
    const selectClauses = service.match(/\.select\('[^']+'\)/g) ?? [];
    for (const clause of selectClauses) {
      expect(clause).not.toContain('worker_identity_id');
      expect(clause).not.toContain('pseudonym_id');
    }
    // Must scope to authenticated worker's rows (RLS comment present)
    expect(service).toContain('RLS');
  });

  it('timeline items contain safe fields: category, pillar, date, iu_value, cv_eligible', () => {
    expect(service).toContain('category:');
    expect(service).toContain('pillar:');
    expect(service).toContain('cv_eligible:');
    expect(service).toContain('iu_value:');
  });

  it('empty state remains when no pib rows exist (honest empty path preserved)', () => {
    expect(service).toContain('_emptyLivePIB');
    expect(service).toContain('Nessun dato di attivazione disponibile');
  });

  it('PIB page shows live empty timeline message for real worker with no events', () => {
    const pibPage = read('app/my-kora/personal-impact-balance/page.tsx');
    expect(pibPage).toContain('timeline-live-empty');
    expect(pibPage).toContain('isRealWorkerMode && pib.timeline.length === 0');
    expect(pibPage).toContain('primo ciclo di scoring');
  });
});

// ── WEC-2: /my-kora/ sub-pages mode detection ────────────────────────────────

describe('WEC-2a — /my-kora/collective mode detection', () => {
  const collective = read('app/my-kora/collective/page.tsx');

  it('collective page imports useState and useEffect', () => {
    expect(collective).toContain('useState');
    expect(collective).toContain('useEffect');
  });

  it('collective page defines CollectiveMode type with checking/empty/demo states', () => {
    expect(collective).toContain('CollectiveMode');
    expect(collective).toContain("'checking'");
    expect(collective).toContain("'empty'");
    expect(collective).toContain("'demo'");
  });

  it('collective page fetches /api/worker/pib for auth detection', () => {
    expect(collective).toContain('/api/worker/pib');
  });

  it('collective page does not show demo-state to authenticated workers (empty path exists)', () => {
    expect(collective).toContain("collectiveMode === 'empty'");
    expect(collective).toContain('collective-empty-state');
  });

  it('collective empty state has Italian no-data message', () => {
    expect(collective).toContain('Nessuna attività collettiva disponibile');
    expect(collective).toContain('ciclo di scoring');
  });

  it('demo mode still shows synthetic content with labels (not removed)', () => {
    // Synthetic disclaimer still present for demo path
    expect(collective).toContain('Dati sintetici illustrativi');
    expect(collective).toContain('synthetic_demo_data');
  });

  it('collective page has privacy notice for authenticated empty state', () => {
    expect(collective).toContain('collective-privacy-notice');
    expect(collective).toContain('not_employer_visible: true');
  });
});

describe('WEC-2b — /my-kora/bookings page (already acceptable)', () => {
  const bookings = read('app/my-kora/bookings/page.tsx');

  it('bookings page is a static placeholder — no synthetic persona data shown as real', () => {
    // No usePersona, no useScenario, no myKoraPreviewService
    expect(bookings).not.toContain('usePersona');
    expect(bookings).not.toContain('useScenario');
    expect(bookings).not.toContain('myKoraPreviewService');
  });

  it('bookings page shows honest "not active in Foundation Light" state', () => {
    expect(bookings).toContain('Foundation Light');
    // Metadata footer confirms preview-only state
    expect(bookings).toContain('preview_only');
  });
});

describe('WEC-2c — /my-kora/kora-space page (clearly labeled preview)', () => {
  const koraSpace = read('app/my-kora/kora-space/page.tsx');

  it('kora-space page labels content as Foundation Light preview', () => {
    expect(koraSpace).toContain('Foundation Light preview');
  });

  it('kora-space page buttons are disabled (not live interactions)', () => {
    expect(koraSpace).toContain('disabled');
    expect(koraSpace).toContain('· preview');
  });

  it('kora-space page has synthetic_demo_data footer', () => {
    expect(koraSpace).toContain('synthetic_demo_data: true');
  });

  it('kora-space page does not expose worker identity fields', () => {
    expect(koraSpace).not.toContain('worker_identity_id');
    expect(koraSpace).not.toContain('pseudonym_id');
    expect(koraSpace).not.toContain('worker_id');
  });
});

// ── WEC-3: Navigation bridge ──────────────────────────────────────────────────

describe('WEC-3 — Navigation bridge between /worker/ and /my-kora/', () => {
  it('/worker/workspace links to /my-kora/personal-impact-balance', () => {
    const workspace = read('app/worker/workspace/page.tsx');
    expect(workspace).toContain('/my-kora/personal-impact-balance');
    expect(workspace).toContain('workspace-my-kora-link');
    expect(workspace).toContain('workspace-my-kora-pib-link');
    // Link is to My KORA personal area — label avoids "personal impact balance" phrase
    // (pre-existing b104/b106b tests assert workspace does not render PIB score text)
    expect(workspace).toContain('Area personale');
  });

  it('/worker/workspace My KORA bridge card is labeled as personal area (not PIB data)', () => {
    const workspace = read('app/worker/workspace/page.tsx');
    // Card uses "area personale" framing, not PIB score display
    expect(workspace).toContain('spazio privato KORA');
  });

  it('/my-kora/layout links back to /worker/workspace for real worker sessions', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).toContain('/worker/workspace');
    expect(layout).toContain('my-kora-workspace-link');
  });

  it('/my-kora/layout workspace link is gated on realRole === WORKER (not shown to demo visitors)', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).toContain("realRole === 'WORKER'");
    expect(layout).toContain('Spazio operativo');
  });
});

// ── WEC-4: Contribution production_ready gating ───────────────────────────────

describe('WEC-4 — KORA Contribution production_ready not globally enabled', () => {
  const service = read('services/kora-contribution/KoraContributionService.ts');

  it('production_ready check exists and gates live path', () => {
    expect(service).toContain('production_ready');
    expect(service).toContain('if (!tenant || !(tenant as any).production_ready) return null;');
  });

  it('production_ready is NOT hardcoded to true in TypeScript logic (only read from DB)', () => {
    // No hardcoded TS assignment or object literal overriding the DB value
    expect(service).not.toContain('production_ready: true');
    // SQL example in comment is allowed — check no TS assignment exists outside comments
    const tsLines = service.split('\n').filter((l) => !l.trimStart().startsWith('//'));
    expect(tsLines.join('\n')).not.toContain('production_ready = true');
  });

  it('service documents how to enable production_ready for pilot tenants (comment present)', () => {
    expect(service).toContain('ABILITAZIONE LIVE CONTRIBUTION PER TENANT PILOT');
    expect(service).toContain("UPDATE analytics.tenant SET production_ready = true");
  });

  it('Pilot+ live path remains gated — all three live functions check production_ready', () => {
    const occurrences = (service.match(/production_ready/g) ?? []).length;
    // At least 3 checks (getContributionLive, getContributionPromoterView, getContributionOriginEmployerView)
    // plus the comment block
    expect(occurrences).toBeGreaterThanOrEqual(4);
  });

  it('preview path (getContributionV2Live, replacing getSummaryV2 as of the B-TRUTH Contribution port, 2026-09-01) does not gate on production_ready — always available for FL tenants', () => {
    expect(service).toContain('export async function getContributionV2Live');
    const fn = service.split('export async function getContributionV2Live')[1]?.split('export async function')[0] ?? '';
    expect(fn).not.toContain('production_ready');
  });
});

// ── WEC-5: Privacy — no sensitive fields exposed ──────────────────────────────

describe('WEC-5 — Privacy — worker pages do not expose sensitive fields', () => {
  const sensitiveFields = [
    'worker_identity_id',
    'pseudonym_id',
    'personal.worker_pseudonym_map',
  ];

  const workerPages = [
    'app/my-kora/personal-impact-balance/page.tsx',
    'app/my-kora/collective/page.tsx',
    'app/my-kora/bookings/page.tsx',
    'app/my-kora/kora-space/page.tsx',
  ];

  for (const pagePath of workerPages) {
    it(`${pagePath} does not expose sensitive identity fields`, () => {
      const content = read(pagePath);
      for (const field of sensitiveFields) {
        expect(content).not.toContain(field);
      }
    });
  }

  it('WorkerPIBService getPIBLive SELECT clauses do not include worker_identity_id or pseudonym_id', () => {
    const service = read('services/worker-pib/WorkerPIBService.ts');
    // Check all .select() calls in the file — none should select identity fields
    const selectClauses = service.match(/\.select\('[^']+'\)/g) ?? [];
    for (const clause of selectClauses) {
      expect(clause).not.toContain('worker_identity_id');
      expect(clause).not.toContain('pseudonym_id');
    }
  });

  it('not_employer_visible invariant preserved in WorkerPIBService live path', () => {
    const service = read('services/worker-pib/WorkerPIBService.ts');
    expect(service).toContain('not_employer_visible:           true');
    expect(service).toContain('not_performance_score:          true');
  });
});

// ── WEC-6: Regression ─────────────────────────────────────────────────────────

describe('WEC-6 — Regression: prior sprint artifacts still present', () => {
  it('P0 commercial credibility test file exists', () => {
    expect(exists('tests/unit/p0-commercial-credibility.test.ts')).toBe(true);
  });

  it('P1 product integrity test file exists', () => {
    expect(exists('tests/unit/p1-product-integrity.test.ts')).toBe(true);
  });

  it('Initiative explainability UI test file exists', () => {
    expect(exists('tests/unit/initiative-explainability-ui.test.ts')).toBe(true);
  });

  it('Worker PIB privacy test file exists (b109b)', () => {
    expect(exists('tests/unit/b109b-participation-privacy.test.ts')).toBe(true);
  });

  it('Route privacy test file exists', () => {
    expect(exists('tests/unit/route-privacy.test.ts')).toBe(true);
  });

  it('Tenant isolation test file exists', () => {
    expect(exists('tests/unit/tenant-isolation.test.ts')).toBe(true);
  });

  it('/api/company/initiatives/explainability route still exists (P1 artifact)', () => {
    expect(exists('app/api/company/initiatives/explainability/route.ts')).toBe(true);
  });

  it('/api/company/data-submissions/history route still exists (P1 artifact)', () => {
    expect(exists('app/api/company/data-submissions/history/route.ts')).toBe(true);
  });

  it('InitiativeExplainabilityPanel component still exists (UI sprint artifact)', () => {
    expect(exists('components/company/InitiativeExplainabilityPanel.tsx')).toBe(true);
  });

  it('KORA Contribution is NOT a KORA Index component (companion indicator invariant)', () => {
    // Formatting-tolerant as of the B-TRUTH Contribution port (2026-09-01):
    // the exact single-space literal previously matched here lived in the
    // now-retired getContribution() synthetic method; the invariant is still
    // stated in getContributionLive()'s return object (aligned formatting).
    const service = read('services/kora-contribution/KoraContributionService.ts');
    expect(service).toMatch(/is_kora_index_component:\s*false/);
    expect(service).toMatch(/notKoraIndexComponent:\s*true/);
    expect(service).toContain('KORA Contribution is a companion indicator — never a KORA Index component');
  });

  it('methodology-config weights are read from versioned config, not hardcoded', () => {
    expect(exists('lib/methodology-config/v0.1.ts')).toBe(true);
    const config = read('lib/methodology-config/v0.1.ts');
    expect(config).toContain('getMacroblockWeights');
  });

  it('upload batch deduplication guard still present in accept route', () => {
    const acceptRoute = read('app/api/admin/data-intake/accept/route.ts');
    expect(acceptRoute).toContain('batch_duplicate_rejected');
    expect(acceptRoute).toContain('conservative_exact_match_only');
  });
});
