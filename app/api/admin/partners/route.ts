// app/api/admin/partners/route.ts
// B116: Partner Map Foundation — KORA_ADMIN partner catalog management.
//
// GET  — list all partners (all statuses), optional ?pillar= filter
// POST — create a new partner
//
// PRIVACY CONTRACT:
//   - KORA_ADMIN only (requireKoraAdmin enforced)
//   - No worker interaction data returned here
//   - Partners are global (not per-tenant) in Foundation Light
//
// Callable by: KORA_ADMIN only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;
const DELIVERY_MODES = ['online', 'onsite', 'hybrid'] as const;

type Pillar       = typeof PILLARS[number];
type Status       = typeof STATUSES[number];
type DeliveryMode = typeof DELIVERY_MODES[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const pillarFilter = request.nextUrl.searchParams.get('pillar');
  const statusFilter = request.nextUrl.searchParams.get('status');

  const db = getSupabaseServiceClient();

  let query = db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, country, delivery_mode, status, created_at')
    .order('created_at', { ascending: false });

  if (pillarFilter && PILLARS.includes(pillarFilter as Pillar)) {
    query = query.eq('pillar', pillarFilter);
  }
  if (statusFilter && STATUSES.includes(statusFilter as Status)) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero partner.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, partners: data ?? [] });
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

  const name         = (body.name as string | undefined)?.trim();
  const pillar       = body.pillar as string | undefined;
  const description  = (body.description as string | undefined)?.trim() || null;
  const category     = (body.category as string | undefined)?.trim() || null;
  const website_url  = (body.website_url as string | undefined)?.trim() || null;
  const city         = (body.city as string | undefined)?.trim() || null;
  const delivery_mode = (body.delivery_mode as string | undefined) ?? 'online';

  if (!name) {
    return NextResponse.json({ error: 'name è obbligatorio.' }, { status: 400 });
  }
  if (!pillar || !PILLARS.includes(pillar as Pillar)) {
    return NextResponse.json({ error: `pillar deve essere uno di: ${PILLARS.join(', ')}` }, { status: 400 });
  }
  if (!DELIVERY_MODES.includes(delivery_mode as DeliveryMode)) {
    return NextResponse.json({ error: `delivery_mode deve essere: online, onsite, hybrid` }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('network')
    .from('partner_profile')
    .insert({
      name,
      description,
      pillar,
      category,
      website_url,
      city,
      country: 'IT',
      delivery_mode,
      status: 'draft',
    })
    .select('id, name, pillar, status')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Errore nella creazione del partner.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, partner: data }, { status: 201 });
}
