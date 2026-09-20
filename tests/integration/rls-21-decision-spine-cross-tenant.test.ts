/**
 * RLS-21 — Decision Spine cross-tenant isolation, real-runtime proof
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   KORA-WP-043 (Test Pyramid Build-Out) closure of a genuine, canonically-
 *   named gap: doc 89 Part 37's own test-type table requires "DB/RLS |
 *   Every new table, cross-tenant leakage explicitly tested," yet none of
 *   the Decision Spine tables built across KORA-WP-020/021/024/033/037
 *   (analytics.commitment, analytics.evidence_plan, analytics.review,
 *   analytics.review_advisor_proposal, analytics.review_advisor_assessment)
 *   had ever been captured as a permanent, mechanically-checked regression
 *   test in tests/integration/ — each WP's own real-DB validation was a
 *   throwaway `scripts/_tmp-*.mts` script, deleted immediately after use
 *   (see reports 155/156/158's own "Real Database Validation" sections).
 *   This file is that permanent capture — the RLS integration suite
 *   previously topped out at RLS-20 (KORA-WP-025-era: decision_pack,
 *   admin cross-company analytics); this is the first durable proof for
 *   every Decision Spine table built since.
 *
 * WHAT THIS PROVES, PER TABLE (Company A's COMPANY_ADMIN session, real
 * Postgres RLS, not app code):
 *   - analytics.commitment            — Company A cannot read Company B's row
 *   - analytics.evidence_plan         — Company A cannot read Company B's row
 *   - analytics.review                — Company A cannot read Company B's row
 *   - analytics.review_advisor_proposal   — Company A cannot read Company B's row
 *   - analytics.review_advisor_assessment — Company A cannot read Company B's row
 *   Every negative assertion has a positive-control sibling (Company A
 *   reading its OWN row via the identical mechanism), so a broken fixture
 *   or claims mismatch fails the positive control rather than falsely
 *   passing the negative one — same discipline as RLS-03/RLS-worker-isolation.
 *
 * REAL-DB FINDING, DISCLOSED (not a defect — see report 160 §R): migration
 * 080's own `reject_review_advisor_assessment_mutation` trigger rejects
 * every DELETE unconditionally, including one that only reaches the row
 * via an ancestor's ON DELETE CASCADE (Postgres still fires a BEFORE
 * DELETE trigger on the child row for a cascaded delete, and this trigger
 * has no cascade-origin exception). Consequence, confirmed live here: once
 * a review_advisor_assessment row exists, its Review, Commitment, Evidence
 * Plan, Review Advisor Proposal, Tenant, and referenced Advisor Assignment
 * all become permanently non-deletable too — by design (doc 76 §10's own
 * "permanent historical record" framing), but a genuinely useful
 * operational fact migration 080's own header did not spell out. This
 * file's fixture is therefore idempotent (look up and reuse an existing
 * chain for a given tenant_code before inserting a new one) rather than
 * delete-and-recreate, matching this real, confirmed constraint honestly
 * instead of fighting it.
 *
 * NOT IN SCOPE (deliberately, per WP-043's own boundary — see this file's
 * sibling RLS-22 and report 160's own "Security Findings Deferred to
 * WP-044" section):
 *   - Advisor-side visibility of these same rows (ADVISOR role, Assignment-
 *     scoped) — those tables' own RLS additionally checks Advisor
 *     Assignment validity, which is RLS-22's own subject, not duplicated
 *     here.
 *   - Security remediation of any kind — this file only proves the EXISTING
 *     policies behave as designed; if it had found a defect, that finding
 *     would route to WP-044 (security) or the owning WP (product defect),
 *     never silently patched here (registry 142's own WP-043 Out of Scope:
 *     "removing existing static tests" — by the same discipline, WP-043
 *     never expands into WP-044's own remediation scope either).
 *   - The full Commitment→Evidence-Plan→Review activation LIFECYCLE
 *     (Resource Allocation ledger, MVB manifest, the real
 *     commit-activation-transaction RPC) — already covered by
 *     KORA-WP-020/021/022's own unit/service tests. This file's fixture
 *     reaches `commitment.status = 'committed'` via a direct, privileged
 *     UPDATE (a legitimate, minimal fixture shortcut — draft→committed is
 *     an unrestricted one-time transition per migration 067's own
 *     immutability trigger, which only activates once OLD.status is
 *     already 'committed') — never replays the activation RPC, since this
 *     file's only subject is RLS, not activation-transaction correctness.
 *
 * SAFETY MODEL — identical to RLS-19/RLS-20 (see those files' headers for
 * full rationale): skip-safe by default (RLS21_PG_URL + RLS21_ALLOW_RUN
 * === 'true' required), an always-on static guard blocking known staging/
 * production refs and any hosted Supabase domain, loopback-host-only,
 * single privileged connection, teardown scoped strictly to this test's
 * own tenant_code.
 *
 * CI WIRING: wired into .github/workflows/ci.yml's "Run RLS integration
 * suites" mandatory, no-skip step in this same WP's own commit — not
 * deferred (same discipline RLS-19's own header names as a prior lesson).
 *
 * REQUIRED ENV VARS:
 *   RLS21_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS21_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function readConfig(): { pgUrl: string } | null {
  const pgUrl = readEnv('RLS21_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS21_ALLOW_RUN') === 'true';
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production — never a valid target, under any circumstance
  'haqflkurpmeaxpikozjl', // staging (dedicated) — shared with other in-flight work, discouraged
];

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalPostgresOnly(pgUrl: string): void {
  const lower = pgUrl.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) {
      throw new Error(
        `RLS21_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS21_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS21_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS21_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-21 guard — RLS21_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS21_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS21_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readConfig();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_CODE_A = 'RLS21-DECISIONSPINE-A';
const TENANT_CODE_B = 'RLS21-DECISIONSPINE-B';
const ADVISOR_AUTH_UID = '00000000-0000-4000-8000-0000000021a1';

describe.skipIf(!ready)(
  'RLS-21 — Decision Spine cross-tenant isolation against real Postgres RLS',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;
    let advisorId: string;
    let assignmentAId: string;
    let assignmentBId: string;
    const chain: Record<'A' | 'B', { commitmentId: string; evidencePlanId: string; reviewId: string; proposalId: string; assessmentId: string }> =
      {} as never;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);
      client = new Client({ connectionString: config.pgUrl });
      await client.connect();

      const tenantA = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [TENANT_CODE_A, 'RLS-21 Decision Spine Tenant A'],
      );
      tenantAId = tenantA.rows[0].id;

      const tenantB = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [TENANT_CODE_B, 'RLS-21 Decision Spine Tenant B'],
      );
      tenantBId = tenantB.rows[0].id;

      // One Advisor, assigned to Tenant A only — sufficient for the
      // review_advisor_assessment FK; RLS-22 covers Advisor-scope-follows-
      // Assignment itself, not duplicated here.
      const advisor = await client.query<{ id: string }>(
        `INSERT INTO advisor.advisor_identity (auth_user_id, full_name, status)
         VALUES ($1, 'RLS-21 Reference Advisor', 'active')
         ON CONFLICT (auth_user_id) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [ADVISOR_AUTH_UID],
      );
      advisorId = advisor.rows[0].id;

      // Idempotent: reuse an existing active Assignment for this Advisor/
      // Company pair if a prior run already created one (the partial
      // unique index allows only one ACTIVE Company Advisor per company)
      // — end any other stale active row first (never deleted). One real
      // Assignment per tenant, so review_advisor_assessment.assignment_id
      // always genuinely belongs to the same Company as its own tenant_id.
      async function ensureActiveAssignment(companyId: string): Promise<string> {
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM advisor.advisor_assignment WHERE advisor_id = $1 AND company_id = $2 AND status = 'active'`,
          [advisorId, companyId],
        );
        if (existing.rows.length > 0) return existing.rows[0].id;

        await client.query(
          `UPDATE advisor.advisor_assignment SET status = 'ended', effective_to = now(), reason = 'RLS-21 fixture reset'
           WHERE company_id = $1 AND status = 'active'`,
          [companyId],
        );
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO advisor.advisor_assignment (advisor_id, company_id, role, status)
           VALUES ($1, $2, 'Company Advisor', 'active')
           RETURNING id`,
          [advisorId, companyId],
        );
        return inserted.rows[0].id;
      }

      assignmentAId = await ensureActiveAssignment(tenantAId);
      assignmentBId = await ensureActiveAssignment(tenantBId);

      // Build the identical 5-table chain for both tenants — idempotent:
      // reuse an existing chain for this tenant if a prior run already
      // built one (see header, "REAL-DB FINDING, DISCLOSED" — this chain
      // is permanently non-deletable once an Assessment row exists).
      for (const [key, tenantId, assignmentId] of [
        ['A', tenantAId, assignmentAId],
        ['B', tenantBId, assignmentBId],
      ] as const) {
        const existingCommitment = await client.query<{ id: string }>(
          `SELECT id FROM analytics.commitment WHERE tenant_id = $1 AND actor_id = $2 LIMIT 1`,
          [tenantId, `rls21-admin-${key}`],
        );

        if (existingCommitment.rows.length > 0) {
          const commitmentId = existingCommitment.rows[0].id;
          const evidencePlan = await client.query<{ id: string }>(
            `SELECT id FROM analytics.evidence_plan WHERE commitment_id = $1`,
            [commitmentId],
          );
          const review = await client.query<{ id: string }>(`SELECT id FROM analytics.review WHERE commitment_id = $1`, [commitmentId]);
          const reviewId = review.rows[0].id;
          const proposal = await client.query<{ id: string }>(
            `SELECT id FROM analytics.review_advisor_proposal WHERE review_id = $1`,
            [reviewId],
          );
          const assessment = await client.query<{ id: string }>(
            `SELECT id FROM analytics.review_advisor_assessment WHERE review_id = $1 LIMIT 1`,
            [reviewId],
          );
          chain[key] = {
            commitmentId,
            evidencePlanId: evidencePlan.rows[0].id,
            reviewId,
            proposalId: proposal.rows[0].id,
            assessmentId: assessment.rows[0].id,
          };
          continue;
        }

        const commitment = await client.query<{ id: string }>(
          `INSERT INTO analytics.commitment (tenant_id, problem_objective, actor_role, actor_id)
           VALUES ($1, $2, 'COMPANY_ADMIN', $3)
           RETURNING id`,
          [tenantId, `RLS-21 fixture problem/objective (${key})`, `rls21-admin-${key}`],
        );
        const commitmentId = commitment.rows[0].id;

        // draft → committed: an unrestricted one-time transition (migration
        // 067) — legitimate direct fixture setup, not a replay of the
        // activation-transaction RPC (see header, "NOT IN SCOPE").
        await client.query(`UPDATE analytics.commitment SET status = 'committed' WHERE id = $1`, [commitmentId]);

        const evidencePlan = await client.query<{ id: string }>(
          `INSERT INTO analytics.evidence_plan (tenant_id, commitment_id, actor_role, actor_id)
           VALUES ($1, $2, 'COMPANY_ADMIN', $3)
           RETURNING id`,
          [tenantId, commitmentId, `rls21-admin-${key}`],
        );

        const review = await client.query<{ id: string }>(
          `INSERT INTO analytics.review (tenant_id, commitment_id, actor_role, actor_id)
           VALUES ($1, $2, 'COMPANY_ADMIN', $3)
           RETURNING id`,
          [tenantId, commitmentId, `rls21-admin-${key}`],
        );
        const reviewId = review.rows[0].id;

        const proposal = await client.query<{ id: string }>(
          `INSERT INTO analytics.review_advisor_proposal (tenant_id, review_id, proposal_narrative, actor_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [tenantId, reviewId, `RLS-21 fixture proposal narrative (${key})`, `rls21-advisor-${key}`],
        );

        const assessment = await client.query<{ id: string }>(
          `INSERT INTO analytics.review_advisor_assessment
             (tenant_id, review_id, assignment_id, actor_id, assessment_narrative, qualification_status_at_issuance, conflict_flag_at_issuance)
           VALUES ($1, $2, $3, $4, $5, 'QUALIFIED', false)
           RETURNING id`,
          [tenantId, reviewId, assignmentId, `rls21-advisor-${key}`, `RLS-21 fixture assessment narrative (${key})`],
        );

        chain[key] = {
          commitmentId,
          evidencePlanId: evidencePlan.rows[0].id,
          reviewId,
          proposalId: proposal.rows[0].id,
          assessmentId: assessment.rows[0].id,
        };
      }
    });

    afterAll(async () => {
      if (!client) return;

      // No DELETE here — confirmed live (see header, "REAL-DB FINDING,
      // DISCLOSED"): analytics.review_advisor_assessment's own append-only
      // trigger rejects every DELETE unconditionally, including one that
      // only reaches the row via an ancestor's ON DELETE CASCADE. Once
      // this fixture's chain exists, analytics.tenant/commitment/
      // evidence_plan/review/review_advisor_proposal and the referenced
      // advisor.advisor_assignment rows are all permanently non-deletable
      // through it — by design, not a leak (a throwaway LOCAL Postgres
      // container, never shared/staging/production). beforeAll's own
      // idempotent lookup-or-create logic is what keeps reruns clean, not
      // teardown.
      await client.end();
    });

    // Shared helper — same shape as RLS-03/RLS-worker-isolation: own
    // transaction per call, `authenticated` role, `request.jwt.claims` GUC
    // set to the canonical COMPANY_ADMIN shape, always rolled back.
    async function queryAsCompany(
      actingTenantId: string,
      table: 'commitment' | 'evidence_plan' | 'review' | 'review_advisor_proposal' | 'review_advisor_assessment',
      targetId: string,
    ) {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: actingTenantId } });
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
        const result = await client.query(`SELECT id, tenant_id FROM analytics.${table} WHERE id = $1`, [targetId]);
        return result.rows;
      } finally {
        await client.query('ROLLBACK');
      }
    }

    const TABLES = ['commitment', 'evidence_plan', 'review', 'review_advisor_proposal', 'review_advisor_assessment'] as const;
    const ID_KEY: Record<(typeof TABLES)[number], keyof (typeof chain)['A']> = {
      commitment: 'commitmentId',
      evidence_plan: 'evidencePlanId',
      review: 'reviewId',
      review_advisor_proposal: 'proposalId',
      review_advisor_assessment: 'assessmentId',
    };

    for (const table of TABLES) {
      it(`analytics.${table} — Company A CANNOT read Company B's row (negative)`, async () => {
        const rows = await queryAsCompany(tenantAId, table, chain.B[ID_KEY[table]]);
        expect(rows).toHaveLength(0);
      });

      it(`analytics.${table} — Company A CAN read its own row (positive control)`, async () => {
        const rows = await queryAsCompany(tenantAId, table, chain.A[ID_KEY[table]]);
        expect(rows).toHaveLength(1);
        expect(rows[0].tenant_id).toBe(tenantAId);
      });
    }
  },
);
