/**
 * KORA-WP-023 — Core Decision Linkage (Resource ↔ Commitment ↔ Evidence
 * Plan ↔ Review), excluding Program entirely.
 *
 * Behavioral tests of lib/decision-linkage/decision-linkage-service.ts,
 * with the Supabase query boundary mocked as a projection over the same
 * underlying rows WP-015/020/021/022 already create — this file never
 * invents a second source of truth. Real-DB proof that the actual Postgres
 * VIEW (migration 069) correctly joins/derives from live
 * commitment/evidence_plan/commitment_resource_reference/
 * commitment_mvb_manifest rows, respects RLS via security_invoker, and
 * introduces no new write surface lives in this WP's own real-DB
 * validation (see the implementation report) — a mock cannot prove real
 * Postgres view/RLS behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface TraceRow {
  commitment_id: string;
  tenant_id: string;
  commitment_status: string;
  evidence_plan_id: string | null;
  evidence_plan_status: string | null;
  resource_allocation_entry_ids: string[] | null;
  mvb_manifest_id: string | null;
  review_id: null;
}

let traceRows: TraceRow[] = [];

function applyFilters(rows: TraceRow[], filters: Record<string, unknown>): TraceRow[] {
  return rows.filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
}

function makeChain(filters: Record<string, unknown> = {}) {
  return {
    eq(col: string, val: unknown) { return makeChain({ ...filters, [col]: val }); },
    maybeSingle: async () => {
      const matched = applyFilters(traceRows, filters);
      if (matched.length !== 1) return { data: null, error: null };
      return { data: { ...matched[0] }, error: null };
    },
    then(resolve: (v: { data: unknown[]; error: null }) => void) {
      resolve({ data: applyFilters(traceRows, filters).map((r) => ({ ...r })), error: null });
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName !== 'analytics' || table !== 'commitment_decision_trace') {
          throw new Error(`unexpected schema/table in WP-023 mock: ${schemaName}.${table}`);
        }
        return { select: () => makeChain() };
      },
    }),
  }),
}));

let getDecisionTrace: typeof import('@/lib/decision-linkage/decision-linkage-service').getDecisionTrace;
let listDecisionTracesForTenant: typeof import('@/lib/decision-linkage/decision-linkage-service').listDecisionTracesForTenant;
let getResourceAllocationEntryIdsForCommitment: typeof import('@/lib/decision-linkage/decision-linkage-service').getResourceAllocationEntryIdsForCommitment;
let getEvidencePlanIdForCommitment: typeof import('@/lib/decision-linkage/decision-linkage-service').getEvidencePlanIdForCommitment;

const TENANT = 'tenant-1';
const OTHER_TENANT = 'tenant-2';

beforeEach(async () => {
  traceRows = [
    {
      commitment_id: 'cm-1', tenant_id: TENANT, commitment_status: 'committed',
      evidence_plan_id: 'ep-1', evidence_plan_status: 'frozen-at-commit',
      resource_allocation_entry_ids: ['ra-1', 'ra-2'], mvb_manifest_id: 'mvb-1', review_id: null,
    },
    {
      commitment_id: 'cm-2', tenant_id: TENANT, commitment_status: 'draft',
      evidence_plan_id: null, evidence_plan_status: null,
      resource_allocation_entry_ids: [], mvb_manifest_id: null, review_id: null,
    },
    {
      commitment_id: 'cm-3', tenant_id: OTHER_TENANT, commitment_status: 'committed',
      evidence_plan_id: 'ep-3', evidence_plan_status: 'frozen-at-commit',
      resource_allocation_entry_ids: ['ra-3'], mvb_manifest_id: 'mvb-3', review_id: null,
    },
  ];
  ({
    getDecisionTrace, listDecisionTracesForTenant,
    getResourceAllocationEntryIdsForCommitment, getEvidencePlanIdForCommitment,
  } = await import('@/lib/decision-linkage/decision-linkage-service'));
});

describe('KORA-WP-023 — getDecisionTrace()', () => {
  it('returns the full trace for a committed Commitment', async () => {
    const trace = await getDecisionTrace('cm-1', TENANT);
    expect(trace).toEqual({
      commitmentId: 'cm-1', tenantId: TENANT, commitmentStatus: 'committed',
      evidencePlanId: 'ep-1', evidencePlanStatus: 'frozen-at-commit',
      resourceAllocationEntryIds: ['ra-1', 'ra-2'], mvbManifestId: 'mvb-1', reviewId: null,
    });
  });

  it('returns a trace for a still-draft Commitment with empty/null fields, never fabricated', async () => {
    const trace = await getDecisionTrace('cm-2', TENANT);
    expect(trace!.evidencePlanId).toBeNull();
    expect(trace!.resourceAllocationEntryIds).toEqual([]);
    expect(trace!.mvbManifestId).toBeNull();
  });

  it('reviewId is always null — KORA-WP-024 does not exist yet', async () => {
    const trace = await getDecisionTrace('cm-1', TENANT);
    expect(trace!.reviewId).toBeNull();
  });

  it('returns null for a commitment under the wrong tenant (cross-tenant denial)', async () => {
    expect(await getDecisionTrace('cm-3', TENANT)).toBeNull();
  });

  it('returns null for a non-existent commitment', async () => {
    expect(await getDecisionTrace('nope', TENANT)).toBeNull();
  });
});

describe('KORA-WP-023 — listDecisionTracesForTenant()', () => {
  it('returns only that tenant\'s traces', async () => {
    const list = await listDecisionTracesForTenant(TENANT);
    expect(list).toHaveLength(2);
    expect(list.map((t) => t.commitmentId).sort()).toEqual(['cm-1', 'cm-2']);
  });
});

describe('KORA-WP-023 — named domain reads', () => {
  it('getResourceAllocationEntryIdsForCommitment — "which allocations support this Commitment?"', async () => {
    expect(await getResourceAllocationEntryIdsForCommitment('cm-1', TENANT)).toEqual(['ra-1', 'ra-2']);
    expect(await getResourceAllocationEntryIdsForCommitment('cm-2', TENANT)).toEqual([]);
  });

  it('getEvidencePlanIdForCommitment — "which Evidence Plan lineage governs it?"', async () => {
    expect(await getEvidencePlanIdForCommitment('cm-1', TENANT)).toBe('ep-1');
    expect(await getEvidencePlanIdForCommitment('cm-2', TENANT)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-023 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/decision-linkage/decision-linkage-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/069_core_decision_linkage.sql'), 'utf-8');
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no write function exists — pure read-only traceability layer', () => {
    expect(src).not.toMatch(/export async function create|export async function update|export async function delete|export async function insert/i);
  });

  it('no Program, Need/Opportunity, or KORA Index/IU/Confidence/BTI/KPI reference', () => {
    expect(codeOnly).not.toMatch(/program_id|program_definition|opportunity|need_hypothesis|kora.?index|confidence.?score|\bIU\b|kpi|\bbti\b/i);
  });

  it('no Review row/status/verdict fabricated — reviewId is a hardcoded null in code, not derived from a fake table', () => {
    expect(codeOnly).not.toMatch(/review.?(status|verdict|conclude|event)/i);
  });

  it('no Worker-level reference anywhere', () => {
    expect(codeOnly).not.toMatch(/worker_id|workerId|worker_ref/i);
    expect(migrationSrc).not.toMatch(/worker_id|worker_ref/i);
  });

  it('no Living KORAL anticipation', () => {
    expect(codeOnly).not.toMatch(/living.?koral|material.?change|morpholog/i);
  });

  it('migration creates a view, not a table — no independent/duplicated storage', () => {
    expect(migrationSrc).toMatch(/CREATE OR REPLACE VIEW analytics\.commitment_decision_trace/);
    expect(migrationSrc).not.toMatch(/CREATE TABLE/);
  });

  it('the view is security_invoker — defers to the underlying tables\' own RLS, no independent policy', () => {
    expect(migrationSrc).toMatch(/WITH \(security_invoker = true\)/);
    expect(migrationSrc).not.toMatch(/CREATE POLICY/);
  });

  it('review_id is a literal NULL, never joined to a fabricated table', () => {
    expect(migrationSrc).toMatch(/NULL::uuid\s+AS review_id/);
  });

  it('grants SELECT only, to service_role and authenticated only — no PUBLIC, no anon, no write grant', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT ON analytics\.commitment_decision_trace TO service_role, authenticated;/);
    expect(migrationSrc).not.toMatch(/GRANT.*(INSERT|UPDATE|DELETE).*ON analytics\.commitment_decision_trace/);
    expect(migrationSrc).not.toMatch(/TO (PUBLIC|anon)\b/);
  });

  it('never touches analytics.resource_allocation balances — read-only reference, no ledger mutation', () => {
    expect(migrationSrc).not.toMatch(/UPDATE analytics\.resource_allocation|INSERT INTO analytics\.resource_allocation/);
  });
});
