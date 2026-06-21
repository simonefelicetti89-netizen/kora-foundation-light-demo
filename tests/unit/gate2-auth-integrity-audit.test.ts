/**
 * Gate 2 — Auth Integrity Audit assertions.
 *
 * Verifies that docs/GATE2_PHASE1_AUTH_INTEGRITY_AUDIT.md exists and
 * correctly documents: dashboard inconsistency, ghost user diagnosis,
 * cleanup strategy, prohibition on direct auth.users inserts, correct
 * repair method, worker_identity relink requirement, and staging-only scope.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(
    resolve(root, 'docs/GATE2_PHASE1_AUTH_INTEGRITY_AUDIT.md'),
    'utf-8'
  );
}

// ── 1. Doc exists ─────────────────────────────────────────────────────────────

describe('GATE2_PHASE1_AUTH_INTEGRITY_AUDIT.md — existence', () => {
  it('audit doc exists', () => {
    expect(
      existsSync(resolve(root, 'docs/GATE2_PHASE1_AUTH_INTEGRITY_AUDIT.md'))
    ).toBe(true);
  });

  it('audit doc is non-empty', () => {
    expect(doc().length).toBeGreaterThan(500);
  });
});

// ── 2. Doc mentions the dashboard inconsistency ───────────────────────────────

describe('doc documents dashboard inconsistency', () => {
  it('doc mentions no users shown in dashboard', () => {
    expect(doc()).toMatch(/No users in your project|Dashboard.*no users|dashboard.*inconsistency/i);
  });

  it('doc references total count mismatch', () => {
    expect(doc()).toMatch(/Total.*estimated|count.*mismatch|counted.*not shown/i);
  });

  it('doc identifies auth.identities as the root cause', () => {
    expect(doc()).toMatch(/auth\.identities/);
  });

  it('doc explains ghost user concept', () => {
    expect(doc()).toMatch(/ghost/i);
  });
});

// ── 3. Doc prohibits direct auth.users inserts ───────────────────────────────

describe('doc prohibits direct auth.users inserts', () => {
  it('doc contains DO NOT insert into auth.users rule', () => {
    expect(doc()).toMatch(/DO NOT.*insert.*auth\.users|do not.*insert.*auth\.users/i);
  });

  it('doc explains why direct insert fails', () => {
    expect(doc()).toMatch(/skips.*auth\.identities|bypass.*provisioning|missing.*auth\.identities/i);
  });
});

// ── 4. Doc requires Dashboard or Auth Admin API ───────────────────────────────

describe('doc requires Dashboard or Auth Admin API for user creation', () => {
  it('doc mentions Supabase Dashboard as preferred method', () => {
    expect(doc()).toMatch(/Supabase Dashboard/);
  });

  it('doc mentions Auth Admin API', () => {
    expect(doc()).toMatch(/Auth Admin API|\/auth\/v1\/admin\/users/i);
  });

  it('doc says preferred method is Dashboard or Auth Admin API', () => {
    expect(doc()).toMatch(/Dashboard.*Auth Admin API|Auth Admin API.*Dashboard/i);
  });
});

// ── 5. Doc requires no secrets or passwords printed ───────────────────────────

describe('doc prohibits secrets and passwords in repo', () => {
  it('doc says do not commit service role key', () => {
    expect(doc()).toMatch(/not commit.*service role|service role.*not committed|never commit/i);
  });

  it('doc says do not print passwords', () => {
    expect(doc()).toMatch(/Do NOT print|never.*print.*password|not print|not committed/i);
  });

  it('doc says store credentials outside repo', () => {
    expect(doc()).toMatch(/outside the repo|outside.*repository|store.*outside/i);
  });
});

// ── 6. Doc requires cleanup limited to @staging.kora.internal ────────────────

describe('doc requires cleanup scope limited to staging emails', () => {
  it('doc limits cleanup to @staging.kora.internal emails', () => {
    expect(doc()).toMatch(/@staging\.kora\.internal/);
  });

  it('doc confirms only the four synthetic emails were targeted', () => {
    expect(doc()).toMatch(/company-admin@staging\.kora\.internal/);
  });

  it('doc confirms no real users exist or were affected', () => {
    expect(doc()).toMatch(/no real users|non_staging_users.*=.*0|0.*real user/i);
  });
});

// ── 7. Doc requires no production usage ──────────────────────────────────────

describe('doc confirms production was not touched', () => {
  it('doc says Production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|production.*not touched/i);
  });

  it('doc references only the staging project ref', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc does not contain instructions to touch production', () => {
    const affirmativeLines = doc()
      .split('\n')
      .filter(l => !/NOT|Do not|do not|MUST NOT|must not/i.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*production|run.*on production|migrate.*production/i);
  });
});

// ── 8. Doc confirms migration 027 not applied ─────────────────────────────────

describe('doc confirms migration 027 not applied', () => {
  it('doc says 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|Migration 027.*NOT/i);
  });
});

// ── 9. Doc confirms migration 029 not applied ─────────────────────────────────

describe('doc confirms migration 029 not applied', () => {
  it('doc says 029 NOT applied or is emergency safety net only', () => {
    expect(doc()).toMatch(/029.*NOT applied|029.*emergency safety net/i);
  });
});

// ── 10. Doc includes worker_identity relink requirement ───────────────────────

describe('doc includes worker_identity relink requirement', () => {
  it('doc mentions worker_identity relink', () => {
    expect(doc()).toMatch(/worker_identity.*relink|Relink.*worker_identity|auth_user_id.*updated/i);
  });

  it('doc references W-STAGE-A relink', () => {
    expect(doc()).toMatch(/W-STAGE-A/);
  });

  it('doc references W-STAGE-B relink', () => {
    expect(doc()).toMatch(/W-STAGE-B/);
  });

  it('doc references W-STAGE-C relink', () => {
    expect(doc()).toMatch(/W-STAGE-C/);
  });

  it('doc includes UPDATE SQL for relinking', () => {
    expect(doc()).toMatch(/UPDATE personal\.worker_identity/);
  });
});

// ── 11. Doc includes a safe repair strategy ───────────────────────────────────

describe('doc includes a defined repair strategy', () => {
  it('doc references Strategy B or ghost user cleanup', () => {
    expect(doc()).toMatch(/Strategy B|Ghost User Cleanup|ghost.*cleanup/i);
  });

  it('doc records cleanup was executed on staging only', () => {
    expect(doc()).toMatch(/Cleanup executed.*staging|cleanup.*staging only/i);
  });

  it('doc records post-cleanup state verification', () => {
    expect(doc()).toMatch(/Post-cleanup state|auth\.users.*remaining.*0/i);
  });

  it('doc records auth.users count = 0 after cleanup', () => {
    expect(doc()).toMatch(/auth\.users.*remaining.*0|0.*auth\.users/i);
  });

  it('doc records worker_identity reverted to seed placeholders', () => {
    expect(doc()).toMatch(/seed placeholder|reverted.*placeholder|placeholder.*seed/i);
  });
});
