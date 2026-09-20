// app/api/admin/cases/[caseId]/route.ts
// KORA-WP-007 — Operational Case Primitive.
//
// POST — status transition on any Case, including reassignment
// (newOwningAdvisorId — the "handoff record on reassignment" doc 73 §12
// names, KORA_ADMIN-only).

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
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

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: same costly_admin_operation category as the sibling Case
  // creation route (app/api/admin/cases/route.ts) — a status transition
  // (including reassignment) is the same authenticated-admin-actor risk
  // shape.
  const rateLimitGuard = await assertRateLimit('costly_admin_operation', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { status?: string; resolutionNote?: string; newOwningAdvisorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.status || !CASE_STATUSES.includes(body.status as CaseStatus)) {
    return NextResponse.json({ ok: false, error: 'Stato non valido.' }, { status: 400 });
  }

  try {
    const record = await transitionOperationalCaseStatus({
      caseId, newStatus: body.status as CaseStatus, resolutionNote: body.resolutionNote,
      newOwningAdvisorId: body.newOwningAdvisorId,
      callerRole: 'KORA_ADMIN', actorId: auth.id,
    });

    return NextResponse.json({ ok: true, case: record });
  } catch (err) {
    console.error('[admin/cases/:id] transition failed:', err);
    return safeErrorResponse(err, 'Impossibile aggiornare lo stato del Case.');
  }
}
