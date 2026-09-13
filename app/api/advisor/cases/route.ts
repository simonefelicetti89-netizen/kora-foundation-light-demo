// app/api/advisor/cases/route.ts
// KORA-WP-007 — Operational Case Primitive.
//
// GET  — the Advisor's own Cases (owning_advisor_id = caller, resolved
//        server-side via getAdvisorIdentityByAuthUserId, never a request
//        parameter).
// POST — create a Case as the Advisor-origin flow (Acceptance's first of
//        two required flows).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { createOperationalCase, listOperationalCases, CASE_ORGANISATION_TYPES, CASE_LINKED_OBJECT_TYPES, type CaseOrganisationType, type CaseLinkedObjectType } from '@/lib/operations/operational-case-service';

function safeErrorResponse(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err);
  const safeReasons = /rejected:/i;
  return NextResponse.json(
    { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : fallback },
    { status: safeReasons.test(msg) ? 422 : 500 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }
    const cases = await listOperationalCases({ callerRole: 'ADVISOR', callerAdvisorId: identity.id });
    return NextResponse.json({ ok: true, cases });
  } catch (err) {
    console.error('[advisor/cases] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare i Case.');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { organisationType?: string; organisationId?: string; linkedObjectType?: string; linkedObjectId?: string; subject?: string; priority?: string; dueDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.organisationType || !CASE_ORGANISATION_TYPES.includes(body.organisationType as CaseOrganisationType)) {
    return NextResponse.json({ ok: false, error: 'Tipo di organizzazione non valido.' }, { status: 400 });
  }
  if (!body.subject?.trim()) {
    return NextResponse.json({ ok: false, error: 'L\'oggetto del Case è obbligatorio.' }, { status: 400 });
  }
  if (body.linkedObjectType && !CASE_LINKED_OBJECT_TYPES.includes(body.linkedObjectType as CaseLinkedObjectType)) {
    return NextResponse.json({ ok: false, error: 'Tipo di oggetto collegato non valido.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const record = await createOperationalCase({
      organisationType: body.organisationType as CaseOrganisationType,
      organisationId: body.organisationId,
      linkedObjectType: body.linkedObjectType as CaseLinkedObjectType | undefined,
      linkedObjectId: body.linkedObjectId,
      subject: body.subject,
      priority: body.priority,
      dueDate: body.dueDate,
      callerRole: 'ADVISOR',
      callerAdvisorId: identity.id,
      actorId: auth.id,
    });

    return NextResponse.json({ ok: true, case: record });
  } catch (err) {
    console.error('[advisor/cases] create failed:', err);
    return safeErrorResponse(err, 'Impossibile creare il Case.');
  }
}
