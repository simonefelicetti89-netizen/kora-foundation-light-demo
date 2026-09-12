/**
 * KORA-WP-014 — Investment Map Core (Observed Investment Fact).
 *
 * Behavioral (not string-matching) tests of the REAL
 * createObservedInvestmentFact()/listObservedInvestmentFactsForTenant()
 * functions from lib/investment-map/observed-investment-fact-service.ts,
 * with only the Supabase I/O boundary (@/lib/supabase/server) and the
 * governance-event substrate (@/lib/audit/governance-event) mocked — the
 * actual service logic under test is never mocked or bypassed. Same
 * technique as this session's kora-wp-004/kora-wp-005 test files.
 *
 * Real-DB proof of RLS/tenant-isolation/GRANT correctness lives in
 * tests/integration/rls-two-tenant-negative.test.ts (RLS-03), extended for
 * this table — a mock cannot prove real Postgres RLS behavior. This file
 * proves what IS provable at the mocked-I/O level: correct persistence,
 * explicit provenance, Unknown-state fidelity (never coerced to 0/false/
 * empty), the structural absence of any Commitment/Resource Allocation/
 * Partner-promotion code path, and correct (generic, non-taxonomy-inventing)
 * governance-event emission.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const TENANT_A = 'aaaaaaaa-1000-4000-8000-000000000001';

interface Row {
  id: string;
  tenant_id: string;
  source_batch_id: string | null;
  recorded_by_role: string;
  recorded_by_id: string;
  purpose: string;
  amount: number | null;
  provider: string | null;
  population_descriptor: string | null;
  reach_summary: string | null;
  evidence_summary: string | null;
  unknown_fields: string[];
  commitment_ref: null;
  created_at: string;
}

let insertedRows: Row[] = [];
let nextId = 0;
let forceInsertError = false;
let forceSelectError = false;

function makeObservedInvestmentFactTable() {
  return {
    insert: (payload: Omit<Row, 'id' | 'created_at'>) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) {
            return { data: null, error: { message: 'permission denied for table observed_investment_fact' } };
          }
          nextId += 1;
          const row: Row = { ...payload, id: `fact-${nextId}`, created_at: '2026-09-12T00:00:00.000Z' };
          insertedRows.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (_col: string, val: string) => ({
        order: async () => {
          if (forceSelectError) {
            return { data: null, error: { message: 'connection reset' } };
          }
          return { data: insertedRows.filter((r) => r.tenant_id === val), error: null };
        },
      }),
    }),
  };
}

const recordGovernanceEventMock = vi.fn(async (params: Record<string, unknown>) => ({
  id: 'event-1',
  sourceModule: params.sourceModule,
  actorRole: params.actorRole,
  actorId: params.actorId,
  eventType: params.eventType,
  objectType: params.objectType ?? null,
  objectId: params.objectId ?? null,
  tenantId: params.tenantId ?? null,
  payload: params.payload ?? {},
  occurredAt: '2026-09-12T00:00:00.000Z',
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'analytics' && table === 'observed_investment_fact') return makeObservedInvestmentFactTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (params: Record<string, unknown>) => recordGovernanceEventMock(params),
}));

beforeEach(() => {
  insertedRows = [];
  nextId = 0;
  forceInsertError = false;
  forceSelectError = false;
  recordGovernanceEventMock.mockClear();
});

describe('KORA-WP-014 — createObservedInvestmentFact: persistence + explicit provenance', () => {
  it('persists a fact with all "if known" fields supplied', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'welfare service for eligible employees',
      amount: 40000,
      provider: 'Provider S.r.l.',
      populationDescriptor: 'eligible full-time employees',
      reachSummary: 'partial — 60% confirmed reached',
      evidenceSummary: 'partial — satisfaction survey only',
    });
    expect(fact.tenantId).toBe(TENANT_A);
    expect(fact.recordedByRole).toBe('COMPANY_ADMIN');
    expect(fact.recordedById).toBe('admin-1');
    expect(fact.purpose).toBe('welfare service for eligible employees');
    expect(fact.amount).toBe(40000);
    expect(fact.provider).toBe('Provider S.r.l.');
    expect(fact.unknownFields).toEqual([]); // every knowable field was supplied
    expect(fact.commitmentRef).toBeNull();
    expect(fact.id).toBeTruthy();
  });

  it('provenance (recordedByRole/recordedById/sourceBatchId) is explicit, never manufactured', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'KORA_ADMIN',
      recordedById: 'operator-9',
      purpose: 'imported from onboarding batch',
      sourceBatchId: 'batch-42',
    });
    expect(fact.recordedByRole).toBe('KORA_ADMIN');
    expect(fact.recordedById).toBe('operator-9');
    expect(fact.sourceBatchId).toBe('batch-42');
  });

  it('sourceBatchId is optional — a manually-entered fact has no batch provenance', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'manually entered historical spend',
    });
    expect(fact.sourceBatchId).toBeNull();
  });
});

describe('KORA-WP-014 — Unknown is a real state, never coerced to zero/false/empty', () => {
  it('omitted amount is persisted as null, never 0', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'welfare service, amount not yet known',
    });
    expect(fact.amount).toBeNull();
    expect(fact.amount).not.toBe(0);
  });

  it('omitted provider/population/reach/evidence are persisted as null, never guessed or empty-string', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'minimal fact',
    });
    expect(fact.provider).toBeNull();
    expect(fact.populationDescriptor).toBeNull();
    expect(fact.reachSummary).toBeNull();
    expect(fact.evidenceSummary).toBeNull();
    expect(fact.provider).not.toBe('');
    expect(fact.reachSummary).not.toBe('');
  });

  it('unknownFields correctly names every omitted "if known" column, and only those', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'partial fact',
      amount: 40000,
      provider: 'Known Provider',
      // populationDescriptor, reachSummary, evidenceSummary all omitted
    });
    expect(fact.unknownFields.sort()).toEqual(['evidence_summary', 'population_descriptor', 'reach_summary'].sort());
    expect(fact.unknownFields).not.toContain('amount');
    expect(fact.unknownFields).not.toContain('provider');
  });

  it('a genuinely complete fact has an empty unknownFields array — Unknown is not the default assumption', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'fully known fact',
      amount: 1000,
      provider: 'X',
      populationDescriptor: 'Y',
      reachSummary: 'Z',
      evidenceSummary: 'W',
    });
    expect(fact.unknownFields).toEqual([]);
  });
});

describe('KORA-WP-014 — domain invariant: no retroactive Commitment, no adjacent governance fabricated', () => {
  it('commitmentRef is always null and cannot be set via the create API (no such parameter exists)', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
      purpose: 'x',
      // @ts-expect-error commitmentRef is not part of CreateObservedInvestmentFactParams — structural proof
      commitmentRef: 'should-be-impossible',
    });
    expect(fact.commitmentRef).toBeNull();
  });

  it('the module contains no Resource Allocation, Program, Commitment, or Need-inference code (structural)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/investment-map/observed-investment-fact-service.ts'), 'utf8');
    expect(src).not.toMatch(/resource_allocation|createCommitment|createProgram|createNeed|need_hypothesis/i);
  });

  it('the module never touches the network schema — a free-text provider is never promoted to a Partner object', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/investment-map/observed-investment-fact-service.ts'), 'utf8');
    expect(src).not.toMatch(/\.schema\(['"]network['"]\)|partner_profile/i);
  });

  it('the module contains no Case/Audit/ADMIN-020-specific taxonomy (structural, matches KORA-WP-005\'s own out-of-scope discipline)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/investment-map/observed-investment-fact-service.ts'), 'utf8');
    expect(src).not.toMatch(/CASE_STATUS|TASK_STATUS|ADMIN_020_ACTIVITY/);
  });
});

describe('KORA-WP-014 — listObservedInvestmentFactsForTenant', () => {
  it('returns only facts for the requested tenant', async () => {
    const { createObservedInvestmentFact, listObservedInvestmentFactsForTenant } = await import(
      '@/lib/investment-map/observed-investment-fact-service'
    );
    await createObservedInvestmentFact({ tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'a', purpose: 'p1' });
    const facts = await listObservedInvestmentFactsForTenant(TENANT_A);
    expect(facts.length).toBe(1);
    expect(facts[0].tenantId).toBe(TENANT_A);
  });

  it('surfaces a DB-level query failure as a thrown error, never a silent empty result', async () => {
    forceSelectError = true;
    const { listObservedInvestmentFactsForTenant } = await import('@/lib/investment-map/observed-investment-fact-service');
    await expect(listObservedInvestmentFactsForTenant(TENANT_A)).rejects.toThrow(/listObservedInvestmentFactsForTenant failed/);
  });
});

describe('KORA-WP-014 — service errors surface correctly, no hidden fabrication', () => {
  it('a DB-level insert failure (e.g. a missing GRANT) surfaces as a thrown error, never a silent success', async () => {
    forceInsertError = true;
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    await expect(createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'a', purpose: 'x',
    })).rejects.toThrow(/createObservedInvestmentFact failed/);
  });
});

describe('KORA-WP-014 — governance event emission (generic, non-taxonomy-inventing)', () => {
  it('a successful creation emits exactly one generic governance event with correct provenance', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'admin-1', purpose: 'x', amount: 100,
    });
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
    const call = recordGovernanceEventMock.mock.calls[0][0];
    expect(call.sourceModule).toBe('investment-map');
    expect(call.actorRole).toBe('COMPANY_ADMIN');
    expect(call.actorId).toBe('admin-1');
    expect(call.eventType).toBe('observed_investment_fact.created');
    expect(call.objectType).toBe('observed_investment_fact');
    expect(call.objectId).toBe(fact.id);
    expect(call.tenantId).toBe(TENANT_A);
  });

  it('a failed creation never emits a governance event', async () => {
    forceInsertError = true;
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    await expect(createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'a', purpose: 'x',
    })).rejects.toThrow();
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });
});

describe('KORA-WP-014 — migration is additive, Company-scoped, does not anticipate later WPs', () => {
  it('does not ALTER or DROP any existing table', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/053_observed_investment_fact.sql'), 'utf8');
    expect(migration).not.toMatch(/^\s*ALTER TABLE analytics\.(?!observed_investment_fact)/m);
    const dropLines = migration.split('\n').filter((l) => /DROP TABLE|DROP POLICY|DROP INDEX/.test(l));
    for (const line of dropLines) {
      expect(line.trim().startsWith('--')).toBe(true); // only inside the commented rollback block
    }
  });

  it('commitment_ref has a CHECK forcing it NULL and carries no foreign key (no speculative FK to a nonexistent Commitment table)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/053_observed_investment_fact.sql'), 'utf8');
    const commitmentRefLine = migration.split('\n').find((l) => l.trim().startsWith('commitment_ref'));
    expect(commitmentRefLine).toBeDefined();
    expect(commitmentRefLine).toMatch(/CHECK\s*\(commitment_ref IS NULL\)/);
    expect(commitmentRefLine).not.toMatch(/REFERENCES/);
  });

  it('enables and forces RLS with a Pattern-A (tenant-claim-bound) company read policy, matching docs/RLS_COMPANY_SCOPED_PATTERN.md', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/053_observed_investment_fact.sql'), 'utf8');
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/FORCE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/tenant_id = kora\.tenant_id\(\)/);
  });

  it('does not create resource_allocation, commitment, program, need_hypothesis, or opportunity tables', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/053_observed_investment_fact.sql'), 'utf8');
    expect(migration).not.toMatch(/CREATE TABLE.*\b(resource_allocation|commitment|program|need_hypothesis|opportunity)\b/i);
  });
});
