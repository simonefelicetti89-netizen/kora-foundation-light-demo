// app/api/advisor/companies/[assignmentId]/appointments/route.ts
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage.
//
// GET — the appointment lineage for one of the Advisor's own Assignments.
// The Advisor's identity is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) and passed as callerAdvisorId —
// the appointment service's own caller-must-be-a-party check then rejects
// any assignmentId that does not actually belong to this Advisor
// (KORA-WP-033's own multi-Company isolation discipline, reused unchanged).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { listAppointmentsForAssignment } from '@/lib/advisor-portal/advisor-appointment-service';

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

    const appointments = await listAppointmentsForAssignment({ assignmentId, callerAdvisorId: identity.id });
    return NextResponse.json({ ok: true, appointments });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[advisor/companies/appointments] read failed:', msg);
    const safeReasons = /rejected:/i;
    return NextResponse.json(
      { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : 'Impossibile recuperare gli appuntamenti.' },
      { status: safeReasons.test(msg) ? 403 : 500 },
    );
  }
}
