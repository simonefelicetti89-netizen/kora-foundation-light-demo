// app/api/advisor/companies/[assignmentId]/content/route.ts
// KORA-WP-036 — Advisor Document/Note Five-Class Taxonomy.
//
// GET  — the Advisor-visible content for one of their own Assignments
//        (Classes 1/2/4/5 — never Class 3, KORA_ADMIN-only).
// POST — create a new content record (Classes 1/2/4/5 only — the service
//        itself structurally rejects AUDIT_PROVENANCE_RECORD from this
//        path; there is no Admin UI in this pilot slice, per this WP's own
//        Out of Scope discipline).
//
// The Advisor's identity is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) — never a request parameter.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { createAdvisorContent, listContentForAdvisor, CONTENT_CLASSES, type ContentClass } from '@/lib/advisor-portal/advisor-content-service';

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

    const content = await listContentForAdvisor(identity.id, assignmentId);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    console.error('[advisor/companies/content] read failed:', err);
    return safeErrorResponse(err, 'Impossibile recuperare i contenuti.');
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

  let body: { class?: string; body?: string; shared?: boolean; purpose?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  if (!body.class || !CONTENT_CLASSES.includes(body.class as ContentClass)) {
    return NextResponse.json({ ok: false, error: 'Classe non valida.' }, { status: 400 });
  }
  if (!body.body?.trim()) {
    return NextResponse.json({ ok: false, error: 'Il testo è obbligatorio.' }, { status: 400 });
  }

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: false, error: 'Profilo Advisor non trovato.' }, { status: 403 });
    }

    const record = await createAdvisorContent({
      assignmentId, class: body.class as ContentClass, body: body.body, shared: body.shared, purpose: body.purpose,
      callerAdvisorId: identity.id, actorId: auth.id,
    });

    return NextResponse.json({ ok: true, record });
  } catch (err) {
    console.error('[advisor/companies/content] create failed:', err);
    return safeErrorResponse(err, 'Impossibile salvare il contenuto.');
  }
}
