/**
 * Gate 2 — Staging App Env Wiring assertions.
 *
 * Verifies that docs/GATE2_STAGING_APP_ENV_WIRING.md exists and correctly
 * documents: staging env var names, public vs secret distinction, Vercel Preview
 * and local run strategies, deployment checklist, post-deploy checks, no secrets
 * committed, and migration state.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(
    resolve(root, 'docs/archive/gate2/GATE2_STAGING_APP_ENV_WIRING.md'),
    'utf-8'
  );
}

// ── 1. Doc exists ─────────────────────────────────────────────────────────────

describe('GATE2_STAGING_APP_ENV_WIRING.md — existence', () => {
  it('doc exists', () => {
    expect(
      existsSync(resolve(root, 'docs/archive/gate2/GATE2_STAGING_APP_ENV_WIRING.md'))
    ).toBe(true);
  });

  it('doc is non-empty', () => {
    expect(doc().length).toBeGreaterThan(500);
  });
});

// ── 2. Doc references staging project ref ────────────────────────────────────

describe('doc references staging project ref', () => {
  it('doc references haqflkurpmeaxpikozjl', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc says staging Supabase project only', () => {
    expect(doc()).toMatch(/staging.*Supabase|Supabase.*staging/i);
  });
});

// ── 3. Doc says production env vars must not be changed ───────────────────────

describe('doc prohibits production env var changes', () => {
  it('doc says DO NOT use production Supabase values', () => {
    expect(doc()).toMatch(/DO NOT.*production|production.*DO NOT/i);
  });

  it('doc says production scope is unchanged', () => {
    expect(doc()).toMatch(/production.*unchanged|production.*NOT.*changed|Production.*NOT touched/i);
  });

  it('doc warns to scope env vars to Preview not Production', () => {
    expect(doc()).toMatch(/Preview.*only.*not Production|scoped to.*Preview.*only/i);
  });
});

// ── 4. Doc says secrets must not be committed ─────────────────────────────────

describe('doc prohibits committing secrets', () => {
  it('doc says NEVER commit .env.staging.local', () => {
    expect(doc()).toMatch(/NEVER commit|never commit|DO NOT commit/i);
  });

  it('doc confirms .env files are gitignored', () => {
    expect(doc()).toMatch(/gitignored|\.env\*|git status/i);
  });
});

// ── 5. Doc says secrets must not be printed ───────────────────────────────────

describe('doc prohibits printing secrets', () => {
  it('doc says DO NOT print secrets', () => {
    expect(doc()).toMatch(/DO NOT print|do not print|not.*printed/i);
  });

  it('doc says to store secrets outside repo', () => {
    expect(doc()).toMatch(/1Password|outside.*repo|outside.*repository|store.*outside/i);
  });
});

// ── 6. Doc lists required Supabase env var names ──────────────────────────────

describe('doc lists required Supabase env var names', () => {
  it('doc lists NEXT_PUBLIC_SUPABASE_URL', () => {
    expect(doc()).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('doc lists NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    expect(doc()).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('doc lists SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(doc()).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('doc lists NEXT_PUBLIC_KORA_DEFAULT_ENV', () => {
    expect(doc()).toMatch(/NEXT_PUBLIC_KORA_DEFAULT_ENV/);
  });

  it('doc says NEXT_PUBLIC_KORA_DEFAULT_ENV should be live for smoke', () => {
    expect(doc()).toMatch(/NEXT_PUBLIC_KORA_DEFAULT_ENV.*live|live.*NEXT_PUBLIC_KORA_DEFAULT_ENV/i);
  });
});

// ── 7. Doc distinguishes public vars from secret vars ────────────────────────

describe('doc distinguishes public from secret env vars', () => {
  it('doc labels NEXT_PUBLIC_SUPABASE_URL as public', () => {
    expect(doc()).toMatch(/NEXT_PUBLIC_SUPABASE_URL[\s\S]{0,200}Public/);
  });

  it('doc labels SUPABASE_SERVICE_ROLE_KEY as secret/server-only', () => {
    expect(doc()).toMatch(/SUPABASE_SERVICE_ROLE_KEY[\s\S]{0,200}Secret|service role.*server-only|server-only.*service role/i);
  });

  it('doc warns service role key must never reach browser', () => {
    expect(doc()).toMatch(/NEVER expose.*browser|never.*browser.*service|service.*never.*browser/i);
  });
});

// ── 8. Doc includes Vercel Preview or staging strategy ────────────────────────

describe('doc includes Vercel Preview or staging deployment strategy', () => {
  it('doc mentions Vercel Preview', () => {
    expect(doc()).toMatch(/Vercel Preview|preview.*deploy|vercel.*preview/i);
  });

  it('doc says to scope env vars to Preview not Production in Vercel', () => {
    expect(doc()).toMatch(/Preview.*only|scoped to.*Preview/i);
  });

  it('doc mentions the Strategy A / B / C classification', () => {
    expect(doc()).toMatch(/Strategy [ABC]/i);
  });
});

// ── 9. Doc includes local .env.staging.local option ──────────────────────────

describe('doc includes local staging run option', () => {
  it('doc mentions .env.staging.local', () => {
    expect(doc()).toMatch(/\.env\.staging\.local/);
  });

  it('doc includes npm run dev or next dev command', () => {
    expect(doc()).toMatch(/npm run dev|next dev/i);
  });

  it('doc includes Strategy C — Local Staging Run', () => {
    expect(doc()).toMatch(/Strategy C|Local Staging Run/i);
  });
});

// ── 10. Doc includes deployment checklist ────────────────────────────────────

describe('doc includes a deployment checklist', () => {
  it('doc has pre-deploy checks section', () => {
    expect(doc()).toMatch(/Pre-Deploy Checks|Pre-deploy checks/i);
  });

  it('doc has a checklist for Vercel env setup', () => {
    expect(doc()).toMatch(/Deployment Checklist|deployment.*checklist/i);
  });

  it('doc includes staging Supabase ref confirmation check', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl[\s\S]{0,200}\[ \]/);
  });
});

// ── 11. Doc includes post-deploy checks ──────────────────────────────────────

describe('doc includes post-deploy checks', () => {
  it('doc has post-deploy checks section', () => {
    expect(doc()).toMatch(/Post-Deploy|Post-deploy|Post-Start/i);
  });

  it('doc includes company login route check', () => {
    expect(doc()).toMatch(/company\/login/i);
  });

  it('doc includes worker login route check', () => {
    expect(doc()).toMatch(/worker.*login|worker\/workspace/i);
  });

  it('doc includes auth callback reachability check', () => {
    expect(doc()).toMatch(/auth\/callback/i);
  });

  it('doc includes check that no individual PIB is visible', () => {
    expect(doc()).toMatch(/individual PIB|PIB.*company|company.*PIB/i);
  });
});

// ── 12. Doc references browser smoke test checklist ──────────────────────────

describe('doc references browser smoke test checklist', () => {
  it('doc references GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md', () => {
    expect(doc()).toMatch(/GATE2_PHASE1_STAGING_SEED_AND_SMOKE\.md/);
  });

  it('doc references §6.5 Company smoke section', () => {
    expect(doc()).toMatch(/§6\.5/);
  });

  it('doc references §6.6 Worker smoke section', () => {
    expect(doc()).toMatch(/§6\.6/);
  });
});

// ── 13. Doc confirms migration 027 not applied ───────────────────────────────

describe('doc confirms migration 027 not applied', () => {
  it('doc says 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|Migration 027.*NOT/i);
  });
});

// ── 14. Doc confirms migration 029 not applied ───────────────────────────────

describe('doc confirms migration 029 not applied', () => {
  it('doc says 029 NOT applied or emergency safety net', () => {
    expect(doc()).toMatch(/029.*NOT applied|029.*emergency safety net/i);
  });
});

// ── 15. Doc does not contain actual Supabase key values ──────────────────────

describe('doc does not contain actual Supabase key values or JWT secrets', () => {
  it('doc does not contain a long base64/JWT-looking string', () => {
    // Real Supabase anon keys and service role keys are JWTs (eyJ...)
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc does not contain a real anon key pattern', () => {
    // Supabase keys start with eyJ and are long (~200+ chars)
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9+/=]{50,}/);
  });

  it('doc uses placeholder notation for key values', () => {
    expect(doc()).toMatch(/<[^>]{5,}key[^>]*>|<staging.*key|not committed>/i);
  });
});
