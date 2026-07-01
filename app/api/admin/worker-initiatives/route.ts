// app/api/admin/worker-initiatives/route.ts
// B109: Worker Experience MVP — KORA_ADMIN initiative management.
//
// GET  — list all initiatives for a given tenant (all statuses)
// POST — create a new initiative for a given tenant
//
// PRIVACY CONTRACT:
//   - Never returns worker_participation data (worker-private)
//   - Never exposes private_note
//   - tenantId from query param (admin has cross-tenant access)
//
// Callable by: KORA_ADMIN only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { WorkerInitiativeRow } from '@/lib/supabase/types';

const PILLARS: WorkerInitiativeRow['pillar'][] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
const STATUSES: WorkerInitiativeRow['status'][] = ['draft', 'published', 'closed'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const tenantIdParsed = z.string().uuid().safeParse(request.nextUrl.searchParams.get('tenantId'));
  if (!tenantIdParsed.success) {
    return NextResponse.json({ error: 'tenantId non valido.' }, { status: 400 });
  }
  const tenantId = tenantIdParsed.data;

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('personal')
    .from('worker_initiative')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero iniziative.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, initiatives: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido.' }, { status: 400 });
  }

  const tenantId       = body.tenant_id as string | undefined;
  const title          = body.title as string | undefined;
  const pillar         = body.pillar as WorkerInitiativeRow['pillar'] | undefined;
  const description    = (body.description as string | null) ?? null;
  const eligibilityClass = (body.eligibility_class as 'eligible' | 'limited' | undefined) ?? 'eligible';
  const status         = (body.status as WorkerInitiativeRow['status'] | undefined) ?? 'draft';
  const startDate      = (body.start_date as string | null) ?? null;
  const endDate        = (body.end_date as string | null) ?? null;
  const mode           = (body.mode as string | null) ?? null;
  const location       = (body.location as string | null) ?? null;
  const provider       = (body.provider as string | null) ?? null;

  if (!tenantId) return NextResponse.json({ error: 'tenant_id obbligatorio.' }, { status: 400 });
  if (!title || title.trim().length < 2) return NextResponse.json({ error: 'title obbligatorio (min 2 caratteri).' }, { status: 400 });
  if (!pillar || !PILLARS.includes(pillar)) return NextResponse.json({ error: `pillar non valido. Valori: ${PILLARS.join(', ')}` }, { status: 400 });
  if (!STATUSES.includes(status)) return NextResponse.json({ error: `status non valido. Valori: ${STATUSES.join(', ')}` }, { status: 400 });

  const db = getSupabaseServiceClient();

  // Verify tenant exists
  const { data: tenant } = await db.schema('analytics').from('tenant').select('id').eq('id', tenantId).maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'Tenant non trovato.' }, { status: 404 });

  const { data: created, error: insertErr } = await db
    .schema('personal')
    .from('worker_initiative')
    .insert({
      tenant_id:        tenantId,
      title:            title.trim(),
      description,
      pillar,
      eligibility_class: eligibilityClass,
      status,
      start_date:       startDate,
      end_date:         endDate,
      mode,
      location,
      provider,
      created_by:       auth.id,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: 'Errore nella creazione iniziativa.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, initiative: created }, { status: 201 });
}
