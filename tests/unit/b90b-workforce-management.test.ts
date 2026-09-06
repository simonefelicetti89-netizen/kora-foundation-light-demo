// b90b-workforce-management.test.ts
// Workforce Command Center — B90-B Sprint test suite.
//
// Tests cover:
// 1. computeWorkforceStatus — EMPTY / PARTIAL / READY rules
// 2. computeNextAction — deterministic next-action rules
// 3. WorkerSpaceCapabilityService.getCapabilityFromCounts — status derivation
// 4. Privacy invariants — employer_can_view_individual_pib always false
// 5. Privacy messaging — COMPANY_CAN_SEE / COMPANY_CANNOT_SEE content
// 6. Navigation helpers — getWorkforceRoute
//
// No methodology changes. No DB changes. No auth changes.
//
// PRIOR HISTORY (accurate as of B90-B, preserved as a record, not verbatim
// given the volume): this file's original sections 3 (WorkerProvisioningService
// roster/summary — getWorkersForCompany('meridiana-group'),
// getWorkerProvisioningSummary), 4 (WorkerProvisioningService.createDemoWorker),
// and 5's getCapabilityByCompanyId('meridiana-group') tested behavior against
// a synthetic seed fixture (data/synthetic/worker-roster.json) keyed by demo
// company_ids like 'meridiana-group'.
//
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06):
// WorkerProvisioningService.ts is deleted entirely. Fresh, exhaustive method
// audit found getWorkersForCompany()/getWorkerProvisioningSummary() were the
// ONLY 2 of its 10 methods with real callers, both migrated to canonical
// personal.worker_identity reads via lib/live/worker-provisioning-status-view.ts
// (a DB-backed view, not unit-testable without a live database — its own
// coverage lives in tests/integration/ and
// tests/unit/bworker-workerprovisioning-canonicalization.test.ts, which
// tests the pure view builder directly). createDemoWorker() had ZERO real
// callers and was retired outright, no replacement built, per explicit
// founder instruction. getCapabilityByCompanyId() is replaced by
// getCapabilityFromCounts() (pure, takes pre-computed counts — see below).

import { describe, it, expect } from 'vitest';
import {
  computeWorkforceStatus,
  computeNextAction,
  getWorkforceRoute,
  COMPANY_CAN_SEE,
  COMPANY_CANNOT_SEE,
  WORKFORCE_PRIVACY_GUARANTEE,
} from '../../lib/workforce/workforce-rules';
import { workerSpaceCapabilityService } from '../../services/worker-space/WorkerSpaceCapabilityService';

// ── 1. computeWorkforceStatus ─────────────────────────────────────────────────

describe('computeWorkforceStatus', () => {
  it('returns EMPTY when 0 workers', () => {
    expect(computeWorkforceStatus(0, 0)).toBe('EMPTY');
  });

  it('returns PARTIAL when workers exist but none have My KORA', () => {
    expect(computeWorkforceStatus(10, 0)).toBe('PARTIAL');
    expect(computeWorkforceStatus(1, 0)).toBe('PARTIAL');
    expect(computeWorkforceStatus(100, 0)).toBe('PARTIAL');
  });

  it('returns READY when workers exist and at least one has My KORA', () => {
    expect(computeWorkforceStatus(10, 1)).toBe('READY');
    expect(computeWorkforceStatus(10, 10)).toBe('READY');
    expect(computeWorkforceStatus(1, 1)).toBe('READY');
  });

  it('EMPTY always wins over PARTIAL (0 workers, 0 My KORA)', () => {
    // Edge: 0 workers + 0 myKora should still be EMPTY
    expect(computeWorkforceStatus(0, 0)).toBe('EMPTY');
  });

  it('never returns READY when totalWorkers is 0', () => {
    // myKoraCount > 0 with totalWorkers = 0 would be data corruption — EMPTY wins
    expect(computeWorkforceStatus(0, 5)).toBe('EMPTY');
  });
});

// ── 2. computeNextAction ──────────────────────────────────────────────────────

