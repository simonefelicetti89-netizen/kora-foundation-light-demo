// lib/async-contract/idempotency-contract.ts
// KORA-WP-011 — Minimal Async/Idempotency Contract.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS IS — registry 142's own framing, quoted exactly
// ═══════════════════════════════════════════════════════════════════════════
//
// "Proposed New: lightweight job-status abstraction (interface only)."
// "Service/API: job-status interface." "Async/Idempotency: is the
// deliverable — idempotency key, status semantics, retry-safe boundary."
// "Out of Scope: the durable worker/queue runtime itself" (that upgrade
// is `KORA-WP-065`, its own separate, later, I3 package). "Acceptance:
// `KORA-WP-028` can call this contract safely."
//
// This is a CONTRACT, not infrastructure: a small set of types plus one
// pure orchestration function (`executeIdempotent`) that any future
// server-side write can wrap itself in, plus one in-memory reference
// `IdempotencyStore` implementation (used by this module's own tests and
// safe for any short-lived, single-process, low-stakes caller). It is
// NOT a queue, NOT a worker, NOT a cron/scheduler, NOT a message bus, NOT
// an event-sourcing framework — none of that is built here, on purpose.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY NOW, WHY THIS SHAPE — pre-check findings
// ═══════════════════════════════════════════════════════════════════════════
//
// Hard Dep `KORA-WP-001` is COMPLETE (`.kora-audit/output/105_...md`,
// 3/3 evidence gates closed). Its own `R-1` finding, quoted exactly:
// "`KORA-WP-011`'s minimal async/idempotency contract remains warranted
// regardless (it is needed the moment any server-side write exists,
// independent of this result)" — and, separately: "there is genuinely
// nothing to be idempotent about yet [in the current ingestion code] —
// this is exactly why `KORA-WP-011`'s... contract is listed as ABSENT."
// `R-1` also closed WITHOUT forcing `KORA-WP-028`'s conditional
// dependency on `KORA-WP-065` (durable queue, "Option A") — the
// synchronous, non-durable-queue path remains canonical. This contract
// is therefore built exactly as registry 142 specifies: a synchronous,
// in-process, non-durable idempotency boundary — never a queue.
//
// Repository inventory of existing async/retry/idempotency mechanisms
// (performed before writing this file, full detail in the accompanying
// completion report) found NO generic, reusable primitive anywhere —
// only bespoke, domain-specific guarantees, all preserved unchanged by
// this file:
//   - DB UNIQUE constraint + `ON CONFLICT DO NOTHING` (the strongest,
//     most idiomatic pattern already in this repo): `commons.booking`,
//     `commons.contribution_event` (mig 025), `personal.worker_pib`
//     (mig 018 U1, `lib/live/office-attribution.ts`,
//     `lib/live/persistence.ts`), `analytics.review_advisor_proposal`
//     (mig 071, upsert on `UNIQUE(review_id)`).
//   - Idempotent-safe state-guard updates (`.eq('status','active')`
//     before transitioning, so a duplicate call is a safe no-op):
//     `lib/admin-capability/capability-service.ts`,
//     `lib/company-membership/membership-service.ts`,
//     `lib/worker-identity/worker-identity-service.ts`.
//   - `lib/security/rate-limit.ts` — request throttling, a related but
//     distinct concern (limits repeat calls; does not deduplicate their
//     effect).
//   - In-batch array dedup (single-request scope, not cross-request
//     idempotency): `lib/privacy/pii-guard.ts`,
//     `lib/data-intake/evidence-provenance.ts`,
//     `lib/roster-import/roster-validation.ts`,
//     `lib/ingestion/attendees-interpreter.ts`.
// None of these is replaced, renamed, or touched by this file — this
// contract is a NEW, generic, reusable complement, built for the one
// case none of the above already covers: an operation that does not yet
// have its own DB-level UNIQUE constraint to lean on (e.g. a not-yet-
// built ingestion write, `KORA-WP-028`'s own future job).
//
// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE DECISION — Outcome A (code-level canonical contract only)
// ═══════════════════════════════════════════════════════════════════════════
//
// No DB table, migration, RLS policy, or grant is created by this WP.
// Justification: (1) Code Truth is ABSENT — there is no live server-side
// write yet for a real store to protect (confirmed by WP-001's own R-1
// finding, quoted above); (2) registry's own "Proposed New" line says
// "interface only"; (3) `KORA-WP-028` (not yet started) is the package
// that will add the first real server-side write this contract
// protects, and it — not this WP — is positioned to choose that write's
// own persistence shape; a table built here, before that shape is known,
// risks exactly the kind of premature schema this engagement's own
// discipline (WP-120's report, `145`) already argued against for a
// different axis. The `IdempotencyStore` interface below is the seam:
// `KORA-WP-028` (or `KORA-WP-065`, if `R-1`'s bound is ever exceeded)
// plugs in a REAL Postgres-backed implementation — `INSERT ... ON
// CONFLICT (tenant_id, operation, key) DO NOTHING RETURNING id`, this
// repository's own established idiom (see the UNIQUE-constraint list
// above) — without this contract's own type signatures changing at all.
// This module's own `InMemoryIdempotencyStore` is a reference
// implementation only: correct for a single Node process, explicitly
// NOT durable, NOT cross-process, NOT for production use once a real
// server-side write exists (see its own doc comment below).

