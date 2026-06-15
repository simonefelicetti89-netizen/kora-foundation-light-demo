// app/api/worker/pib/route.ts — Worker PIB route-ponte.
//
// B157 — binario di consumo.
// Dual-path: today synthetic, tomorrow live. Swapping the LIVE SOURCE HOOK
// is the only change needed when real IU records are available.
//
// Auth paths:
//   WORKER JWT       → LIVE SOURCE HOOK (stub: returns synthetic while pipeline data
//                      is not yet available per-worker — post-Gate-2)
//   KORA_ADMIN JWT   → PREVIEW path: accepts ?persona=A&scenario=S1
//
// Privacy invariants (absolute):
//   - workerId/tenantId ALWAYS from JWT app_metadata, never from query params.
//   - not_employer_visible: true enforced at contract level.
//   - not_performance_score: true enforced at contract level.
//   - isSynthetic: true in all Foundation Light responses.
//
// RLS DEBT: routes using getSupabaseServiceClient bypass RLS.
// When activating the LIVE path, replace service client with server client
// and confirm RLS policies cover analytics.uef_record per pseudonym_id.
// See docs/worker-pib-activation-guide.md — sezione "RLS e sicurezza".

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireWorkerUser,
  requireKoraAdmin,
  isKoraAuthError,
} from '@/lib/auth/kora-session';
import { workerPIBService } from '@/services/worker-pib/WorkerPIBService';

const VALID_PERSONAS = ['A', 'B', 'C', 'D'] as const;
const VALID_SCENARIOS = ['S1', 'S2', 'S3', 'S4'] as const;

export async function GET(request: NextRequest) {
  // ── Path 1: Authenticated WORKER ──────────────────────────────────────────────
  const workerResult = await requireWorkerUser(request);
  if (!isKoraAuthError(workerResult)) {
    // LIVE SOURCE HOOK (post-Gate-2): sostituire il blocco qui sotto con
    // l'aggregazione IU reale per pseudonym_id dalla pipeline.
    //
    //   pseudonymId = derivePseudonymId(workerResult.workerId);
    //   const pib   = await livePIBAggregator.getPIBByPseudonym(
    //     pseudonymId,
    //     workerResult.tenantId,
    //     { period: currentPeriod() },
    //   );
    //   return NextResponse.json({ ...pib, isSynthetic: false });
    //
    // Vedi docs/worker-pib-activation-guide.md — sezione "Attivazione sorgente reale".
    //
    // Stub: returns synthetic data until live pipeline is wired.
    const pib = workerPIBService.getPIB('A', 'S1');
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
