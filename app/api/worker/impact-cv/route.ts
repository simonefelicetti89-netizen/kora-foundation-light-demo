// app/api/worker/impact-cv/route.ts — Worker IU-based Dynamic CV route-ponte.
//
// B157 — binario di consumo.
// This route is distinct from /api/worker/dynamic-cv which returns
// participation-count data (interested/registered/attended per initiative).
// This route returns IU-based CV items: events from the UEF pipeline that
// are cv_eligible and carry a verified iu_value.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
// former KORA_ADMIN "?persona=A" preview path (synthetic
// workerPIBService.getCVData()) was verified fresh to have zero frontend
// callers anywhere in the repository. Removed per
// docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md: "no
// demo-specific business logic... no runtime JSON/synthetic fallback."
//
// Auth path:
//   WORKER JWT → LIVE SOURCE HOOK (stub: synthetic until per-worker UEF records exist)
//
// Privacy invariants (absolute):
//   - workerId ALWAYS from JWT app_metadata, never from query params.
//   - export_available: false while isSynthetic — enforced at contract level.
//
// RLS DEBT: see docs/worker-pib-activation-guide.md — sezione "RLS e sicurezza".

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

  // B161: live path — legge da personal.worker_pib (is_exportable=true) via RLS.
  // Il Supabase client ha la sessione del worker dal JWT cookie.
  // Nodo A: getCVDataLive restituisce solo righe verified (is_exportable=true).
  const supabase = await getSupabaseServerClient();
  const cvData = await workerPIBService.getCVDataLive(supabase);
  return NextResponse.json(cvData);
}
