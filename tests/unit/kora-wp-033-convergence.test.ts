/**
 * KORA-WP-033 CONVERGENCE — Advisor Decision-Spine Support.
 *
 * Behavioral tests of the REAL functions from
 * lib/advisor-portal/advisor-decision-support-service.ts, layered on the
 * REAL, unmocked lib/commitment/commitment-service.ts,
 * lib/evidence-plan/evidence-plan-service.ts, lib/review/review-service.ts
 * and lib/decision-linkage/decision-linkage-service.ts — only the Supabase
 * I/O boundary and the governance substrate are mocked, same technique as
 * kora-wp-034-advisor-cases.test.ts.
 *
 * No migration in this remediation (Data/Migration Impact: NONE — see the
 * implementation report): the existing actor_role/actor_id columns on
 * commitment/evidence_plan/evidence_plan_addendum/review already anticipate
 * a non-COMPANY_ADMIN author; service_role already bypasses RLS for every
 * write in this schema (the app-level check IS the boundary, same
 * discipline as every other Lane-B primitive).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── in-memory tables ─────────────────────────────────────────────────────

interface AssignmentRow { id: string; advisor_id: string; company_id: string; role: string; status: string; conflict_flag: boolean; }
interface IdentityRow { id: string; status: string; }
interface QualificationRow { id: string; advisor_id: string; role: string; status: string; }
interface EligibilityRow { id: string; role_qualification_id: string; status: string; expiry_date: string | null; }
interface CommitmentRow {
  id: string; tenant_id: string; status: string; ready_for_decision: boolean;
  problem_objective: string; population: string | null; options_considered: string[];
  proposed_choice: string | null; rationale: string | null; evidence_available_missing: string | null;
  expected_outcome: string | null; capacity_delivery_context: string | null; amount: number | null;
  horizon: string | null; review_date: string | null; owner_role: string; evidence_plan_id: string | null;
  opportunity_id: null; program_id: null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}
interface EvidencePlanRow {
  id: string; tenant_id: string; commitment_id: string; status: string;
  evidence_expectations: string | null; criteria: string | null; confidence_quality_expectations: string | null;
  review_intention: string | null; known_missing_at_decision: string | null;
  actor_role: string; actor_id: string; created_at: string; updated_at: string;
}
interface AddendumRow {
  id: string; tenant_id: string; evidence_plan_id: string; extends_addendum_id: string | null;
  effective_from: string; scope: string; content: string | null;
  actor_role: string; actor_id: string; created_at: string;
}
interface ResourceRefRow { tenant_id: string; commitment_id: string; resource_allocation_entry_id: string; }
interface ResourceAllocationRow { id: string; tenant_id: string; }
interface ReviewRow {
  id: string; tenant_id: string; commitment_id: string; status: string;
  opened_at: string; concluded_at: string | null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}

let assignments: AssignmentRow[] = [];
let identities: IdentityRow[] = [];
let qualifications: QualificationRow[] = [];
let eligibilities: EligibilityRow[] = [];
let commitments: CommitmentRow[] = [];
let evidencePlans: EvidencePlanRow[] = [];
let addenda: AddendumRow[] = [];
let resourceRefs: ResourceRefRow[] = [];
let resourceAllocations: ResourceAllocationRow[] = [];
let reviews: ReviewRow[] = [];
let idCounter = 0;

const NOW = '2026-09-15T00:00:00.000Z';
const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: NOW }));

function genericChain<T>(rows: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => rows().filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
  const chain = {
    eq(col: string, val: unknown) { return genericChain(rows, { ...filters, [col]: val }); },
    order(_col: string, _opts?: { ascending?: boolean }) { return chain; },
    limit(_n: number) { return chain; },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    single: async () => (matches()[0] ? { data: matches()[0], error: null } : { data: null, error: { message: 'no rows' } }),
    then(resolve: (v: { data: T[]; error: null }) => void) { resolve({ data: matches(), error: null }); },
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') {
          return { select: () => genericChain(() => assignments) };
        }
        if (schemaName === 'advisor' && table === 'advisor_identity') {
          return { select: () => genericChain(() => identities) };
        }
        if (schemaName === 'advisor' && table === 'advisor_role_qualification') {
          return { select: () => genericChain(() => qualifications) };
        }
        if (schemaName === 'advisor' && table === 'advisor_prerequisite_eligibility') {
          return { select: () => genericChain(() => eligibilities) };
        }
        if (schemaName === 'analytics' && table === 'commitment') {
          return {
            select: () => genericChain(() => commitments),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: CommitmentRow = {
                    id: `cm-${++idCounter}`, tenant_id: payload.tenant_id as string, status: 'draft',
                    ready_for_decision: false, problem_objective: payload.problem_objective as string,
                    population: (payload.population as string) ?? null,
                    options_considered: (payload.options_considered as string[]) ?? [],
                    proposed_choice: (payload.proposed_choice as string) ?? null,
                    rationale: (payload.rationale as string) ?? null,
                    evidence_available_missing: (payload.evidence_available_missing as string) ?? null,
                    expected_outcome: (payload.expected_outcome as string) ?? null,
                    capacity_delivery_context: (payload.capacity_delivery_context as string) ?? null,
                    amount: (payload.amount as number) ?? null, horizon: (payload.horizon as string) ?? null,
                    review_date: (payload.review_date as string) ?? null,
                    owner_role: payload.owner_role as string, evidence_plan_id: null,
                    opportunity_id: null, program_id: null,
                    actor_role: payload.actor_role as string, actor_id: payload.actor_id as string,
                    created_at: NOW, updated_at: NOW,
                  };
                  commitments.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const row = commitments.find((c) => (c as unknown as Record<string, unknown>)[col1] === val1 && (c as unknown as Record<string, unknown>)[col2] === val2);
                  if (row) Object.assign(row, payload);
                  return { data: null, error: null };
                },
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'evidence_plan') {
          return {
            select: () => genericChain(() => evidencePlans),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: EvidencePlanRow = {
                    id: `ep-${++idCounter}`, tenant_id: payload.tenant_id as string,
                    commitment_id: payload.commitment_id as string, status: 'draft',
                    evidence_expectations: (payload.evidence_expectations as string) ?? null,
                    criteria: (payload.criteria as string) ?? null,
                    confidence_quality_expectations: (payload.confidence_quality_expectations as string) ?? null,
                    review_intention: (payload.review_intention as string) ?? null,
                    known_missing_at_decision: (payload.known_missing_at_decision as string) ?? null,
                    actor_role: payload.actor_role as string, actor_id: payload.actor_id as string,
                    created_at: NOW, updated_at: NOW,
                  };
                  evidencePlans.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const row = evidencePlans.find((p) => (p as unknown as Record<string, unknown>)[col1] === val1 && (p as unknown as Record<string, unknown>)[col2] === val2);
                  if (row) Object.assign(row, payload);
                  return { data: null, error: null };
                },
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'evidence_plan_addendum') {
          return {
            select: () => genericChain(() => addenda),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: AddendumRow = {
                    id: `epa-${++idCounter}`, tenant_id: payload.tenant_id as string,
                    evidence_plan_id: payload.evidence_plan_id as string,
                    extends_addendum_id: (payload.extends_addendum_id as string) ?? null,
                    effective_from: payload.effective_from as string, scope: payload.scope as string,
                    content: (payload.content as string) ?? null,
                    actor_role: payload.actor_role as string, actor_id: payload.actor_id as string,
                    created_at: NOW,
                  };
                  addenda.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'commitment_resource_reference') {
          return {
            select: () => genericChain(() => resourceRefs),
            insert: async (payload: Record<string, unknown>) => {
              resourceRefs.push({
                tenant_id: payload.tenant_id as string, commitment_id: payload.commitment_id as string,
                resource_allocation_entry_id: payload.resource_allocation_entry_id as string,
              });
              return { data: null, error: null };
            },
            delete: () => ({
              eq: (col1: string, val1: unknown) => ({
                eq: (col2: string, val2: unknown) => ({
                  eq: async (col3: string, val3: unknown) => {
                    resourceRefs = resourceRefs.filter((r) => !((r as unknown as Record<string, unknown>)[col1] === val1 && (r as unknown as Record<string, unknown>)[col2] === val2 && (r as unknown as Record<string, unknown>)[col3] === val3));
                    return { data: null, error: null };
                  },
                }),
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'resource_allocation') {
          return { select: () => genericChain(() => resourceAllocations) };
        }
        if (schemaName === 'analytics' && table === 'review') {
          return {
            select: () => genericChain(() => reviews),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: ReviewRow = {
                    id: `rv-${++idCounter}`, tenant_id: payload.tenant_id as string,
                    commitment_id: payload.commitment_id as string, status: 'open',
                    opened_at: NOW, concluded_at: null,
                    actor_role: payload.actor_role as string, actor_id: payload.actor_id as string,
                    created_at: NOW, updated_at: NOW,
                  };
                  reviews.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const row = reviews.find((r) => (r as unknown as Record<string, unknown>)[col1] === val1 && (r as unknown as Record<string, unknown>)[col2] === val2);
                  if (row) Object.assign(row, payload);
                  return { data: null, error: null };
                },
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'commitment_decision_trace') {
          // A faithful re-derivation of migration 069/070's own view logic
          // over the SAME in-memory rows — never a second source of truth,
          // matching WP-023's own test file's documented approach.
          const derived = () => commitments.map((c) => {
            const ep = evidencePlans.find((p) => p.commitment_id === c.id) ?? null;
            const refs = resourceRefs.filter((r) => r.commitment_id === c.id).map((r) => r.resource_allocation_entry_id);
            const rv = reviews.filter((r) => r.commitment_id === c.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
            return {
              commitment_id: c.id, tenant_id: c.tenant_id, commitment_status: c.status,
              evidence_plan_id: ep?.id ?? null, evidence_plan_status: ep?.status ?? null,
              resource_allocation_entry_ids: refs, mvb_manifest_id: null,
              review_id: rv?.id ?? null, review_status: rv?.status ?? null,
            };
          });
          return { select: () => genericChain(derived) };
        }
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

// ── seed helpers ─────────────────────────────────────────────────────────

function seedValidAdvisor(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  const assignment: AssignmentRow = {
    id: overrides.id ?? 'assign-1', advisor_id: overrides.advisor_id ?? 'adv-1',
    company_id: overrides.company_id ?? 'company-1', role: overrides.role ?? 'Company Advisor',
    status: overrides.status ?? 'active', conflict_flag: overrides.conflict_flag ?? false,
  };
  assignments.push(assignment);
  identities.push({ id: assignment.advisor_id, status: 'active' });
  const q: QualificationRow = { id: `qual-${assignment.id}`, advisor_id: assignment.advisor_id, role: assignment.role, status: 'QUALIFIED' };
  qualifications.push(q);
  eligibilities.push({ id: `elig-${assignment.id}`, role_qualification_id: q.id, status: 'MET', expiry_date: null });
  return assignment;
}

function seedCommitment(overrides: Partial<CommitmentRow> = {}): CommitmentRow {
  const row: CommitmentRow = {
    id: overrides.id ?? `cm-${++idCounter}`, tenant_id: overrides.tenant_id ?? 'company-1', status: overrides.status ?? 'draft',
    ready_for_decision: overrides.ready_for_decision ?? false, problem_objective: overrides.problem_objective ?? 'Seed problem',
    population: null, options_considered: [], proposed_choice: null, rationale: null, evidence_available_missing: null,
    expected_outcome: null, capacity_delivery_context: null, amount: null, horizon: null, review_date: null,
    owner_role: 'COMPANY_ADMIN', evidence_plan_id: overrides.evidence_plan_id ?? null, opportunity_id: null, program_id: null,
    actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1', created_at: NOW, updated_at: NOW,
  };
  commitments.push(row);
  return row;
}

beforeEach(() => {
  assignments = []; identities = []; qualifications = []; eligibilities = [];
  commitments = []; evidencePlans = []; addenda = []; resourceRefs = []; resourceAllocations = []; reviews = [];
  idCounter = 0;
  recordGovernanceEventMock.mockClear();
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Commitment support
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — Commitment support', () => {
  it('a validly assigned Advisor can draft a Commitment', async () => {
    seedValidAdvisor();
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const c = await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'Advisor-drafted problem' });
    expect(c.status).toBe('draft');
    expect(c.tenantId).toBe('company-1');
    expect(c.actorRole).toBe('ADVISOR');
    expect(c.actorId).toBe('adv-1');
    // FT-019's own Decision Owner field always remains the Company, even
    // for an Advisor-drafted Commitment — actor ≠ owner.
    expect(c.ownerRole).toBe('COMPANY_ADMIN');
  });

  it('a validly assigned Advisor can edit their own drafted Commitment', async () => {
    seedValidAdvisor();
    const { draftCommitmentAsAdvisor, editCommitmentDraftAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const c = await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' });
    const edited = await editCommitmentDraftAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', commitmentId: c.id, rationale: 'Advisor rationale' });
    expect(edited.rationale).toBe('Advisor rationale');
  });

  it('a validly assigned Advisor can mark a draft "ready for decision" — soft, non-authoritative, never touches status', async () => {
    seedValidAdvisor();
    const { draftCommitmentAsAdvisor, markCommitmentReadyForDecisionAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const c = await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' });
    const marked = await markCommitmentReadyForDecisionAsAdvisor('assign-1', 'adv-1', c.id, true);
    expect(marked.readyForDecision).toBe(true);
    expect(marked.status).toBe('draft'); // never advanced
  });

  it('a validly assigned Advisor can link/unlink a Resource Allocation reference (informational only)', async () => {
    seedValidAdvisor();
    resourceAllocations.push({ id: 'ra-1', tenant_id: 'company-1' });
    const { draftCommitmentAsAdvisor, linkResourceAllocationEntryAsAdvisor, listLinkedResourceAllocationEntryIdsForAdvisor, unlinkResourceAllocationEntryAsAdvisor } =
      await import('@/lib/advisor-portal/advisor-decision-support-service');
    const c = await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' });
    await linkResourceAllocationEntryAsAdvisor('assign-1', 'adv-1', c.id, 'ra-1');
    expect(await listLinkedResourceAllocationEntryIdsForAdvisor('assign-1', 'adv-1', c.id)).toEqual(['ra-1']);
    await unlinkResourceAllocationEntryAsAdvisor('assign-1', 'adv-1', c.id, 'ra-1');
    expect(await listLinkedResourceAllocationEntryIdsForAdvisor('assign-1', 'adv-1', c.id)).toEqual([]);
  });

  it('an assigned Advisor can READ a Commitment authored by the Company Admin — no shadow copy, one shared truth', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-admin', tenant_id: 'company-1', problem_objective: 'Company-authored' });
    const { getCommitmentForAdvisor, listCommitmentsForAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const read = await getCommitmentForAdvisor('assign-1', 'adv-1', 'cm-admin');
    expect(read?.problemObjective).toBe('Company-authored');
    expect((await listCommitmentsForAdvisor('assign-1', 'adv-1')).length).toBe(1);
  });

  it('Company retains the Advisor-authored draft after the Assignment ends — no shadow database, Company-owned canonical history', async () => {
    const a = seedValidAdvisor();
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const c = await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' });
    a.status = 'ended';
    const { getCommitmentDraft } = await import('@/lib/commitment/commitment-service');
    const stillThere = await getCommitmentDraft(c.id, 'company-1');
    expect(stillThere?.problemObjective).toBe('p'); // Company's own (COMPANY_ADMIN) read path, unaffected by Assignment status
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Assignment scoping — denial matrix
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — Assignment scoping (non-negotiable)', () => {
  it('denies a caller who is not the Advisor party to the named Assignment', async () => {
    seedValidAdvisor();
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-2', problemObjective: 'p' }))
      .rejects.toThrow(/not the Advisor party/);
  });

  it('denies once the Assignment has ended (expired/invalid assignment)', async () => {
    const a = seedValidAdvisor();
    a.status = 'ended';
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' }))
      .rejects.toThrow(/not currently valid/);
  });

  it('denies when the Role Qualification is not QUALIFIED — full validity, not merely "assignment active"', async () => {
    const a = seedValidAdvisor();
    qualifications.find((q) => q.advisor_id === a.advisor_id)!.status = 'RENEWAL_DUE';
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' }))
      .rejects.toThrow(/not currently valid/);
  });

  it('denies when a conflict_flag is set on the Assignment', async () => {
    const a = seedValidAdvisor();
    a.conflict_flag = true;
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' }))
      .rejects.toThrow(/not currently valid/);
  });

  it('cross-tenant: an Advisor assigned to Company A cannot reach Company B\'s Commitment via a forged assignmentId/commitmentId pairing', async () => {
    seedValidAdvisor({ id: 'assign-a', advisor_id: 'adv-1', company_id: 'company-a' });
    seedCommitment({ id: 'cm-b', tenant_id: 'company-b' });
    const { getCommitmentForAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    // The wrapper always resolves tenantId from the Assignment itself
    // (never a caller-supplied value) — the underlying tenant-scoped read
    // structurally cannot find Company B's row through Company A's Assignment.
    expect(await getCommitmentForAdvisor('assign-a', 'adv-1', 'cm-b')).toBeNull();
  });

  it('access returns once a new valid Assignment exists (no permanent ban)', async () => {
    const a = seedValidAdvisor();
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    a.status = 'ended';
    await expect(draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' })).rejects.toThrow();
    a.status = 'active';
    const c = await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' });
    expect(c.status).toBe('draft');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Evidence Plan support
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — Evidence Plan Lineage support', () => {
  it('a validly assigned Advisor can draft the primary Evidence Plan for a Commitment', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1' });
    const { draftEvidencePlanAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const plan = await draftEvidencePlanAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', commitmentId: 'cm-1', criteria: 'Advisor-drafted criteria' });
    expect(plan.status).toBe('draft');
    expect(plan.actorRole).toBe('ADVISOR');
  });

  it('a validly assigned Advisor can edit the draft Evidence Plan', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1' });
    const { draftEvidencePlanAsAdvisor, editEvidencePlanDraftAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const plan = await draftEvidencePlanAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', commitmentId: 'cm-1' });
    const edited = await editEvidencePlanDraftAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', evidencePlanId: plan.id, evidenceExpectations: 'x' });
    expect(edited.evidenceExpectations).toBe('x');
  });

  it('a validly assigned Advisor can draft an addendum once the primary is frozen (post-commit only — WP-021\'s own invariant, unchanged)', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1' });
    const { draftEvidencePlanAsAdvisor, createEvidencePlanAddendumAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const plan = await draftEvidencePlanAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', commitmentId: 'cm-1' });
    // Manually relax status to simulate a post-commit state, exactly as
    // KORA-WP-021's own real-DB validation does — no addendum can
    // legitimately exist yet in a system where nothing has been committed.
    evidencePlans.find((p) => p.id === plan.id)!.status = 'frozen-at-commit';
    const addendum = await createEvidencePlanAddendumAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', evidencePlanId: plan.id,
      effectiveFrom: '2026-10-01', scope: 'Advisor-proposed addendum',
    });
    expect(addendum.scope).toBe('Advisor-proposed addendum');
    expect(addendum.actorRole).toBe('ADVISOR');
  });

  it('an addendum before freeze is still rejected — WP-021\'s own precondition, untouched by this convergence', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1' });
    const { draftEvidencePlanAsAdvisor, createEvidencePlanAddendumAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const plan = await draftEvidencePlanAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', commitmentId: 'cm-1' });
    await expect(createEvidencePlanAddendumAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', evidencePlanId: plan.id, effectiveFrom: '2026-10-01', scope: 'x',
    })).rejects.toThrow(/cannot be created while its evidence_plan is still draft/);
  });

  it('an unassigned Advisor cannot read or draft an Evidence Plan', async () => {
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1' });
    const { draftEvidencePlanAsAdvisor, getEvidencePlanForAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(draftEvidencePlanAsAdvisor({ assignmentId: 'no-such', callerAdvisorId: 'adv-1', commitmentId: 'cm-1' })).rejects.toThrow();
    await expect(getEvidencePlanForAdvisor('no-such', 'adv-1', 'ep-1')).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Review support (open / in-progress only — no narrative storage)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — Review support (SUPPORT-REVIEW scaffolding)', () => {
  it('a validly assigned Advisor can open a Review against a committed Commitment', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1', status: 'committed' });
    const { openReviewAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const review = await openReviewAsAdvisor('assign-1', 'adv-1', 'cm-1');
    expect(review.status).toBe('open');
    expect(review.actorRole).toBe('ADVISOR');
  });

  it('a validly assigned Advisor can move a Review to in-progress', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1', status: 'committed' });
    const { openReviewAsAdvisor, markReviewInProgressAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const review = await openReviewAsAdvisor('assign-1', 'adv-1', 'cm-1');
    const progressed = await markReviewInProgressAsAdvisor('assign-1', 'adv-1', review.id);
    expect(progressed.status).toBe('in-progress');
  });

  it('a Review may not be opened against a still-draft Commitment — WP-024\'s own precondition, untouched', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1', status: 'draft' });
    const { openReviewAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(openReviewAsAdvisor('assign-1', 'adv-1', 'cm-1')).rejects.toThrow(/not committed/);
  });

  it('this module exposes no way for an Advisor to conclude a Review — no such export exists', async () => {
    const mod = await import('@/lib/advisor-portal/advisor-decision-support-service');
    expect((mod as Record<string, unknown>).concludeReviewAsAdvisor).toBeUndefined();
    expect(Object.keys(mod).some((k) => /conclude/i.test(k))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 5 — Core Decision Linkage read (KORA-WP-023)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — Core Decision Linkage read', () => {
  it('an assigned Advisor can read the same traceability view the Company sees', async () => {
    seedValidAdvisor();
    seedCommitment({ id: 'cm-1', tenant_id: 'company-1', status: 'committed' });
    const { getDecisionTraceForAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const trace = await getDecisionTraceForAdvisor('assign-1', 'adv-1', 'cm-1');
    expect(trace?.commitmentId).toBe('cm-1');
    expect(trace?.commitmentStatus).toBe('committed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 6 — Constitutive denial — defense in depth (structural, not merely runtime)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — constitutive denial (structural)', () => {
  const wrapperSrc = readFileSync(join(process.cwd(), 'lib/advisor-portal/advisor-decision-support-service.ts'), 'utf8');
  // Import statements only — excludes the file's own header prose, which
  // legitimately discusses (without importing) the forbidden identifiers to
  // disclose exactly why they are absent.
  const importLines = wrapperSrc.split('\n').filter((l) => l.trim().startsWith('import')).join('\n');
  const codeOnly = wrapperSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('the wrapper never imports commit_commitment/commit-activation-service — physically cannot reach it', () => {
    expect(importLines).not.toMatch(/commit-activation-service|commit_commitment|commitCommitment/);
  });

  it('the wrapper never imports concludeReview — physically cannot reach it', () => {
    expect(importLines).not.toMatch(/concludeReview/);
  });

  it('the wrapper never writes evidence_plan.status directly, and freeze has no exported path', () => {
    expect(codeOnly).not.toMatch(/frozen-at-commit/);
  });

  it('commitment-service.ts\'s own COMPANY_ADMIN check still rejects an unrecognized role outright', async () => {
    const { createCommitmentDraft } = await import('@/lib/commitment/commitment-service');
    await expect(createCommitmentDraft({ tenantId: 'company-1', actorRole: 'WORKER', actorId: 'w1', problemObjective: 'p' }))
      .rejects.toThrow(/only COMPANY_ADMIN or an assignment-verified ADVISOR/);
  });

  it('review-service.ts\'s own concludeReview keeps its original, untouched, COMPANY_ADMIN-only check', async () => {
    const { concludeReview, REVIEW_VERDICTS } = await import('@/lib/review/review-service');
    await expect(concludeReview({
      reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1',
      actualDecision: 'x', effectiveDate: '2026-10-01', verdict: REVIEW_VERDICTS[0],
    })).rejects.toThrow(/only COMPANY_ADMIN may conclude a Review/);
  });

  it('COMPANY_ADMIN itself remains fully unaffected by the widened check (regression)', async () => {
    const { createCommitmentDraft } = await import('@/lib/commitment/commitment-service');
    const c = await createCommitmentDraft({ tenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'admin-1', problemObjective: 'p' });
    expect(c.status).toBe('draft');
    expect(c.actorRole).toBe('COMPANY_ADMIN');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 7 — Privacy / provenance / scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 convergence — privacy, provenance, scope integrity', () => {
  const wrapperSrc = readFileSync(join(process.cwd(), 'lib/advisor-portal/advisor-decision-support-service.ts'), 'utf8');
  const codeOnly = wrapperSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no Worker-level reference anywhere in the wrapper', () => {
    expect(codeOnly).not.toMatch(/worker_id|workerId|worker_ref|PIB|pib_/i);
  });

  it('no KPI/Measure bridge, no KORA Index/IU/Confidence/BTI reference (this convergence never implements it)', () => {
    expect(codeOnly).not.toMatch(/kora.?index|confidence.?score|\bIU\b|kpi|\bbti\b/i);
  });

  it('governance events attribute ADVISOR truthfully, never impersonating COMPANY_ADMIN', async () => {
    seedValidAdvisor();
    const { draftCommitmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await draftCommitmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', problemObjective: 'p' });
    const calls = recordGovernanceEventMock.mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(calls.some((c) => c.eventType === 'commitment.draft_created' && c.actorRole === 'ADVISOR' && c.actorId === 'adv-1')).toBe(true);
  });

  it('no new migration/schema — every read/write reuses KORA-WP-015/020/021/023/024\'s own tables, no CREATE TABLE anywhere in this file', () => {
    expect(wrapperSrc).not.toMatch(/CREATE TABLE/i);
  });
});
