// tests/unit/kora-wp-088-fixture-cleanup-fail-closed.test.ts
// KORA-WP-088 — cleanup must fail closed.
//
// Defect this locks down: cleanup skipped each role whose email was unset and
// still printed "cleanup complete: partner identity + auth user removed",
// exiting 0. A real run against staging removed nothing while reporting that
// it had, leaving the EPHEMERAL PARTNER auth user live behind a green log.
//
// These are behavioural tests, not source assertions: the module is imported
// and its cleanup entry point is driven directly. That is possible because the
// script now auto-runs main() only under direct invocation.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLEANUP_REQUIRED_ENV,
  FixtureEnvError,
  missingCleanupEnv,
  assertCleanupEnvComplete,
  cleanupAll,
} from '@/scripts/e2e/provision-staging-e2e-fixtures';

const SCRIPT = 'scripts/e2e/provision-staging-e2e-fixtures.ts';
const source = () => readFileSync(join(process.cwd(), SCRIPT), 'utf-8');

const PARTNER_EMAIL = 'partner-fixture@staging.kora.internal';
const ADVISOR_EMAIL = 'advisor-fixture@staging.kora.internal';

/** Any property access fails the test — proves cleanup never reached the DB. */
function forbiddenDb(): SupabaseClient {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        throw new Error(`DB TOUCHED: .${String(prop)} was accessed during a refused cleanup`);
      },
    },
  ) as unknown as SupabaseClient;
}

/** Minimal stub covering exactly the surface cleanup uses. */
function stubDb(opts: { partnerUserExists: boolean }) {
  const calls: string[] = [];
  const users = [
    { id: 'aaaaaaaa-1111-2222-3333-444444444444', email: ADVISOR_EMAIL },
    ...(opts.partnerUserExists
      ? [{ id: 'bbbbbbbb-1111-2222-3333-444444444444', email: PARTNER_EMAIL }]
      : []),
  ];
  const db = {
    auth: {
      admin: {
        listUsers: async () => {
          calls.push('listUsers');
          return { data: { users }, error: null };
        },
        deleteUser: async (id: string) => {
          calls.push(`deleteUser:${id}`);
          return { error: null };
        },
      },
    },
    schema: (name: string) => ({
      from: (table: string) => ({
        delete: () => ({
          eq: async (col: string) => {
            calls.push(`delete:${name}.${table}.${col}`);
            return { error: null };
          },
        }),
      }),
    }),
  };
  return { db: db as unknown as SupabaseClient, calls };
}

