// app/api/company/advisor/route.ts
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
//
// GET  — the Company's assigned Advisor (minimal, field-minimized projection)
//        plus the contact/message thread for that Assignment.
// POST — send a contact/message to the assigned Advisor (Step 29: Company
//        has no mutation authority over Advisor identity/qualification/
//        assignment — only this one, canonical, low-stakes action).
//
// tenantId is always the trusted requireCompanyUser(request).tenantId —
// never a request parameter (KORA-WP-018's own established convention).

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { getCompanyAssignedAdvisor, getCompanyAssignmentForHistoricalRead, sendContactMessage, listContactMessages } from '@/lib/advisor-portal/advisor-portal-service';

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    // Founder Decision 4: history is read via the historical resolver (any
    // status), never the active-only one — retention ≠ operational access.
    const historical = await getCompanyAssignmentForHistoricalRead(auth.tenantId);
    if (!historical) {
      return NextResponse.json({ ok: true, advisor: null, messages: [] });
    }

    // The Company-facing "current Advisor" card must still require an
    // active Assignment — a former Advisor is never shown as current.
    const currentAdvisor = historical.status === 'active' ? await getCompanyAssignedAdvisor(auth.tenantId) : null;

    const messages = await listContactMessages({ assignmentId: historical.assignmentId, callerTenantId: auth.tenantId });

    return NextResponse.json({ ok: true, advisor: currentAdvisor, advisorHistory: { fullName: historical.fullName, status: historical.status }, messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[company/advisor] read failed:', msg);
    return NextResponse.json({ ok: false, error: 'Impossibile recuperare il tuo Advisor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: self-service Company-scoped message send — same
  // single_provisioning category as its Advisor-side counterpart.
  const rateLimitGuard = await assertRateLimit('single_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const messageBody = body.body?.trim();
  if (!messageBody) {
    return NextResponse.json({ ok: false, error: 'Il messaggio non può essere vuoto.' }, { status: 400 });
  }

  try {
    const advisor = await getCompanyAssignedAdvisor(auth.tenantId);
    if (!advisor) {
      return NextResponse.json({ ok: false, error: 'Nessun Advisor assegnato.' }, { status: 422 });
    }

    const message = await sendContactMessage({
      assignmentId: advisor.assignmentId,
      senderRole: 'COMPANY_ADMIN',
      body: messageBody,
      callerTenantId: auth.tenantId,
    });

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[company/advisor] send failed:', msg);
    const safeReasons = /rejected:/i;
    return NextResponse.json(
      { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : 'Impossibile inviare il messaggio.' },
      { status: safeReasons.test(msg) ? 422 : 500 },
    );
  }
}
