// app/api/advisor/companies/[assignmentId]/cases/route.ts
// KORA-WP-034 — Advisor Tasks & Cases.
//
// GET  — the Advisor's own Cases for this Company Assignment (requires the
//        Assignment to currently be ACTIVE — "Auth/RLS: Assignment-scoped",
//        file 102's own field for this WP).
// POST — create a Case as the Advisor-origin flow, always organisationType
//        'company', scoped to this exact Assignment's Company.
//
// The Advisor's identity is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) — never a request parameter.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { listAdvisorCases, createAdvisorCase } from '@/lib/advisor-portal/advisor-case-service';

function safeErrorResponse(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err);
  const safeReasons = /rejected:/i;
  return NextResponse.json(
    { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : fallback },
    { status: safeReasons.test(msg) ? 422 : 500 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const cases = await listAdvisorCases(assignmentId, identity.id);
    return NextResponse.json({ ok: true, cases });
  } catch (err) {
    console.error('[advisor/companies/cases] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare i Case.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { subject?: string; priority?: string; dueDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.subject?.trim()) {
    return NextResponse.json({ ok: false, error: 'L\'oggetto del Case è obbligatorio.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const record = await createAdvisorCase({
      assignmentId, callerAdvisorId: identity.id, subject: body.subject, priority: body.priority, dueDate: body.dueDate, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, case: record });
  } catch (err) {
    console.error('[advisor/companies/cases] create failed:', err);
    return safeErrorResponse(err, 'Impossibile creare il Case.');
  }
}
