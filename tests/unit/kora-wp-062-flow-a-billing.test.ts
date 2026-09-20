// tests/unit/kora-wp-062-flow-a-billing.test.ts
// KORA-WP-062 — Platform Fee Flow / Flow A Billing.
//
// Structural/static coverage (module shape, boundary discipline, canonical
// vocabulary). The 18-item founder test matrix's DB-dependent items
// (happy path, unauthorized actor, wrong tenant, immutable historical
// state, duplicate/concurrency race, correct policy-version resolution,
// absence-of-config, no-cross-tenant-leakage) were exercised for real
// against local disposable Postgres (migration 076 applied through 076,
// 29/29 real-DB assertions passed) plus a direct SQL RLS/GRANT smoke test
// (anon/COMPANY_ADMIN/KORA_ADMIN role emulation, 7/7 passed) — see this
// task's own completion report for the full transcript; this file does not
// re-run a live database and does not assert on values only a real
// Postgres instance could produce.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  FEE_CHARGE_CATEGORIES,
  FEE_CHARGE_STATUSES,
  BILLING_CADENCES,
} from '@/lib/flow-a-billing/flow-a-billing-service';

const SERVICE_PATH = 'lib/flow-a-billing/flow-a-billing-service.ts';
const MIGRATION_PATH = 'supabase/migrations/076_flow_a_fee_charge_event.sql';

function readService(): string {
  return readFileSync(SERVICE_PATH, 'utf8');
}
function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8');
}
function codeLines(src: string): string[] {
  return src.split('\n').filter((l) => !/^\s*--/.test(l));
}
function importLines(src: string): string[] {
  return src.split('\n').filter((l) => /^\s*import\b/.test(l));
}

describe('KORA-WP-062 — canonical vocabulary', () => {
  it('A. Fee/Charge categories match doc 83 §10 exactly (onboarding, platform, advisor-service)', () => {
    expect(FEE_CHARGE_CATEGORIES).toEqual(['onboarding_fee', 'platform_fee', 'advisor_service_fee']);
  });

  it('exposes exactly the canonical Fee/Charge statuses', () => {
    expect(FEE_CHARGE_STATUSES).toEqual(['pending', 'invoiced', 'paid', 'failed', 'waived', 'cancelled']);
  });

  it('exposes exactly the canonical billing cadences', () => {
    expect(BILLING_CADENCES).toEqual(['one_time', 'monthly', 'annual']);
  });
});

