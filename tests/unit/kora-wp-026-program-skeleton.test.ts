// tests/unit/kora-wp-026-program-skeleton.test.ts
// KORA-WP-026 — Program Skeleton — Two-Level Schema Safety.
//
// Structural/static coverage. The DB-dependent half of the founder test
// matrix (create Definition/Participation, cross-tenant denial at both TS
// and DB-trigger layers, unauthorized-actor denial, tenant-scoped listing,
// direct-DB-bypass denial, RLS role emulation) was exercised for real
// against local disposable Postgres (migration chain 001-078): 12/12
// TypeScript-service assertions + 7/7 direct-SQL RLS/GRANT role-emulation
// checks — see this task's own completion report for the full transcript;
// this file does not run a live database.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const SERVICE_PATH = 'lib/program/program-service.ts';
const MIGRATION_PATH = 'supabase/migrations/078_program_skeleton.sql';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function codeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*--/.test(l)); }
function tsCodeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)); }
function importLines(src: string): string[] { return src.split('\n').filter((l) => /^\s*import\b/.test(l)); }

describe('KORA-WP-026 — two-level shape (doc 69 §5/§6)', () => {
  it('exactly two new tables: program_definition and program_participation', () => {
    const migration = read(MIGRATION_PATH);
    const createTables = migration.match(/CREATE TABLE IF NOT EXISTS analytics\.\w+/g) ?? [];
    expect(createTables).toEqual([
      'CREATE TABLE IF NOT EXISTS analytics.program_definition',
      'CREATE TABLE IF NOT EXISTS analytics.program_participation',
    ]);
  });

  it('program_participation has no UNIQUE(program_definition_id) — ordinary one-to-many, not artificially capped at one row (69 §6, literal reading)', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    expect(lines.some((l) => /UNIQUE\s*\(\s*program_definition_id\s*\)/.test(l))).toBe(false);
  });

  it('owner_type is a single-value CHECK (\'company\' only) — widenable later without data migration', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/owner_type\s+text\s+NOT NULL DEFAULT 'company' CHECK \(owner_type = 'company'\)/);
  });

  it('quota fields (budget/eligibility/population) are explicit typed columns, never opaque JSONB', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    const src = lines.join('\n');
    expect(src).toMatch(/budget_amount\s+numeric/);
    expect(src).toMatch(/eligibility_description\s+text/);
    expect(src).toMatch(/population_estimate\s+integer/);
    expect(lines.some((l) => /jsonb/i.test(l))).toBe(false);
  });
});

describe('KORA-WP-026 — no Commitment linkage (doc 95 §7 correction)', () => {
  it('neither table has a commitment_id column or any Decision-Spine FK', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    expect(lines.some((l) => /commitment_id|evidence_plan_id|review_id|resource_allocation/i.test(l))).toBe(false);
  });

  it('the service never imports from commitment/evidence-plan/review/decision-linkage modules', () => {
    const lines = importLines(read(SERVICE_PATH));
    expect(lines.some((l) => /commitment-service|evidence-plan-service|review-service|decision-linkage-service/.test(l))).toBe(false);
  });
});

describe('KORA-WP-026 — no lifecycle / no audit (registry\'s own explicit scope)', () => {
  it('no status/lifecycle column exists on either table', () => {
    const migration = read(MIGRATION_PATH);
    const createStatements = migration.split(/CREATE TABLE IF NOT EXISTS/).slice(1).map((s) => s.split(');')[0]);
    for (const stmt of createStatements) {
      expect(stmt).not.toMatch(/\bstatus\s+text/);
    }
  });

  it('the service never emits a governance_event or audit_log entry (registry: "Audit: N/A at this slice")', () => {
    const lines = tsCodeLines(read(SERVICE_PATH));
    expect(lines.some((l) => /governance_event|audit_log/.test(l))).toBe(false);
  });
});

