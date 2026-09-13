// app/api/advisor/cases/[caseId]/route.ts
// KORA-WP-007 — Operational Case Primitive.
//
// POST — status transition on a Case the Advisor owns. No reassignment
// here (KORA_ADMIN-only, see app/api/admin/cases/[caseId]/route.ts).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { transitionOperationalCaseStatus, CASE_STATUSES, type CaseStatus } from '@/lib/operations/operational-case-service';

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
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

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

    const record = await transitionOperationalCaseStatus({
      caseId, newStatus: body.status as CaseStatus, resolutionNote: body.resolutionNote,
      callerRole: 'ADVISOR', callerAdvisorId: identity.id, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, case: record });
  } catch (err) {
    console.error('[advisor/cases/:id] transition failed:', err);
    return safeErrorResponse(err, 'Impossibile aggiornare lo stato del Case.');
  }
}
