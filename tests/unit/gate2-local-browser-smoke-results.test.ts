/**
 * Gate 2 Phase 1 — Local Browser Smoke assertions.
 *
 * Verifies that docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md correctly documents
 * the local browser smoke test results: app URL, staging ref, login results,
 * privacy checks, isolation checks, anonymous access, migration state, production
 * not touched, no secrets committed.
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

// ── 1. Local browser smoke section present ────────────────────────────────────

describe('gate2-local-browser-smoke — section', () => {
  it('doc mentions local browser smoke', () => {
    expect(doc()).toMatch(/Local Browser Smoke/i);
  });

  it('doc mentions http://localhost:3000', () => {
    expect(doc()).toMatch(/localhost:3000/);
  });

  it('doc mentions staging project ref haqflkurpmeaxpikozjl', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });
});

// ── 2. Login results documented ───────────────────────────────────────────────

describe('gate2-local-browser-smoke — login results', () => {
  it('doc records company-admin login result', () => {
    expect(doc()).toMatch(/company-admin@staging\.kora\.internal/);
  });

  it('doc records worker-a login result', () => {
    expect(doc()).toMatch(/worker-a@staging\.kora\.internal/);
  });

  it('doc records worker-b login result', () => {
    expect(doc()).toMatch(/worker-b@staging\.kora\.internal/);
  });

  it('doc records worker-c login result', () => {
    expect(doc()).toMatch(/worker-c@staging\.kora\.internal/);
  });
});

// ── 3. Privacy checks documented ─────────────────────────────────────────────

describe('gate2-local-browser-smoke — privacy checks', () => {
  it('doc records C-11 result', () => {
    expect(doc()).toMatch(/C-11/);
  });

  it('doc records C-12 result', () => {
    expect(doc()).toMatch(/C-12/);
  });

  it('doc records W-04 result', () => {
    expect(doc()).toMatch(/W-04/);
  });

  it('doc records anonymous access result', () => {
    expect(doc()).toMatch(/[Aa]non|[Uu]nauthenticated/);
  });
});

// ── 4. Migration state ────────────────────────────────────────────────────────

describe('gate2-local-browser-smoke — migration state', () => {
  it('doc confirms 027 not applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|NOT applied.*027/i);
  });

  it('doc confirms 029 not applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|NOT applied.*029/i);
  });
});

// ── 5. Production not touched ─────────────────────────────────────────────────

describe('gate2-local-browser-smoke — production safety', () => {
  it('doc confirms production not touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });
});

// ── 6. Secrets hygiene ────────────────────────────────────────────────────────

describe('gate2-local-browser-smoke — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc contains no password-like values after password= assignments', () => {
    expect(doc()).not.toMatch(/password\s*=\s*[^\s]{8,}/i);
  });
});

// ── 7. Smoke scope documented ─────────────────────────────────────────────────

describe('gate2-local-browser-smoke — scope', () => {
  it('doc references the smoke test commit', () => {
    expect(doc()).toMatch(/1ae3810/);
  });

  it('doc documents cross-worker isolation (W-04)', () => {
    expect(doc()).toMatch(/cross-worker.*isolation|isolation.*cross-worker/i);
  });

  it('doc documents C-11 company blocked from worker PIB', () => {
    expect(doc()).toMatch(/C-11/);
    expect(doc()).toMatch(/worker.*pib|pib.*worker/i);
  });

  it('doc documents staging setup gaps found', () => {
    expect(doc()).toMatch(/provisioning gap|setup gap/i);
  });

  it('doc confirms NEXT_PUBLIC_KORA_DEFAULT_ENV=live', () => {
    expect(doc()).toMatch(/NEXT_PUBLIC_KORA_DEFAULT_ENV.*live|live.*NEXT_PUBLIC_KORA_DEFAULT_ENV/i);
  });
});
