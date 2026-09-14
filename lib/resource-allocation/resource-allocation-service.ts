// lib/resource-allocation/resource-allocation-service.ts
// KORA-WP-015 — Resource Allocation Ledger.
//
// `COMPANY-005`'s conservation-tested ledger (doc 72 Lock 1, doc 70 §2-3).
// This module is the ONLY writer of analytics.resource_allocation. Every
// function below implements exactly one of the transitions the frozen
// source names — no generic "update entry" escape hatch exists, matching
// the doc's own closed transition graph:
//
//   declareAvailable  → creates the root Available entry (doc 70 §3 step 0)
//   allocate          → Available   → Allocated   (step 1)
//   commit            → Allocated   → Committed   (step 2)
//   spend             → Committed   → Spent, terminal (step 3)
//   release           → Allocated/Committed → Available, via a terminal
//                        'released' marker row (step 4)
//   reallocate        → Allocated/Committed → Allocated/Committed at a new
//                        target, via a terminal 'reallocated' marker row
//                        (step 5)
//   refund            → Spent (untouched, permanent) → a brand new
//                        Available row referencing it — the only named
//                        correction path for a terminal Spent entry
//
// Resource Allocation itself never gains a seventh state (doc 72 §4) — the
// DIRECT vs. KORA-ORCHESTRATED distinction and exact Cash-Truth recognition
// timing both belong to the future Commitment/Program layer (KORA-WP-020+/
// KORA-WP-101), never to this module. This module also never references
// Commitment, Program, Opportunity, or Need Hypothesis — Out of Scope per
// this WP's own registry entry.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const RESOURCE_ALLOCATION_LIFECYCLE_STATUSES = [
  'available',
  'allocated',
  'committed',
  'spent',
  'released',
  'reallocated',
] as const;

export type ResourceAllocationLifecycleStatus = (typeof RESOURCE_ALLOCATION_LIFECYCLE_STATUSES)[number];

export const RESOURCE_ALLOCATION_BALANCE_POSITIONS = [
  'available',
  'allocated',
  'committed',
  'spent',
] as const;

export type ResourceAllocationBalancePosition = (typeof RESOURCE_ALLOCATION_BALANCE_POSITIONS)[number];

export interface ResourceAllocationEntry {
  id: string;
  tenantId: string;
  lifecycleStatus: ResourceAllocationLifecycleStatus;
  currentBalancePosition: ResourceAllocationBalancePosition | null;
  targetLabel: string | null;
  originalAmount: number;
  remainingAmount: number;
  originEntryId: string | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface ResourceAllocationDbRow {
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

function toEntry(row: ResourceAllocationDbRow): ResourceAllocationEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStatus: row.lifecycle_status as ResourceAllocationLifecycleStatus,
    currentBalancePosition: row.current_balance_position as ResourceAllocationBalancePosition | null,
    targetLabel: row.target_label,
    originalAmount: Number(row.original_amount),
    remainingAmount: Number(row.remaining_amount),
    originEntryId: row.origin_entry_id,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ActorParams {
  actorRole: string;
  actorId: string;
}

function assertActor(params: ActorParams): void {
  if (!params.actorRole || !params.actorId) {
    throw new Error('[KORA] resource-allocation rejected: actorRole and actorId are required — this ledger never manufactures actor attribution.');
  }
}

function assertPositiveAmount(amount: number, label: string): void {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`[KORA] resource-allocation rejected: ${label} must be a positive number.`);
  }
}

async function fetchEntryForUpdate(db: ReturnType<typeof getSupabaseServiceClient>, entryId: string): Promise<ResourceAllocationEntry> {
  const { data, error } = await db
    .schema('analytics')
    .from('resource_allocation')
    .select()
    .eq('id', entryId)
    .single();

  if (error || !data) {
    throw new Error(`[KORA] resource-allocation rejected: source entry "${entryId}" not found.`);
  }

  return toEntry(data as ResourceAllocationDbRow);
}

// ── draw — internal primitive shared by every transition ────────────────────
//
// Reduces a source entry's remaining_amount by `amount` (the one mutation
// this ledger allows — migration 064's trigger enforces it can only ever
// decrease) and returns the entry as it was BEFORE the draw, so callers can
// validate against its pre-draw lifecycle_status/target_label.

async function draw(
  db: ReturnType<typeof getSupabaseServiceClient>,
  source: ResourceAllocationEntry,
  amount: number,
): Promise<void> {
  if (amount > source.remainingAmount) {
    throw new Error(
      `[KORA] resource-allocation rejected: cannot draw ${amount} from entry "${source.id}" — only ${source.remainingAmount} remains (conservation invariant).`,
    );
  }

  const { error } = await db
    .schema('analytics')
    .from('resource_allocation')
    .update({ remaining_amount: source.remainingAmount - amount })
    .eq('id', source.id);

  if (error) {
    throw new Error(`[KORA] resource-allocation draw failed: ${error.message}`);
  }
}

