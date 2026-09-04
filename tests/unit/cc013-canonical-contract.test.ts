/**
 * CC-013 / B-PACK — canonical Decision Pack contract guards.
 *
 * Proves: (1) the renderer/PDF-runtime layers are pure functions of the
 * builder's output, never independent data sources; (2) all four live routes
 * consume the canonical lib/decision-pack path; (3) the canonical builder
 * never recomputes KORA Index, Confidence, or BTI; (4) ReportGeneratorService
 * still has zero production callers (mirrors CC-012 Phase 8's Service B
 * guard). Source-analysis is appropriate here — these are inherently
 * "did anyone add an import" questions, same as CC-012's guard.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());
function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

describe('CC-013 — renderer and PDF runtime are pure functions of builder output', () => {
  it('html-template.ts has zero Supabase/DB access', () => {
    const html = src('lib/decision-pack/html-template.ts');
    expect(html).not.toMatch(/@supabase\/supabase-js|@\/lib\/supabase/);
    expect(html).not.toMatch(/\.schema\(['"]analytics['"]\)/);
  });

  it('pdf-runtime.ts has zero Supabase/DB access', () => {
    const runtime = src('lib/decision-pack/pdf-runtime.ts');
    expect(runtime).not.toMatch(/@supabase\/supabase-js|@\/lib\/supabase/);
  });

  it('pdf-strategy.ts has zero Supabase/DB access and zero content-model knowledge (pure delivery-mode helper)', () => {
    const strategy = src('lib/decision-pack/pdf-strategy.ts');
    expect(strategy).not.toMatch(/@supabase\/supabase-js|@\/lib\/supabase/);
    expect(strategy).not.toContain('PdfData');
  });

  it('buildDecisionPackHtml signature takes PdfData as its only input (no tenant/period params it could use to re-query)', () => {
    const html = src('lib/decision-pack/html-template.ts');
    expect(html).toMatch(/export function buildDecisionPackHtml\(data:\s*PdfData\)/);
  });
});

describe('CC-013 — all four live Decision Pack routes consume the canonical path exclusively', () => {
  const routes = [
    'app/api/company/decision-pack/route.ts',
    'app/api/company/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/preview/route.ts',
  ];

  it.each(routes)('%s imports fetchPdfData and buildDecisionPackHtml from lib/decision-pack, not ReportFactory/ReportGenerator', (route) => {
    const content = src(route);
    expect(content).toMatch(/from ['"]@\/lib\/decision-pack\/pdf-data['"]/);
    expect(content).toMatch(/from ['"]@\/lib\/decision-pack\/html-template['"]/);
    expect(content).not.toMatch(/ReportFactoryService|ReportGeneratorService/);
  });

  it('tenant identity is still derived only from authenticated session, never from URL/body, on every route', () => {
    for (const route of routes) {
      const content = src(route);
      expect(content, `${route} must call a require*User session guard`).toMatch(/requireCompanyUser|requireKoraAdmin/);
      // Company routes derive tenantId from the auth result, not from searchParams.
      if (route.includes('/company/')) {
        expect(content).not.toMatch(/searchParams\.get\(['"]tenantId['"]\)/);
      }
    }
  });
});

describe('CC-013 — canonical builder never recomputes KORA Index, Confidence, or BTI', () => {
  const pdfData = src('lib/decision-pack/pdf-data.ts');

  it('no import of the KORA Index engine', () => {
    expect(pdfData).not.toMatch(/computeKoraIndex|kora-index-engine/);
  });

  it('no import of the Confidence engine', () => {
    expect(pdfData).not.toMatch(/computeConfidence|confidence-engine/);
  });

  it('no import of the BTI engine', () => {
    expect(pdfData).not.toMatch(/computeBTI|bti-engine/);
  });

  it('no import of run-kora-pipeline (the full 14-stage orchestrator)', () => {
    expect(pdfData).not.toMatch(/run-kora-pipeline|runKoraPipeline/);
  });

  it('kora_index_value, confidence_score, and bti_score are read as persisted fields, not computed expressions', () => {
    // These must appear as .field reads off a fetched row, never on the
    // right-hand side of a call to a compute* function (checked above).
    expect(pdfData).toMatch(/\(ki as any\)\.kora_index_value/);
    expect(pdfData).toMatch(/confRow\?\.confidence_score/);
    expect(pdfData).toMatch(/rawBtiRow\.bti_score/);
  });

  it('B18/B19 evidence-gap aggregation is documented as owned local derivation, not presented as a separate canonical service', () => {
    expect(pdfData).toMatch(/B18[\s\S]{0,200}B19|evidence-gap[\s\S]{0,200}derivation|local derivation/i);
  });
});

describe('CC-013 — ReportGeneratorService production re-entry guard (mirrors CC-012 Phase 8)', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
  const SELF_FILE = 'services/report-generator/ReportGeneratorService.ts';
  const EXCLUDED = new Set([SELF_FILE, 'lib/architecture/registry.ts']);

  function walkTs(dir: string): string[] {
    const out: string[] = [];
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return out; }
    for (const entry of entries) {
      const p = join(dir, entry);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) out.push(...walkTs(p));
      else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) out.push(p);
    }
    return out;
  }

  it('no runtime file outside its own module imports or instantiates ReportGeneratorService', () => {
    // Real usage only — an actual import statement, a `from '...report-generator...'`
    // module specifier, `new ReportGeneratorService(...)`, or the lowercase
    // singleton being called (`reportGeneratorService.something`). Plain
    // prose mentions in comments (e.g. "Used by: ReportGeneratorService…",
    // or this test file's own doc header explaining the guard) do not count —
    // CC-005 already found several such stale/aspirational comments.
    const REAL_USAGE = /(?:^|\s)import\s[^;]*ReportGeneratorService[^;]*from|from\s*['"][^'"]*report-generator[^'"]*['"]|new\s+ReportGeneratorService\s*\(|reportGeneratorService\s*\./m;
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED.has(relative)) continue;
        const content = src(relative);
        if (REAL_USAGE.test(content)) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// This describe block originally proved ReportFactoryService remained
// non-canonical/synthetic-backed with exactly one real caller — accurately,
// at that time. B-TRUTH ReportFactoryService Canonical Decision Pack Status
// Migration (2026-09-06) later, separately, retired it entirely: its sole
// real caller now reads analytics.decision_pack_version directly via
// lib/live/decision-pack-status-view.ts, so the "non-canonical, untouched"
// premise no longer applies. See
// tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts
// for the current, correct state.
describe('CC-013 — ReportFactoryService has since been separately retired (historical note, not a live assertion)', () => {
  it('the service file and its synthetic seed no longer exist', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'data/synthetic/decision-pack-versions.json'))).toBe(false);
  });

  it('the former real caller no longer references reportFactoryService', () => {
    const pipeline = src('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(pipeline).not.toContain('reportFactoryService');
  });
});