// Must await fn(): a synchronous finally would restore the env before an async
// body ever read it — which is exactly how the first draft of these tests
// silently ran against the ambient environment.
async function withEnv<T>(
  patch: Record<string, string | undefined>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(patch)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const BOTH_SET = { E2E_PARTNER_EMAIL: PARTNER_EMAIL, E2E_ADVISOR_EMAIL: ADVISOR_EMAIL };

describe('KORA-WP-088 — cleanup fails closed on incomplete fixture env', () => {
  it('declares both fixture emails as required for cleanup', () => {
    expect([...CLEANUP_REQUIRED_ENV]).toEqual(['E2E_PARTNER_EMAIL', 'E2E_ADVISOR_EMAIL']);
  });

  // 1. missing Partner email => cleanup fails closed
  it('refuses cleanup when only the Partner email is missing', async () => {
    await withEnv({ ...BOTH_SET, E2E_PARTNER_EMAIL: undefined }, async () => {
      expect(missingCleanupEnv()).toEqual(['E2E_PARTNER_EMAIL']);
      await expect(cleanupAll(forbiddenDb())).rejects.toBeInstanceOf(FixtureEnvError);
    });
  });

  // 2. missing Advisor email => cleanup fails closed
  it('refuses cleanup when only the Advisor email is missing', async () => {
    await withEnv({ ...BOTH_SET, E2E_ADVISOR_EMAIL: undefined }, async () => {
      expect(missingCleanupEnv()).toEqual(['E2E_ADVISOR_EMAIL']);
      await expect(cleanupAll(forbiddenDb())).rejects.toBeInstanceOf(FixtureEnvError);
    });
  });

  // 3. missing both => cleanup fails closed
  it('refuses cleanup when both fixture emails are missing', async () => {
    await withEnv({ E2E_PARTNER_EMAIL: undefined, E2E_ADVISOR_EMAIL: undefined }, async () => {
      expect(missingCleanupEnv()).toEqual(['E2E_PARTNER_EMAIL', 'E2E_ADVISOR_EMAIL']);
      await expect(cleanupAll(forbiddenDb())).rejects.toBeInstanceOf(FixtureEnvError);
    });
  });

  it('treats an empty or whitespace-only value as missing, not as a valid email', async () => {
    await withEnv({ ...BOTH_SET, E2E_PARTNER_EMAIL: '   ' }, () => {
      expect(missingCleanupEnv()).toEqual(['E2E_PARTNER_EMAIL']);
      expect(() => assertCleanupEnvComplete()).toThrow(FixtureEnvError);
    });
  });

  // 4. no cleanup mutation is attempted in those cases
  it('attempts no mutation at all when the env is incomplete — not even for the role that is set', async () => {
    for (const patch of [
      { ...BOTH_SET, E2E_PARTNER_EMAIL: undefined },
      { ...BOTH_SET, E2E_ADVISOR_EMAIL: undefined },
      { E2E_PARTNER_EMAIL: undefined, E2E_ADVISOR_EMAIL: undefined },
    ]) {
      await withEnv(patch, async () => {
        const { db, calls } = stubDb({ partnerUserExists: true });
        await expect(cleanupAll(db)).rejects.toBeInstanceOf(FixtureEnvError);
        expect(calls).toEqual([]);
      });
    }
  });

  it('names only the missing variable(s) and never a value', async () => {
    await withEnv({ ...BOTH_SET, E2E_PARTNER_EMAIL: undefined }, async () => {
      let caught: unknown;
      try {
        await cleanupAll(forbiddenDb());
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(FixtureEnvError);
      const err = caught as FixtureEnvError;
      expect(err.missing).toEqual(['E2E_PARTNER_EMAIL']);
      expect(err.message).toContain('E2E_PARTNER_EMAIL');
      expect(err.message).not.toContain(ADVISOR_EMAIL);
    });
  });

  // 5. success summary appears only after an actually executed successful cleanup
  it('reports actions only for work actually executed', async () => {
    await withEnv(BOTH_SET, async () => {
      const { db, calls } = stubDb({ partnerUserExists: true });
      const performed = await cleanupAll(db);
      expect(calls).toContain('delete:network.partner_identity.auth_user_id');
      expect(calls).toContain('delete:network.partner_identity.email');
      expect(calls.some((c) => c.startsWith('deleteUser:'))).toBe(true);
      expect(performed.some((a) => a === 'PARTNER: auth user removed')).toBe(true);
      expect(performed.some((a) => a.startsWith('ADVISOR: no action taken, by design'))).toBe(true);
    });
  });

  it('reports "already absent" rather than "removed" when there was no auth user to delete', async () => {
    await withEnv(BOTH_SET, async () => {
      const { db, calls } = stubDb({ partnerUserExists: false });
      const performed = await cleanupAll(db);
      expect(calls.some((c) => c.startsWith('deleteUser:'))).toBe(false);
      expect(performed).toContain('PARTNER: auth user already absent — nothing removed');
      expect(performed).not.toContain('PARTNER: auth user removed');
    });
  });

  it('prints the summary only inside the cleanup branch, after cleanupAll() has returned', () => {
    const src = source();
    expect(src).not.toContain('cleanup complete: partner identity + auth user removed');
    // provision/verify may legitimately skip an unconfigured role; cleanup may not.
    for (const fn of ['partnerCleanup', 'advisorCleanup']) {
      const start = src.indexOf(`async function ${fn}(`);
      const body = src.slice(start, src.indexOf('\nasync function ', start + 1));
      expect(start).toBeGreaterThan(-1);
      expect(body).not.toContain('skipped');
    }
    const branchStart = src.indexOf("} else if (mode === 'cleanup') {");
    const branch = src.slice(branchStart, src.indexOf('} else {', branchStart));
    expect(branch.indexOf('await cleanupAll(db)')).toBeGreaterThan(-1);
    expect(branch.indexOf('cleanup actions performed')).toBeGreaterThan(
      branch.indexOf('await cleanupAll(db)'),
    );
  });

  it('gates cleanup before the Supabase client is constructed', () => {
    const src = source();
    const gate = src.indexOf("if (mode === 'cleanup') assertCleanupEnvCompleteOrFail();");
    const client = src.indexOf('const db = createClient(');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(client);
  });

  it('keeps verify as the authoritative post-state check', () => {
    expect(source()).toMatch(/authoritative post-state check/);
  });
});
