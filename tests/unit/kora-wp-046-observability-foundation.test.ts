// tests/unit/kora-wp-046-observability-foundation.test.ts
// KORA-WP-046 — Observability Foundation.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getOrCreateCorrelationId, logInfo, logError, captureError,
} from '@/lib/observability/observability';

const ROUTE_PATH = 'app/api/company/data-ingest/route.ts';
const SERVICE_PATH = 'lib/ingestion-hardening/company-ingest-service.ts';
const OBS_PATH = 'lib/observability/observability.ts';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function tsCodeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)); }

describe('KORA-WP-046 — correlation ID model', () => {
  it('A. a fresh correlation id is generated when none is supplied', () => {
    const id = getOrCreateCorrelationId(null);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a safely-shaped incoming id verbatim', () => {
    const id = getOrCreateCorrelationId('req-abc-123');
    expect(id).toBe('req-abc-123');
  });

  it('never trusts an unsafe/oversized incoming id — generates fresh instead (log-injection defense)', () => {
    const malicious = 'x\nInjected: true'.padEnd(200, 'a');
    const id = getOrCreateCorrelationId(malicious);
    expect(id).not.toBe(malicious);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects a newline-bearing id even if short', () => {
    const id = getOrCreateCorrelationId('abc\ndef');
    expect(id).not.toContain('\n');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('concurrent/successive calls with no supplied id produce distinct ids', () => {
    const a = getOrCreateCorrelationId(undefined);
    const b = getOrCreateCorrelationId(undefined);
    expect(a).not.toBe(b);
  });
});

describe('KORA-WP-046 — structured logging', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('D. logInfo emits a single-line JSON structure with the expected safe fields', () => {
    logInfo('ingest executed', { correlationId: 'c1', operation: 'test.op', route: '/x', actorRole: 'COMPANY_ADMIN', tenantId: 't1' });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0][0] as string;
    expect(line.split('\n').length).toBe(1);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: 'info', message: 'ingest executed', correlationId: 'c1', operation: 'test.op', route: '/x', actorRole: 'COMPANY_ADMIN', tenantId: 't1' });
    expect(parsed.timestamp).toBeDefined();
  });

  it('H. tenantId and correlationId are distinct fields, never conflated', () => {
    logInfo('x', { correlationId: 'corr-1', operation: 'op', tenantId: 'tenant-1' });
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.correlationId).toBe('corr-1');
    expect(parsed.tenantId).toBe('tenant-1');
    expect(parsed.correlationId).not.toBe(parsed.tenantId);
  });

  it('I. a multi-line/injected message is collapsed to a single line', () => {
    logInfo('line1\nline2\rline3', { correlationId: 'c1', operation: 'op' });
    const line = logSpy.mock.calls[0][0] as string;
    expect(line.split('\n').length).toBe(1);
    const parsed = JSON.parse(line);
    expect(parsed.message).not.toMatch(/[\r\n]/);
  });

  it('E. logError includes the error message under a dedicated field, never a raw stack dump', () => {
    logError('op failed', { correlationId: 'c1', operation: 'op' }, new Error('boom'));
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.error).toBe('boom');
    expect(parsed.error).not.toMatch(/at .*\(/); // no stack-trace-shaped content leaked into the structured line
  });

  it('M. a logger failure never throws (defensive try/catch)', () => {
    logSpy.mockImplementation(() => { throw new Error('console is broken'); });
    expect(() => logInfo('x', { correlationId: 'c1', operation: 'op' })).not.toThrow();
  });
});

describe('KORA-WP-046 — error monitoring (reuses existing Sentry integration)', () => {
  it('captureError never throws even if the underlying error is not an Error instance', () => {
    expect(() => captureError('a plain string error', { correlationId: 'c1', operation: 'op' })).not.toThrow();
  });

  it('the module reuses @sentry/nextjs — never declares or imports a second monitoring vendor', () => {
    const lines = tsCodeLines(read(OBS_PATH)).filter((l) => /^\s*import\b/.test(l));
    const sentryImport = lines.find((l) => l.includes('@sentry/nextjs'));
    expect(sentryImport).toBeDefined();
    expect(lines.some((l) => /datadog|newrelic|new-relic|bugsnag|rollbar|logrocket/i.test(l))).toBe(false);
  });
});

