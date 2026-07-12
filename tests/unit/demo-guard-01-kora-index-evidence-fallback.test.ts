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
// 3. Demo/preview services that legitimately use uefReviewService.getReviewSummary()
//    in explicitly isolated demo contexts are untouched by this fix.
// ─────────────────────────────────────────────────────────────────────────────

describe('DEMO-GUARD-01 — demo services still allowed to use synthetic UEF summary where isolated', () => {
  it('UEFReviewService.getReviewSummary still exists (service itself not removed)', () => {
    const service = read('services/uef-review/UEFReviewService.ts');
    expect(service).toContain('getReviewSummary(');
  });

  it('DynamicScoringPreviewService (demo/preview) still uses getReviewSummary', () => {
    const service = read('services/dynamic-scoring/DynamicScoringPreviewService.ts');
    expect(service).toContain('uefReviewService.getReviewSummary()');
  });

  it('ReportGeneratorService (isolated demo-only service, no live callers) still uses getReviewSummary', () => {
    const service = read('services/report-generator/ReportGeneratorService.ts');
    expect(service).toContain('uefReviewService.getReviewSummary()');
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
