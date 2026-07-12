/**
 * PILOT-GOVERNANCE-01 — Governance inventory / drift tripwire.
 * Restructured by B174-A2 (2026-07-12) — see docs/PILOT_GOVERNANCE.md §15a.
 *
 * Static only: reads files from disk and checks marker phrases. No network,
 * no Supabase, no credentials, no Playwright, nothing mutated. Follows the
 * existing repo pattern for this kind of check (see
 * tests/unit/b103-golden-path.test.ts, tests/unit/rls-policy-inventory.test.ts).
 *
 * Purpose: if a future change deletes a critical governance doc/E2E scaffold
 * file, this test fails — a structural regression trip-wire, not a runtime
 * proof.
 *
 * B174-A2 restructuring rationale: the original version of this test asserted
 * that docs must contain unconditional phrases like "COMPANY_B does not
 * exist" and "GD01 ... not yet run live" as proof they weren't overclaiming.
 * That was correct before 2026-07-09. Repo evidence (docs/E2E_GOLDEN_PATH.md,
 * docs/E2E_TWO_TENANT_ISOLATION.md, docs/QA_STATUS.md's RLS-06 entries)
 * indicates COMPANY_B was provisioned and A02-A04/T01/T02/GD01/RLS-06 all ran
 * live and passed in staging that day — not independently re-verified since.
 * The docs were reconciled by B174-A2 to state this with a dated caveat
 * instead of the old unconditional "does not exist"/"never run" phrasing.
 *
 * This file now guards TWO things instead of one:
 *   (a) historical-context assertions — the pre-2026-07-09 phrasing may still
 *       appear in a doc, but ONLY inside a sentence that also carries a
 *       reconciliation marker (e.g. "previously", "B174-A2", "updated by",
 *       "repo evidence indicates", "2026-07-09") — i.e. it must read as
 *       history, not as an unconditional current claim. If a future edit
 *       strips that framing and leaves the bare stale claim, this fails.
 *   (b) current-status assertions — the reconciled docs must state the
 *       2026-07-09 documented status AND the "not independently re-verified"
 *       caveat. If a future edit removes the caveat and asserts the
 *       2026-07-09 result as a freshly-confirmed fact, this fails too.
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

// A reconciliation marker proves a nearby stale-sounding phrase is framed as
// history, not as an unconditional current claim.
const RECONCILIATION_MARKER = /previously|B174-A2|updated by|repo evidence indicates|2026-07-09/i;

// Asserts every occurrence of `stalePhrase` in `text` has a reconciliation
// marker within `contextWindow` characters on either side — i.e. it can only
// appear as clearly-framed historical context, never as a bare current claim.
function assertStalePhraseOnlyAppearsAsHistory(
  text: string,
  stalePhrase: RegExp,
  contextWindow = 500,
): void {
  const matches = [...text.matchAll(new RegExp(stalePhrase, stalePhrase.flags.includes('g') ? stalePhrase.flags : stalePhrase.flags + 'g'))];
  for (const m of matches) {
    const idx = m.index ?? 0;
    const windowStart = Math.max(0, idx - contextWindow);
    const windowEnd = Math.min(text.length, idx + contextWindow);
    const window = text.slice(windowStart, windowEnd);
    expect(
      RECONCILIATION_MARKER.test(window),
      `Stale phrase "${m[0]}" found without a nearby reconciliation marker (previously/B174-A2/updated by/repo evidence indicates/2026-07-09)`,
    ).toBe(true);
  }
}

// Asserts the doc states the 2026-07-09 documented status AND the
// not-independently-re-verified caveat — the two-part current-status claim
// this reconciliation requires everywhere Company B/GD01/T01/T02 is discussed.
function assertCurrentStatusWithCaveat(text: string, docLabel: string): void {
  expect(text, `${docLabel} must mention the 2026-07-09 documented validation`).toMatch(/2026-07-09/);
  expect(
    text,
    `${docLabel} must include the "not independently re-verified" caveat`,
  ).toMatch(/independently re-verified/i);
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
  'docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md',
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

// ── 4. GD01 — B174-A2 dual status (documented pass + not-re-verified caveat) ─

describe('PILOT-GOVERNANCE-01 — GD01 status, reconciled by B174-A2', () => {
  it('tests/e2e/golden-data-bearing.spec.ts defines the GD01 test', () => {
    expect(readFile('tests/e2e/golden-data-bearing.spec.ts')).toMatch(/GD01/);
  });

  it('docs/E2E_GOLDEN_PATH.md states the 2026-07-09 documented live pass (this is the origin record — not in scope for the B174-A2 caveat rewrite, see §6 below for the reconciled aggregate docs)', () => {
    const doc = readFile('docs/E2E_GOLDEN_PATH.md');
    expect(doc).toMatch(/2026-07-09/);
    expect(doc).toMatch(/passed/i);
  });

  it('historical "never yet executed"/"not yet run live" phrasing in docs/E2E_GOLDEN_PATH.md only appears as disclosed history, superseded by the live log', () => {
    const doc = readFile('docs/E2E_GOLDEN_PATH.md');
    // This doc's own convention (unchanged by B174-A2): the original
    // "Known gaps" bullet is kept verbatim but immediately superseded by an
    // "Update:" banner pointing at the live validation log below it.
    expect(doc).toMatch(/never.*executed against real staging|not yet run live/i);
    expect(doc).toMatch(/supersedes this bullet|Live staging validation log/i);
  });

  it('docs/PILOT_SAAS_READINESS.md states the GD01 2026-07-09 documented pass, with caveat', () => {
    const doc = readFile('docs/PILOT_SAAS_READINESS.md');
    assertCurrentStatusWithCaveat(doc, 'docs/PILOT_SAAS_READINESS.md');
  });
});

// ── 5. Two-tenant isolation — B174-A2 dual status ──────────────────────────

describe('PILOT-GOVERNANCE-01 — two-tenant isolation status, reconciled by B174-A2', () => {
  it('tests/e2e/two-tenant-isolation.spec.ts defines T01 and T02', () => {
    const spec = readFile('tests/e2e/two-tenant-isolation.spec.ts');
    expect(spec).toMatch(/T01/);
    expect(spec).toMatch(/T02/);
  });

  it('docs/E2E_TWO_TENANT_ISOLATION.md states the 2026-07-09 documented live pass (this is the origin record — not in scope for the B174-A2 caveat rewrite, see §6 below for the reconciled aggregate docs)', () => {
    const doc = readFile('docs/E2E_TWO_TENANT_ISOLATION.md');
    expect(doc).toMatch(/2026-07-09/);
    expect(doc).toMatch(/passed/i);
  });

  it('historical "has not been run live" phrasing in docs/E2E_TWO_TENANT_ISOLATION.md only appears as disclosed history, superseded by the live log', () => {
    const doc = readFile('docs/E2E_TWO_TENANT_ISOLATION.md');
    expect(doc).toMatch(/has not been run live/i);
    expect(doc).toMatch(/superseded|Live staging validation log/i);
  });
});

// ── 6. COMPANY_B status — B174-A2 dual status across aggregate docs ────────

describe('PILOT-GOVERNANCE-01 — COMPANY_B status, reconciled by B174-A2', () => {
  const AGGREGATE_DOCS = [
    'docs/STATUS.md',
    'docs/GOLDEN_PATH.md',
    'docs/PILOT_SAAS_READINESS.md',
    'docs/PILOT_GOVERNANCE.md',
    'docs/PILOT_OPERATING_RUNBOOK.md',
    'docs/PILOT_REVIEW_PACKAGE.md',
    'docs/PILOT_PRIVACY_GOVERNANCE.md',
  ] as const;

  for (const relPath of AGGREGATE_DOCS) {
    it(`${relPath} states the 2026-07-09 documented Company B validation, with caveat`, () => {
      assertCurrentStatusWithCaveat(readFile(relPath), relPath);
    });

    it(`${relPath} — any pre-2026-07-09 "COMPANY_B does not exist"-style claim only appears as disclosed history`, () => {
      const doc = readFile(relPath);
      assertStalePhraseOnlyAppearsAsHistory(doc, /COMPANY_B (?:does not|doesn't) exist/gi);
      assertStalePhraseOnlyAppearsAsHistory(doc, /absent in every environment/gi);
    });
  }

  it('docs/PILOT_GOVERNANCE.md §15a records the reconciliation explicitly', () => {
    expect(readFile('docs/PILOT_GOVERNANCE.md')).toMatch(/15a\. B174-A \/ B174-A2 reconciliation note/);
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

  it('docs/QA_STATUS.md documents RLS-06 live run status (local Postgres only, 2026-07-09)', () => {
    const doc = readFile('docs/QA_STATUS.md');
    expect(doc).toMatch(/RLS-06/);
    expect(doc).toMatch(/2026-07-09/);
  });
});

// ── 8. "Do not claim" boundaries — reframed with dated caveats by B174-A2 ──

describe('PILOT-GOVERNANCE-01 — governance doc boundaries, reconciled by B174-A2', () => {
  const gov = () => readFile('docs/PILOT_GOVERNANCE.md');

  it('still carries a "do not claim" boundaries section', () => {
    expect(gov()).toMatch(/"Do not claim" boundaries/);
  });

  it('reframes GD01/COMPANY_B/two-tenant claims around the dated 2026-07-09 caveat, not a bare denial', () => {
    const doc = gov();
    expect(doc).toMatch(/Do not claim `GD01` has run live and passed/);
    expect(doc).toMatch(/Do not claim COMPANY_B exists/);
    expect(doc).toMatch(/Do not claim two-tenant isolation.*has passed live/);
    expect(doc).toMatch(/independently re-verified/i);
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

  it('new B174-A2 boundary: does not claim anything is "currently live-verified" solely because it is documented as passed 2026-07-09', () => {
    expect(gov()).toMatch(/Documented-and-dated is not the same claim as currently-confirmed/i);
  });
});

// ── 9. Pilot demo script — operator-facing claims carry the dated caveat ───

describe('PILOT-GOVERNANCE-01 — pilot demo script does not tell an operator to overclaim', () => {
  it('docs/PILOT_DEMO_SCRIPT.md GD01/two-tenant/COMPANY_B talking points carry the 2026-07-09 + caveat framing', () => {
    const doc = readFile('docs/PILOT_DEMO_SCRIPT.md');
    assertCurrentStatusWithCaveat(doc, 'docs/PILOT_DEMO_SCRIPT.md');
  });

  it('docs/PILOT_DEMO_SCRIPT.md still instructs the operator not to imply a same-day fresh confirmation without one', () => {
    const doc = readFile('docs/PILOT_DEMO_SCRIPT.md');
    expect(doc).toMatch(/fresh confirmation/i);
  });
});
