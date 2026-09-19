// app/api/advisor/companies/[assignmentId]/koral-review/confirm/route.ts
// KORA-WP-116 — KORAL Review, Review Mode B only.
//
// POST — confirm an eligible, still-ambiguous CANDIDATE Material Change.
// The ONLY route by which an Advisor action may ever promote a Material
// Change to RECOGNIZED (Founder Adjudication #1: never a bare "approve
// KORAL" click — see lib/living-koral-review/review-service.ts's own
// confirmAmbiguousCandidate() and its ten-step sequence). Deliberately its
// own route, separate from ../route.ts's own POST (Mode A, interpretation
// only) — the two Review Modes are never conflatable at the transport
// layer either.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { confirmAmbiguousCandidate } from '@/lib/living-koral-review/review-service';

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
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: same single_provisioning category as every other
  // Advisor-scoped create/confirm route.
  const rateLimitGuard = await assertRateLimit('single_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { materialChangeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.materialChangeId?.trim()) {
    return NextResponse.json({ ok: false, error: 'La trasformazione da confermare è obbligatoria.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const result = await confirmAmbiguousCandidate({
      assignmentId, callerAdvisorId: identity.id, materialChangeId: body.materialChangeId, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, review: result });
  } catch (err) {
    console.error('[advisor/companies/koral-review/confirm] failed:', err);
    return safeErrorResponse(err, 'Impossibile confermare la trasformazione.');
  }
}
