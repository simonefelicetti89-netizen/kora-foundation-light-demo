// tests/unit/kora-link-public-lookup.test.ts
// KL-19 — lookupKoraLinkPublicState unit tests.
// No network calls. No Supabase. All external dependencies injected.
// Uses rpcClientOverride — no vi.mock needed.

import { describe, it, expect, vi } from 'vitest';
import { lookupKoraLinkPublicState, type KoraLinkRpcClient, type KoraLinkRpcRow } from '@/lib/kora-link/public-lookup';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const VALID_TOKEN = 'kl1_' + 'A'.repeat(48);
const VALID_SECRET = 'a'.repeat(64);

const LOOKUP_ENABLED_ENV = {
  KORA_LINK_ENABLED: 'true',
  KORA_LINK_TOKEN_SECRET: VALID_SECRET,
  KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
  KORA_LINK_DB_LOOKUP_ENABLED: 'true',
};

const LOOKUP_DISABLED_ENV = {
  KORA_LINK_ENABLED: 'true',
  KORA_LINK_TOKEN_SECRET: VALID_SECRET,
  KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
};

// ── Client helpers ─────────────────────────────────────────────────────────────

function rpcClient(rows: KoraLinkRpcRow[] | null, error: unknown = null): KoraLinkRpcClient {
  return { async rpc() { return { data: rows, error }; } };
}

function rpcThrowingClient(): KoraLinkRpcClient {
  return {
    async rpc(): Promise<never> {
      throw new Error('network failure');
    }
  };
}

// ── 1. DB lookup flag off ─────────────────────────────────────────────────────

describe('1. DB lookup flag off', () => {

  it('returns lookup_disabled when KORA_LINK_DB_LOOKUP_ENABLED is absent', async () => {
    const spy = vi.fn().mockResolvedValue({ data: null, error: null });
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_DISABLED_ENV,
      rpcClientOverride: { rpc: spy },
    });
    expect(result).toBe('lookup_disabled');
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns lookup_disabled when KORA_LINK_DB_LOOKUP_ENABLED is "false"', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: { ...LOOKUP_DISABLED_ENV, KORA_LINK_DB_LOOKUP_ENABLED: 'false' },
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).toBe('lookup_disabled');
  });

  it('returns lookup_disabled when KORA_LINK_DB_LOOKUP_ENABLED is "1" (not canonical "true")', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: { ...LOOKUP_DISABLED_ENV, KORA_LINK_DB_LOOKUP_ENABLED: '1' },
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).toBe('lookup_disabled');
  });

  it('returns lookup_disabled for any non-"true" value of DB_LOOKUP_ENABLED', async () => {
    for (const val of ['True', 'TRUE', 'yes', 'on', '']) {
      const result = await lookupKoraLinkPublicState({
        validatedToken: VALID_TOKEN,
        secret: VALID_SECRET,
        env: { ...LOOKUP_DISABLED_ENV, KORA_LINK_DB_LOOKUP_ENABLED: val },
        rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
      });
      expect(result).toBe('lookup_disabled');
    }
  });

  it('does not compute digest when lookup flag is off (empty secret would fail digest)', async () => {
    // If computeDigest were called with empty secret it would throw.
    // Since flag is off, no throw — returns lookup_disabled safely.
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: '',
      env: LOOKUP_DISABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).toBe('lookup_disabled');
  });

  it('KORA_LINK_DB_LOOKUP_ENABLED absent in empty env defaults to disabled', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: {},
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).toBe('lookup_disabled');
  });

});

// ── 2. RPC result mapping ─────────────────────────────────────────────────────

describe('2. RPC result mapping', () => {

  it('returns ready when RPC returns status=ready', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).toBe('ready');
  });

  it('returns unavailable when RPC returns status=unavailable', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'unavailable', reason: 'link_not_available' }]),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when RPC returns status=unavailable with service_unavailable reason', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'unavailable', reason: 'service_unavailable' }]),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when RPC returns a non-null error', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient(null, { message: 'db error', code: '42P01' }),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when RPC throws', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcThrowingClient(),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when RPC data is null (no error)', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient(null),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when RPC data is empty array', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([]),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when RPC status is an unexpected value', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'unknown_status', reason: 'x' }]),
    });
    expect(result).toBe('unavailable');
  });

  it('returns unavailable when secret is empty (computeDigest throws)', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: '',
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).toBe('unavailable');
  });

});

// ── 3. Digest computation ─────────────────────────────────────────────────────

