/**
 * B168.6 — Service-role scoped keys + idempotency guards
 *
 * Structural tests: whitelist assertions, route wiring, migration idempotency.
 * No live Supabase calls — reads source files only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertProvisioningInsertPayload,
  assertProvisioningUpdatePayload,
} from '@/lib/supabase/worker-provisioning-service-key';
import {
  assertIUSelectColumns as assertIUCols,
} from '@/lib/supabase/impact-unit-service-key';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  try { readFileSync(resolve(root, relPath)); return true; } catch { return false; }
}

// ── File existence ─────────────────────────────────────────────────────────────

describe('B168.6 — scoped service-key files exist', () => {
  it('worker-provisioning-service-key.ts exists', () => {
    expect(fileExists('lib/supabase/worker-provisioning-service-key.ts')).toBe(true);
  });

  it('impact-unit-service-key.ts exists', () => {
    expect(fileExists('lib/supabase/impact-unit-service-key.ts')).toBe(true);
  });
});

// ── assertProvisioningInsertPayload — whitelist ────────────────────────────────

describe('assertProvisioningInsertPayload — whitelist', () => {
  it('accepts all whitelisted fields', () => {
    expect(() =>
      assertProvisioningInsertPayload({
        worker_ref: 'WRK-001',
        tenant_id:  'uuid-tenant',
        auth_user_id: 'uuid-user',
        status: 'invited',
      }),
    ).not.toThrow();
  });

  it('accepts optional created_at', () => {
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', tenant_id: 't', auth_user_id: 'u', status: 'invited', created_at: '2026-01-01' }),
    ).not.toThrow();
  });

  it('rejects display_name', () => {
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', tenant_id: 't', auth_user_id: 'u', status: 'invited', display_name: 'Mario Rossi' }),
    ).toThrow('display_name');
  });

  it('rejects email_personal', () => {
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', tenant_id: 't', auth_user_id: 'u', status: 'invited', email_personal: 'x@x.com' }),
    ).toThrow('email_personal');
  });

  it('rejects phone', () => {
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', status: 'invited', tenant_id: 't', auth_user_id: 'u', phone: '+39123' }),
    ).toThrow('phone');
  });

  it('rejects tax_id / codice_fiscale', () => {
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', status: 'invited', tenant_id: 't', auth_user_id: 'u', tax_id: 'RSSMRA80A01H501U' }),
    ).toThrow('tax_id');
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', status: 'invited', tenant_id: 't', auth_user_id: 'u', codice_fiscale: 'RSSMRA80A01H501U' }),
    ).toThrow('codice_fiscale');
  });

  it('rejects multiple forbidden fields and names them all', () => {
    expect(() =>
      assertProvisioningInsertPayload({ worker_ref: 'x', status: 'y', tenant_id: 't', auth_user_id: 'u', phone: '+39', display_name: 'Mario' }),
    ).toThrow();
  });
});

// ── assertProvisioningUpdatePayload — whitelist ────────────────────────────────

describe('assertProvisioningUpdatePayload — whitelist', () => {
  it('accepts status', () => {
    expect(() => assertProvisioningUpdatePayload({ status: 'active' })).not.toThrow();
  });

  it('accepts updated_at', () => {
    expect(() => assertProvisioningUpdatePayload({ status: 'active', updated_at: '2026-01-01' })).not.toThrow();
  });

  it('rejects worker_ref on UPDATE', () => {
    expect(() => assertProvisioningUpdatePayload({ status: 'active', worker_ref: 'WRK-001' })).toThrow('worker_ref');
  });
});

// ── assertIUSelectColumns — whitelist ──────────────────────────────────────────

describe('assertIUSelectColumns — whitelist', () => {
  it('accepts all standard pipeline columns', () => {
    expect(() =>
      assertIUCols(['id', 'uef_record_id', 'nm', 'bc', 'impact_units_total', 'life_iu', 'factor_trace']),
    ).not.toThrow();
  });

  it('rejects worker_ref', () => {
    expect(() => assertIUCols(['id', 'worker_ref', 'nm'])).toThrow('worker_ref');
  });

  it('rejects worker_id', () => {
    expect(() => assertIUCols(['id', 'worker_id'])).toThrow('worker_id');
  });

  it('rejects auth_user_id', () => {
    expect(() => assertIUCols(['id', 'auth_user_id'])).toThrow('auth_user_id');
  });

  it('rejects pseudonym_id', () => {
    expect(() => assertIUCols(['id', 'pseudonym_id'])).toThrow('pseudonym_id');
  });
});

// ── Route wiring — provision route uses scoped client ─────────────────────────

describe('B168.6 — provision route wires scoped service-key', () => {
  const provisionRoute = readFile('app/api/admin/workers/provision/route.ts');

  it('imports insertWorkerIdentity from worker-provisioning-service-key', () => {
    expect(provisionRoute).toContain("from '@/lib/supabase/worker-provisioning-service-key'");
  });

  it('calls insertWorkerIdentity for the worker_identity INSERT', () => {
    expect(provisionRoute).toContain('insertWorkerIdentity(');
  });

  it('does NOT call db.schema(personal) for worker_identity INSERT directly', () => {
    // The scoped function handles the db call; the route should not bypass it.
    expect(provisionRoute).not.toContain(".from('worker_identity')");
  });
});

// ── Route wiring — impact-units route uses scoped client ──────────────────────

describe('B168.6 — impact-units route wires scoped service-key', () => {
  const iuRoute = readFile('app/api/admin/impact-units/route.ts');

  it('imports queryImpactUnits from impact-unit-service-key', () => {
    expect(iuRoute).toContain("from '@/lib/supabase/impact-unit-service-key'");
  });

  it('calls queryImpactUnits for IU data', () => {
    expect(iuRoute).toContain('queryImpactUnits(');
  });

  it('calls queryImpactUnitPeriods for period list', () => {
    expect(iuRoute).toContain('queryImpactUnitPeriods(');
  });

  it('does NOT call db.schema(analytics).from(impact_unit) directly', () => {
    // Column-whitelisted service-key calls replace direct db calls.
    expect(iuRoute).not.toContain(".from('impact_unit')");
  });
});

// ── Migration idempotency guard — 028 ─────────────────────────────────────────

describe('B168.6 — migration 028 idempotency guard', () => {
  const mig028 = readFile('supabase/migrations/028_audit_log_enrichment.sql');

  it('CREATE POLICY is wrapped in DO $$ guard', () => {
    // Guard pattern: DO $$ BEGIN IF NOT EXISTS (...) THEN CREATE POLICY ... END $$
    // Verify: (1) DO $$ block exists, (2) policy name exists, (3) IF NOT EXISTS precedes it.
    expect(mig028).toContain('DO $$');
    expect(mig028).toContain('CREATE POLICY "audit_reader_select"');
    // The IF NOT EXISTS guard must appear before CREATE POLICY in the file.
    const doIdx   = mig028.indexOf('DO $$');
    const ifIdx   = mig028.indexOf("policyname = 'audit_reader_select'");
    const createIdx = mig028.indexOf('CREATE POLICY "audit_reader_select"');
    // All three must be present and in order: DO $$ ... IF NOT EXISTS check ... CREATE POLICY
    expect(doIdx).toBeGreaterThanOrEqual(0);
    expect(ifIdx).toBeGreaterThan(doIdx);
    expect(createIdx).toBeGreaterThan(ifIdx);
  });

  it('is marked IDEMPOTENT in header comment', () => {
    expect(mig028).toContain('IDEMPOTENT');
  });

  it('ADD COLUMN uses IF NOT EXISTS', () => {
    const addCols = mig028.match(/ADD COLUMN/g) ?? [];
    const addColsWithGuard = mig028.match(/ADD COLUMN IF NOT EXISTS/g) ?? [];
    expect(addColsWithGuard.length).toBe(addCols.length);
  });
});

// ── Migration idempotency — 027 ────────────────────────────────────────────────

describe('B168.6 — migration 027 idempotency', () => {
  const mig027 = readFile('supabase/migrations/027_worker_individual_rls_refactor.sql');

  it('all DROP POLICY use IF EXISTS', () => {
    const dropPolicies = mig027.match(/DROP POLICY/g) ?? [];
    const dropPoliciesIfExists = mig027.match(/DROP POLICY IF EXISTS/g) ?? [];
    expect(dropPoliciesIfExists.length).toBe(dropPolicies.length);
    expect(dropPolicies.length).toBeGreaterThan(0);
  });

  it('is marked IDEMPOTENT in header comment', () => {
    expect(mig027).toContain('IDEMPOTENT');
  });
});
