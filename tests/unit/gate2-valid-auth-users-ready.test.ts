/**
 * Gate 2 — Valid Auth Users Ready assertions.
 *
 * Verifies that docs/GATE2_PHASE1_VALID_AUTH_USERS_READY.md exists and
 * correctly documents: Dashboard user creation, auth.identities verification,
 * raw_app_meta_data update, worker_identity relink, no secrets printed,
 * correct migration state, and readiness for UI smoke tests.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(
    resolve(root, 'docs/archive/gate2/GATE2_PHASE1_VALID_AUTH_USERS_READY.md'),
    'utf-8'
  );
}

// ── 1. Doc exists ─────────────────────────────────────────────────────────────

describe('GATE2_PHASE1_VALID_AUTH_USERS_READY.md — existence', () => {
  it('doc exists', () => {
    expect(
      existsSync(resolve(root, 'docs/archive/gate2/GATE2_PHASE1_VALID_AUTH_USERS_READY.md'))
    ).toBe(true);
  });

  it('doc is non-empty', () => {
    expect(doc().length).toBeGreaterThan(500);
  });
});

// ── 2. Doc says users were created via Dashboard ──────────────────────────────

describe('doc records Dashboard creation method', () => {
  it('doc says users were created via Supabase Dashboard', () => {
    expect(doc()).toMatch(/Supabase Dashboard|Dashboard.*Add user|Dashboard.*Create new user/i);
  });

  it('doc confirms no direct INSERT into auth.users', () => {
    expect(doc()).toMatch(/No direct INSERT|direct INSERT.*not used|not.*direct.*INSERT/i);
  });
});

// ── 3. Doc confirms auth.identities were verified ────────────────────────────

describe('doc confirms auth.identities verification', () => {
  it('doc references auth.identities', () => {
    expect(doc()).toMatch(/auth\.identities/);
  });

  it('doc confirms 4 identity rows', () => {
    expect(doc()).toMatch(/4 rows|4 identit|4.*one per user/i);
  });

  it('doc confirms no ghost users', () => {
    expect(doc()).toMatch(/Ghost users.*0|No ghost|no ghost|0.*ghost/i);
  });

  it('doc confirms provider is email', () => {
    expect(doc()).toMatch(/provider.*email|email.*provider/i);
  });
});

// ── 4. Doc prohibits direct auth.users INSERT ────────────────────────────────

describe('doc prohibits direct auth.users INSERT', () => {
  it('doc states direct INSERT was not used', () => {
    expect(doc()).toMatch(/No direct INSERT|direct INSERT.*not used|not.*direct.*INSERT/i);
  });

  it('doc explains the ghost-user failure mode', () => {
    expect(doc()).toMatch(/ghost.user.*failure|ghost.*mode|ghost-user/i);
  });
});

// ── 5. Doc lists all four synthetic emails ───────────────────────────────────

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

// ── 6. Doc includes raw_app_meta_data content ────────────────────────────────

describe('doc includes raw_app_meta_data claims', () => {
  it('doc references raw_app_meta_data', () => {
    expect(doc()).toMatch(/raw_app_meta_data/);
  });

  it('doc includes kora_role', () => {
    expect(doc()).toMatch(/"kora_role"/);
  });

  it('doc includes kora_tenant_id', () => {
    expect(doc()).toMatch(/"kora_tenant_id"/);
  });

  it('doc includes environment staging', () => {
    expect(doc()).toMatch(/"environment".*"staging"|"staging".*environment/);
  });

  it('doc includes synthetic flag', () => {
    expect(doc()).toMatch(/"synthetic".*true|synthetic.*true/i);
  });

  it('doc shows COMPANY_ADMIN role', () => {
    expect(doc()).toMatch(/COMPANY_ADMIN/);
  });

  it('doc shows WORKER role', () => {
    expect(doc()).toMatch(/"kora_role".*"WORKER"|WORKER.*kora_role/);
  });

  it('doc includes kora_worker_ref', () => {
    expect(doc()).toMatch(/"kora_worker_ref"/);
  });
});

// ── 7. Doc says raw_user_meta_data must not be used for authorization ─────────

describe('doc distinguishes raw_app_meta_data from raw_user_meta_data', () => {
  it('doc references raw_user_meta_data', () => {
    expect(doc()).toMatch(/raw_user_meta_data/);
  });

  it('doc warns raw_user_meta_data must not be trusted for authorization', () => {
    expect(doc()).toMatch(/raw_user_meta_data.*user-writable|must never.*trusted.*authorization|not.*trusted.*authorization/i);
  });

  it('doc clarifies raw_app_meta_data is used for authorization', () => {
    expect(doc()).toMatch(/raw_app_meta_data.*authorization|authorization.*raw_app_meta_data|app_metadata.*RLS/i);
  });
});

// ── 8. Doc confirms worker_identity relink ───────────────────────────────────

describe('doc confirms worker_identity relink with real UUIDs', () => {
  it('doc references worker_identity', () => {
    expect(doc()).toMatch(/worker_identity/);
  });

  it('doc shows link_valid confirmation', () => {
    expect(doc()).toMatch(/link_valid/i);
  });

  it('doc shows W-STAGE-A relink', () => {
    expect(doc()).toMatch(/W-STAGE-A/);
  });

  it('doc shows W-STAGE-B relink', () => {
    expect(doc()).toMatch(/W-STAGE-B/);
  });

  it('doc shows W-STAGE-C relink', () => {
    expect(doc()).toMatch(/W-STAGE-C/);
  });

  it('doc confirms zero non-STAGE-001 rows affected', () => {
    expect(doc()).toMatch(/Zero non-STAGE-001|non-STAGE-001.*zero|non-STAGE-001.*unchanged/i);
  });
});

// ── 9. Doc says no passwords or secrets printed ───────────────────────────────

describe('doc says no passwords or secrets committed', () => {
  it('doc explicitly states passwords not committed', () => {
    expect(doc()).toMatch(/NOT committed|not committed|Passwords.*NOT|not.*committed/i);
  });

  it('doc explicitly states passwords not printed', () => {
    expect(doc()).toMatch(/NOT printed|not printed/i);
  });

  it('doc says passwords stored outside repository', () => {
    expect(doc()).toMatch(/outside the repository|outside.*repo|stored outside/i);
  });
});

// ── 10. Doc confirms migration 027 not applied ───────────────────────────────

describe('doc confirms migration 027 not applied', () => {
  it('doc says 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|Migration 027.*NOT/i);
  });
});

// ── 11. Doc confirms migration 029 not applied ───────────────────────────────

describe('doc confirms migration 029 not applied', () => {
  it('doc says 029 NOT applied or is emergency safety net only', () => {
    expect(doc()).toMatch(/029.*NOT applied|029.*emergency safety net/i);
  });
});

// ── 12. Doc references UI smoke tests ────────────────────────────────────────

describe('doc references UI smoke tests', () => {
  it('doc references GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md', () => {
    expect(doc()).toMatch(/GATE2_PHASE1_STAGING_SEED_AND_SMOKE\.md/);
  });

  it('doc references smoke test section 5', () => {
    expect(doc()).toMatch(/§5|section 5|smoke test/i);
  });

  it('doc calls out priority smoke tests C-11 and C-12', () => {
    expect(doc()).toMatch(/C-11|C-12/);
  });

  it('doc calls out priority smoke test W-04', () => {
    expect(doc()).toMatch(/W-04/);
  });
});

// ── 13. Doc does not contain production references ───────────────────────────

describe('doc does not suggest production usage', () => {
  it('doc says Production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|production.*not touched/i);
  });

  it('doc does not instruct running against production', () => {
    const affirmativeLines = doc()
      .split('\n')
      .filter(l => !/NOT|Do not|do not|MUST NOT|must not|not touched|not committed|not printed/i.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*to production|run.*on production|migrate.*production/i);
  });
});

// ── 14. Doc does not contain realistic personal email domains ─────────────────

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
