/**
 * KORA-WP-020 — Commitment Draft / Governance Substrate (Layer A).
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/commitment/commitment-service.ts, with only the Supabase I/O boundary
 * (@/lib/supabase/server) and the governance-event substrate
 * (@/lib/audit/governance-event) mocked — same technique as this
 * engagement's own kora-wp-015/017 test files.
 *
 * Real-DB proof of the CHECK constraints (status pinned to 'draft', the
 * three forward-reference columns pinned to NULL), RLS, and the
 * tenant-match trigger lives in this WP's own real-DB validation (see the
 * implementation report) — a mock cannot prove real Postgres CHECK/trigger
 * behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// Mocked Supabase — analytics.commitment / commitment_resource_reference /
// resource_allocation (read-only cross-check)
// ═══════════════════════════════════════════════════════════════════════════

interface CommitmentRow {
  id: string; tenant_id: string; status: string; ready_for_decision: boolean;
  problem_objective: string; population: string | null; options_considered: string[];
  proposed_choice: string | null; rationale: string | null; evidence_available_missing: string | null;
  expected_outcome: string | null; capacity_delivery_context: string | null;
  amount: number | null; horizon: string | null; review_date: string | null;
  owner_role: string; evidence_plan_id: null; opportunity_id: null; program_id: null;
  actor_role: string; actor_id: string; created_at: string; updated_at: string;
}
interface ReferenceRow {
  id: string; tenant_id: string; commitment_id: string; resource_allocation_entry_id: string;
  actor_role: string; actor_id: string; created_at: string;
}
interface AllocationRow { id: string; tenant_id: string; }

let commitments: CommitmentRow[] = [];
let references: ReferenceRow[] = [];
let allocations: AllocationRow[] = [];
let idCounter = 0;

const recordGovernanceEventMock = vi.fn(async (params: Record<string, unknown>) => ({ id: 'ev-1', ...params }));
vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (params: Record<string, unknown>) => recordGovernanceEventMock(params),
}));

function applyFilters<T>(rows: T[], filters: Record<string, unknown>): T[] {
  return rows.filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
}

function makeChain<T>(store: () => T[], opts: { projection?: string; filters?: Record<string, unknown>; order?: { col: string; ascending: boolean } } = {}) {
  const filters = opts.filters ?? {};
  const project = (row: T): unknown => {
    if (!opts.projection) return { ...row };
    const out: Record<string, unknown> = {};
    for (const f of opts.projection.split(',').map((c) => c.trim())) out[f] = (row as unknown as Record<string, unknown>)[f];
    return out;
  };
  return {
    eq(col: string, val: unknown) { return makeChain(store, { ...opts, filters: { ...filters, [col]: val } }); },
    order(col: string, o: { ascending?: boolean } = {}) { return makeChain(store, { ...opts, order: { col, ascending: o.ascending !== false } }); },
    single: async () => {
      const matched = applyFilters(store(), filters);
      if (matched.length !== 1) return { data: null, error: { message: 'row not found' } };
      return { data: project(matched[0]), error: null };
    },
    maybeSingle: async () => {
      const matched = applyFilters(store(), filters);
      if (matched.length === 0) return { data: null, error: null };
      return { data: project(matched[0]), error: null };
    },
    then(resolve: (v: { data: unknown[]; error: null }) => void) {
      let matched = applyFilters(store(), filters);
      if (opts.order) {
        const { col, ascending } = opts.order;
        matched = [...matched].sort((a, b) => {
          const av = (a as unknown as Record<string, unknown>)[col] as string;
          const bv = (b as unknown as Record<string, unknown>)[col] as string;
          return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      resolve({ data: matched.map(project), error: null });
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName !== 'analytics') throw new Error(`unexpected schema in WP-020 mock: ${schemaName}`);

        if (table === 'commitment') {
          return {
            select: (cols?: string) => makeChain(() => commitments, { projection: cols }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  idCounter += 1;
                  const now = new Date().toISOString();
                  const row: CommitmentRow = {
                    id: `cm-${idCounter}`,
                    tenant_id: payload.tenant_id as string,
                    status: 'draft',
                    ready_for_decision: false,
                    problem_objective: payload.problem_objective as string,
                    population: (payload.population as string | null) ?? null,
                    options_considered: (payload.options_considered as string[]) ?? [],
                    proposed_choice: (payload.proposed_choice as string | null) ?? null,
                    rationale: (payload.rationale as string | null) ?? null,
                    evidence_available_missing: (payload.evidence_available_missing as string | null) ?? null,
                    expected_outcome: (payload.expected_outcome as string | null) ?? null,
                    capacity_delivery_context: (payload.capacity_delivery_context as string | null) ?? null,
                    amount: (payload.amount as number | null) ?? null,
                    horizon: (payload.horizon as string | null) ?? null,
                    review_date: (payload.review_date as string | null) ?? null,
                    owner_role: payload.owner_role as string,
                    evidence_plan_id: null,
                    opportunity_id: null,
                    program_id: null,
                    actor_role: payload.actor_role as string,
                    actor_id: payload.actor_id as string,
                    created_at: now,
                    updated_at: now,
                  };
                  commitments.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (patch: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const idx = commitments.findIndex((r) => (r as unknown as Record<string, unknown>)[col1] === val1 && (r as unknown as Record<string, unknown>)[col2] === val2);
                  if (idx === -1) return { error: { message: 'row not found' } };
                  commitments[idx] = { ...commitments[idx], ...patch, updated_at: new Date().toISOString() };
                  return { error: null };
                },
              }),
            }),
          };
        }

        if (table === 'commitment_resource_reference') {
          return {
            select: (cols?: string) => makeChain(() => references, { projection: cols }),
            insert: (payload: Record<string, unknown>) => {
              idCounter += 1;
              references.push({
                id: `ref-${idCounter}`,
                tenant_id: payload.tenant_id as string,
                commitment_id: payload.commitment_id as string,
                resource_allocation_entry_id: payload.resource_allocation_entry_id as string,
                actor_role: payload.actor_role as string,
                actor_id: payload.actor_id as string,
                created_at: new Date().toISOString(),
              });
              return Promise.resolve({ error: null });
            },
            delete: () => ({
              eq: (col1: string, val1: unknown) => ({
                eq: (col2: string, val2: unknown) => ({
                  eq: async (col3: string, val3: unknown) => {
                    references = references.filter((r) => !(
                      (r as unknown as Record<string, unknown>)[col1] === val1 &&
                      (r as unknown as Record<string, unknown>)[col2] === val2 &&
                      (r as unknown as Record<string, unknown>)[col3] === val3
                    ));
                    return { error: null };
                  },
                }),
              }),
            }),
          };
        }

        if (table === 'resource_allocation') {
          return { select: (cols?: string) => makeChain(() => allocations, { projection: cols }) };
        }

        throw new Error(`unexpected table in WP-020 mock: ${table}`);
      },
    }),
  }),
}));

let createCommitmentDraft: typeof import('@/lib/commitment/commitment-service').createCommitmentDraft;
let updateCommitmentDraft: typeof import('@/lib/commitment/commitment-service').updateCommitmentDraft;
let markCommitmentReadyForDecision: typeof import('@/lib/commitment/commitment-service').markCommitmentReadyForDecision;
let linkResourceAllocationEntry: typeof import('@/lib/commitment/commitment-service').linkResourceAllocationEntry;
let unlinkResourceAllocationEntry: typeof import('@/lib/commitment/commitment-service').unlinkResourceAllocationEntry;
let listLinkedResourceAllocationEntryIds: typeof import('@/lib/commitment/commitment-service').listLinkedResourceAllocationEntryIds;
let getCommitmentDraft: typeof import('@/lib/commitment/commitment-service').getCommitmentDraft;
let listCommitmentDraftsForTenant: typeof import('@/lib/commitment/commitment-service').listCommitmentDraftsForTenant;

const OWNER = { actorRole: 'COMPANY_ADMIN', actorId: 'admin-1' };
const TENANT = 'tenant-1';
const OTHER_TENANT = 'tenant-2';

beforeEach(async () => {
  commitments = [];
  references = [];
  allocations = [
    { id: 'ra-own', tenant_id: TENANT },
    { id: 'ra-other', tenant_id: OTHER_TENANT },
  ];
  idCounter = 0;
  recordGovernanceEventMock.mockClear();
  ({
    createCommitmentDraft, updateCommitmentDraft, markCommitmentReadyForDecision,
    linkResourceAllocationEntry, unlinkResourceAllocationEntry, listLinkedResourceAllocationEntryIds,
    getCommitmentDraft, listCommitmentDraftsForTenant,
  } = await import('@/lib/commitment/commitment-service'));
});

// ═══════════════════════════════════════════════════════════════════════════
// createCommitmentDraft()
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-020 — createCommitmentDraft()', () => {
  it('creates a draft with only problemObjective required, status="draft", owner_role="COMPANY_ADMIN"', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'Wellbeing gap in ops team', ...OWNER });
    expect(c.status).toBe('draft');
    expect(c.readyForDecision).toBe(false);
    expect(c.ownerRole).toBe('COMPANY_ADMIN');
    expect(c.evidencePlanId).toBeNull();
    expect(c.opportunityId).toBeNull();
    expect(c.programId).toBeNull();
    expect(c.optionsConsidered).toEqual([]);
  });

  it('rejects a missing problemObjective', async () => {
    await expect(createCommitmentDraft({ tenantId: TENANT, problemObjective: '', ...OWNER })).rejects.toThrow(/problemObjective is required/);
  });

  it('rejects a missing actor', async () => {
    await expect(createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', actorRole: '', actorId: '' })).rejects.toThrow(/actorRole and actorId are required/);
  });

  // Narrowed by the KORA-WP-033 convergence remediation: doc 73 §6's own
  // Advisor DRAFT/EDIT-DRAFT grant was wired in — ADVISOR is now a
  // legitimate draft author here (see tests/unit/kora-wp-033-convergence.
  // test.ts for the full Assignment-scoped behavior). KORA_ADMIN remains
  // correctly rejected — never a legitimate Commitment-draft author.
  it('rejects an actor that is neither COMPANY_ADMIN nor ADVISOR', async () => {
    await expect(createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft\/edit/);
    await expect(createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', actorRole: 'WORKER', actorId: 'w-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft\/edit/);
  });

  it('accepts ADVISOR as a draft author (KORA-WP-033 convergence — actorRole alone is accepted here; real Assignment-validity gating happens one layer up, in advisor-decision-support-service.ts)', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', actorRole: 'ADVISOR', actorId: 'adv-1' });
    expect(c.actorRole).toBe('ADVISOR');
    expect(c.ownerRole).toBe('COMPANY_ADMIN'); // Decision Owner remains the Company regardless of who drafted
  });

  it('records a commitment.draft_created governance event', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceModule: 'commitment', eventType: 'commitment.draft_created', objectId: c.id, tenantId: TENANT,
    }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateCommitmentDraft()
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-020 — updateCommitmentDraft()', () => {
  it('patches only the supplied fields, leaves the rest unchanged', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'orig', population: 'ops team', ...OWNER });
    const updated = await updateCommitmentDraft({ commitmentId: c.id, tenantId: TENANT, amount: 5000, ...OWNER });
    expect(updated.amount).toBe(5000);
    expect(updated.population).toBe('ops team'); // unchanged
    expect(updated.problemObjective).toBe('orig'); // unchanged
  });

  it('rejects clearing problemObjective to empty', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'orig', ...OWNER });
    await expect(updateCommitmentDraft({ commitmentId: c.id, tenantId: TENANT, problemObjective: '', ...OWNER })).rejects.toThrow(/cannot be cleared/);
  });

  // Narrowed by the KORA-WP-033 convergence — see createCommitmentDraft()'s
  // own equivalent test above for the full rationale.
  it('rejects an actor that is neither COMPANY_ADMIN nor ADVISOR', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'orig', ...OWNER });
    await expect(updateCommitmentDraft({ commitmentId: c.id, tenantId: TENANT, amount: 10, actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft\/edit/);
  });

  it('rejects editing a commitment belonging to a different tenant', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'orig', ...OWNER });
    await expect(updateCommitmentDraft({ commitmentId: c.id, tenantId: OTHER_TENANT, amount: 10, ...OWNER })).rejects.toThrow(/not found/);
  });

  it('records a commitment.draft_edited governance event', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'orig', ...OWNER });
    recordGovernanceEventMock.mockClear();
    await updateCommitmentDraft({ commitmentId: c.id, tenantId: TENANT, amount: 10, ...OWNER });
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'commitment.draft_edited', objectId: c.id }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// markCommitmentReadyForDecision()
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-020 — markCommitmentReadyForDecision() — soft flag, doc 73 §6', () => {
  it('toggles the flag without changing status', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    const marked = await markCommitmentReadyForDecision({ commitmentId: c.id, tenantId: TENANT, ready: true, ...OWNER });
    expect(marked.readyForDecision).toBe(true);
    expect(marked.status).toBe('draft'); // never transitions
    const unmarked = await markCommitmentReadyForDecision({ commitmentId: c.id, tenantId: TENANT, ready: false, ...OWNER });
    expect(unmarked.readyForDecision).toBe(false);
  });

  // Narrowed by the KORA-WP-033 convergence — doc 73 §6 explicitly grants
  // Advisor this exact soft flag ("may mark a draft 'ready for decision'").
  it('rejects an actor that is neither COMPANY_ADMIN nor ADVISOR', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    await expect(markCommitmentReadyForDecision({ commitmentId: c.id, tenantId: TENANT, ready: true, actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft\/edit/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// link/unlinkResourceAllocationEntry()
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-020 — Resource Allocation reference (doc 67 §6)', () => {
  it('links an own-tenant Resource Allocation entry', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    await linkResourceAllocationEntry({ commitmentId: c.id, tenantId: TENANT, resourceAllocationEntryId: 'ra-own', ...OWNER });
    const ids = await listLinkedResourceAllocationEntryIds(c.id, TENANT);
    expect(ids).toEqual(['ra-own']);
  });

  it('rejects linking a cross-tenant Resource Allocation entry', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    await expect(linkResourceAllocationEntry({ commitmentId: c.id, tenantId: TENANT, resourceAllocationEntryId: 'ra-other', ...OWNER })).rejects.toThrow(/cross-tenant references are never allowed/);
  });

  it('rejects linking to a non-existent commitment', async () => {
    await expect(linkResourceAllocationEntry({ commitmentId: 'nope', tenantId: TENANT, resourceAllocationEntryId: 'ra-own', ...OWNER })).rejects.toThrow(/not found/);
  });

  it('unlinks a previously linked entry', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    await linkResourceAllocationEntry({ commitmentId: c.id, tenantId: TENANT, resourceAllocationEntryId: 'ra-own', ...OWNER });
    await unlinkResourceAllocationEntry({ commitmentId: c.id, tenantId: TENANT, resourceAllocationEntryId: 'ra-own', ...OWNER });
    expect(await listLinkedResourceAllocationEntryIds(c.id, TENANT)).toEqual([]);
  });

  it('linking never mutates the resource_allocation entry itself (purely informational)', async () => {
    const c = await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'x', ...OWNER });
    const before = { ...allocations.find((a) => a.id === 'ra-own') };
    await linkResourceAllocationEntry({ commitmentId: c.id, tenantId: TENANT, resourceAllocationEntryId: 'ra-own', ...OWNER });
    expect(allocations.find((a) => a.id === 'ra-own')).toEqual(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// read paths
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-020 — read paths', () => {
  it('getCommitmentDraft returns null for a non-existent id', async () => {
    expect(await getCommitmentDraft('nope', TENANT)).toBeNull();
  });

  it('listCommitmentDraftsForTenant returns only that tenant\'s drafts', async () => {
    await createCommitmentDraft({ tenantId: TENANT, problemObjective: 'a', ...OWNER });
    await createCommitmentDraft({ tenantId: OTHER_TENANT, problemObjective: 'b', ...OWNER });
    const list = await listCommitmentDraftsForTenant(TENANT);
    expect(list).toHaveLength(1);
    expect(list[0].problemObjective).toBe('a');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-020 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/commitment/commitment-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/065_commitment_draft.sql'), 'utf-8');
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no committed/active/reviewable/reviewed/closed/reactivated transition function exists (KORA-WP-022/Review boundary)', () => {
    expect(src).not.toMatch(/export async function commit\b|export async function activate|export async function reviewCommitment|export async function closeCommitment|export async function reactivate/i);
  });

  it('no Evidence Plan, Opportunity, Program, Review, or Decision Pack logic implemented (KORA-WP-019/021/023/024 boundary)', () => {
    expect(codeOnly).not.toMatch(/evidence.?plan.*(create|insert|freeze)|opportunity.*(create|insert|convert)|program.*(create|insert|publish)|review.*(conclude|verdict)|decision.?pack/i);
  });

  it('no Living KORAL anticipation', () => {
    expect(codeOnly).not.toMatch(/living.?koral|material.?change|morpholog/i);
  });

  it('migration pins status to draft-only, and the three forward-reference columns to NULL-only', () => {
    expect(migrationSrc).toMatch(/status\s+text\s+NOT NULL DEFAULT 'draft' CHECK \(status = 'draft'\)/);
    expect(migrationSrc).toMatch(/evidence_plan_id\s+uuid\s+CHECK \(evidence_plan_id IS NULL\)/);
    expect(migrationSrc).toMatch(/opportunity_id\s+uuid\s+CHECK \(opportunity_id IS NULL\)/);
    expect(migrationSrc).toMatch(/program_id\s+uuid\s+CHECK \(program_id IS NULL\)/);
  });

  it('migration grants no DELETE on commitment (no cancellation state invented), but allows DELETE on the junction table only', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT, UPDATE ON analytics\.commitment TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON analytics\.commitment TO/);
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT, DELETE ON analytics\.commitment_resource_reference TO service_role;/);
  });

  it('migration has FORCE RLS and both Pattern-A policies on both tables', () => {
    expect(migrationSrc).toMatch(/ALTER TABLE analytics\.commitment FORCE ROW LEVEL SECURITY/);
    expect(migrationSrc).toMatch(/ALTER TABLE analytics\.commitment_resource_reference FORCE ROW LEVEL SECURITY/);
    expect(migrationSrc).toMatch(/CREATE POLICY "kora_admin_all_commitment"/);
    expect(migrationSrc).toMatch(/CREATE POLICY "company_own_commitment_read"/);
  });

  // Renamed by the KORA-WP-033 convergence (assertDecisionOwner ->
  // assertAuthorizedDraftAuthor) — the check itself is still unconditional
  // on every mutator below, now widened to COMPANY_ADMIN or ADVISOR; no
  // function in this file was ever, or is now, a constitutive transition.
  it('every mutating function requires an authorized draft author (COMPANY_ADMIN or ADVISOR)', () => {
    const mutators = ['createCommitmentDraft', 'updateCommitmentDraft', 'markCommitmentReadyForDecision', 'linkResourceAllocationEntry', 'unlinkResourceAllocationEntry'];
    for (const fn of mutators) {
      const match = src.match(new RegExp(`export async function ${fn}[\\s\\S]*?\\n\\}`));
      expect(match, `${fn} not found`).not.toBeNull();
      expect(match![0]).toMatch(/assertAuthorizedDraftAuthor/);
    }
  });
});
