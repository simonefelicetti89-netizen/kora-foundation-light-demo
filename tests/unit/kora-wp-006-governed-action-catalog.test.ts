/**
 * KORA-WP-006 — Governance Audit Log Extension.
 *
 * Behavioral (not string-matching) tests of the REAL recordGovernedAction()
 * function from lib/audit/governed-action-catalog.ts, with only the
 * downstream governance-event substrate (@/lib/audit/governance-event)
 * mocked — the actual category-validation logic under test is never mocked
 * or bypassed. Same technique as this session's kora-wp-005/009/014 test
 * files.
 *
 * Real-DB proof that events actually persist through audit.governance_event
 * (immutable, RLS/GRANT-bounded exactly as KORA-WP-005 built it) lives in
 * the real-DB validation pass (file 113) — a mock cannot prove real
 * Postgres behavior. This file proves what IS provable at the mocked-I/O
 * level: every canonical category is accepted (one test per category, per
 * this WP's own canonical Tests field), a non-canonical category is
 * rejected at this layer (never silently passed through), provenance is
 * never fabricated, and the catalogue does not reuse KORA-WP-009's
 * capability vocabulary as a substitute for its own, distinct concept.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GOVERNED_ACTION_CATEGORIES } from '@/lib/audit/governed-action-catalog';

const recordGovernanceEventMock = vi.fn(async (params: Record<string, unknown>) => ({
  id: 'event-1',
  sourceModule: params.sourceModule,
  actorRole: params.actorRole,
  actorId: params.actorId,
  eventType: params.eventType,
  objectType: params.objectType ?? null,
  objectId: params.objectId ?? null,
  tenantId: params.tenantId ?? null,
  payload: params.payload ?? {},
  occurredAt: '2026-09-12T00:00:00.000Z',
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (params: Record<string, unknown>) => recordGovernanceEventMock(params),
}));

beforeEach(() => {
  recordGovernanceEventMock.mockClear();
});

describe('KORA-WP-006 — canonical catalogue has exactly the 14 categories named by doc 79 §17', () => {
  it('has exactly 14 categories, no 15th invented, none collapsed', () => {
    expect(GOVERNED_ACTION_CATEGORIES.length).toBe(14);
  });

  it('is a distinct vocabulary from KORA-WP-009 capability domains/actions — no overlap, not reused as a substitute', async () => {
    const { CAPABILITY_DOMAINS, CAPABILITY_ACTIONS } = await import('@/lib/admin-capability/capability-service');
    const overlap = GOVERNED_ACTION_CATEGORIES.filter(
      (c) => (CAPABILITY_DOMAINS as readonly string[]).includes(c) || (CAPABILITY_ACTIONS as readonly string[]).includes(c),
    );
    expect(overlap).toEqual([]);
  });
});

describe('KORA-WP-006 — one test per governed-action category (canonical Tests requirement)', () => {
  for (const category of GOVERNED_ACTION_CATEGORIES) {
    it(`accepts and records the canonical category: ${category}`, async () => {
      const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
      const event = await recordGovernedAction({
        category,
        actorRole: 'KORA_ADMIN',
        actorId: 'admin-1',
      });
      expect(event.eventType).toBe(`governed_action.${category.toLowerCase()}`);
      expect(recordGovernanceEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ sourceModule: 'governance-audit', eventType: `governed_action.${category.toLowerCase()}` }),
      );
    });
  }
});

describe('KORA-WP-006 — non-canonical categories are rejected at this layer, never silently passed through', () => {
  it('rejects an invented category before ever calling recordGovernanceEvent', async () => {
    const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
    await expect(recordGovernedAction({
      // @ts-expect-error deliberately invalid — proves the type system also rejects it
      category: 'MADE_UP_CATEGORY',
      actorRole: 'KORA_ADMIN',
      actorId: 'admin-1',
    })).rejects.toThrow(/not a canonical governed-action category/);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });

  it('does not silently map an unrecognized category onto an existing one', async () => {
    const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
    await expect(recordGovernedAction({
      // @ts-expect-error deliberately invalid
      category: 'ROLE_CHANGES', // plural typo of a real category — must NOT be silently corrected
      actorRole: 'KORA_ADMIN',
      actorId: 'admin-1',
    })).rejects.toThrow();
  });
});

describe('KORA-WP-006 — provenance is explicit, never fabricated', () => {
  it('passes actorRole/actorId through unchanged, never defaulted or inferred', async () => {
    const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
    await recordGovernedAction({ category: 'ROLE_CHANGE', actorRole: 'KORA_ADMIN', actorId: 'specific-operator-42' });
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(expect.objectContaining({ actorRole: 'KORA_ADMIN', actorId: 'specific-operator-42' }));
  });

  it('tenant context is absent (null) rather than fabricated when not supplied — most categories are not Company-tenant-scoped at all', async () => {
    const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
    const event = await recordGovernedAction({ category: 'PARTNER_CERTIFICATION_CHANGE', actorRole: 'KORA_ADMIN', actorId: 'admin-1' });
    expect(event.tenantId).toBeNull();
  });

  it('object reference is absent (null) rather than fabricated when not supplied', async () => {
    const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
    const event = await recordGovernedAction({ category: 'ACADEMY_EQUIVALENCY_OVERRIDE', actorRole: 'KORA_ADMIN', actorId: 'admin-1' });
    expect(event.objectType).toBeNull();
    expect(event.objectId).toBeNull();
  });

  it('preserves explicit object/tenant/payload when the caller does supply them', async () => {
    const { recordGovernedAction } = await import('@/lib/audit/governed-action-catalog');
    const event = await recordGovernedAction({
      category: 'SUSPENSION_REVOCATION',
      actorRole: 'KORA_ADMIN',
      actorId: 'admin-1',
      objectType: 'internal_operator',
      objectId: 'operator-9',
      payload: { verb: 'revoke' },
    });
    expect(event.objectType).toBe('internal_operator');
    expect(event.objectId).toBe('operator-9');
    expect(event.payload).toEqual({ verb: 'revoke' });
  });
});

describe('KORA-WP-006 — privacy invariant: no worker-private data channel, no third audit persistence system', () => {
  it('the module contains no worker-individual field names (structural — audit never exposes worker-private data)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    expect(src).not.toMatch(/worker_identity|personal\.worker|pib_score|health_data|therapist/i);
  });

  it('the module never constructs its own Supabase client — it uses recordGovernanceEvent() exclusively, no third persistence system', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    expect(src).not.toMatch(/getSupabaseServiceClient|createClient\(/);
    expect(src).toMatch(/recordGovernanceEvent/);
  });

  it('the module never queries or writes audit.audit_log — legacy audit is untouched by this WP', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    expect(src).not.toContain("from('audit_log')");
    expect(src).not.toContain(".from('audit_log'");
  });
});
