// tests/unit/kora-link-activation.test.ts
// KL-22 — KORA Link worker activation runtime unit tests.
// No Supabase mocked via vi.mock — RPC client is injected. No network. No DB.

import { describe, it, expect } from 'vitest';
import {
  activateKoraLinkForWorker,
  buildKoraLinkActivationState,
  KORA_LINK_ACTIVATION_CONSENT_VERSION,
  type KoraLinkActivationRpcClient,
  type KoraLinkActivationRpcRow,
} from '@/lib/kora-link/activation';
import { computeDigest, KORA_LINK_SECRET_MIN_LENGTH } from '@/lib/kora-link/token';
import { isKoraLinkActivationEnabled } from '@/lib/kora-link/config';
import type { KoraLinkEnv } from '@/lib/kora-link/config';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_SECRET = 'a'.repeat(KORA_LINK_SECRET_MIN_LENGTH);
const VALID_TOKEN = 'kl1_' + 'A'.repeat(48);
const VALID_WORKER_ID = '11111111-1111-4111-8111-111111111111';
const VALID_CONSENT = KORA_LINK_ACTIVATION_CONSENT_VERSION;

const ENABLED_ENV: KoraLinkEnv = { KORA_LINK_ACTIVATION_ENABLED: 'true' };
const DISABLED_ENV: KoraLinkEnv = {};

type RpcCall = { fn: string; args: Record<string, unknown> };

function makeSpyClient(response: {
  data: KoraLinkActivationRpcRow | KoraLinkActivationRpcRow[] | null;
  error: unknown | null;
}): { client: KoraLinkActivationRpcClient; calls: RpcCall[] } {
  const calls: RpcCall[] = [];
  const client: KoraLinkActivationRpcClient = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      return response;
    },
  };
  return { client, calls };
}

function throwingClient(): KoraLinkActivationRpcClient {
  return {
    async rpc() {
      throw new Error('network down');
    },
  };
}

// ── 1. isKoraLinkActivationEnabled (config.ts) ────────────────────────────────

describe('isKoraLinkActivationEnabled', () => {

  it('returns false when the env var is absent (default off)', () => {
    expect(isKoraLinkActivationEnabled({})).toBe(false);
  });

  it('returns false for "false"', () => {
    expect(isKoraLinkActivationEnabled({ KORA_LINK_ACTIVATION_ENABLED: 'false' })).toBe(false);
  });

  it('returns false for "1" (not the canonical string)', () => {
    expect(isKoraLinkActivationEnabled({ KORA_LINK_ACTIVATION_ENABLED: '1' })).toBe(false);
  });

  it('returns false for "TRUE" (case-sensitive)', () => {
    expect(isKoraLinkActivationEnabled({ KORA_LINK_ACTIVATION_ENABLED: 'TRUE' })).toBe(false);
  });

  it('returns true only for the exact string "true"', () => {
    expect(isKoraLinkActivationEnabled({ KORA_LINK_ACTIVATION_ENABLED: 'true' })).toBe(true);
  });

});

// ── 2. activateKoraLinkForWorker — flag gating ────────────────────────────────

describe('activateKoraLinkForWorker — activation flag', () => {

  it('returns disabled when KORA_LINK_ACTIVATION_ENABLED is absent', async () => {
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: DISABLED_ENV,
    });
    expect(result).toEqual({ state: 'disabled' });
  });

  it('never calls the RPC when activation is disabled', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: DISABLED_ENV, rpcClientOverride: client,
    });
    expect(calls.length).toBe(0);
  });

  it('is enabled only with the exact string "true" (not "1")', async () => {
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: { KORA_LINK_ACTIVATION_ENABLED: '1' },
    });
    expect(result).toEqual({ state: 'disabled' });
  });

});

// ── 3. activateKoraLinkForWorker — token validation ───────────────────────────

describe('activateKoraLinkForWorker — token validation', () => {

  it('returns invalid_token for a malformed token', async () => {
    const result = await activateKoraLinkForWorker({
      token: 'not-a-real-token', workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV,
    });
    expect(result).toEqual({ state: 'invalid_token' });
  });

  it('never calls the RPC when the token is malformed', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: 'bad', workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls.length).toBe(0);
  });

  it('returns invalid_token for an empty token', async () => {
    const result = await activateKoraLinkForWorker({
      token: '', workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV,
    });
    expect(result).toEqual({ state: 'invalid_token' });
  });

  it('returns invalid_token when workerId is empty', async () => {
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: '', consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV,
    });
    expect(result).toEqual({ state: 'invalid_token' });
  });

  it('never calls the RPC when workerId is empty', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: '', consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls.length).toBe(0);
  });

});

