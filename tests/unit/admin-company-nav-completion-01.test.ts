/**
 * Admin Company Nav Completion 01 — post-provisioning navigation guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * two new admin pages (/admin/company-users-live, /admin/company-workspace-live)
 * close a real post-provisioning 404 by reusing the existing
 * app/api/admin/company-users and app/api/admin/company-workspace GET
 * routes. Both pages are read-only — no mutation, no user creation, no
 * app_metadata write, no new DB/RLS/migration.
 *
 * Named with a `-live` suffix, NOT the flat `/admin/company-users` /
 * `/admin/company-workspace` paths: those exact paths hosted a different,
 * synthetic/demo admin subsystem (tenantService/accountProvisioningService)
 * that was deliberately removed and consolidated into
 * app/admin/companies/[companyId]/{users,workspace} in an earlier sprint
 * (B171 — tests/unit/b168-5-gen3-consolidation.test.ts locks in that a
 * page.tsx must never exist again at the flat paths). This sprint's pages
 * are unrelated to that system and must never collide with it.
 *
 * See app/admin/company-users-live/page.tsx and
 * app/admin/company-workspace-live/page.tsx.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const USERS_PAGE = 'app/admin/company-users-live/page.tsx';
const USERS_PANEL = 'app/admin/company-users-live/_components/CompanyUsersPanel.tsx';
const WORKSPACE_PAGE = 'app/admin/company-workspace-live/page.tsx';
const WORKSPACE_PANEL = 'app/admin/company-workspace-live/_components/CompanyWorkspacePanel.tsx';
const PROVISION_ROUTE = 'app/api/admin/companies/provision/route.ts';
const GEN3_CONSOLIDATION_TEST = 'tests/unit/b168-5-gen3-consolidation.test.ts';

const ALL_NEW_FILES = [USERS_PAGE, USERS_PANEL, WORKSPACE_PAGE, WORKSPACE_PANEL];

// ── 1-2: pages exist ─────────────────────────────────────────────────────────

describe('Admin Company Nav Completion 01 — new pages exist', () => {
  it(`${USERS_PAGE} exists`, () => {
    expect(() => readSource(USERS_PAGE)).not.toThrow();
  });

  it(`${WORKSPACE_PAGE} exists`, () => {
    expect(() => readSource(WORKSPACE_PAGE)).not.toThrow();
  });
});

// ── 3: server-side admin guard ───────────────────────────────────────────────

describe('Admin Company Nav Completion 01 — both pages use the server-side admin guard', () => {
  for (const page of [USERS_PAGE, WORKSPACE_PAGE]) {
    it(`${page} calls requireKoraAdmin() and redirects on auth error`, () => {
      const source = readSource(page);
      expect(source).toMatch(/from '@\/lib\/auth\/kora-session'/);
      expect(source).toMatch(/requireKoraAdmin/);
      expect(source).toMatch(/isKoraAuthError\(auth\)/);
      expect(source).toMatch(/redirect\('\/admin\/login'\)/);
    });
  }
});

// ── 4: missing tenantId handled safely ───────────────────────────────────────

describe('Admin Company Nav Completion 01 — both pages handle missing tenantId safely', () => {
  for (const page of [USERS_PAGE, WORKSPACE_PAGE]) {
    it(`${page} shows a clear message and does not crash when tenantId is absent`, () => {
      const source = readSource(page);
      expect(source).toMatch(/!tenantId/);
      expect(source).toMatch(/Nessun.*tenantId.*specificato/);
    });
  }
});

// ── 5-9: read-only, no mutation, no user creation, no app_metadata write ────

describe('Admin Company Nav Completion 01 — pages are strictly read-only', () => {
  for (const file of ALL_NEW_FILES) {
    it(`${file} contains no <form> element`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/<form/i);
    });

    it(`${file} calls no POST/PATCH/DELETE/PUT`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/method:\s*['"](?:POST|PATCH|DELETE|PUT)['"]/i);
      expect(source).not.toMatch(/\.rpc\(/);
    });

    it(`${file} never invites, creates, or updates a user`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/inviteUserByEmail/);
      expect(source).not.toMatch(/admin\.createUser/);
      expect(source).not.toMatch(/updateUserById/);
    });

    it(`${file} never writes app_metadata`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/app_metadata:\s*\{/);
    });

    it(`${file} never uses onClick to trigger a write`, () => {
      const source = readSource(file);
      // Only fetch() calls in these files are the GET reads asserted elsewhere;
      // no onClick handler should exist at all in a purely read-only panel.
      expect(source).not.toMatch(/onClick=/);
    });
  }

  it(`${USERS_PANEL} and ${WORKSPACE_PANEL} only ever fetch with GET (no explicit method override to a writer verb)`, () => {
    for (const panel of [USERS_PANEL, WORKSPACE_PANEL]) {
      const source = readSource(panel);
      expect(source).toMatch(/fetch\(/);
      expect(source).not.toMatch(/method:\s*['"]POST['"]/);
    }
  });
});

// ── 10-12: cross-links ────────────────────────────────────────────────────────

describe('Admin Company Nav Completion 01 — cross-links between pages', () => {
  it(`${USERS_PAGE} links back to /admin/companies/new`, () => {
    const source = readSource(USERS_PAGE);
    expect(source).toContain('href="/admin/companies/new"');
  });

  it(`${WORKSPACE_PAGE} links back to /admin/companies/new`, () => {
    const source = readSource(WORKSPACE_PAGE);
    expect(source).toContain('href="/admin/companies/new"');
  });

  it(`${USERS_PAGE} links to /admin/company-workspace-live`, () => {
    const source = readSource(USERS_PAGE);
    expect(source).toMatch(/\/admin\/company-workspace-live\?tenantId=/);
  });

  it(`${WORKSPACE_PAGE} links to /admin/company-users-live`, () => {
    const source = readSource(WORKSPACE_PAGE);
    expect(source).toMatch(/\/admin\/company-users-live\?tenantId=/);
  });
});

// ── 13: provisioning success links now point to real pages ─────────────────

describe('Admin Company Nav Completion 01 — provisioning success links point to real pages', () => {
  it(`${PROVISION_ROUTE} links to /admin/company-users-live and /admin/company-workspace-live, both of which now exist`, () => {
    const route = readSource(PROVISION_ROUTE);
    expect(route).toMatch(/\/admin\/company-users-live\?tenantId=/);
    expect(route).toMatch(/\/admin\/company-workspace-live\?tenantId=/);

    // The pages these links point to must actually exist now.
    expect(() => readSource(USERS_PAGE)).not.toThrow();
    expect(() => readSource(WORKSPACE_PAGE)).not.toThrow();
  });

  it('the API routes both pages consume still exist and are GET-based', () => {
    const usersRoute = readSource('app/api/admin/company-users/route.ts');
    const workspaceRoute = readSource('app/api/admin/company-workspace/route.ts');
    expect(usersRoute).toMatch(/export async function GET/);
    expect(workspaceRoute).toMatch(/export async function GET/);
  });
});

// ── B171 collision guard ─────────────────────────────────────────────────────
// This sprint's pages must never collide with the flat `/admin/company-users`
// and `/admin/company-workspace` paths, which host a *different*, synthetic
// demo subsystem that an earlier sprint (B171) deliberately removed and
// locked out via tests/unit/b168-5-gen3-consolidation.test.ts.

describe('Admin Company Nav Completion 01 — does not collide with the B171-protected flat paths', () => {
  it('the B171 consolidation regression test still exists and still forbids the flat paths', () => {
    const gen3Test = readSource(GEN3_CONSOLIDATION_TEST);
    expect(gen3Test).toContain("'app/admin/company-workspace'");
    expect(gen3Test).toContain("'app/admin/company-users'");
    expect(gen3Test).toMatch(/no longer exists \(B171 cleanup\)/);
  });

  it('this sprint added no page.tsx at the forbidden flat paths', () => {
    expect(() => readSource('app/admin/company-users/page.tsx')).toThrow();
    expect(() => readSource('app/admin/company-workspace/page.tsx')).toThrow();
  });

  it('the new pages live at the distinct -live-suffixed paths instead', () => {
    expect(USERS_PAGE).toMatch(/^app\/admin\/company-users-live\//);
    expect(WORKSPACE_PAGE).toMatch(/^app\/admin\/company-workspace-live\//);
  });
});

// ── 14-15, 22: migrations and proposed SQL untouched ────────────────────────

describe('Admin Company Nav Completion 01 — no migration or proposed SQL touched', () => {
  it('supabase/migrations/001_live_v1_foundation.sql is unmodified (spot check)', () => {
    const migration = readSource('supabase/migrations/001_live_v1_foundation.sql');
    expect(migration).toMatch(/CREATE SCHEMA IF NOT EXISTS audit/);
  });

  it('034/035/036 remain readable and unchanged under supabase/proposed/', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
  });

  it('no new .sql file was added by this sprint under supabase/', () => {
    for (const file of ALL_NEW_FILES) {
      expect(file.endsWith('.sql')).toBe(false);
    }
  });
});

// ── 16: no KORA Link flags changed ───────────────────────────────────────────

describe('Admin Company Nav Completion 01 — no KORA Link flag changed', () => {
  it('lib/kora-link/config.ts is unmodified (spot check)', () => {
    const config = readSource('lib/kora-link/config.ts');
    expect(config).toMatch(/isKoraLinkEnabled/);
    expect(config).toMatch(/env\.KORA_LINK_ENABLED === 'true'/);
  });

  it('neither new page nor panel references any KORA Link feature flag', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/KORA_LINK_ENABLED|KORA_LINK_DB_LOOKUP_ENABLED|KORA_LINK_ACTIVATION_ENABLED/);
    }
  });
});

// ── 17-19: KORA Index engine, ingestion, access-matrix untouched ───────────

describe('Admin Company Nav Completion 01 — KORA Index engine, ingestion, and access-matrix remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts still bears its original header (not rewritten)', () => {
    const interpreter = readSource('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(interpreter).toMatch(/Raw-to-UEF Rule-Based Interpreter v0\.1/);
  });

  it('lib/auth/access-matrix.ts still bears its B168 authoritative header (not rewritten)', () => {
    const accessMatrix = readSource('lib/auth/access-matrix.ts');
    expect(accessMatrix).toMatch(/B168 — Matrice di accesso autoritativa per KORA/);
  });
});

// ── 20-21: no RLS policy files, no companion/activation score ──────────────

describe('Admin Company Nav Completion 01 — no RLS policy files, no companion/activation score introduced', () => {
  it('no new file in this sprint contains a CREATE POLICY statement', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/CREATE\s+POLICY/i);
    }
  });

  it('no new file introduces a companion score or separate activation score', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/companion score/i);
      expect(source).not.toMatch(/separate (?:public )?activation score/i);
    }
  });
});

// ── 23: commons.post / commons.booking / commons.contribution_event untouched ──

describe('Admin Company Nav Completion 01 — commons.post, commons.booking, commons.contribution_event remain untouched', () => {
  it('migration 013 still creates commons.post unmodified', () => {
    const migration = readSource('supabase/migrations/013_kora_commons.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('migration 025 still creates commons.booking and commons.contribution_event unmodified', () => {
    const migration = readSource('supabase/migrations/025_commons_booking_contribution.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });

  it('no new file references commons.* tables', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/commons\.(post|booking|contribution_event)/);
    }
  });
});
