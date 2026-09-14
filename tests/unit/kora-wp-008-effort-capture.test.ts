/**
 * KORA-WP-008 — ADMIN-020 Effort-Capture Mechanism.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/operations/effort-capture-service.ts, with only the Supabase I/O
 * boundary (@/lib/supabase/server) mocked — the actual service logic
 * under test is never mocked or bypassed. Same technique as this
 * engagement's own kora-wp-004/007 test files.
 *
 * Real-DB proof of RLS/grant/append-only-trigger correctness for
 * migration 063 lives in this WP's own real-DB validation (see report
 * 134) — a mock cannot prove real Postgres RLS/trigger behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORKLOAD_ACTIVITY_CATEGORIES } from '@/lib/operations/effort-capture-service';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — vocabulary (doc 92 §10, verbatim)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-008 — vocabulary', () => {
  it('exposes exactly the ten canonical activity categories, doc 92 §10, verbatim', () => {
    expect(WORKLOAD_ACTIVITY_CATEGORIES).toEqual([
      'kickoff',
      'onboarding_assistance',
      'data_quality_exception',
      'advisor_preparation',
      'advisor_call',
      'advisor_follow_up',
      'review_support',
      'certification_validation',
      'privacy_support_exception',
      'admin_governance_activity',
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — service: mocked Supabase
// ═══════════════════════════════════════════════════════════════════════════

interface WorkloadRow {
  id: string; activity_category: string; actor_role: string; actor_id: string;
  effort_minutes: number; tenant_id: string | null; object_type: string | null;
  object_id: string | null; occurred_at: string;
}

let rows: WorkloadRow[] = [];
let idCounter = 0;

function makeChain(filters: Record<string, unknown> = {}) {
  const applyFilters = (rs: WorkloadRow[]) =>
    rs.filter((r) => Object.entries(filters).every(([k, v]) => {
      if (k === '__gte_occurred_at') return r.occurred_at >= (v as string);
      if (k === '__lte_occurred_at') return r.occurred_at <= (v as string);
      return (r as unknown as Record<string, unknown>)[k] === v;
    }));

  return {
    eq(col: string, val: unknown) { return makeChain({ ...filters, [col]: val }); },
    gte(col: string, val: unknown) { return makeChain({ ...filters, [`__gte_${col}`]: val }); },
    lte(col: string, val: unknown) { return makeChain({ ...filters, [`__lte_${col}`]: val }); },
    then(resolve: (v: { data: WorkloadRow[]; error: null }) => void) {
      resolve({ data: applyFilters(rows), error: null });
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'gov' && table === 'workload_event') {
          return {
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  idCounter += 1;
                  const row: WorkloadRow = {
                    id: `wl-${idCounter}`,
                    activity_category: payload.activity_category as string,
                    actor_role: payload.actor_role as string,
                    actor_id: payload.actor_id as string,
                    effort_minutes: payload.effort_minutes as number,
                    tenant_id: (payload.tenant_id as string | null) ?? null,
                    object_type: (payload.object_type as string | null) ?? null,
                    object_id: (payload.object_id as string | null) ?? null,
                    occurred_at: new Date().toISOString(),
                  };
                  rows.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            select: () => makeChain(),
          };
        }
        throw new Error(`unexpected schema/table in WP-008 mock: ${schemaName}.${table}`);
      },
    }),
  }),
}));

let captureEffort: typeof import('@/lib/operations/effort-capture-service').captureEffort;
let getAggregateEffortByCategory: typeof import('@/lib/operations/effort-capture-service').getAggregateEffortByCategory;

beforeEach(async () => {
  rows = [];
  idCounter = 0;
  ({ captureEffort, getAggregateEffortByCategory } = await import('@/lib/operations/effort-capture-service'));
});

describe('KORA-WP-008 — captureEffort()', () => {
  it('records a valid effort event', async () => {
    const result = await captureEffort({
      activityCategory: 'advisor_call', actorRole: 'ADVISOR', actorId: 'adv-1', effortMinutes: 45,
    });
    expect(result.activityCategory).toBe('advisor_call');
    expect(result.effortMinutes).toBe(45);
  });

  it('rejects an unrecognized activity category', async () => {
    await expect(captureEffort({
      // @ts-expect-error — deliberately invalid category
      activityCategory: 'worker_productivity_check', actorRole: 'ADVISOR', actorId: 'adv-1', effortMinutes: 30,
    })).rejects.toThrow(/not a canonical activity category/);
  });

  it('rejects a missing actor', async () => {
    await expect(captureEffort({
      activityCategory: 'kickoff', actorRole: '', actorId: '', effortMinutes: 20,
    })).rejects.toThrow(/actorRole and actorId are required/);
  });

  it('rejects a zero or negative effort value', async () => {
    await expect(captureEffort({
      activityCategory: 'review_support', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 0,
    })).rejects.toThrow(/positive integer/);
    await expect(captureEffort({
      activityCategory: 'review_support', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: -10,
    })).rejects.toThrow(/positive integer/);
  });

  it('rejects a non-integer effort value', async () => {
    await expect(captureEffort({
      activityCategory: 'review_support', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 12.5,
    })).rejects.toThrow(/positive integer/);
  });

  it('rejects objectType/objectId supplied without the other', async () => {
    await expect(captureEffort({
      activityCategory: 'data_quality_exception', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 15, objectType: 'case',
    })).rejects.toThrow(/must be provided together/);
  });

  it('accepts an optional tenant and object reference', async () => {
    const result = await captureEffort({
      activityCategory: 'onboarding_assistance', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 25,
      tenantId: 'tenant-1', objectType: 'operational_case', objectId: 'case-1',
    });
    expect(result.tenantId).toBe('tenant-1');
    expect(result.objectType).toBe('operational_case');
    expect(result.objectId).toBe('case-1');
  });
});

describe('KORA-WP-008 — getAggregateEffortByCategory() — Acceptance Test F (doc 97)', () => {
  it('45 + 60 minutes of Advisor activity aggregates to 105 minutes, not 2 separate events', async () => {
    await captureEffort({ activityCategory: 'advisor_call', actorRole: 'ADVISOR', actorId: 'adv-1', effortMinutes: 45 });
    await captureEffort({ activityCategory: 'advisor_call', actorRole: 'ADVISOR', actorId: 'adv-2', effortMinutes: 60 });

    const aggregates = await getAggregateEffortByCategory();
    const advisorCallAgg = aggregates.find((a) => a.activityCategory === 'advisor_call');

    expect(advisorCallAgg).toBeDefined();
    expect(advisorCallAgg!.totalMinutes).toBe(105);
    expect(advisorCallAgg!.eventCount).toBe(2);
  });

  it('never exposes actor_id or any per-actor breakdown in its output', async () => {
    await captureEffort({ activityCategory: 'kickoff', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 30 });
    const aggregates = await getAggregateEffortByCategory();
    const serialized = JSON.stringify(aggregates);
    expect(serialized).not.toMatch(/actor_id|actorId|admin-1/);
  });

  it('aggregates independently per activity category — no cross-category bleed', async () => {
    await captureEffort({ activityCategory: 'kickoff', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 20 });
    await captureEffort({ activityCategory: 'review_support', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 50 });
    const aggregates = await getAggregateEffortByCategory();
    expect(aggregates.find((a) => a.activityCategory === 'kickoff')!.totalMinutes).toBe(20);
    expect(aggregates.find((a) => a.activityCategory === 'review_support')!.totalMinutes).toBe(50);
  });

  it('filters correctly by tenantId', async () => {
    await captureEffort({ activityCategory: 'onboarding_assistance', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 10, tenantId: 'tenant-A' });
    await captureEffort({ activityCategory: 'onboarding_assistance', actorRole: 'KORA_ADMIN', actorId: 'admin-1', effortMinutes: 40, tenantId: 'tenant-B' });
    const aggA = await getAggregateEffortByCategory({ tenantId: 'tenant-A' });
    expect(aggA.find((a) => a.activityCategory === 'onboarding_assistance')!.totalMinutes).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — scope integrity: no Worker tracking, no WP-015/038/040/075/111 anticipation
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-008 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/operations/effort-capture-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/063_admin_020_effort_capture.sql'), 'utf-8');
  // Comment-stripped views — both files' own comments correctly explain
  // what is deliberately NOT present ("no worker_id column exists", "no
  // individual-operator ranking exposed"), which would otherwise false-
  // positive a naive substring check. The real invariant is about code/DDL.
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const ddlOnly = migrationSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('no Worker-level field, reference, or productivity/ranking concept in actual code/DDL', () => {
    expect(codeOnly).not.toMatch(/worker_id|workerId|worker_ref|productivity|ranking|leaderboard/i);
    expect(ddlOnly).not.toMatch(/worker_id|worker_ref/i);
  });

  it('no update/delete/correction function exists — append-only by construction', () => {
    expect(src).not.toMatch(/export async function update|export async function delete|export async function correct/i);
  });

  it('no cost/cash/economic/ROI computation (KORA-WP-040 boundary)', () => {
    expect(src).not.toMatch(/cash|cost|roi|billing|invoice|currency|economic.?value/i);
  });

  it('no resource-allocation/conservation/position-enum logic (KORA-WP-015 boundary)', () => {
    expect(src).not.toMatch(/resource_allocation|conservation|position.?enum/i);
  });

  it('no capacity model/reporting/dashboard logic (KORA-WP-038/075 boundary)', () => {
    expect(src).not.toMatch(/capacity|dashboard|report(?!ed)/i);
  });

  it('no Living KORAL anticipation (KORA-WP-111+ boundary)', () => {
    expect(src).not.toMatch(/living.?koral|material.?change|morpholog/i);
  });

  it('the aggregate function never selects actor_id from the database', () => {
    // Only the raw insert path (captureEffort) ever writes actor_id; the
    // read path (getAggregateEffortByCategory) must never select it.
    const aggregateFnMatch = src.match(/export async function getAggregateEffortByCategory[\s\S]*?\n}/);
    expect(aggregateFnMatch).not.toBeNull();
    expect(aggregateFnMatch![0]).not.toMatch(/actor_id/);
  });

  it('migration grants no read policy to any session role — service_role only, INSERT+SELECT, no UPDATE/DELETE', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT ON gov\.workload_event TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT.*UPDATE.*ON gov\.workload_event/);
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON gov\.workload_event/);
    expect(migrationSrc).not.toMatch(/CREATE POLICY/);
    expect(migrationSrc).toMatch(/FORCE ROW LEVEL SECURITY/);
  });
});
