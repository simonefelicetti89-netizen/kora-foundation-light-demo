// tests/unit/controlled-pilot-methodology-disclosure.test.ts
//
// CONTROLLED PILOT GATE — methodology disclosure, non-suppressibility.
//
// Registry 219 §AJ requires, for the Controlled Pilot gate:
//   "methodology disclosure verified present (calibration_status,
//    methodology_version_id, Confidence Score — CLAUDE.md §6/§17,
//    non-suppressible)"
//
// tests/unit/ui-governance.test.ts already proves all three are PRESENT on
// KoraIndexHero. What it does not assert is the property the gate actually
// names: that they are NON-SUPPRESSIBLE — i.e. that no data state, and no
// consuming page, can cause any of them to disappear.
//
// This suite closes exactly that gap and nothing else. It is verification of
// existing behaviour, not a change to methodology UI or semantics: the
// component already satisfies the property, via two constant fallbacks and
// one unconditional render.
//
// Scope note: the primary gate-validation surface is app/company/reports,
// the only page that renders KoraIndexHero.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { CALIBRATION_STATUS, METHODOLOGY_VERSION } from '@/lib/constants/kora';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const HERO = 'components/kora-index/KoraIndexHero.tsx';
const PRIMARY_SURFACE = 'app/company/reports/page.tsx';

/** Strip comments so an assertion can never be satisfied by prose alone. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

describe('Controlled Pilot — the disclosure surface exists', () => {
  it('KoraIndexHero exists and the primary gate surface renders it', () => {
    expect(existsSync(join(ROOT, HERO))).toBe(true);
    expect(existsSync(join(ROOT, PRIMARY_SURFACE))).toBe(true);
    expect(read(PRIMARY_SURFACE)).toContain('KoraIndexHero');
  });
});

describe('Controlled Pilot — calibration_status is non-suppressible', () => {
  it('falls back to the canonical constant, so it can never be absent', () => {
    // `?? CALIBRATION_STATUS` is what makes this non-suppressible: a missing
    // or null output field cannot blank the badge.
    expect(code(read(HERO))).toMatch(
      /calibrationStatus\s*=\s*output\?\.calibration_status\s*\?\?\s*CALIBRATION_STATUS/,
    );
  });

  it('the fallback constant is the canonical pre-empirical value', () => {
    expect(CALIBRATION_STATUS).toBe('pre_empirical_calibration');
  });

  it('it is rendered, not merely computed', () => {
    const src = code(read(HERO));
    expect(src).toMatch(/<CalibrationBadge\s+status=\{calibrationStatus\}/);
    expect(src).toContain('{calibrationStatus}');
  });
});

describe('Controlled Pilot — methodology_version_id is non-suppressible', () => {
  it('falls back to the canonical constant, so it can never be absent', () => {
    expect(code(read(HERO))).toMatch(
      /methodologyVersionId\s*=\s*output\?\.methodology_version_id\s*\?\?\s*METHODOLOGY_VERSION/,
    );
  });

  it('the fallback constant is the public version label', () => {
    // CLAUDE.md §5: public/client-facing surfaces carry "KORA Index v1.0";
    // "v3" names the internal methodology generation, a different axis.
    expect(METHODOLOGY_VERSION).toBe('KORA Index v1.0');
  });

  it('it is rendered, not merely computed', () => {
    expect(code(read(HERO))).toContain('{methodologyVersionId}');
  });
});

describe('Controlled Pilot — Confidence Score is non-suppressible', () => {
  it('its label is rendered unconditionally, never behind a guard', () => {
    const src = code(read(HERO));
    expect(src).toContain('Confidence Score:');
    // The label must not sit inside a conditional that could omit it.
    expect(src).not.toMatch(/\{\s*confidenceScore\s*(!==|!=)\s*null\s*&&[\s\S]{0,200}Confidence Score:/);
    expect(src).not.toMatch(/\{\s*confidenceScore\s*&&[\s\S]{0,200}Confidence Score:/);
  });

  it('a null score degrades to a placeholder rather than disappearing', () => {
    // This is the whole point: absent data must still disclose absence.
    expect(code(read(HERO))).toMatch(
      /confidenceScore\s*!==\s*null\s*\?\s*formatConfidenceScore\(confidenceScore\)\s*:\s*'—'/,
    );
  });
});

describe('Controlled Pilot — all three disclose together on one surface', () => {
  it('KoraIndexHero carries every required element in a single render path', () => {
    const src = code(read(HERO));
    for (const required of ['calibrationStatus', 'methodologyVersionId', 'Confidence Score:']) {
      expect(src, `${required} missing from the disclosure surface`).toContain(required);
    }
  });

  it('the consuming page does not strip them by rendering a substitute', () => {
    // doc 21b: consuming pages must not remove the non-suppressible elements.
    // The surface must use the governed component, not hand-roll an index card.
    const surface = code(read(PRIMARY_SURFACE));
    expect(surface).toContain('KoraIndexHero');
  });
});
