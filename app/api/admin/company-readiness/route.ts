// app/api/admin/company-readiness/route.ts
// KORA-WP-027 — KORA Ready override / revoke.
//
// POST /api/admin/company-readiness  { tenantId, action: 'override'|'revoke', reason, evidence? }
//
// KORA_ADMIN is the baseline route-level gate (this repo's established
// coarse admin auth). The REAL authorization decision is the capability
// check inside the service (hasAdminCapability, COMPANY_OPERATIONS:OVERRIDE,
// KORA-WP-009 reuse) — doc 78 §7's own "never a blanket permission." A
// KORA_ADMIN session without that specific capability grant is rejected by
// the service layer even though it passed this route's own gate.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertSameOrigin } from '@/lib/security/origin';
import { assertRateLimit } from '@/lib/security/rate-limit';
import { overrideReadiness, revokeReadiness, ReadinessAuthorizationError } from '@/lib/company-readiness/company-readiness-service';
import { getOrCreateCorrelationId, logInfo, captureError } from '@/lib/observability/observability';

const ROUTE = '/api/admin/company-readiness';

export async function POST(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(request.headers.get('x-correlation-id'));

  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: an admin governance override/revoke action — same
  // costly_admin_operation category as the other admin-side mutating
  // routes protected under this category.
  const rateLimitGuard = await assertRateLimit('costly_admin_operation', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.', correlationId }, { status: 400 });
  }

  const tenantId = typeof body['tenantId'] === 'string' ? body['tenantId'] : null;
  const action = typeof body['action'] === 'string' ? body['action'] : null;
  const reason = typeof body['reason'] === 'string' ? body['reason'] : '';
  const evidence = typeof body['evidence'] === 'string' ? body['evidence'] : undefined;

  if (!tenantId || (action !== 'override' && action !== 'revoke')) {
    return NextResponse.json({ error: 'tenantId e action ("override"|"revoke") sono obbligatori.', correlationId }, { status: 400 });
  }

  const obsCtx = { correlationId, operation: `company_readiness.${action}`, route: ROUTE, tenantId, actorRole: auth.koraRole };

  try {
    if (action === 'override') {
      const event = await overrideReadiness({
        tenantId, authUserId: auth.id, reason, evidence, actorRole: auth.koraRole, actorId: auth.email,
      });
      logInfo('readiness override recorded', obsCtx);
      return NextResponse.json({ ok: true, attainmentId: event.id, correlationId }, { status: 201 });
    }

    const health = await revokeReadiness({
      tenantId, authUserId: auth.id, reason, actorRole: auth.koraRole, actorId: auth.email,
    });
    logInfo('readiness revoked', obsCtx);
    return NextResponse.json({ ok: true, status: health.status, correlationId }, { status: 200 });
  } catch (e) {
    if (e instanceof ReadinessAuthorizationError) {
      // An authorization/validation rejection — expected domain behavior,
      // logged only, never sent to Sentry.
      logInfo(`readiness ${action} rejected`, obsCtx);
      return NextResponse.json({ error: e.message, correlationId }, { status: 403 });
    }
    captureError(e, obsCtx, `readiness ${action} failed unexpectedly`);
    return NextResponse.json({ error: 'Errore imprevisto.', correlationId }, { status: 500 });
  }
}
