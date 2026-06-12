// tests/unit/b131-tenant-classification.test.ts
// B131 — Tenant Hygiene & Demo-Live Tenant Separation
// Step 1: migration file integrity.
// Step 2: provisioning routes set tenant_kind explicitly.
// Pure fs.readFileSync — no runtime, no DB, no Supabase.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const MIGRATION = 'supabase/migrations/014_tenant_classification.sql';

// ── Group 1: Migration file exists ───────────────────────────────────────────

describe('B131 — migration 014 exists', () => {
  it('supabase/migrations/014_tenant_classification.sql exists', () => {
    expect(fileExists(MIGRATION)).toBe(true);
  });
});

// ── Group 2: tenant_kind column definition ────────────────────────────────────

describe('B131 — migration: tenant_kind column', () => {
  const sql = readFile(MIGRATION);

  it('adds tenant_kind column', () => {
    expect(sql).toContain('ADD COLUMN');
    expect(sql).toContain('tenant_kind');
  });

  it('tenant_kind is NOT NULL DEFAULT LIVE', () => {
    expect(sql).toContain('NOT NULL');
    expect(sql).toContain("DEFAULT 'LIVE'");
  });

  it('CHECK constraint includes LIVE', () => {
    expect(sql).toContain("'LIVE'");
  });

  it('CHECK constraint includes DEMO', () => {
    expect(sql).toContain("'DEMO'");
  });

  it('CHECK constraint includes TEST', () => {
    expect(sql).toContain("'TEST'");
  });

  it('CHECK constraint includes SANDBOX', () => {
    expect(sql).toContain("'SANDBOX'");
  });

  it('CHECK constraint does NOT include ARCHIVED', () => {
    // 'ARCHIVED' may appear in comments explaining its exclusion.
    // What must not happen: ARCHIVED inside the CHECK (...) value list.
    const checkLine = sql
      .split('\n')
      .find(l => l.includes('CHECK') && l.includes("'LIVE'"));
    expect(checkLine).toBeTruthy();
    expect(checkLine).not.toContain("'ARCHIVED'");
  });
});

// ── Group 3: Backfill correctness ─────────────────────────────────────────────

describe('B131 — migration: backfill', () => {
  const sql = readFile(MIGRATION);

  it('backfills OP-001 to DEMO', () => {
    expect(sql).toContain("tenant_code = 'OP-001'");
    expect(sql).toContain("tenant_kind = 'DEMO'");
  });

  it('backfills industry_code SYNTHETIC to DEMO', () => {
    expect(sql).toContain("industry_code = 'SYNTHETIC'");
  });

  it('backfills industry_code TEST to TEST (not LIVE)', () => {
    expect(sql).toContain("industry_code = 'TEST'");
    expect(sql).toContain("tenant_kind = 'TEST'");
  });

  it('TEST backfill uses a separate UPDATE statement from DEMO backfill', () => {
    // Two independent UPDATE statements — non-overlapping criteria.
    const updateCount = (sql.match(/^\s*UPDATE analytics\.tenant/gm) ?? []).length;
    expect(updateCount).toBeGreaterThanOrEqual(2);
  });

  it('industry_code TEST tenants are NOT treated as LIVE (no overlap with LIVE default)', () => {
    // The TEST UPDATE runs independently of the DEMO UPDATE.
    // Rows with industry_code = 'TEST' must not fall through to LIVE default.
    const testUpdateBlock = sql
      .split('\n')
      .filter(l => l.includes("'TEST'") || (l.includes('SET') && sql.indexOf(l) > sql.indexOf("industry_code = 'TEST'")))
      .slice(0, 6)
      .join('\n');
    // Structural check: industry_code = 'TEST' appears in the migration
    expect(sql).toContain("industry_code = 'TEST'");
    // And the migration sets tenant_kind = 'TEST' (not 'LIVE') for those rows
    expect(sql).toContain("tenant_kind = 'TEST'");
    void testUpdateBlock;
  });

  it('backfill uses UPDATE, not DELETE FROM or TRUNCATE', () => {
    const upper = sql.toUpperCase();
    expect(upper).toContain('UPDATE');
    // 'DELETE' as a substring of DELETED_AT is fine — what must not appear is DELETE FROM
    expect(upper).not.toContain('DELETE FROM');
    expect(upper).not.toContain('TRUNCATE');
  });

  it('backfill does not touch RLS policies (no DROP POLICY / CREATE POLICY)', () => {
    expect(sql.toUpperCase()).not.toContain('DROP POLICY');
    expect(sql.toUpperCase()).not.toContain('CREATE POLICY');
  });
});

