// app/api/company/readiness/route.ts
// KORA-WP-027 — Onboarding Readiness Pipeline Rebuild + KORA Ready
// Attainment/Health Split.
//
// GET /api/company/readiness
//
// The "AUTOMATED NORMAL PATH" (doc 78 §7): re-evaluates the caller's own
// Company against the existing readiness-derivation logic
// (lib/live/company-onboarding-view.ts, previously with zero real runtime
// caller) and returns the current health plus attainment history.
// Company-scoped — requireCompanyUser resolves tenantId from the verified
// session only, never from a client-supplied parameter.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { evaluateAndRecordReadiness, getReadinessAttainmentHistory } from '@/lib/company-readiness/company-readiness-service';
import { getOrCreateCorrelationId, logInfo, captureError } from '@/lib/observability/observability';

const ROUTE = '/api/company/readiness';
const OPERATION = 'company_readiness.evaluate';

export async function GET(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(request.headers.get('x-correlation-id'));

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const obsCtx = { correlationId, operation: OPERATION, route: ROUTE, actorRole: auth.koraRole, tenantId: auth.tenantId };

  try {
    const health = await evaluateAndRecordReadiness({
      tenantId: auth.tenantId, actorRole: auth.koraRole, actorId: auth.email,
    });
    const attainmentHistory = await getReadinessAttainmentHistory(auth.tenantId);

    logInfo('readiness evaluated', obsCtx);
    return NextResponse.json({
      ok: true,
      status: health.status,
      blockers: health.blockers,
      warnings: health.warnings,
      evaluatedAt: health.evaluatedAt,
      attainedAt: attainmentHistory[0]?.achievedAt ?? null,
      correlationId,
    }, { status: 200 });
  } catch (e) {
    captureError(e, obsCtx, 'readiness evaluation failed unexpectedly');
    return NextResponse.json({ error: 'Errore durante la valutazione dello stato di prontezza.', correlationId }, { status: 500 });
  }
}
