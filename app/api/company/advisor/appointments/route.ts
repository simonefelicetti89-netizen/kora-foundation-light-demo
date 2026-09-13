// app/api/company/advisor/appointments/route.ts
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage.
//
// GET  — the appointment lineage for the Company's own assigned Advisor.
// POST — Company-initiated booking (doc 73 §13: "A Call is created by a
//        Company/Partner-initiated booking").
//
// tenantId is always the trusted requireCompanyUser(request).tenantId —
// never a request parameter.

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getCompanyAssignedAdvisor, getCompanyAssignmentForHistoricalRead } from '@/lib/advisor-portal/advisor-portal-service';
import { createAppointment, listAppointmentsForAssignment } from '@/lib/advisor-portal/advisor-appointment-service';

function safeErrorResponse(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err);
  const safeReasons = /rejected:/i;
  return NextResponse.json(
    { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : fallback },
    { status: safeReasons.test(msg) ? 422 : 500 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    // Founder Decision 4: read via the historical resolver (any status) —
    // retention ≠ operational access. New bookings still use the
    // active-only resolver below.
    const historical = await getCompanyAssignmentForHistoricalRead(auth.tenantId);
    if (!historical) {
      return NextResponse.json({ ok: true, appointments: [] });
    }
    const appointments = await listAppointmentsForAssignment({ assignmentId: historical.assignmentId, callerTenantId: auth.tenantId });
    return NextResponse.json({ ok: true, appointments });
  } catch (err) {
    console.error('[company/advisor/appointments] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare gli appuntamenti.');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { startsAt?: string; endsAt?: string; subject?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.startsAt || !body.endsAt || !body.subject?.trim()) {
    return NextResponse.json({ ok: false, error: 'Data di inizio, fine e oggetto sono obbligatori.' }, { status: 400 });
  }

  try {
    const advisor = await getCompanyAssignedAdvisor(auth.tenantId);
    if (!advisor) {
      return NextResponse.json({ ok: false, error: 'Nessun Advisor assegnato.' }, { status: 422 });
    }

    const appointment = await createAppointment({
      assignmentId: advisor.assignmentId, startsAt: body.startsAt, endsAt: body.endsAt, subject: body.subject,
      callerTenantId: auth.tenantId, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, appointment });
  } catch (err) {
    console.error('[company/advisor/appointments] create failed:', err);
    return safeErrorResponse(err, 'Impossibile creare la richiesta di appuntamento.');
  }
}
