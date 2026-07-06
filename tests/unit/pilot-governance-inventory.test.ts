/**
 * PILOT-GOVERNANCE-01 — Governance inventory / drift tripwire.
 *
 * Static only: reads files from disk and checks marker phrases. No network,
 * no Supabase, no credentials, no Playwright, nothing mutated. Follows the
 * existing repo pattern for this kind of check (see
 * tests/unit/b103-golden-path.test.ts, tests/unit/rls-policy-inventory.test.ts).
 *
 * Purpose: if a future change deletes a critical governance doc/E2E scaffold
 * file, or silently removes the specific claim that keeps it from being
 * overclaimed (e.g. "GD01 not run live", "COMPANY_B does not exist"), this
 * test fails — a structural regression trip-wire, not a runtime proof.
 * See docs/PILOT_GOVERNANCE.md §14 for the full "do not claim" list this
 * test partially guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  try {
    readFileSync(resolve(root, relPath));
    return true;
  } catch {
    return false;
  }
}

const CRITICAL_FILES = [
  'docs/GATE2_STATUS.md',
  'docs/PILOT_SAAS_READINESS.md',
  'docs/DEPLOY_CHECKLIST.md',
  'docs/CI.md',
  'docs/E2E_GOLDEN_PATH.md',
  'docs/E2E_TWO_TENANT_ISOLATION.md',
  'docs/GOLDEN_PATH.md',
  'docs/API_ROUTE_AUTH_MATRIX.md',
  'docs/access-matrix.md',
  'docs/PILOT_GOVERNANCE.md',
  'tests/e2e/golden-data-bearing.spec.ts',
  'tests/e2e/two-tenant-isolation.spec.ts',
  'tests/integration/rls-two-tenant-negative.test.ts',
  'tests/unit/rls04-app-api-tenant-enforcement.test.ts',
] as const;

// ── 1. Critical files exist ────────────────────────────────────────────────

describe('PILOT-GOVERNANCE-01 — critical governance files exist', () => {
  for (const relPath of CRITICAL_FILES) {
    it(`${relPath} exists`, () => {
      expect(fileExists(relPath)).toBe(true);
    });
  }
});

// ── 2. Gate 2 status marker ────────────────────────────────────────────────

describe('PILOT-GOVERNANCE-01 — Gate 2 status', () => {
  it('docs/GATE2_STATUS.md states Gate 2 is closed with conditions', () => {
    expect(readFile('docs/GATE2_STATUS.md')).toMatch(/CLOSED WITH CONDITIONS/);
  });
});

// ── 3. CI scope markers ────────────────────────────────────────────────────

describe('PILOT-GOVERNANCE-01 — CI scope and limits', () => {
  it('docs/CI.md documents that E2E/Playwright is excluded from CI', () => {
    expect(readFile('docs/CI.md')).toMatch(/Playwright/);
  });

  it('docs/CI.md documents no Supabase/Production secret is referenced by CI', () => {
    const doc = readFile('docs/CI.md');
    expect(doc).toMatch(/no secrets? (?:is|are) committed|does not reference any repository secret/i);
  });
});

// ── 4. GD01 / golden path — scaffolded, not live-run ───────────────────────

describe('PILOT-GOVERNANCE-01 — GD01 scaffolded-not-live-run status', () => {
  it('tests/e2e/golden-data-bearing.spec.ts defines the GD01 test', () => {
    expect(readFile('tests/e2e/golden-data-bearing.spec.ts')).toMatch(/GD01/);
  });

  it('docs/E2E_GOLDEN_PATH.md discloses GD01 has never been executed live', () => {
    expect(readFile('docs/E2E_GOLDEN_PATH.md')).toMatch(/never.*executed against real staging|not yet run live/i);
  });
});

// ── 5. Two-tenant isolation — scaffolded, blocked on COMPANY_B ─────────────

describe('PILOT-GOVERNANCE-01 — two-tenant isolation scaffolded-not-live-run status', () => {
  it('tests/e2e/two-tenant-isolation.spec.ts defines T01 and T02', () => {
    const spec = readFile('tests/e2e/two-tenant-isolation.spec.ts');
    expect(spec).toMatch(/T01/);
    expect(spec).toMatch(/T02/);
  });

  it('tests/e2e/two-tenant-isolation.spec.ts discloses it has never been run live', () => {
    expect(readFile('tests/e2e/two-tenant-isolation.spec.ts')).toMatch(/never been run live/i);
  });

  it('docs/E2E_TWO_TENANT_ISOLATION.md states the test has not been run live', () => {
    expect(readFile('docs/E2E_TWO_TENANT_ISOLATION.md')).toMatch(/has not been run live/i);
  });
});

// ── 6. COMPANY_B absence ────────────────────────────────────────────────────

describe('PILOT-GOVERNANCE-01 — COMPANY_B absence is documented consistently', () => {
  it('docs/PILOT_SAAS_READINESS.md states COMPANY_B does not exist', () => {
    expect(readFile('docs/PILOT_SAAS_READINESS.md')).toMatch(/COMPANY_B doesn't exist|COMPANY_B does not exist/);
  });

  it('docs/GOLDEN_PATH.md states COMPANY_B does not exist', () => {
    expect(readFile('docs/GOLDEN_PATH.md')).toMatch(/COMPANY_B does not exist/);
  });

  it('docs/PILOT_GOVERNANCE.md states COMPANY_B does not exist', () => {
    expect(readFile('docs/PILOT_GOVERNANCE.md')).toMatch(/COMPANY_B does not exist/);
  });
});

// ── 7. RLS / static control status — not a runtime proof ──────────────────

describe('PILOT-GOVERNANCE-01 — RLS/static control status', () => {
  it('tests/integration/rls-two-tenant-negative.test.ts is labeled RLS-03', () => {
    expect(readFile('tests/integration/rls-two-tenant-negative.test.ts')).toMatch(/RLS-03/);
  });

  it('tests/unit/rls04-app-api-tenant-enforcement.test.ts is labeled RLS-04', () => {
    expect(readFile('tests/unit/rls04-app-api-tenant-enforcement.test.ts')).toMatch(/RLS-04/);
  });

  it('docs/access-matrix.md asserts its own authority over hardcoded checks', () => {
    expect(readFile('docs/access-matrix.md')).toMatch(/Supera qualsiasi check hardcoded/);
  });

  it('docs/PILOT_GOVERNANCE.md states static tests do not prove runtime behavior', () => {
    expect(readFile('docs/PILOT_GOVERNANCE.md')).toMatch(/does not prove runtime|not.*proof of runtime|not the same claim as/i);
  });
});

// ── 8. "Do not claim" boundaries and validation sequence ──────────────────

describe('PILOT-GOVERNANCE-01 — governance doc boundaries', () => {
  const gov = () => readFile('docs/PILOT_GOVERNANCE.md');

  it('states GD01 has not run live', () => {
    expect(gov()).toMatch(/[Dd]o not claim.*GD01.*(?:run|live)/);
  });

  it('states COMPANY_B does not exist', () => {
    expect(gov()).toMatch(/[Dd]o not claim COMPANY_B exists/);
  });

  it('states two-tenant isolation has not passed live', () => {
    expect(gov()).toMatch(/[Dd]o not claim two-tenant isolation/);
  });

  it('states b103-golden-path.test.ts is not functional E2E coverage', () => {
    expect(gov()).toMatch(/b103-golden-path\.test\.ts/);
  });

  it('includes a final validation sequence', () => {
    expect(gov()).toMatch(/[Ff]inal validation sequence/);
  });

  it('states credential cleanup is deferred', () => {
    expect(gov()).toMatch(/credential cleanup.*deferred|deferred.*credential cleanup/i);
  });
});
