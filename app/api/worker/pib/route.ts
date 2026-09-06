// app/api/worker/pib/route.ts — Worker PIB live route.
//
// B157/B161 — binario di consumo.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
// former "Path 2" (KORA_ADMIN preview, persona+scenario via query params,
// synthetic workerPIBService.getPIB()) was verified fresh to have zero
// frontend callers — its sole caller was /my-kora's now-retired real-session
// probe fetches. Removed per
// docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md: "no
// demo-specific business logic... no runtime JSON/synthetic fallback."
//
// Auth path:
//   WORKER JWT → live DB path (personal.worker_pib via getSupabaseServerClient).
//                Il client ha la sessione del worker dal JWT cookie — rispetta RLS.
//                La policy "worker_pib_worker_own_all" isola le righe per auth.uid().
//                workerId/tenantId NON vengono da query params: l'isolamento è DB-level.
//
// Privacy invariants (assoluti):
//   - workerId/tenantId sempre da JWT app_metadata, mai da query/body.
//   - not_employer_visible: true al livello del contratto di risposta.
//   - not_performance_score: true al livello del contratto di risposta.
//   - COMPANY_ADMIN/KORA_ADMIN: 401 — nessun accesso a PIB individuale.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { workerPIBService } from '@/services/worker-pib/WorkerPIBService';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const workerResult = await requireWorkerUser(request);
  if (isKoraAuthError(workerResult)) {
    return NextResponse.json({ error: 'Accesso negato — WORKER richiesto.' }, { status: 401 });
  }

  // Live path: getSupabaseServerClient usa anon key + cookie session — rispetta RLS.
  // La policy "worker_pib_worker_own_all" filtra per auth.uid() → worker_identity_id.
  // workerId NON viene passato come parametro: isolamento garantito dal DB, non dal codice.
  const supabase      = await getSupabaseServerClient();
  const reportingPeriod = request.nextUrl.searchParams.get('period') ?? undefined;
  const pib = await workerPIBService.getPIBLive(supabase, reportingPeriod);
  return NextResponse.json(pib);
}