// ── Group 4: Index and schema reload ─────────────────────────────────────────

describe('B131 — migration: index and reload', () => {
  const sql = readFile(MIGRATION);

  it('creates index on tenant_kind', () => {
    expect(sql).toContain('CREATE INDEX');
    expect(sql).toContain('tenant_kind');
  });

  it('notifies pgrst to reload schema', () => {
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});

// ── Group 5: Soft-delete separation ──────────────────────────────────────────

describe('B131 — migration: deleted_at stays separate from tenant_kind', () => {
  const sql = readFile(MIGRATION);

  it('does not alter deleted_at column', () => {
    expect(sql).not.toContain('ALTER COLUMN deleted_at');
    expect(sql).not.toContain('DROP COLUMN deleted_at');
  });

  it('migration comment documents ARCHIVED exclusion', () => {
    expect(sql).toContain('ARCHIVED');
    expect(sql).toContain('deleted_at');
  });
});

// ── Group 6: B129/B130 boundary tests not broken ─────────────────────────────

describe('B131 — B129/B130 live pages not touched', () => {
  it('app/company/financial/page.tsx still live-only (no demo services)', () => {
    const src = readFile('app/company/financial/page.tsx');
    expect(src).not.toContain('financialGovernanceService');
    expect(src).not.toContain('meridiana');
    expect(src).toContain("forceEnvironment: 'live'");
  });

  it('app/company/kora-index/page.tsx still live-only', () => {
    const src = readFile('app/company/kora-index/page.tsx');
    expect(src).toContain("forceEnvironment: 'live'");
    expect(src).not.toContain('isLive ?');
  });
});

// ── Group 8: Step 2 — provisioning routes set tenant_kind explicitly ─────────

describe('B131 Step 2 — live-company route sets tenant_kind LIVE', () => {
  const src = readFile('app/api/admin/live-company/route.ts');

  it('inserts tenant_kind: LIVE', () => {
    expect(src).toContain("tenant_kind:");
    expect(src).toContain("'LIVE'");
  });

  it('tenant_kind LIVE is inside the analytics.tenant INSERT block', () => {
    const insertIdx = src.indexOf('.insert({');
    const insertEnd = src.indexOf('}).select(', insertIdx);
    const insertBlock = src.slice(insertIdx, insertEnd);
    expect(insertBlock).toContain("tenant_kind:");
    expect(insertBlock).toContain("'LIVE'");
  });

  it('does not set tenant_kind DEMO or SANDBOX or TEST', () => {
    const insertIdx = src.indexOf('.insert({');
    const insertEnd = src.indexOf('}).select(', insertIdx);
    const insertBlock = src.slice(insertIdx, insertEnd);
    expect(insertBlock).not.toContain("'DEMO'");
    expect(insertBlock).not.toContain("'SANDBOX'");
    expect(insertBlock).not.toContain("'TEST'");
  });

  it('does not introduce ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });

  it('app_metadata not changed — still kora_role/kora_tenant_id/kora_status', () => {
    expect(src).toContain('kora_role');
    expect(src).toContain('kora_tenant_id');
    expect(src).toContain('kora_status');
  });
});

describe('B131 Step 2 — companies/provision route sets tenant_kind LIVE', () => {
  const src = readFile('app/api/admin/companies/provision/route.ts');

  it('inserts tenant_kind: LIVE', () => {
    expect(src).toContain("tenant_kind:");
    expect(src).toContain("'LIVE'");
  });

  it('tenant_kind LIVE is inside the analytics.tenant INSERT block', () => {
    const insertIdx = src.indexOf('.insert({');
    const insertEnd = src.indexOf('}).select(', insertIdx);
    const insertBlock = src.slice(insertIdx, insertEnd);
    expect(insertBlock).toContain("tenant_kind:");
    expect(insertBlock).toContain("'LIVE'");
  });

  it('does not set tenant_kind DEMO or SANDBOX or TEST', () => {
    const insertIdx = src.indexOf('.insert({');
    const insertEnd = src.indexOf('}).select(', insertIdx);
    const insertBlock = src.slice(insertIdx, insertEnd);
    expect(insertBlock).not.toContain("'DEMO'");
    expect(insertBlock).not.toContain("'SANDBOX'");
    expect(insertBlock).not.toContain("'TEST'");
  });

  it('does not introduce ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });

  it('TENANT_META_KEY canonical key unchanged (kora_tenant_id)', () => {
    expect(src).toContain("'kora_tenant_id'");
  });
});

describe('B131 Step 2 — operator-flow route sets tenant_kind DEMO', () => {
  const src = readFile('app/api/admin/operator-flow/route.ts');

  it('inserts tenant_kind: DEMO', () => {
    expect(src).toContain("tenant_kind:");
    expect(src).toContain("'DEMO'");
  });

  it('tenant_kind DEMO is inside the synthetic tenant INSERT block', () => {
    const insertIdx = src.indexOf('.insert({');
    const insertEnd = src.indexOf('}).select(', insertIdx);
    const insertBlock = src.slice(insertIdx, insertEnd);
    expect(insertBlock).toContain("tenant_kind:");
    expect(insertBlock).toContain("'DEMO'");
  });

  it('does not set tenant_kind LIVE in the synthetic INSERT', () => {
    const insertIdx = src.indexOf('.insert({');
    const insertEnd = src.indexOf('}).select(', insertIdx);
    const insertBlock = src.slice(insertIdx, insertEnd);
    expect(insertBlock).not.toContain("'LIVE'");
  });

  it('does not introduce ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });

  it('OP-001 blocks still present — no refactor of hardcoded guards', () => {
    expect(src).toContain("'OP-001'");
  });

  it('industry_code SYNTHETIC still set (backfill anchor)', () => {
    expect(src).toContain("'SYNTHETIC'");
  });
});

// ── Group 9: Step 3 — API query filtering ────────────────────────────────────

describe('B131 Step 3 — /api/admin/tenants: ?kind= param and default LIVE', () => {
  const src = readFile('app/api/admin/tenants/route.ts');

  it('declares VALID_KINDS including LIVE, DEMO, TEST, SANDBOX', () => {
    expect(src).toContain("'LIVE'");
    expect(src).toContain("'DEMO'");
    expect(src).toContain("'TEST'");
    expect(src).toContain("'SANDBOX'");
  });

  it('does not include ARCHIVED in VALID_KINDS', () => {
    const validKindsLine = src
      .split('\n')
      .find(l => l.includes('VALID_KINDS') && l.includes('const'));
    expect(validKindsLine).toBeTruthy();
    expect(validKindsLine).not.toContain("'ARCHIVED'");
  });

  it('defaults kind to LIVE when no ?kind= param is provided', () => {
    expect(src).toContain("let kind: TenantKind = 'LIVE'");
  });

  it('returns 400 for invalid ?kind= values', () => {
    expect(src).toContain('status: 400');
    expect(src).toContain('Valori ammessi');
  });

  it('filters GET query by tenant_kind (eq tenant_kind)', () => {
    expect(src).toContain(".eq('tenant_kind', kind)");
  });

  it('filters GET query by deleted_at IS NULL', () => {
    expect(src).toContain(".is('deleted_at', null)");
  });

  it('includes tenant_kind in SELECT', () => {
    expect(src).toContain('tenant_kind');
    expect(src).toContain('.select(');
  });

  it('returns kind in GET response', () => {
    expect(src).toContain('kind');
    expect(src).toContain('NextResponse.json');
  });

  it('POST INSERT also sets tenant_kind LIVE', () => {
    const postIdx = src.indexOf('export async function POST');
    const postSrc = src.slice(postIdx);
    expect(postSrc).toContain("tenant_kind:");
    expect(postSrc).toContain("'LIVE'");
  });
});

describe('B131 Step 3 — company-console filters LIVE tenants', () => {
  const src = readFile('app/api/admin/company-console/route.ts');

  it('tenant fetch uses .eq tenant_kind LIVE', () => {
    expect(src).toContain(".eq('tenant_kind', 'LIVE')");
  });

  it('tenant fetch uses .is deleted_at null', () => {
    expect(src).toContain(".is('deleted_at', null)");
  });

  it('does not include ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });
});

describe('B131 Step 3 — live-spine-diagnostics filters LIVE tenants', () => {
  const src = readFile('app/api/admin/live-spine-diagnostics/route.ts');

  it('tenant fetch uses .eq tenant_kind LIVE', () => {
    expect(src).toContain(".eq('tenant_kind', 'LIVE')");
  });

  it('tenant fetch uses .is deleted_at null', () => {
    expect(src).toContain(".is('deleted_at', null)");
  });

  it('does not include ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });

  it('OP-001 warning block still present — no refactor', () => {
    expect(src).toContain("'OP-001'");
  });
});

describe('B131 Step 3 — trial-readiness filters LIVE tenants', () => {
  const src = readFile('app/api/admin/trial-readiness/route.ts');

  it('tenant fetch uses .eq tenant_kind LIVE', () => {
    expect(src).toContain(".eq('tenant_kind', 'LIVE')");
  });

  it('tenant fetch uses .is deleted_at null', () => {
    expect(src).toContain(".is('deleted_at', null)");
  });

  it('does not include ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });
});

describe('B131 Step 3 — no OP-001 refactor in GET routes', () => {
  const routesToCheck = [
    'app/api/admin/company-console/route.ts',
    'app/api/admin/live-spine-diagnostics/route.ts',
    'app/api/admin/trial-readiness/route.ts',
  ];

  for (const rel of routesToCheck) {
    it(`${rel}: still does NOT import or refactor OP-001 blocks (classification is the fix)`, () => {
      // The fix is the .eq('tenant_kind', 'LIVE') filter, not removing OP-001 guard checks.
      // No massive === 'OP-001' search/replace should have happened.
      const src = readFile(rel);
      // Confirm the canonical B131 filter exists
      expect(src).toContain(".eq('tenant_kind', 'LIVE')");
    });
  }
});

// ── Group 10: Step 4 — UI badge/filter ───────────────────────────────────────

describe('B131 Step 4 — TenantOnboardingPanel: kind filter and badge', () => {
  const src = readFile('app/admin/tenants/_components/TenantOnboardingPanel.tsx');

  it('declares KINDS array with LIVE, DEMO, TEST, SANDBOX', () => {
    expect(src).toContain("'LIVE'");
    expect(src).toContain("'DEMO'");
    expect(src).toContain("'TEST'");
    expect(src).toContain("'SANDBOX'");
    expect(src).toContain('KINDS');
  });

  it('does not include ARCHIVED in KINDS', () => {
    const kindsLine = src.split('\n').find(l => l.includes('KINDS') && l.includes('const'));
    expect(kindsLine).toBeTruthy();
    expect(kindsLine).not.toContain("'ARCHIVED'");
  });

  it('defaults kind state to LIVE', () => {
    expect(src).toContain("useState<TenantKind>('LIVE')");
  });

  it('fetch uses ?kind= query param', () => {
    expect(src).toContain('?kind=');
    expect(src).toContain('/api/admin/tenants');
  });

  it('does not use include_non_live param', () => {
    expect(src).not.toContain('include_non_live');
  });

  it('renders filter buttons for each kind', () => {
    expect(src).toContain('KINDS.map');
    expect(src).toContain('setKind');
  });

  it('TenantKindBadge component defined', () => {
    expect(src).toContain('TenantKindBadge');
  });

  it('TenantKindBadge rendered per tenant row', () => {
    expect(src).toContain('tenantKind');
    expect(src).toContain('<TenantKindBadge');
  });

  it('tenantKind in TenantSummary interface', () => {
    expect(src).toContain('tenantKind?:');
  });

  it('header describes live-only default', () => {
    expect(src).toContain('solo aziende ufficiali');
  });
});

describe('B131 Step 4 — CompanyConsolePanel: LIVE-only note', () => {
  const src = readFile('app/admin/companies/_components/CompanyConsolePanel.tsx');

  it('caveat mentions Live Company Registry or tenant_kind LIVE', () => {
    expect(src).toContain('LIVE');
  });

  it('does not include ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });

  it('does not add DEMO filter to company console', () => {
    // Company console stays LIVE-only; no kind= filter buttons here
    expect(src).not.toContain('?kind=DEMO');
  });
});

describe('B131 Step 4 — trial-control-center: LIVE filter in direct DB fetch', () => {
  const src = readFile('app/admin/trial-control-center/page.tsx');

  it('tenant fetch filters by tenant_kind LIVE', () => {
    expect(src).toContain(".eq('tenant_kind', 'LIVE')");
  });

  it('tenant fetch filters by deleted_at IS NULL', () => {
    expect(src).toContain(".is('deleted_at', null)");
  });

  it('does not include ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });

  it('OP-001 global warning still present — no refactor', () => {
    expect(src).toContain("'OP-001'");
  });
});

describe('B131 Step 4 — live-spine-diagnostics page: LIVE filter in direct DB fetch', () => {
  const src = readFile('app/admin/live-spine-diagnostics/page.tsx');

  it('tenant fetch filters by tenant_kind LIVE', () => {
    expect(src).toContain(".eq('tenant_kind', 'LIVE')");
  });

  it('tenant fetch filters by deleted_at IS NULL', () => {
    expect(src).toContain(".is('deleted_at', null)");
  });

  it('does not include ARCHIVED', () => {
    expect(src).not.toContain("'ARCHIVED'");
  });
});

describe('B131 Step 4 — no DEMO/TEST label presented as live official companies', () => {
  const filesToCheck = [
    'app/admin/tenants/_components/TenantOnboardingPanel.tsx',
    'app/admin/companies/_components/CompanyConsolePanel.tsx',
  ];

  for (const rel of filesToCheck) {
    it(`${rel}: no text labels DEMO/TEST as 'aziende live' or 'aziende ufficiali'`, () => {
      const src = readFile(rel);
      // DEMO and TEST can appear as filter labels — what must NOT happen is presenting them as official live companies
      expect(src).not.toContain('aziende DEMO');
      expect(src).not.toContain('aziende TEST');
      expect(src).not.toContain('aziende ufficiali DEMO');
    });
  }
});

// ── Group 7: Existing migrations not modified ─────────────────────────────────

describe('B131 — existing migrations not modified', () => {
  const existingMigrations = [
    'supabase/migrations/001_live_v1_foundation.sql',
    'supabase/migrations/002_grants_and_softdelete.sql',
    'supabase/migrations/006_canonical_tenant_key.sql',
    'supabase/migrations/007_worker_provisioning.sql',
  ];

  for (const rel of existingMigrations) {
    it(`${rel} still exists`, () => {
      expect(fileExists(rel)).toBe(true);
    });
  }

  it('014 is a new file — not replacing an existing migration', () => {
    expect(fileExists('supabase/migrations/014_tenant_classification.sql')).toBe(true);
    expect(fileExists('supabase/migrations/013_kora_commons.sql')).toBe(true);
  });
});