import { createHash } from 'crypto';

// ── §1. Canonical types ─────────────────────────────────────────────────

export type JobStatus = 'pending' | 'succeeded' | 'failed';

// Tenant-scoped, operation-scoped, caller-supplied key. Never global —
// see §9 (tenant boundary) below: (tenantId, operation, key) together
// are the uniqueness boundary. A key belonging to Tenant A can never
// collide with the same literal key string for Tenant B.
export interface IdempotencyKey {
  tenantId:  string;
  operation: string; // e.g. 'ingestion.upload_batch' — namespaces the key so two different operations can safely reuse the same caller-supplied key string
  key:       string; // caller-supplied external correlation id (e.g. an upload batch id, a request id) — never generated by this module
}

export interface IdempotencyRecord {
  status:      JobStatus;
  payloadHash: string;
  result:      unknown; // present only when status === 'succeeded'; the exact value a replay returns — never recomputed
  error:       string | null; // present only when status === 'failed'
  createdAt:   string;
  updatedAt:   string;
}

// The persistence seam (§ PERSISTENCE DECISION above). A real
// implementation's `claim()` MUST be a single atomic DB operation
// (`INSERT ... ON CONFLICT ... RETURNING`) — never a SELECT followed by
// a separate INSERT. That non-negotiable requirement is documented here
// because it is the one invariant every future implementation of this
// interface must uphold; it is not, itself, enforced by TypeScript.
export interface IdempotencyStore {
  /**
   * Atomically claims (tenantId, operation, key) for a new execution, or
   * reports the existing record if the key was already claimed. Must
   * never allow two concurrent claims to both succeed for the same key.
   */
  claim(key: IdempotencyKey, payloadHash: string): Promise<
    { claimed: true } | { claimed: false; existing: IdempotencyRecord }
  >;
  /** Records a successful completion. Idempotent-safe to call once per successful claim. */
  complete(key: IdempotencyKey, result: unknown): Promise<void>;
  /** Records a failure. Idempotent-safe to call once per failed claim. */
  fail(key: IdempotencyKey, error: string): Promise<void>;
}

// The four outcomes a caller must be able to distinguish (§14 —
// "callers should be able to understand whether an operation: executed,
// replayed, conflicted, or failed" — explicit, typed, never a magic
// boolean or an opaque status code).
export type IdempotentOutcome<T> =
  | { kind: 'executed'; result: T }
  | { kind: 'replayed'; result: T }
  | { kind: 'replayed_failure'; error: string }
  | { kind: 'conflict'; reason: 'payload_mismatch' }
  | { kind: 'in_progress' };

// ── §2. The contract's own error type — a genuine execution failure is
// re-thrown as this, never silently swallowed into a false success. ────

export class IdempotentExecutionError extends Error {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = 'IdempotentExecutionError';
  }
}

// ── §3. payload hashing — deterministic, stable key ordering ────────────
// Two calls with the same key and semantically identical payload must
// hash identically regardless of object key insertion order.

