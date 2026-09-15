/**
 * KORA-WP-021 — Evidence Plan Lineage (Layer B).
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/evidence-plan/evidence-plan-service.ts, with only the Supabase I/O
 * boundary (@/lib/supabase/server) and the governance-event substrate
 * (@/lib/audit/governance-event) mocked — same technique as this
 * engagement's own kora-wp-017/020 test files. The mock also simulates
 * migration 066's own "no addendum against a draft primary" trigger, since
 * proving that specific precondition end-to-end (by manually relaxing a
 * row's status, which cannot happen through this service at all) requires
 * a real Postgres row — done in this WP's own real-DB validation (see the
 * implementation report), not here.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface CommitmentRow { id: string; tenant_id: string; evidence_plan_id: string | null; }
interface PlanRow {
  id: string; tenant_id: string; commitment_id: string; status: string;
  evidence_expectations: string | null; criteria: string | null;
  confidence_quality_expectations: string | null; review_intention: string | null;
  known_missing_at_decision: string | null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}
interface AddendumRow {
  id: string; tenant_id: string; evidence_plan_id: string; extends_addendum_id: string | null;
  effective_from: string; scope: string; content: string | null;
  actor_role: string; actor_id: string; created_at: string;
}

let commitments: CommitmentRow[] = [];
let plans: PlanRow[] = [];
let addenda: AddendumRow[] = [];
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
        if (schemaName !== 'analytics') throw new Error(`unexpected schema in WP-021 mock: ${schemaName}`);

        if (table === 'commitment') {
          return {
            select: (cols?: string) => makeChain(() => commitments, { projection: cols }),
            update: (patch: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const idx = commitments.findIndex((r) => (r as unknown as Record<string, unknown>)[col1] === val1 && (r as unknown as Record<string, unknown>)[col2] === val2);
                  if (idx === -1) return { error: { message: 'row not found' } };
                  commitments[idx] = { ...commitments[idx], ...patch };
                  return { error: null };
                },
              }),
            }),
          };
        }

        if (table === 'evidence_plan') {
          return {
            select: (cols?: string) => makeChain(() => plans, { projection: cols }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  idCounter += 1;
                  const now = new Date().toISOString();
                  const row: PlanRow = {
                    id: `ep-${idCounter}`,
                    tenant_id: payload.tenant_id as string,
                    commitment_id: payload.commitment_id as string,
                    status: 'draft',
                    evidence_expectations: (payload.evidence_expectations as string | null) ?? null,
                    criteria: (payload.criteria as string | null) ?? null,
                    confidence_quality_expectations: (payload.confidence_quality_expectations as string | null) ?? null,
                    review_intention: (payload.review_intention as string | null) ?? null,
                    known_missing_at_decision: (payload.known_missing_at_decision as string | null) ?? null,
                    actor_role: payload.actor_role as string,
                    actor_id: payload.actor_id as string,
                    created_at: now,
                    updated_at: now,
                  };
                  plans.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (patch: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const idx = plans.findIndex((r) => (r as unknown as Record<string, unknown>)[col1] === val1 && (r as unknown as Record<string, unknown>)[col2] === val2);
                  if (idx === -1) return { error: { message: 'row not found' } };
                  // Mirrors migration 066's status CHECK — no code path in
                  // this service ever attempts this, but the mock enforces
                  // it too for parity with real Postgres.
                  if ('status' in patch && patch.status !== 'draft') {
                    return { error: { message: 'commitment_status_check violation (simulated)' } };
                  }
                  plans[idx] = { ...plans[idx], ...patch, updated_at: new Date().toISOString() };
                  return { error: null };
                },
              }),
            }),
          };
        }

        if (table === 'evidence_plan_addendum') {
          return {
            select: (cols?: string) => makeChain(() => addenda, { projection: cols }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  // Mirrors migration 066's trg_evidence_plan_addendum_invariants.
                  const plan = plans.find((p) => p.id === payload.evidence_plan_id);
                  if (!plan) return { data: null, error: { message: 'kora/tenant-mismatch: referenced evidence_plan not found' } };
                  if (plan.status === 'draft') {
                    return { data: null, error: { message: 'kora/lineage: an addendum cannot be created while its evidence_plan is still draft' } };
                  }
                  idCounter += 1;
                  const row: AddendumRow = {
                    id: `epa-${idCounter}`,
                    tenant_id: payload.tenant_id as string,
                    evidence_plan_id: payload.evidence_plan_id as string,
                    extends_addendum_id: (payload.extends_addendum_id as string | null) ?? null,
                    effective_from: payload.effective_from as string,
                    scope: payload.scope as string,
                    content: (payload.content as string | null) ?? null,
                    actor_role: payload.actor_role as string,
                    actor_id: payload.actor_id as string,
                    created_at: new Date().toISOString(),
                  };
                  addenda.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
          };
        }

        throw new Error(`unexpected table in WP-021 mock: ${table}`);
      },
    }),
  }),
}));

let createEvidencePlan: typeof import('@/lib/evidence-plan/evidence-plan-service').createEvidencePlan;
let updateEvidencePlan: typeof import('@/lib/evidence-plan/evidence-plan-service').updateEvidencePlan;
let createEvidencePlanAddendum: typeof import('@/lib/evidence-plan/evidence-plan-service').createEvidencePlanAddendum;
let getEvidencePlan: typeof import('@/lib/evidence-plan/evidence-plan-service').getEvidencePlan;
let getEvidencePlanForCommitment: typeof import('@/lib/evidence-plan/evidence-plan-service').getEvidencePlanForCommitment;
let reconstructLineage: typeof import('@/lib/evidence-plan/evidence-plan-service').reconstructLineage;

const OWNER = { actorRole: 'COMPANY_ADMIN', actorId: 'admin-1' };
const TENANT = 'tenant-1';
const OTHER_TENANT = 'tenant-2';

beforeEach(async () => {
  commitments = [
    { id: 'cm-own', tenant_id: TENANT, evidence_plan_id: null },
    { id: 'cm-other', tenant_id: OTHER_TENANT, evidence_plan_id: null },
  ];
  plans = [];
  addenda = [];
  idCounter = 0;
  recordGovernanceEventMock.mockClear();
  ({
    createEvidencePlan, updateEvidencePlan, createEvidencePlanAddendum,
    getEvidencePlan, getEvidencePlanForCommitment, reconstructLineage,
  } = await import('@/lib/evidence-plan/evidence-plan-service'));
});

// ═══════════════════════════════════════════════════════════════════════════
// createEvidencePlan()
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-021 — createEvidencePlan()', () => {
  it('creates a primary version, status="draft", and releases commitment.evidence_plan_id', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    expect(plan.status).toBe('draft');
    expect(plan.commitmentId).toBe('cm-own');
    expect(commitments.find((c) => c.id === 'cm-own')!.evidence_plan_id).toBe(plan.id);
  });

  it('rejects a commitment that does not belong to the tenant (cross-tenant)', async () => {
    await expect(createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-other', ...OWNER })).rejects.toThrow(/cross-tenant references are never allowed/);
  });

  it('rejects a non-existent commitment', async () => {
    await expect(createEvidencePlan({ tenantId: TENANT, commitmentId: 'nope', ...OWNER })).rejects.toThrow(/not found/);
  });

  it('rejects a second Evidence Plan for a commitment that already has one (1:1, doc 72 Lock 4)', async () => {
    await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    await expect(createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER })).rejects.toThrow(/already has a governing Evidence Plan lineage/);
  });

  // Narrowed by the KORA-WP-033 convergence remediation: doc 73 §6's own
  // Advisor drafting grant was wired in — ADVISOR is now a legitimate
  // primary-Evidence-Plan author (see tests/unit/kora-wp-033-convergence.
  // test.ts for the full Assignment-scoped behavior).
  it('rejects an actor that is neither COMPANY_ADMIN nor ADVISOR', async () => {
    await expect(createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft/);
  });

  it('accepts ADVISOR as a draft author (KORA-WP-033 convergence — actorRole alone is accepted here; real Assignment-validity gating happens one layer up, in advisor-decision-support-service.ts)', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', actorRole: 'ADVISOR', actorId: 'adv-1' });
    expect(plan.actorRole).toBe('ADVISOR');
  });

  it('records an evidence_plan.primary_created governance event', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'evidence_plan.primary_created', objectId: plan.id }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateEvidencePlan()
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-021 — updateEvidencePlan()', () => {
  it('patches only supplied fields', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', criteria: 'orig', ...OWNER });
    const updated = await updateEvidencePlan({ evidencePlanId: plan.id, tenantId: TENANT, reviewIntention: 'quarterly', ...OWNER });
    expect(updated.reviewIntention).toBe('quarterly');
    expect(updated.criteria).toBe('orig');
  });

  it('rejects an actor that is neither COMPANY_ADMIN nor ADVISOR', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    await expect(updateEvidencePlan({ evidencePlanId: plan.id, tenantId: TENANT, criteria: 'x', actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft/);
  });

  it('rejects a cross-tenant update', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    await expect(updateEvidencePlan({ evidencePlanId: plan.id, tenantId: OTHER_TENANT, criteria: 'x', ...OWNER })).rejects.toThrow(/not found/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createEvidencePlanAddendum() — the doc 72 §6 precondition
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-021 — createEvidencePlanAddendum() — requires a non-draft primary', () => {
  it('rejects an addendum while the primary is still draft (the correct consequence of doc 72 §6 today)', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    await expect(createEvidencePlanAddendum({
      evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-01-01', scope: 'Program indicator added', ...OWNER,
    })).rejects.toThrow(/cannot be created while its evidence_plan is still draft/);
  });

  it('succeeds once the primary is (artificially, for this test only) no longer draft, proving the mechanism itself', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    // No service function can do this — simulating what KORA-WP-022's own
    // future freeze-at-commit transition will eventually produce.
    plans[0].status = 'frozen-at-commit';

    const addendum = await createEvidencePlanAddendum({
      evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-03-01', scope: 'Program indicator added', content: 'measurement method improved', ...OWNER,
    });
    expect(addendum.evidencePlanId).toBe(plan.id);
    expect(addendum.extendsAddendumId).toBeNull();

    const second = await createEvidencePlanAddendum({
      evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-06-01', scope: 'further refinement', extendsAddendumId: addendum.id, ...OWNER,
    });
    expect(second.extendsAddendumId).toBe(addendum.id);
  });

  it('rejects a missing scope', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    plans[0].status = 'frozen-at-commit';
    await expect(createEvidencePlanAddendum({ evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-01-01', scope: '', ...OWNER })).rejects.toThrow(/scope is required/);
  });

  it('rejects an actor that is neither COMPANY_ADMIN nor ADVISOR', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    plans[0].status = 'frozen-at-commit';
    await expect(createEvidencePlanAddendum({ evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-01-01', scope: 'x', actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR may draft/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// reconstructLineage() — the WP-021 Acceptance criterion
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-021 — reconstructLineage() — Acceptance: "a Review can reconstruct which version applied"', () => {
  it('returns the primary plus every addendum, ordered by effective date', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', criteria: 'v1 criteria', ...OWNER });
    plans[0].status = 'frozen-at-commit';
    await createEvidencePlanAddendum({ evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-06-01', scope: 'later', ...OWNER });
    await createEvidencePlanAddendum({ evidencePlanId: plan.id, tenantId: TENANT, effectiveFrom: '2027-03-01', scope: 'earlier', ...OWNER });

    const lineage = await reconstructLineage(plan.id, TENANT);
    expect(lineage!.primary.criteria).toBe('v1 criteria');
    expect(lineage!.addenda.map((a) => a.scope)).toEqual(['earlier', 'later']);
  });

  it('returns null for a non-existent evidence plan', async () => {
    expect(await reconstructLineage('nope', TENANT)).toBeNull();
  });
});

describe('KORA-WP-021 — getEvidencePlan()', () => {
  it('finds the plan by its own id', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    const found = await getEvidencePlan(plan.id, TENANT);
    expect(found!.id).toBe(plan.id);
  });

  it('returns null for a non-existent id', async () => {
    expect(await getEvidencePlan('nope', TENANT)).toBeNull();
  });
});

describe('KORA-WP-021 — getEvidencePlanForCommitment()', () => {
  it('finds the plan by commitment id', async () => {
    const plan = await createEvidencePlan({ tenantId: TENANT, commitmentId: 'cm-own', ...OWNER });
    const found = await getEvidencePlanForCommitment('cm-own', TENANT);
    expect(found!.id).toBe(plan.id);
  });

  it('returns null when no plan exists yet', async () => {
    expect(await getEvidencePlanForCommitment('cm-own', TENANT)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-021 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/evidence-plan/evidence-plan-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/066_evidence_plan_lineage.sql'), 'utf-8');
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no commit/activate/approve function on Commitment (KORA-WP-022 boundary) — Evidence Plan availability never activates a Commitment', () => {
    expect(src).not.toMatch(/export async function commit\b|export async function activate|export async function approve/i);
    expect(codeOnly).not.toMatch(/status:\s*['"]committed['"]|status:\s*['"]active['"]/);
  });

  it('no Core Decision Linkage, Review, or Decision Pack logic (KORA-WP-023/024/025 boundary)', () => {
    expect(codeOnly).not.toMatch(/decision.?linkage|review.?(conclude|verdict|outcome)|decision.?pack/i);
  });

  it('no Advisor-facing function exists (KORA-WP-033 convergence, not this WP)', () => {
    expect(src).not.toMatch(/export async function \w*[Aa]dvisor/);
    expect(codeOnly).not.toMatch(/actorRole === 'ADVISOR'|actorRole==='ADVISOR'/);
  });

  it('no Worker-level reference anywhere', () => {
    expect(codeOnly).not.toMatch(/worker_id|workerId|worker_ref/i);
    expect(migrationSrc).not.toMatch(/worker_id|worker_ref/i);
  });

  it('no Living KORAL anticipation', () => {
    expect(codeOnly).not.toMatch(/living.?koral|material.?change|morpholog/i);
  });

  it('migration pins evidence_plan.status to draft-only, and releases exactly commitment.evidence_plan_id (not opportunity_id/program_id)', () => {
    expect(migrationSrc).toMatch(/status\s+text\s+NOT NULL DEFAULT 'draft' CHECK \(status = 'draft'\)/);
    expect(migrationSrc).toMatch(/DROP CONSTRAINT commitment_evidence_plan_id_check/);
    expect(migrationSrc).not.toMatch(/DROP CONSTRAINT commitment_opportunity_id_check/);
    expect(migrationSrc).not.toMatch(/DROP CONSTRAINT commitment_program_id_check/);
  });

  it('migration grants exactly SELECT+INSERT (never UPDATE/DELETE) on evidence_plan_addendum — append-only', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT ON analytics\.evidence_plan_addendum TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT.*UPDATE.*ON analytics\.evidence_plan_addendum/);
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON analytics\.evidence_plan_addendum/);
  });

  it('migration has both the tenant/draft-precondition trigger and the unconditional no-mutation trigger on addenda', () => {
    expect(migrationSrc).toMatch(/trg_evidence_plan_addendum_invariants/);
    expect(migrationSrc).toMatch(/trg_evidence_plan_addendum_no_mutation/);
    expect(migrationSrc).toMatch(/BEFORE UPDATE OR DELETE ON analytics\.evidence_plan_addendum/);
  });

  // Renamed by the KORA-WP-033 convergence (assertDecisionOwner ->
  // assertAuthorizedDraftAuthor) — the check itself is still unconditional
  // on every mutator below, now widened to COMPANY_ADMIN or ADVISOR;
  // freezing has no function in this file to gate in the first place.
  it('every mutating function requires an authorized draft author (COMPANY_ADMIN or ADVISOR)', () => {
    const mutators = ['createEvidencePlan', 'updateEvidencePlan', 'createEvidencePlanAddendum'];
    for (const fn of mutators) {
      const match = src.match(new RegExp(`export async function ${fn}[\\s\\S]*?\\n\\}`));
      expect(match, `${fn} not found`).not.toBeNull();
      expect(match![0]).toMatch(/assertAuthorizedDraftAuthor/);
    }
  });
});
