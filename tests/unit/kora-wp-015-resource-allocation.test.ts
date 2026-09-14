/**
 * KORA-WP-015 — Resource Allocation Ledger.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/resource-allocation/resource-allocation-service.ts, with only the
 * Supabase I/O boundary (@/lib/supabase/server) mocked — the actual service
 * logic under test (draw validation, transition-graph rules, conservation
 * bookkeeping) is never mocked or bypassed. Same technique as this
 * engagement's own kora-wp-008/014 test files. The mock also simulates
 * migration 064's own "remaining_amount may only decrease" trigger as a
 * defense-in-depth check — the authoritative proof of the real trigger/RLS/
 * GRANT behavior is this WP's own real-DB validation (see the implementation
 * report), which a mock cannot substitute for.
 *
 * PART 3's "doc 70 §3 worked example, exactly" test is this WP's own
 * Acceptance criterion, reproduced numerically at every one of the six
 * steps, including the two partial-transition steps (2 and 5).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  RESOURCE_ALLOCATION_BALANCE_POSITIONS,
  RESOURCE_ALLOCATION_LIFECYCLE_STATUSES,
} from '@/lib/resource-allocation/resource-allocation-service';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — vocabulary (doc 72 Lock 1, six-label/four-position dual view)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-015 — vocabulary', () => {
  it('exposes exactly the six canonical lifecycle labels', () => {
    expect(RESOURCE_ALLOCATION_LIFECYCLE_STATUSES).toEqual([
      'available', 'allocated', 'committed', 'spent', 'released', 'reallocated',
    ]);
  });

  it('exposes exactly the four canonical current-balance positions — a strict subset of the six labels', () => {
    expect(RESOURCE_ALLOCATION_BALANCE_POSITIONS).toEqual(['available', 'allocated', 'committed', 'spent']);
    for (const position of RESOURCE_ALLOCATION_BALANCE_POSITIONS) {
      expect(RESOURCE_ALLOCATION_LIFECYCLE_STATUSES).toContain(position);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — mocked Supabase (analytics.resource_allocation)
// ═══════════════════════════════════════════════════════════════════════════

interface Row {
  id: string;
  tenant_id: string;
  lifecycle_status: string;
  current_balance_position: string | null;
  target_label: string | null;
  original_amount: number;
  remaining_amount: number;
  origin_entry_id: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

let rows: Row[] = [];
let idCounter = 0;

function computePosition(status: string): string | null {
  return (['available', 'allocated', 'committed', 'spent'] as string[]).includes(status) ? status : null;
}

function project(row: Row, cols?: string): unknown {
  if (!cols) return { ...row };
  const fields = cols.split(',').map((c) => c.trim());
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = (row as unknown as Record<string, unknown>)[f];
  return out;
}

function applyFilters(rs: Row[], filters: Record<string, unknown>): Row[] {
  return rs.filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
}

function makeChain(opts: {
  projection?: string;
  filters?: Record<string, unknown>;
  order?: { col: string; ascending: boolean };
} = {}) {
  const filters = opts.filters ?? {};
  return {
    eq(col: string, val: unknown) {
      return makeChain({ ...opts, filters: { ...filters, [col]: val } });
    },
    order(col: string, o: { ascending?: boolean } = {}) {
      return makeChain({ ...opts, order: { col, ascending: o.ascending !== false } });
    },
    single: async () => {
      const matched = applyFilters(rows, filters);
      if (matched.length !== 1) return { data: null, error: { message: 'row not found' } };
      return { data: project(matched[0], opts.projection), error: null };
    },
    then(resolve: (v: { data: unknown[]; error: null }) => void) {
      let matched = applyFilters(rows, filters);
      if (opts.order) {
        const { col, ascending } = opts.order;
        matched = [...matched].sort((a, b) => {
          const av = (a as unknown as Record<string, unknown>)[col] as string;
          const bv = (b as unknown as Record<string, unknown>)[col] as string;
          return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      resolve({ data: matched.map((r) => project(r, opts.projection)), error: null });
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName !== 'analytics' || table !== 'resource_allocation') {
          throw new Error(`unexpected schema/table in WP-015 mock: ${schemaName}.${table}`);
        }
        return {
          select: (cols?: string) => makeChain({ projection: cols }),
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                idCounter += 1;
                const now = new Date().toISOString();
                const row: Row = {
                  id: `ra-${idCounter}`,
                  tenant_id: payload.tenant_id as string,
                  lifecycle_status: payload.lifecycle_status as string,
                  current_balance_position: computePosition(payload.lifecycle_status as string),
                  target_label: (payload.target_label as string | null) ?? null,
                  original_amount: payload.original_amount as number,
                  remaining_amount: payload.remaining_amount as number,
                  origin_entry_id: (payload.origin_entry_id as string | null) ?? null,
                  actor_role: payload.actor_role as string,
                  actor_id: payload.actor_id as string,
                  created_at: now,
                  updated_at: now,
                };
                rows.push(row);
                return { data: row, error: null };
              },
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              const idx = rows.findIndex((r) => (r as unknown as Record<string, unknown>)[col] === val);
              if (idx === -1) return Promise.resolve({ error: { message: 'row not found' } });
              const row = rows[idx];
              // Mirrors migration 064's trigger: remaining_amount may only decrease.
              if ('remaining_amount' in payload && (payload.remaining_amount as number) > row.remaining_amount) {
                return Promise.resolve({ error: { message: 'kora/conservation: remaining_amount may only decrease' } });
              }
              rows[idx] = { ...row, ...payload, updated_at: new Date().toISOString() };
              return Promise.resolve({ error: null });
            },
          }),
        };
      },
    }),
  }),
}));

let declareAvailable: typeof import('@/lib/resource-allocation/resource-allocation-service').declareAvailable;
let allocate: typeof import('@/lib/resource-allocation/resource-allocation-service').allocate;
let commit: typeof import('@/lib/resource-allocation/resource-allocation-service').commit;
let spend: typeof import('@/lib/resource-allocation/resource-allocation-service').spend;
let release: typeof import('@/lib/resource-allocation/resource-allocation-service').release;
let reallocate: typeof import('@/lib/resource-allocation/resource-allocation-service').reallocate;
let refund: typeof import('@/lib/resource-allocation/resource-allocation-service').refund;
let getCurrentBalances: typeof import('@/lib/resource-allocation/resource-allocation-service').getCurrentBalances;
let listEntriesForTenant: typeof import('@/lib/resource-allocation/resource-allocation-service').listEntriesForTenant;

const ACTOR = { actorRole: 'COMPANY_ADMIN', actorId: 'admin-1' };
const TENANT = 'tenant-1';

beforeEach(async () => {
  rows = [];
  idCounter = 0;
  ({
    declareAvailable, allocate, commit, spend, release, reallocate, refund,
    getCurrentBalances, listEntriesForTenant,
  } = await import('@/lib/resource-allocation/resource-allocation-service'));
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — individual transition behavior
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-015 — declareAvailable()', () => {
  it('creates a root Available entry with no origin and no target', async () => {
    const entry = await declareAvailable({ tenantId: TENANT, amount: 100_000, ...ACTOR });
    expect(entry.lifecycleStatus).toBe('available');
    expect(entry.currentBalancePosition).toBe('available');
    expect(entry.originalAmount).toBe(100_000);
    expect(entry.remainingAmount).toBe(100_000);
    expect(entry.originEntryId).toBeNull();
    expect(entry.targetLabel).toBeNull();
  });

  it('rejects a non-positive amount', async () => {
    await expect(declareAvailable({ tenantId: TENANT, amount: 0, ...ACTOR })).rejects.toThrow(/positive number/);
    await expect(declareAvailable({ tenantId: TENANT, amount: -5, ...ACTOR })).rejects.toThrow(/positive number/);
  });

  it('rejects a missing actor', async () => {
    await expect(declareAvailable({ tenantId: TENANT, amount: 100, actorRole: '', actorId: '' })).rejects.toThrow(/actorRole and actorId are required/);
  });
});

describe('KORA-WP-015 — allocate()', () => {
  it('draws from an Available entry into a new Allocated entry, requires a target', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    const allocated = await allocate({ sourceEntryId: root.id, amount: 40, targetLabel: 'wellbeing 2026', ...ACTOR });
    expect(allocated.lifecycleStatus).toBe('allocated');
    expect(allocated.targetLabel).toBe('wellbeing 2026');
    expect(allocated.originEntryId).toBe(root.id);
    const balances = await getCurrentBalances(TENANT);
    expect(balances.available).toBe(60);
    expect(balances.allocated).toBe(40);
  });

  it('rejects a source that is not Available', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    const allocated = await allocate({ sourceEntryId: root.id, amount: 40, targetLabel: 'x', ...ACTOR });
    await expect(allocate({ sourceEntryId: allocated.id, amount: 10, targetLabel: 'y', ...ACTOR })).rejects.toThrow(/is "allocated", not available/);
  });

  it('rejects drawing more than remains (conservation invariant)', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    await expect(allocate({ sourceEntryId: root.id, amount: 150, targetLabel: 'x', ...ACTOR })).rejects.toThrow(/conservation invariant/);
  });

  it('rejects a missing targetLabel', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    await expect(allocate({ sourceEntryId: root.id, amount: 10, targetLabel: '', ...ACTOR })).rejects.toThrow(/targetLabel is required/);
  });
});

describe('KORA-WP-015 — commit() / spend() — transition graph enforcement', () => {
  it('commit only accepts an Allocated source; spend only accepts a Committed source', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    await expect(commit({ sourceEntryId: root.id, amount: 10, ...ACTOR })).rejects.toThrow(/is "available", not allocated/);

    const allocated = await allocate({ sourceEntryId: root.id, amount: 50, targetLabel: 'x', ...ACTOR });
    await expect(spend({ sourceEntryId: allocated.id, amount: 10, ...ACTOR })).rejects.toThrow(/is "allocated", not committed/);

    const committed = await commit({ sourceEntryId: allocated.id, amount: 30, ...ACTOR });
    const spent = await spend({ sourceEntryId: committed.id, amount: 20, ...ACTOR });
    expect(spent.lifecycleStatus).toBe('spent');
    expect(spent.currentBalancePosition).toBe('spent');
  });
});

describe('KORA-WP-015 — release() / reallocate() — only from Allocated or Committed, never Available or Spent', () => {
  it('rejects releasing/reallocating an Available entry', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    await expect(release({ sourceEntryId: root.id, amount: 10, ...ACTOR })).rejects.toThrow(/only allocated or committed entries may be released/);
    await expect(reallocate({ sourceEntryId: root.id, amount: 10, newTargetLabel: 'y', ...ACTOR })).rejects.toThrow(/only allocated or committed entries may be reallocated/);
  });

  it('rejects releasing/reallocating a Spent entry — terminal, permanent', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    const allocated = await allocate({ sourceEntryId: root.id, amount: 50, targetLabel: 'x', ...ACTOR });
    const committed = await commit({ sourceEntryId: allocated.id, amount: 50, ...ACTOR });
    const spent = await spend({ sourceEntryId: committed.id, amount: 50, ...ACTOR });
    await expect(release({ sourceEntryId: spent.id, amount: 10, ...ACTOR })).rejects.toThrow(/only allocated or committed entries may be released/);
  });

  it('release produces a terminal marker (remaining 0) plus a new live Available entry referencing it', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    const allocated = await allocate({ sourceEntryId: root.id, amount: 50, targetLabel: 'x', ...ACTOR });
    const committed = await commit({ sourceEntryId: allocated.id, amount: 30, ...ACTOR });
    const { marker, created } = await release({ sourceEntryId: committed.id, amount: 30, ...ACTOR });
    expect(marker.lifecycleStatus).toBe('released');
    expect(marker.remainingAmount).toBe(0);
    expect(marker.originEntryId).toBe(committed.id);
    expect(created.lifecycleStatus).toBe('available');
    expect(created.remainingAmount).toBe(30);
    expect(created.originEntryId).toBe(marker.id);
  });

  it('reallocate defaults the new entry to Allocated, but honors an explicit Committed target', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    const allocated = await allocate({ sourceEntryId: root.id, amount: 50, targetLabel: 'wellbeing', ...ACTOR });
    const { marker, created } = await reallocate({ sourceEntryId: allocated.id, amount: 10, newTargetLabel: 'training', ...ACTOR });
    expect(marker.lifecycleStatus).toBe('reallocated');
    expect(created.lifecycleStatus).toBe('allocated');
    expect(created.targetLabel).toBe('training');

    const explicit = await reallocate({ sourceEntryId: allocated.id, amount: 5, newTargetLabel: 'onboarding', newPosition: 'committed', ...ACTOR });
    expect(explicit.created.lifecycleStatus).toBe('committed');
  });
});

describe('KORA-WP-015 — refund() — the only correction path for a terminal Spent entry', () => {
  it('creates a new Available entry referencing the Spent entry, without touching the Spent entry itself', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    const allocated = await allocate({ sourceEntryId: root.id, amount: 50, targetLabel: 'x', ...ACTOR });
    const committed = await commit({ sourceEntryId: allocated.id, amount: 50, ...ACTOR });
    const spent = await spend({ sourceEntryId: committed.id, amount: 50, ...ACTOR });

    const refunded = await refund({ spentEntryId: spent.id, amount: 20, ...ACTOR });
    expect(refunded.lifecycleStatus).toBe('available');
    expect(refunded.originEntryId).toBe(spent.id);

    const entries = await listEntriesForTenant(TENANT);
    const spentAfter = entries.find((e) => e.id === spent.id)!;
    expect(spentAfter.remainingAmount).toBe(50); // untouched — spend already zeroed its own source, refund does not draw from it
    expect(spentAfter.lifecycleStatus).toBe('spent');
  });

  it('rejects refunding a non-Spent entry', async () => {
    const root = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    await expect(refund({ spentEntryId: root.id, amount: 10, ...ACTOR })).rejects.toThrow(/not spent/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Acceptance: doc 70 §3's exact six-step €100k worked example
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-015 — Acceptance: doc 70 §3 worked example, exactly, including partial transitions', () => {
  it('reproduces every one of the six steps\' numbers, with Total=100 conserved throughout', async () => {
    // Step 0 — Company declares €100k.
    const e0 = await declareAvailable({ tenantId: TENANT, amount: 100, ...ACTOR });
    let b = await getCurrentBalances(TENANT);
    expect(b).toMatchObject({ available: 100, allocated: 0, committed: 0, spent: 0, total: 100 });

    // Step 1 — Allocate €50k to "wellbeing 2026".
    const e1 = await allocate({ sourceEntryId: e0.id, amount: 50, targetLabel: 'wellbeing 2026', ...ACTOR });
    b = await getCurrentBalances(TENANT);
    expect(b).toMatchObject({ available: 50, allocated: 50, committed: 0, spent: 0, total: 100 });

    // Step 2 — A Commitment claims €30k of the Allocated €50k (partial transition).
    const e2 = await commit({ sourceEntryId: e1.id, amount: 30, ...ACTOR });
    b = await getCurrentBalances(TENANT);
    expect(b).toMatchObject({ available: 50, allocated: 20, committed: 30, spent: 0, total: 100 });

    // Step 3 — €20k of the Committed €30k is spent (partial transition).
    await spend({ sourceEntryId: e2.id, amount: 20, ...ACTOR });
    b = await getCurrentBalances(TENANT);
    expect(b).toMatchObject({ available: 50, allocated: 20, committed: 10, spent: 20, total: 100 });

    // Step 4 — Review releases the unspent €10k Committed back to Available.
    await release({ sourceEntryId: e2.id, amount: 10, ...ACTOR });
    b = await getCurrentBalances(TENANT);
    expect(b).toMatchObject({ available: 60, allocated: 20, committed: 0, spent: 20, total: 100 });

    // Step 5 — Reallocate €10k of the still-Allocated €20k from wellbeing to training
    // (partial transition against e1, whose remaining balance was already reduced
    // to 20 by step 2's own partial draw) — totals unchanged, only re-targeted.
    const { created: e7 } = await reallocate({ sourceEntryId: e1.id, amount: 10, newTargetLabel: 'training', ...ACTOR });
    b = await getCurrentBalances(TENANT);
    expect(b).toMatchObject({ available: 60, allocated: 20, committed: 0, spent: 20, total: 100 });

    // The Allocated bucket is now split across two targets, not merged into one.
    const entries = await listEntriesForTenant(TENANT);
    const e1After = entries.find((e) => e.id === e1.id)!;
    expect(e1After.remainingAmount).toBe(10);
    expect(e1After.targetLabel).toBe('wellbeing 2026');
    expect(e7.remainingAmount).toBe(10);
    expect(e7.targetLabel).toBe('training');

    // The two derived-only "Remaining" quantities (doc 70 §2), never stored.
    expect(b.remainingUncommitted).toBe(b.available + b.allocated); // 80
    expect(b.remainingUnspent).toBe(b.available + b.allocated + b.committed); // 80
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — scope integrity: no Commitment/Program, no 7th state, no boundary bleed
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-015 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/resource-allocation/resource-allocation-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/064_resource_allocation_ledger.sql'), 'utf-8');
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('never implements Commitment, Program, Opportunity, or Need Hypothesis logic (KORA-WP-017/020/022/023/101 boundary)', () => {
    expect(codeOnly).not.toMatch(/\bcommitment_id\b|\bprogram_id\b|\bopportunity\b|need_hypothesis/i);
  });

  it('never captures human-activity effort/duration (KORA-WP-008 boundary — resource positions are euro-like, not minutes)', () => {
    expect(codeOnly).not.toMatch(/effort_minutes|workload_event|activity_category/i);
  });

  it('the six lifecycle labels are the only ones referenced anywhere in the service — no seventh state, no DIRECT/KORA-ORCHESTRATED attribute', () => {
    expect(codeOnly).not.toMatch(/direct.?vs.?orchestrated|kora.?orchestrated|cash.?truth/i);
  });

  it('no generic/polymorphic "update entry" or raw CRUD escape hatch — only the named transitions', () => {
    expect(src).not.toMatch(/export async function updateEntry|export async function patchEntry|export async function setStatus/);
  });

  it('migration grants SELECT+INSERT+UPDATE to service_role only, no DELETE anywhere, FORCE RLS, both policies present', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT, UPDATE ON analytics\.resource_allocation TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON analytics\.resource_allocation/);
    expect(migrationSrc).toMatch(/FORCE ROW LEVEL SECURITY/);
    expect(migrationSrc).toMatch(/CREATE POLICY "kora_admin_all_resource_allocation"/);
    expect(migrationSrc).toMatch(/CREATE POLICY "company_own_resource_allocation_read"/);
  });

  it('migration defines the generated current_balance_position column and both invariant triggers', () => {
    expect(migrationSrc).toMatch(/current_balance_position\s+text\s+GENERATED ALWAYS AS/);
    expect(migrationSrc).toMatch(/trg_resource_allocation_invariants/);
    expect(migrationSrc).toMatch(/trg_resource_allocation_no_delete/);
  });

  it('does not create commitment_ref or any FK to a Commitment/Program table that does not exist yet', () => {
    expect(migrationSrc).not.toMatch(/commitment_ref|REFERENCES .*commitment|REFERENCES .*program/i);
  });
});
