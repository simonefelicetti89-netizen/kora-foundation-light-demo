// app/api/worker/pib/route.ts — Worker PIB live route.
//
// B157/B161 — binario di consumo.
//
// Auth paths:
//   WORKER JWT     → live DB path (personal.worker_pib via getSupabaseServerClient).
//                    Il client ha la sessione del worker dal JWT cookie — rispetta RLS.
//                    La policy "worker_pib_worker_own_all" isola le righe per auth.uid().
//                    workerId/tenantId NON vengono da query params: l'isolamento è DB-level.
//   KORA_ADMIN JWT → preview sintetico (persona+scenario da query params), separato dal live.
//
// Privacy invariants (assoluti):
//   - workerId/tenantId sempre da JWT app_metadata, mai da query/body.
//   - not_employer_visible: true al livello del contratto di risposta.
//   - not_performance_score: true al livello del contratto di risposta.
//   - COMPANY_ADMIN: 401 — nessun accesso a PIB individuale.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireWorkerUser,
  requireKoraAdmin,
  isKoraAuthError,
} from '@/lib/auth/kora-session';
import { workerPIBService } from '@/services/worker-pib/WorkerPIBService';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const VALID_PERSONAS = ['A', 'B', 'C', 'D'] as const;
const VALID_SCENARIOS = ['S1', 'S2', 'S3', 'S4'] as const;

export async function GET(request: NextRequest) {
  // ── Path 1: Authenticated WORKER ──────────────────────────────────────────────
  const workerResult = await requireWorkerUser(request);
  if (!isKoraAuthError(workerResult)) {
    // Live path: getSupabaseServerClient usa anon key + cookie session — rispetta RLS.
    // La policy "worker_pib_worker_own_all" filtra per auth.uid() → worker_identity_id.
    // workerId NON viene passato come parametro: isolamento garantito dal DB, non dal codice.
    const supabase      = await getSupabaseServerClient();
    const reportingPeriod = request.nextUrl.searchParams.get('period') ?? undefined;
    const pib = await workerPIBService.getPIBLive(supabase, reportingPeriod);
    return NextResponse.json(pib);
  }

  // ── Path 2: KORA_ADMIN preview (persona + scenario via query params) ──────────
  const adminResult = await requireKoraAdmin(request);
  if (!isKoraAuthError(adminResult)) {
    const params   = request.nextUrl.searchParams;
    const rawP     = (params.get('persona')  ?? 'A').toUpperCase();
    const rawS     = (params.get('scenario') ?? 'S1').toUpperCase();
    const persona  = VALID_PERSONAS.includes(rawP  as typeof VALID_PERSONAS[number])  ? rawP  as typeof VALID_PERSONAS[number]  : 'A';
    const scenario = VALID_SCENARIOS.includes(rawS as typeof VALID_SCENARIOS[number]) ? rawS as typeof VALID_SCENARIOS[number] : 'S1';
    const pib = workerPIBService.getPIB(persona, scenario);
    return NextResponse.json(pib);
  }

  // Both auth paths failed — return the worker auth error (more specific)
  return NextResponse.json(
    { error: 'Accesso negato — WORKER o KORA_ADMIN richiesto.' },
    { status: 401 },
  );
}
