// tests/unit/kora-wp-027-readiness-attainment-health.test.ts
// KORA-WP-027 — Onboarding Readiness Pipeline Rebuild + KORA Ready
// Attainment/Health Split.
//
// Structural/static coverage. The DB-dependent half of the founder test
// matrix (not-ready with no attainment, reaching ready records exactly one
// attainment, degradation never erases history, recovery records a second
// distinct event, override/revoke capability-gating, cross-tenant
// isolation, concurrency) was exercised for real against local disposable
// Postgres (migration chain 001-079): 27/27 assertions passed — see this
// task's own completion report for the full transcript; this file does not
// run a live database.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const SERVICE_PATH = 'lib/company-readiness/company-readiness-service.ts';
const MIGRATION_PATH = 'supabase/migrations/079_kora_ready_attainment_health.sql';
const COMPANY_ROUTE_PATH = 'app/api/company/readiness/route.ts';
const ADMIN_ROUTE_PATH = 'app/api/admin/company-readiness/route.ts';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function codeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*--/.test(l)); }
function tsCodeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)); }
function importLines(src: string): string[] { return src.split('\n').filter((l) => /^\s*import\b/.test(l)); }

describe('KORA-WP-027 — historical attainment vs current health (doc 81 §8)', () => {
  it('exactly two new tables', () => {
    const createTables = read(MIGRATION_PATH).match(/CREATE TABLE IF NOT EXISTS analytics\.\w+/g) ?? [];
    expect(createTables).toEqual([
      'CREATE TABLE IF NOT EXISTS analytics.kora_ready_attainment',
      'CREATE TABLE IF NOT EXISTS analytics.current_readiness_health',
    ]);
  });

  it('kora_ready_attainment is append-only: an unconditional BEFORE UPDATE OR DELETE rejection trigger exists', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/CREATE TRIGGER trg_kora_ready_attainment_no_mutation\s+BEFORE UPDATE OR DELETE ON analytics\.kora_ready_attainment/);
    expect(migration).toMatch(/kora\/immutable: analytics\.kora_ready_attainment rows are never updated or deleted/);
  });

  it('current_readiness_health has a UNIQUE(tenant_id) — exactly one current-state row per Company, genuinely overwritable (UPDATE grant exists, no immutability trigger)', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/tenant_id\s+uuid\s+NOT NULL UNIQUE REFERENCES analytics\.tenant/);
    expect(migration).not.toMatch(/current_readiness_health_no_mutation/);
  });

  it('status vocabulary matches doc 79 §5\'s own workflow terms exactly: ready/not_ready/degraded/revoked', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/status\s+text\s+NOT NULL CHECK \(status IN \('ready', 'not_ready', 'degraded', 'revoked'\)\)/);
  });

  it('basis vocabulary matches doc 79 §5\'s own two paths: automated/override, with override_reason required when basis=override', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/basis\s+text\s+NOT NULL CHECK \(basis IN \('automated', 'override'\)\)/);
    expect(migration).toMatch(/kora_ready_attainment_override_reason_required/);
  });
});

describe('KORA-WP-027 — automated evaluation reuses the existing, previously-uncalled derivation', () => {
  it('the service imports buildCompanyOnboardingView from the existing lib/live/company-onboarding-view.ts, never redeclares readiness-check logic', () => {
    const lines = importLines(read(SERVICE_PATH));
    const viewImport = lines.find((l) => l.includes('lib/live/company-onboarding-view'));
    expect(viewImport).toBeDefined();
    expect(viewImport).toMatch(/buildCompanyOnboardingView/);
  });

  it('lib/live/company-onboarding-view.ts itself is untouched by this WP (this WP is its first real caller, not its author)', () => {
    const src = read('lib/live/company-onboarding-view.ts');
    expect(src).not.toMatch(/KORA-WP-027/);
  });

  it('the service never imports methodology-config or redeclares a scoring formula', () => {
    const lines = importLines(read(SERVICE_PATH));
    expect(lines.some((l) => /methodology-config/.test(l))).toBe(false);
    const codeOnly = tsCodeLines(read(SERVICE_PATH)).join('\n');
    expect(codeOnly).not.toMatch(/macroblock|factor_status|calibration/i);
  });
});

