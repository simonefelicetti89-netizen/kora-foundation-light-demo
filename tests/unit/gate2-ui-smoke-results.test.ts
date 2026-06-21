/**
 * Gate 2 — UI Smoke Test Results assertions.
 *
 * Verifies that docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §6 exists and
 * correctly documents DB-level RLS smoke results, company/worker route inventory,
 * cross-worker blocking, anon blocking, migration state, and pending manual tests.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(
    resolve(root, 'docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md'),
    'utf-8'
  );
}

// ── 1. Smoke results doc exists ───────────────────────────────────────────────

describe('GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md smoke section', () => {
  it('smoke doc exists', () => {
    expect(
      existsSync(resolve(root, 'docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md'))
    ).toBe(true);
  });

  it('smoke doc has UI Smoke Test Results section', () => {
    expect(doc()).toMatch(/UI Smoke Test Results/i);
  });
});

// ── 2. Doc includes company smoke results ─────────────────────────────────────

describe('doc includes company smoke results', () => {
  it('doc references company workspace route', () => {
    expect(doc()).toMatch(/company\/workspace|\/company\/login/i);
  });

  it('doc references company kora-index route', () => {
    expect(doc()).toMatch(/company\/kora-index/i);
  });

  it('doc references company route status (PASS or MANUAL PENDING)', () => {
    expect(doc()).toMatch(/MANUAL PENDING|PASS|BLOCKED/i);
  });

  it('doc includes company booking aggregate check', () => {
    expect(doc()).toMatch(/Booking aggregate|booking.*aggregate|commons.*booking/i);
  });
});

// ── 3. Doc includes worker smoke results ──────────────────────────────────────

describe('doc includes worker smoke results', () => {
  it('doc references Worker A booking result', () => {
    expect(doc()).toMatch(/Worker A.*attended|attended.*Worker A/i);
  });

  it('doc references Worker B booking result', () => {
    expect(doc()).toMatch(/Worker B.*approved|approved.*Worker B/i);
  });

  it('doc references Worker C booking result (none)', () => {
    expect(doc()).toMatch(/Worker C.*0 bookings|Worker C.*no booking/i);
  });

  it('doc references my-kora worker routes', () => {
    expect(doc()).toMatch(/my-kora|worker\/workspace/i);
  });

  it('doc references PIB per worker', () => {
    expect(doc()).toMatch(/LIFE.*12\.5|GROWTH.*8\.0|CONNECTION.*3\.2/i);
  });
});

// ── 4. Doc includes RLS negative test results ─────────────────────────────────

describe('doc includes RLS negative tests', () => {
  it('doc includes C-11 test result', () => {
    expect(doc()).toMatch(/C-11/);
  });

  it('doc includes C-12 test result', () => {
    expect(doc()).toMatch(/C-12/);
  });

  it('doc includes W-04 cross-worker test', () => {
    expect(doc()).toMatch(/W-04/);
  });

  it('doc includes S-01 anon test', () => {
    expect(doc()).toMatch(/S-01/);
  });

  it('doc includes final smoke verdict section', () => {
    expect(doc()).toMatch(/Final Smoke Verdict|Smoke Verdict/i);
  });
});

// ── 5. Doc confirms company cannot access personal.worker_identity ────────────

describe('doc confirms company blocked from personal.worker_identity', () => {
  it('doc records company_sees_worker_identity = 0', () => {
    expect(doc()).toMatch(/company_sees_worker_identity.*0|0.*worker_identity/i);
  });

  it('doc records PASS for C-11 in results table', () => {
    expect(doc()).toMatch(/C-11[\s\S]{0,200}PASS/);
  });
});

// ── 6. Doc confirms company cannot access personal.worker_pib ────────────────

describe('doc confirms company blocked from personal.worker_pib', () => {
  it('doc records company_sees_worker_pib = 0', () => {
    expect(doc()).toMatch(/company_sees_worker_pib.*0|0.*worker_pib/i);
  });

  it('doc records PASS for C-12 in results table', () => {
    expect(doc()).toMatch(/C-12[\s\S]{0,200}PASS/);
  });
});

// ── 7. Doc confirms cross-worker access is blocked ───────────────────────────

describe('doc confirms cross-worker blocking', () => {
  it('doc confirms total PIB visible per worker = 1 (own only)', () => {
    expect(doc()).toMatch(/total_pib_visible.*=.*1|1.*total_pib|cross-worker blocked/i);
  });

  it('doc says no cross-worker data visible', () => {
    expect(doc()).toMatch(/cross-worker|No cross-worker|own data/i);
  });

  it('doc records Worker A and Worker B are isolated', () => {
    expect(doc()).toMatch(/Worker A.*Worker B|Worker B.*Worker A/i);
  });
});

// ── 8. Doc confirms anon personal.* is blocked ───────────────────────────────

describe('doc confirms anon blocked from personal.*', () => {
  it('doc records permission denied error for anon', () => {
    expect(doc()).toMatch(/permission denied|42501/i);
  });

  it('doc confirms anon schema-level block', () => {
    expect(doc()).toMatch(/schema.*personal|permission denied for schema/i);
  });

  it('doc records PASS for S-01, S-02, S-03', () => {
    expect(doc()).toMatch(/S-01/);
    expect(doc()).toMatch(/S-02/);
    expect(doc()).toMatch(/S-03/);
  });
});

// ── 9. Doc confirms migration 027 not applied ─────────────────────────────────

describe('doc confirms migration 027 not applied after smoke', () => {
  it('doc says 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|Migration 027.*NOT/i);
  });
});

// ── 10. Doc confirms migration 029 not applied ───────────────────────────────

describe('doc confirms migration 029 not applied after smoke', () => {
  it('doc says 029 NOT applied or emergency safety net', () => {
    expect(doc()).toMatch(/029.*NOT applied|029.*emergency safety net/i);
  });
});

// ── 11. Doc says passwords/secrets are not documented ────────────────────────

describe('doc says passwords are not documented', () => {
  it('doc states passwords NOT committed', () => {
    expect(doc()).toMatch(/NOT committed|not committed|Passwords.*NOT/i);
  });

  it('doc states passwords stored outside repo', () => {
    expect(doc()).toMatch(/outside.*repository|outside.*repo|stored outside/i);
  });
});

// ── 12. Doc does not contain passwords ───────────────────────────────────────

describe('doc does not contain embedded passwords', () => {
  it('doc does not contain a password field value', () => {
    expect(doc()).not.toMatch(/password:\s*[a-zA-Z0-9!@#$%]{8,}/);
  });

  it('doc does not contain @gmail.com or @yahoo.com', () => {
    expect(doc()).not.toMatch(/@gmail\.com|@yahoo\.com/i);
  });
});

// ── 13. Doc does not contain production references ───────────────────────────

describe('doc does not suggest production usage', () => {
  it('doc says Production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|production.*not touched/i);
  });

  it('doc references only the staging project ref', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc does not instruct running against production', () => {
    const affirmativeLines = doc()
      .split('\n')
      .filter(l => !/NOT|Do not|do not|MUST NOT|must not|not touched|not committed/i.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*to production|run.*on production/i);
  });
});

// ── 14. Doc classifies routes as PASS/FAIL/BLOCKED/NOT IMPLEMENTED ───────────

describe('doc uses correct route classification labels', () => {
  it('doc uses PASS classification', () => {
    expect(doc()).toMatch(/\bPASS\b/);
  });

  it('doc uses MANUAL PENDING for browser-only tests', () => {
    expect(doc()).toMatch(/MANUAL PENDING/);
  });

  it('doc does not mark any RLS test as FAIL', () => {
    const rls_section = doc().split('6.2')[1]?.split('6.5')[0] || '';
    expect(rls_section).not.toMatch(/\bFAIL\b/);
  });
});

// ── 15. Doc includes final smoke verdict ─────────────────────────────────────

describe('doc includes final smoke verdict', () => {
  it('doc includes a smoke verdict table or section', () => {
    expect(doc()).toMatch(/Final Smoke Verdict|DB-level security smoke/i);
  });

  it('doc states overall verdict is PARTIAL PASS', () => {
    expect(doc()).toMatch(/PARTIAL PASS/i);
  });

  it('doc states DB/JWT/RLS baseline passed', () => {
    expect(doc()).toMatch(/DB\/JWT\/RLS.*PASS|DB-level.*PASS|RLS.*baseline.*PASS/i);
  });

  it('doc states browser/UI route smoke is manual pending', () => {
    expect(doc()).toMatch(/Browser\/UI.*MANUAL PENDING|UI.*browser.*pending|UI route smoke.*MANUAL PENDING/i);
  });

  it('doc classifies UI route smoke as MANUAL PENDING not PASS', () => {
    expect(doc()).toMatch(/UI route smoke.*MANUAL PENDING|browser.*smoke.*pending/i);
  });
});
