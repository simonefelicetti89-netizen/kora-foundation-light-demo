/**
 * Gate 2.2 — Rollback Migration 029 Quarantine assertions.
 *
 * Verifies that:
 * - supabase/migrations/029_rollback_027_if_needed.sql has been removed from the pipeline
 * - supabase/rollback/029_rollback_027_if_needed.sql exists as manual-only artifact
 * - supabase/rollback/README.md exists and contains correct governance content
 * - docs/GATE2_2_PRIVACY_HARDENING_027_STAGING.md §13 documents the quarantine
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/archive/gate2/GATE2_2_PRIVACY_HARDENING_027_STAGING.md';
const ROLLBACK_FILE = 'supabase/rollback/029_rollback_027_if_needed.sql';
const ROLLBACK_README = 'supabase/rollback/README.md';
const MIGRATIONS_029 = 'supabase/migrations/029_rollback_027_if_needed.sql';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}
function readme(): string {
  return readFileSync(resolve(process.cwd(), ROLLBACK_README), 'utf-8');
}

// ── 1. File system state ──────────────────────────────────────────────────────

describe('gate2-2-rollback-quarantine — filesystem', () => {
  it('029 is NOT in supabase/migrations/', () => {
    expect(existsSync(resolve(process.cwd(), MIGRATIONS_029))).toBe(false);
  });

  it('029 exists in supabase/rollback/', () => {
    expect(existsSync(resolve(process.cwd(), ROLLBACK_FILE))).toBe(true);
  });

  it('supabase/rollback/README.md exists', () => {
    expect(existsSync(resolve(process.cwd(), ROLLBACK_README))).toBe(true);
  });
});

// ── 2. 029 content confirms rollback-only intent ──────────────────────────────

describe('gate2-2-rollback-quarantine — 029 rollback-only', () => {
  it('029 file header states EMERGENCY ROLLBACK ONLY', () => {
    const sql = readFileSync(resolve(process.cwd(), ROLLBACK_FILE), 'utf-8');
    expect(sql).toMatch(/EMERGENCY ROLLBACK ONLY/i);
  });

  it('029 file states it is NOT part of the normal apply sequence', () => {
    const sql = readFileSync(resolve(process.cwd(), ROLLBACK_FILE), 'utf-8');
    expect(sql).toMatch(/NOT part of the normal.*apply sequence/i);
  });

  it('029 file restores the 6 policies removed by 027', () => {
    const sql = readFileSync(resolve(process.cwd(), ROLLBACK_FILE), 'utf-8');
    expect(sql).toMatch(/worker_identity_kora_admin_all/);
    expect(sql).toMatch(/worker_pib_kora_admin_all/);
    expect(sql).toMatch(/kora_admin_impact_unit_read/);
  });

  it('029 file warns against applying to production', () => {
    const sql = readFileSync(resolve(process.cwd(), ROLLBACK_FILE), 'utf-8');
    expect(sql).toMatch(/[Pp]roduction.*separate.*approval|[Pp]roduction.*explicit/i);
  });
});

// ── 3. README governance content ──────────────────────────────────────────────

describe('gate2-2-rollback-quarantine — README governance', () => {
  it('README states files are manual-only', () => {
    expect(readme()).toMatch(/manual-only|never.*migration up|not.*migration.*pipeline/i);
  });

  it('README states must never be applied by supabase migration up', () => {
    expect(readme()).toMatch(/supabase migration up/i);
  });

  it('README states CTO or technical-owner approval required', () => {
    expect(readme()).toMatch(/CTO.*approval|technical.owner.*approval/i);
  });

  it('README states staging and production targets must be confirmed separately', () => {
    expect(readme()).toMatch(/staging.*production.*separately|production.*separate.*approval/i);
  });

  it('README documents 029 file entry', () => {
    expect(readme()).toMatch(/029_rollback_027_if_needed/);
  });

  it('README states 029 rolls back 027', () => {
    expect(readme()).toMatch(/[Rr]olls back.*027|029.*027/);
  });

  it('README confirms 029 status is NOT APPLIED', () => {
    expect(readme()).toMatch(/NOT APPLIED|not applied/i);
  });

  it('README states forward-fix is always preferred over rollback', () => {
    expect(readme()).toMatch(/forward.fix.*prefer|prefer.*forward.fix/i);
  });
});

// ── 4. Documentation: quarantine section present ──────────────────────────────

describe('gate2-2-rollback-quarantine — doc quarantine section', () => {
  it('doc contains Rollback 029 Quarantine section', () => {
    expect(doc()).toMatch(/Rollback 029 Quarantine/i);
  });

  it('doc explains why 029 was quarantined (accidental migration up risk)', () => {
    expect(doc()).toMatch(/migration up.*029|029.*migration up|accidental.*apply/i);
  });

  it('doc records the git mv action from migrations/ to rollback/', () => {
    expect(doc()).toMatch(/git mv|supabase\/migrations.*supabase\/rollback|migrations\/.*rollback\//i);
  });

  it('doc confirms supabase/rollback/README.md was created', () => {
    expect(doc()).toMatch(/rollback\/README\.md|supabase\/rollback.*README/i);
  });
});

// ── 5. Post-quarantine pipeline state ────────────────────────────────────────

describe('gate2-2-rollback-quarantine — pipeline state', () => {
  it('doc confirms 029 no longer appears in migration list', () => {
    expect(doc()).toMatch(/029.*no longer|no longer.*029|029.*not.*listed|029.*removed.*pipeline/i);
  });

  it('doc confirms 001-028 all aligned post-quarantine', () => {
    expect(doc()).toMatch(/001[–-]028.*aligned|001.*028.*Local.*Remote/i);
  });

  it('doc confirms 027 remains applied and tracked', () => {
    expect(doc()).toMatch(/027.*Applied.*aligned|027.*✓.*✓/i);
  });
});

// ── 6. 029 not applied during quarantine ─────────────────────────────────────

describe('gate2-2-rollback-quarantine — 029 not applied', () => {
  it('doc confirms 029 was not applied', () => {
    expect(doc()).toMatch(/029.*not.*applied|029.*was not.*executed|NOT.*applied.*029/i);
  });

  it('doc confirms C-11/C-12/W-04 still PASS after quarantine', () => {
    expect(doc()).toMatch(/C-11.*PASS|PASS.*C-11/);
  });

  it('doc confirms 027 hardening intact post-quarantine', () => {
    expect(doc()).toMatch(/027.*hardening.*intact|hardening.*intact|post-027.*hardening/i);
  });
});

// ── 7. Operational instructions ───────────────────────────────────────────────

describe('gate2-2-rollback-quarantine — operational instructions', () => {
  it('doc provides rollback execution path via db query (not migration up)', () => {
    expect(doc()).toMatch(/supabase db query.*rollback|db query.*029/i);
  });

  it('doc warns not to use migration up for rollback', () => {
    expect(doc()).toMatch(/do not use.*migration up.*rollback|migration up.*must never.*rollback/i);
  });

  it('doc states production rollback requires separate CTO approval', () => {
    expect(doc()).toMatch(/CTO sign.off|CTO.*approval|production.*separate.*approval/i);
  });
});

// ── 8. Safety constraints ─────────────────────────────────────────────────────

describe('gate2-2-rollback-quarantine — safety constraints', () => {
  it('doc confirms no supabase migration up was run', () => {
    expect(doc()).toMatch(/no.*supabase migration up|supabase migration up.*NOT/i);
  });

  it('doc confirms production not touched', () => {
    expect(doc()).toMatch(/[Pp]roduction.*NOT touched|NOT touched.*[Pp]roduction/i);
  });
});

// ── 9. Secrets hygiene ────────────────────────────────────────────────────────

describe('gate2-2-rollback-quarantine — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('readme contains no secrets', () => {
    expect(readme()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(readme()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });
});