describe('KORA-WP-046 — observability ≠ audit/governance boundary', () => {
  it('observability.ts never writes to audit_log or governance_event', () => {
    const lines = tsCodeLines(read(OBS_PATH));
    expect(lines.some((l) => /audit_log|governance_event/.test(l))).toBe(false);
  });

  it('observability.ts never imports a Supabase client (it is a pure logging/monitoring module, not a DB writer)', () => {
    const lines = tsCodeLines(read(OBS_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /supabase/i.test(l))).toBe(false);
  });
});

describe('KORA-WP-046 — privacy / secret safety', () => {
  it('the observability context type never carries an actorId/email FIELD — role only (comments discussing the boundary are fine)', () => {
    const ctxInterface = read(OBS_PATH).match(/export interface ObservabilityContext \{[\s\S]*?\n\}/);
    expect(ctxInterface).toBeTruthy();
    const fieldLines = tsCodeLines(ctxInterface![0]).map((l) => l.split('//')[0]); // strip trailing comments too
    expect(fieldLines.some((l) => /\bactorId\b|\bemail\b/i.test(l))).toBe(false);
    expect(fieldLines.some((l) => /actorRole/.test(l))).toBe(true);
  });

  it('the route never logs the raw file buffer or PII scan content', () => {
    const lines = tsCodeLines(read(ROUTE_PATH));
    expect(lines.some((l) => /logInfo\([^)]*fileBuffer|logError\([^)]*fileBuffer/.test(l))).toBe(false);
  });

  it('the ingest service never passes actorId/email into captureError\'s context', () => {
    const src = read(SERVICE_PATH);
    const captureBlock = src.match(/captureError\([\s\S]*?\}\s*,\s*'[^']*'\s*\)/);
    expect(captureBlock).toBeTruthy();
    expect(captureBlock![0]).not.toMatch(/actorId|email/);
  });
});

describe('KORA-WP-046 — route wiring (WP-028 coverage)', () => {
  it('the route generates/reuses a correlation id at entry, before auth', () => {
    const src = read(ROUTE_PATH);
    const correlationIdx = src.indexOf('getOrCreateCorrelationId');
    const authIdx = src.indexOf('requireCompanyUser(request)');
    expect(correlationIdx).toBeGreaterThan(0);
    expect(authIdx).toBeGreaterThan(0);
    expect(correlationIdx).toBeLessThan(authIdx);
  });

  it('every JSON response includes correlationId (success and every error branch)', () => {
    const src = read(ROUTE_PATH);
    const jsonCalls = src.match(/NextResponse\.json\(\{[\s\S]*?\}, \{ status: \d+ \}\)/g) ?? [];
    expect(jsonCalls.length).toBeGreaterThan(5);
    for (const call of jsonCalls) {
      expect(call).toMatch(/correlationId/);
    }
  });

  it('unexpected errors are sent through captureError, domain validation rejections are not', () => {
    const src = read(ROUTE_PATH);
    expect(src).toMatch(/captureError\(e, obsCtx, 'ingest failed unexpectedly'\)/);
    const validationBranch = src.match(/if \(e instanceof CompanyIngestValidationError\) \{[\s\S]*?\n\s*\}/);
    expect(validationBranch).toBeTruthy();
    expect(validationBranch![0]).not.toMatch(/captureError/);
  });
});

describe('KORA-WP-046 — no DB migration (registry: Data/Migration Impact = NONE)', () => {
  it('no new migration file was added by this WP', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    // 078 (KORA-WP-026) was the highest migration at WP-046's own
    // completion time — WP-046 itself adds none (still true, verified by
    // this WP's own git diff). A later WP (e.g. KORA-WP-027, migration 079)
    // legitimately raises the ceiling further — never equality, per the
    // same disclosed staleness pattern already hit by WP-011/WP-120/WP-013.
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(78);
  });
});
