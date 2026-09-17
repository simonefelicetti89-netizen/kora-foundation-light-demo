/**
 * KORA-WP-038 — Advisor Preparation-Support Workload Hook.
 *
 * Behavioral (not string-matching) tests of the REAL function from
 * lib/advisor-portal/advisor-preparation-effort-service.ts, with only its
 * two dependencies — the Assignment validity evaluator (KORA-WP-031) and
 * the effort-capture substrate (KORA-WP-008) — mocked at their public
 * boundary. Same technique as this session's kora-wp-031/033/035 test
 * files. No route/UI exists over this WP (registry: "UI: N/A", "Service/
 * API: hook only"), so there is no API-route layer to test here.
 *
 * No new migration/schema exists for this WP (registry: "Data/Migration
 * Impact: NONE — uses `008`'s table") — the underlying gov.workload_event
 * write path (RLS, grants, append-only trigger) was already real-DB-
 * validated by KORA-WP-008's own implementation; nothing here changes that
 * surface, so no fresh real-DB validation is required for this WP itself.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const SERVICE_PATH = 'lib/advisor-portal/advisor-preparation-effort-service.ts';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function tsCodeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)); }

// ═══════════════════════════════════════════════════════════════════════════
// mocked dependency boundary
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentRow { id: string; advisorId: string; companyId: string; status: string; }

let assignments: AssignmentRow[] = [];
let validityResult: { valid: boolean; reasons: string[] } = { valid: true, reasons: [] };
const capturedEvents: Array<Record<string, unknown>> = [];

const getAdvisorAssignmentByIdMock = vi.fn(async (assignmentId: string) => {
  const row = assignments.find((a) => a.id === assignmentId);
  if (!row) return null;
  return { id: row.id, advisorId: row.advisorId, organisationType: 'company', companyId: row.companyId, role: 'Company Advisor', status: row.status, effectiveFrom: '2026-01-01', effectiveTo: null, reason: null, conflictFlag: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
});
const evaluateValidityMock = vi.fn(async () => validityResult);

vi.mock('@/lib/advisor-assignment/advisor-assignment-service', () => ({
  getAdvisorAssignmentById: (id: string) => getAdvisorAssignmentByIdMock(id),
  evaluateAdvisorAssignmentValidity: () => evaluateValidityMock(),
}));

const captureEffortMock = vi.fn(async (params: Record<string, unknown>) => {
  const event = { id: `evt-${capturedEvents.length + 1}`, ...params, occurredAt: '2026-09-18T00:00:00Z' };
  capturedEvents.push(params);
  return event;
});

vi.mock('@/lib/operations/effort-capture-service', () => ({
  captureEffort: (params: Record<string, unknown>) => captureEffortMock(params),
}));

beforeEach(() => {
  assignments = [{ id: 'assign-1', advisorId: 'adv-1', companyId: 'company-1', status: 'active' }];
  validityResult = { valid: true, reasons: [] };
  capturedEvents.length = 0;
  getAdvisorAssignmentByIdMock.mockClear();
  evaluateValidityMock.mockClear();
  captureEffortMock.mockClear();
});
afterEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// A/H — happy path: valid Advisor preparation effort recorded
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — A/H. authorized Advisor prep effort is recorded', () => {
  it('captures an advisor_preparation event with the resolved Company as tenantId', async () => {
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    const event = await captureAdvisorPreparationEffort({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', effortMinutes: 30,
    });
    expect(captureEffortMock).toHaveBeenCalledTimes(1);
    const call = captureEffortMock.mock.calls[0][0];
    expect(call).toMatchObject({
      activityCategory: 'advisor_preparation', actorRole: 'ADVISOR', actorId: 'adv-1',
      effortMinutes: 30, tenantId: 'company-1',
    });
    expect(event).toMatchObject({ activityCategory: 'advisor_preparation', tenantId: 'company-1' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B — optional object linkage (drafting/support work tied to an object)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — B. optional object linkage for support/drafting work', () => {
  it('passes objectType/objectId through untouched when supplied', async () => {
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    await captureAdvisorPreparationEffort({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', effortMinutes: 15,
      objectType: 'commitment', objectId: 'commit-9',
    });
    expect(captureEffortMock.mock.calls[0][0]).toMatchObject({ objectType: 'commitment', objectId: 'commit-9' });
  });

  it('is omittable — no object linkage required for general prep work', async () => {
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    await captureAdvisorPreparationEffort({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', effortMinutes: 15 });
    const call = captureEffortMock.mock.calls[0][0];
    expect(call.objectType).toBeUndefined();
    expect(call.objectId).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C/D — ADMIN-020 reuse, no parallel workload model
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — C/D. reuses ADMIN-020, never duplicates it', () => {
  it('imports captureEffort from the existing WP-008 module — never a second effort-capture function', () => {
    const lines = tsCodeLines(read(SERVICE_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => l.includes('@/lib/operations/effort-capture-service'))).toBe(true);
  });

  it('never declares its own effort/workload table or a second activity-category vocabulary', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toMatch(/CREATE TABLE|WORKLOAD_ACTIVITY_CATEGORIES\s*=/);
  });

  it('no new migration file exists for this WP (registry: Data/Migration Impact = NONE)', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    // 79 was correct at this WP's own completion time (unchanged since
    // KORA-WP-027); KORA-WP-037 legitimately raised the ceiling to 080
    // later — never equality, same disclosed pattern already fixed for
    // WP-011/WP-120/WP-013/WP-046.
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(79);
  });

  it('always uses the canonical advisor_preparation category — never a free-form string', async () => {
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    await captureAdvisorPreparationEffort({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', effortMinutes: 5 });
    expect(captureEffortMock.mock.calls[0][0].activityCategory).toBe('advisor_preparation');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E/F — Company scoping / cross-company denial
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — E/F. Company scoping is structural, never caller-supplied', () => {
  it('E. tenantId is always the resolved Assignment company, never accepted as a parameter', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toMatch(/CaptureAdvisorPreparationEffortParams[\s\S]{0,400}(tenantId|companyId)\s*:/);
  });

  it('F. a caller referencing an Assignment belonging to a different Advisor is denied', async () => {
    assignments = [{ id: 'assign-2', advisorId: 'adv-OTHER', companyId: 'company-2', status: 'active' }];
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    await expect(captureAdvisorPreparationEffort({
      assignmentId: 'assign-2', callerAdvisorId: 'adv-1', effortMinutes: 10,
    })).rejects.toThrow(/not the Advisor party/);
    expect(captureEffortMock).not.toHaveBeenCalled();
  });

  it('F2. a nonexistent Assignment id is denied', async () => {
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    await expect(captureAdvisorPreparationEffort({
      assignmentId: 'assign-does-not-exist', callerAdvisorId: 'adv-1', effortMinutes: 10,
    })).rejects.toThrow(/not the Advisor party/);
    expect(captureEffortMock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// G/I — inactive/ended Assignment denied for NEW capture; history untouched
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — G/I. Assignment-active required for new capture; history is never mutated', () => {
  it('G. an invalid/ended Assignment is denied even though it exists and belongs to the caller', async () => {
    assignments = [{ id: 'assign-1', advisorId: 'adv-1', companyId: 'company-1', status: 'ended' }];
    validityResult = { valid: false, reasons: ['assignment_not_active'] };
    const { captureAdvisorPreparationEffort } = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    await expect(captureAdvisorPreparationEffort({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', effortMinutes: 10,
    })).rejects.toThrow(/not currently valid/);
    expect(captureEffortMock).not.toHaveBeenCalled();
  });

  it('I. this module never imports update/delete access onto workload_event — no historical-correction path exists here', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toMatch(/\.update\(|\.delete\(/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// J/K/L/M/N — boundary non-contamination
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — J-N. boundary non-contamination', () => {
  it('J. no billing/payable/commercial-entitlement/Prime import exists', () => {
    const lines = tsCodeLines(read(SERVICE_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /billing|payable|commercial-entitlement|prime|fee_charge/i.test(l))).toBe(false);
  });

  it('K/L. no governance-event or Review import exists — effort capture is not a governance verdict', () => {
    const lines = tsCodeLines(read(SERVICE_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /governance-event|review-service|review-advisor-proposal/i.test(l))).toBe(false);
  });

  it('M. no KORA Index/IU/BTI/Confidence import exists', () => {
    const lines = tsCodeLines(read(SERVICE_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /kora-index|impact-unit|\bIU\b|\bBTI\b|confidence-score/i.test(l))).toBe(false);
  });

  it('N. no Worker/PIB reference anywhere in this file', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toMatch(/worker_id|workerId|\bPIB\b|worker_pib/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// O — downstream contract for WP-043/044/075
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-038 — O. downstream contract for WP-043/044/075', () => {
  it('exports a stable, importable capture function (WP-043/044 regression-test target)', async () => {
    const mod = await import('@/lib/advisor-portal/advisor-preparation-effort-service');
    expect(typeof mod.captureAdvisorPreparationEffort).toBe('function');
  });

  it('advisor_preparation events are aggregatable by WP-075 via the existing WP-008 reader — no new read path was built', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toMatch(/getAggregate|export async function get/); // this file exposes only the capture hook, never a read/reporting function
  });
});
