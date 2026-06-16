// app/api/company/contribution/live/route.ts
// B166: GET /api/company/contribution/live?period=... — dato reale KORA Contribution.
//
// Auth: COMPANY_ADMIN (o COMPANY_VIEWER) JWT.
// Feature gate: solo tenant production_ready (analytics.tenant.production_ready = true).
// Per tenant Foundation Light → 404 con messaggio esplicativo (no dato sintetico su questo path).
// KORA Contribution è companion indicator — NON componente KORA Index (CLAUDE.md §12.7).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getContributionLive } from '@/services/kora-contribution/KoraContributionService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const period = request.nextUrl.searchParams.get('period') ?? undefined;
  const db     = await getSupabaseServerClient();

  const summary = await getContributionLive({ db, tenantId: auth.tenantId, period });

  if (!summary) {
    return NextResponse.json({
      ok:      false,
      error:   'KORA Contribution Live non disponibile per questo tenant. Richiede tenant Pilot+ (production_ready = true).',
      feature: 'contribution_live',
      gate:    'production_ready',
    }, { status: 404 });
  }

  return NextResponse.json({ ok: true, contribution: summary });
}
