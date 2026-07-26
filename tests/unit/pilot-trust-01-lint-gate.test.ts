/**
 * PILOT-TRUST-01 (F-01) — lint gate guard.
 *
 * Static test: reads .github/workflows/ci.yml as text and asserts the lint
 * step is real and blocking. Prevents a future edit from silently
 * re-introducing `|| true` / `continue-on-error` on the lint step, which is
 * exactly how the original F-01 finding happened (masked failure in CI).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const CI_WORKFLOW_PATH = 'ci.yml';
const ciSrc = readFileSync(join(REPO_ROOT, '.github', 'workflows', CI_WORKFLOW_PATH), 'utf8');

function extractStep(src: string, stepNameMarker: string): string {
  const start = src.indexOf(stepNameMarker);
  expect(start, `step "${stepNameMarker}" not found in ci.yml`).toBeGreaterThan(-1);
  const nextStepDash = src.indexOf('\n      - name:', start + stepNameMarker.length);
  const end = nextStepDash === -1 ? src.length : nextStepDash;
  return src.slice(start, end);
}

describe('CI lint gate (F-01) — must be real and blocking', () => {
  const lintStep = extractStep(ciSrc, '- name: Lint (blocking)');

  it('runs the actual lint command, not a report-only variant', () => {
    expect(lintStep).toMatch(/run:\s*npm run lint\s*$/m);
  });

  it('does not mask a lint failure with `|| true` or an equivalent', () => {
    expect(lintStep).not.toMatch(/\|\|\s*true/);
    expect(lintStep).not.toMatch(/\|\|\s*exit 0/);
  });

  it('does not set continue-on-error on the lint step', () => {
    expect(lintStep).not.toMatch(/continue-on-error/i);
  });

  it('the ci job itself has no job-level continue-on-error', () => {
    const jobStart = ciSrc.indexOf('\n  ci:\n');
    expect(jobStart).toBeGreaterThan(-1);
    const jobEnd = ciSrc.indexOf('\n  kora-link-local-integration:', jobStart);
    const ciJob = ciSrc.slice(jobStart, jobEnd === -1 ? undefined : jobEnd);
    expect(ciJob).not.toMatch(/continue-on-error/i);
  });

  it('no `|| true` appears anywhere in ci.yml (the lint step is the only place it was ever used)', () => {
    expect(ciSrc).not.toMatch(/\|\|\s*true/);
  });
});

describe('eslint-suppressions.json — documented, exact-count baseline (not a silent mask)', () => {
  const suppressions = JSON.parse(readFileSync(join(REPO_ROOT, 'eslint-suppressions.json'), 'utf8')) as Record<
    string,
    Record<string, { count: number }>
  >;

  it('exists and is valid JSON with at least one entry', () => {
    expect(Object.keys(suppressions).length).toBeGreaterThan(0);
  });

  it('every entry records an explicit numeric count (a ratchet, not a blanket file-level ignore)', () => {
    for (const [file, rules] of Object.entries(suppressions)) {
      for (const [rule, info] of Object.entries(rules)) {
        expect(typeof info.count, `${file} / ${rule} must have a numeric count`).toBe('number');
        expect(info.count, `${file} / ${rule} count must be a positive integer`).toBeGreaterThan(0);
      }
    }
  });
});
