/**
 * PILOT-TRUST-01 (F-04) — RLS integration tests must run for real in the
 * mandatory CI DB job, never silently skipped.
 *
 * STATIC test: reads .github/workflows/ci.yml as text. Prevents a future
 * edit from re-introducing the old `if: steps.docker_check.outputs.available
 * == 'true'` soft-skip pattern, or dropping the RLS-03/05/06 step, or the
 * explicit 0-skipped/0-failed assertion.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const ciSrc = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');

function extractJob(src: string, jobKey: string, nextJobKey?: string): string {
  const start = src.indexOf(`\n  ${jobKey}:\n`);
  expect(start, `job "${jobKey}" not found`).toBeGreaterThan(-1);
  const end = nextJobKey ? src.indexOf(`\n  ${nextJobKey}:`, start) : src.length;
  return src.slice(start, end === -1 ? undefined : end);
}

const dbJob = extractJob(ciSrc, 'kora-link-local-integration');

describe('CI DB-backed job (F-04) — Docker/DB availability is mandatory, not a soft skip', () => {
  it('fails the job outright when Docker is unavailable, instead of a soft warning-and-continue', () => {
    expect(dbJob).toMatch(/if\s*!\s*docker info[\s\S]{0,400}exit 1/);
  });

  it('no step in this job is conditioned on a docker-availability soft-check output', () => {
    expect(dbJob).not.toMatch(/if:\s*steps\.docker_check\.outputs\.available/);
  });

  it('runs RLS-03, RLS-05, RLS-06, and RLS-07 against a real local Postgres, with the required explicit opt-in env vars', () => {
    for (const suite of ['RLS03', 'RLS05', 'RLS06', 'RLS07']) {
      expect(dbJob).toContain(`${suite}_ALLOW_RUN: 'true'`);
      expect(dbJob).toMatch(new RegExp(`${suite}_PG_URL: postgresql://postgres:postgres@127\\.0\\.0\\.1:54322/postgres`));
    }
    expect(dbJob).toContain('tests/integration/rls-two-tenant-negative.test.ts');
    expect(dbJob).toContain('tests/integration/rls-worker-isolation.test.ts');
    expect(dbJob).toContain('tests/integration/rls-kora-admin-control.test.ts');
    expect(dbJob).toContain('tests/integration/rls-worker-own-initiative-participation.test.ts');
  });

  it('never points an RLS suite at a non-local host', () => {
    expect(dbJob).not.toMatch(/RLS0[3567]_PG_URL:(?!\s*postgresql:\/\/postgres:postgres@127\.0\.0\.1)/);
  });

  it('asserts exactly 0 skipped and 0 failed RLS tests via a machine-readable check, not just a human-read log', () => {
    expect(dbJob).toContain("if (r.numTotalTests === 0)");
    expect(dbJob).toContain('r.numPendingTests !== 0');
    expect(dbJob).toContain('r.numFailedTests !== 0');
    expect(dbJob).toMatch(/numPendingTests !== 0[\s\S]{0,400}process\.exit\(1\)/);
    expect(dbJob).toMatch(/numFailedTests !== 0[\s\S]{0,400}process\.exit\(1\)/);
  });

  it('still runs the KORA Link C1-C10 behavioral suite unconditionally in the same job', () => {
    expect(dbJob).toContain('npm run test:kora-link:behavioral');
  });

  it('always stops the local Supabase stack, even on failure', () => {
    const stopStepIdx = dbJob.indexOf('Stop local Supabase stack');
    expect(stopStepIdx).toBeGreaterThan(-1);
    const before = dbJob.slice(0, stopStepIdx);
    const ifAlwaysIdx = before.lastIndexOf('if: always()');
    expect(ifAlwaysIdx).toBeGreaterThan(-1);
  });
});
