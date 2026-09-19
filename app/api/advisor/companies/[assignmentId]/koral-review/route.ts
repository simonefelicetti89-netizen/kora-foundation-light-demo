// app/api/advisor/companies/[assignmentId]/koral-review/route.ts
// KORA-WP-116 — KORAL Review.
//
// GET  — the two subject sets this Assignment's Advisor may Review
//        (RECOGNIZED changes eligible for interpretation — Mode A; still-
//        CANDIDATE changes eligible for confirmation — Mode B), plus this
//        Assignment's existing Review Cases.
// POST — Review Mode A only: add interpretation to an already-RECOGNIZED
//        Material Change. Mode B (confirmation) is its own, separate
//        route (./confirm/route.ts) — deliberately not a single
//        action-discriminated endpoint, so the two Review Modes (this
//        WP's own binding distinction: interpret vs. confirm) are never
//        conflatable at the transport layer either.
//
// The Advisor's identity is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) — never a request parameter.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { listKoralReviewSubjects, interpretRecognizedChange } from '@/lib/living-koral-review/review-service';

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

    const subjects = await listKoralReviewSubjects(assignmentId, identity.id);
    return NextResponse.json({ ok: true, subjects });
  } catch (err) {
    console.error('[advisor/companies/koral-review] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare le trasformazioni.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: same single_provisioning category as every other
  // Advisor-scoped create route.
  const rateLimitGuard = await assertRateLimit('single_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { materialChangeId?: string; interpretation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.materialChangeId?.trim()) {
    return NextResponse.json({ ok: false, error: 'La trasformazione da interpretare è obbligatoria.' }, { status: 400 });
  }
  if (!body.interpretation?.trim()) {
    return NextResponse.json({ ok: false, error: 'Il testo dell\'interpretazione è obbligatorio.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const result = await interpretRecognizedChange({
      assignmentId, callerAdvisorId: identity.id, materialChangeId: body.materialChangeId, interpretation: body.interpretation, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, review: result });
  } catch (err) {
    console.error('[advisor/companies/koral-review] interpret failed:', err);
    return safeErrorResponse(err, 'Impossibile salvare l\'interpretazione.');
  }
}
