// app/api/admin/cases/route.ts
// KORA-WP-007 — Operational Case Primitive.
//
// GET  — every Case (KORA_ADMIN sees all origins — this is the "one
//        interface" through which both an Advisor-origin and an
//        Admin-origin Case are queryable, per this WP's own Acceptance).
// POST — create a Case as the Admin-origin flow (Acceptance's second of
//        two required flows). organisationType may be 'company', 'partner',
//        or 'admin' (organisation-less internal Case).

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
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
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const cases = await listOperationalCases({ callerRole: 'KORA_ADMIN' });
    return NextResponse.json({ ok: true, cases });
  } catch (err) {
    console.error('[admin/cases] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare i Case.');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: Case creation as an authenticated KORA_ADMIN actor —
  // costly_admin_operation matches every other admin-side create/mutate
  // route already protected under this category.
  const rateLimitGuard = await assertRateLimit('costly_admin_operation', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

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
    const record = await createOperationalCase({
      organisationType: body.organisationType as CaseOrganisationType,
      organisationId: body.organisationId,
      linkedObjectType: body.linkedObjectType as CaseLinkedObjectType | undefined,
      linkedObjectId: body.linkedObjectId,
      subject: body.subject,
      priority: body.priority,
      dueDate: body.dueDate,
      callerRole: 'KORA_ADMIN',
      actorId: auth.id,
    });

    return NextResponse.json({ ok: true, case: record });
  } catch (err) {
    console.error('[admin/cases] create failed:', err);
    return safeErrorResponse(err, 'Impossibile creare il Case.');
  }
}