async function insertEntry(
  db: ReturnType<typeof getSupabaseServiceClient>,
  row: {
    tenantId: string;
    lifecycleStatus: ResourceAllocationLifecycleStatus;
    targetLabel: string | null;
    originalAmount: number;
    remainingAmount: number;
    originEntryId: string | null;
    actorRole: string;
    actorId: string;
  },
): Promise<ResourceAllocationEntry> {
  const { data, error } = await db
    .schema('analytics')
    .from('resource_allocation')
    .insert({
      tenant_id: row.tenantId,
      lifecycle_status: row.lifecycleStatus,
      target_label: row.targetLabel,
      original_amount: row.originalAmount,
      remaining_amount: row.remainingAmount,
      origin_entry_id: row.originEntryId,
      actor_role: row.actorRole,
      actor_id: row.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] resource-allocation insert failed: ${error?.message ?? 'no data returned'}`);
  }

  return toEntry(data as ResourceAllocationDbRow);
}

// ── declareAvailable — the root entry (doc 70 §3 step 0) ─────────────────────

export interface DeclareAvailableParams extends ActorParams {
  tenantId: string;
  amount: number;
}

export async function declareAvailable(params: DeclareAvailableParams): Promise<ResourceAllocationEntry> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');

  const db = getSupabaseServiceClient();

  return insertEntry(db, {
    tenantId: params.tenantId,
    lifecycleStatus: 'available',
    targetLabel: null,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: null,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });
}

// ── allocate — Available → Allocated (doc 70 §3 step 1) ──────────────────────

export interface AllocateParams extends ActorParams {
  sourceEntryId: string;
  amount: number;
  targetLabel: string;
}

export async function allocate(params: AllocateParams): Promise<ResourceAllocationEntry> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');
  if (!params.targetLabel) {
    throw new Error('[KORA] allocate rejected: targetLabel is required — an Allocated entry is always earmarked for something.');
  }

  const db = getSupabaseServiceClient();
  const source = await fetchEntryForUpdate(db, params.sourceEntryId);

  if (source.lifecycleStatus !== 'available') {
    throw new Error(`[KORA] allocate rejected: source entry "${source.id}" is "${source.lifecycleStatus}", not available.`);
  }

  await draw(db, source, params.amount);

  return insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: 'allocated',
    targetLabel: params.targetLabel,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: source.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });
}

// ── commit — Allocated → Committed (doc 70 §3 step 2) ────────────────────────

export interface CommitParams extends ActorParams {
  sourceEntryId: string;
  amount: number;
}

export async function commit(params: CommitParams): Promise<ResourceAllocationEntry> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');

  const db = getSupabaseServiceClient();
  const source = await fetchEntryForUpdate(db, params.sourceEntryId);

  if (source.lifecycleStatus !== 'allocated') {
    throw new Error(`[KORA] commit rejected: source entry "${source.id}" is "${source.lifecycleStatus}", not allocated.`);
  }

  await draw(db, source, params.amount);

  return insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: 'committed',
    targetLabel: source.targetLabel,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: source.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });
}

// ── spend — Committed → Spent, terminal (doc 70 §3 step 3) ───────────────────

export interface SpendParams extends ActorParams {
  sourceEntryId: string;
  amount: number;
}

export async function spend(params: SpendParams): Promise<ResourceAllocationEntry> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');

  const db = getSupabaseServiceClient();
  const source = await fetchEntryForUpdate(db, params.sourceEntryId);

  if (source.lifecycleStatus !== 'committed') {
    throw new Error(`[KORA] spend rejected: source entry "${source.id}" is "${source.lifecycleStatus}", not committed.`);
  }

  await draw(db, source, params.amount);

  return insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: 'spent',
    targetLabel: source.targetLabel,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: source.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });
}

// ── release — Allocated/Committed → Available, via a terminal marker ─────────
// (doc 70 §3 step 4)
//
// Two new rows, matching doc 72's own description exactly: the drawn slice
// becomes a closed, terminal 'released' marker (remaining_amount 0 — its
// entire value has already moved on), and a second, brand new 'available'
// row is created referencing that marker, carrying the live balance
// forward. The source's own remaining_amount is reduced as usual — it
// keeps its original lifecycle_status/target_label and can still be drawn
// from again later if any balance remains.

export interface ReleaseParams extends ActorParams {
  sourceEntryId: string;
  amount: number;
}

export interface ReleaseResult {
  marker: ResourceAllocationEntry;
  created: ResourceAllocationEntry;
}

export async function release(params: ReleaseParams): Promise<ReleaseResult> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');

  const db = getSupabaseServiceClient();
  const source = await fetchEntryForUpdate(db, params.sourceEntryId);

  if (source.lifecycleStatus !== 'allocated' && source.lifecycleStatus !== 'committed') {
    throw new Error(`[KORA] release rejected: source entry "${source.id}" is "${source.lifecycleStatus}" — only allocated or committed entries may be released.`);
  }

  await draw(db, source, params.amount);

  const marker = await insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: 'released',
    targetLabel: null,
    originalAmount: params.amount,
    remainingAmount: 0,
    originEntryId: source.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });

  const created = await insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: 'available',
    targetLabel: null,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: marker.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });

  return { marker, created };
}

// ── reallocate — Allocated/Committed → Allocated/Committed, re-targeted ──────
// (doc 70 §3 step 5)
//
// Same terminal-marker shape as release, but the new live row lands back in
// Allocated (the ordinary case) or Committed (doc 72: "occasionally
// Committed, if the reallocation directly re-commits it") at a new target,
// instead of Available.

export interface ReallocateParams extends ActorParams {
  sourceEntryId: string;
  amount: number;
  newTargetLabel: string;
  newPosition?: 'allocated' | 'committed';
}

export interface ReallocateResult {
  marker: ResourceAllocationEntry;
  created: ResourceAllocationEntry;
}

export async function reallocate(params: ReallocateParams): Promise<ReallocateResult> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');
  if (!params.newTargetLabel) {
    throw new Error('[KORA] reallocate rejected: newTargetLabel is required — a reallocation always re-earmarks its value.');
  }

  const db = getSupabaseServiceClient();
  const source = await fetchEntryForUpdate(db, params.sourceEntryId);

  if (source.lifecycleStatus !== 'allocated' && source.lifecycleStatus !== 'committed') {
    throw new Error(`[KORA] reallocate rejected: source entry "${source.id}" is "${source.lifecycleStatus}" — only allocated or committed entries may be reallocated.`);
  }

  await draw(db, source, params.amount);

  const marker = await insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: 'reallocated',
    targetLabel: null,
    originalAmount: params.amount,
    remainingAmount: 0,
    originEntryId: source.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });

  const created = await insertEntry(db, {
    tenantId: source.tenantId,
    lifecycleStatus: params.newPosition ?? 'allocated',
    targetLabel: params.newTargetLabel,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: marker.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });

  return { marker, created };
}

// ── refund — the only correction path for a terminal Spent entry ─────────────
//
// A Spent row is never mutated, ever (doc 72: "counted once, forever"). A
// refund does not draw from the Spent entry (spend already reduced its own
// source to zero permanently) — it creates a brand new Available row that
// references the Spent entry purely as provenance of what is being
// corrected.

export interface RefundParams extends ActorParams {
  spentEntryId: string;
  amount: number;
}

export async function refund(params: RefundParams): Promise<ResourceAllocationEntry> {
  assertActor(params);
  assertPositiveAmount(params.amount, 'amount');

  const db = getSupabaseServiceClient();
  const spentEntry = await fetchEntryForUpdate(db, params.spentEntryId);

  if (spentEntry.lifecycleStatus !== 'spent') {
    throw new Error(`[KORA] refund rejected: entry "${spentEntry.id}" is "${spentEntry.lifecycleStatus}", not spent — refund only corrects a terminal Spent entry.`);
  }

  return insertEntry(db, {
    tenantId: spentEntry.tenantId,
    lifecycleStatus: 'available',
    targetLabel: null,
    originalAmount: params.amount,
    remainingAmount: params.amount,
    originEntryId: spentEntry.id,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });
}

// ── getCurrentBalances — the conservation-equation read view ─────────────────
//
// Sums remaining_amount per live position (released/reallocated rows carry
// a NULL position and a 0 balance, so they never contribute here) plus the
// two derived-only "Remaining" quantities doc 70 §2 names — never stored,
// always computed at read time.

export interface ResourceAllocationBalances {
  available: number;
  allocated: number;
  committed: number;
  spent: number;
  total: number;
  remainingUncommitted: number;
  remainingUnspent: number;
}

export async function getCurrentBalances(tenantId: string): Promise<ResourceAllocationBalances> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('resource_allocation')
    .select('current_balance_position, remaining_amount')
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`[KORA] getCurrentBalances failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ current_balance_position: string | null; remaining_amount: number }>;

  const balances = { available: 0, allocated: 0, committed: 0, spent: 0 };
  for (const row of rows) {
    if (row.current_balance_position && row.current_balance_position in balances) {
      balances[row.current_balance_position as ResourceAllocationBalancePosition] += Number(row.remaining_amount);
    }
  }

  return {
    ...balances,
    total: balances.available + balances.allocated + balances.committed + balances.spent,
    remainingUncommitted: balances.available + balances.allocated,
    remainingUnspent: balances.available + balances.allocated + balances.committed,
  };
}

// ── listEntriesForTenant — full ledger read (provenance/audit surface) ───────

export async function listEntriesForTenant(tenantId: string): Promise<ResourceAllocationEntry[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('resource_allocation')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listEntriesForTenant failed: ${error.message}`);
  }

  return (data ?? []).map((row) => toEntry(row as ResourceAllocationDbRow));
}
