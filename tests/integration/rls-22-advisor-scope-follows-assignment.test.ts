/**
 * RLS-22 — Advisor domain "scope follows Assignment," real-runtime proof
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   KORA-WP-043 (Test Pyramid Build-Out) closure of the same doc-89-Part-37
 *   gap RLS-21 closes for the Decision Spine, applied here to the Advisor
 *   domain (KORA-WP-030 Advisor Identity/Qualification, KORA-WP-031 Advisor
 *   Assignment) — never previously captured as a permanent regression test.
 *   Proves the single most important Advisor-domain invariant named across
 *   this engagement's own reports (155, 158, and this task's own founder
 *   prompt §16): "Advisor scope follows Assignment" — a Company may see an
 *   Advisor's identity and Assignment row ONLY while that Advisor holds a
 *   currently ACTIVE Assignment to that specific Company, never another
 *   Company's, and never an ended Assignment's.
 *
 * WHAT THIS PROVES (real Postgres RLS, not app code), against real
 * advisor.advisor_identity / advisor.advisor_assignment rows:
 *   - Company A (COMPANY_ADMIN) CAN read the identity + assignment row of
 *     an Advisor holding an ACTIVE Assignment to Company A.
 *   - Company B (COMPANY_ADMIN, no Assignment to that Advisor at all)
 *     CANNOT read that Advisor's identity, and CANNOT read Company A's
 *     Assignment row.
 *   - Once Company A's own Assignment to that Advisor ENDS (status
 *     'active' → 'ended'), Company A itself loses read access to that
 *     Advisor's identity and to the now-ended Assignment row — "no former-
 *     Advisor operational access after Assignment end" (founder prompt
 *     §16), proven from the COMPANY side (the ADVISOR-session side of that
 *     same invariant is KORA-WP-031's own existing unit-test coverage,
 *     evaluateAdvisorAssignmentValidity() — not duplicated here).
 *   - The Advisor's own self-read (`auth.uid()`-bound, migration 056/057)
 *     is unaffected by any Company's Assignment state — an Advisor always
 *     reads their own identity/assignment rows regardless of Company-side
 *     visibility, confirming the two RLS policies are genuinely additive,
 *     not a replacement of one another.
 *
 * NOT IN SCOPE (per WP-043's own boundary, and per registry 142's own
 * WP-042/044/051 boundaries):
 *   - Partner-side Advisor scope (organisation_type = 'partner') — CHECK-
 *     pinned absent until KORA-WP-051/053 exist; not modeled here, exactly
 *     as migration 057's own header discloses.
 *   - Advisor Qualification governance-transition testing — KORA-WP-032's
 *     own existing coverage; this file only reads
 *     advisor_role_qualification indirectly (not at all, in fact — the
 *     Company-side policies under test reference advisor_identity/
 *     advisor_assignment only).
 *   - Security remediation — same discipline as RLS-21's header; any
 *     defect this file might have found routes to WP-044 or the owning WP,
 *     never silently patched here. (None was found — see report 160.)
 *
 * SAFETY MODEL — identical to RLS-19/20/21 (see those files' headers for
 * full rationale): skip-safe by default (RLS22_PG_URL + RLS22_ALLOW_RUN
 * === 'true' required), an always-on static guard blocking known staging/
 * production refs and any hosted Supabase domain, loopback-host-only,
 * single privileged connection, teardown scoped strictly to this test's
 * own tenant_code / auth_user_id fixtures.
 *
 * CI WIRING: wired into .github/workflows/ci.yml's "Run RLS integration
 * suites" mandatory, no-skip step in this same WP's own commit.
 *
 * REQUIRED ENV VARS:
 *   RLS22_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS22_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function readConfig(): { pgUrl: string } | null {
  const pgUrl = readEnv('RLS22_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS22_ALLOW_RUN') === 'true';
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
        `RLS22_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS22_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS22_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS22_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-22 guard — RLS22_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS22_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS22_PG_URL');
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

const TENANT_CODE_A = 'RLS22-ADVISORSCOPE-A';
const TENANT_CODE_B = 'RLS22-ADVISORSCOPE-B';
const ADVISOR_AUTH_UID = '00000000-0000-4000-8000-0000000022a1';

describe.skipIf(!ready)(
  'RLS-22 — Advisor scope follows Assignment, against real Postgres RLS',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;
    let advisorId: string;
    let assignmentAId: string;

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
        [TENANT_CODE_A, 'RLS-22 Advisor Scope Tenant A'],
      );
      tenantAId = tenantA.rows[0].id;

      const tenantB = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [TENANT_CODE_B, 'RLS-22 Advisor Scope Tenant B'],
      );
      tenantBId = tenantB.rows[0].id;

      const advisor = await client.query<{ id: string }>(
        `INSERT INTO advisor.advisor_identity (auth_user_id, full_name, status)
         VALUES ($1, 'RLS-22 Reference Advisor', 'active')
         ON CONFLICT (auth_user_id) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [ADVISOR_AUTH_UID],
      );
      advisorId = advisor.rows[0].id;

      // Active Assignment to Tenant A only — Tenant B never has any
      // Assignment to this Advisor, at any point in this fixture.
      const assignmentA = await client.query<{ id: string }>(
        `INSERT INTO advisor.advisor_assignment (advisor_id, company_id, role, status)
         VALUES ($1, $2, 'Company Advisor', 'active')
         RETURNING id`,
        [advisorId, tenantAId],
      );
      assignmentAId = assignmentA.rows[0].id;
    });

    afterAll(async () => {
      if (!client) return;
      await client.query(`DELETE FROM advisor.advisor_assignment WHERE advisor_id = $1`, [advisorId]);
      await client.query(`DELETE FROM advisor.advisor_identity WHERE auth_user_id = $1`, [ADVISOR_AUTH_UID]);
      await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [[TENANT_CODE_A, TENANT_CODE_B]]);
      await client.end();
    });

    async function queryAsCompany(actingTenantId: string, table: 'advisor_identity' | 'advisor_assignment', targetId: string) {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: actingTenantId } });
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
        const result = await client.query(`SELECT id FROM advisor.${table} WHERE id = $1`, [targetId]);
        return result.rows;
      } finally {
        await client.query('ROLLBACK');
      }
    }

    async function queryAsAdvisor(table: 'advisor_identity' | 'advisor_assignment', targetId: string) {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({ sub: ADVISOR_AUTH_UID, app_metadata: { kora_role: 'ADVISOR' } });
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
        const result = await client.query(`SELECT id FROM advisor.${table} WHERE id = $1`, [targetId]);
        return result.rows;
      } finally {
        await client.query('ROLLBACK');
      }
    }

    it('Company A (active Assignment) CAN read the Advisor identity (positive control)', async () => {
      const rows = await queryAsCompany(tenantAId, 'advisor_identity', advisorId);
      expect(rows).toHaveLength(1);
    });

    it('Company A (active Assignment) CAN read its own Assignment row (positive control)', async () => {
      const rows = await queryAsCompany(tenantAId, 'advisor_assignment', assignmentAId);
      expect(rows).toHaveLength(1);
    });

    it("Company B (no Assignment at all) CANNOT read the Advisor identity (negative)", async () => {
      const rows = await queryAsCompany(tenantBId, 'advisor_identity', advisorId);
      expect(rows).toHaveLength(0);
    });

    it("Company B (no Assignment at all) CANNOT read Company A's Assignment row (negative)", async () => {
      const rows = await queryAsCompany(tenantBId, 'advisor_assignment', assignmentAId);
      expect(rows).toHaveLength(0);
    });

    it('the Advisor themself CAN always read their own identity + assignment row, independent of Company-side visibility', async () => {
      const identityRows = await queryAsAdvisor('advisor_identity', advisorId);
      const assignmentRows = await queryAsAdvisor('advisor_assignment', assignmentAId);
      expect(identityRows).toHaveLength(1);
      expect(assignmentRows).toHaveLength(1);
    });

    describe('after the Assignment ends — "no former-Advisor operational access after Assignment end" (founder prompt §16)', () => {
      beforeAll(async () => {
        await client.query(
          `UPDATE advisor.advisor_assignment SET status = 'ended', effective_to = now(), reason = 'RLS-22 fixture teardown scenario' WHERE id = $1`,
          [assignmentAId],
        );
      });

      it('Company A (now-ended Assignment) LOSES read access to the Advisor identity', async () => {
        const rows = await queryAsCompany(tenantAId, 'advisor_identity', advisorId);
        expect(rows).toHaveLength(0);
      });

      it('Company A (now-ended Assignment) LOSES read access to the ended Assignment row itself', async () => {
        const rows = await queryAsCompany(tenantAId, 'advisor_assignment', assignmentAId);
        expect(rows).toHaveLength(0);
      });

      it('the Advisor themself STILL reads their own identity + ended Assignment row (self-scope is Assignment-state-independent)', async () => {
        const identityRows = await queryAsAdvisor('advisor_identity', advisorId);
        const assignmentRows = await queryAsAdvisor('advisor_assignment', assignmentAId);
        expect(identityRows).toHaveLength(1);
        expect(assignmentRows).toHaveLength(1);
      });
    });
  },
);
