/**
 * KORA-WP-016 — Structured Spine + Normalized Data/Evidence Layer.
 *
 * Behavioral tests of the REAL createObservedInvestmentFact()/
 * listObservedInvestmentFactsForTenant()/validateSourceAttributes() functions,
 * with only the Supabase I/O boundary and the governance-event substrate
 * mocked — same technique as the KORA-WP-014 file this extends.
 *
 * SECOND DIFFERENTLY-SHAPED SOURCE (Founder-approved): the real, existing
 * intake role `IntakeFileRole = 'policy'` (lib/data-intake/file-role-detection.ts).
 * The fixture's VALUES are synthetic; its SHAPE and semantics are taken from
 * that file's own `policy` header signals — regolamento, normativa, diritto,
 * smart_working, coverage, copertura, uptake, eligible_population — and the
 * test asserts that derivation against the real source file rather than
 * asserting a hand-invented JSON object.
 *
 * Real-Postgres proof (migration applies, CHECK enforces, RLS/tenant isolation
 * unchanged, old and new row shapes both work) is the DB-backed gate's job; a
 * mock cannot prove it. This file proves what IS provable at mocked-I/O level.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
const MIGRATION = 'supabase/migrations/089_investment_source_attributes_flexible_edge.sql';

const TENANT_A = 'aaaaaaaa-1000-4000-8000-000000000001';
const TENANT_B = 'bbbbbbbb-1000-4000-8000-000000000002';

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
  source_attributes: Record<string, string | number | boolean | null>;
  commitment_ref: null;
  created_at: string;
}

let insertedRows: Row[] = [];
let nextId = 0;
let forceInsertError = false;

function makeTable() {
  return {
    insert: (payload: Omit<Row, 'id' | 'created_at'>) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) {
            return { data: null, error: { message: 'permission denied for table observed_investment_fact' } };
          }
          nextId += 1;
          const row: Row = { ...payload, id: `fact-${nextId}`, created_at: '2026-09-20T00:00:00.000Z' };
          insertedRows.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (_col: string, val: string) => ({
        order: async () => ({ data: insertedRows.filter((r) => r.tenant_id === val), error: null }),
      }),
    }),
  };
}

const recordGovernanceEventMock = vi.fn(async () => ({ id: 'event-1' }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'analytics' && table === 'observed_investment_fact') return makeTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: () => recordGovernanceEventMock(),
}));

beforeEach(() => {
  insertedRows = [];
  nextId = 0;
  forceInsertError = false;
  recordGovernanceEventMock.mockClear();
});

const svc = () => import('@/lib/investment-map/observed-investment-fact-service');

// ── The approved second source, derived from real intake semantics ──────────

/** Synthetic VALUES; SHAPE taken from the real `policy` intake role. */
const POLICY_SOURCE_ATTRIBUTES = {
  regolamento: 'REG-SW-2026-03',
  normativa: 'Accordo sindacale aziendale 2026',
  diritto: 'smart_working',
  coverage: 'dipendenti a tempo indeterminato',
  copertura: 0.87,
  uptake: 0.62,
  eligible_population: 420,
  policy_document: null,
} as const;

describe('KORA-WP-016 — the second source shape is derived from real KORA intake semantics', () => {
  it('every fixture key is a real `policy` header signal in lib/data-intake/file-role-detection.ts', () => {
    const src = read('lib/data-intake/file-role-detection.ts');
    const policyBlock = src.slice(src.indexOf('  policy: ['), src.indexOf(']', src.indexOf('  policy: [')));
    for (const key of Object.keys(POLICY_SOURCE_ATTRIBUTES)) {
      expect(policyBlock, `"${key}" must be a real policy header signal, not invented`).toContain(`'${key}'`);
    }
  });

  it('the policy shape is genuinely different from the typed spine — none of its keys is a spine column', async () => {
    const { SPINE_RESERVED_KEYS } = await svc();
    for (const key of Object.keys(POLICY_SOURCE_ATTRIBUTES)) {
      expect(SPINE_RESERVED_KEYS).not.toContain(key);
    }
  });
});

describe('KORA-WP-016 — schema generality: two differently-shaped sources, one spine', () => {
  it('the original WP-014 shape still persists unchanged, with an empty edge', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'user-1',
      purpose: 'Piattaforma benessere psicologico',
      amount: 24000,
      provider: 'Provider X',
      populationDescriptor: 'Tutti i dipendenti',
      reachSummary: 'Adesione 38%',
      evidenceSummary: 'Contratto fornitore',
    });
    expect(fact.amount).toBe(24000);
    expect(fact.provider).toBe('Provider X');
    expect(fact.unknownFields).toEqual([]);
    expect(fact.sourceAttributes).toEqual({});
  });

  it('the policy-shaped source persists with no amount and its own attributes', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: 'user-1',
      purpose: 'Policy smart working aziendale',
      sourceAttributes: { ...POLICY_SOURCE_ATTRIBUTES },
    });
    expect(fact.amount).toBeNull();
    expect(fact.provider).toBeNull();
    expect(fact.sourceAttributes).toEqual(POLICY_SOURCE_ATTRIBUTES);
  });

  it('both shapes coexist in one tenant and read back correctly — the spine is general', async () => {
    const { createObservedInvestmentFact, listObservedInvestmentFactsForTenant } = await svc();
    await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'spend', amount: 100,
    });
    await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'policy',
      sourceAttributes: { diritto: 'smart_working' },
    });
    const facts = await listObservedInvestmentFactsForTenant(TENANT_A);
    expect(facts).toHaveLength(2);
    expect(facts.filter((f) => Object.keys(f.sourceAttributes).length > 0)).toHaveLength(1);
  });

  it('tenant scoping is unaffected by the edge', async () => {
    const { createObservedInvestmentFact, listObservedInvestmentFactsForTenant } = await svc();
    await createObservedInvestmentFact({
      tenantId: TENANT_B, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      sourceAttributes: { diritto: 'smart_working' },
    });
    expect(await listObservedInvestmentFactsForTenant(TENANT_A)).toHaveLength(0);
    expect(await listObservedInvestmentFactsForTenant(TENANT_B)).toHaveLength(1);
  });
});

