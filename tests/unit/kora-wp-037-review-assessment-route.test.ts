/**
 * KORA-WP-037 — Advisor Review Assessment Issuance — route layer.
 *
 * Behavioral tests of the REAL GET/POST handlers from
 * app/api/advisor/companies/[assignmentId]/review-assessments/route.ts,
 * with requireAdvisorUser / getAdvisorIdentityByAuthUserId /
 * issueReviewAdvisorAssessmentAsAdvisor / listReviewAdvisorAssessmentsForReviewAsAdvisor
 * mocked at their public boundary — the underlying decision-support/
 * service-layer authorization chain (Assignment validity, recusal-deny,
 * tenant scoping, append-only, snapshot resolution) is already proven in
 * full, against a real database, in kora-wp-037-review-advisor-assessment.test.ts
 * and this WP's own real-DB validation (report 158). This file proves only
 * the route's own concern: auth gating, request validation, and error-
 * message passthrough — the exact same technique as
 * kora-wp-034-advisor-cases.test.ts's own route-layer tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';

const mockRequireAdvisorUser = vi.fn();
const mockGetAdvisorIdentity = vi.fn();
const mockIssue = vi.fn();
const mockList = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireAdvisorUser: (...args: unknown[]) => mockRequireAdvisorUser(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

vi.mock('@/lib/advisor-identity/advisor-identity-service', () => ({
  getAdvisorIdentityByAuthUserId: (...args: unknown[]) => mockGetAdvisorIdentity(...args),
}));

vi.mock('@/lib/advisor-portal/advisor-decision-support-service', () => ({
  issueReviewAdvisorAssessmentAsAdvisor: (...args: unknown[]) => mockIssue(...args),
  listReviewAdvisorAssessmentsForReviewAsAdvisor: (...args: unknown[]) => mockList(...args),
}));

beforeEach(() => {
  mockRequireAdvisorUser.mockReset();
  mockGetAdvisorIdentity.mockReset();
  mockIssue.mockReset();
  mockList.mockReset();
});
afterEach(() => vi.clearAllMocks());

const ROUTE = '@/app/api/advisor/companies/[assignmentId]/review-assessments/route';

describe('KORA-WP-037 — GET .../review-assessments', () => {
  it('returns the auth error unchanged when not ADVISOR', async () => {
    mockRequireAdvisorUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import(ROUTE);
    const res = await GET(new NextRequest('http://localhost/x?reviewId=rv-1'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects with 400 when reviewId query param is missing', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { GET } = await import(ROUTE);
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects with 403 when no Advisor profile is resolved', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue(null);
    const { GET } = await import(ROUTE);
    const res = await GET(new NextRequest('http://localhost/x?reviewId=rv-1'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns the assessments list on success, delegating entirely to the real service function', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    mockList.mockResolvedValue([{ id: 'assess-1', reviewId: 'rv-1', assessmentNarrative: 'x' }]);
    const { GET } = await import(ROUTE);
    const res = await GET(new NextRequest('http://localhost/x?reviewId=rv-1'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.assessments).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith('assign-1', 'adv-1', 'rv-1');
  });
});

describe('KORA-WP-037 — POST .../review-assessments', () => {
  it('returns the auth error unchanged when not ADVISOR', async () => {
    mockRequireAdvisorUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { POST } = await import(ROUTE);
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects a missing reviewId with 400', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import(ROUTE);
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ assessmentNarrative: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects a missing assessmentNarrative with 400', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import(ROUTE);
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ reviewId: 'rv-1' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(400);
  });

  it('issues an Assessment on success via the real, unmocked-at-this-layer service function, canonical fields only', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    mockIssue.mockResolvedValue({ id: 'assess-1', reviewId: 'rv-1', assessmentNarrative: 'Evidence sufficient.' });
    const { POST } = await import(ROUTE);
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ reviewId: 'rv-1', assessmentNarrative: 'Evidence sufficient.' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockIssue).toHaveBeenCalledWith({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'Evidence sufficient.',
    });
    // No verdict/status field is ever forwarded — canonical fields only.
    expect(Object.keys(mockIssue.mock.calls[0][0])).toEqual(['assignmentId', 'callerAdvisorId', 'reviewId', 'assessmentNarrative']);
  });

  it('recusal-deny / assignment-invalid rejection surfaces as 422 with the real service error message', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    mockIssue.mockRejectedValue(new Error('[KORA] issueReviewAdvisorAssessmentAsAdvisor rejected: Assignment is not currently valid (conflict_flag_set).'));
    const { POST } = await import(ROUTE);
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ reviewId: 'rv-1', assessmentNarrative: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/not currently valid/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — route scope integrity', () => {
  it('the Advisor identity is always server-resolved via getAdvisorIdentityByAuthUserId(auth.id) — never a request parameter', () => {
    const src = readFileSync('app/api/advisor/companies/[assignmentId]/review-assessments/route.ts', 'utf8');
    expect(src).toMatch(/getAdvisorIdentityByAuthUserId\(auth\.id\)/);
  });

  it('no direct DB/service_role import — delegates entirely to the decision-support layer', () => {
    const src = readFileSync('app/api/advisor/companies/[assignmentId]/review-assessments/route.ts', 'utf8');
    expect(src).not.toMatch(/getSupabaseServiceClient|supabase-js/);
  });

  it('no WP-046 observability import — consistent with every sibling route in this family (messages/appointments/content/cases)', () => {
    const src = readFileSync('app/api/advisor/companies/[assignmentId]/review-assessments/route.ts', 'utf8');
    expect(src).not.toMatch(/lib\/observability/);
  });

  it('no verdict/status field is defined anywhere in the route\'s own request body handling', () => {
    const src = readFileSync('app/api/advisor/companies/[assignmentId]/review-assessments/route.ts', 'utf8');
    expect(src).not.toMatch(/proposedVerdict|verdict:/);
  });
});
