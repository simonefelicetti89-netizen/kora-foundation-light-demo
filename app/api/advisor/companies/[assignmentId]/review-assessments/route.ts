// app/api/advisor/companies/[assignmentId]/review-assessments/route.ts
// KORA-WP-037 — Advisor Review Assessment Issuance.
//
// GET  — the Advisor's own issued Assessments for a given Review
//        (?reviewId=... required) — never a Review browser; this WP does
//        not own building one (that remains the Decision-Spine/Review UI's
//        own, separate, still-unbuilt gap — see report 158/159's own
//        disclosed scope boundary).
// POST — issue a new Assessment for a given Review, as the Advisor,
//        scoped to this exact Assignment ("recusal-deny enforced (extends
//        KORA-WP-010's harness)", registry 142's own field for this WP) —
//        entirely delegated to issueReviewAdvisorAssessmentAsAdvisor(),
//        never a second authorization or persistence path.
//
// Same shape as the sibling
// app/api/advisor/companies/[assignmentId]/cases/route.ts (KORA-WP-034):
// the Advisor's identity is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) — never a request parameter —
// and errors use the same safeErrorResponse() convention already
// established across every route in this family (messages/appointments/
// content/cases) — no WP-046 observability here, consistent with every one
// of those existing sibling routes, none of which uses it either.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import {
  issueReviewAdvisorAssessmentAsAdvisor,
  listReviewAdvisorAssessmentsForReviewAsAdvisor,
} from '@/lib/advisor-portal/advisor-decision-support-service';

function safeErrorResponse(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err);
  const safeReasons = /rejected:|not currently valid|not found|concluded/i;
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
  const reviewId = request.nextUrl.searchParams.get('reviewId');

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  if (!reviewId?.trim()) {
    return NextResponse.json({ ok: false, error: 'L\'ID della Review è obbligatorio.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const assessments = await listReviewAdvisorAssessmentsForReviewAsAdvisor(assignmentId, identity.id, reviewId);

    // Conflict/recusal state (conflictFlagAtIssuance) and internal
    // provenance (tenantId, assignmentId, actorId) are eligibility/
    // governance metadata — never serialized to a client response, the
    // same withholding convention every other Advisor object in this
    // portal already follows. The Advisor already knows their own
    // narrative and qualification context; nothing else is needed here.
    const clientSafe = assessments.map((a) => ({
      id: a.id, reviewId: a.reviewId, assessmentNarrative: a.assessmentNarrative,
      qualificationStatusAtIssuance: a.qualificationStatusAtIssuance, issuedAt: a.issuedAt,
    }));

    return NextResponse.json({ ok: true, assessments: clientSafe });
  } catch (err) {
    console.error('[advisor/companies/review-assessments] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare le valutazioni.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: { reviewId?: string; assessmentNarrative?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.reviewId?.trim()) {
    return NextResponse.json({ ok: false, error: 'L\'ID della Review è obbligatorio.' }, { status: 400 });
  }
  if (!body.assessmentNarrative?.trim()) {
    return NextResponse.json({ ok: false, error: 'Il testo della valutazione è obbligatorio.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const assessment = await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId, callerAdvisorId: identity.id, reviewId: body.reviewId, assessmentNarrative: body.assessmentNarrative,
    });

    // Same client-safe withholding as GET, above.
    return NextResponse.json({
      ok: true,
      assessment: {
        id: assessment.id, reviewId: assessment.reviewId, assessmentNarrative: assessment.assessmentNarrative,
        qualificationStatusAtIssuance: assessment.qualificationStatusAtIssuance, issuedAt: assessment.issuedAt,
      },
    });
  } catch (err) {
    console.error('[advisor/companies/review-assessments] create failed:', err);
    return safeErrorResponse(err, 'Impossibile registrare la valutazione.');
  }
}
