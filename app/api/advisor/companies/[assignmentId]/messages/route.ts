// app/api/advisor/companies/[assignmentId]/messages/route.ts
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
//
// GET  — the contact/message thread for one of the Advisor's own Assignments.
// POST — send a message to the Company on that Assignment.
//
// The Advisor's identity is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) and passed as callerAdvisorId —
// lib/advisor-portal/advisor-portal-service.ts's own caller-must-be-a-party
// check then rejects any assignmentId that does not actually belong to this
// Advisor (Step 25: multi-Company Advisor isolation).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { listContactMessages, sendContactMessage } from '@/lib/advisor-portal/advisor-portal-service';

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

    const messages = await listContactMessages({ assignmentId, callerAdvisorId: identity.id });
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[advisor/companies/messages] read failed:', msg);
    const safeReasons = /rejected:/i;
    return NextResponse.json(
      { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : 'Impossibile recuperare i messaggi.' },
      { status: safeReasons.test(msg) ? 403 : 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

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
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const message = await sendContactMessage({
      assignmentId,
      senderRole: 'ADVISOR',
      body: messageBody,
      callerAdvisorId: identity.id,
    });

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[advisor/companies/messages] send failed:', msg);
    const safeReasons = /rejected:/i;
    return NextResponse.json(
      { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : 'Impossibile inviare il messaggio.' },
      { status: safeReasons.test(msg) ? 422 : 500 },
    );
  }
}