// ── 4. activateKoraLinkForWorker — consent validation ─────────────────────────

describe('activateKoraLinkForWorker — consent validation', () => {

  it('returns consent_required when consentVersion is missing', async () => {
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: '',
      secret: VALID_SECRET, env: ENABLED_ENV,
    });
    expect(result).toEqual({ state: 'consent_required' });
  });

  it('returns consent_required when consentVersion does not match the current provisional version', async () => {
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: 'some-other-version',
      secret: VALID_SECRET, env: ENABLED_ENV,
    });
    expect(result).toEqual({ state: 'consent_required' });
  });

  it('never calls the RPC when consent is missing', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: '',
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls.length).toBe(0);
  });

});

// ── 5. activateKoraLinkForWorker — RPC call shape (token raw / digest safety) ─

describe('activateKoraLinkForWorker — RPC call shape', () => {

  it('calls fn_activate_link_for_worker exactly once with a valid request', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls.length).toBe(1);
    expect(calls[0].fn).toBe('fn_activate_link_for_worker');
  });

  it('never sends the raw token to the RPC — only the digest', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls[0].args.p_token_digest).not.toBe(VALID_TOKEN);
    expect(JSON.stringify(calls[0].args)).not.toContain(VALID_TOKEN);
  });

  it('sends the exact HMAC digest of the token', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls[0].args.p_token_digest).toBe(computeDigest(VALID_TOKEN, VALID_SECRET));
  });

  it('never sends p_worker_id — KORA-LINK-S08: the DB function resolves the worker from auth.uid()', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls[0].args).not.toHaveProperty('p_worker_id');
    expect(JSON.stringify(calls[0].args)).not.toContain(VALID_WORKER_ID);
  });

  it('sends the consentVersion as p_consent_version', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(calls[0].args.p_consent_version).toBe(VALID_CONSENT);
  });

  it('the RPC call args object has exactly 2 keys — no extra fields leaked, no worker id', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(Object.keys(calls[0].args).sort()).toEqual(
      ['p_consent_version', 'p_token_digest'].sort()
    );
  });

});

// ── 6. activateKoraLinkForWorker — RPC response normalization ────────────────

describe('activateKoraLinkForWorker — RPC response handling', () => {

  it('maps RPC status "activated" to state activated', async () => {
    const { client } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'activated' });
  });

  it('maps RPC status "already_active" to state already_active', async () => {
    const { client } = makeSpyClient({ data: { status: 'already_active' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'already_active' });
  });

  it('maps RPC status "unavailable" to state unavailable', async () => {
    const { client } = makeSpyClient({ data: { status: 'unavailable' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'unavailable' });
  });

  it('maps RPC status "error" to state error', async () => {
    const { client } = makeSpyClient({ data: { status: 'error', reason: 'internal' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'error' });
  });

  it('maps RPC status "consent_required" to state consent_required', async () => {
    const { client } = makeSpyClient({ data: { status: 'consent_required' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'consent_required' });
  });

  it('maps an unrecognised RPC status to the safe unavailable fallback', async () => {
    const { client } = makeSpyClient({ data: { status: 'something_new' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'unavailable' });
  });

  it('maps an RPC error to state unavailable', async () => {
    const { client } = makeSpyClient({ data: null, error: { message: 'db error' } });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'unavailable' });
  });

  it('maps a null RPC data payload to state unavailable', async () => {
    const { client } = makeSpyClient({ data: null, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'unavailable' });
  });

  it('maps an empty RPC row array to state unavailable', async () => {
    const { client } = makeSpyClient({ data: [], error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'unavailable' });
  });

  it('accepts a row-array RPC response shape (normalizes to the first row)', async () => {
    const { client } = makeSpyClient({ data: [{ status: 'activated' }], error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'activated' });
  });

  it('returns unavailable when the RPC client throws', async () => {
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: throwingClient(),
    });
    expect(result).toEqual({ state: 'unavailable' });
  });

  it('returns unavailable when the digest computation fails (empty secret)', async () => {
    const { client, calls } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: '', env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(result).toEqual({ state: 'unavailable' });
    expect(calls.length).toBe(0);
  });

});

// ── 7. activateKoraLinkForWorker — result never leaks secrets/PII ────────────