describe('computeNextAction', () => {
  it('0 workers → prompt to add first worker', () => {
    const action = computeNextAction(0, 0, 0, 'NOT_ENABLED');
    expect(action).toContain('Aggiungi il primo lavoratore');
    expect(action).toContain('Nuovo lavoratore');
  });

  it('workers exist + My KORA = 0 → prompt to enable My KORA', () => {
    const action = computeNextAction(10, 0, 0, 'NOT_ENABLED');
    expect(action).toContain('Abilita My KORA');
    expect(action).toContain('10 lavoratori');
  });

  it('My KORA enabled + Worker Space NOT_ENABLED → warn about Worker Space', () => {
    const action = computeNextAction(10, 3, 0, 'NOT_ENABLED');
    expect(action.toLowerCase()).toContain('worker space');
  });

  it('My KORA enabled + Worker Space ENABLED + 0 active → mention Preview', () => {
    const action = computeNextAction(10, 3, 0, 'ENABLED');
    expect(action.toLowerCase()).toContain('preview');
    expect(action).toContain('3 lavoratori');
  });

  it('active accounts exist → mention Pilot+', () => {
    const action = computeNextAction(10, 5, 3, 'ENABLED');
    expect(action).toContain('3 lavoratori');
    expect(action.toLowerCase()).toContain('pilot+');
  });

  it('PILOT_READY status → operational message', () => {
    const action = computeNextAction(10, 5, 5, 'PILOT_READY');
    expect(action).toBeTruthy();
    expect(action.length).toBeGreaterThan(10);
  });

  it('always returns a non-empty string for any input', () => {
    const cases: Array<[number, number, number, Parameters<typeof computeNextAction>[3]]> = [
      [0, 0, 0, 'NOT_ENABLED'],
      [5, 0, 0, 'NOT_ENABLED'],
      [5, 3, 0, 'NOT_ENABLED'],
      [5, 3, 0, 'ENABLED'],
      [5, 3, 3, 'ENABLED'],
      [5, 5, 5, 'PILOT_READY'],
    ];
    for (const args of cases) {
      const result = computeNextAction(...args);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

// ── 3. WorkerSpaceCapabilityService.getCapabilityFromCounts ──────────────────

describe('WorkerSpaceCapabilityService.getCapabilityFromCounts', () => {
  it('returns a capability object for a non-zero roster', () => {
    const cap = workerSpaceCapabilityService.getCapabilityFromCounts(3, 10);
    expect(cap).toBeDefined();
    expect(cap.status).toBeDefined();
    expect(['NOT_ENABLED', 'ENABLED', 'PILOT_READY']).toContain(cap.status);
  });

  it('returns NOT_ENABLED for zero workers', () => {
    const cap = workerSpaceCapabilityService.getCapabilityFromCounts(0, 0);
    expect(cap.status).toBe('NOT_ENABLED');
    expect(cap.enabled).toBe(false);
  });

  it('capability has all required fields', () => {
    const cap = workerSpaceCapabilityService.getCapabilityFromCounts(3, 10);
    expect(typeof cap.enabled).toBe('boolean');
    expect(typeof cap.dynamicCvSupported).toBe('boolean');
    expect(typeof cap.pibSupported).toBe('boolean');
    expect(typeof cap.collectiveSupported).toBe('boolean');
    expect(typeof cap.note).toBe('string');
    expect(['preview', 'pilot_ready', 'not_enabled']).toContain(cap.mode);
  });

  it('at least one My KORA-enabled worker → ENABLED', () => {
    const cap = workerSpaceCapabilityService.getCapabilityFromCounts(1, 10);
    expect(cap.status).toBe('ENABLED');
    expect(cap.enabled).toBe(true);
  });

  it('ENABLED capability has mode preview in Foundation Light', () => {
    const cap = workerSpaceCapabilityService.getCapabilityFromCounts(1, 10);
    expect(cap.mode).toBe('preview');
  });
});

// ── 4. Privacy invariants ─────────────────────────────────────────────────────

describe('Privacy invariants', () => {
  it('COMPANY_CAN_SEE contains aggregate-only items', () => {
    // All items must be about company-level aggregates, never individual
    for (const item of COMPANY_CAN_SEE) {
      const lower = item.toLowerCase();
      // Should not reference individual worker data
      expect(lower).not.toContain('nome');
      expect(lower).not.toContain('cognome');
      expect(lower).not.toContain('individuale');
    }
    expect(COMPANY_CAN_SEE.length).toBeGreaterThan(0);
  });

  it('COMPANY_CANNOT_SEE includes PIB, Dynamic CV, and individual activation', () => {
    const allItems = COMPANY_CANNOT_SEE.join(' ').toLowerCase();
    expect(allItems).toContain('pib');
    expect(allItems).toContain('dynamic cv');
    expect(allItems).toContain('individuale');
    expect(COMPANY_CANNOT_SEE.length).toBeGreaterThan(0);
  });

  it('WORKFORCE_PRIVACY_GUARANTEE mentions PIB and N≥10 threshold', () => {
    const text = WORKFORCE_PRIVACY_GUARANTEE.toLowerCase();
    expect(text).toContain('pib');
    expect(text).toContain('n≥10');
    expect(text).toContain('employer_can_view_individual_pib');
  });
});

// ── 5. Navigation helper ──────────────────────────────────────────────────────

describe('getWorkforceRoute', () => {
  // B-TRUTH Gen 0/1 Retirement Wave 1 (2026-08-30): the per-company demo
  // workforce page was retired; this now always points at the real, live,
  // non-tenant-scoped worker provisioning admin surface (/admin/workers, B104).
  it('returns the real live worker provisioning route regardless of companyId', () => {
    expect(getWorkforceRoute('meridiana-group')).toBe('/admin/workers');
  });

  it('correctly ignores companyId (destination is not tenant-scoped)', () => {
    expect(getWorkforceRoute('alba-manufacturing')).toBe('/admin/workers');
    expect(getWorkforceRoute('test-co-123')).toBe('/admin/workers');
  });

  it('route is under /admin (admin-only guard applies)', () => {
    const route = getWorkforceRoute('any-company');
    expect(route.startsWith('/admin/')).toBe(true);
  });
});

// ── 6. Workforce status + next action integration ─────────────────────────────

describe('Workforce status + next action integration', () => {
  it('EMPTY roster → EMPTY status + add-first-worker action', () => {
    const status = computeWorkforceStatus(0, 0);
    const action = computeNextAction(0, 0, 0, 'NOT_ENABLED');
    expect(status).toBe('EMPTY');
    expect(action).toContain('Aggiungi il primo lavoratore');
  });

  it('roster with workers, no My KORA → PARTIAL + enable action', () => {
    const status = computeWorkforceStatus(5, 0);
    const action = computeNextAction(5, 0, 0, 'NOT_ENABLED');
    expect(status).toBe('PARTIAL');
    expect(action).toContain('Abilita My KORA');
  });

  it('roster with My KORA + ENABLED Worker Space → READY + preview action', () => {
    const status = computeWorkforceStatus(5, 3);
    const action = computeNextAction(5, 3, 0, 'ENABLED');
    expect(status).toBe('READY');
    expect(action.toLowerCase()).toContain('preview');
  });

  it('full activation → READY + pilot action', () => {
    const status = computeWorkforceStatus(10, 7);
    const action = computeNextAction(10, 7, 5, 'ENABLED');
    expect(status).toBe('READY');
    expect(action.toLowerCase()).toContain('pilot+');
  });
});