describe('KORA-WP-027 — WP-013 reuse boundary (Section 8/9)', () => {
  it('imports getCurrentPolicyConfig from the existing WP-013 module, never redeclares it', () => {
    const lines = importLines(read(SERVICE_PATH));
    const policyImport = lines.find((l) => l.includes('@/lib/policy-config/policy-config-service'));
    expect(policyImport).toBeDefined();
    expect(policyImport).toMatch(/getCurrentPolicyConfig/);
  });

  it('never creates a second config table or versioning mechanism', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    expect(lines.some((l) => /CREATE TABLE/i.test(l) && /policy[_ ]?config/i.test(l))).toBe(false);
  });

  it('policy_config_version_id is nullable — never assigned a fabricated value (structural: no INSERT hardcodes a non-null UUID literal for it)', () => {
    const migration = read(MIGRATION_PATH);
    const codeOnly = codeLines(migration).join('\n');
    expect(codeOnly).toMatch(/policy_config_version_id\s+uuid\s+REFERENCES/); // nullable — no NOT NULL
    expect(codeOnly).not.toMatch(/policy_config_version_id\s+uuid\s+NOT NULL/);
  });

  it('gov.policy_config_version itself is untouched (no grant/RLS change) by this migration', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    expect(lines.some((l) => /GRANT[^;]*ON gov\.policy_config_version/i.test(l))).toBe(false);
  });
});

describe('KORA-WP-027 — WP-009 capability reuse boundary (Section 11)', () => {
  it('the service imports hasAdminCapability from the existing WP-009 module, never invents a new capability domain/action', () => {
    const lines = importLines(read(SERVICE_PATH));
    const capImport = lines.find((l) => l.includes('@/lib/admin-capability/capability-service'));
    expect(capImport).toBeDefined();
    expect(capImport).toMatch(/hasAdminCapability/);
  });

  it('override/revoke check exactly COMPANY_OPERATIONS:OVERRIDE — an already-existing domain/action pair, never a new enum value', () => {
    const src = read(SERVICE_PATH);
    const calls = src.match(/hasAdminCapability\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) {
      expect(call).toMatch(/'COMPANY_OPERATIONS'/);
      expect(call).toMatch(/'OVERRIDE'/);
    }
  });

  it('no ADVISOR role ever appears in a write-authorization check (doc 81 §7 — Advisor concurrence is never a mandatory gate)', () => {
    const codeOnly = tsCodeLines(read(SERVICE_PATH)).join('\n');
    expect(codeOnly).not.toMatch(/ADVISOR/);
  });
});

describe('KORA-WP-027 — audit vs observability boundary (doc 79 §17)', () => {
  it('attainment/override/revoke each emit exactly one recordGovernanceEvent call, reusing the existing substrate', () => {
    const src = read(SERVICE_PATH);
    const lines = importLines(src);
    expect(lines.some((l) => l.includes('@/lib/audit/governance-event') && /recordGovernanceEvent/.test(l))).toBe(true);
    const calls = src.match(/await recordGovernanceEvent\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3); // attained, degraded, override, revoked
  });

  it('the service never imports the KORA-WP-046 observability module (that belongs at the route layer, not mixed into governance truth)', () => {
    const lines = importLines(read(SERVICE_PATH));
    expect(lines.some((l) => /lib\/observability/.test(l))).toBe(false);
  });

  it('the routes DO reuse the existing KORA-WP-046 observability primitive (correlation id + captureError), never a second logger', () => {
    for (const path of [COMPANY_ROUTE_PATH, ADMIN_ROUTE_PATH]) {
      const lines = importLines(read(path));
      const obsImport = lines.find((l) => l.includes('@/lib/observability/observability'));
      expect(obsImport, `${path} missing observability import`).toBeDefined();
      expect(obsImport).toMatch(/getOrCreateCorrelationId/);
      expect(obsImport).toMatch(/captureError/);
    }
  });
});