describe('activateKoraLinkForWorker — result safety', () => {

  it('the result never includes the token secret value', async () => {
    const { client } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(JSON.stringify(result)).not.toContain(VALID_SECRET);
  });

  it('the result never includes the raw token', async () => {
    const { client } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(JSON.stringify(result)).not.toContain(VALID_TOKEN);
  });

  it('the result never includes the digest', async () => {
    const { client } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(JSON.stringify(result)).not.toContain(computeDigest(VALID_TOKEN, VALID_SECRET));
  });

  it('the result never includes the worker id', async () => {
    const { client } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(JSON.stringify(result)).not.toContain(VALID_WORKER_ID);
  });

  it('the result object only ever has a "state" key (and nothing else)', async () => {
    const { client } = makeSpyClient({ data: { status: 'activated' }, error: null });
    const result = await activateKoraLinkForWorker({
      token: VALID_TOKEN, workerId: VALID_WORKER_ID, consentVersion: VALID_CONSENT,
      secret: VALID_SECRET, env: ENABLED_ENV, rpcClientOverride: client,
    });
    expect(Object.keys(result)).toEqual(['state']);
  });

});

// ── 8. KORA_LINK_ACTIVATION_CONSENT_VERSION ───────────────────────────────────

describe('KORA_LINK_ACTIVATION_CONSENT_VERSION', () => {

  it('is a non-empty string', () => {
    expect(typeof KORA_LINK_ACTIVATION_CONSENT_VERSION).toBe('string');
    expect(KORA_LINK_ACTIVATION_CONSENT_VERSION.length).toBeGreaterThan(0);
  });

  it('is marked as a draft version (provisional, pending DPO approval)', () => {
    expect(KORA_LINK_ACTIVATION_CONSENT_VERSION).toContain('draft');
  });

});

// ── 9. buildKoraLinkActivationState — precedence and states ──────────────────

describe('buildKoraLinkActivationState', () => {

  it('returns disabled when activationEnabled is false, regardless of other params', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: false, lookupReady: true, workerAuthenticated: true,
      activationOutcome: 'activated',
    });
    expect(state).toBe('disabled');
  });

  it('returns lookup_not_ready when lookupReady is false', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: false, workerAuthenticated: true,
    });
    expect(state).toBe('lookup_not_ready');
  });

  it('returns unauthenticated when the worker is not signed in', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: false,
    });
    expect(state).toBe('unauthenticated');
  });

  it('returns ready when flag on, lookup ready, worker authenticated, no outcome yet', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: true,
    });
    expect(state).toBe('ready');
  });

  it('returns activated when the outcome is activated', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: true,
      activationOutcome: 'activated',
    });
    expect(state).toBe('activated');
  });

  it('returns unavailable when the outcome is unavailable', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: true,
      activationOutcome: 'unavailable',
    });
    expect(state).toBe('unavailable');
  });

  it('returns error when the outcome is error', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: true,
      activationOutcome: 'error',
    });
    expect(state).toBe('error');
  });

  it('returns error when the outcome is consent_required', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: true,
      activationOutcome: 'consent_required',
    });
    expect(state).toBe('error');
  });

  it('returns activating when the outcome is activating', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: true, workerAuthenticated: true,
      activationOutcome: 'activating',
    });
    expect(state).toBe('activating');
  });

  it('disabled takes precedence over unauthenticated', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: false, lookupReady: true, workerAuthenticated: false,
    });
    expect(state).toBe('disabled');
  });

  it('lookup_not_ready takes precedence over unauthenticated', () => {
    const state = buildKoraLinkActivationState({
      activationEnabled: true, lookupReady: false, workerAuthenticated: false,
    });
    expect(state).toBe('lookup_not_ready');
  });

  it('is a pure function — never throws for any boolean/outcome combination', () => {
    const outcomes: Array<'activating' | 'activated' | 'unavailable' | 'error' | 'consent_required' | undefined> =
      [undefined, 'activating', 'activated', 'unavailable', 'error', 'consent_required'];
    for (const activationEnabled of [true, false]) {
      for (const lookupReady of [true, false]) {
        for (const workerAuthenticated of [true, false]) {
          for (const activationOutcome of outcomes) {
            expect(() =>
              buildKoraLinkActivationState({ activationEnabled, lookupReady, workerAuthenticated, activationOutcome })
            ).not.toThrow();
          }
        }
      }
    }
  });

});
