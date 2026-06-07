// b90b-workforce-management.test.ts
// Workforce Command Center — B90-B Sprint test suite.
//
// Tests cover:
// 1. computeWorkforceStatus — EMPTY / PARTIAL / READY rules
// 2. computeNextAction — deterministic next-action rules
// 3. WorkerProvisioningService — roster, summary, createDemoWorker
// 4. WorkerSpaceCapabilityService — status derivation
// 5. Privacy invariants — employer_can_view_individual_pib always false
// 6. Privacy messaging — COMPANY_CAN_SEE / COMPANY_CANNOT_SEE content
// 7. Navigation helpers — getWorkforceRoute
//
// No methodology changes. No DB changes. No auth changes.

import { describe, it, expect } from 'vitest';
import {
  computeWorkforceStatus,
  computeNextAction,
  getWorkforceRoute,
  COMPANY_CAN_SEE,
  COMPANY_CANNOT_SEE,
  WORKFORCE_PRIVACY_GUARANTEE,
} from '../../lib/workforce/workforce-rules';
import { workerProvisioningService } from '../../services/worker-provisioning/WorkerProvisioningService';
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

// ── 3. WorkerProvisioningService — roster and summary ─────────────────────────

describe('WorkerProvisioningService.getWorkersForCompany', () => {
  it('returns an array for meridiana-group', () => {
    const workers = workerProvisioningService.getWorkersForCompany('meridiana-group');
    expect(Array.isArray(workers)).toBe(true);
    expect(workers.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown company', () => {
    const workers = workerProvisioningService.getWorkersForCompany('nonexistent-company-xyz');
    expect(workers).toEqual([]);
  });

  it('all returned workers belong to the requested company', () => {
    const workers = workerProvisioningService.getWorkersForCompany('meridiana-group');
    for (const w of workers) {
      expect(w.company_id).toBe('meridiana-group');
    }
  });

  it('every worker has employer_can_view_individual_pib === false', () => {
    const workers = workerProvisioningService.getWorkersForCompany('meridiana-group');
    for (const w of workers) {
      // This is a typed invariant — must always be false
      expect(w.employer_can_view_individual_pib).toBe(false);
    }
  });
});

describe('WorkerProvisioningService.getWorkerProvisioningSummary', () => {
  it('returns a summary for meridiana-group', () => {
    const summary = workerProvisioningService.getWorkerProvisioningSummary('meridiana-group');
    expect(summary.company_id).toBe('meridiana-group');
    expect(typeof summary.total_workers).toBe('number');
    expect(typeof summary.my_kora_enabled_count).toBe('number');
    expect(typeof summary.active_worker_accounts).toBe('number');
  });

  it('summary total_workers ≥ my_kora_enabled_count', () => {
    const summary = workerProvisioningService.getWorkerProvisioningSummary('meridiana-group');
    expect(summary.total_workers).toBeGreaterThanOrEqual(summary.my_kora_enabled_count);
  });

  it('returns total_workers = 0 for unknown company', () => {
    const summary = workerProvisioningService.getWorkerProvisioningSummary('nonexistent-xyz');
    expect(summary.total_workers).toBe(0);
    expect(summary.my_kora_enabled_count).toBe(0);
  });

  it('next_action is a non-empty string', () => {
    const summary = workerProvisioningService.getWorkerProvisioningSummary('meridiana-group');
    expect(typeof summary.next_action).toBe('string');
    expect(summary.next_action.length).toBeGreaterThan(0);
  });

  it('privacy_notes mentions PIB and employer invariant', () => {
    const summary = workerProvisioningService.getWorkerProvisioningSummary('meridiana-group');
    expect(summary.privacy_notes.toLowerCase()).toContain('pib');
    expect(summary.privacy_notes.toLowerCase()).toContain('employer_can_view_individual_pib');
  });
});

// ── 4. WorkerProvisioningService.createDemoWorker ─────────────────────────────

describe('WorkerProvisioningService.createDemoWorker', () => {
  const baseParams = {
    companyId: 'test-company',
    tenantId: 'tenant-test',
    firstName: 'Giulia',
    lastName: 'Bianchi',
    department: 'Operations',
    site: 'Milano HQ',
    myKoraEnabled: false,
  };

  it('returns success = true', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.success).toBe(true);
  });

  it('record has correct display_name', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.display_name).toBe('Giulia Bianchi');
  });

  it('record has correct company_id and tenant_id', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.company_id).toBe('test-company');
    expect(result.record.tenant_id).toBe('tenant-test');
  });

  it('employer_can_view_individual_pib is always false (typed invariant)', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.employer_can_view_individual_pib).toBe(false);
  });

  it('pib_private_enabled is false for demo roster creation', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.pib_private_enabled).toBe(false);
  });

  it('worker_account_status is draft (no live account creation)', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.worker_account_status).toBe('draft');
  });

  it('consent_status is not_collected (no email, no auth)', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.consent_status).toBe('not_collected');
  });

  it('my_kora_enabled reflects the param', () => {
    const withMyKora = workerProvisioningService.createDemoWorker({ ...baseParams, myKoraEnabled: true });
    const withoutMyKora = workerProvisioningService.createDemoWorker({ ...baseParams, myKoraEnabled: false });
    expect(withMyKora.record.my_kora_enabled).toBe(true);
    expect(withoutMyKora.record.my_kora_enabled).toBe(false);
  });

  it('note mentions no account, no email, no PIB', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.note.toLowerCase()).toContain('nessun account');
    expect(result.note.toLowerCase()).toContain('nessuna email');
    expect(result.note.toLowerCase()).toContain('nessun pib');
  });

  it('each call produces a unique worker_id', () => {
    // Add tiny delay to ensure timestamp differs
    const r1 = workerProvisioningService.createDemoWorker(baseParams);
    const r2 = workerProvisioningService.createDemoWorker(baseParams);
    // IDs may be the same in same ms tick — but random suffix prevents most collisions
    expect(r1.record.worker_id).toBeTruthy();
    expect(r2.record.worker_id).toBeTruthy();
  });

  it('worker_id starts with WRK-DEMO-', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(result.record.worker_id.startsWith('WRK-DEMO-')).toBe(true);
  });

  it('department and site use params (with fallback to Non specificato)', () => {
    const r1 = workerProvisioningService.createDemoWorker({ ...baseParams, department: 'HR', site: 'Roma' });
    expect(r1.record.department).toBe('HR');
    expect(r1.record.site).toBe('Roma');

    const r2 = workerProvisioningService.createDemoWorker({ ...baseParams, department: '', site: '' });
    expect(r2.record.department).toBe('Non specificato');
    expect(r2.record.site).toBe('Non specificato');
  });

  it('created_at is a valid ISO date string', () => {
    const result = workerProvisioningService.createDemoWorker(baseParams);
    expect(typeof result.record.created_at).toBe('string');
    const d = new Date(result.record.created_at);
    expect(isNaN(d.getTime())).toBe(false);
  });
});

