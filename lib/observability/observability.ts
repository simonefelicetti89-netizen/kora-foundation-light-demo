// lib/observability/observability.ts
// KORA-WP-046 — Observability Foundation.
//
// Registry 142's own framing: "Purpose: structured logging, correlation
// IDs, error monitoring... Proposed New: structured-logging
// infrastructure... Data/Migration Impact: NONE... Acceptance: request/job
// correlation IDs traceable end to end; ingestion errors visible... Out of
// Scope: full APM/observability-tool selection." Doc 89 Part 34 (the sole
// Arch Source): "structured application logs with request-correlation
// IDs... API error monitoring, ingestion-error visibility... Kept
// explicitly distinct from Audit (Part 28) — Observability answers 'is the
// system working,' Audit answers 'who did what and why,' never the same
// stream."
//
// BUILD VS. BUY, ALREADY DECIDED (doc 89, line 776): "Observability |
// INTEGRATE (a standard structured-logging + APM tool) | Build vs. buy
// favors buy; no differentiation value in building this." An APM/error-
// monitoring VENDOR is already integrated: Sentry (`sentry.server.config.ts`
// / `.client.config.ts` / `.edge.config.ts`, `lib/sentry/scrub.ts`) — this
// module REUSES it (`Sentry.captureException`), never a second vendor,
// never a competing capture mechanism. Vendor SELECTION itself remains
// explicitly out of scope (registry's own words) and untouched here —
// Sentry was chosen and wired before this WP, not by it.
//
// GENUINELY MISSING PIECE (Code Truth: PARTIAL): confirmed by inventory —
// zero correlation-ID pattern anywhere in the repo before this WP, and
// Sentry's own five existing call sites (`app/**/error.tsx`) capture only
// client-side React render errors — no API route anywhere reports an
// unexpected server-side error to Sentry. This module closes exactly that
// gap: a correlation-ID primitive plus a structured logger plus a thin
// `captureError()` wrapper that logs AND forwards to the *existing* Sentry
// integration — never a new provider, never a new ingestion pipeline.
//
// OBSERVABILITY ≠ AUDIT/GOVERNANCE (doc 89 Part 34, verbatim boundary
// above): this module never writes to `audit.audit_log` or
// `audit.governance_event`, and no caller of this module should route a
// technical/observability concern through either — those remain the
// domain-owned, actor-attributed governance substrate this engagement has
// used since `KORA-WP-006`/`051`. Conversely, this module is never a
// substitute for either: a correlation ID is operational trace metadata,
// never business provenance.
//
// PRIVACY: never accepts or logs a Worker identifier, email, raw file
// content, PIB, auth token, cookie, or service-role key — callers pass only
// `tenantId`/`actorRole` (a role string, e.g. 'COMPANY_ADMIN' — never an
// actor id/email) and an `operation` name. Every logged string is
// single-line-sanitized (defensive against log injection from untrusted
// input reaching a log value) and length-bounded.
//
// PERFORMANCE: every function here is synchronous, wrapped in its own
// try/catch, and never throws — an observability failure must never break
// the business write it is observing (this WP's own §19 instruction).
// `Sentry.captureException` is the SDK's own fire-and-forget call (buffers
// internally, never awaited here) — consistent with its documented usage.

import * as Sentry from '@sentry/nextjs';
import { randomUUID } from 'crypto';

// A caller-supplied correlation id is only ever trusted if it matches this
// shape — anything else is replaced with a freshly generated one, never
// echoed back or logged verbatim (Section 18 — no uncontrolled/untrusted
// log key or multiline injection).
const SAFE_CORRELATION_ID_PATTERN = /^[a-zA-Z0-9-]{1,100}$/;

export function getOrCreateCorrelationId(headerValue: string | null | undefined): string {
  if (headerValue && SAFE_CORRELATION_ID_PATTERN.test(headerValue)) {
    return headerValue;
  }
  return randomUUID();
}

// Single-line, length-bounded — never let an error/message value inject a
// newline (log-injection defense) or grow unbounded.
function sanitizeLogValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').slice(0, 500);
}

export interface ObservabilityContext {
  correlationId: string;
  operation: string; // e.g. 'company_data_upload.ingest' — matches the domain's own operation naming where one exists (KORA-WP-011's own IdempotencyKey.operation convention)
  route?: string;
  actorRole?: string; // a role string only — never an actor id/email
  tenantId?: string;  // Company/tenant id — safe, never a Worker identifier
  errorCode?: string;
  durationMs?: number;
}

function structuredLine(level: 'info' | 'error', message: string, ctx: ObservabilityContext, errorMessage?: string): string {
  return JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    message: sanitizeLogValue(message),
    correlationId: ctx.correlationId,
    operation: ctx.operation,
    ...(ctx.route ? { route: ctx.route } : {}),
    ...(ctx.actorRole ? { actorRole: ctx.actorRole } : {}),
    ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
    ...(ctx.errorCode ? { errorCode: ctx.errorCode } : {}),
    ...(ctx.durationMs !== undefined ? { durationMs: ctx.durationMs } : {}),
    ...(errorMessage ? { error: sanitizeLogValue(errorMessage) } : {}),
  });
}

export function logInfo(message: string, ctx: ObservabilityContext): void {
  try {
    console.log(structuredLine('info', message, ctx));
  } catch {
    // Observability must never break the caller — see this file's own §19 note.
  }
}

export function logError(message: string, ctx: ObservabilityContext, error?: unknown): void {
  try {
    const errorMessage = error === undefined ? undefined : error instanceof Error ? error.message : String(error);
    console.error(structuredLine('error', message, ctx, errorMessage));
  } catch {
    // Observability must never break the caller.
  }
}

// Logs structurally AND forwards to the existing Sentry integration — the
// one call site this module adds for genuine server-side error monitoring.
// Tags are deliberately minimal and non-personal; Sentry's own
// `beforeSend`/`beforeBreadcrumb` scrubbing (`lib/sentry/scrub.ts`) still
// applies unmodified on top of this.
export function captureError(error: unknown, ctx: ObservabilityContext, message = 'unexpected error'): void {
  logError(message, ctx, error);
  try {
    Sentry.captureException(error, {
      tags: {
        correlationId: ctx.correlationId,
        operation: ctx.operation,
        ...(ctx.route ? { route: ctx.route } : {}),
        ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
      },
    });
  } catch {
    // Observability must never break the caller.
  }
}
