/**
 * KORA-WP-036 — Advisor Document/Note Five-Class Taxonomy.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/advisor-portal/advisor-content-service.ts, plus the REAL route
 * handlers, with only the Supabase I/O boundary, the governance substrate,
 * and the assignment-validity evaluator mocked at their public boundary.
 * Same technique as this session's kora-wp-031/033/035 test files.
 *
 * Real-DB proof of RLS/grant/constraint correctness for migration 060 lives
 * in this WP's own real-DB validation (see report 123).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_CLASSES } from '@/lib/advisor-portal/advisor-content-service';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — class vocabulary (doc 73 §14, verbatim)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-036 — five-class vocabulary (doc 73 §14, verbatim)', () => {
  it('exposes exactly the five canonical classes, in order, no sixth value', () => {
    expect(CONTENT_CLASSES).toEqual([
      'ORGANISATION_SHAREABLE_NOTE',
      'ADVISOR_INTERNAL_NOTE',
      'AUDIT_PROVENANCE_RECORD',
      'CONFIDENTIAL_REFERENCE',
      'COMMUNICATION_FOLLOWUP',
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — service: mocked Supabase + governance + validity evaluator
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentRow { id: string; advisor_id: string; company_id: string; }
interface ContentRow {
  id: string; assignment_id: string; class: string; body: string;
  shared: boolean | null; purpose: string | null; created_by_role: string; created_at: string;
}

let assignments: AssignmentRow[] = [];
let contents: ContentRow[] = [];
let idCounter = 0;
let validityResult: { valid: boolean; reasons: string[] } = { valid: true, reasons: [] };

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));
const evaluateValidityMock = vi.fn(async (_assignmentId: string) => validityResult);

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({ data: assignments.find((a) => a.id === val) ?? null, error: null }),
              }),
            }),
          };
        }
        if (schemaName === 'advisor' && table === 'advisor_content_record') {
          return {
            select: () => ({
              eq: (col: string, val: unknown) => makeContentChain({ [col]: val }),
            }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: ContentRow = {
                    id: `content-${++idCounter}`,
                    assignment_id: payload.assignment_id as string,
                    class: payload.class as string,
                    body: payload.body as string,
                    shared: (payload.shared as boolean | undefined) ?? null,
                    purpose: (payload.purpose as string | undefined) ?? null,
                    created_by_role: payload.created_by_role as string,
                    created_at: '2026-09-13T00:00:00.000Z',
                  };
                  contents.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
          };
        }
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

function makeContentChain(filters: Record<string, unknown>) {
  const matches = () => contents.filter((c) => Object.entries(filters).every(([k, v]) => (c as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) { return makeContentChain({ ...filters, [col]: val }); },
    order: async () => ({ data: matches(), error: null }),
  };
}

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

vi.mock('@/lib/advisor-assignment/advisor-assignment-service', () => ({
  evaluateAdvisorAssignmentValidity: (assignmentId: string) => evaluateValidityMock(assignmentId),
}));

function seedAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  const row: AssignmentRow = { id: overrides.id ?? 'assign-1', advisor_id: overrides.advisor_id ?? 'adv-1', company_id: overrides.company_id ?? 'company-1' };
  assignments.push(row);
  return row;
}

beforeEach(() => {
  assignments = []; contents = []; idCounter = 0;
  validityResult = { valid: true, reasons: [] };
  recordGovernanceEventMock.mockClear();
  evaluateValidityMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

describe('KORA-WP-036 — createAdvisorContent: Advisor-only, classes 1/2/4/5, requires valid Assignment', () => {
  it('creates an ORGANISATION_SHAREABLE_NOTE (Class 1)', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    const rec = await createAdvisorContent({ assignmentId: 'assign-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'Nota condivisa', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(rec.class).toBe('ORGANISATION_SHAREABLE_NOTE');
    expect(rec.createdByRole).toBe('ADVISOR');
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
  });

  it('creates an ADVISOR_INTERNAL_NOTE (Class 2)', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    const rec = await createAdvisorContent({ assignmentId: 'assign-1', class: 'ADVISOR_INTERNAL_NOTE', body: 'Nota interna', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(rec.class).toBe('ADVISOR_INTERNAL_NOTE');
    expect(rec.shared).toBeNull();
    expect(rec.purpose).toBeNull();
  });

  it('rejects AUDIT_PROVENANCE_RECORD (Class 3) through the Advisor path', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'assign-1', class: 'AUDIT_PROVENANCE_RECORD', body: 'x', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/cannot be created by an Advisor/);
    expect(contents.length).toBe(0);
  });

  it('creates a CONFIDENTIAL_REFERENCE (Class 4) with a purpose', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    const rec = await createAdvisorContent({ assignmentId: 'assign-1', class: 'CONFIDENTIAL_REFERENCE', body: 'Documento riservato', purpose: 'Certificazione Partner', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(rec.purpose).toBe('Certificazione Partner');
    expect(rec.shared).toBeNull();
  });

  it('rejects a CONFIDENTIAL_REFERENCE without a purpose', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'assign-1', class: 'CONFIDENTIAL_REFERENCE', body: 'x', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/purpose is required/);
    expect(contents.length).toBe(0);
  });

  it('creates a COMMUNICATION_FOLLOWUP (Class 5) with shared=true', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    const rec = await createAdvisorContent({ assignmentId: 'assign-1', class: 'COMMUNICATION_FOLLOWUP', body: 'Verbale chiamata', shared: true, callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(rec.shared).toBe(true);
  });

  it('creates a COMMUNICATION_FOLLOWUP (Class 5) with shared=false', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    const rec = await createAdvisorContent({ assignmentId: 'assign-1', class: 'COMMUNICATION_FOLLOWUP', body: 'Verbale interno', shared: false, callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(rec.shared).toBe(false);
  });

  it('rejects a COMMUNICATION_FOLLOWUP without an explicit shared value', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'assign-1', class: 'COMMUNICATION_FOLLOWUP', body: 'x', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/shared \(true\/false\) is required/);
  });

  it('rejects an empty body', async () => {
    seedAssignment();
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'assign-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: '   ', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/body is required/);
  });

  it('rejects an Advisor who is not the party to the Assignment', async () => {
    seedAssignment({ advisor_id: 'adv-1' });
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'assign-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'x', callerAdvisorId: 'adv-2', actorId: 'u1' }))
      .rejects.toThrow(/not the Advisor party/);
  });

  it('rejects content on a nonexistent assignment', async () => {
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'no-such', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'x', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/not the Advisor party/);
  });

  it('rejects content when the Assignment is not currently valid', async () => {
    seedAssignment();
    validityResult = { valid: false, reasons: ['prerequisite_eligibility_not_present'] };
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAdvisorContent({ assignmentId: 'assign-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'x', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/not currently valid/);
    expect(contents.length).toBe(0);
  });
});

describe('KORA-WP-036 — createAuditProvenanceRecord: KORA_ADMIN-only, Class 3, not gated on validity', () => {
  it('creates an audit/provenance record even when the Assignment is invalid', async () => {
    seedAssignment();
    validityResult = { valid: false, reasons: ['role_qualification_not_active'] };
    const { createAuditProvenanceRecord } = await import('@/lib/advisor-portal/advisor-content-service');
    const rec = await createAuditProvenanceRecord({ assignmentId: 'assign-1', body: 'Esito audit certificazione registrato il 2026-09-13', actorId: 'admin-1' });
    expect(rec.class).toBe('AUDIT_PROVENANCE_RECORD');
    expect(rec.createdByRole).toBe('KORA_ADMIN');
    expect(evaluateValidityMock).not.toHaveBeenCalled();
  });

  it('rejects an empty body', async () => {
    seedAssignment();
    const { createAuditProvenanceRecord } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAuditProvenanceRecord({ assignmentId: 'assign-1', body: '  ', actorId: 'admin-1' })).rejects.toThrow(/body is required/);
  });

  it('rejects a nonexistent assignment', async () => {
    const { createAuditProvenanceRecord } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(createAuditProvenanceRecord({ assignmentId: 'no-such', body: 'x', actorId: 'admin-1' })).rejects.toThrow(/no such Assignment/);
  });
});

describe('KORA-WP-036 — listContentForCompany: Class 1 + shared Class 5 only, never leaks 2/3/4/unshared-5', () => {
  async function seedAll() {
    seedAssignment();
    const { createAdvisorContent, createAuditProvenanceRecord } = await import('@/lib/advisor-portal/advisor-content-service');
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'shareable', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'ADVISOR_INTERNAL_NOTE', body: 'internal', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'CONFIDENTIAL_REFERENCE', body: 'confidential', purpose: 'p', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'COMMUNICATION_FOLLOWUP', body: 'shared call', shared: true, callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'COMMUNICATION_FOLLOWUP', body: 'internal call', shared: false, callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAuditProvenanceRecord({ assignmentId: 'assign-1', body: 'audit', actorId: 'admin-1' });
  }

  it('returns exactly Class 1 and shared Class 5 — nothing else, from a 6-record set', async () => {
    await seedAll();
    const { listContentForCompany } = await import('@/lib/advisor-portal/advisor-content-service');
    const list = await listContentForCompany('company-1', 'assign-1');
    expect(list.length).toBe(2);
    expect(list.map((r) => r.body).sort()).toEqual(['shareable', 'shared call']);
    expect(list.some((r) => r.class === 'ADVISOR_INTERNAL_NOTE')).toBe(false);
    expect(list.some((r) => r.class === 'CONFIDENTIAL_REFERENCE')).toBe(false);
    expect(list.some((r) => r.class === 'AUDIT_PROVENANCE_RECORD')).toBe(false);
    expect(list.some((r) => r.body === 'internal call')).toBe(false);
  });

  it('rejects a Company that is not the party to the Assignment (cross-tenant leakage = 0)', async () => {
    await seedAll();
    const { listContentForCompany } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(listContentForCompany('company-2', 'assign-1')).rejects.toThrow(/not the Company party/);
  });
});

describe('KORA-WP-036 — listContentForAdvisor: classes 1/2/4/5, never Class 3', () => {
  async function seedAll() {
    seedAssignment();
    const { createAdvisorContent, createAuditProvenanceRecord } = await import('@/lib/advisor-portal/advisor-content-service');
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'shareable', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAdvisorContent({ assignmentId: 'assign-1', class: 'ADVISOR_INTERNAL_NOTE', body: 'internal', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAuditProvenanceRecord({ assignmentId: 'assign-1', body: 'audit', actorId: 'admin-1' });
  }

  it('returns Classes 1/2 but never Class 3, for the assigned Advisor', async () => {
    await seedAll();
    const { listContentForAdvisor } = await import('@/lib/advisor-portal/advisor-content-service');
    const list = await listContentForAdvisor('adv-1', 'assign-1');
    expect(list.length).toBe(2);
    expect(list.some((r) => r.class === 'AUDIT_PROVENANCE_RECORD')).toBe(false);
  });

  it('rejects an unrelated Advisor (not a party)', async () => {
    await seedAll();
    const { listContentForAdvisor } = await import('@/lib/advisor-portal/advisor-content-service');
    await expect(listContentForAdvisor('adv-2', 'assign-1')).rejects.toThrow(/not the Advisor party/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — route boundary
// ═══════════════════════════════════════════════════════════════════════════

const mockRequireCompanyUser = vi.fn();
const mockRequireAdvisorUser = vi.fn();
const mockGetAdvisorIdentity = vi.fn();
const mockGetCompanyAssignedAdvisor = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: (...args: unknown[]) => mockRequireCompanyUser(...args),
  requireAdvisorUser: (...args: unknown[]) => mockRequireAdvisorUser(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

vi.mock('@/lib/advisor-identity/advisor-identity-service', () => ({
  getAdvisorIdentityByAuthUserId: (...args: unknown[]) => mockGetAdvisorIdentity(...args),
}));

vi.mock('@/lib/advisor-portal/advisor-portal-service', () => ({
  getCompanyAssignedAdvisor: (...args: unknown[]) => mockGetCompanyAssignedAdvisor(...args),
}));

// Routes call the REAL advisor-content-service, which in turn hits the
// mocked Supabase/governance/validity boundary already set up in Part 2 —
// same technique as kora-wp-035's route tests. No mock of the module under
// test itself: that would silently short-circuit Part 2's behavioral tests
// too, since vi.mock hoists file-wide.

describe('KORA-WP-036 — GET /api/company/advisor/content', () => {
  beforeEach(() => {
    mockRequireCompanyUser.mockReset(); mockGetCompanyAssignedAdvisor.mockReset();
  });

  it('returns the auth error unchanged when not COMPANY_ADMIN', async () => {
    mockRequireCompanyUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/company/advisor/content/route');
    const res = await GET(new NextRequest('http://localhost/x'));
    expect(res.status).toBe(403);
  });

  it('returns empty content when no Advisor is assigned (no error)', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    mockGetCompanyAssignedAdvisor.mockResolvedValue(null);
    const { GET } = await import('@/app/api/company/advisor/content/route');
    const res = await GET(new NextRequest('http://localhost/x'));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.content).toEqual([]);
  });

  it('returns the Company-visible content when an Advisor is assigned', async () => {
    seedAssignment({ id: 'assign-route-1', company_id: 'company-1' });
    const { createAdvisorContent } = await import('@/lib/advisor-portal/advisor-content-service');
    await createAdvisorContent({ assignmentId: 'assign-route-1', class: 'ORGANISATION_SHAREABLE_NOTE', body: 'shareable', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createAdvisorContent({ assignmentId: 'assign-route-1', class: 'ADVISOR_INTERNAL_NOTE', body: 'internal', callerAdvisorId: 'adv-1', actorId: 'u1' });

    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    mockGetCompanyAssignedAdvisor.mockResolvedValue({ assignmentId: 'assign-route-1' });
    const { GET } = await import('@/app/api/company/advisor/content/route');
    const res = await GET(new NextRequest('http://localhost/x'));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.content.length).toBe(1);
    expect(json.content[0].class).toBe('ORGANISATION_SHAREABLE_NOTE');
  });
});

describe('KORA-WP-036 — GET/POST /api/advisor/companies/[assignmentId]/content', () => {
  beforeEach(() => {
    mockRequireAdvisorUser.mockReset(); mockGetAdvisorIdentity.mockReset();
  });

  it('GET returns the auth error unchanged when not ADVISOR', async () => {
    mockRequireAdvisorUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/content/route');
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('GET rejects with 403 when no Advisor profile is resolved', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue(null);
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/content/route');
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('POST rejects an unrecognized class with 400', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/content/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ class: 'RANDOM_CLASS', body: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(400);
  });

  it('POST rejects a missing body with 400', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/content/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ class: 'ORGANISATION_SHAREABLE_NOTE' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(400);
  });

  it('POST rejects AUDIT_PROVENANCE_RECORD from the Advisor route with 422 (structurally not a creatable class here)', async () => {
    // AUDIT_PROVENANCE_RECORD is a valid CONTENT_CLASSES member so route-level
    // vocabulary check passes it through; the real service itself rejects it.
    seedAssignment({ id: 'assign-route-2', advisor_id: 'adv-1' });
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/content/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ class: 'AUDIT_PROVENANCE_RECORD', body: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-route-2' }) });
    expect(res.status).toBe(422);
  });

  it('POST creates a record on success', async () => {
    seedAssignment({ id: 'assign-route-3', advisor_id: 'adv-1' });
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/content/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ class: 'ORGANISATION_SHAREABLE_NOTE', body: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-route-3' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-036 — scope integrity: no generic document management, no file storage, no WP-034/038/064', () => {
  const wp036ExclusiveFiles = [
    'lib/advisor-portal/advisor-content-service.ts',
    'app/api/company/advisor/content/route.ts',
    'app/api/advisor/companies/[assignmentId]/content/route.ts',
  ].map((p) => readFileSync(join(process.cwd(), p), 'utf8'));
  const wp036ExclusiveSrc = wp036ExclusiveFiles.join('\n');
  const wp036Exclusive = wp036ExclusiveSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

  it('no file/blob storage primitive (URL, bucket, checksum, MIME type, file size)', () => {
    expect(wp036Exclusive).not.toMatch(/fileUrl|file_url|bucket|checksum|mimeType|mime_type|fileSize|file_size|s3\.|blob\.upload/i);
  });

  it('no generic document-management concept (folder, tag, versioning, sharing link)', () => {
    expect(wp036Exclusive).not.toMatch(/folder|documentTag|versionHistory|shareLink|share_link/i);
  });

  it('no linear sensitivity-ladder ranking (level1..level5, sensitivityScore, rank)', () => {
    expect(wp036Exclusive).not.toMatch(/sensitivityLevel|sensitivityScore|sensitivityRank/i);
  });

  it('no WP-034 concept (no Commitment/EvidencePlan reference table)', () => {
    expect(wp036Exclusive).not.toMatch(/commitment_id|evidence_plan|evidencePlanLineage/i);
  });

  it('no WP-038 concept (no Review/Case object)', () => {
    expect(wp036Exclusive).not.toMatch(/\breview_id\b|\bcase_id\b|caseRecord/i);
  });

  it('no WP-064 concept (no Certification workflow engine)', () => {
    expect(wp036Exclusive).not.toMatch(/certificationWorkflow|certification_workflow/i);
  });

  it('does not invent a 15th governed-action category', () => {
    const catalogSrc = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    const categoryLines = catalogSrc.match(/^\s*'[A-Z_]+',/gm) ?? [];
    expect(categoryLines.length).toBe(14);
    expect(wp036Exclusive).not.toMatch(/GOVERNED_ACTION_CATEGORIES\.push/);
  });

  it('migration 060 does not modify migrations 001–059', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/060_advisor_content_taxonomy.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(migSql).not.toMatch(/ALTER TABLE advisor\.advisor_identity|ALTER TABLE advisor\.advisor_role_qualification|ALTER TABLE advisor\.advisor_assignment|ALTER TABLE advisor\.advisor_prerequisite_eligibility|ALTER TABLE advisor\.advisor_contact_message|ALTER TABLE advisor\.advisor_appointment/);
  });

  it('migration 060 grants no UPDATE and no DELETE on advisor_content_record (append-only, no silent rewrite)', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/060_advisor_content_taxonomy.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    const grantLines = migSql.split('\n').filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.length).toBeGreaterThan(0);
    for (const line of grantLines) {
      expect(line).not.toMatch(/UPDATE|DELETE/i);
    }
  });

  it('migration 060 defines exactly the five canonical class tokens, no sixth', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/060_advisor_content_taxonomy.sql'), 'utf8');
    const checkMatch = migSrc.match(/CHECK \(class IN \(([\s\S]*?)\)\)/);
    expect(checkMatch).not.toBeNull();
    const tokens = (checkMatch?.[1] ?? '').match(/'[A-Z_]+'/g) ?? [];
    expect(tokens).toEqual([
      "'ORGANISATION_SHAREABLE_NOTE'",
      "'ADVISOR_INTERNAL_NOTE'",
      "'AUDIT_PROVENANCE_RECORD'",
      "'CONFIDENTIAL_REFERENCE'",
      "'COMMUNICATION_FOLLOWUP'",
    ]);
  });
});
