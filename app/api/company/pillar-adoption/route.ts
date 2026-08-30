// app/api/company/pillar-adoption/route.ts
// CC-018 / B-TRUTH — company-facing aggregate pillar distribution (live).
//
// GET /api/company/pillar-adoption
//
// Tenant is ALWAYS derived from authenticated session (requireCompanyUser).
// NEVER accepts a tenantId/companyId from query params or request body.
//
// Canonical source: analytics.activation_result.pillar_distribution, via
// WorkerPillarAdoptionService (CC-018 — see that file for the migration
// note). Same N≥10 / privacy_threshold_met suppression contract as the
// superseded synthetic demo path.
//
// NEVER returns:
//   - Individual worker data / pseudonym_id / PIB records
//   - Admin pipeline controls or links to admin routes

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { workerPillarAdoptionService } from '@/services/worker-pillar-adoption/WorkerPillarAdoptionService';

export async function GET(request: NextRequest) {
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { tenantId } = authResult;
  const db = await getSupabaseServerClient();

  try {
    const result = await workerPillarAdoptionService.getCompanyPillarAdoption(db, tenantId);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero della distribuzione per pilastro.' }, { status: 500 });
  }
}
