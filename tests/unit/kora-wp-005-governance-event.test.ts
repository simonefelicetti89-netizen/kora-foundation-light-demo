/**
 * KORA-WP-005 — Shared Governance Event/Provenance Substrate.
 *
 * Behavioral (not string-matching) tests of the REAL recordGovernanceEvent()
 * function from lib/audit/governance-event.ts, with only the Supabase I/O
 * boundary (@/lib/supabase/server) mocked — the actual service logic under
 * test is never mocked or bypassed. Same technique as this session's own
 * tests/unit/kora-wp-004-company-membership.test.ts.
 *
 * The append-only invariant itself (UPDATE/DELETE rejection) is a database
 * trigger (migration 051) — a mock cannot prove a real Postgres trigger
 * fires. That half of KORA-WP-005's acceptance ("edit attempt rejected") is
 * validated against a real local disposable database instead; see
 * .kora-audit/output/109's "Real DB Immutability Validation" section. This
 * file proves what IS provable at the mocked-I/O level: correct insertion,
 * explicit (never manufactured) provenance, and — the domain invariant this
 * WP's own Out of Scope requires — that the module exposes no update/delete
 * capability at all, and invents no Audit/Case/consumer-specific taxonomy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const TENANT_A = 'aaaaaaaa-0000-4000-8000-000000000001';

interface Row {
  id: string;
  source_module: string;
  actor_role: string;
  actor_id: string;
  event_type: string;
  object_type: string | null;
  object_id: string | null;
  tenant_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

let insertedRows: Row[] = [];
let nextId = 0;
let forceInsertError = false;

function makeGovernanceEventTable() {
  return {
    insert: (payload: Omit<Row, 'id' | 'occurred_at'>) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) {
            return { data: null, error: { message: 'permission denied for table governance_event' } };
          }
          nextId += 1;
          const row: Row = { ...payload, id: `event-${nextId}`, occurred_at: '2026-09-12T00:00:00.000Z' };
          insertedRows.push(row);
          return { data: row, error: null };
        },
      }),
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'audit' && table === 'governance_event') return makeGovernanceEventTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

beforeEach(() => {
  insertedRows = [];
  nextId = 0;
  forceInsertError = false;
});

describe('KORA-WP-005 — event insertion works, with explicit provenance', () => {
  it('records an event with all required provenance fields, correctly mapped', async () => {
    const { recordGovernanceEvent } = await import('@/lib/audit/governance-event');
    const event = await recordGovernanceEvent({
      sourceModule: 'test-module',
      actorRole: 'KORA_ADMIN',
      actorId: 'admin-1',
      eventType: 'test.event.recorded',
    });
    expect(event.sourceModule).toBe('test-module');
    expect(event.actorRole).toBe('KORA_ADMIN');
    expect(event.actorId).toBe('admin-1');
    expect(event.eventType).toBe('test.event.recorded');
    expect(event.objectType).toBeNull();
    expect(event.objectId).toBeNull();
    expect(event.tenantId).toBeNull();
    expect(event.payload).toEqual({});
    expect(event.id).toBeTruthy();
    expect(event.occurredAt).toBeTruthy();
  });

  it('records optional object/tenant/payload fields when supplied — never manufactured, only what the caller provides', async () => {
    const { recordGovernanceEvent } = await import('@/lib/audit/governance-event');
    const event = await recordGovernanceEvent({
      sourceModule: 'company-membership',
      actorRole: 'KORA_ADMIN',
      actorId: 'admin-2',
      eventType: 'company_membership_created',
      objectType: 'company_membership',
      objectId: 'membership-42',
      tenantId: TENANT_A,
      payload: { role: 'COMPANY_ADMIN' },
    });
    expect(event.objectType).toBe('company_membership');
    expect(event.objectId).toBe('membership-42');
    expect(event.tenantId).toBe(TENANT_A);
    expect(event.payload).toEqual({ role: 'COMPANY_ADMIN' });
  });

  it('does not require a tenant — KORA-global by default (no fabricated ownership)', async () => {
    const { recordGovernanceEvent } = await import('@/lib/audit/governance-event');
    const event = await recordGovernanceEvent({
      sourceModule: 'system-scheduler',
      actorRole: 'KORA_ADMIN',
      actorId: 'system',
      eventType: 'system.maintenance.run',
    });
    expect(event.tenantId).toBeNull();
  });

  it('places an invented event_type value exactly as given — this substrate never validates/constrains a taxonomy', async () => {
    const { recordGovernanceEvent } = await import('@/lib/audit/governance-event');
    const event = await recordGovernanceEvent({
      sourceModule: 'anything',
      actorRole: 'WORKER',
      actorId: 'w-1',
      eventType: 'literally.any.string.the.caller.chooses',
    });
    expect(event.eventType).toBe('literally.any.string.the.caller.chooses');
  });

  it('surfaces a DB-level failure (e.g. a missing GRANT) as a thrown error, never a silent success', async () => {
    forceInsertError = true;
    const { recordGovernanceEvent } = await import('@/lib/audit/governance-event');
    await expect(recordGovernanceEvent({
      sourceModule: 'test', actorRole: 'KORA_ADMIN', actorId: 'a', eventType: 'x',
    })).rejects.toThrow(/recordGovernanceEvent failed/);
  });
});

describe('KORA-WP-005 — domain invariant: no update/delete capability exists, no consumer-specific logic', () => {
  it('the module exports exactly recordGovernanceEvent and no update/delete/patch function', async () => {
    const mod = await import('@/lib/audit/governance-event');
    const exportNames = Object.keys(mod);
    expect(exportNames).toContain('recordGovernanceEvent');
    expect(exportNames.some((n) => /update|delete|edit|patch|remove/i.test(n))).toBe(false);
  });

  it('the module contains no Audit-specific, Case-specific, or ADMIN-020-specific business logic (structural)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/audit/governance-event.ts'), 'utf8');
    // Out-of-scope check: the primitive must not hardcode any consumer's
    // vocabulary as if it owned it (a generic mention in a comment citing
    // the future consumer WPs is fine; a hardcoded status/taxonomy is not).
    expect(src).not.toMatch(/CASE_STATUS|TASK_STATUS|ADMIN_020_ACTIVITY/);
  });

  it('audit.audit_log is never queried/written — this is a new, distinct table, not a modification of the existing one (comments discussing the distinction in prose are expected and fine)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/audit/governance-event.ts'), 'utf8');
    expect(src).not.toContain("from('audit_log')");
    expect(src).not.toContain(".from('audit_log'");
  });
});

describe('KORA-WP-005 — migration is additive, does not touch audit.audit_log, enforces append-only at DB level', () => {
  it('does not ALTER or DROP any existing table, including audit.audit_log', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/051_governance_event_substrate.sql'), 'utf8');
    expect(migration).not.toMatch(/ALTER TABLE audit\.audit_log/);
    const dropLines = migration.split('\n').filter((l) => /DROP TABLE|DROP TRIGGER|DROP FUNCTION/.test(l));
    for (const line of dropLines) {
      expect(line.trim().startsWith('--')).toBe(true); // only inside the commented rollback block
    }
  });

  it('defines a BEFORE UPDATE OR DELETE trigger that RAISEs an exception unconditionally (mirrors migration 049)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/051_governance_event_substrate.sql'), 'utf8');
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON audit\.governance_event/);
    expect(migration).toContain('RAISE EXCEPTION');
    expect(migration).toMatch(/kora\/immutable/);
  });

  it('enables and forces RLS with zero policies (fail-closed for every session-client role)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/051_governance_event_substrate.sql'), 'utf8');
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/FORCE ROW LEVEL SECURITY/);
    expect(migration).not.toMatch(/CREATE POLICY/);
  });

  it('event_type has no CHECK constraint — no taxonomy invented by this migration', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/051_governance_event_substrate.sql'), 'utf8');
    const eventTypeLine = migration.split('\n').find((l) => l.trim().startsWith('event_type'));
    expect(eventTypeLine).toBeDefined();
    expect(eventTypeLine).not.toMatch(/CHECK/);
  });
});
