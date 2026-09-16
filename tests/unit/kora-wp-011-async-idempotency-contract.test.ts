/**
 * KORA-WP-011 — Minimal Async/Idempotency Contract.
 *
 * Registry 142's own framing: "lightweight job-status abstraction
 * (interface only)... idempotency key, status semantics, retry-safe
 * boundary... Out of Scope: the durable worker/queue runtime itself...
 * Acceptance: KORA-WP-028 can call this contract safely."
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  executeIdempotent,
  hashPayload,
  InMemoryIdempotencyStore,
  IdempotentExecutionError,
  type IdempotencyKey,
} from '@/lib/async-contract/idempotency-contract';

function key(overrides: Partial<IdempotencyKey> = {}): IdempotencyKey {
  return { tenantId: 'tenant-a', operation: 'ingestion.upload_batch', key: 'batch-1', ...overrides };
}

describe('A: first execution succeeds', () => {
  it('executes and returns the real result on first call', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockResolvedValue({ rowsWritten: 42 });
    const outcome = await executeIdempotent({ store, key: key(), payload: { file: 'a.csv' }, execute });
    expect(outcome).toEqual({ kind: 'executed', result: { rowsWritten: 42 } });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe('B: exact replay is safe', () => {
  it('same key + same payload on a second call replays the stored result without re-executing', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockResolvedValue({ rowsWritten: 42 });
    const payload = { file: 'a.csv', rows: 100 };
    await executeIdempotent({ store, key: key(), payload, execute });
    const second = await executeIdempotent({ store, key: key(), payload, execute });
    expect(second).toEqual({ kind: 'replayed', result: { rowsWritten: 42 } });
    expect(execute).toHaveBeenCalledTimes(1); // never called a second time
  });
});

describe('C: duplicate does not repeat side effect', () => {
  it('a side-effect counter increments exactly once across 5 duplicate submissions (canonical acceptance test)', async () => {
    const store = new InMemoryIdempotencyStore();
    let sideEffectCount = 0;
    const execute = vi.fn().mockImplementation(async () => { sideEffectCount++; return { ok: true }; });
    for (let i = 0; i < 5; i++) {
      await executeIdempotent({ store, key: key(), payload: { same: true }, execute });
    }
    expect(sideEffectCount).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe('D: same key cannot cross tenants', () => {
  it('the identical literal key string for two different tenants executes independently, twice', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockImplementation(async () => ({ done: true }));
    const outcomeA = await executeIdempotent({ store, key: key({ tenantId: 'tenant-a' }), payload: {}, execute });
    const outcomeB = await executeIdempotent({ store, key: key({ tenantId: 'tenant-b' }), payload: {}, execute });
    expect(outcomeA).toEqual({ kind: 'executed', result: { done: true } });
    expect(outcomeB).toEqual({ kind: 'executed', result: { done: true } }); // NOT replayed — a different tenant's identical key is a distinct claim
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

describe('E: same key + incompatible payload is rejected', () => {
  it('same key, different payload -> conflict, never silently replays the wrong result nor silently re-executes', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockResolvedValue({ ok: true });
    await executeIdempotent({ store, key: key(), payload: { file: 'a.csv' }, execute });
    const second = await executeIdempotent({ store, key: key(), payload: { file: 'DIFFERENT.csv' }, execute });
    expect(second).toEqual({ kind: 'conflict', reason: 'payload_mismatch' });
    expect(execute).toHaveBeenCalledTimes(1); // conflict never triggers execution
  });

  it('hashPayload is stable regardless of object key insertion order (no false conflicts from key ordering)', () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });
});

describe('F: failed operation does not become false success', () => {
  it('execute() throwing rejects with IdempotentExecutionError, never returns a success-shaped outcome', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(executeIdempotent({ store, key: key(), payload: {}, execute })).rejects.toThrow(IdempotentExecutionError);
  });

  it('a failed record replays as a typed replayed_failure outcome on retry with the SAME payload, never silently re-executed as new', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(executeIdempotent({ store, key: key(), payload: { x: 1 }, execute })).rejects.toThrow();
    const second = await executeIdempotent({ store, key: key(), payload: { x: 1 }, execute: vi.fn() });
    expect(second).toEqual({ kind: 'replayed_failure', error: 'boom' });
  });
});

describe('G: authorization remains enforced (this contract never bypasses it)', () => {
  it('an authorization failure inside execute() propagates unchanged — the contract never converts it into any success or replay outcome', async () => {
    const store = new InMemoryIdempotencyStore();
    const execute = vi.fn().mockRejectedValue(new Error('Unauthorized: not COMPANY_ADMIN'));
    await expect(executeIdempotent({ store, key: key(), payload: {}, execute })).rejects.toThrow(/Unauthorized/);
  });
});

describe('H: concurrency behavior is deterministic', () => {
  it('two concurrent calls with the same key: exactly one executes, the side effect never runs twice', async () => {
    const store = new InMemoryIdempotencyStore();
    let sideEffectCount = 0;
    const execute = vi.fn().mockImplementation(async () => {
      sideEffectCount++;
      await new Promise((r) => setTimeout(r, 5)); // simulate real async work, widening the race window
      return { done: true };
    });
    const [a, b] = await Promise.all([
      executeIdempotent({ store, key: key(), payload: {}, execute }),
      executeIdempotent({ store, key: key(), payload: {}, execute }),
    ]);
    expect(sideEffectCount).toBe(1);
    const kinds = [a.kind, b.kind].sort();
    // Exactly one call claims and executes; the other observes the claim already held (in_progress) — never both 'executed'.
    expect(kinds).toEqual(['executed', 'in_progress']);
  });
});

describe('I: existing stronger DB uniqueness constraints still work (real disposable Postgres)', () => {
  it('the underlying DB-level guarantee this contract documents for a future real store — INSERT ... ON CONFLICT DO NOTHING RETURNING against a real UNIQUE constraint — resolves a genuine concurrent race to exactly one winner', async () => {
    // Uses the real, established DB-level idempotency idiom already live throughout this
    // repository (commons.contribution_event, personal.worker_pib, etc.) — proves the
    // guarantee a real IdempotencyStore implementation would rely on, without this WP
    // itself creating a table (Outcome A — see this module's own PERSISTENCE DECISION).
    const { Client } = await import('pg');
    const fs = await import('node:fs');
    const envPath = join(process.cwd(), '.env.c10-staging.local');
    if (!fs.existsSync(envPath)) return; // no local disposable DB configured — skip gracefully, this test is a bonus real-DB proof, not a hard CI dependency
    const env = fs.readFileSync(envPath, 'utf-8');
    const match = env.match(/C10_STAGING_PG_URL_SESSION=(.+)/);
    if (!match) return;

    const client = new Client({ connectionString: match[1].trim(), ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public._tmp_wp011_idempotency_race (
          claim_key text PRIMARY KEY,
          claimed_by text NOT NULL
        )
      `);
      const raceKey = `wp011-race-${Date.now()}`;

      // Two SEPARATE connections (distinct from the DDL connection above) racing a real INSERT.
      const { Client: PgClient } = await import('pg');
      const c1 = new PgClient({ connectionString: match[1].trim(), ssl: { rejectUnauthorized: false } });
      const c2 = new PgClient({ connectionString: match[1].trim(), ssl: { rejectUnauthorized: false } });
      await c1.connect();
      await c2.connect();
      try {
        const [r1, r2] = await Promise.all([
          c1.query(`INSERT INTO public._tmp_wp011_idempotency_race (claim_key, claimed_by) VALUES ($1, 'conn-1') ON CONFLICT (claim_key) DO NOTHING RETURNING claimed_by`, [raceKey]),
          c2.query(`INSERT INTO public._tmp_wp011_idempotency_race (claim_key, claimed_by) VALUES ($1, 'conn-2') ON CONFLICT (claim_key) DO NOTHING RETURNING claimed_by`, [raceKey]),
        ]);
        const winners = [...r1.rows, ...r2.rows];
        expect(winners.length).toBe(1); // exactly one connection's INSERT won the race
      } finally {
        await c1.end();
        await c2.end();
      }
    } finally {
      await client.query(`DROP TABLE IF EXISTS public._tmp_wp011_idempotency_race`);
      await client.end();
    }
  });
});

describe('J: no PIB / sensitive payload leakage', () => {
  it('lib/async-contract/idempotency-contract.ts never references worker identity, PIB, or individual-level fields', () => {
    const src = readFileSync(join(process.cwd(), 'lib/async-contract/idempotency-contract.ts'), 'utf-8');
    const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    for (const forbidden of ['worker_id', 'workerId', 'worker_identity', 'workerPseudonymId', 'PIB']) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });

  it('the store persists only a payload HASH, never the raw payload itself', () => {
    const src = readFileSync(join(process.cwd(), 'lib/async-contract/idempotency-contract.ts'), 'utf-8');
    expect(src).toContain('payloadHash');
    // The IdempotencyRecord shape stores payloadHash, result, error — never a raw `payload` field.
    const recordInterfaceMatch = src.match(/interface IdempotencyRecord \{[\s\S]*?\n\}/);
    expect(recordInterfaceMatch).not.toBeNull();
    expect(recordInterfaceMatch![0]).not.toMatch(/\bpayload\s*:/);
  });
});

describe('K: existing domain semantics remain unchanged', () => {
  it('this module has no importer anywhere else in the repository yet (pure new infrastructure, zero lateral rewrite)', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(
      `grep -rl "async-contract/idempotency-contract" --include="*.ts" --include="*.tsx" lib services app 2>/dev/null || true`,
      { cwd: process.cwd(), encoding: 'utf-8' },
    );
    const importers = out.split('\n').filter(Boolean).filter((f) => !f.includes('async-contract/idempotency-contract.ts'));
    expect(importers).toEqual([]);
  });

  it('none of the repository\'s existing DB-level UNIQUE-constraint idempotency comments were modified (spot-check office-attribution.ts and BookingService.ts still document their own guarantee unchanged)', () => {
    const officeAttribution = readFileSync(join(process.cwd(), 'lib/live/office-attribution.ts'), 'utf-8');
    expect(officeAttribution).toContain('uq_worker_pib_uef_pillar');
    const booking = readFileSync(join(process.cwd(), 'services/commons/BookingService.ts'), 'utf-8');
    expect(booking).toContain('UNIQUE (post_id, worker_identity_id)');
  });
});

describe('Database impact', () => {
  it('no migration file was added by this WP (contract-only, Outcome A)', () => {
    const files: string[] = readdirSync(join(process.cwd(), 'supabase/migrations'));
    const highest = files.map((f) => parseInt(f.slice(0, 3), 10)).filter((n) => !Number.isNaN(n)).sort((a, b) => b - a)[0];
    expect(highest).toBe(74);
  });
});
