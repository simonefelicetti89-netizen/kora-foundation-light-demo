// app/api/commons/initiatives/route.ts
// B165: GET /api/commons/initiatives — lista iniziative pubblicabili con mappa.
//
// Privacy contract:
//   - Solo post con opening_grade valorizzato (iniziative, non post generici)
//   - WORKER: vede company_internal/extended solo del proprio tenant
//             vede cross_company di tutti i tenant (RLS mig 024)
//   - Nessun dato individuale worker, nessun PIB, nessun tracking
//   - Filtro geo opzionale via ?near=lat,lng,radius_km (server-side haversine)
//
// Usa getSupabaseServerClient (B163 pattern — no service-role per le route worker).
// La RLS (mig 013 + mig 024) garantisce la visibilità cross-tenant per cross_company.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireWorkerUser,
  requireCompanyUser,
  requireKoraAdmin,
  isKoraAuthError,
} from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getPublishedInitiatives } from '@/services/commons/CommonsService';

function parseNear(raw: string | null): { lat: number; lng: number; radius_km: number } | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [lat, lng, radius_km] = parts as [number, number, number];
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || radius_km <= 0 || radius_km > 500) {
    return null;
  }
  return { lat, lng, radius_km };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const near = parseNear(request.nextUrl.searchParams.get('near'));

  // Auth: WORKER, COMPANY, or KORA_ADMIN can list initiatives
  const workerAuth  = await requireWorkerUser(request);
  const companyAuth = isKoraAuthError(workerAuth) ? await requireCompanyUser(request) : null;
  const adminAuth   = (isKoraAuthError(workerAuth) && (companyAuth === null || isKoraAuthError(companyAuth)))
    ? await requireKoraAdmin(request)
    : null;

  if (isKoraAuthError(workerAuth) && (companyAuth === null || isKoraAuthError(companyAuth!)) && (adminAuth === null || isKoraAuthError(adminAuth!))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // server client — JWT propagato al DB per RLS
  const db = await getSupabaseServerClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initiatives = await getPublishedInitiatives(db as any, near ? { near } : {});
    return NextResponse.json({ ok: true, initiatives, count: initiatives.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore interno.';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
