/**
 * B100 / KORA-INDEX-VERSION-02 — Versioning Consistency
 *
 * Canonical rules (founder decision, KORA-INDEX-VERSION-02):
 *   Product version:                KORA Foundation Light
 *   Public/client-facing version:   KORA Index v1.0
 *   Internal methodology/architecture label: KORA Methodology Architecture v3
 *                                    (10-component macroblock structure — see CLAUDE.md §5)
 *   Calibration status:             pre_empirical_calibration
 *
 * Forbidden in UI-visible / client-facing / report / PDF strings:
 *   'KORA Index v0.1', 'KORA Index v2.0', 'KORA Index v3', 'KORA Index™ v3',
 *   'Foundation Light v0.1', 'KORA Methodology v0.1', 'Foundation Light v1.0'
 *
 * NOT changed (structural keys, filenames, function names):
 *   lib/methodology-config/v0.1.ts  — filename preserved
 *   kora_index_v3                   — JSON/snake_case structural key preserved
 *   getKoraIndexV3Config            — function name preserved
 *   calibration notes in html-template referencing 'v0.1' as calibration state
 *   docs/10-architecture-v3-layer-specification.md and other numbered canonical
 *   docs — "KORA Index v3" there refers to the internal architecture generation,
 *   not the public product label, and is out of scope for this test file.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRODUCT_VERSION,
  KORA_INDEX_VERSION,
  METHODOLOGY_VERSION,
  METHODOLOGY_CALIBRATION_VERSION,
  CALIBRATION_STATUS,
} from '@/lib/constants/kora';
import { getMethodologyVersion, getCalibrationStatus, getMacroblockWeights } from '@/lib/methodology-config/v0.1';

// ── helpers ───────────────────────────────────────────────────────────────────

const root = resolve(process.cwd());

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function readJson(relPath: string): unknown {
  return JSON.parse(readSrc(relPath));
}

// ── 1. lib/constants/kora.ts — canonical constants ────────────────────────────

describe('B100 — lib/constants/kora.ts canonical version exports', () => {
  it('PRODUCT_VERSION is KORA Foundation Light', () => {
    expect(PRODUCT_VERSION).toBe('KORA Foundation Light');
  });

  it('KORA_INDEX_VERSION is KORA Index v1.0', () => {
    expect(KORA_INDEX_VERSION).toBe('KORA Index v1.0');
  });

  it('METHODOLOGY_VERSION is KORA Index v1.0', () => {
    expect(METHODOLOGY_VERSION).toBe('KORA Index v1.0');
  });

  it('METHODOLOGY_CALIBRATION_VERSION is pre_empirical_calibration', () => {
    expect(METHODOLOGY_CALIBRATION_VERSION).toBe('pre_empirical_calibration');
  });

  it('CALIBRATION_STATUS is pre_empirical_calibration', () => {
    expect(CALIBRATION_STATUS).toBe('pre_empirical_calibration');
  });

  it('no legacy version string KORA Index v3 in constants', () => {
    const src = readSrc('lib/constants/kora.ts');
    expect(src).not.toContain('KORA Index v3');
  });

  it('no legacy version string Foundation Light v0.1 in constants', () => {
    const src = readSrc('lib/constants/kora.ts');
    expect(src).not.toContain('Foundation Light v0.1');
  });

  it('no legacy version string KORA Methodology v0.1 in constants', () => {
    const src = readSrc('lib/constants/kora.ts');
    expect(src).not.toContain('KORA Methodology v0.1');
  });
});

// ── 2. lib/methodology-config/v0.1.ts — config loader ────────────────────────

describe('B100 — methodology-config getVersion() returns canonical string', () => {
  it('getMethodologyVersion() returns KORA Index v1.0', () => {
    expect(getMethodologyVersion()).toBe('KORA Index v1.0');
  });

  it('getCalibrationStatus() returns pre_empirical_calibration', () => {
    expect(getCalibrationStatus()).toBe('pre_empirical_calibration');
  });

  it('getMacroblockWeights() returns 4 macroblocks with correct total weight', () => {
    const weights = getMacroblockWeights();
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(Math.round(total * 100)).toBe(100);
  });

  it('getMacroblockWeights() contains REACH, QUALITY, EQUITY, BTI', () => {
    const weights = getMacroblockWeights();
    expect(weights).toHaveProperty('REACH');
    expect(weights).toHaveProperty('QUALITY');
    expect(weights).toHaveProperty('EQUITY');
    expect(weights).toHaveProperty('BTI');
  });
});

// ── 3. data/methodology/methodology-config.json ───────────────────────────────

describe('B100 — methodology-config.json version field', () => {
  const config = readJson('data/methodology/methodology-config.json') as Record<string, unknown>;

  it('config.version is KORA Index v1.0', () => {
    expect(config['version']).toBe('KORA Index v1.0');
  });

  it('config.calibration_status is pre_empirical_calibration', () => {
    expect(config['calibration_status']).toBe('pre_empirical_calibration');
  });

  it('structural key kora_index_v3 is preserved (not renamed)', () => {
    // B100 rule: snake_case structural key must NOT be renamed
    expect(config).toHaveProperty('kora_index_v3');
  });

  it('config.version does not contain KORA Index v3', () => {
    expect(String(config['version'])).not.toContain('KORA Index v3');
  });

  it('config.version does not contain KORA Index v2.0', () => {
    expect(String(config['version'])).not.toContain('KORA Index v2.0');
  });

  it('config.version does not contain KORA Methodology v0.1', () => {
    expect(String(config['version'])).not.toContain('KORA Methodology v0.1');
  });
});

// ── 4. Provision route — methodology_version_id ───────────────────────────────

describe('B100 — provision route methodology_version_id', () => {
  it('uses KORA Index v1.0, not KORA Methodology v0.1', () => {
    const src = readSrc('app/api/admin/companies/provision/route.ts');
    expect(src).toContain("'KORA Index v1.0'");
    expect(src).not.toContain('KORA Methodology v0.1');
  });

  it('does not contain KORA Index v2.0 (newly generated metadata must not use the deprecated label)', () => {
    const src = readSrc('app/api/admin/companies/provision/route.ts');
    expect(src).not.toContain('KORA Index v2.0');
  });

  it('does not contain KORA Index v3', () => {
    const src = readSrc('app/api/admin/companies/provision/route.ts');
    expect(src).not.toContain('KORA Index v3');
  });
});

// ── 5. Forbidden legacy strings — spot checks on key files ───────────────────

describe('B100 — legacy string absence in key files', () => {
  const filesToCheck: Array<[string, string]> = [
    ['lib/constants/kora.ts',                       'constants'],
    ['data/methodology/methodology-config.json',     'methodology config JSON'],
    ['app/api/admin/companies/provision/route.ts',   'provision route'],
    ['app/demo/advisor/page.tsx',                         'advisor page'],
  ];

  for (const [filePath, label] of filesToCheck) {
    it(`no "KORA Index v3" in ${label}`, () => {
      const src = readSrc(filePath);
      expect(src).not.toContain('KORA Index v3');
    });

    it(`no "KORA Index v2.0" in ${label}`, () => {
      const src = readSrc(filePath);
      expect(src).not.toContain('KORA Index v2.0');
    });

    it(`no "KORA Index v0.1" in ${label}`, () => {
      const src = readSrc(filePath);
      expect(src).not.toContain('KORA Index v0.1');
    });

    it(`no "KORA Methodology v0.1" in ${label}`, () => {
      const src = readSrc(filePath);
      expect(src).not.toContain('KORA Methodology v0.1');
    });

    it(`no "Foundation Light v0.1" in ${label}`, () => {
      const src = readSrc(filePath);
      expect(src).not.toContain('Foundation Light v0.1');
    });

    it(`no "Foundation Light v1.0" in ${label}`, () => {
      const src = readSrc(filePath);
      expect(src).not.toContain('Foundation Light v1.0');
    });
  }
});

// ── 6. html-template — correct version strings on cover ───────────────────────

describe('B100 — html-template version labels', () => {
  const html = readSrc('lib/decision-pack/html-template.ts');

  it('contains KORA Index v1.0 (canonical public methodology version)', () => {
    expect(html).toContain('KORA Index v1.0');
  });

  it('contains pre_empirical_calibration (calibration status preserved)', () => {
    expect(html).toContain('pre_empirical_calibration');
  });

  it('contains KORA Foundation Light (product label)', () => {
    expect(html).toContain('KORA Foundation Light');
  });

  it('does not contain KORA Index v2.0 (deprecated — exported PDF must match in-app preview)', () => {
    expect(html).not.toContain('KORA Index v2.0');
  });

  it('does not contain KORA Index v3 as a version label', () => {
    expect(html).not.toContain('KORA Index v3');
  });

  it('does not contain KORA Methodology v0.1', () => {
    expect(html).not.toContain('KORA Methodology v0.1');
  });

  it('does not contain Foundation Light v0.1', () => {
    expect(html).not.toContain('Foundation Light v0.1');
  });

  it('does not contain Foundation Light v1.0', () => {
    expect(html).not.toContain('Foundation Light v1.0');
  });
});

// ── 7. Preserved invariants ───────────────────────────────────────────────────

describe('B100 — structural invariants NOT changed', () => {
  it('methodology-config file path still v0.1.ts (filename unchanged)', () => {
    // The filename lib/methodology-config/v0.1.ts is a path reference, not a product version.
    const src = readSrc('lib/methodology-config/v0.1.ts');
    expect(src.length).toBeGreaterThan(0);
  });

  it('getKoraIndexV3Config function name preserved in methodology-config', () => {
    const src = readSrc('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getKoraIndexV3Config');
  });

  it('kora_index_v3 structural key present in methodology-config.json', () => {
    const config = readJson('data/methodology/methodology-config.json') as Record<string, unknown>;
    expect(config).toHaveProperty('kora_index_v3');
  });
});

// ── 8. KORA-INDEX-VERSION-02 — cross-surface consistency ──────────────────────
// Regression guard for the credibility bug found in KORA-INDEX-VERSION-01:
// the same KORA Index score must never show two different version labels
// across preview/PDF or workspace/history-API surfaces.

describe('KORA-INDEX-VERSION-02 — Decision Pack preview/PDF label consistency', () => {
  it('DecisionPackHero (in-app preview) and html-template (exported PDF) use the same public version label', () => {
    const preview = readSrc('components/reports/DecisionPackHero.tsx');
    const pdf = readSrc('lib/decision-pack/html-template.ts');
    expect(preview).toContain('KORA Index v1.0');
    expect(pdf).toContain('KORA Index v1.0');
    expect(pdf).not.toContain('KORA Index v2.0');
    expect(pdf).not.toContain('KORA Index v0.1');
    expect(pdf).not.toContain('KORA Index v3');
  });
});

describe('KORA-INDEX-VERSION-02 — Company workspace/history-route label consistency', () => {
  it('CompanyWorkspaceView and the history API route use the same public version label', () => {
    const workspace = readSrc('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    const historyRoute = readSrc('app/api/company/kora-index/history/route.ts');
    expect(workspace).toContain('KORA Index v1.0');
    expect(historyRoute).toContain('KORA Index v1.0');
    expect(workspace).not.toContain('KORA Index v3');
    expect(historyRoute).not.toContain('KORA Index v3');
  });
});

describe('KORA-INDEX-VERSION-02 — lib/constants/kora.ts matches public UI expectation', () => {
  it('KORA_INDEX_VERSION and METHODOLOGY_VERSION equal the label used across public UI', () => {
    expect(KORA_INDEX_VERSION).toBe('KORA Index v1.0');
    expect(METHODOLOGY_VERSION).toBe('KORA Index v1.0');
    expect(KORA_INDEX_VERSION).toBe(METHODOLOGY_VERSION);
  });
});

describe('KORA-INDEX-VERSION-02 — legacy v0.1 removed from key visible components', () => {
  it('HeroDiagnosis.tsx and explainability.ts no longer emit "KORA Index v0.1"', () => {
    const hero = readSrc('components/kora-index/HeroDiagnosis.tsx');
    const explainability = readSrc('lib/kora-engine/explainability.ts');
    expect(hero).not.toContain('KORA Index v0.1');
    expect(explainability).not.toContain('KORA Index v0.1');
  });
});

// ── 9. KORA-INDEX-METHODOLOGY-CONSISTENCY-FIX-01 — superseded component codes ──
// Regression guard: the Decision Pack template must never reintroduce the
// pre-Sprint-1 superseded component codes (NI, VR, CO, WB, EQ — see
// docs/METHODOLOGY.md) in its table-of-contents or component descriptions.
// Current canonical codes: AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, CS.

describe('KORA-INDEX-METHODOLOGY-CONSISTENCY-FIX-01 — Decision Pack component code consistency', () => {
  const html = readSrc('lib/decision-pack/html-template.ts');

  it('table-of-contents lists the current canonical 10 component codes', () => {
    expect(html).toContain('AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, CS');
  });

  it('table-of-contents does not list the superseded component codes', () => {
    expect(html).not.toContain('AR, MAR, NI, VR, CO, WB, PC, PB, EQ, BTI');
  });

  it('does not contain superseded component codes as object keys', () => {
    // Checks the key, not the human-readable name — "Normalized Intensity" is
    // still INT's correct current name, so only the old key (NI:) is stale.
    expect(html).not.toContain("NI:  'Normalized Intensity");
    expect(html).not.toContain("VR:  'Verification Rate");
    expect(html).not.toContain("CO:  'Continuity");
    expect(html).not.toContain("WB:  'Worker Balance");
    expect(html).not.toContain('EQ:  "Equity —');
  });

  it('contains current canonical component-description entries', () => {
    expect(html).toContain('Evidence Quality — solidità e verificabilità delle fonti evidenza');
    expect(html).toContain('Equity Workers — distribuzione IU tra workers attivi');
    expect(html).toContain('Equity Segments — equità del tasso di attivazione tra dipartimenti/sedi');
  });
});

// ── 10. LABEL-SWEEP-01 — superseded component codes on company-facing pages ────
// Regression guard: extends KORA-INDEX-METHODOLOGY-CONSISTENCY-FIX-01 coverage
// (which only checked lib/decision-pack/html-template.ts) to the company-facing
// pages found still carrying pre-Sprint-1 codes during the LABEL-SWEEP-01 census.

describe('LABEL-SWEEP-01 — company-facing component code consistency', () => {
  it('activation page uses canonical CONT/EVQ, not superseded CO/VR', () => {
    const src = readSrc('app/company/activation/page.tsx');
    expect(src).toContain('code="CONT"');
    expect(src).toContain('code="EVQ"');
    expect(src).not.toContain('code="CO"');
    expect(src).not.toContain('code="VR"');
    expect(src).not.toMatch(/\bVR è la quota di Impact Units\b/);
  });

  it('financial page does not use bare "EQ" or the stale 9-code legend', () => {
    const src = readSrc('app/company/financial/page.tsx');
    expect(src).not.toContain("'EQ = Equity");
    expect(src).not.toContain('AR, MAR, NI, VR, CO, WB, PC, PB, EQ');
    expect(src).toContain('AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB');
  });

  it('kora-index detail page renders the resolved EQS/EQW code, not a bare "EQ" label', () => {
    const src = readSrc('app/company/kora-index/page.tsx');
    expect(src).not.toContain('EQ = {Math.round(equityAccess.eqValue');
    expect(src).toContain('{eqCode} = {Math.round(equityAccess.eqValue');
  });

  it('commons page privacy footer does not leak the internal B128 sprint code', () => {
    // Scoped to the rendered footer string only — a `// B128:` file-header
    // comment is fine (internal, not user-visible); only rendered JSX text matters.
    const src = readSrc('app/company/commons/page.tsx');
    expect(src).toContain('KORA Space · Tenant-scoped · Moderation-first ·');
    expect(src).not.toContain('KORA Space · B128 ·');
  });
});