describe('KORA-WP-016 — the edge round-trips without semantic mutation', () => {
  it('string, number, boolean and null all survive persistence unchanged', async () => {
    const { createObservedInvestmentFact } = await svc();
    const attrs = { coverage: 'tutti', uptake: 0.62, diritto: true, policy_document: null };
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p', sourceAttributes: attrs,
    });
    expect(fact.sourceAttributes).toEqual(attrs);
    expect(typeof fact.sourceAttributes.uptake).toBe('number');
    expect(typeof fact.sourceAttributes.diritto).toBe('boolean');
    expect(fact.sourceAttributes.policy_document).toBeNull();
  });

  it('a null edge value is NOT converted into an Unknown spine field', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      amount: 500, provider: 'P', populationDescriptor: 'd', reachSummary: 'r', evidenceSummary: 'e',
      sourceAttributes: { policy_document: null },
    });
    expect(fact.unknownFields).toEqual([]);
    expect(fact.sourceAttributes).toEqual({ policy_document: null });
  });
});

describe('KORA-WP-016 — the edge can never replace, duplicate or override the spine', () => {
  it('rejects every canonical spine column name as an edge key', async () => {
    const { validateSourceAttributes, SPINE_RESERVED_KEYS } = await svc();
    for (const key of SPINE_RESERVED_KEYS) {
      expect(() => validateSourceAttributes({ [key]: 'x' }), `"${key}" must be refused`).toThrow(/canonical typed Investment field/);
    }
  });

  it('a conflicting override attempt fails the write outright — never a silent partial success', async () => {
    const { createObservedInvestmentFact } = await svc();
    await expect(createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      amount: 100,
      sourceAttributes: { amount: 999999 } as Record<string, number>,
    })).rejects.toThrow(/canonical typed Investment field/);
    expect(insertedRows).toHaveLength(0);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });

  it('rejects nested objects and arrays — a tabular cell is not a tree', async () => {
    const { validateSourceAttributes } = await svc();
    expect(() => validateSourceAttributes({ nested: { a: 1 } } as never)).toThrow(/nested objects and arrays/);
    expect(() => validateSourceAttributes({ list: [1, 2] } as never)).toThrow(/nested objects and arrays/);
  });

  it('rejects a non-object edge', async () => {
    const { validateSourceAttributes } = await svc();
    expect(() => validateSourceAttributes([] as never)).toThrow(/plain object/);
    expect(() => validateSourceAttributes(null as never)).toThrow(/plain object/);
    expect(() => validateSourceAttributes('x' as never)).toThrow(/plain object/);
  });

  it('an omitted edge is an empty object, never null', async () => {
    const { validateSourceAttributes } = await svc();
    expect(validateSourceAttributes(undefined)).toEqual({});
  });
});

describe('KORA-WP-016 — numeric values must be finite (JSON cannot carry NaN/Infinity)', () => {
  it('accepts a finite integer and a finite decimal', async () => {
    const { validateSourceAttributes } = await svc();
    expect(validateSourceAttributes({ eligible_population: 420, uptake: 0.62 })).toEqual({
      eligible_population: 420, uptake: 0.62,
    });
  });

  it('accepts the numeric extremes that ARE representable', async () => {
    const { validateSourceAttributes } = await svc();
    expect(() => validateSourceAttributes({ a: 0, b: -1, c: Number.MAX_SAFE_INTEGER })).not.toThrow();
  });

  it('rejects NaN', async () => {
    const { validateSourceAttributes } = await svc();
    expect(() => validateSourceAttributes({ uptake: NaN })).toThrow(/must be a finite number/);
  });

  it('rejects Infinity and -Infinity', async () => {
    const { validateSourceAttributes } = await svc();
    expect(() => validateSourceAttributes({ uptake: Infinity })).toThrow(/must be a finite number/);
    expect(() => validateSourceAttributes({ uptake: -Infinity })).toThrow(/must be a finite number/);
  });

  it('a non-finite value fails the whole write — no row, no governance event', async () => {
    const { createObservedInvestmentFact } = await svc();
    await expect(createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      sourceAttributes: { uptake: NaN },
    })).rejects.toThrow(/must be a finite number/);
    expect(insertedRows).toHaveLength(0);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });

  it('accepted numeric values round-trip unchanged through persistence', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      sourceAttributes: { eligible_population: 420, uptake: 0.62, zero: 0, negative: -3.5 },
    });
    expect(fact.sourceAttributes).toEqual({ eligible_population: 420, uptake: 0.62, zero: 0, negative: -3.5 });
  });

  it('every accepted value survives a JSON round-trip identically — TS validator and JSONB persistence agree', async () => {
    const { validateSourceAttributes } = await svc();
    const accepted = validateSourceAttributes({ ...POLICY_SOURCE_ATTRIBUTES });
    expect(JSON.parse(JSON.stringify(accepted))).toEqual(accepted);
  });

  it('the approved policy-shaped fixture remains valid after the finite-number guard', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u',
      purpose: 'Policy smart working aziendale', sourceAttributes: { ...POLICY_SOURCE_ATTRIBUTES },
    });
    expect(fact.sourceAttributes).toEqual(POLICY_SOURCE_ATTRIBUTES);
  });
});

