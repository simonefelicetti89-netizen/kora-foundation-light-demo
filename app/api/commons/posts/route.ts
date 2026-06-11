// app/api/commons/posts/route.ts
// B128: KORA Commons GET (list) + POST (create) endpoint.
//
// Privacy contract:
//   - KORA_ADMIN: lista tutti i tenant, filtra per tenant/status/category
//   - COMPANY_ADMIN: vede solo propri post del tenant (tutti gli stati)
//   - WORKER: vede solo published del proprio tenant
//   - PARTNER: forbidden
//   - anon: forbidden
//   - tenant_id non accettato dal client per COMPANY_ADMIN/WORKER (viene dalla sessione)
//   - Nessun worker_id, email worker, private_note, PIB in risposta
//   - Nessun tracking individuale di lettura

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireKoraAdmin,
  requireCompanyUser,
  requireWorkerUser,
  isKoraAuthError,
} from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const VALID_CATEGORIES = ['announcement', 'initiative_update', 'opportunity', 'event', 'request', 'resource'] as const;
const VALID_PILLARS    = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY', null] as const;
const VALID_STATUSES   = ['draft', 'pending_review', 'published', 'archived', 'rejected'] as const;

type Category = typeof VALID_CATEGORIES[number];
type Pillar   = Exclude<typeof VALID_PILLARS[number], null>;
type Status   = typeof VALID_STATUSES[number];

function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '');
}

// ── GET /api/commons/posts ────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const db = getSupabaseServiceClient();

  // Try KORA_ADMIN first
  const adminAuth = await requireKoraAdmin(request);
  if (!isKoraAuthError(adminAuth)) {
    const url        = request.nextUrl;
    const tenantId   = url.searchParams.get('tenant_id');
    const status     = url.searchParams.get('status') as Status | null;
    const category   = url.searchParams.get('category') as Category | null;

    let query = db
      .schema('commons')
      .from('post')
      .select('id, tenant_id, author_role, title, body, category, status, pillar, published_at, reviewed_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (tenantId)                                     query = query.eq('tenant_id', tenantId);
    if (status && VALID_STATUSES.includes(status))    query = query.eq('status', status);
    if (category && VALID_CATEGORIES.includes(category)) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: data ?? [] });
  }

  // Try COMPANY_ADMIN
  const companyAuth = await requireCompanyUser(request);
  if (!isKoraAuthError(companyAuth)) {
    const { tenantId } = companyAuth;

    const { data, error } = await db
      .schema('commons')
      .from('post')
      .select('id, tenant_id, author_role, title, body, category, status, pillar, published_at, reviewed_at, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: data ?? [] });
  }

  // Try WORKER
  const workerAuth = await requireWorkerUser(request);
  if (!isKoraAuthError(workerAuth)) {
    const { tenantId } = workerAuth;

    const { data, error } = await db
      .schema('commons')
      .from('post')
      .select('id, tenant_id, author_role, title, body, category, status, pillar, published_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, posts: data ?? [] });
  }

  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

// ── POST /api/commons/posts ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const db = getSupabaseServiceClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const title    = sanitizeText(body.title);
  const bodyText = sanitizeText(body.body);
  const category = body.category as string;
  const pillar   = (body.pillar ?? null) as string | null;

  if (!title || title.length < 3 || title.length > 200) {
    return NextResponse.json({ ok: false, error: 'Titolo obbligatorio (3–200 caratteri).' }, { status: 400 });
  }
  if (!bodyText || bodyText.length < 10 || bodyText.length > 4000) {
    return NextResponse.json({ ok: false, error: 'Corpo obbligatorio (10–4000 caratteri).' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ ok: false, error: `Categoria non valida. Valori ammessi: ${VALID_CATEGORIES.join(', ')}.` }, { status: 400 });
  }
  if (pillar !== null && !VALID_PILLARS.includes(pillar as Pillar)) {
    return NextResponse.json({ ok: false, error: `Pillar non valido. Valori ammessi: ${['LIFE','GROWTH','CONNECTION','IMPACT','LEGACY'].join(', ')}.` }, { status: 400 });
  }

  // KORA_ADMIN: può creare per tenant esplicito, qualsiasi status ammesso
  const adminAuth = await requireKoraAdmin(request);
  if (!isKoraAuthError(adminAuth)) {
    const tenantId      = body.tenant_id as string | undefined;
    const initialStatus = (body.status as string) || 'draft';

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_id obbligatorio per KORA_ADMIN.' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(initialStatus as Status)) {
      return NextResponse.json({ ok: false, error: 'Status non valido.' }, { status: 400 });
    }

    const { data, error } = await db
      .schema('commons')
      .from('post')
      .insert({
        tenant_id:      tenantId,
        author_user_id: adminAuth.id,
        author_role:    'KORA_ADMIN',
        title,
        body:           bodyText,
        category,
        status:         initialStatus,
        pillar:         pillar || null,
        published_at:   initialStatus === 'published' ? new Date().toISOString() : null,
      })
      .select('id, tenant_id, status, title, category, created_at')
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data }, { status: 201 });
  }

  // COMPANY_ADMIN: tenant_id dalla sessione, status solo draft/pending_review
  const companyAuth = await requireCompanyUser(request);
  if (!isKoraAuthError(companyAuth)) {
    if (companyAuth.koraRole !== 'COMPANY_ADMIN') {
      return NextResponse.json({ ok: false, error: 'Forbidden — Company Viewer non può creare contenuti.' }, { status: 403 });
    }

    const { tenantId } = companyAuth;
    const initialStatus = (body.status as string) || 'draft';
    if (!['draft', 'pending_review'].includes(initialStatus)) {
      return NextResponse.json({ ok: false, error: 'COMPANY_ADMIN può creare solo draft o pending_review. La pubblicazione richiede approvazione KORA.' }, { status: 403 });
    }

    const { data, error } = await db
      .schema('commons')
      .from('post')
      .insert({
        tenant_id:      tenantId,
        author_user_id: companyAuth.id,
        author_role:    'COMPANY_ADMIN',
        title,
        body:           bodyText,
        category,
        status:         initialStatus,
        pillar:         pillar || null,
      })
      .select('id, tenant_id, status, title, category, created_at')
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data }, { status: 201 });
  }

  // WORKER: forbidden
  const workerAuth = await requireWorkerUser(request);
  if (!isKoraAuthError(workerAuth)) {
    return NextResponse.json({ ok: false, error: 'Forbidden — i worker non possono creare contenuti in KORA Commons.' }, { status: 403 });
  }

  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}