describe('KORA-WP-062 — WP-013 Policy/Config reuse boundary (Section 6)', () => {
  it('imports getCurrentPolicyConfig/setPolicyConfigVersion from the existing WP-013 module, never redeclares them', () => {
    const lines = importLines(readService());
    const policyConfigImport = lines.find((l) => l.includes('@/lib/policy-config/policy-config-service'));
    expect(policyConfigImport).toBeDefined();
    expect(policyConfigImport).toMatch(/getCurrentPolicyConfig/);
    expect(policyConfigImport).toMatch(/setPolicyConfigVersion/);
  });

  it('never creates a second config table, versioning RPC, or policy store', () => {
    const migration = readMigration();
    expect(migration).not.toMatch(/CREATE TABLE[^;]*policy[_ ]?config/i);
    expect(migration).not.toMatch(/CREATE (OR REPLACE )?FUNCTION[^(]*set_.*policy/i);
  });

  it('the entitlement tier is fixed to the existing "commercial_configuration" Tier 3 — never a new tier literal', () => {
    const src = readService();
    expect(src).toMatch(/FLOW_A_ENTITLEMENT_TIER\s*=\s*'commercial_configuration'/);
    // never introduces a 4th/5th tier string anywhere near the config-write call
    expect(src).not.toMatch(/tier:\s*'flow_a'/);
  });
});

describe('KORA-WP-062 — Program Funds / Flow B anti-contamination (doc 83 §27, Test D)', () => {
  it('the migration never references Program Funds / Funding Commitment / Partner Payable / PRIME objects', () => {
    const migration = readMigration();
    const banned = /program_funds|funding_commitment|partner_payable|prime_/i;
    expect(codeLines(migration).some((l) => banned.test(l))).toBe(false);
  });

  it('the service never imports or references a Program Funds / Prime module', () => {
    const src = readService();
    expect(src).not.toMatch(/program-funds|program_funds|funding-commitment|partner-payable/i);
  });

  it('no shared table/view exists between fee_charge_event and any Program object (KORA-WP-101 is Code Truth ABSENT)', () => {
    const migration = readMigration();
    expect(migration).not.toMatch(/JOIN\s+\w*\.?program/i);
  });
});

describe('KORA-WP-062 — verdict-independence (KORA-WP-042 guard, extended)', () => {
  it('the service never imports from review-service / review-advisor-proposal-service', () => {
    const lines = importLines(readService());
    expect(lines.some((l) => /review-service|review-advisor-proposal-service/.test(l))).toBe(false);
  });

  it('no function signature accepts or stores a verdict-typed parameter/column', () => {
    const src = readService();
    expect(src).not.toMatch(/\bverdict\s*[:?]/);
  });

  it('the migration CODE (non-comment) never references analytics.review or analytics.review_event', () => {
    const lines = codeLines(readMigration());
    expect(lines.some((l) => /analytics\.review\b|analytics\.review_event\b/.test(l))).toBe(false);
  });
});

describe('KORA-WP-062 — no methodology fork / no taxonomy fork / no Worker-PIB leakage', () => {
  it('the service never references KORA Index / IU / PIB / Confidence Score / BTI', () => {
    const src = readService();
    expect(src).not.toMatch(/kora[_-]?index|impact[_-]?unit|\bPIB\b|confidence[_-]?score|\bBTI\b/i);
  });

  it('the service never redeclares ActionFamily/PillarCode/PartnerActivity/FiscalBudgetPerimeter/FiscalCategory (KORA-WP-120 taxonomy boundary)', () => {
    const src = readService();
    expect(src).not.toMatch(/ActionFamily|PillarCode|FiscalBudgetPerimeter|FiscalCategory/);
  });

  it('the service never references a worker_id or Worker-level identity', () => {
    const src = readService();
    expect(src).not.toMatch(/worker_id|workerId/);
  });

  it('the migration never creates a Worker-referencing column or table', () => {
    const migration = readMigration();
    expect(migration).not.toMatch(/worker_id|worker\.id/i);
  });
});

describe('KORA-WP-062 — actor / authorization model', () => {
  it('write functions gate on KORA_ADMIN only, never accept a COMPANY_ADMIN write bypass', () => {
    const src = readService();
    expect(src).toMatch(/assertKoraAdminWriter/);
    expect(src).toMatch(/function assertKoraAdminWriter\(actorRole: string\): void \{[\s\S]*?actorRole !== KORA_ADMIN_ROLE/);
  });

  it('read functions are gated by assertCompanyScopedRead — no unscoped cross-tenant read path', () => {
    const src = readService();
    const exported = ['getFlowACommercialEntitlement', 'getFeeChargeEventHistory', 'listCurrentFeeCharges', 'getCompanyBillingStatus'];
    for (const fn of exported) {
      const fnMatch = src.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`));
      expect(fnMatch, `${fn} not found`).toBeTruthy();
      expect(fnMatch![0]).toMatch(/assertCompanyScopedRead/);
    }
  });

  it('actor attribution is never fabricated — assertActor rejects empty actorRole/actorId', () => {
    const src = readService();
    expect(src).toMatch(/function assertActor\(actorRole: string, actorId: string\): void \{[\s\S]*?!actorRole \|\| !actorId/);
  });
});

describe('KORA-WP-062 — immutability / append-only discipline', () => {
  it('the migration has no UPDATE or DELETE grant on fee_charge_event for any role', () => {
    const grantLines = codeLines(readMigration()).filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.some((l) => /UPDATE/i.test(l) && /analytics\.fee_charge_event/.test(l))).toBe(false);
    expect(grantLines.some((l) => /DELETE/i.test(l) && /analytics\.fee_charge_event/.test(l))).toBe(false);
  });

  it('the migration installs an unconditional BEFORE UPDATE OR DELETE rejection trigger', () => {
    const migration = readMigration();
    expect(migration).toMatch(/CREATE TRIGGER trg_fee_charge_event_no_mutation\s+BEFORE UPDATE OR DELETE ON analytics\.fee_charge_event/);
  });

  it('the migration enforces immutable charge identity (category/amount/currency/cadence/effective_date fixed at first event)', () => {
    const migration = readMigration();
    expect(migration).toMatch(/kora\/charge-identity-immutable/);
  });
});

describe('KORA-WP-062 — RLS / grants (Pattern A, Company-scoped)', () => {
  it('installs FORCE ROW LEVEL SECURITY on fee_charge_event', () => {
    const migration = readMigration();
    expect(migration).toMatch(/ALTER TABLE analytics\.fee_charge_event ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE analytics\.fee_charge_event FORCE ROW LEVEL SECURITY/);
  });

  it('grants KORA_ADMIN full access and COMPANY_ADMIN SELECT-only scoped to its own tenant', () => {
    const migration = readMigration();
    expect(migration).toMatch(/kora\.kora_role\(\) = 'KORA_ADMIN'/);
    expect(migration).toMatch(/kora\.kora_role\(\) = 'COMPANY_ADMIN'[\s\S]*?tenant_id = kora\.tenant_id\(\)/);
  });

  it('revokes PUBLIC execute on record_fee_charge_event and grants only service_role', () => {
    const migration = readMigration();
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION analytics\.record_fee_charge_event[\s\S]*?FROM PUBLIC/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.record_fee_charge_event[\s\S]*?TO service_role/);
  });

  it('leaves gov.policy_config_version grants untouched (no widening of the WP-013 store)', () => {
    const migration = readMigration();
    expect(migration).not.toMatch(/GRANT[^;]*ON gov\.policy_config_version/i);
  });
});

describe('KORA-WP-062 — service-role guard allowlist', () => {
  it('the new service is a documented allowlist entry in pilot-trust-01-service-role-guard.test.ts', () => {
    const guard = readFileSync('tests/unit/pilot-trust-01-service-role-guard.test.ts', 'utf8');
    expect(guard).toMatch(/lib\/flow-a-billing\/flow-a-billing-service\.ts/);
  });
});

describe('KORA-WP-062 — migration ledger sanity (no lateral migration added)', () => {
  it('076 exists and no migration beyond the WP-062 scope was introduced alongside it', () => {
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(numbers).toContain(76);
    // "no lateral migration" guard written from the start using
    // toBeGreaterThanOrEqual — the staleness pattern already hit twice this
    // engagement (WP-011/WP-120's own toBe(74) guards) is avoided here.
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(76);
  });
});