describe('KORA-WP-016 — WP-014 invariants survive unchanged', () => {
  it('Unknown is still never coerced to 0/false/empty, with an edge present', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'Policy',
      sourceAttributes: { diritto: 'smart_working' },
    });
    expect(fact.amount).toBeNull();
    expect(fact.provider).toBeNull();
    expect(fact.populationDescriptor).toBeNull();
    expect(fact.reachSummary).toBeNull();
    expect(fact.evidenceSummary).toBeNull();
  });

  it('unknown_fields still names exactly the omitted SPINE fields — the edge does not enter it', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'Policy',
      amount: 1000,
      sourceAttributes: { coverage: 'tutti', uptake: 0.62 },
    });
    expect(fact.unknownFields).toEqual([
      'provider', 'population_descriptor', 'reach_summary', 'evidence_summary',
    ]);
    expect(fact.unknownFields).not.toContain('coverage');
    expect(fact.unknownFields).not.toContain('source_attributes');
  });

  it('provenance remains explicit and recoverable alongside the edge', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'KORA_ADMIN', recordedById: 'operator-7',
      sourceBatchId: 'cccccccc-1000-4000-8000-000000000003', purpose: 'Policy',
      sourceAttributes: { diritto: 'smart_working' },
    });
    expect(fact.recordedByRole).toBe('KORA_ADMIN');
    expect(fact.recordedById).toBe('operator-7');
    expect(fact.sourceBatchId).toBe('cccccccc-1000-4000-8000-000000000003');
  });

  it('commitmentRef stays structurally null for an edge-carrying fact', async () => {
    const { createObservedInvestmentFact } = await svc();
    const fact = await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      sourceAttributes: { diritto: 'smart_working' },
    });
    expect(fact.commitmentRef).toBeNull();
  });

  it('governance-event cardinality is unchanged: exactly one per success', async () => {
    const { createObservedInvestmentFact } = await svc();
    await createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      sourceAttributes: { diritto: 'smart_working' },
    });
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
  });

  it('a failed DB write with an edge still emits no governance event', async () => {
    const { createObservedInvestmentFact } = await svc();
    forceInsertError = true;
    await expect(createObservedInvestmentFact({
      tenantId: TENANT_A, recordedByRole: 'COMPANY_ADMIN', recordedById: 'u', purpose: 'p',
      sourceAttributes: { diritto: 'smart_working' },
    })).rejects.toThrow(/createObservedInvestmentFact failed/);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });
});

describe('KORA-WP-016 — service and database agree, and the migration is additive', () => {
  it('the TS reserved-key list is byte-identical to the migration CHECK list', async () => {
    const { SPINE_RESERVED_KEYS } = await svc();
    const sql = read(MIGRATION);
    const block = sql.slice(sql.indexOf("AND NOT (attrs ?| ARRAY["), sql.indexOf(']);'));
    const sqlKeys = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(sqlKeys).toEqual([...SPINE_RESERVED_KEYS]);
  });

  it('the migration is additive/expand-only — no DROP, no destructive ALTER', () => {
    const sql = read(MIGRATION)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|POLICY|CONSTRAINT)\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+analytics\./i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS source_attributes jsonb NOT NULL DEFAULT/);
  });

  it('the migration creates no new table and no new RLS policy or grant', () => {
    const sql = read(MIGRATION)
      .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(sql).not.toMatch(/CREATE TABLE/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/\bGRANT\b/i);
    expect(sql).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  it('source discrimination reuses the existing FK path, with no denormalized source_type column', () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/ADD COLUMN[^\n]*source_type/i);
    expect(sql).toContain('source_batch_id');
  });

  it('sibling models 055/064/065 are untouched by this WP', () => {
    for (const m of [
      'supabase/migrations/055_need_hypothesis.sql',
      'supabase/migrations/064_resource_allocation_ledger.sql',
      'supabase/migrations/065_commitment_draft.sql',
    ]) {
      expect(read(m)).not.toContain('source_attributes');
    }
  });
});
