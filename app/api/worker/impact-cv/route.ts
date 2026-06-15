// app/api/worker/impact-cv/route.ts — Worker IU-based Dynamic CV route-ponte.
//
// B157 — binario di consumo.
// This route is distinct from /api/worker/dynamic-cv which returns
// participation-count data (interested/registered/attended per initiative).
// This route returns IU-based CV items: events from the UEF pipeline that
// are cv_eligible and carry a verified iu_value.
//
// Auth paths:
//   WORKER JWT       → LIVE SOURCE HOOK (stub: synthetic until per-worker UEF records exist)
//   KORA_ADMIN JWT   → PREVIEW path: accepts ?persona=A
//
// Privacy invariants (absolute):
//   - workerId ALWAYS from JWT app_metadata, never from query params.
//   - export_available: false while isSynthetic — enforced at contract level.
//
// RLS DEBT: see docs/worker-pib-activation-guide.md — sezione "RLS e sicurezza".

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

export async function GET(request: NextRequest) {
  // ── Path 1: Authenticated WORKER ──────────────────────────────────────────────
  const workerResult = await requireWorkerUser(request);
  if (!isKoraAuthError(workerResult)) {
    // B161: live path — legge da personal.worker_pib (is_exportable=true) via RLS.
    // Il Supabase client ha la sessione del worker dal JWT cookie.
    // Nodo A: getCVDataLive restituisce solo righe verified (is_exportable=true).
    const supabase = await getSupabaseServerClient();
    const cvData = await workerPIBService.getCVDataLive(supabase);
    return NextResponse.json(cvData);
  }

  // ── Path 2: KORA_ADMIN preview (persona via query params) ────────────────────
  const adminResult = await requireKoraAdmin(request);
  if (!isKoraAuthError(adminResult)) {
    const rawP    = (request.nextUrl.searchParams.get('persona') ?? 'A').toUpperCase();
    const persona = VALID_PERSONAS.includes(rawP as typeof VALID_PERSONAS[number])
      ? rawP as typeof VALID_PERSONAS[number]
      : 'A';
    const cvData = workerPIBService.getCVData(persona);
    return NextResponse.json(cvData);
  }

  return NextResponse.json(
    { error: 'Accesso negato — WORKER o KORA_ADMIN richiesto.' },
    { status: 401 },
  );
}
