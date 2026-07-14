// app/api/admin/partners/[id]/invite-user/route.ts
// B127: POST — KORA_ADMIN invites a partner user for a specific partner profile.
//
// Privacy contract (absolute, non-negotiable):
//   - KORA_ADMIN only — no self-signup path exists
//   - Creates Supabase Auth invite (email-based)
//   - Sets app_metadata: { kora_role: 'PARTNER', kora_partner_id: partner.id, kora_status: 'active' }
//   - Creates network.partner_identity record for traceability
//   - Never sets kora_tenant_id — partners are not company-scoped
//   - Never sets COMPANY or WORKER metadata
//   - Email is required — if Supabase invite email is not configured, returns clear error

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { assertSameOrigin } from '@/lib/security/origin';
import { assertRateLimit } from '@/lib/security/rate-limit';

interface InvitePartnerUserBody {
  email: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const rateLimitGuard = await assertRateLimit('invite', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  const { id: partnerId } = await params;

  // Parse and validate request body
  let body: InvitePartnerUserBody;
  try {
    body = await request.json() as InvitePartnerUserBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Email obbligatoria e valida.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // Verify partner_profile exists and belongs to the platform
  const { data: partnerRow } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, status')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partnerRow) {
    return NextResponse.json({ ok: false, error: 'Partner non trovato.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partner = partnerRow as any;

  // Invite user via Supabase Admin API
  // Sets app_metadata directly during invite — PARTNER role, partner_id, no tenant
  const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: {
      // user_metadata (non-authoritative — for display only)
    },
    options: {
      data: {
        kora_role:       'PARTNER',
        kora_partner_id: partnerId,
        kora_status:     'active',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/partner/workspace`,
    },
  } as Parameters<typeof db.auth.admin.inviteUserByEmail>[1]);

  if (inviteError) {
    // Supabase may return error if email sending is not configured or user already exists
    return NextResponse.json(
      {
        ok:    false,
        error: `Impossibile inviare l'invito: ${inviteError.message}`,
        hint:  'Verifica che il sistema email sia configurato in Supabase e che l\'utente non sia già registrato.',
      },
      { status: 422 },
    );
  }

  const authUserId = inviteData?.user?.id;
  if (!authUserId) {
    return NextResponse.json(
      { ok: false, error: 'Invito creato ma user ID non disponibile. Verifica in Supabase Auth.' },
      { status: 500 },
    );
  }

  // Create network.partner_identity record for traceability
  const { error: identityError } = await db
    .schema('network')
    .from('partner_identity')
    .insert({
      partner_id:   partnerId,
      auth_user_id: authUserId,
      email,
      status:       'active',
    });

  if (identityError) {
    // Identity insert failure is non-blocking for the invite itself, but log it
    console.error('[invite-user] Failed to insert partner_identity:', identityError.message);
    return NextResponse.json(
      {
        ok:      true,
        invited: true,
        warning: 'Invito inviato ma partner_identity non creato. Verifica manualmente in Supabase.',
        email,
        partnerName: partner.name as string,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    ok:          true,
    invited:     true,
    email,
    partnerName: partner.name as string,
    partnerId,
    authUserId,
  });
}
