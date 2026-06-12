/**
 * B100 — Versioning Consistency
 *
 * Canonical rules:
 *   Product version:     KORA Foundation Light
 *   Methodology version: KORA Index v1.0
 *   Calibration status:  pre_empirical_calibration
 *
 * Forbidden in UI-visible strings:
 *   'KORA Index v3', 'Foundation Light v0.1', 'KORA Methodology v0.1',
 *   'Foundation Light v1.0', 'v0.1' as a product version label
 *
 * NOT changed (structural keys, filenames, function names):
 *   lib/methodology-config/v0.1.ts  — filename preserved
 *   kora_index_v3                   — JSON/snake_case structural key preserved
 *   getKoraIndexV3Config            — function name preserved
 *   calibration notes in html-template referencing 'v0.1' as calibration state
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

  it('contains KORA Index v1.0 (canonical methodology version)', () => {
    expect(html).toContain('KORA Index v1.0');
  });

  it('contains pre_empirical_calibration (calibration status preserved)', () => {
    expect(html).toContain('pre_empirical_calibration');
  });

  it('contains KORA Foundation Light (product label)', () => {
    expect(html).toContain('KORA Foundation Light');
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
