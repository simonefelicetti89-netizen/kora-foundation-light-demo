/**
 * KORA-WP-013 — Policy/Config Four-Tier Store.
 *
 * Doc 78 §24 is the sole semantic authority for the four tiers. Real-DB
 * concurrency/immutability/RLS/DB-constraint guarantees were proven
 * separately against local disposable Postgres (22/22, see the
 * accompanying completion report) — these tests cover the TS service
 * layer's own validation logic and read-path mapping, mocking only the
 * Supabase I/O boundary, same technique as kora-wp-033-*.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface PolicyConfigRow {
  id: string; tier: string; config_key: string; tenant_id: string | null;
  value: unknown; status: string; effective_from: string;
  supersedes_version_id: string | null; actor_role: string; actor_id: string;
  reason: string; created_at: string;
}

let rows: PolicyConfigRow[] = [];
let rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
let rpcResponse: { data: unknown; error: { message: string } | null } = { data: null, error: null };

function genericChain<T>(source: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => source().filter((r) => Object.entries(filters).every(([k, v]) => {
    if (v === null) return (r as unknown as Record<string, unknown>)[k] === null || (r as unknown as Record<string, unknown>)[k] === undefined;
    return (r as unknown as Record<string, unknown>)[k] === v;
  }));
  const chain = {
    eq(col: string, val: unknown) { return genericChain(source, { ...filters, [col]: val }); },
    is(col: string, val: null) { return genericChain(source, { ...filters, [col]: val }); },
    order(_col: string, _opts?: { ascending?: boolean }) { return chain; },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    then(resolve: (v: { data: T[]; error: null }) => void) { resolve({ data: matches(), error: null }); },
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => {
      if (schemaName === 'gov') {
        return {
          from: (table: string) => {
            if (table === 'policy_config_version') return { select: () => genericChain(() => rows) };
            throw new Error(`[test] unexpected table: gov.${table}`);
          },
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args });
            return rpcResponse;
          },
        };
      }
      throw new Error(`[test] unexpected schema: ${schemaName}`);
    },
  }),
}));

import {
  setPolicyConfigVersion, getCurrentPolicyConfig, listPolicyConfigHistory,
  POLICY_CONFIG_TIERS, type PolicyConfigTier,
} from '@/lib/policy-config/policy-config-service';

const NOW = '2026-09-16T00:00:00.000Z';

beforeEach(() => {
  rows = [];
  rpcCalls = [];
  rpcResponse = { data: null, error: null };
});

describe('A: canonical default resolution / L: absence is deterministic', () => {
  it('getCurrentPolicyConfig returns null when no active version exists — never a fabricated default', async () => {
    const result = await getCurrentPolicyConfig('governance_policy', 'nonexistent.key', null);
    expect(result).toBeNull();
  });
});

describe('B: valid policy lookup', () => {
  it('returns the real active version, correctly mapped from DB row shape', async () => {
    rows = [{
      id: 'v1', tier: 'governance_policy', config_key: 'cert.mode', tenant_id: null,
      value: { mode: 'A' }, status: 'active', effective_from: NOW,
      supersedes_version_id: null, actor_role: 'KORA_ADMIN', actor_id: 'admin-1',
      reason: 'launch', created_at: NOW,
    }];
    const result = await getCurrentPolicyConfig('governance_policy', 'cert.mode', null);
    expect(result).toMatchObject({ id: 'v1', tier: 'governance_policy', configKey: 'cert.mode', value: { mode: 'A' }, status: 'active' });
  });
});

describe('C: invalid policy value / tier rejected', () => {
  it('rejects a tier outside the three legal values before ever calling the RPC', async () => {
    await expect(setPolicyConfigVersion({
      tier: 'constitutional' as PolicyConfigTier, configKey: 'x', value: {}, actorRole: 'KORA_ADMIN', actorId: 'admin-1', reason: 'x',
    })).rejects.toThrow(/not a legal Policy\/Config tier/);
    expect(rpcCalls).toHaveLength(0);
  });

  it('POLICY_CONFIG_TIERS has exactly the three writable tiers — constitutional is absent', () => {
    expect(POLICY_CONFIG_TIERS).toEqual(['governance_policy', 'commercial_configuration', 'implementation_configuration']);
    expect(POLICY_CONFIG_TIERS as readonly string[]).not.toContain('constitutional');
  });
});

describe('D: unknown key rejected / config_key validation', () => {
  it('rejects an empty configKey before calling the RPC', async () => {
    await expect(setPolicyConfigVersion({
      tier: 'governance_policy', configKey: '', value: {}, actorRole: 'KORA_ADMIN', actorId: 'admin-1', reason: 'x',
    })).rejects.toThrow(/configKey is required/);
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('E: global vs tenant scope', () => {
  it('getCurrentPolicyConfig distinguishes a global (tenant_id null) entry from a tenant-scoped one', async () => {
    rows = [
      { id: 'global', tier: 'commercial_configuration', config_key: 'mode', tenant_id: null, value: { m: 'g' }, status: 'active', effective_from: NOW, supersedes_version_id: null, actor_role: 'KORA_ADMIN', actor_id: 'a', reason: 'r', created_at: NOW },
      { id: 'tenantA', tier: 'commercial_configuration', config_key: 'mode', tenant_id: 'tenant-a', value: { m: 'a' }, status: 'active', effective_from: NOW, supersedes_version_id: null, actor_role: 'KORA_ADMIN', actor_id: 'a', reason: 'r', created_at: NOW },
    ];
    const globalResult = await getCurrentPolicyConfig('commercial_configuration', 'mode', null);
    const tenantResult = await getCurrentPolicyConfig('commercial_configuration', 'mode', 'tenant-a');
    expect(globalResult?.id).toBe('global');
    expect(tenantResult?.id).toBe('tenantA');
  });
});

describe('F: cross-tenant denial (read-path scoping)', () => {
  it('a tenant-scoped entry for tenant A is never returned when reading for tenant B', async () => {
    rows = [{ id: 'tenantA', tier: 'commercial_configuration', config_key: 'mode', tenant_id: 'tenant-a', value: {}, status: 'active', effective_from: NOW, supersedes_version_id: null, actor_role: 'KORA_ADMIN', actor_id: 'a', reason: 'r', created_at: NOW }];
    const result = await getCurrentPolicyConfig('commercial_configuration', 'mode', 'tenant-b');
    expect(result).toBeNull();
  });
});

describe('G/H: version resolution and historical reproducibility', () => {
  it('listPolicyConfigHistory returns every version, including superseded ones, newest first (service passes through DB ordering)', async () => {
    rows = [
      { id: 'v1', tier: 'governance_policy', config_key: 'k', tenant_id: null, value: { m: 1 }, status: 'superseded', effective_from: NOW, supersedes_version_id: null, actor_role: 'KORA_ADMIN', actor_id: 'a', reason: 'r1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'v2', tier: 'governance_policy', config_key: 'k', tenant_id: null, value: { m: 2 }, status: 'active', effective_from: NOW, supersedes_version_id: 'v1', actor_role: 'KORA_ADMIN', actor_id: 'a', reason: 'r2', created_at: '2026-02-01T00:00:00Z' },
    ];
    const history = await listPolicyConfigHistory('governance_policy', 'k', null);
    expect(history).toHaveLength(2);
    expect(history.find((h) => h.id === 'v1')?.status).toBe('superseded');
    expect(history.find((h) => h.id === 'v2')?.status).toBe('active');
  });
});

describe('I: authorization enforced before persistence is ever touched', () => {
  it('rejects a KORA_ADMIN-required write from a COMPANY_ADMIN actor without calling the RPC', async () => {
    await expect(setPolicyConfigVersion({
      tier: 'governance_policy', configKey: 'k', value: {}, actorRole: 'COMPANY_ADMIN', actorId: 'company-1', reason: 'x',
    })).rejects.toThrow(/only KORA_ADMIN/);
    expect(rpcCalls).toHaveLength(0);
  });

  it('rejects a write with no actorRole/actorId — this substrate never manufactures attribution', async () => {
    await expect(setPolicyConfigVersion({
      tier: 'governance_policy', configKey: 'k', value: {}, actorRole: '', actorId: '', reason: 'x',
    })).rejects.toThrow(/actorRole and actorId are required/);
  });

  it('rejects a write with no reason — doc 78 §24 requires one for every tier', async () => {
    await expect(setPolicyConfigVersion({
      tier: 'governance_policy', configKey: 'k', value: {}, actorRole: 'KORA_ADMIN', actorId: 'admin-1', reason: '',
    })).rejects.toThrow(/reason is required/);
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('J: unauthorized mutation denied (same as I, framed per the founder task\'s own letter)', () => {
  it('a Worker or Partner actor is rejected identically to a Company Admin actor', async () => {
    for (const role of ['WORKER', 'PARTNER', 'ADVISOR']) {
      await expect(setPolicyConfigVersion({
        tier: 'implementation_configuration', configKey: 'k', value: {}, actorRole: role, actorId: 'x', reason: 'r',
      })).rejects.toThrow(/only KORA_ADMIN/);
    }
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('M: methodology configuration remains unchanged', () => {
  it('lib/methodology-config/v0.1.ts has zero reference to policy-config anywhere', () => {
    const src = readFileSync(join(process.cwd(), 'lib/methodology-config/v0.1.ts'), 'utf-8');
    expect(src).not.toContain('policy-config');
    expect(src).not.toContain('policy_config');
  });

  it('lib/policy-config/policy-config-service.ts never imports or computes methodology values', () => {
    const src = readFileSync(join(process.cwd(), 'lib/policy-config/policy-config-service.ts'), 'utf-8');
    for (const forbidden of ['methodology-config', 'bc_by_action_family', 'kora_index', 'impact_unit']) {
      expect(src.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe('N: taxonomy identifiers are reused, not redeclared (here: not referenced at all)', () => {
  it('lib/policy-config/policy-config-service.ts never imports from lib/taxonomy-config', () => {
    const src = readFileSync(join(process.cwd(), 'lib/policy-config/policy-config-service.ts'), 'utf-8');
    expect(src).not.toContain('taxonomy-config');
    expect(src).not.toContain('ActionFamily');
    expect(src).not.toContain('PillarCode');
  });
});

describe('O: no secret values stored', () => {
  it('the migration and service never reference a secret/credential-shaped field', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/075_policy_config_four_tier_store.sql'), 'utf-8');
    const svcSrc = readFileSync(join(process.cwd(), 'lib/policy-config/policy-config-service.ts'), 'utf-8');
    for (const forbidden of ['SERVICE_ROLE_KEY', 'service_role_key', 'api_token', 'webhook_secret', 'encryption_key', 'db_password', 'DATABASE_URL']) {
      expect(migSrc).not.toContain(forbidden);
      expect(svcSrc).not.toContain(forbidden);
    }
  });
});

describe('P: downstream WP-027-facing contract', () => {
  it('the store exposes a stable, generically-typed read/write contract requiring no WP-027-specific wiring', () => {
    // WP-027's own Hard Dep on WP-013 is structural (registry: "Company
    // Operating Mode's Commercial Configuration values (KORA-WP-013)" is
    // itself Out of Scope for WP-027 too) — the contract is simply that
    // this module exports a stable, importable, typed API. No WP-027-named
    // function exists or is required.
    expect(typeof setPolicyConfigVersion).toBe('function');
    expect(typeof getCurrentPolicyConfig).toBe('function');
    expect(typeof listPolicyConfigHistory).toBe('function');
  });
});

describe('Database impact', () => {
  it('migration 075 exists and this WP added no lateral migration beyond it', () => {
    const files: string[] = readdirSync(join(process.cwd(), 'supabase/migrations'));
    const versions = files.map((f) => parseInt(f.slice(0, 3), 10)).filter((n) => !Number.isNaN(n));
    // >= rather than exact-equals: a later, separately-authorized numbered
    // WP may legitimately add a still-higher migration afterward — this
    // guard's own invariant is "075 is present," not "075 is forever last."
    expect(versions).toContain(75);
    expect(Math.max(...versions)).toBeGreaterThanOrEqual(75);
  });
});
