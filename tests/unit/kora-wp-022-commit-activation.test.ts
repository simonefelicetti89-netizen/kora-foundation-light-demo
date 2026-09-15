/**
 * KORA-WP-022 — Commit Activation Transaction + MVB Manifest (Layer C).
 *
 * Behavioral tests of lib/commitment/commit-activation-service.ts's own
 * TypeScript logic (authorization gate, RPC call shape, response mapping,
 * error propagation) with the Supabase RPC boundary mocked. The atomic
 * transaction itself — Lock 9 enforcement, the four-step atomicity
 * guarantee, post-commit immutability, MVB manifest correctness — lives
 * entirely in migration 067's own `analytics.commit_commitment()` Postgres
 * function and CANNOT be meaningfully proven by mocking an RPC call; that
 * proof is this WP's own real-DB validation (see the implementation
 * report), not here. This file's job is narrower and different: prove the
 * TS wrapper never lets an unauthorized actor reach the RPC at all, and
 * correctly shapes/unwraps the call.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rpcMock = vi.fn();
let manifestRows: Array<Record<string, unknown>> = [];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: () => ({
      rpc: rpcMock,
      from: (table: string) => {
        if (table !== 'commitment_mvb_manifest') throw new Error(`unexpected table: ${table}`);
        return {
          select: () => ({
            eq: (col1: string, val1: unknown) => ({
              eq: (col2: string, val2: unknown) => ({
                maybeSingle: async () => {
                  const match = manifestRows.find(
                    (r) => r[col1] === val1 && r[col2] === val2,
                  );
                  return { data: match ?? null, error: null };
                },
              }),
            }),
          }),
        };
      },
    }),
  }),
}));

let commitCommitment: typeof import('@/lib/commitment/commit-activation-service').commitCommitment;
let getMvbManifest: typeof import('@/lib/commitment/commit-activation-service').getMvbManifest;

const OWNER = { actorRole: 'COMPANY_ADMIN', actorId: 'admin-1' };

beforeEach(async () => {
  rpcMock.mockReset();
  manifestRows = [];
  ({ commitCommitment, getMvbManifest } = await import('@/lib/commitment/commit-activation-service'));
});

describe('KORA-WP-022 — commitCommitment() — authorization gate', () => {
  it('rejects a missing actor before ever calling the RPC', async () => {
    await expect(commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', actorRole: '', actorId: '' })).rejects.toThrow(/actorRole and actorId are required/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects an ADVISOR actor before ever calling the RPC (doc 73 §6 — NO, NEVER)', async () => {
    await expect(commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', actorRole: 'ADVISOR', actorId: 'adv-1' })).rejects.toThrow(/only COMPANY_ADMIN may activate/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects a KORA_ADMIN actor too — only the Decision Owner role may commit', async () => {
    await expect(commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', actorRole: 'KORA_ADMIN', actorId: 'admin-1' })).rejects.toThrow(/only COMPANY_ADMIN may activate/);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('KORA-WP-022 — commitCommitment() — RPC call shape and response mapping', () => {
  it('calls commit_commitment with exactly the expected params and schema', async () => {
    rpcMock.mockResolvedValue({ data: [{ manifest_id: 'mvb-1', committed_at: '2027-01-01T00:00:00Z' }], error: null });
    const result = await commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', ...OWNER });

    expect(rpcMock).toHaveBeenCalledWith(
      'commit_commitment',
      { p_commitment_id: 'cm-1', p_tenant_id: 'tenant-1', p_actor_role: 'COMPANY_ADMIN', p_actor_id: 'admin-1' },
    );
    expect(result).toEqual({ manifestId: 'mvb-1', committedAt: '2027-01-01T00:00:00Z' });
  });

  it('propagates a Lock-9 rejection from the RPC as a real error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'kora/lock-9: commitment "cm-1" has no Evidence Plan' } });
    await expect(commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', ...OWNER })).rejects.toThrow(/kora\/lock-9/);
  });

  it('propagates an already-committed rejection from the RPC', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'kora/already-committed: commitment "cm-1" is already "committed"' } });
    await expect(commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', ...OWNER })).rejects.toThrow(/kora\/already-committed/);
  });

  it('throws if the RPC returns no data at all', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await expect(commitCommitment({ commitmentId: 'cm-1', tenantId: 'tenant-1', ...OWNER })).rejects.toThrow(/no data returned/);
  });
});

describe('KORA-WP-022 — getMvbManifest()', () => {
  it('maps a real row correctly, including the always-null need_hypothesis field', async () => {
    manifestRows = [{
      id: 'mvb-1', tenant_id: 'tenant-1', commitment_id: 'cm-1',
      resource_allocation_total_amount: 5000, resource_allocation_entry_count: 2,
      evidence_known_missing_at_commit: true, need_hypothesis_status_snapshot: null,
      committed_at: '2027-01-01T00:00:00Z', actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1',
      created_at: '2027-01-01T00:00:00Z',
    }];
    const manifest = await getMvbManifest('cm-1', 'tenant-1');
    expect(manifest!.resourceAllocationTotalAmount).toBe(5000);
    expect(manifest!.resourceAllocationEntryCount).toBe(2);
    expect(manifest!.evidenceKnownMissingAtCommit).toBe(true);
    expect(manifest!.needHypothesisStatusSnapshot).toBeNull();
  });

  it('returns null when no manifest exists yet', async () => {
    expect(await getMvbManifest('cm-1', 'tenant-1')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scope integrity — TS wrapper + SQL migration content
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-022 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/commitment/commit-activation-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/067_commit_activation_transaction.sql'), 'utf-8');
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no active/reviewable/reviewed/closed/reactivated transition function exists (only committed is released)', () => {
    expect(src).not.toMatch(/export async function activate\b|export async function reviewCommitment|export async function closeCommitment|export async function reactivate/i);
  });

  it('no Core Decision Linkage, Review, Decision Pack, Program, or KORA Index/IU/Confidence/KPI logic', () => {
    expect(codeOnly).not.toMatch(/decision.?linkage|review.?(conclude|verdict)|decision.?pack|program.?(activate|definition)|kora.?index|confidence.?score|\bIU\b|kpi.?measure/i);
  });

  it('no Living KORAL anticipation', () => {
    expect(codeOnly).not.toMatch(/living.?koral|material.?change|morpholog/i);
  });

  it('migration releases status to exactly draft/committed and draft/frozen-at-commit — no third value', () => {
    expect(migrationSrc).toMatch(/CHECK \(status IN \('draft', 'committed'\)\)/);
    expect(migrationSrc).toMatch(/CHECK \(status IN \('draft', 'frozen-at-commit'\)\)/);
    expect(migrationSrc).not.toMatch(/'active'|'reviewable'|'reviewed'|'closed'|'reactivated'|'collecting'|'closed-at-review'/);
  });

  it('migration pins need_hypothesis_status_snapshot to NULL-only', () => {
    expect(migrationSrc).toMatch(/need_hypothesis_status_snapshot\s+text\s+CHECK \(need_hypothesis_status_snapshot IS NULL\)/);
  });

  it('migration grants EXECUTE on commit_commitment to service_role only', () => {
    expect(migrationSrc).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.commit_commitment\(uuid, uuid, text, text\) TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT EXECUTE.*TO (authenticated|anon|PUBLIC)/);
  });

  it('migration grants no DELETE anywhere on commitment_mvb_manifest', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT, INSERT, UPDATE ON analytics\.commitment_mvb_manifest TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON analytics\.commitment_mvb_manifest/);
  });

  it('migration has both post-commit immutability triggers and the resource-reference commit lock', () => {
    expect(migrationSrc).toMatch(/trg_commitment_post_commit_immutability/);
    expect(migrationSrc).toMatch(/trg_commitment_resource_reference_commit_lock/);
    expect(migrationSrc).toMatch(/trg_commitment_mvb_manifest_no_mutation/);
  });

  it('the SQL function enforces Lock 9 (no Evidence Plan / wrong state) and the one-or-more Resource Allocation requirement', () => {
    expect(migrationSrc).toMatch(/kora\/lock-9/);
    expect(migrationSrc).toMatch(/kora\/no-resource-allocation/);
    expect(migrationSrc).toMatch(/kora\/already-committed/);
  });

  it('the SQL function never calls allocate/commit/spend/release/reallocate on the ledger — read-only reference', () => {
    const fnBody = migrationSrc.match(/CREATE OR REPLACE FUNCTION analytics\.commit_commitment[\s\S]*?\$\$;/);
    expect(fnBody).not.toBeNull();
    expect(fnBody![0]).not.toMatch(/UPDATE analytics\.resource_allocation/);
  });

  it('migration 067 itself never explicitly grants EXECUTE to PUBLIC/anon/authenticated (only the implicit Postgres default did — closed by migration 068)', () => {
    expect(migrationSrc).not.toMatch(/GRANT EXECUTE.*ON FUNCTION analytics\.commit_commitment.*TO (PUBLIC|anon|authenticated)/i);
  });
});

describe('KORA-WP-022 security remediation — PUBLIC EXECUTE revoked (migration 068)', () => {
  const remediationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/068_commit_commitment_revoke_public_execute.sql'), 'utf-8');

  it('explicitly revokes EXECUTE on commit_commitment from PUBLIC', () => {
    expect(remediationSrc).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.commit_commitment\(uuid, uuid, text, text\) FROM PUBLIC;/);
  });

  it('does not touch function business logic, WP-022 semantics, or any other object', () => {
    expect(remediationSrc).not.toMatch(/CREATE OR REPLACE FUNCTION|ALTER TABLE|CREATE TABLE|DROP TABLE|CREATE TRIGGER/);
  });

  it('does not re-grant EXECUTE to service_role redundantly or to any broader role (the ROLLBACK section is a comment, excluded here)', () => {
    const activeCode = remediationSrc
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    expect(activeCode).not.toMatch(/GRANT EXECUTE/);
  });
});
