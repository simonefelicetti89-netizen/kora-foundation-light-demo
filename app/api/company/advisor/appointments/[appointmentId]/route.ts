// app/api/company/advisor/appointments/[appointmentId]/route.ts
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage.
//
// POST — a single discriminated action endpoint ({ action: 'cancel' |
// 'reschedule', ... }) rather than proliferating sub-routes for two related
// state transitions on the same resource (Step 27: "only implement those
// required... no generic CRUD").
//
// callerTenantId is always the trusted requireCompanyUser(request).tenantId
// — the appointment service itself re-verifies the Company is genuinely a
// party to the underlying Assignment before allowing any transition.

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { cancelAppointment, rescheduleAppointment } from '@/lib/advisor-portal/advisor-appointment-service';

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
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: same single_provisioning category as the sibling booking
  // route — covers both discriminated actions (cancel/reschedule) under
  // one guard, matching this route's own single-entry-point shape.
  const rateLimitGuard = await assertRateLimit('single_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { action?: string; reason?: string; startsAt?: string; endsAt?: string; subject?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (body.action === 'cancel') {
    if (!body.reason?.trim()) {
      return NextResponse.json({ ok: false, error: 'Il motivo è obbligatorio.' }, { status: 400 });
    }
    try {
      const appointment = await cancelAppointment({ appointmentId, reason: body.reason, callerTenantId: auth.tenantId, actorRole: 'COMPANY_ADMIN', actorId: auth.id });
      return NextResponse.json({ ok: true, appointment });
    } catch (err) {
      console.error('[company/advisor/appointments/:id] cancel failed:', err);
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
        callerTenantId: auth.tenantId, actorRole: 'COMPANY_ADMIN', actorId: auth.id,
      });
      return NextResponse.json({ ok: true, appointment });
    } catch (err) {
      console.error('[company/advisor/appointments/:id] reschedule failed:', err);
      return safeErrorResponse(err, 'Impossibile riprogrammare l’appuntamento.');
    }
  }

  return NextResponse.json({ ok: false, error: 'Azione non riconosciuta.' }, { status: 400 });
}