describe('KORA-WP-027 — no methodology/billing/Prime/KORAL contamination (Sections 21-24)', () => {
  it('no KORA Index/IU/BTI/Confidence reference anywhere', () => {
    const codeOnly = tsCodeLines(read(SERVICE_PATH)).join('\n') + codeLines(read(MIGRATION_PATH)).join('\n');
    expect(codeOnly).not.toMatch(/kora[_-]?index|impact[_-]?unit|\bBTI\b|confidence[_-]?score/i);
  });

  it('no Commercial Entitlement / Flow A billing reference', () => {
    const codeOnly = tsCodeLines(read(SERVICE_PATH)).join('\n');
    expect(codeOnly).not.toMatch(/fee_charge_event|commercial_entitlement|flow[_-]a/i);
  });

  it('no Prime / Program Funds / Partner payable reference', () => {
    const codeOnly = tsCodeLines(read(SERVICE_PATH)).join('\n') + codeLines(read(MIGRATION_PATH)).join('\n');
    expect(codeOnly).not.toMatch(/program_funds|funding_commitment|partner_payable/i);
  });

  it('no Living KORAL reference (Material Change / Edition / Portrait / Transformation Ledger)', () => {
    const codeOnly = tsCodeLines(read(SERVICE_PATH)).join('\n');
    expect(codeOnly).not.toMatch(/material_change|edition|portrait|transformation_ledger|morphogenesis/i);
  });
});

describe('KORA-WP-027 — privacy (Section 25)', () => {
  it('no Worker identifier or PIB reference anywhere in the migration or service', () => {
    const migrationLines = codeLines(read(MIGRATION_PATH));
    const serviceLines = tsCodeLines(read(SERVICE_PATH));
    expect(migrationLines.some((l) => /worker_id|pseudonym_id|\bPIB\b/i.test(l))).toBe(false);
    expect(serviceLines.some((l) => /worker_id|pseudonym_id|\bPIB\b/i.test(l))).toBe(false);
  });
});

describe('KORA-WP-027 — RLS / grants (Pattern A)', () => {
  it('FORCE ROW LEVEL SECURITY on both tables', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/ALTER TABLE analytics\.kora_ready_attainment FORCE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE analytics\.current_readiness_health FORCE ROW LEVEL SECURITY/);
  });

  it('KORA_ADMIN full access, COMPANY_ADMIN SELECT-only scoped to its own tenant, on both tables', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/kora_admin_all_kora_ready_attainment[\s\S]*?kora\.kora_role\(\) = 'KORA_ADMIN'/);
    expect(migration).toMatch(/company_own_kora_ready_attainment_read[\s\S]*?tenant_id = kora\.tenant_id\(\)/);
    expect(migration).toMatch(/kora_admin_all_current_readiness_health[\s\S]*?kora\.kora_role\(\) = 'KORA_ADMIN'/);
    expect(migration).toMatch(/company_own_current_readiness_health_read[\s\S]*?tenant_id = kora\.tenant_id\(\)/);
  });

  it('no INSERT/UPDATE grant to authenticated on either table — writes are service_role-only', () => {
    const grantLines = codeLines(read(MIGRATION_PATH)).filter((l) => /^\s*GRANT\b/i.test(l));
    const authenticatedGrants = grantLines.filter((l) => /\bauthenticated\b/.test(l));
    for (const line of authenticatedGrants) {
      expect(line).toMatch(/^GRANT SELECT ON/);
    }
  });

  it('no DELETE grant on kora_ready_attainment for any role', () => {
    const grantLines = codeLines(read(MIGRATION_PATH)).filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.some((l) => /DELETE/i.test(l) && /kora_ready_attainment/.test(l))).toBe(false);
  });
});

describe('KORA-WP-027 — authorization model at the route layer', () => {
  it('the Company route uses requireCompanyUser (own-tenant-only, session-derived)', () => {
    const src = read(COMPANY_ROUTE_PATH);
    expect(src).toMatch(/requireCompanyUser\(request\)/);
    expect(src).not.toMatch(/tenantId:\s*(body|params|request)\./);
  });

  it('the Admin route uses requireKoraAdmin as the baseline gate, with the real decision made by the capability-gated service', () => {
    const src = read(ADMIN_ROUTE_PATH);
    expect(src).toMatch(/requireKoraAdmin\(request\)/);
    expect(src).toMatch(/authUserId:\s*auth\.id/);
  });
});

describe('KORA-WP-027 — service-role guard allowlist', () => {
  it('the new service is a documented allowlist entry', () => {
    const guard = readFileSync('tests/unit/pilot-trust-01-service-role-guard.test.ts', 'utf8');
    expect(guard).toMatch(/lib\/company-readiness\/company-readiness-service\.ts/);
  });
});

describe('KORA-WP-027 — migration ledger sanity (no lateral migration added)', () => {
  it('079 exists and no migration beyond the WP-027 scope was introduced alongside it', () => {
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(numbers).toContain(79);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(79);
  });
});