describe('3. Digest computation', () => {

  it('calls RPC with 64-char hex digest, not with raw token', async () => {
    let capturedArgs: { p_token_digest: string } | undefined;
    await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: {
        async rpc(_fn, args) {
          capturedArgs = args;
          return { data: [{ status: 'ready', reason: 'link_ready' }], error: null };
        }
      },
    });
    expect(capturedArgs).toBeDefined();
    expect(capturedArgs!.p_token_digest).not.toBe(VALID_TOKEN);
    expect(capturedArgs!.p_token_digest).not.toMatch(/kl1_/);
    expect(capturedArgs!.p_token_digest.length).toBe(64);
    expect(capturedArgs!.p_token_digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('digest is deterministic for same token + secret across two calls', async () => {
    const captured: string[] = [];
    const capturingClient: KoraLinkRpcClient = {
      async rpc(_fn, args) {
        captured.push(args.p_token_digest);
        return { data: [{ status: 'ready', reason: 'link_ready' }], error: null };
      }
    };
    await lookupKoraLinkPublicState({ validatedToken: VALID_TOKEN, secret: VALID_SECRET, env: LOOKUP_ENABLED_ENV, rpcClientOverride: capturingClient });
    await lookupKoraLinkPublicState({ validatedToken: VALID_TOKEN, secret: VALID_SECRET, env: LOOKUP_ENABLED_ENV, rpcClientOverride: capturingClient });
    expect(captured.length).toBe(2);
    expect(captured[0]).toBe(captured[1]);
  });

  it('different tokens produce different digests', async () => {
    const OTHER_TOKEN = 'kl1_' + 'B'.repeat(48);
    const captured: string[] = [];
    const capturingClient: KoraLinkRpcClient = {
      async rpc(_fn, args) {
        captured.push(args.p_token_digest);
        return { data: [{ status: 'ready', reason: 'link_ready' }], error: null };
      }
    };
    await lookupKoraLinkPublicState({ validatedToken: VALID_TOKEN, secret: VALID_SECRET, env: LOOKUP_ENABLED_ENV, rpcClientOverride: capturingClient });
    await lookupKoraLinkPublicState({ validatedToken: OTHER_TOKEN, secret: VALID_SECRET, env: LOOKUP_ENABLED_ENV, rpcClientOverride: capturingClient });
    expect(captured.length).toBe(2);
    expect(captured[0]).not.toBe(captured[1]);
  });

  it('calls fn_public_lookup_link (exact RPC function name)', async () => {
    let capturedFn: string | undefined;
    await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: {
        async rpc(fn, _args) {
          capturedFn = fn;
          return { data: [{ status: 'ready', reason: 'link_ready' }], error: null };
        }
      },
    });
    expect(capturedFn).toBe('fn_public_lookup_link');
  });

});

// ── 4. Privacy safety ─────────────────────────────────────────────────────────

describe('4. Privacy safety', () => {

  it('return value does not contain raw token string', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcClient([{ status: 'ready', reason: 'link_ready' }]),
    });
    expect(result).not.toContain(VALID_TOKEN);
    expect(result).not.toMatch(/kl1_/);
  });

  it('return value does not contain full digest (64-char hex)', async () => {
    let capturedDigest = '';
    const capturingClient: KoraLinkRpcClient = {
      async rpc(_fn, args) {
        capturedDigest = args.p_token_digest;
        return { data: [{ status: 'ready', reason: 'link_ready' }], error: null };
      }
    };
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: capturingClient,
    });
    expect(capturedDigest.length).toBe(64);
    expect(result).not.toContain(capturedDigest);
  });

  it('unavailable return value does not expose token or digest details', async () => {
    const result = await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: rpcThrowingClient(),
    });
    expect(result).toBe('unavailable');
    expect(typeof result).toBe('string');
    expect(result.length).toBeLessThan(32);
  });

  it('RPC call args do not include raw token field', async () => {
    let capturedArgs: Record<string, string> | undefined;
    await lookupKoraLinkPublicState({
      validatedToken: VALID_TOKEN,
      secret: VALID_SECRET,
      env: LOOKUP_ENABLED_ENV,
      rpcClientOverride: {
        async rpc(_fn, args) {
          capturedArgs = args as Record<string, string>;
          return { data: [{ status: 'ready', reason: 'link_ready' }], error: null };
        }
      },
    });
    expect(capturedArgs).toBeDefined();
    // Only p_token_digest should be in the args — no raw_token, no token, no token_value
    expect(Object.keys(capturedArgs!)).toEqual(['p_token_digest']);
    expect(capturedArgs!['p_token_digest']).not.toBe(VALID_TOKEN);
  });

});
