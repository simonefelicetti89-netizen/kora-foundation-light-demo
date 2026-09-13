// app/api/advisor/companies/[assignmentId]/appointments/[appointmentId]/route.ts
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage.
//
// POST — a single discriminated action endpoint ({ action: 'confirm' |
// 'cancel' | 'reschedule', ... }). `assignmentId` in the path is not itself
// trusted for authorization — the appointment service re-derives the real
// Assignment from the appointment row and checks the caller's own
// server-resolved advisorId is genuinely its Advisor party.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { confirmAppointment, cancelAppointment, rescheduleAppointment } from '@/lib/advisor-portal/advisor-appointment-service';

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
  { params }: { params: Promise<{ assignmentId: string; appointmentId: string }> },
) {
  const { appointmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { action?: string; reason?: string; startsAt?: string; endsAt?: string; subject?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const identity = await getAdvisorIdentityByAuthUserId(auth.id);
  if (!identity) {
    return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
  }

  if (body.action === 'confirm') {
    try {
      const appointment = await confirmAppointment({ appointmentId, callerAdvisorId: identity.id, actorId: auth.id });
      return NextResponse.json({ ok: true, appointment });
    } catch (err) {
      console.error('[advisor/.../appointments/:id] confirm failed:', err);
      return safeErrorResponse(err, 'Impossibile confermare l’appuntamento.');
    }
  }

  if (body.action === 'cancel') {
    if (!body.reason?.trim()) {
      return NextResponse.json({ ok: false, error: 'Il motivo è obbligatorio.' }, { status: 400 });
    }
    try {
      const appointment = await cancelAppointment({ appointmentId, reason: body.reason, callerAdvisorId: identity.id, actorRole: 'ADVISOR', actorId: auth.id });
      return NextResponse.json({ ok: true, appointment });
    } catch (err) {
      console.error('[advisor/.../appointments/:id] cancel failed:', err);
      return safeErrorResponse(err, 'Impossibile annullare l’appuntamento.');
    }
  }

  if (body.action === 'reschedule') {
    if (!body.reason?.trim() || !body.startsAt || !body.endsAt) {
      return NextResponse.json({ ok: false, error: 'Motivo, nuova data di inizio e fine sono obbligatori.' }, { status: 400 });
    }
    try {
      const appointment = await rescheduleAppointment({
        appointmentId, reason: body.reason, newStartsAt: body.startsAt, newEndsAt: body.endsAt, newSubject: body.subject,
        callerAdvisorId: identity.id, actorRole: 'ADVISOR', actorId: auth.id,
      });
      return NextResponse.json({ ok: true, appointment });
    } catch (err) {
      console.error('[advisor/.../appointments/:id] reschedule failed:', err);
      return safeErrorResponse(err, 'Impossibile riprogrammare l’appuntamento.');
    }
  }

  return NextResponse.json({ ok: false, error: 'Azione non riconosciuta.' }, { status: 400 });
}
