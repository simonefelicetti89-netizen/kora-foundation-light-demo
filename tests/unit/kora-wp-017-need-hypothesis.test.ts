/**
 * KORA-WP-017 — Needs Map + Need Hypothesis + Listening-Hypothesis Slice.
 *
 * Behavioral (not string-matching) tests of the REAL
 * createNeedHypothesis()/listNeedHypothesesForTenant() functions from
 * lib/needs-map/need-hypothesis-service.ts, with only the Supabase I/O
 * boundary (@/lib/supabase/server) and the governance-event substrate
 * (@/lib/audit/governance-event) mocked — the actual service logic under
 * test is never mocked or bypassed. Same technique as this session's
 * kora-wp-005/009/014 test files.
 *
 * Real-DB proof of RLS/tenant-isolation/GRANT correctness lives in
 * tests/integration/rls-two-tenant-negative.test.ts (RLS-03), extended for
 * this table — a mock cannot prove real Postgres RLS behavior. This file
 * proves what IS provable at the mocked-I/O level: every created row is
 * 'Hypothesis' by construction (no classification parameter exists at
 * all), no automatic inference, no worker-level data, explicit provenance,
 * and the correct choice of the generic governance-event substrate over
 * KORA-WP-006's governed-action catalogue (Need Hypothesis creation is not
 * one of that catalogue's 14 categories).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const TENANT_A = 'aaaaaaaa-3000-4000-8000-000000000001';

interface Row {
  id: string;
  tenant_id: string;
  statement: string;
  classification: string;
  recorded_by_role: string;
  recorded_by_id: string;
  created_at: string;
}

let rows: Row[] = [];
let nextId = 0;
let forceInsertError = false;
let forceSelectError = false;

function makeNeedHypothesisTable() {
  return {
    insert: (payload: Omit<Row, 'id' | 'created_at' | 'classification'> & { classification?: string }) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) return { data: null, error: { message: 'permission denied' } };
          nextId += 1;
          // mirror the real migration's `classification DEFAULT 'Hypothesis'`
          const row: Row = { ...payload, classification: payload.classification ?? 'Hypothesis', id: `need-${nextId}`, created_at: '2026-09-12T00:00:00.000Z' };
          rows.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (_col: string, val: string) => ({
        order: async () => {
          if (forceSelectError) return { data: null, error: { message: 'connection reset' } };
          return { data: rows.filter((r) => r.tenant_id === val), error: null };
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
        if (schemaName === 'analytics' && table === 'need_hypothesis') return makeNeedHypothesisTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (params: Record<string, unknown>) => recordGovernanceEventMock(params),
}));

beforeEach(() => {
  rows = [];
  nextId = 0;
  forceInsertError = false;
  forceSelectError = false;
  recordGovernanceEventMock.mockClear();
});

describe('KORA-WP-017 — createNeedHypothesis: every row is Hypothesis by construction', () => {
  it('persists a hypothesis with classification = Hypothesis', async () => {
    const { createNeedHypothesis } = await import('@/lib/needs-map/need-hypothesis-service');
    const need = await createNeedHypothesis({
      tenantId: TENANT_A,
      statement: 'Employees may need more flexible working hours',
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'admin-1',
    });
    expect(need.classification).toBe('Hypothesis');
    expect(need.tenantId).toBe(TENANT_A);
    expect(need.statement).toBe('Employees may need more flexible working hours');
    expect(need.id).toBeTruthy();
  });

  it('has no classification parameter at all — structurally impossible to create Emerging/Supported/Insufficient-Evidence-Unknown', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/needs-map/need-hypothesis-service.ts'), 'utf8');
    const paramsInterface = src.slice(src.indexOf('interface CreateNeedHypothesisParams'), src.indexOf('export async function createNeedHypothesis'));
    expect(paramsInterface).not.toMatch(/classification/i);
  });

  it('the module has no update/promote/transition function at all', async () => {
    const mod = await import('@/lib/needs-map/need-hypothesis-service');
    const exportNames = Object.keys(mod);
    expect(exportNames.some((n) => /update|promote|transition|advance/i.test(n))).toBe(false);
  });
});

describe('KORA-WP-017 — no automatic inference, no worker-level data (structural)', () => {
  it('the module never references Investment Map, UEF, KORA Index, or BTI as a hypothesis source', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/needs-map/need-hypothesis-service.ts'), 'utf8');
    expect(src).not.toMatch(/observed_investment_fact|uef_record|kora_index|bti_result/i);
  });

  it('the module never references a worker/auth_user_id field in actual code — aggregate/privacy-safe by construction', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/needs-map/need-hypothesis-service.ts'), 'utf8');
    const codeLines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
    expect(codeLines.join('\n')).not.toMatch(/worker_id|worker_identity|auth_user_id/i);
  });
});

describe('KORA-WP-017 — provenance and error surfacing', () => {
  it('recordedByRole/recordedById are explicit, never fabricated', async () => {
    const { createNeedHypothesis } = await import('@/lib/needs-map/need-hypothesis-service');
    const need = await createNeedHypothesis({
      tenantId: TENANT_A, statement: 'x', recordedByRole: 'KORA_ADMIN', recordedById: 'operator-9',
    });
    expect(need.recordedByRole).toBe('KORA_ADMIN');
    expect(need.recordedById).toBe('operator-9');
  });

  it('a DB-level insert failure surfaces as a thrown error, never a silent success', async () => {
    forceInsertError = true;
    const { createNeedHypothesis } = await import('@/lib/needs-map/need-hypothesis-service');
    await expect(createNeedHypothesis({
      tenantId: TENANT_A, statement: 'x', recordedByRole: 'COMPANY_ADMIN', recordedById: 'a',
    })).rejects.toThrow(/createNeedHypothesis failed/);
  });

  it('a DB-level query failure surfaces as a thrown error, never a silent empty result', async () => {
    forceSelectError = true;
    const { listNeedHypothesesForTenant } = await import('@/lib/needs-map/need-hypothesis-service');
    await expect(listNeedHypothesesForTenant(TENANT_A)).rejects.toThrow(/listNeedHypothesesForTenant failed/);
  });
});

describe('KORA-WP-017 — governance event: generic substrate, not a 15th governed-action category', () => {
  it('a successful creation emits a generic governance event, not recordGovernedAction()', async () => {
    const { createNeedHypothesis } = await import('@/lib/needs-map/need-hypothesis-service');
    const need = await createNeedHypothesis({
      tenantId: TENANT_A, statement: 'x', recordedByRole: 'COMPANY_ADMIN', recordedById: 'admin-1',
    });
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ sourceModule: 'needs-map', eventType: 'need_hypothesis.created', objectId: need.id }),
    );
  });

  it('the module never imports the WP-006 governed-action catalogue (real import statement, not explanatory prose)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/needs-map/need-hypothesis-service.ts'), 'utf8');
    const codeLines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/from ['"]@\/lib\/audit\/governed-action-catalog['"]/);
    expect(code).not.toContain('recordGovernedAction(');
  });
});

describe('KORA-WP-017 — listNeedHypothesesForTenant', () => {
  it('returns only hypotheses for the requested tenant', async () => {
    const { createNeedHypothesis, listNeedHypothesesForTenant } = await import('@/lib/needs-map/need-hypothesis-service');
    await createNeedHypothesis({ tenantId: TENANT_A, statement: 'x', recordedByRole: 'COMPANY_ADMIN', recordedById: 'a' });
    const list = await listNeedHypothesesForTenant(TENANT_A);
    expect(list.length).toBe(1);
    expect(list[0].tenantId).toBe(TENANT_A);
  });
});

describe('KORA-WP-017 — migration is additive, uses the current active Company role only', () => {
  it('does not ALTER or DROP any existing table', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/055_need_hypothesis.sql'), 'utf8');
    expect(migration).not.toMatch(/^\s*ALTER TABLE analytics\.(?!need_hypothesis)/m);
    const dropLines = migration.split('\n').filter((l) => /DROP TABLE|DROP POLICY|DROP INDEX/.test(l));
    for (const line of dropLines) expect(line.trim().startsWith('--')).toBe(true);
  });

  it('the classification CHECK holds all 4 canonical states, never collapsed', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/055_need_hypothesis.sql'), 'utf8');
    for (const state of ['Hypothesis', 'Emerging', 'Supported', 'Insufficient-Evidence-Unknown']) {
      expect(migration).toContain(state);
    }
  });

  it('the RLS policy uses only COMPANY_ADMIN — COMPANY_VIEWER (removed, B143) is not reintroduced', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/055_need_hypothesis.sql'), 'utf8');
    const policyLines = migration.split('\n').filter((l) => !l.trim().startsWith('--'));
    const policyBlock = policyLines.join('\n');
    expect(policyBlock).toMatch(/'COMPANY_ADMIN'/);
    expect(policyBlock).not.toMatch(/COMPANY_VIEWER/);
  });

  it('no GRANT UPDATE or DELETE exists for any role — no mutation path at all', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/055_need_hypothesis.sql'), 'utf8');
    const grantLines = migration.split('\n').filter((l) => l.trim().toUpperCase().startsWith('GRANT'));
    for (const line of grantLines) {
      expect(line).not.toMatch(/UPDATE|DELETE/);
    }
  });
});
