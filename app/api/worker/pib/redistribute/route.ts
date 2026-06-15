// app/api/worker/pib/redistribute/route.ts — Ridistribuzione PIB pillar (worker-owned).
//
// B161 — Opzione C, Livello Ridistribuzione.
//
// POST — WORKER JWT only. Nessun path KORA_ADMIN (la ridistribuzione è worker-owned).
//
// Flusso:
//   1. requireWorkerUser → JWT worker autenticato (source of truth per identità)
//   2. Parse + validazione body (source_uef_record_id, distribution)
//   3. Legge le righe worker_pib esistenti per source_uef_record_id via RLS
//   4. Chiama applyPillarRedistribution (puro, server-side) — validazione + calcolo
//   5. Se invalida: 422 con messaggio
//   6. Chiama fn_redistribute_worker_pib RPC (atomica) — DELETE+INSERT in un'unica transazione
//
// Atomicità — Modifica 2:
//   Il DB write è eseguito da fn_redistribute_worker_pib (migration 020) che fa
//   DELETE + INSERT in una singola transazione PL/pgSQL. Se INSERT fallisce,
//   DELETE è annullato automaticamente → le righe originali restano intatte.
//
// Privacy:
//   workerId dal JWT. workerIdentityId risolto nel DB via auth.uid() (fn 020).
//   Il client NON può specificare quale worker stia ridistribuendo.
//
// RLS DEBT: usa getSupabaseServerClient (RLS-gated) per la lettura.
// La funzione RPC usa auth.uid() internamente — nessun RLS debt.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  applyPillarRedistribution,
} from '@/services/worker-iu-computation/WorkerIUComputationService';
import type { WorkerPIBRowInsert } from '@/lib/types/domains/worker-pilot-schema';

export async function POST(request: NextRequest) {
  // ── Auth: solo WORKER JWT ─────────────────────────────────────────────────
  const workerResult = await requireWorkerUser(request);
  if (isKoraAuthError(workerResult)) {
    return NextResponse.json(
      { error: 'Accesso negato — WORKER JWT richiesto per la ridistribuzione PIB.' },
      { status: 401 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body deve essere un oggetto JSON.' }, { status: 400 });
  }

  const { source_uef_record_id, distribution } = body as Record<string, unknown>;

  if (typeof source_uef_record_id !== 'string' || !source_uef_record_id) {
    return NextResponse.json({ error: 'source_uef_record_id mancante o non valido.' }, { status: 400 });
  }
  if (!distribution || typeof distribution !== 'object' || Array.isArray(distribution)) {
    return NextResponse.json({ error: 'distribution deve essere un oggetto { pillar: frazione }.' }, { status: 400 });
  }

  // ── Legge le righe base dal DB (RLS filtra per auth.uid()) ───────────────
  const supabase = await getSupabaseServerClient();
  type PibDbRow = {
    pillar:               string;
    iu_value:             number;
    source_uef_record_id: string;
    reporting_period:     string;
    verification_status:  string;
    is_exportable:        boolean;
    source_kind:          string;
    source_participation_id: string | null;
  };

  const { data: existingRows, error: readErr } = await (supabase as never as { schema: (s: string) => { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: PibDbRow[] | null; error: unknown }> } } } })
    .schema('personal')
    .from('worker_pib')
    .select('pillar, iu_value, source_uef_record_id, reporting_period, verification_status, is_exportable, source_kind, source_participation_id')
    .eq('source_uef_record_id', source_uef_record_id);

  if (readErr) {
    return NextResponse.json({ error: 'Errore lettura dati PIB.' }, { status: 500 });
  }

  if (!existingRows || existingRows.length === 0) {
    return NextResponse.json(
      { error: 'Nessuna riga PIB trovata per source_uef_record_id specificato.' },
      { status: 404 },
    );
  }

  // Adatta le righe DB al tipo WorkerPIBRowInsert per il service puro
  const baseRows: WorkerPIBRowInsert[] = existingRows.map((r) => ({
    worker_identity_id:      workerResult.workerId,  // da JWT, non da DB column (privacy)
    reporting_period:        r.reporting_period,
    pillar:                  r.pillar as WorkerPIBRowInsert['pillar'],
    iu_value:                r.iu_value,
    verification_status:     r.verification_status as 'verified' | 'self_declared',
    is_exportable:           r.is_exportable,
    source_kind:             r.source_kind as WorkerPIBRowInsert['source_kind'],
    source_uef_record_id:    r.source_uef_record_id,
    source_participation_id: r.source_participation_id,
    generative_index:        null,
    generative_circle1:      null,
    generative_circle2:      null,
    generative_circle3:      null,
  }));

  // ── Validazione + calcolo (puro, server-side) ─────────────────────────────
  const { rows: redistributedRows, error: validationError } = applyPillarRedistribution(
    baseRows,
    distribution as Record<string, number>,
  );

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  // ── Serializza per la RPC (fn_redistribute_worker_pib, mig 020) ──────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcErr } = await (supabase as any).rpc('fn_redistribute_worker_pib', {
    p_source_uef_record_id: source_uef_record_id,
    p_rows: JSON.stringify(redistributedRows.map((r) => ({
      pillar:                  r.pillar,
      iu_value:                r.iu_value,
      verification_status:     r.verification_status,
      is_exportable:           r.is_exportable,
      source_kind:             r.source_kind,
      reporting_period:        r.reporting_period,
      source_participation_id: r.source_participation_id ?? null,
    }))),
  });

  if (rpcErr) {
    // La transazione PL/pgSQL è rollback automatico — le righe originali restano.
    return NextResponse.json(
      { error: 'Ridistribuzione fallita. I tuoi dati PIB originali sono intatti.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok:               true,
    redistributed:    redistributedRows.length,
    source_uef_record_id,
  });
}
