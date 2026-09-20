// app/api/company/living-koral/editions/route.ts
// KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
//
// GET  — list the Company's own Editions archive (own tenant only, RLS-enforced).
// POST — create a new, named, immutable Edition from the Company's current
//        latest recognized transformation (validated SECURITY DEFINER
//        write path, migration 085 — never a raw INSERT).
//
// Tenant is ALWAYS derived from the authenticated session
// (requireCompanyUser()'s own auth.tenantId) — never from a request body
// or query param, matching every other /api/company/* route's own
// established convention (e.g. app/api/company/workspace/route.ts).
//
// KORA_ADMIN read (via the existing company-impersonation path) is
// intentionally NOT served by this route — mirroring the read side of
// WP-114's own page.tsx, KORA_ADMIN inspection happens through the Server
// Component page directly (resolveCompanyTenantId()), not through this
// client-facing API route, since requireCompanyUser() only ever accepts a
// real COMPANY_ADMIN session. This route's own POST is COMPANY_ADMIN-only
// by construction (requireCompanyUser() itself; the SECURITY DEFINER
// function underneath re-validates the same role a second time,
// independently, at the DB layer).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { listLivingKoralEditionsForTenant, createLivingKoralEdition } from '@/lib/living-koral-edition/edition-service';
import { toEditionView } from '@/lib/living-koral-edition/edition-view';

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const editions = await listLivingKoralEditionsForTenant(auth.tenantId);
    return NextResponse.json({ ok: true, editions: editions.map(toEditionView) });
  } catch {
    return NextResponse.json({ ok: false, error: 'Impossibile caricare le Edizioni Living KORAL.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const name = typeof (body as { name?: unknown })?.name === 'string' ? (body as { name: string }).name : '';
  const idempotencyKey = typeof (body as { idempotencyKey?: unknown })?.idempotencyKey === 'string'
    ? (body as { idempotencyKey: string }).idempotencyKey
    : '';

  if (!idempotencyKey) {
    return NextResponse.json({ ok: false, error: 'Richiesta non valida — chiave di idempotenza mancante.' }, { status: 400 });
  }

  const result = await createLivingKoralEdition({ tenantId: auth.tenantId, name, idempotencyKey });

  switch (result.kind) {
    case 'created':
      return NextResponse.json({ ok: true, edition: toEditionView(result.edition) }, { status: 201 });
    case 'replayed':
      return NextResponse.json({ ok: true, edition: toEditionView(result.edition) }, { status: 200 });
    case 'conflict':
      return NextResponse.json({ ok: false, error: 'Questa richiesta è già stata inviata con un nome diverso.' }, { status: 409 });
    case 'in_progress':
      return NextResponse.json({ ok: false, error: 'Creazione già in corso.' }, { status: 409 });
    case 'no_recognized_transformation':
      return NextResponse.json({ ok: false, error: 'Nessuna trasformazione organizzativa riconosciuta da preservare al momento.' }, { status: 422 });
    case 'invalid_name':
      return NextResponse.json({ ok: false, error: 'Il nome dell\'Edizione non è valido.' }, { status: 400 });
  }
}
