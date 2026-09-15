/**
 * KORA-WP-025 — Decision Pack Extension (CORE-012, MODIFY).
 *
 * Registry 142: "existing Decision Pack reflects real Commitment/Linkage
 * data... Proposed New: N/A — read-layer extension only." Behavioral
 * tests of the REAL lib/decision-pack/decision-spine.ts composition,
 * layered on the REAL, unmocked commitment/evidence-plan/review/
 * review-advisor-proposal/decision-linkage services — only the Supabase
 * I/O boundary is mocked, same technique as kora-wp-033-*.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface CommitmentRow {
  id: string; tenant_id: string; status: string; ready_for_decision: boolean;
  problem_objective: string; population: string | null; options_considered: string[];
  proposed_choice: string | null; rationale: string | null;
  evidence_available_missing: string | null; expected_outcome: string | null;
  capacity_delivery_context: string | null; amount: number | null; horizon: string | null;
  review_date: string | null; owner_role: string; evidence_plan_id: string | null;
  opportunity_id: string | null; program_id: string | null;
  actor_role: string; actor_id: string; created_at: string; updated_at: string;
}
interface EvidencePlanRow {
  id: string; tenant_id: string; commitment_id: string; status: string;
  evidence_expectations: string | null; criteria: string | null;
  confidence_quality_expectations: string | null; review_intention: string | null;
  known_missing_at_decision: string | null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}
interface ReviewRow {
  id: string; tenant_id: string; commitment_id: string; status: string;
  opened_at: string; concluded_at: string | null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}
interface ReviewEventRow {
  id: string; tenant_id: string; review_id: string; indicated_decision: string | null;
  actual_decision: string; rationale_category: string | null; intervention: string | null;
  effective_date: string; supersedes: string | null; decision_owner: string;
  verdict: string; actor_role: string; actor_id: string; created_at: string;
}
interface ProposalRow {
  id: string; tenant_id: string; review_id: string; proposal_narrative: string | null;
  proposed_verdict: string | null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}
interface TraceRow {
  commitment_id: string; tenant_id: string; commitment_status: string;
  evidence_plan_id: string | null; evidence_plan_status: string | null;
  resource_allocation_entry_ids: string[] | null; mvb_manifest_id: string | null;
  review_id: string | null; review_status: string | null;
}

let commitments: CommitmentRow[] = [];
let evidencePlans: EvidencePlanRow[] = [];
let reviews: ReviewRow[] = [];
let reviewEvents: ReviewEventRow[] = [];
let proposals: ProposalRow[] = [];
let traces: TraceRow[] = [];

const NOW = '2026-09-16T00:00:00.000Z';
const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

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
        if (schemaName === 'analytics' && table === 'commitment') return { select: () => genericChain(() => commitments) };
        if (schemaName === 'analytics' && table === 'evidence_plan') return { select: () => genericChain(() => evidencePlans) };
        if (schemaName === 'analytics' && table === 'review') return { select: () => genericChain(() => reviews) };
        if (schemaName === 'analytics' && table === 'review_event') return { select: () => genericChain(() => reviewEvents) };
        if (schemaName === 'analytics' && table === 'review_advisor_proposal') return { select: () => genericChain(() => proposals) };
        if (schemaName === 'analytics' && table === 'commitment_decision_trace') return { select: () => genericChain(() => traces) };
        throw new Error(`[test] unexpected schema/table: ${schemaName}.${table}`);
      },
    }),
  }),
}));

import { getDecisionSpineForTenant } from '@/lib/decision-pack/decision-spine';

function seedFullSpine() {
  commitments = [{
    id: 'commit-1', tenant_id: TENANT_A, status: 'committed', ready_for_decision: true,
    problem_objective: 'Reduce onboarding friction', population: 'New hires', options_considered: ['A', 'B'],
    proposed_choice: 'Option B — staged onboarding', rationale: 'Higher activation in pilot cohort',
    evidence_available_missing: null, expected_outcome: 'Faster activation', capacity_delivery_context: null,
    amount: 15000, horizon: 'Q3 2026', review_date: null, owner_role: 'COMPANY_ADMIN',
    evidence_plan_id: 'ep-1', opportunity_id: null, program_id: null,
    actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1', created_at: NOW, updated_at: NOW,
  }];
  evidencePlans = [{
    id: 'ep-1', tenant_id: TENANT_A, commitment_id: 'commit-1', status: 'active',
    evidence_expectations: 'Activation rate uplift within 90 days', criteria: 'AR +10pp vs baseline',
    confidence_quality_expectations: null, review_intention: 'Quarterly', known_missing_at_decision: 'Long-term retention unknown',
    actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1', created_at: NOW, updated_at: NOW,
  }];
  reviews = [{
    id: 'review-1', tenant_id: TENANT_A, commitment_id: 'commit-1', status: 'concluded',
    opened_at: NOW, concluded_at: NOW, actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1',
    created_at: NOW, updated_at: NOW,
  }];
  reviewEvents = [{
    id: 'event-1', tenant_id: TENANT_A, review_id: 'review-1', indicated_decision: null,
    actual_decision: 'KEEP', rationale_category: null, intervention: null, effective_date: NOW,
    supersedes: null, decision_owner: 'admin-1', verdict: 'KEEP',
    actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1', created_at: NOW,
  }];
  proposals = [{
    id: 'prop-1', tenant_id: TENANT_A, review_id: 'review-1',
    proposal_narrative: 'Evidence supports continuation; recommend KEEP with tighter monitoring.',
    proposed_verdict: 'MODIFY', // deliberately DIFFERENT from the final verdict (KEEP) — proves non-authority
    actor_role: 'ADVISOR', actor_id: 'advisor-1', created_at: NOW, updated_at: NOW,
  }];
  traces = [{
    commitment_id: 'commit-1', tenant_id: TENANT_A, commitment_status: 'committed',
    evidence_plan_id: 'ep-1', evidence_plan_status: 'active',
    resource_allocation_entry_ids: ['ra-1', 'ra-2'], mvb_manifest_id: 'mvb-1',
    review_id: 'review-1', review_status: 'concluded',
  }];
}

beforeEach(() => {
  commitments = []; evidencePlans = []; reviews = []; reviewEvents = []; proposals = []; traces = [];
});

describe('KORA-WP-025 — Decision Spine composition (A: canonical pack composition)', () => {
  it('assembles a full entry from Commitment + trace + Evidence Plan + Review + Review Event + Advisor Proposal', async () => {
    seedFullSpine();
    const spine = await getDecisionSpineForTenant(TENANT_A);
    expect(spine).toHaveLength(1);
    const entry = spine[0];
    expect(entry.commitmentId).toBe('commit-1');
    expect(entry.commitmentStatus).toBe('committed');
    expect(entry.problemObjective).toBe('Reduce onboarding friction');
    expect(entry.proposedChoice).toBe('Option B — staged onboarding');
    expect(entry.resourceAllocationEntryCount).toBe(2);
    expect(entry.mvbManifestPresent).toBe(true);
    expect(entry.evidencePlan?.id).toBe('ep-1');
    expect(entry.evidencePlan?.status).toBe('active');
    expect(entry.review?.id).toBe('review-1');
    expect(entry.review?.status).toBe('concluded');
  });
});

describe('B/C: tenant scoping', () => {
  it('never returns another tenant\'s Commitments, even with identical ids in play', async () => {
    seedFullSpine();
    // Add a same-shaped Commitment for tenant B
    commitments.push({ ...commitments[0], id: 'commit-2', tenant_id: TENANT_B });
    const spineA = await getDecisionSpineForTenant(TENANT_A);
    const spineB = await getDecisionSpineForTenant(TENANT_B);
    expect(spineA.map(e => e.commitmentId)).toEqual(['commit-1']);
    expect(spineB.map(e => e.commitmentId)).toEqual(['commit-2']);
  });

  it('an empty tenant yields an empty array, never another tenant\'s data', async () => {
    seedFullSpine();
    const spine = await getDecisionSpineForTenant('tenant-nonexistent');
    expect(spine).toEqual([]);
  });
});

describe('D/E/F: Decision Owner authority preserved — Advisor Proposal remains consultative', () => {
  it('finalVerdict comes ONLY from the Review Event, never from the Advisor Proposal', async () => {
    seedFullSpine(); // review_event.verdict = KEEP, advisor proposal proposes MODIFY (deliberately different)
    const spine = await getDecisionSpineForTenant(TENANT_A);
    const review = spine[0].review!;
    expect(review.finalVerdict).toBe('KEEP'); // from review_event, not the advisor's MODIFY
    expect(review.advisorProposal?.proposedVerdict).toBe('MODIFY');
    expect(review.advisorProposal?.isAdvisorProposal).toBe(true);
  });

  it('finalVerdict is null while the Review has not concluded, regardless of an existing Advisor Proposal', async () => {
    seedFullSpine();
    reviews[0].status = 'in_progress';
    reviews[0].concluded_at = null;
    reviewEvents = []; // no event yet — nothing to conclude from
    const spine = await getDecisionSpineForTenant(TENANT_A);
    const review = spine[0].review!;
    expect(review.finalVerdict).toBeNull();
    expect(review.status).toBe('in_progress');
    expect(review.advisorProposal?.proposedVerdict).toBe('MODIFY'); // proposal still visible, still not authoritative
  });

  it('the DecisionSpineAdvisorProposal shape is structurally tagged non-authoritative', async () => {
    seedFullSpine();
    const spine = await getDecisionSpineForTenant(TENANT_A);
    expect(spine[0].review?.advisorProposal).toMatchObject({ isAdvisorProposal: true });
  });
});

describe('G: missing optional data handled safely', () => {
  it('a Commitment with no Evidence Plan, no Review, no trace row produces a safe partial entry', async () => {
    commitments = [{
      id: 'commit-solo', tenant_id: TENANT_A, status: 'draft', ready_for_decision: false,
      problem_objective: 'Solo draft, nothing linked yet', population: null, options_considered: [],
      proposed_choice: null, rationale: null, evidence_available_missing: null, expected_outcome: null,
      capacity_delivery_context: null, amount: null, horizon: null, review_date: null,
      owner_role: 'COMPANY_ADMIN', evidence_plan_id: null, opportunity_id: null, program_id: null,
      actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1', created_at: NOW, updated_at: NOW,
    }];
    // no evidencePlans, reviews, proposals, or traces seeded
    const spine = await getDecisionSpineForTenant(TENANT_A);
    expect(spine).toHaveLength(1);
    expect(spine[0].evidencePlan).toBeNull();
    expect(spine[0].review).toBeNull();
    expect(spine[0].resourceAllocationEntryCount).toBe(0);
    expect(spine[0].mvbManifestPresent).toBe(false);
  });
});

describe('H: incomplete Decision Spine handled per canonical rules', () => {
  it('fetchPdfData sets decisionSpine to null (not []) when the tenant has zero Commitments — same convention as bti/enrichment', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/decision-pack/pdf-data.ts'), 'utf-8');
    expect(src).toContain("decisionSpine = spine.length > 0 ? spine : null");
  });
});

describe('I: no Worker/PIB leakage', () => {
  it('decision-spine.ts code (excluding comments) never references worker identity, PIB, or individual-level fields', () => {
    const src = readFileSync(join(process.cwd(), 'lib/decision-pack/decision-spine.ts'), 'utf-8');
    const codeOnly = src.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    for (const forbidden of ['worker_id', 'workerId', 'worker_identity', 'workerPseudonymId']) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });

  it('none of the composed entry fields carry an individual worker identifier', async () => {
    seedFullSpine();
    const spine = await getDecisionSpineForTenant(TENANT_A);
    const json = JSON.stringify(spine);
    expect(json).not.toMatch(/worker/i);
  });
});

describe('J: audit/provenance — no parallel audit ledger', () => {
  it('decision-spine.ts never writes to audit_log or governance_event (read-only composition, registry Audit: N/A)', () => {
    const src = readFileSync(join(process.cwd(), 'lib/decision-pack/decision-spine.ts'), 'utf-8');
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toContain('audit_log');
    expect(src).not.toContain('governance_event');
  });
});

describe('L: deterministic output', () => {
  it('calling getDecisionSpineForTenant twice with the same fixture returns equal data', async () => {
    seedFullSpine();
    const first = await getDecisionSpineForTenant(TENANT_A);
    const second = await getDecisionSpineForTenant(TENANT_A);
    expect(first).toEqual(second);
  });
});

describe('M: neutral treatment of delivery path', () => {
  it('never surfaces opportunityId/programId as a preference signal — both remain structurally null upstream', async () => {
    seedFullSpine();
    const spine = await getDecisionSpineForTenant(TENANT_A);
    const json = JSON.stringify(spine);
    expect(json).not.toMatch(/prime/i);
    expect(json).not.toMatch(/preferred/i);
  });

  it('html-template Decision Spine section never mentions Prime, KORA Space, or a delivery-path preference', () => {
    const src = readFileSync(join(process.cwd(), 'lib/decision-pack/html-template.ts'), 'utf-8');
    const dsSectionStart = src.indexOf('Decision Spine — Commitment');
    const dsSectionEnd = src.indexOf('B18 — Reporting Alignment');
    expect(dsSectionStart).toBeGreaterThan(-1);
    expect(dsSectionEnd).toBeGreaterThan(dsSectionStart);
    const section = src.slice(dsSectionStart, dsSectionEnd);
    expect(section).not.toMatch(/prime/i);
    expect(section).not.toMatch(/kora space/i);
  });
});

describe('N: Confidence not confused with impact magnitude', () => {
  it('decision-spine.ts never imports or references koraIndex, IU, confidence, or scoring computation', () => {
    const src = readFileSync(join(process.cwd(), 'lib/decision-pack/decision-spine.ts'), 'utf-8');
    for (const forbidden of ['kora_index', 'koraIndex', 'impact_unit', 'confidence_result', 'computeExecutiveIntelligence']) {
      expect(src).not.toContain(forbidden);
    }
  });
});

describe('K: PDF/data parity — html-template renders exactly the composed data', () => {
  it('renders the final verdict (not the Advisor proposal) as the authoritative badge, and labels the Advisor block consultative', async () => {
    const { buildDecisionPackHtml } = await import('@/lib/decision-pack/html-template');
    const { getNormativeMappingLight } = await import('@/lib/normative-mapping/normative-mapping-light');
    seedFullSpine();
    const spine = await getDecisionSpineForTenant(TENANT_A);

    const fixture = {
      meta: {
        tenantCode: 'T-A', companyName: 'Tenant A Co', reportingPeriod: '2026-Q3', generatedAt: NOW,
        decisionPackVersionId: 'v1', decisionPackId: 'dp-1', decisionPackStatus: 'ready',
        isLiveData: true, notCertification: true as const, methodologyNote: 'test',
      },
      koraIndex: {
        value: 50, safeguardStatus: 'CLEAR', confidenceScore: 0.7, activationRate: 0.5,
        meaningfulActivationRate: 0.4, calibrationStatus: 'pre_empirical_calibration',
        methodologyVersionId: 'v0.1', isCurrent: true, createdAt: NOW, componentCount: 10,
      },
      methodologySnapshot: null, components: null, macroblocks: null, pillarDistribution: null,
      bti: null, enrichment: null, reportingAlignment: null, reportingReadiness: null,
      iuSummary: null, pibAggregation: null, auditSummary: [], executiveBrief: null,
      normativeMappingLight: getNormativeMappingLight(), contributionSummary: null,
      decisionSpine: spine,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = buildDecisionPackHtml(fixture as any);
    expect(html).toContain('Reduce onboarding friction');
    expect(html).toContain('KEEP'); // final verdict
    expect(html).toContain('Advisor Proposal');
    expect(html).toContain('Consultative only');
    expect(html).toContain('MODIFY'); // advisor's proposed verdict, shown but labeled consultative
  });

  it('renders a stub message when decisionSpine is null, never fabricating entries', async () => {
    const { buildDecisionPackHtml } = await import('@/lib/decision-pack/html-template');
    const { getNormativeMappingLight } = await import('@/lib/normative-mapping/normative-mapping-light');
    const fixture = {
      meta: {
        tenantCode: 'T-A', companyName: 'Tenant A Co', reportingPeriod: '2026-Q3', generatedAt: NOW,
        decisionPackVersionId: 'v1', decisionPackId: 'dp-1', decisionPackStatus: 'ready',
        isLiveData: true, notCertification: true as const, methodologyNote: 'test',
      },
      koraIndex: {
        value: 50, safeguardStatus: 'CLEAR', confidenceScore: 0.7, activationRate: 0.5,
        meaningfulActivationRate: 0.4, calibrationStatus: 'pre_empirical_calibration',
        methodologyVersionId: 'v0.1', isCurrent: true, createdAt: NOW, componentCount: 10,
      },
      methodologySnapshot: null, components: null, macroblocks: null, pillarDistribution: null,
      bti: null, enrichment: null, reportingAlignment: null, reportingReadiness: null,
      iuSummary: null, pibAggregation: null, auditSummary: [], executiveBrief: null,
      normativeMappingLight: getNormativeMappingLight(), contributionSummary: null,
      decisionSpine: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = buildDecisionPackHtml(fixture as any);
    expect(html).toContain('No Commitments on record yet');
  });
});