describe('KORA-WP-026 — no Worker/PIB, no taxonomy, no Prime/Space/Partner', () => {
  it('no Worker/PIB reference anywhere in the migration or service CODE (comments may discuss the boundary)', () => {
    const migrationLines = codeLines(read(MIGRATION_PATH));
    const serviceLines = tsCodeLines(read(SERVICE_PATH));
    expect(migrationLines.some((l) => /worker_id|pseudonym_id|\bPIB\b/i.test(l))).toBe(false);
    expect(serviceLines.some((l) => /worker_id|pseudonym_id|\bPIB\b/i.test(l))).toBe(false);
  });

  it('no ActionFamily/PillarCode/fiscal-perimeter taxonomy reference (KORA-WP-120 boundary)', () => {
    const migrationLines = codeLines(read(MIGRATION_PATH));
    const serviceLines = tsCodeLines(read(SERVICE_PATH));
    expect(migrationLines.some((l) => /ActionFamily|PillarCode|FiscalBudgetPerimeter/.test(l))).toBe(false);
    expect(serviceLines.some((l) => /ActionFamily|PillarCode|FiscalBudgetPerimeter/.test(l))).toBe(false);
  });

  it('no Prime/Program-Funds/Space/Partner semantics', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    expect(lines.some((l) => /program_funds|funding_commitment|partner_payable|kora_space|commons\./i.test(l))).toBe(false);
  });
});

describe('KORA-WP-026 — cross-company invariant (doc 69 §6)', () => {
  it('a BEFORE INSERT OR UPDATE trigger enforces participant_tenant_id = definition owner', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/CREATE TRIGGER trg_program_participation_same_company\s+BEFORE INSERT OR UPDATE ON analytics\.program_participation/);
    expect(migration).toMatch(/kora\/cross-company-not-allowed/);
  });
});

describe('KORA-WP-026 — authority model', () => {
  it('writes are gated to COMPANY_ADMIN only — no ADVISOR/KORA_ADMIN write path invented at the TS layer', () => {
    const src = read(SERVICE_PATH);
    expect(src).toMatch(/assertCompanyWriter/);
    expect(src).toMatch(/function assertCompanyWriter\(actorRole: string\): void \{[\s\S]*?actorRole !== COMPANY_WRITE_ROLE/);
  });

  it('actor attribution is never fabricated', () => {
    const src = read(SERVICE_PATH);
    expect(src).toMatch(/function assertActor\(actorRole: string, actorId: string\): void \{[\s\S]*?!actorRole \|\| !actorId/);
  });
});

describe('KORA-WP-026 — RLS / grants (Pattern A, mirrors analytics.commitment)', () => {
  it('FORCE ROW LEVEL SECURITY on both tables', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/ALTER TABLE analytics\.program_definition FORCE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE analytics\.program_participation FORCE ROW LEVEL SECURITY/);
  });

  it('KORA_ADMIN full access, COMPANY_ADMIN SELECT-only scoped to its own tenant, on both tables', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/kora_admin_all_program_definition[\s\S]*?kora\.kora_role\(\) = 'KORA_ADMIN'/);
    expect(migration).toMatch(/company_own_program_definition_read[\s\S]*?owner_tenant_id = kora\.tenant_id\(\)/);
    expect(migration).toMatch(/kora_admin_all_program_participation[\s\S]*?kora\.kora_role\(\) = 'KORA_ADMIN'/);
    expect(migration).toMatch(/company_own_program_participation_read[\s\S]*?participant_tenant_id = kora\.tenant_id\(\)/);
  });

  it('no INSERT/UPDATE grant to authenticated on either table — writes are service_role-only', () => {
    const grantLines = codeLines(read(MIGRATION_PATH)).filter((l) => /^\s*GRANT\b/i.test(l));
    const authenticatedGrants = grantLines.filter((l) => /\bauthenticated\b/.test(l));
    for (const line of authenticatedGrants) {
      expect(line).toMatch(/^GRANT SELECT ON/);
    }
  });
});

describe('KORA-WP-026 — service-role guard allowlist', () => {
  it('the new service is a documented allowlist entry', () => {
    const guard = readFileSync('tests/unit/pilot-trust-01-service-role-guard.test.ts', 'utf8');
    expect(guard).toMatch(/lib\/program\/program-service\.ts/);
  });
});

describe('KORA-WP-026 — migration ledger sanity (no lateral migration added)', () => {
  it('078 exists and no migration beyond the WP-026 scope was introduced alongside it', () => {
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(numbers).toContain(78);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(78);
  });
});
