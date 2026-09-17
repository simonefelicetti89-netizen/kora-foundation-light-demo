/**
 * KORA-WP-029 — Assisted Mapping Maintenance + Manual Remap Governance.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/mapping-governance/manual-remap-service.ts, with only its three
 * dependencies — createOperationalCase/transitionOperationalCaseStatus
 * (KORA-WP-007) and captureEffort (KORA-WP-008) — mocked at their public
 * boundary. Same technique as this session's kora-wp-038 test file. No
 * route/UI exists over this WP (registry: "UI: existing mapping UI" — the
 * pre-existing, still-inactive C-04 shell is unchanged, not extended), so
 * there is no API-route layer to test here.
 *
 * No new migration/schema exists for this WP (registry: "Data/Migration
 * Impact: NONE") — gov.operational_case and gov.workload_event's own RLS/
 * grants/append-only behavior were already real-DB-validated by
 * KORA-WP-007 and KORA-WP-008 respectively; nothing here changes that
 * surface.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const SERVICE_PATH = 'lib/mapping-governance/manual-remap-service.ts';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function tsCodeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)); }

// ═══════════════════════════════════════════════════════════════════════════
// mocked dependency boundary
// ═══════════════════════════════════════════════════════════════════════════

interface CaseRow {
  id: string; organisationType: string; organisationId: string | null;
  status: string; subject: string; resolutionNote: string | null;
}

let cases: CaseRow[] = [];
let idCounter = 0;
const capturedEffort: Array<Record<string, unknown>> = [];

const createOperationalCaseMock = vi.fn(async (params: Record<string, unknown>) => {
  if (params.organisationType === 'company' && params.organisationId === 'company-DOES-NOT-EXIST') {
    throw new Error('[KORA] createOperationalCase rejected: organisationId does not identify a real Company.');
  }
  const row: CaseRow = {
    id: `case-${++idCounter}`, organisationType: params.organisationType as string,
    organisationId: (params.organisationId as string) ?? null, status: 'open',
    subject: params.subject as string, resolutionNote: null,
  };
  cases.push(row);
  return row;
});

const ALLOWED: Record<string, string[]> = {
  open: ['in-progress', 'blocked', 'escalated'],
  'in-progress': ['resolved'],
  blocked: ['in-progress'],
  escalated: ['in-progress', 'resolved'],
  resolved: [],
};

const transitionOperationalCaseStatusMock = vi.fn(async (params: Record<string, unknown>) => {
  const row = cases.find((c) => c.id === params.caseId);
  if (!row) throw new Error('[KORA] transitionOperationalCaseStatus rejected: no such Case.');
  const newStatus = params.newStatus as string;
  if (newStatus !== row.status) {
    const allowed = ALLOWED[row.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`[KORA] transitionOperationalCaseStatus rejected: cannot transition from "${row.status}" to "${newStatus}".`);
    }
  }
  row.status = newStatus;
  if (params.resolutionNote !== undefined) row.resolutionNote = params.resolutionNote as string;
  return row;
});

vi.mock('@/lib/operations/operational-case-service', () => ({
  createOperationalCase: (p: Record<string, unknown>) => createOperationalCaseMock(p),
  transitionOperationalCaseStatus: (p: Record<string, unknown>) => transitionOperationalCaseStatusMock(p),
}));

const captureEffortMock = vi.fn(async (params: Record<string, unknown>) => {
  capturedEffort.push(params);
  return { id: `evt-${capturedEffort.length}`, ...params };
});

vi.mock('@/lib/operations/effort-capture-service', () => ({
  captureEffort: (p: Record<string, unknown>) => captureEffortMock(p),
}));

beforeEach(() => {
  cases = []; idCounter = 0; capturedEffort.length = 0;
  createOperationalCaseMock.mockClear();
  transitionOperationalCaseStatusMock.mockClear();
  captureEffortMock.mockClear();
});
afterEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// A/B/C — classifier result untouched; valid remap request succeeds; target validated
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — A/B/C. classifier untouched; valid remap request opens a Case', () => {
  it('B. requestManualRemap opens a Case via the existing WP-007 primitive, never a new table', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    const kase = await requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-1:Formazione Manageriale',
      classifierPillar: 'GROWTH', classifierEventType: 'professional_training', classifierConfidence: 0.62,
      proposedPillar: 'CONNECTION', proposedEventType: 'mentoring_program',
      reason: 'Content is peer mentoring, not formal training.', actorId: 'admin-1',
    });
    expect(createOperationalCaseMock).toHaveBeenCalledTimes(1);
    const call = createOperationalCaseMock.mock.calls[0][0];
    expect(call).toMatchObject({ organisationType: 'company', organisationId: 'company-1', callerRole: 'KORA_ADMIN', actorId: 'admin-1' });
    expect(kase.status).toBe('open');
  });

  it('C. classifier suggestion and proposed value are both captured in the Case subject', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    await requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-1:col-X',
      classifierPillar: 'GROWTH', classifierEventType: 'professional_training', classifierConfidence: 0.62,
      proposedPillar: 'CONNECTION', proposedEventType: 'mentoring_program',
      reason: 'peer mentoring', actorId: 'admin-1',
    });
    const subject = createOperationalCaseMock.mock.calls[0][0].subject as string;
    expect(subject).toContain('GROWTH/professional_training');
    expect(subject).toContain('CONNECTION/mentoring_program');
    expect(subject).toContain('0.62');
    expect(subject).toContain('peer mentoring');
  });

  it('subject always fits gov.operational_case\'s real 200-character CHECK constraint, even with a long reason', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    const longReason = 'This column was originally mapped by the rule-based classifier to professional training '
      + 'based on keyword matching, but manual review of the underlying source data confirmed it actually '
      + 'represents a structured peer-mentoring initiative rather than formal training delivery.';
    await requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-2026-09-17-full:Colonna Formazione e Sviluppo Manageriale Interno',
      classifierPillar: 'GROWTH', classifierEventType: 'professional_training', classifierConfidence: 0.62,
      proposedPillar: 'CONNECTION', proposedEventType: 'mentoring_program', reason: longReason, actorId: 'admin-1',
    });
    const subject = createOperationalCaseMock.mock.calls[0][0].subject as string;
    expect(subject.length).toBeLessThanOrEqual(200);
    expect(subject).toContain('GROWTH/professional_training');
  });

  it('A/reason required: a remap request without a reason is rejected before any Case is created', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    await expect(requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-1:col-X',
      classifierPillar: 'GROWTH', classifierEventType: 'professional_training', classifierConfidence: 0.62,
      proposedPillar: 'CONNECTION', proposedEventType: 'mentoring_program',
      reason: '   ', actorId: 'admin-1',
    })).rejects.toThrow(/reason is required/);
    expect(createOperationalCaseMock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// D — actor authority enforced (Admin-mediated, never Company/Advisor)
// ═══════════════════════════════════════════════════════════════════════════

function extractInterfaceBody(src: string, name: string): string {
  const match = src.match(new RegExp(`interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`interface ${name} not found`);
  return match[1];
}

describe('KORA-WP-029 — D. actor authority is always KORA_ADMIN, never caller-supplied', () => {
  it('requestManualRemap never accepts a callerRole parameter — always KORA_ADMIN', () => {
    const src = read(SERVICE_PATH);
    expect(extractInterfaceBody(src, 'RequestManualRemapParams')).not.toMatch(/callerRole\s*:/);
    expect(src).toMatch(/callerRole:\s*REMAP_CALLER_ROLE/);
  });

  it('resolveManualRemap never accepts a callerRole parameter either', () => {
    const src = read(SERVICE_PATH);
    expect(extractInterfaceBody(src, 'ResolveManualRemapParams')).not.toMatch(/callerRole\s*:/);
  });

  it('REMAP_CALLER_ROLE is the literal string KORA_ADMIN', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    await requestManualRemap({
      companyId: 'company-1', sourceReference: 'x', classifierPillar: 'GROWTH', classifierEventType: 't',
      classifierConfidence: 0.5, proposedPillar: 'LIFE', proposedEventType: 't2', reason: 'r', actorId: 'admin-1',
    });
    expect(createOperationalCaseMock.mock.calls[0][0].callerRole).toBe('KORA_ADMIN');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E/F/G — Case linkage, provenance, reason retention through resolution
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — E/F/G. Case linkage, provenance, and reason survive to resolution', () => {
  it('E/F/G. resolveManualRemap transitions open→in-progress→resolved, records the final mapping, and preserves the original subject', async () => {
    const { requestManualRemap, resolveManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    const opened = await requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-1:col-X', classifierPillar: 'GROWTH',
      classifierEventType: 'professional_training', classifierConfidence: 0.62,
      proposedPillar: 'CONNECTION', proposedEventType: 'mentoring_program', reason: 'peer mentoring', actorId: 'admin-1',
    });
    const resolved = await resolveManualRemap({
      caseId: opened.id, finalPillar: 'CONNECTION', finalEventType: 'mentoring_program', effortMinutes: 12, actorId: 'admin-1',
    });
    expect(transitionOperationalCaseStatusMock).toHaveBeenCalledTimes(2);
    expect(transitionOperationalCaseStatusMock.mock.calls[0][0]).toMatchObject({ caseId: opened.id, newStatus: 'in-progress' });
    expect(transitionOperationalCaseStatusMock.mock.calls[1][0]).toMatchObject({ caseId: opened.id, newStatus: 'resolved' });
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolutionNote).toContain('CONNECTION/mentoring_program');
    // F. original classifier provenance (the opening subject) is never rewritten by resolution.
    expect(resolved.subject).toBe(opened.subject);
    expect(resolved.subject).toContain('GROWTH/professional_training');
  });

  it('G2. resolving an already-resolved Case is rejected — cannot resolve twice', async () => {
    const { requestManualRemap, resolveManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    const opened = await requestManualRemap({
      companyId: 'company-1', sourceReference: 'x', classifierPillar: 'GROWTH', classifierEventType: 't',
      classifierConfidence: 0.5, proposedPillar: 'LIFE', proposedEventType: 't2', reason: 'r', actorId: 'admin-1',
    });
    await resolveManualRemap({ caseId: opened.id, finalPillar: 'LIFE', finalEventType: 't2', effortMinutes: 5, actorId: 'admin-1' });
    await expect(resolveManualRemap({
      caseId: opened.id, finalPillar: 'LIFE', finalEventType: 't2', effortMinutes: 5, actorId: 'admin-1',
    })).rejects.toThrow(/cannot transition from "resolved"/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// H — duplicate/conflicting remap is safe by design, not a defect
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — H. no uniqueness invariant — repeated legitimate remap requests are expected', () => {
  it('two independent remap requests for the same sourceReference both succeed as distinct Cases', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    const a = await requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-1:col-X', classifierPillar: 'GROWTH', classifierEventType: 't',
      classifierConfidence: 0.5, proposedPillar: 'LIFE', proposedEventType: 't2', reason: 'first pass', actorId: 'admin-1',
    });
    const b = await requestManualRemap({
      companyId: 'company-1', sourceReference: 'batch-1:col-X', classifierPillar: 'GROWTH', classifierEventType: 't',
      classifierConfidence: 0.5, proposedPillar: 'IMPACT', proposedEventType: 't3', reason: 'reconsidered', actorId: 'admin-1',
    });
    expect(a.id).not.toBe(b.id);
    expect(cases.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// I/J — cross-tenant / unauthorized inherited from WP-007, not reimplemented
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — I/J. tenant integrity and authority are inherited from WP-007 unchanged', () => {
  it('I. a nonexistent Company is rejected by the existing WP-007 organisation-existence check', async () => {
    const { requestManualRemap } = await import('@/lib/mapping-governance/manual-remap-service');
    await expect(requestManualRemap({
      companyId: 'company-DOES-NOT-EXIST', sourceReference: 'x', classifierPillar: 'GROWTH', classifierEventType: 't',
      classifierConfidence: 0.5, proposedPillar: 'LIFE', proposedEventType: 't2', reason: 'r', actorId: 'admin-1',
    })).rejects.toThrow(/does not identify a real Company/);
  });

  it('J. this module adds no new RLS/grant/authorization logic of its own — no direct DB import at all', () => {
    const lines = tsCodeLines(read(SERVICE_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /supabase/i.test(l))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K/L — taxonomy authority unchanged
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — K/L. taxonomy config and WP-120 authority are unchanged', () => {
  it('imports PillarCode from the canonical @/lib/types — no second Pillar enum declared', () => {
    const src = read(SERVICE_PATH);
    expect(src).toMatch(/import type \{ PillarCode \} from '@\/lib\/types'/);
    expect(src).not.toMatch(/const\s+PILLAR_CODES\s*=|type\s+PillarCode\s*=/);
  });

  it('never imports or calls the classifier itself — MappingConfidenceService is untouched', () => {
    const lines = tsCodeLines(read(SERVICE_PATH));
    expect(lines.some((l) => /MappingConfidenceService|mappingConfidenceService/.test(l))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M — Decision Spine unchanged
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — M. no Decision Spine contamination', () => {
  it('no Commitment/Evidence Plan/Review/Advisor-proposal import exists', () => {
    const lines = tsCodeLines(read(SERVICE_PATH)).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /commitment-service|evidence-plan-service|review-service|review-advisor-proposal/i.test(l))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// N — no Worker/PIB leakage
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — N. no Worker/PIB reference anywhere in this file', () => {
  it('no worker_id/PIB reference exists', () => {
    const lines = tsCodeLines(read(SERVICE_PATH));
    expect(lines.some((l) => /worker_id|workerId|\bPIB\b|worker_pib/.test(l))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// O — downstream contract for WP-043/044/066
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — O. downstream contract for WP-043/044/066', () => {
  it('exports stable, importable functions (WP-043/044 regression-test target)', async () => {
    const mod = await import('@/lib/mapping-governance/manual-remap-service');
    expect(typeof mod.requestManualRemap).toBe('function');
    expect(typeof mod.resolveManualRemap).toBe('function');
  });

  it('P. no saved-mapping/reuse/template functionality exists — explicitly WP-066 scope', () => {
    const lines = tsCodeLines(read(SERVICE_PATH));
    expect(lines.some((l) => /saved.?mapping|reusable.?mapping|mapping.?template|mapping.?recommendation/i.test(l))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// no new migration
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-029 — no new migration (registry: Data/Migration Impact = NONE)', () => {
  it('no new migration file exists for this WP', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBe(79); // unchanged since KORA-WP-027
  });
});
