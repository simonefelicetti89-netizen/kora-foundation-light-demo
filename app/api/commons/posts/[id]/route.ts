// app/api/commons/posts/[id]/route.ts
// B128: KORA Commons PATCH — modifica/moderazione post singolo.
//
// Privacy contract:
//   - COMPANY_ADMIN: modifica solo propri post del tenant se draft/pending_review
//   - KORA_ADMIN: può cambiare qualsiasi campo, incluso status (approve/publish/reject/archive)
//   - WORKER: forbidden
//   - PARTNER: forbidden
//   - published_at impostato automaticamente quando status passa a 'published'
//   - reviewed_by / reviewed_at impostati quando KORA_ADMIN cambia status

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
const VALID_PILLARS    = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
const VALID_STATUSES   = ['draft', 'pending_review', 'published', 'archived', 'rejected'] as const;

type Category = typeof VALID_CATEGORIES[number];
type Pillar   = typeof VALID_PILLARS[number];
type Status   = typeof VALID_STATUSES[number];

function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().replace(/<[^>]*>/g, '') || undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: postId } = await params;
  const db = getSupabaseServiceClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  // ── KORA_ADMIN: accesso completo ─────────────────────────────────────────────
  const adminAuth = await requireKoraAdmin(request);
  if (!isKoraAuthError(adminAuth)) {
    const { data: existing } = await db
      .schema('commons')
      .from('post')
      .select('id, tenant_id, status')
      .eq('id', postId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Post non trovato.' }, { status: 404 });
    }

    const updates: { status?: string; reviewed_by?: string | null; reviewed_at?: string | null; published_at?: string | null; title?: string; body?: string; category?: string; pillar?: string | null } = {};
    const newStatus = body.status as string | undefined;

    if (newStatus && VALID_STATUSES.includes(newStatus as Status)) {
      updates.status      = newStatus;
      updates.reviewed_by = adminAuth.id;
      updates.reviewed_at = new Date().toISOString();
      if (newStatus === 'published') {
        updates.published_at = new Date().toISOString();
      }
    }
    if (body.title !== undefined)    { const t = sanitizeText(body.title);    if (t) updates.title = t; }
    if (body.body  !== undefined)    { const b = sanitizeText(body.body);     if (b) updates.body  = b; }
    if (body.category !== undefined && VALID_CATEGORIES.includes(body.category as Category)) {
      updates.category = body.category as string;
    }
    if ('pillar' in body) {
      updates.pillar = body.pillar && VALID_PILLARS.includes(body.pillar as Pillar) ? body.pillar as string : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nessun campo valido da aggiornare.' }, { status: 400 });
    }

    const { data, error } = await db
      .schema('commons')
      .from('post')
      .update(updates)
      .eq('id', postId)
      .select('id, tenant_id, status, title, category, published_at, reviewed_at')
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data });
  }

  // ── COMPANY_ADMIN: modifica propri draft/pending_review ───────────────────────
  const companyAuth = await requireCompanyUser(request);
  if (!isKoraAuthError(companyAuth)) {
    if (companyAuth.koraRole !== 'COMPANY_ADMIN') {
      return NextResponse.json({ ok: false, error: 'Forbidden — Company Viewer non può modificare contenuti.' }, { status: 403 });
    }

    const { tenantId } = companyAuth;

    const { data: existing } = await db
      .schema('commons')
      .from('post')
      .select('id, tenant_id, status, author_role')
      .eq('id', postId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Post non trovato.' }, { status: 404 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = existing as any;

    if (post.tenant_id !== tenantId) {
      return NextResponse.json({ ok: false, error: 'Accesso negato — post di un altro tenant.' }, { status: 403 });
    }
    if (!['draft', 'pending_review'].includes(post.status)) {
      return NextResponse.json({ ok: false, error: 'COMPANY_ADMIN può modificare solo post in draft o pending_review.' }, { status: 403 });
    }

    const newStatus = body.status as string | undefined;
    if (newStatus && !['draft', 'pending_review'].includes(newStatus)) {
      return NextResponse.json({ ok: false, error: 'COMPANY_ADMIN non può cambiare status a published, archived o rejected. La pubblicazione richiede approvazione KORA.' }, { status: 403 });
    }

    const updates: { status?: string; title?: string; body?: string; category?: string; pillar?: string | null } = {};
    if (newStatus && ['draft', 'pending_review'].includes(newStatus)) updates.status = newStatus;
    if (body.title !== undefined)    { const t = sanitizeText(body.title);    if (t) updates.title = t; }
    if (body.body  !== undefined)    { const b = sanitizeText(body.body);     if (b) updates.body  = b; }
    if (body.category !== undefined && VALID_CATEGORIES.includes(body.category as Category)) {
      updates.category = body.category as string;
    }
    if ('pillar' in body) {
      updates.pillar = body.pillar && VALID_PILLARS.includes(body.pillar as Pillar) ? body.pillar as string : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nessun campo valido da aggiornare.' }, { status: 400 });
    }

    const { data, error } = await db
      .schema('commons')
      .from('post')
      .update(updates)
      .eq('id', postId)
      .eq('tenant_id', tenantId)
      .select('id, tenant_id, status, title, category')
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data });
  }

  // WORKER: forbidden
  const workerAuth = await requireWorkerUser(request);
  if (!isKoraAuthError(workerAuth)) {
    return NextResponse.json({ ok: false, error: 'Forbidden — i worker non possono modificare contenuti in KORA Commons.' }, { status: 403 });
  }

  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}