export function hashPayload(payload: unknown): string {
  const stable = stableStringify(payload);
  return createHash('sha256').update(stable).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

// ── §4. executeIdempotent — the deliverable ──────────────────────────────
//
// Semantics (§8/§14, explicit, never magic):
//   - No prior record for this key                    -> executes, records success or failure.
//   - Prior SUCCEEDED record, same payload             -> replays the stored result, never re-executes.
//   - Prior SUCCEEDED record, different payload        -> conflict (payload_mismatch) — never silently replays the wrong result, never silently re-executes under a reused key.
//   - Prior FAILED record, same payload                -> replays the stored failure (as a typed outcome, not a thrown error) — a failed operation never silently retries itself; the caller decides whether to retry with a NEW key.
//   - Prior FAILED record, different payload           -> conflict (payload_mismatch).
//   - A claim already exists but has no terminal status yet (another concurrent execution currently owns it) -> in_progress. The caller must not treat this as failure or success, and this function never automatically retries or waits for it — that decision belongs to the caller (§12: no automatic retry of anything here).
//   - `execute()` throws                                -> the failure is recorded via `store.fail()`, then the original error is re-thrown wrapped in `IdempotentExecutionError` — never converted into a false 'executed' success.
//
// Authorization/validation are explicitly NOT this function's concern
// (§12/§14 in the founder task) — `execute()` is caller-supplied and
// must itself already have decided the caller is authorized before
// calling this function; this contract only governs replay/dedup
// semantics around whatever `execute()` does.

// Operational logging only (registry: "Audit: job outcome logged") — NOT
// governance evidence. Per this WP's own §15 boundary: "Idempotency
// metadata is operational metadata, not automatically governance
// evidence... Do not write governance_event merely because a retry
// occurred unless domain semantics require it." This hook exists so a
// caller CAN observe the outcome (structured, typed, easy to pipe into
// whatever operational log aggregator this deployment already uses) —
// it never writes to `audit.governance_event` or `audit.audit_log`
// itself, and no future caller should route it there merely to satisfy
// this line; a caller whose own domain semantics genuinely require a
// governance record (e.g. `KORA-WP-028`'s own ingestion-attempt audit
// events, already named in its own registry entry) writes that through
// its own existing, domain-owned audit call — never through this one.
export interface JobOutcomeLogEntry {
  key:       IdempotencyKey;
  outcome:   IdempotentOutcome<unknown>['kind'] | 'failed'; // 'failed' logs a fresh execution failure — never returned as an outcome (it is re-thrown instead, see §4)
  timestamp: string;
}

export type JobOutcomeLogger = (entry: JobOutcomeLogEntry) => void;

const defaultLogger: JobOutcomeLogger = (entry) => {
  console.log(`[KORA][async-contract] ${entry.key.operation} key=${entry.key.key} tenant=${entry.key.tenantId} -> ${entry.outcome}`);
};

export async function executeIdempotent<T>(params: {
  store:   IdempotencyStore;
  key:     IdempotencyKey;
  payload: unknown;
  execute: () => Promise<T>;
  logger?: JobOutcomeLogger;
}): Promise<IdempotentOutcome<T>> {
  const { store, key, payload, execute, logger = defaultLogger } = params;
  const payloadHash = hashPayload(payload);

  const log = (outcome: IdempotentOutcome<unknown>['kind'] | 'failed') =>
    logger({ key, outcome, timestamp: new Date().toISOString() });

  const claimResult = await store.claim(key, payloadHash);

  if (!claimResult.claimed) {
    const existing = claimResult.existing;
    const payloadMatches = existing.payloadHash === payloadHash;

    if (existing.status === 'pending') {
      log('in_progress');
      return { kind: 'in_progress' };
    }
    if (!payloadMatches) {
      log('conflict');
      return { kind: 'conflict', reason: 'payload_mismatch' };
    }
    if (existing.status === 'succeeded') {
      log('replayed');
      return { kind: 'replayed', result: existing.result as T };
    }
    // existing.status === 'failed'
    log('replayed_failure');
    return { kind: 'replayed_failure', error: existing.error ?? 'unknown prior failure' };
  }

  try {
    const result = await execute();
    await store.complete(key, result);
    log('executed');
    return { kind: 'executed', result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.fail(key, message);
    log('failed');
    throw new IdempotentExecutionError(`[KORA] executeIdempotent: operation failed for ${key.operation}:${key.key}: ${message}`, err);
  }
}

// ── §5. InMemoryIdempotencyStore — reference implementation ──────────────
//
// Correct for a SINGLE Node process only. `claim()` performs its
// existence-check and its write within one synchronous block (no
// `await` between them) — safe under JavaScript's single-threaded
// execution model for concurrent in-process callers (proven by test:
// two concurrent `executeIdempotent()` calls with the same key, only
// one executes). This is NOT durable (lost on process restart), NOT
// shared across processes/replicas, and NOT a substitute for a real
// DB-backed store once a real server-side write exists — see the
// PERSISTENCE DECISION note above for what a production implementation
// must do differently (a real DB UNIQUE constraint + `INSERT ... ON
// CONFLICT ... RETURNING`, verified separately against real disposable
// Postgres — see the accompanying completion report).
//
// Tenant boundary (§9): keys are namespaced by the full
// `${tenantId}::${operation}::${key}` tuple — a key for Tenant A can
// structurally never collide with the same literal key string for
// Tenant B. No payload is stored beyond its hash unless the caller's
// own `result`/`error` values are themselves used as the effective
// "sensitive data" and choose to include such content (this module
// never stores worker-level or PIB content itself — see §9/§13 in the
// completion report).

function recordKey(key: IdempotencyKey): string {
  return `${key.tenantId}::${key.operation}::${key.key}`;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  async claim(key: IdempotencyKey, payloadHash: string): Promise<
    { claimed: true } | { claimed: false; existing: IdempotencyRecord }
  > {
    const k = recordKey(key);
    const existing = this.records.get(k);
    if (existing) {
      return { claimed: false, existing };
    }
    const now = new Date().toISOString();
    this.records.set(k, {
      status: 'pending', payloadHash, result: null, error: null,
      createdAt: now, updatedAt: now,
    });
    return { claimed: true };
  }

  async complete(key: IdempotencyKey, result: unknown): Promise<void> {
    const k = recordKey(key);
    const rec = this.records.get(k);
    if (!rec) return; // no claim to complete — caller error, silently ignored rather than throwing on an internal-only store
    rec.status = 'succeeded';
    rec.result = result;
    rec.updatedAt = new Date().toISOString();
  }

  async fail(key: IdempotencyKey, error: string): Promise<void> {
    const k = recordKey(key);
    const rec = this.records.get(k);
    if (!rec) return;
    rec.status = 'failed';
    rec.error = error;
    rec.updatedAt = new Date().toISOString();
  }

  /** Test/demo-only accessor — never part of the canonical IdempotencyStore interface. */
  _debugGet(key: IdempotencyKey): IdempotencyRecord | undefined {
    return this.records.get(recordKey(key));
  }
}
