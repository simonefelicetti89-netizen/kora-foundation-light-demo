/**
 * Gate 2 — Auth Users & Smoke Ready assertions.
 *
 * Verifies that docs/GATE2_PHASE1_AUTH_USERS_AND_SMOKE_READY.md exists and
 * contains correct metadata claims, staging-only language, no secrets, no
 * real emails, and correct migration state references.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(
    resolve(root, 'docs/archive/gate2/GATE2_PHASE1_AUTH_USERS_AND_SMOKE_READY.md'),
    'utf-8'
  );
}

// ── 1. Doc exists ─────────────────────────────────────────────────────────────

describe('GATE2_PHASE1_AUTH_USERS_AND_SMOKE_READY.md — existence', () => {
  it('doc exists', () => {
    expect(
      existsSync(resolve(root, 'docs/archive/gate2/GATE2_PHASE1_AUTH_USERS_AND_SMOKE_READY.md'))
    ).toBe(true);
  });

  it('doc is non-empty', () => {
    expect(doc().length).toBeGreaterThan(500);
  });
});

// ── 2. Doc says staging only ──────────────────────────────────────────────────

describe('doc is marked staging-only', () => {
  it('doc says STAGING ONLY', () => {
    expect(doc()).toMatch(/STAGING ONLY|staging only/i);
  });

  it('doc references the staging project ref', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc says production not touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|production.*not touched/i);
  });
});

// ── 3. Doc lists the four synthetic emails ────────────────────────────────────

describe('doc lists all four synthetic staging emails', () => {
  it('doc lists company-admin@staging.kora.internal', () => {
    expect(doc()).toMatch(/company-admin@staging\.kora\.internal/);
  });

  it('doc lists worker-a@staging.kora.internal', () => {
    expect(doc()).toMatch(/worker-a@staging\.kora\.internal/);
  });

  it('doc lists worker-b@staging.kora.internal', () => {
    expect(doc()).toMatch(/worker-b@staging\.kora\.internal/);
  });

  it('doc lists worker-c@staging.kora.internal', () => {
    expect(doc()).toMatch(/worker-c@staging\.kora\.internal/);
  });
});

// ── 4. Doc says no real data ──────────────────────────────────────────────────

describe('doc says no real data used', () => {
  it('doc says synthetic accounts only', () => {
    expect(doc()).toMatch(/synthetic accounts only|Synthetic accounts only/i);
  });

  it('doc says no real emails', () => {
    expect(doc()).toMatch(/No real emails|no real emails/i);
  });

  it('doc says no real worker or company data', () => {
    expect(doc()).toMatch(/no real worker|synthetic.*accounts/i);
  });
});

// ── 5. Doc says passwords are not committed ───────────────────────────────────

describe('doc says passwords are not committed', () => {
  it('doc explicitly states passwords not committed', () => {
    expect(doc()).toMatch(/Passwords.*NOT committed|passwords.*not committed/i);
  });

  it('doc says passwords must be stored outside the repo', () => {
    expect(doc()).toMatch(/outside the repository|outside.*repo/i);
  });
});

// ── 6. Doc says passwords are not printed ────────────────────────────────────

describe('doc says passwords are not printed', () => {
  it('doc explicitly states passwords not printed', () => {
    expect(doc()).toMatch(/Passwords.*NOT printed|passwords.*not printed/i);
  });

  it('doc explains the bcrypt random approach', () => {
    expect(doc()).toMatch(/random.*bcrypt|gen_random_uuid|crypt\(/i);
  });
});

// ── 7. Doc includes expected app_metadata keys ────────────────────────────────

describe('doc includes required app_metadata keys', () => {
  it('doc includes kora_role', () => {
    expect(doc()).toMatch(/"kora_role"/);
  });

  it('doc includes kora_tenant_id', () => {
    expect(doc()).toMatch(/"kora_tenant_id"/);
  });

  it('doc includes kora_worker_ref for workers', () => {
    expect(doc()).toMatch(/"kora_worker_ref"/);
  });

  it('doc includes environment', () => {
    expect(doc()).toMatch(/"environment"/);
  });

  it('doc includes synthetic flag', () => {
    expect(doc()).toMatch(/"synthetic"/);
  });

  it('doc shows COMPANY_ADMIN kora_role for company admin', () => {
    expect(doc()).toMatch(/COMPANY_ADMIN/);
  });

  it('doc shows WORKER kora_role for workers', () => {
    expect(doc()).toMatch(/"kora_role":\s*"WORKER"/);
  });
});

// ── 8. Doc confirms worker_identity.auth_user_id link requirement ─────────────

describe('doc confirms worker_identity auth_user_id linkage', () => {
  it('doc mentions worker_identity.auth_user_id', () => {
    expect(doc()).toMatch(/worker_identity.*auth_user_id|auth_user_id.*worker_identity/i);
  });

  it('doc shows W-STAGE-A link', () => {
    expect(doc()).toMatch(/W-STAGE-A/);
  });

  it('doc shows W-STAGE-B link', () => {
    expect(doc()).toMatch(/W-STAGE-B/);
  });

  it('doc shows W-STAGE-C link', () => {
    expect(doc()).toMatch(/W-STAGE-C/);
  });
});

// ── 9. Doc confirms 027 not applied ──────────────────────────────────────────

describe('doc confirms migration 027 not applied', () => {
  it('doc says 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|Migration 027 NOT applied/i);
  });

  it('doc warns not to apply 027 yet', () => {
    expect(doc()).toMatch(/DO NOT apply.*027|not apply.*until.*Gate/i);
  });
});

// ── 10. Doc confirms 029 not applied ─────────────────────────────────────────

describe('doc confirms migration 029 not applied', () => {
  it('doc says 029 NOT applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|029.*emergency safety net/i);
  });
});

// ── 11. Doc references UI smoke test checklist ────────────────────────────────

describe('doc references UI smoke test checklist', () => {
  it('doc references GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md', () => {
    expect(doc()).toMatch(/GATE2_PHASE1_STAGING_SEED_AND_SMOKE\.md/);
  });

  it('doc references the smoke test sections', () => {
    expect(doc()).toMatch(/§5|section 5|smoke test checklist/i);
  });
});

// ── 12. Doc does not contain production references ────────────────────────────

describe('doc does not suggest production usage', () => {
  it('doc does not instruct running against production', () => {
    const affirmativeLines = doc()
      .split('\n')
      .filter(l => !/NOT|Do not|do not|MUST NOT|must not|not committed|not printed|NOT touched/i.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*to production|run.*on production|migrate.*production/i);
  });

  it('doc does not reference a production project ref', () => {
    expect(doc()).not.toMatch(/project ref.*[a-z0-9]{20}(?!.*haqflkurpmeaxpikozjl)/);
  });
});

// ── 13. Doc does not contain realistic personal email domains ─────────────────

describe('doc does not contain real personal email domains', () => {
  it('doc does not contain @gmail.com', () => {
    expect(doc()).not.toMatch(/@gmail\.com/i);
  });

  it('doc does not contain @yahoo.com or @hotmail.com', () => {
    expect(doc()).not.toMatch(/@yahoo\.com|@hotmail\.com/i);
  });

  it('doc does not contain @kora.io', () => {
    expect(doc()).not.toMatch(/@kora\.io/);
  });
});

// ── 14. Doc does not suggest applying migrations ──────────────────────────────

describe('doc does not suggest applying migrations', () => {
  it('doc does not instruct running supabase db push', () => {
    const stripped = doc().replace(/```[\s\S]*?```/g, '');
    expect(stripped).not.toMatch(/supabase db push|supabase migration up/i);
  });

  it('doc does not suggest applying migration 027', () => {
    const affirmativeLines = doc()
      .split('\n')
      .filter(l => !/NOT|Do not|do not|MUST NOT|must not/i.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*027|run.*027/i);
  });
});
