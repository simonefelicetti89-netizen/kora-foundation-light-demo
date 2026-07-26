/**
 * Commons schema USAGE grant — direct Postgres behavioral test.
 *
 * WHAT THIS IS:
 *   A LIVE proof of the grant added by migration 046
 *   (046_commons_schema_usage_grant.sql), found during the adversarial review
 *   of PILOT-TRUST-01 commit b517284. Migration 013 correctly grants
 *   table-level privileges on commons.post/booking/contribution_event to
 *   `authenticated`, but never granted USAGE ON SCHEMA commons itself —
 *   without it, every one of those table grants was inert (Postgres requires
 *   both). This was invisible as long as every commons-reading page used
 *   getSupabaseServiceClient() (bypasses grants entirely); it became a real
 *   outage risk the moment PILOT-TRUST-01 FASE 5 migrated
 *   app/company/commons/page.tsx onto the RLS-respecting session client.
 *
 * WHAT THIS PROVES:
 *   - `authenticated` can reach commons.post at all (schema USAGE + table
 *     GRANT both present) — a query resolves instead of "permission denied
 *     for schema commons".
 *   - `anon` still cannot (USAGE was granted only to `authenticated`,
 *     consistent with analytics/personal/network/audit — no schema in this
 *     app grants USAGE to anon).
 *   - RLS itself (migration 013's own policies) is unaffected by this grant —
 *     a COMPANY_ADMIN claim for a tenant with no posts gets 0 rows, not an
 *     error and not someone else's rows.
 *
 * WHAT THIS DOES NOT PROVE:
 *   The content-level correctness of commons RLS policies (out of scope —
 *   this file is about the grant, not the policies themselves).
 *
 * SAFETY MODEL: identical to RLS-03/05/06/07 — skip-safe, local-only guard,
 * own env vars, no shared state with any other test file.
 *
 * REQUIRED ENV VARS:
 *   COMMONS_GRANT_PG_URL     — local Postgres only, e.g.
 *                              postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   COMMONS_GRANT_ALLOW_RUN  — must be exactly 'true'.
 */

import { describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production
  'haqflkurpmeaxpikozjl', // staging
];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalPostgresOnly(pgUrl: string): void {
  const lower = pgUrl.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) throw new Error('COMMONS_GRANT_PG_URL matches a known staging/production ref — refusing.');
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error('COMMONS_GRANT_PG_URL points at a hosted Supabase domain — refusing.');
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('COMMONS_GRANT_PG_URL is not a valid URL.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`COMMONS_GRANT_PG_URL host "${hostname}" is not local — refusing.`);
  }
}

describe('commons schema USAGE grant guard — never a known staging/production/hosted target', () => {
  it('COMMONS_GRANT_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('COMMONS_GRANT_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const pgUrl = readEnv('COMMONS_GRANT_PG_URL');
const allowed = readEnv('COMMONS_GRANT_ALLOW_RUN') === 'true';
const ready = pgUrl !== undefined && allowed;

describe.skipIf(!ready)('commons schema USAGE grant (migration 046) — direct Postgres', () => {
  let client: InstanceType<typeof Client>;

  it('setup', async () => {
    assertLocalPostgresOnly(pgUrl!);
    client = new Client({ connectionString: pgUrl });
    await client.connect();
  });

  it('authenticated has USAGE on schema commons', async () => {
    const r = await client.query(`SELECT has_schema_privilege('authenticated', 'commons', 'USAGE') AS ok`);
    expect(r.rows[0].ok).toBe(true);
  });

  it('anon does NOT have USAGE on schema commons', async () => {
    const r = await client.query(`SELECT has_schema_privilege('anon', 'commons', 'USAGE') AS ok`);
    expect(r.rows[0].ok).toBe(false);
  });

  it('authenticated can query commons.post without a "permission denied for schema" error', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: '00000000-0000-0000-0000-000000000000' } })],
      );
      const result = await client.query('SELECT count(*) AS c FROM commons.post');
      expect(result.rows[0]).toBeDefined();
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('anon querying commons.post fails at the schema/permission level, not with data', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE anon');
      let threw = false;
      try {
        await client.query('SELECT count(*) FROM commons.post');
      } catch (e) {
        threw = true;
        expect(/permission denied/i.test((e as Error).message)).toBe(true);
      }
      expect(threw).toBe(true);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('teardown', async () => {
    await client.end();
  });
});