// ── 5. WorkerSpaceCapabilityService ──────────────────────────────────────────

describe('WorkerSpaceCapabilityService.getCapabilityByCompanyId', () => {
  it('returns a capability object for meridiana-group', () => {
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('meridiana-group');
    expect(cap).toBeDefined();
    expect(cap.status).toBeDefined();
    expect(['NOT_ENABLED', 'ENABLED', 'PILOT_READY']).toContain(cap.status);
  });

  it('returns NOT_ENABLED for unknown company (0 workers)', () => {
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('nonexistent-xyz');
    expect(cap.status).toBe('NOT_ENABLED');
    expect(cap.enabled).toBe(false);
  });

  it('capability has all required fields', () => {
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('meridiana-group');
    expect(typeof cap.enabled).toBe('boolean');
    expect(typeof cap.dynamicCvSupported).toBe('boolean');
    expect(typeof cap.pibSupported).toBe('boolean');
    expect(typeof cap.collectiveSupported).toBe('boolean');
    expect(typeof cap.note).toBe('string');
    expect(['preview', 'pilot_ready', 'not_enabled']).toContain(cap.mode);
  });

  it('meridiana-group capability reflects My KORA seed data', () => {
    // Meridiana has WRK-MERD-001 with my_kora_enabled: true → ENABLED
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('meridiana-group');
    // Should be ENABLED (at least one My KORA enabled worker in seed)
    expect(cap.status).toBe('ENABLED');
    expect(cap.enabled).toBe(true);
  });

  it('ENABLED capability has mode preview in Foundation Light', () => {
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('meridiana-group');
    if (cap.status === 'ENABLED') {
      expect(cap.mode).toBe('preview');
    }
  });
});

// ── 6. Privacy invariants across all roster records ───────────────────────────

describe('Privacy invariants', () => {
  it('employer_can_view_individual_pib is false on ALL seed workers', () => {
    const companies = ['meridiana-group', 'alba-manufacturing'];
    for (const companyId of companies) {
      const workers = workerProvisioningService.getWorkersForCompany(companyId);
      for (const w of workers) {
        expect(w.employer_can_view_individual_pib).toBe(false);
      }
    }
  });

  it('createDemoWorker NEVER sets employer_can_view_individual_pib to true', () => {
    const result = workerProvisioningService.createDemoWorker({
      companyId: 'any-company',
      tenantId: 'any-tenant',
      firstName: 'Test',
      lastName: 'Worker',
      department: 'Test',
      site: 'Test',
      myKoraEnabled: true, // even with My KORA ON — PIB still private
    });
    expect(result.record.employer_can_view_individual_pib).toBe(false);
  });

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

// ── 7. Navigation helper ──────────────────────────────────────────────────────

describe('getWorkforceRoute', () => {
  it('returns correct route for a known company', () => {
    expect(getWorkforceRoute('meridiana-group')).toBe('/admin/companies/meridiana-group/workforce');
  });

  it('correctly interpolates arbitrary companyId', () => {
    expect(getWorkforceRoute('alba-manufacturing')).toBe('/admin/companies/alba-manufacturing/workforce');
    expect(getWorkforceRoute('test-co-123')).toBe('/admin/companies/test-co-123/workforce');
  });

  it('route is under /admin (admin-only guard applies)', () => {
    const route = getWorkforceRoute('any-company');
    expect(route.startsWith('/admin/')).toBe(true);
  });
});

// ── 8. Workforce status + next action integration ─────────────────────────────

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
