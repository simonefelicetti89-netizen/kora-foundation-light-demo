/**
 * Monte Carlo Semantic Disambiguation — P1.4
 *
 * KORA has two Monte Carlo implementations with distinct semantics:
 *   - computeMonteCarlo  (monte-carlo-engine.ts): pipeline-level credibility diagnostic.
 *     Returns p10/median/p90 interval + reliabilityAdjustedIndex (diagnostic, not official).
 *   - computeMCInterval  (monte-carlo-engine.ts): internal uncertainty helper for koraIndex.uncertainty.
 *     Returns shrunkValue (internal diagnostic) + p10/median/p90.
 *
 * Official KORA Index = koraIndex.value (raw weighted macroblock sum).
 * Neither reliabilityAdjustedIndex nor shrunkValue replaces koraIndex.value.
 *
 * These tests verify:
 *   1. computeMonteCarlo section documents reliabilityAdjustedIndex as diagnostic + not official.
 *   2. computeMCInterval section documents shrunkValue as internal + not official.
 *   3. run-kora-pipeline.ts documents official KORA Index = raw koraIndex.value.
 *   4. No UI component currently references reliabilityAdjustedIndex / shrunkValue / uncertainty.shrunkValue.
 *   5. No API company route exposes shrunkValue as a company-facing field.
 *   6. Any non-engine source that references monteCarlo includes diagnostic labelling.
 *   7. No source labels reliabilityAdjustedIndex as "official" without a negation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function collectFiles(dir: string, ext = '.ts'): string[] {
  const results: string[] = [];
  const abs = resolve(root, dir);
  if (!statSync(abs, { throwIfNoEntry: false })) return results;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const full = join(abs, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(join(dir, entry.name), ext));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

// ── Test 1 — computeMonteCarlo documentation ─────────────────────────────────

describe('computeMonteCarlo documentation', () => {
  const mcEngineSrc = src('lib/kora-engine/monte-carlo-engine.ts');
  // Isolate the computeMonteCarlo section: everything before the computeMCInterval block.
  const computeMonteCarloBlock = mcEngineSrc.slice(
    0,
    mcEngineSrc.indexOf('// ── computeMCInterval'),
  );

  it('computeMonteCarlo section mentions reliabilityAdjustedIndex', () => {
    expect(computeMonteCarloBlock).toContain('reliabilityAdjustedIndex');
  });

  it('computeMonteCarlo section labels reliabilityAdjustedIndex as diagnostic', () => {
    expect(computeMonteCarloBlock).toMatch(/diagnostic/i);
  });

  it('computeMonteCarlo section states reliabilityAdjustedIndex is NOT the official KORA Index', () => {
    expect(computeMonteCarloBlock).toMatch(/NOT the official KORA Index/i);
  });

  it('computeMonteCarlo section states what the official KORA Index is', () => {
    expect(computeMonteCarloBlock).toMatch(/koraIndex\.value|official KORA Index/i);
  });
});

// ── Test 2 — computeMCInterval documentation ─────────────────────────────────

describe('computeMCInterval documentation', () => {
  const mcEngineSrc = src('lib/kora-engine/monte-carlo-engine.ts');
  // Isolate the computeMCInterval section: everything from its block header onward.
  const computeMCIntervalBlock = mcEngineSrc.slice(
    mcEngineSrc.indexOf('// ── computeMCInterval'),
  );

  it('computeMCInterval section mentions shrunkValue', () => {
    expect(computeMCIntervalBlock).toContain('shrunkValue');
  });

  it('computeMCInterval section labels shrunkValue as internal', () => {
    expect(computeMCIntervalBlock).toMatch(/internal/i);
  });

  it('computeMCInterval section states shrunkValue is NOT the official KORA Index', () => {
    expect(computeMCIntervalBlock).toMatch(/NOT the official KORA Index/i);
  });

  it('computeMCInterval section warns future UI must not show shrunkValue without labelling', () => {
    expect(computeMCIntervalBlock).toMatch(/admin.only|admin-only/i);
  });
});

// ── Test 3 — run-kora-pipeline.ts official KORA Index documentation ──────────

describe('run-kora-pipeline.ts official KORA Index documentation', () => {
  const pipelineSrc = src('lib/kora-engine/run-kora-pipeline.ts');

  it('pipeline source documents that the official KORA Index is the raw value', () => {
    expect(pipelineSrc).toMatch(/official KORA Index/i);
  });

  it('pipeline source documents koraIndex.value as the official value', () => {
    expect(pipelineSrc).toContain('koraIndex.value');
  });

  it('pipeline source labels reliability-adjusted/shrunk values as diagnostic', () => {
    expect(pipelineSrc).toMatch(/diagnostic/i);
  });

  it('pipeline source states reliabilityAdjustedIndex is NOT the official KORA Index', () => {
    expect(pipelineSrc).toMatch(/reliabilityAdjustedIndex[\s\S]*NOT the official KORA Index|NOT the official KORA Index[\s\S]*reliabilityAdjustedIndex/i);
  });

  it('pipeline source states shrunkValue is NOT the official KORA Index', () => {
    expect(pipelineSrc).toMatch(/shrunkValue[\s\S]*NOT the official KORA Index|NOT the official KORA Index[\s\S]*shrunkValue/i);
  });
});

// ── Test 4 — No UI component references sensitive MC fields ──────────────────

describe('UI layer isolation — no component references internal MC fields', () => {
  const appFiles   = collectFiles('app');
  const compFiles  = collectFiles('components');
  const uiFiles    = [...appFiles, ...compFiles];

  it('no app/ or components/ file references reliabilityAdjustedIndex', () => {
    const hits = uiFiles.filter(f => src(f).includes('reliabilityAdjustedIndex'));
    expect(hits).toEqual([]);
  });

  it('no app/ or components/ file references shrunkValue', () => {
    const hits = uiFiles.filter(f => src(f).includes('shrunkValue'));
    expect(hits).toEqual([]);
  });

  it('no app/ or components/ file references uncertainty.shrunkValue', () => {
    const hits = uiFiles.filter(f => src(f).includes('uncertainty.shrunkValue'));
    expect(hits).toEqual([]);
  });
});

// ── Test 5 — No company API route exposes shrunkValue ────────────────────────

describe('company API route isolation — shrunkValue not exposed', () => {
  const companyRoutes = collectFiles('app/api/company');

  it('no company API route contains shrunkValue', () => {
    const hits = companyRoutes.filter(f => src(f).includes('shrunkValue'));
    expect(hits).toEqual([]);
  });

  it('no company API route contains reliabilityAdjustedIndex', () => {
    const hits = companyRoutes.filter(f => src(f).includes('reliabilityAdjustedIndex'));
    expect(hits).toEqual([]);
  });
});

// ── Test 6 — Non-engine monteCarlo references include diagnostic labels ───────

describe('monteCarlo reference labelling in non-engine source', () => {
  const engineDir = 'lib/kora-engine';
  const appFiles  = collectFiles('app');
  const compFiles = collectFiles('components');
  const nonEngineFiles = [...appFiles, ...compFiles];

  const mcRefFiles = nonEngineFiles.filter(f => src(f).includes('monteCarlo'));

  it('any non-engine file that references monteCarlo also includes diagnostic labels', () => {
    // If no non-engine files reference monteCarlo, test is vacuously satisfied.
    for (const file of mcRefFiles) {
      const content = src(file);
      const hasDiagnosticLabel =
        /diagnostic|credibility|credibile|interval|non-official|non ufficiale/i.test(content);
      expect(
        hasDiagnosticLabel,
        `${file} references monteCarlo but lacks a diagnostic/credibility label`,
      ).toBe(true);
    }
  });

  it('no non-engine file exposes monteCarlo without declaring its diagnostic nature', () => {
    // Verify the set of non-engine MC-referencing files — expected to be empty in Foundation Light.
    expect(mcRefFiles).toEqual([]);
  });
});

// ── Test 7 — reliabilityAdjustedIndex is never labelled as official ───────────

describe('reliabilityAdjustedIndex is never mislabelled as the official KORA Index', () => {
  const allSourceFiles = [
    ...collectFiles('lib/kora-engine'),
    ...collectFiles('app'),
    ...collectFiles('components'),
    ...collectFiles('services'),
  ];
  const filesWithRAI = allSourceFiles.filter(f => src(f).includes('reliabilityAdjustedIndex'));

  it('no file containing reliabilityAdjustedIndex uses the label "KORA Index ufficiale"', () => {
    const hits = filesWithRAI.filter(f => src(f).includes('KORA Index ufficiale'));
    expect(hits).toEqual([]);
  });

  it('no file containing reliabilityAdjustedIndex uses the label "indice ufficiale"', () => {
    const hits = filesWithRAI.filter(f => src(f).toLowerCase().includes('indice ufficiale'));
    expect(hits).toEqual([]);
  });

  it('every file containing reliabilityAdjustedIndex also states it is NOT the official KORA Index', () => {
    // All files that reference reliabilityAdjustedIndex must also document that it is
    // not the official value — ensuring no orphan references exist without the disclaimer.
    for (const file of filesWithRAI) {
      const content = src(file);
      const hasNegation = /NOT the official KORA Index|not the official KORA Index|non.*official|non.*ufficiale/i.test(content);
      expect(
        hasNegation,
        `${file} references reliabilityAdjustedIndex but lacks "NOT the official KORA Index" disclaimer`,
      ).toBe(true);
    }
  });

  it('reliabilityAdjustedIndex is only referenced from engine-layer files', () => {
    // Ensures reliabilityAdjustedIndex has not leaked into UI, API, or service files.
    const nonEngineHits = filesWithRAI.filter(f => !f.startsWith('lib/kora-engine'));
    expect(
      nonEngineHits,
      `reliabilityAdjustedIndex found outside lib/kora-engine: ${nonEngineHits.join(', ')}`,
    ).toEqual([]);
  });
});

// ── Test 8 — types.ts KoraIndexUncertainty.shrunkValue documentation ─────────

describe('types.ts KoraIndexUncertainty.shrunkValue documentation', () => {
  const typesSrc = src('lib/kora-engine/types.ts');
  // Isolate KoraIndexUncertainty interface block.
  const uncertaintyBlock = typesSrc.slice(
    typesSrc.indexOf('KoraIndexUncertainty'),
    typesSrc.indexOf('export interface KoraIndexResult'),
  );

  it('KoraIndexUncertainty block mentions shrunkValue', () => {
    expect(uncertaintyBlock).toContain('shrunkValue');
  });

  it('KoraIndexUncertainty block labels shrunkValue as internal', () => {
    expect(uncertaintyBlock).toMatch(/internal/i);
  });

  it('KoraIndexUncertainty block labels shrunkValue as diagnostic', () => {
    expect(uncertaintyBlock).toMatch(/diagnostic/i);
  });

  it('KoraIndexUncertainty block states shrunkValue is NOT the official KORA Index', () => {
    expect(uncertaintyBlock).toMatch(/NOT the official KORA Index/i);
  });

  it('KoraIndexUncertainty block names koraIndex.value as the official KORA Index', () => {
    expect(uncertaintyBlock).toContain('koraIndex.value');
  });
});
