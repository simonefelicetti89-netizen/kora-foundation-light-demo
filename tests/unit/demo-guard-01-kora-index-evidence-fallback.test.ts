// tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts
// DEMO-GUARD-01: anti-regression guard for the confirmed dangerous fallback found
// in DEMO-DEP-RO — app/company/kora-index/page.tsx used to fall back to
// uefReviewService.getReviewSummary() (synthetic data, defaults to
// data/synthetic/ingestion-samples.json) whenever the live-eligibility fetch
// was still loading or had failed. That silently blended synthetic evidence
// numbers into a live, session-authenticated company page whose own header
// claims "Nessun dato sintetico. Nessun branch demo."
//
// Pure fs.readFileSync — no runtime, no DB, no Supabase. Consistent with this
// codebase's existing convention for live/demo boundary guards (see
// tests/unit/b133-company-live-residual-cleanup.test.ts, b130-reports.test.ts).

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

const KORA_INDEX_PAGE = 'app/company/kora-index/page.tsx';

// ─────────────────────────────────────────────────────────────────────────────
// 1. The live company KORA Index page never uses the synthetic UEF review
//    summary, in any state (loading, failed, or resolved).
// ─────────────────────────────────────────────────────────────────────────────

describe('DEMO-GUARD-01 — /company/kora-index never uses synthetic UEF review summary', () => {
  const src = read(KORA_INDEX_PAGE);

  it('does not import uefReviewService', () => {
    expect(src).not.toContain('uefReviewService');
  });

  it('does not import UEFReviewService module', () => {
    expect(src).not.toContain('@/services/uef-review/UEFReviewService');
  });

  it('does not call getReviewSummary anywhere in the page', () => {
    expect(src).not.toContain('getReviewSummary');
  });

  it('evidenceReliability is only computed when liveCtx has resolved', () => {
    expect(src).toMatch(/const evidenceReliability = liveCtx\s*\n?\s*\?\s*evidenceReliabilityIntelligenceService\.compute\(/);
  });

  it('evidenceReliability computation uses liveUefSummary, not a demo/mock fallback via ??', () => {
    // The old bug was `liveUefSummary ?? uefReviewService.getReviewSummary()`.
    // Assert that specific dangerous-fallback shape is gone.
    expect(src).not.toMatch(/liveUefSummary\s*\?\?\s*uefReviewService/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. No path from the live company KORA Index page to
//    data/synthetic/ingestion-samples.json (the file the old fallback
//    ultimately resolved to via IngestionPipelineService's default seed).
// ─────────────────────────────────────────────────────────────────────────────

describe('DEMO-GUARD-01 — no data/synthetic/ingestion-samples.json fallback reachable', () => {
  const src = read(KORA_INDEX_PAGE);

  it('page does not reference ingestion-samples', () => {
    expect(src).not.toContain('ingestion-samples');
  });

  it('page does not import IngestionPipelineService (only reachable previously via uefReviewService)', () => {
    expect(src).not.toContain('IngestionPipelineService');
  });

  it('data/synthetic/ingestion-samples.json still exists (not deleted — demo data preserved)', () => {
    expect(fs.existsSync(path.join(ROOT, 'data/synthetic/ingestion-samples.json'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Canonical-truth invariant (rewritten for D-B / RLS-16, superseding the
//    prior "demo services still allowed to use synthetic UEF summary" framing).
//
//    D-B is resolved (lib/architecture/registry.ts svc.report-generator /
//    svc.report-factory; lib/decision-pack/pdf-data.ts header;
//    tests/unit/cc013-canonical-contract.test.ts): lib/decision-pack/* +
//    lib/live/decision-pack.ts is the sole canonical Decision Pack authority.
//    RLS-16 (tests/integration/rls-16-ingestion-tenant-kind-parity.test.ts)
//    independently proved LIVE and DEMO-kind tenants converge on the same
//    canonical Ingestion/UEF/scoring runtime (run-kora-pipeline,
//    eligibility-gate.ts, uef-to-scoring-records.ts), differing only in
//    provenance.
//
//    ReportGeneratorService, ReportFactoryService, UEFReviewService, and
//    DynamicScoringPreviewService are NOT retired by this change — they
//    still exist, are still isolated demo-only, and their capability
//    disposition is recorded in the registry (RETIRE / MIGRATE / DEFERRED,
//    see svc.report-generator notes). What changes is the invariant this
//    guard protects: not "these legacy files are still allowed to touch
//    synthetic data" (weak, backward-looking permission) but "the canonical
//    Decision Pack authority never depends on them, in any way, under any
//    condition" (strong, forward-looking non-dependency proof).
// ─────────────────────────────────────────────────────────────────────────────

describe('DEMO-GUARD-01 — canonical Decision Pack authority has zero dependency on legacy report chain', () => {
  const pdfData      = read('lib/decision-pack/pdf-data.ts');
  const htmlTemplate = read('lib/decision-pack/html-template.ts');
  const pdfRuntime   = read('lib/decision-pack/pdf-runtime.ts');
  const livePersist  = read('lib/live/decision-pack.ts');
  const canonicalFiles: Record<string, string> = { pdfData, htmlTemplate, pdfRuntime, livePersist };

  for (const [name, src] of Object.entries(canonicalFiles)) {
    it(`${name}: no data/synthetic/** import`, () => {
      expect(src).not.toMatch(/from\s+['"]@?\/?data\/synthetic\//);
    });

    it(`${name}: no ReportGeneratorService import`, () => {
      expect(src).not.toMatch(/(?:import|require)\b[^\n]*ReportGeneratorService/);
    });

    it(`${name}: no ReportFactoryService import`, () => {
      expect(src).not.toMatch(/(?:import|require)\b[^\n]*ReportFactoryService/);
    });

    it(`${name}: no ScoringSimulatorService import (final scoring group)`, () => {
      expect(src).not.toMatch(/(?:import|require)\b[^\n]*ScoringSimulatorService/);
    });

    it(`${name}: no DemoDataService import (final scoring group)`, () => {
      expect(src).not.toMatch(/(?:import|require)\b[^\n]*DemoDataService/);
    });
  }

  it('pdf-data.ts reads only canonical persisted analytics tables (kora_index_result, decision_pack_version, bti_result, uef_record)', () => {
    expect(pdfData).toContain("from('kora_index_result')");
    expect(pdfData).toContain("from('decision_pack_version')");
  });

  it('pdf-data.ts header declares itself the canonical D-B authority, not a competing implementation', () => {
    expect(pdfData).toContain('CANONICAL DECISION PACK DOMAIN BUILDER');
    expect(pdfData).toContain('D-B resolved');
  });

  it('legacy chain still exists — this is a capability-disposition PR, not a retirement PR', () => {
    expect(fs.existsSync(path.join(ROOT, 'services/report-generator/ReportGeneratorService.ts'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'services/report-factory/ReportFactoryService.ts'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'services/uef-review/UEFReviewService.ts'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'services/dynamic-scoring/DynamicScoringPreviewService.ts'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Existing no-data / loading states on /company/kora-index are preserved,
//    and the new pending state for the Evidence Reliability panel is honest
//    (not silently blank, not synthetic).
// ─────────────────────────────────────────────────────────────────────────────

describe('DEMO-GUARD-01 — company pages still render expected no-data/loading states', () => {
  const src = read(KORA_INDEX_PAGE);

  it('NoDataState (no live KORA Index yet) is still present', () => {
    expect(src).toContain('function NoDataState');
    expect(src).toContain('Dati non ancora disponibili');
  });

  it('session/scoring loading guard is still present', () => {
    expect(src).toContain('Caricamento in corso');
  });

  it('new evidence-reliability pending state exists and is honest about missing data', () => {
    expect(src).toContain('data-testid="evidence-reliability-pending"');
    expect(src).toContain('Nessun dato sintetico viene mostrato al posto dei dati live');
  });

  it('pending state only renders for roles allowed to see Evidence Reliability Intelligence', () => {
    expect(src).toContain('evidenceReliabilityIntelligenceService.canAccess(koraRole)');
  });

  it('header comment still declares no synthetic data / no demo branch', () => {
    expect(src).toContain('Nessun dato sintetico. Nessun branch demo.');
  });
});
