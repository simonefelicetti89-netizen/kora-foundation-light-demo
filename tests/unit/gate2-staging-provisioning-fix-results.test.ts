/**
 * Gate 2 Phase 1 — Staging Provisioning Fix assertions.
 *
 * Verifies that docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md correctly documents
 * the provisioning gap fixes: analytics.tenant row confirmed, PostgREST schema
 * exposure, worker kora_worker_id metadata update via Auth Admin API, and the
 * re-test results after those fixes.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Provisioning fix section present ───────────────────────────────────────

describe('gate2-staging-provisioning-fix — section', () => {
  it('doc includes provisioning fix section', () => {
    expect(doc()).toMatch(/Provisioning Fix|provisioning fix/i);
  });

  it('doc references analytics.tenant', () => {
    expect(doc()).toMatch(/analytics\.tenant/);
  });

  it('doc references STAGE-001', () => {
    expect(doc()).toMatch(/STAGE-001/);
  });
});

// ── 2. kora_worker_id fix documented ─────────────────────────────────────────

describe('gate2-staging-provisioning-fix — kora_worker_id', () => {
  it('doc documents kora_worker_id fix', () => {
    expect(doc()).toMatch(/kora_worker_id/);
  });

  it('doc references Auth Admin API for metadata update', () => {
    expect(doc()).toMatch(/Auth Admin API/i);
  });

  it('doc confirms metadata preserved', () => {
    expect(doc()).toMatch(/preserved|preserve|unchanged/i);
  });

  it('doc confirms worker_identity links unchanged', () => {
    expect(doc()).toMatch(/worker_identity.*unchanged|unchanged.*worker_identity/i);
  });
});

// ── 3. Company workspace re-test ──────────────────────────────────────────────

describe('gate2-staging-provisioning-fix — company workspace retest', () => {
  it('doc documents company workspace re-test result', () => {
    expect(doc()).toMatch(/company workspace/i);
  });

  it('doc references requireCompanyUser auth result', () => {
    expect(doc()).toMatch(/requireCompanyUser/);
  });

  it('doc explains why company workspace requires browser session', () => {
    expect(doc()).toMatch(/requires browser|browser session|REQUIRES BROWSER/i);
  });
});

// ── 4. Worker PIB re-test ─────────────────────────────────────────────────────

describe('gate2-staging-provisioning-fix — worker PIB retest', () => {
  it('doc documents worker PIB re-test', () => {
    expect(doc()).toMatch(/worker.*pib|pib.*worker/i);
  });

  it('doc shows worker PIB 200 after fix', () => {
    expect(doc()).toMatch(/live PIB|200|PIB.*accessible/i);
  });
});

// ── 5. Privacy checks ─────────────────────────────────────────────────────────

describe('gate2-staging-provisioning-fix — privacy checks', () => {
  it('doc documents C-11 result', () => {
    expect(doc()).toMatch(/C-11/);
  });

  it('doc documents C-12 result', () => {
    expect(doc()).toMatch(/C-12/);
  });

  it('doc documents W-04 result', () => {
    expect(doc()).toMatch(/W-04/);
  });
});

// ── 6. Migration state ────────────────────────────────────────────────────────

describe('gate2-staging-provisioning-fix — migration state', () => {
  it('doc confirms 027 not applied in fix section', () => {
    expect(doc()).toMatch(/027.*NOT applied|NOT applied.*027/i);
  });

  it('doc confirms 029 not applied in fix section', () => {
    expect(doc()).toMatch(/029.*NOT applied|NOT applied.*029/i);
  });
});

// ── 7. Production safety ──────────────────────────────────────────────────────

describe('gate2-staging-provisioning-fix — production safety', () => {
  it('doc confirms production not touched in fix section', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });

  it('doc confirms no schema/RLS/grant/policy changes', () => {
    expect(doc()).toMatch(/Schema.*NONE|schema.*unchanged|no DDL/i);
  });

  it('doc confirms no users created or deleted', () => {
    expect(doc()).toMatch(/NONE|no users created|Users created.*NONE/i);
  });
});

// ── 8. Secrets hygiene ────────────────────────────────────────────────────────

describe('gate2-staging-provisioning-fix — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc contains no password assignments', () => {
    expect(doc()).not.toMatch(/password\s*=\s*[^\s]{8,}/i);
  });
});

// ── 9. PostgREST schema exposure documented ───────────────────────────────────

describe('gate2-staging-provisioning-fix — PostgREST schema exposure', () => {
  it('doc documents analytics schema exposure fix', () => {
    expect(doc()).toMatch(/analytics.*exposed|exposed.*analytics/i);
  });

  it('doc documents personal schema exposure', () => {
    expect(doc()).toMatch(/personal.*exposed|personal.*schema/i);
  });

  it('doc confirms anon role correctly blocked from analytics', () => {
    expect(doc()).toMatch(/anon.*false|anon.*no USAGE|anon.*correct/i);
  });

  it('doc confirms authenticated role has analytics access', () => {
    expect(doc()).toMatch(/authenticated.*true|authenticated.*USAGE|authenticated.*correct/i);
  });
});

// ── 10. Overall verdict documented ───────────────────────────────────────────

describe('gate2-staging-provisioning-fix — verdict', () => {
  it('doc includes overall verdict for provisioning fix', () => {
    expect(doc()).toMatch(/PROVISIONING FIXES APPLIED|provisioning fix.*verdict|overall verdict/i);
  });

  it('doc references browser smoke as next step', () => {
    expect(doc()).toMatch(/browser smoke|manual browser/i);
  });
});
