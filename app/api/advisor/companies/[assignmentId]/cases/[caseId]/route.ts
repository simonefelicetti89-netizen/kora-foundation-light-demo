// app/api/advisor/companies/[assignmentId]/cases/[caseId]/route.ts
// KORA-WP-034 — Advisor Tasks & Cases.
//
// POST — canonical lifecycle transition on a Case owned by this Advisor,
// scoped to this exact Assignment's Company. Delegates to WP-007's own
// transition guard (CASE_ALLOWED_TRANSITIONS) — never reimplemented here.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { transitionAdvisorCase } from '@/lib/advisor-portal/advisor-case-service';
import { CASE_STATUSES, type CaseStatus } from '@/lib/operations/operational-case-service';

function safeErrorResponse(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err);
  const safeReasons = /rejected:/i;
  return NextResponse.json(
    { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : fallback },
    { status: safeReasons.test(msg) ? 422 : 500 },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; caseId: string }> },
) {
  const { assignmentId, caseId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: same single_provisioning category as the sibling Case
  // creation route.
  const rateLimitGuard = await assertRateLimit('single_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { status?: string; resolutionNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.status || !CASE_STATUSES.includes(body.status as CaseStatus)) {
    return NextResponse.json({ ok: false, error: 'Stato non valido.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const record = await transitionAdvisorCase({
      assignmentId, caseId, callerAdvisorId: identity.id, newStatus: body.status as CaseStatus, resolutionNote: body.resolutionNote, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, case: record });
  } catch (err) {
    console.error('[advisor/companies/cases/:id] transition failed:', err);
    return safeErrorResponse(err, 'Impossibile aggiornare lo stato del Case.');
  }
}
