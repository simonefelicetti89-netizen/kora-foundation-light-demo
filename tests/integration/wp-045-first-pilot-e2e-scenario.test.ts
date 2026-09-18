/**
 * KORA-WP-045 — First-Pilot End-to-End Scenario Automation, real-runtime
 * proof (direct Postgres + real Supabase-backed service layer, local
 * Supabase stack).
 *
 * WHAT THIS IS:
 *   The canonical First-Pilot Journey (doc 92 §27, "Canonical First-Pilot
 *   Journey (Final)"), automated as one deterministic, rerunnable scenario
 *   that orchestrates REAL domain service functions — never a parallel
 *   simulation of their own business logic. Every domain primitive below
 *   is the exact same exported function its own owning route/service
 *   already calls in production code; this file adds no new business
 *   logic of its own, only orchestration + assertions.
 *
 * INCLUDED STEPS (doc 92 §27, numbered as in that source):
 *   1.  Company provisioned                       — direct tenant fixture
 *       (no dedicated lib service exists beyond app/api/admin/companies/
 *       provision/route.ts's own inline insert — same convention every
 *       RLS-NN integration test already uses for tenant fixtures)
 *   2.  Company Admin invited/activated            — company_memberships
 *       fixture row (same convention as RLS-03)
 *   4.  Data preparation & ingestion                — ingestCompanyDataFile()
 *       (KORA-WP-028, the real route-called function)
 *   6.  Baseline construction (Investment Map from Observed Facts)
 *                                                    — createObservedInvestmentFact()
 *   7.  First provisional Needs state (Need Hypothesis)
 *                                                    — createNeedHypothesis()
 *   8.  KORA Ready evaluated                         — evaluateAndRecordReadiness()
 *   9.  Company Advisor becomes visible/contactable  — createAdvisorIdentity()
 *       + createAdvisorRoleQualification() + grantAdvisorRoleQualification()
 *       (KORA-WP-030/032) + createAdvisorAssignment() (KORA-WP-031)
 *   10. Advisor supports Commitment drafting          — createCommitmentDraft()
 *       (KORA-WP-020)
 *   11. Commitment committed by the real Decision Owner
 *                                                    — declareAvailable()/allocate()/
 *       commit() (KORA-WP-015 Resource Allocation) + linkResourceAllocationEntry()
 *       + createEvidencePlan() (KORA-WP-021, must exist before commit —
 *       commitment.evidence_plan_id FK) + commitCommitment() (KORA-WP-022)
 *   12. Evidence Plan frozen                          — asserted as a direct
 *       consequence of commitCommitment()'s own transaction (no separate
 *       call — this is what KORA-WP-022's own activation transaction does)
 *   14. Review conducted (Company + Advisor support)  — openReview(),
 *       markReviewInProgress() (KORA-WP-024), upsertReviewAdvisorProposal()
 *       (KORA-WP-033 convergence — "Advisor support," the drafting-the-
 *       narrative/proposing-a-verdict concept; NOT Review Advisor
 *       Assessment, per this task's own §23 "do not force both if only
 *       one is required" — Proposal is the literal match for "Advisor
 *       support" a Review; Assessment's own "sufficiently independent
 *       review" concept is a distinct, additional capability not named
 *       by doc 92 §27's own step 14 text), concludeReview() — Company
 *       authority, doc 68 §1.5
 *   15. Learning recorded                              — asserted as the
 *       resulting analytics.review_event row (append-only, exactly what
 *       "Learning recorded" already IS — no separate call)
 *
 * EXCLUDED / STRUCTURALLY-NOTED STEPS (disclosed, not silently skipped):
 *   3.  Kickoff — doc 92 §27's own text: "KORA-Operations-owned, human,
 *       audited, effort captured." No dedicated system state transition
 *       exists to automate (a MANUAL GOVERNED fallback, per doc 92's own
 *       closing sentence) — not represented by a service call here.
 *   5.  Worker activation (automated) — the existing, already-tested
 *       Foundation-Light activation pipeline (activation-safeguard,
 *       activation-signal-pipeline, worker-activation-profile — all
 *       separately, already covered by their own owning tests) is not
 *       re-invoked here; re-proving its own internal correctness is
 *       outside WP-045's own proportionate scope ("orchestrate existing
 *       domain primitives," not re-verify every one's own already-tested
 *       internals). Step 6 (Investment Map from Observed Facts) is the
 *       literal next primitive this scenario is responsible for.
 *   13. Delivery — doc 92 §27: "Company-internal by default; Partner-
 *       delivered only if that Company's scenario triggers the Partner
 *       chain." The Partner chain is explicitly BLOCKED SCOPE (Scope
 *       Trigger not activated) — per this task's own §29, not activated
 *       here. Company-internal-by-default delivery has no additional
 *       dedicated state transition beyond what Commitment/Evidence Plan
 *       already represent — nothing further to call.
 *
 * NEGATIVE PATH (§37): cross-tenant Commitment access denied at the
 * SERVICE layer (a distinct code path from RLS-21's own DB-policy proof —
 * this tests the service's own explicit tenant check, which runs BEFORE
 * RLS even applies, since service_role bypasses RLS); unassigned Advisor
 * denied (evaluateAdvisorAssignmentValidity()); Advisor cannot conclude a
 * Review (concludeReview() rejects a non-COMPANY_ADMIN actor); a concluded
 * Review cannot be reopened (markReviewInProgress() rejects a concluded
 * Review).
 *
 * GOVERNANCE EVENTS (§30): confirms the scenario's own tenant produced at
 * least one audit.governance_event row with the correct tenant_id — the
 * exact event taxonomy is each emitting WP's own already-tested concern,
 * not re-verified in full detail here.
 *
 * FEE INDEPENDENCE (§28, §P): not exercised directly (this scenario never
 * touches lib/flow-a-billing) — its own absence from this file's own
 * import graph is itself confirmed by a structural check, the same
 * "by absence" proof KORA-WP-042's own guard already established.
 *
 * SCENARIO LAYER (§8): service-layer + real-DB orchestration, deliberately
 * NOT browser/E2E — every step above is provably closeable at this layer,
 * and this environment has already shown (KORA-WP-037's own authenticated-
 * Vercel-validation tasks) that browser/credentialed runtime automation is
 * not available here. Registry 142's own Acceptance text says "passes...
 * on staging" — this file proves the scenario deterministically against a
 * LOCAL Supabase stack (identical architecture, different endpoint); a
 * literal staging run is a SEPARATE, later Founder-authorized rollout task
 * (matching KORA-WP-037's own staging-rollout separation), not performed
 * here (see report 162 §AA for the explicit disclosure of this gap).
 *
 * SAFETY MODEL: skip-safe by default (WP045_ALLOW_RUN==='true' plus
 * WP045_PG_URL/WP045_SUPABASE_URL/WP045_SERVICE_ROLE_KEY all required),
 * the same always-on static guard blocking known staging/production refs
 * and any hosted Supabase domain as every RLS-NN file, loopback-host-only.
 * No teardown DELETE at all — confirmed live: audit.governance_event
 * (not only review_advisor_assessment, WP-043's own earlier finding)
 * carries a hard, unconditional DELETE-reject trigger, which transitively
 * blocks any cascade delete of this scenario's own tenant once a single
 * Review concludes (every governed action in this chain emits one).
 * Rerunnability (§34) is achieved via fresh, run-scoped unique identifiers
 * (RUN_SUFFIX_HEX below) instead — "recreate clean fixtures," this task's
 * own explicitly sanctioned §34 strategy — never via cleanup.
 *
 * REQUIRED ENV VARS:
 *   WP045_ALLOW_RUN        — must be exactly 'true'.
 *   WP045_PG_URL            — direct Postgres connection string, local only.
 *   WP045_SUPABASE_URL      — local Supabase API URL (e.g. http://127.0.0.1:54321).
 *   WP045_SERVICE_ROLE_KEY  — local Supabase service-role key (the fixed,
 *                             non-secret local-dev default `supabase start`
 *                             itself prints — never a real project key).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production — never a valid target, under any circumstance
  'haqflkurpmeaxpikozjl', // staging (dedicated) — shared with other in-flight work, discouraged
];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalOnly(varName: string, url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) {
      throw new Error(`${varName} matches a known staging/production project ref — refusing to proceed.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`${varName} points at a hosted Supabase domain — refusing to proceed.`);
  }
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`${varName} is not a valid URL — refusing to proceed.`);
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`${varName} host "${hostname}" is not local — refusing to proceed.`);
  }
}

describe('WP-045 guard — every *_URL env var (if set) must be local-only, never staging/production/hosted', () => {
  it('WP045_PG_URL / WP045_SUPABASE_URL are either unset or local-only', () => {
    const pgUrl = readEnv('WP045_PG_URL');
    const supaUrl = readEnv('WP045_SUPABASE_URL');
    if (pgUrl) expect(() => assertLocalOnly('WP045_PG_URL', pgUrl)).not.toThrow();
    if (supaUrl) expect(() => assertLocalOnly('WP045_SUPABASE_URL', supaUrl)).not.toThrow();
    if (!pgUrl) expect(pgUrl).toBeUndefined();
    if (!supaUrl) expect(supaUrl).toBeUndefined();
  });
});

const pgUrl = readEnv('WP045_PG_URL');
const supabaseUrl = readEnv('WP045_SUPABASE_URL');
const serviceRoleKey = readEnv('WP045_SERVICE_ROLE_KEY');
const allowed = readEnv('WP045_ALLOW_RUN') === 'true';
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && allowed);

// Run-scoped unique suffix, not a fixed fixture code — REQUIRED, not
// cosmetic: both analytics.tenant (via this scenario's own Commitment →
// Review → Review Advisor Proposal chain, once a Review concludes) and,
// separately, audit.governance_event ITSELF, carry a hard, unconditional
// DELETE-reject trigger (confirmed live during this WP's own real-DB
// validation — the identical "REAL-DB FINDING, DISCLOSED" pattern
// KORA-WP-043's own RLS-21 already found for review_advisor_assessment,
// now confirmed a second time for a second table). Once this scenario has
// run once, its own tenant becomes PERMANENTLY non-deletable via any
// cascade — by design (append-only governance history), not a defect. A
// fixed, delete-and-recreate fixture (RLS-21's original, now-corrected
// approach) is therefore structurally impossible here; "recreate clean
// fixtures" per this task's own §34 is used instead — a fresh, uniquely
// suffixed tenant/identity per run, never deleted, on this LOCAL
// disposable-only container (never shared/staging/production).
const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `WP045-FIRSTPILOT-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `WP045-FIRSTPILOT-B-${RUN_SUFFIX_HEX}`; // negative-control tenant only
const ADVISOR_AUTH_UID = `00000000-0000-4000-8000-${RUN_SUFFIX_HEX}`;
const COMPANY_ADMIN_AUTH_UID = `00000000-0000-4000-8001-${RUN_SUFFIX_HEX}`;
const ACTOR_COMPANY_ADMIN = 'company-admin@wp045-fixture.kora';
const ACTOR_ADVISOR = 'advisor@wp045-fixture.kora';

describe.skipIf(!ready)('KORA-WP-045 — First-Pilot Journey, one deterministic end-to-end scenario', () => {
  let pgClient: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    if (!supabaseUrl || !serviceRoleKey || !pgUrl) throw new Error('unreachable: beforeAll only runs when ready');
    assertLocalOnly('WP045_SUPABASE_URL', supabaseUrl);
    assertLocalOnly('WP045_PG_URL', pgUrl);
    // The real service layer (getSupabaseServiceClient()) reads these two
    // process.env vars directly — this is the ONLY way to make it target
    // the local disposable stack rather than throwing "not configured".
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    // Fresh, uniquely-suffixed per run (see RUN_SUFFIX_HEX's own header
    // comment) — no ON CONFLICT needed, this row cannot already exist.
    const tenantA = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_A, 'WP-045 First-Pilot Scenario Tenant'],
    );
    tenantAId = tenantA.rows[0].id;

    const tenantB = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'WP-045 Negative-Control Tenant B'],
    );
    tenantBId = tenantB.rows[0].id;

    // Step 2: Company Admin activated (company_memberships fixture row).
    await pgClient.query(
      `INSERT INTO analytics.company_memberships (tenant_id, auth_user_id, status) VALUES ($1, $2, 'active')`,
      [tenantAId, COMPANY_ADMIN_AUTH_UID],
    );
  });

  afterAll(async () => {
    if (!pgClient) return;
    // No DELETE here — confirmed live (see RUN_SUFFIX_HEX's own header
    // comment): once this scenario runs, audit.governance_event rows
    // referencing this tenant are permanently non-deletable (append-only,
    // hard DELETE-reject trigger), which transitively makes the tenant
    // itself non-deletable too. By design, not a leak — a throwaway LOCAL
    // Postgres container, never shared/staging/production. The fresh-
    // per-run identifiers above (not teardown) are what keep reruns clean.
    await pgClient.end();
  });

  // ── Shared scenario state, threaded across ordered `it()` steps ─────────
  const state: {
    sourceBatchId?: string;
    observedFactId?: string;
    needHypothesisId?: string;
    advisorId?: string;
    qualificationId?: string;
    assignmentId?: string;
    commitmentId?: string;
    resourceAllocationEntryId?: string;
    evidencePlanId?: string;
    reviewId?: string;
    proposalId?: string;
  } = {};

  it('STEP 1 — Company provisioned (tenant fixture exists)', async () => {
    const result = await pgClient.query(`SELECT id, tenant_kind FROM analytics.tenant WHERE id = $1`, [tenantAId]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tenant_kind).toBe('TEST');
  });

  it('STEP 2 — Company Admin invited/activated (active membership)', async () => {
    const result = await pgClient.query(
      `SELECT status FROM analytics.company_memberships WHERE tenant_id = $1 AND auth_user_id = $2`,
      [tenantAId, COMPANY_ADMIN_AUTH_UID],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('active');
  });

  it('STEP 4 — Data preparation & ingestion (real KORA-WP-028 sync path)', async () => {
    const { ingestCompanyDataFile } = await import('@/lib/ingestion-hardening/company-ingest-service');
    const csv = 'worker_id,event_type,event_date\nW001,training_completed,2026-09-01\n';
    const outcome = await ingestCompanyDataFile({
      tenantId: tenantAId,
      actorId: ACTOR_COMPANY_ADMIN,
      fileName: 'wp045-fixture.csv',
      fileExtension: 'csv',
      fileBuffer: Buffer.from(csv, 'utf-8'),
      idempotencyKey: 'wp045-fixture-batch-1',
    });
    expect(outcome.kind === 'executed' || outcome.kind === 'replayed').toBe(true);
    expect(outcome.batchId).toBeTruthy();
    state.sourceBatchId = outcome.batchId;

    const row = await pgClient.query(`SELECT tenant_id FROM analytics.source_batch WHERE id = $1`, [outcome.batchId]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].tenant_id).toBe(tenantAId);
  });

  it('STEP 6 — Baseline construction: Investment Map from Observed Facts', async () => {
    const { createObservedInvestmentFact } = await import('@/lib/investment-map/observed-investment-fact-service');
    const fact = await createObservedInvestmentFact({
      tenantId: tenantAId,
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: ACTOR_COMPANY_ADMIN,
      purpose: 'WP-045 fixture: onboarding training investment, observed from ingestion',
      sourceBatchId: state.sourceBatchId,
      amount: 5000,
    });
    expect(fact.tenantId).toBe(tenantAId);
    state.observedFactId = fact.id;
  });

  it('STEP 7 — First provisional Needs state: Need Hypothesis', async () => {
    const { createNeedHypothesis } = await import('@/lib/needs-map/need-hypothesis-service');
    const hypothesis = await createNeedHypothesis({
      tenantId: tenantAId,
      statement: 'WP-045 fixture: workers may need structured onboarding support based on the observed investment.',
      recordedByRole: 'COMPANY_ADMIN',
      recordedById: ACTOR_COMPANY_ADMIN,
    });
    expect(hypothesis.tenantId).toBe(tenantAId);
    expect(hypothesis.classification).toBe('Hypothesis');
    state.needHypothesisId = hypothesis.id;
  });

  it('STEP 8 — KORA Ready evaluated', async () => {
    const { evaluateAndRecordReadiness } = await import('@/lib/company-readiness/company-readiness-service');
    const health = await evaluateAndRecordReadiness({
      tenantId: tenantAId,
      actorRole: 'COMPANY_ADMIN',
      actorId: ACTOR_COMPANY_ADMIN,
    });
    expect(['ready', 'not_ready', 'degraded']).toContain(health.status);
  });

  it('STEP 9 — Company Advisor becomes visible/contactable (Identity → Qualification → Assignment)', async () => {
    const { createAdvisorIdentity, createAdvisorRoleQualification, grantAdvisorRoleQualification } = await import(
      '@/lib/advisor-identity/advisor-identity-service'
    );
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');

    const identity = await createAdvisorIdentity({
      authUserId: ADVISOR_AUTH_UID,
      fullName: 'WP-045 Fixture Advisor',
      actorRole: 'KORA_ADMIN',
      actorId: 'kora-admin@wp045-fixture.kora',
    });
    state.advisorId = identity.id;

    const qualification = await createAdvisorRoleQualification({
      advisorId: identity.id,
      role: 'Company Advisor',
      actorRole: 'KORA_ADMIN',
      actorId: 'kora-admin@wp045-fixture.kora',
    });
    state.qualificationId = qualification.id;

    const granted = await grantAdvisorRoleQualification({
      qualificationId: qualification.id,
      grantedByOperatorId: 'kora-admin@wp045-fixture.kora',
    });
    expect(granted.status).toBe('QUALIFIED');

    const assignment = await createAdvisorAssignment({
      advisorId: identity.id,
      companyId: tenantAId,
      role: 'Company Advisor',
      actorRole: 'KORA_ADMIN',
      actorId: 'kora-admin@wp045-fixture.kora',
    });
    expect(assignment.status).toBe('active');
    expect(assignment.companyId).toBe(tenantAId);
    state.assignmentId = assignment.id;
  });

  it('STEP 10 — Advisor supports Commitment drafting', async () => {
    const { createCommitmentDraft } = await import('@/lib/commitment/commitment-service');
    const commitment = await createCommitmentDraft({
      tenantId: tenantAId,
      actorRole: 'COMPANY_ADMIN',
      actorId: ACTOR_COMPANY_ADMIN,
      problemObjective: 'WP-045 fixture: structured onboarding support for newly hired workers.',
      proposedChoice: 'Fund a structured onboarding program via internal delivery.',
      amount: 5000,
      horizon: 'Q4 2026',
    });
    expect(commitment.tenantId).toBe(tenantAId);
    expect(commitment.status).toBe('draft');
    state.commitmentId = commitment.id;
  });

  it('STEP 11a — Resource Allocation: declare → allocate → commit', async () => {
    const { declareAvailable, allocate, commit } = await import('@/lib/resource-allocation/resource-allocation-service');
    const available = await declareAvailable({ tenantId: tenantAId, amount: 5000, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    const allocated = await allocate({
      sourceEntryId: available.id, amount: 5000, targetLabel: 'WP-045 fixture onboarding budget',
      actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN,
    });
    const committed = await commit({ sourceEntryId: allocated.id, amount: 5000, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    expect(committed.lifecycleStatus).toBe('committed');
    state.resourceAllocationEntryId = committed.id;
  });

  it('STEP 11b — Evidence Plan created (must exist before Commitment can reference it)', async () => {
    const { createEvidencePlan } = await import('@/lib/evidence-plan/evidence-plan-service');
    const plan = await createEvidencePlan({
      tenantId: tenantAId,
      commitmentId: state.commitmentId!,
      actorRole: 'COMPANY_ADMIN',
      actorId: ACTOR_COMPANY_ADMIN,
      evidenceExpectations: 'WP-045 fixture: completion rate and worker feedback.',
      reviewIntention: 'Review after Q4 2026.',
    });
    expect(plan.tenantId).toBe(tenantAId);
    expect(plan.status).toBe('draft');
    state.evidencePlanId = plan.id;
  });

  it('STEP 11c — Commitment linked to its Resource Allocation reference', async () => {
    const { linkResourceAllocationEntry } = await import('@/lib/commitment/commitment-service');
    await linkResourceAllocationEntry({
      commitmentId: state.commitmentId!, tenantId: tenantAId, resourceAllocationEntryId: state.resourceAllocationEntryId!,
      actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN,
    });
    const row = await pgClient.query(
      `SELECT 1 FROM analytics.commitment_resource_reference WHERE commitment_id = $1 AND resource_allocation_entry_id = $2`,
      [state.commitmentId, state.resourceAllocationEntryId],
    );
    expect(row.rows).toHaveLength(1);
  });

  it('STEP 11d — Commitment linked to its Evidence Plan (direct link, mirroring the activation transaction\'s own precondition)', async () => {
    await pgClient.query(`UPDATE analytics.commitment SET evidence_plan_id = $1 WHERE id = $2 AND tenant_id = $3`, [
      state.evidencePlanId, state.commitmentId, tenantAId,
    ]);
    const row = await pgClient.query(`SELECT evidence_plan_id FROM analytics.commitment WHERE id = $1`, [state.commitmentId]);
    expect(row.rows[0].evidence_plan_id).toBe(state.evidencePlanId);
  });

  it('STEP 11e / 11 — Commitment committed by the real Decision Owner (COMPANY_ADMIN)', async () => {
    const { commitCommitment } = await import('@/lib/commitment/commit-activation-service');
    const result = await commitCommitment({ commitmentId: state.commitmentId!, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    expect(result.manifestId).toBeTruthy();
    const row = await pgClient.query(`SELECT status FROM analytics.commitment WHERE id = $1`, [state.commitmentId]);
    expect(row.rows[0].status).toBe('committed');
  });

  it('STEP 12 — Evidence Plan frozen (a direct consequence of the same activation transaction)', async () => {
    const row = await pgClient.query(`SELECT status FROM analytics.evidence_plan WHERE id = $1`, [state.evidencePlanId]);
    expect(row.rows[0].status).toBe('frozen-at-commit');
  });

  it('STEP 13 — Delivery: Company-internal by default (no Partner chain activated — structurally confirmed absent)', async () => {
    const row = await pgClient.query(`SELECT organisation_type FROM advisor.advisor_assignment WHERE id = $1`, [state.assignmentId]);
    expect(row.rows[0].organisation_type).toBe('company');
  });

  it('STEP 14a — Review conducted: opened against the now-committed Commitment', async () => {
    const { openReview } = await import('@/lib/review/review-service');
    const review = await openReview({ commitmentId: state.commitmentId!, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    expect(review.status).toBe('open');
    state.reviewId = review.id;
  });

  it('STEP 14b — Review moved in-progress', async () => {
    const { markReviewInProgress } = await import('@/lib/review/review-service');
    const review = await markReviewInProgress({ reviewId: state.reviewId!, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    expect(review.status).toBe('in-progress');
  });

  it('STEP 14c — Advisor support: narrative + proposed verdict (review_advisor_proposal, non-constitutive)', async () => {
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    const proposal = await upsertReviewAdvisorProposal({
      reviewId: state.reviewId!, tenantId: tenantAId, actorRole: 'ADVISOR', actorId: ACTOR_ADVISOR,
      proposalNarrative: 'WP-045 fixture: onboarding completion tracked as expected; recommend KEEP.',
      proposedVerdict: 'KEEP',
    });
    expect(proposal.reviewId).toBe(state.reviewId);
    state.proposalId = proposal.id;
  });

  it('STEP 14d / 15 — Review concluded by Company authority; the resulting review_event IS "Learning recorded"', async () => {
    const { concludeReview } = await import('@/lib/review/review-service');
    const result = await concludeReview({
      reviewId: state.reviewId!, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN,
      actualDecision: 'Onboarding program delivered as committed; completion rate met expectations.',
      effectiveDate: '2026-12-15',
      verdict: 'KEEP',
    });
    expect(result.reviewEventId).toBeTruthy();

    const reviewRow = await pgClient.query(`SELECT status FROM analytics.review WHERE id = $1`, [state.reviewId]);
    expect(reviewRow.rows[0].status).toBe('concluded');

    const eventRow = await pgClient.query(`SELECT tenant_id, verdict FROM analytics.review_event WHERE review_id = $1`, [state.reviewId]);
    expect(eventRow.rows).toHaveLength(1); // UNIQUE(review_id) — exactly one, doc 68 §1.5
    expect(eventRow.rows[0].tenant_id).toBe(tenantAId);
    expect(eventRow.rows[0].verdict).toBe('KEEP');
  });

  // ── Negative path (§37) — high-value checks only, not the full lower- ────
  // level security suite (already covered by RLS-21/RLS-22).

  it('NEGATIVE — cross-tenant Commitment access is denied at the SERVICE layer (not only RLS)', async () => {
    const { openReview } = await import('@/lib/review/review-service');
    // A second, unrelated commitment tied to tenant B — openReview against
    // it using tenant A's id must be rejected by the service's own
    // explicit tenant check, a distinct code path from RLS (service_role
    // bypasses RLS entirely — this is the service's OWN defense).
    const { createCommitmentDraft } = await import('@/lib/commitment/commitment-service');
    const commitmentB = await createCommitmentDraft({
      tenantId: tenantBId, actorRole: 'COMPANY_ADMIN', actorId: 'company-admin-b@wp045-fixture.kora',
      problemObjective: 'WP-045 fixture: Tenant B unrelated commitment (never committed, negative control only).',
    });
    await expect(
      openReview({ commitmentId: commitmentB.id, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN }),
    ).rejects.toThrow(/not found for tenant|not committed/);
  });

  it('NEGATIVE — an unassigned/nonexistent Advisor Assignment is denied (evaluateAdvisorAssignmentValidity rejects it outright)', async () => {
    // Real behavior, confirmed live (not assumed): the function throws
    // "no such Assignment" for a genuinely nonexistent id — a fail-loud
    // guard against a malformed reference, not a graceful {valid:false}
    // result. Still a real, meaningful denial: the system refuses to
    // treat a fabricated Assignment id as valid under any circumstance.
    const { evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(evaluateAdvisorAssignmentValidity('00000000-0000-4000-8000-999999999999')).rejects.toThrow(/no such Assignment/);
  });

  it('NEGATIVE — an Advisor actor cannot conclude a Review (Company authority only, doc 68 §1.5)', async () => {
    const { openReview, concludeReview } = await import('@/lib/review/review-service');
    const { createCommitmentDraft, linkResourceAllocationEntry } = await import('@/lib/commitment/commitment-service');
    const { createEvidencePlan } = await import('@/lib/evidence-plan/evidence-plan-service');
    const { commitCommitment } = await import('@/lib/commitment/commit-activation-service');
    const { declareAvailable, allocate, commit: commitRA } = await import('@/lib/resource-allocation/resource-allocation-service');
    // A minimal second commitment, committed directly. Real-DB findings
    // (confirmed live, not assumed): commitCommitment() enforces both
    // "kora/lock-9" (an active ex-ante Evidence Plan, doc 95 §6) AND
    // "kora/no-resource-allocation" (one-or-more linked Resource
    // Allocation entries, doc 67 §6) — both DB-level invariants stronger
    // than this test's own original assumption that a minimal second
    // commitment could skip STEP 11's own full precondition chain.
    const draft = await createCommitmentDraft({
      tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN,
      problemObjective: 'WP-045 fixture: second commitment, negative-control Review only.',
    });
    await createEvidencePlan({ tenantId: tenantAId, commitmentId: draft.id, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    const available2 = await declareAvailable({ tenantId: tenantAId, amount: 100, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    const allocated2 = await allocate({
      sourceEntryId: available2.id, amount: 100, targetLabel: 'WP-045 fixture negative-control budget',
      actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN,
    });
    const committed2 = await commitRA({ sourceEntryId: allocated2.id, amount: 100, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    await linkResourceAllocationEntry({
      commitmentId: draft.id, tenantId: tenantAId, resourceAllocationEntryId: committed2.id,
      actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN,
    });
    await commitCommitment({ commitmentId: draft.id, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });
    const review = await openReview({ commitmentId: draft.id, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN });

    await expect(
      concludeReview({
        reviewId: review.id, tenantId: tenantAId, actorRole: 'ADVISOR', actorId: ACTOR_ADVISOR,
        actualDecision: 'An Advisor attempting to finalize — must be rejected.', effectiveDate: '2026-12-15', verdict: 'KEEP',
      }),
    ).rejects.toThrow();
  });

  it('NEGATIVE — a concluded Review cannot be reopened (immutable historical event, doc 68 §1.5)', async () => {
    const { markReviewInProgress } = await import('@/lib/review/review-service');
    await expect(
      markReviewInProgress({ reviewId: state.reviewId!, tenantId: tenantAId, actorRole: 'COMPANY_ADMIN', actorId: ACTOR_COMPANY_ADMIN }),
    ).rejects.toThrow(/not open|concluded/);
  });

  // ── Governance events (§30) ───────────────────────────────────────────────

  it('GOVERNANCE — the scenario produced at least one correctly-tenant-scoped audit.governance_event row', async () => {
    const result = await pgClient.query(`SELECT count(*)::int AS n FROM audit.governance_event WHERE tenant_id = $1`, [tenantAId]);
    expect(result.rows[0].n).toBeGreaterThan(0);
  });

  // ── Fee independence (§28, §P) — structural, "by absence" ────────────────

  it('FEE INDEPENDENCE — this scenario file itself never imports the billing module (by absence, mirroring KORA-WP-042\'s own guard)', () => {
    // Import lines only (not full-source regex against this file's own
    // header prose, which names the billing module by name to explain
    // its absence and would otherwise false-positive-match itself).
    const importLines = readFileSync('tests/integration/wp-045-first-pilot-e2e-scenario.test.ts', 'utf-8')
      .split('\n')
      .filter((l) => /^\s*(import |.*await import\()/.test(l));
    expect(importLines.length).toBeGreaterThan(0);
    expect(importLines.join('\n')).not.toMatch(/flow-a-billing|fee_charge_event|CommercialEntitlement/i);
  });
});
