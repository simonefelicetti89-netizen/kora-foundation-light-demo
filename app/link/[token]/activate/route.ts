// app/link/[token]/activate/route.ts
// KORA Link — worker activation POST endpoint (KL-22). Feature-flagged, default OFF.
// Server-only. No service role. Consumed by the plain HTML <form> in /link/[token].
// Redirects back to /link/[token]?activation=<safe-outcome> — never carries the digest,
// the raw token cleartext (beyond what is already in the URL path, as with every route
// here), or the worker id.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { getKoraLinkReadiness, isKoraLinkActivationEnabled } from '@/lib/kora-link/config';
import { isValidTokenFormat } from '@/lib/kora-link/token';
import {
  activateKoraLinkForWorker,
  KORA_LINK_ACTIVATION_NOTICE_VERSION,
} from '@/lib/kora-link/activation';
import { assertSameOrigin } from '@/lib/security/origin';

function redirectWithOutcome(request: NextRequest, token: string, outcome: string): NextResponse {
  const url = new URL(`/link/${encodeURIComponent(token)}`, request.nextUrl.origin);
  url.searchParams.set('activation', outcome);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const { token } = await params;

  // Guard: activation feature flag — default false until Gate 2+3 closed
  if (!isKoraLinkActivationEnabled()) {
    return redirectWithOutcome(request, token, 'disabled');
  }

  // Token format check — before any auth lookup or digest work
  if (!isValidTokenFormat(token)) {
    return redirectWithOutcome(request, token, 'error');
  }

  // Runtime readiness (secret + base URL configured)
  const readiness = getKoraLinkReadiness();
  if (!readiness.ready) {
    return redirectWithOutcome(request, token, 'unavailable');
  }

  // Worker auth — existing session pattern, no new auth system
  const worker = await getCurrentWorkerUser(request);
  if (!worker) {
    return redirectWithOutcome(request, token, 'unauthenticated');
  }

  // No separate checkbox confirmation — activation is a single voluntary action
  // (submitting this form after reading the activation notice on the page).
  // KORA-LINK-DPO-DECISIONS-09: a checkbox was considered and expressly excluded.
  const secret = process.env['KORA_LINK_TOKEN_SECRET'] ?? '';

  const result = await activateKoraLinkForWorker({
    token,
    workerId: worker.workerId,
    activationNoticeVersion: KORA_LINK_ACTIVATION_NOTICE_VERSION,
    secret,
  });

  switch (result.state) {
    case 'activated':
    case 'already_active':
      return redirectWithOutcome(request, token, 'activated');
    case 'disabled':
      return redirectWithOutcome(request, token, 'disabled');
    case 'unavailable':
      return redirectWithOutcome(request, token, 'unavailable');
    case 'invalid_token':
    case 'activation_notice_required':
    case 'error':
      return redirectWithOutcome(request, token, 'error');
  }
}
