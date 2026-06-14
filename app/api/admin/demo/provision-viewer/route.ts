// app/api/admin/demo/provision-viewer/route.ts — B129
// POST /api/admin/demo/provision-viewer
// KORA_ADMIN only. Provisions a DEMO_VIEWER Supabase user.
//
// DEMO_VIEWER:
//   app_metadata: { kora_role: 'DEMO_VIEWER', kora_status: 'active' }
//   No kora_tenant_id — DEMO_VIEWER has no live tenant association.
//   /demo pages are synth-only; structural isolation enforced by role guard.
//
// Idempotent on email. 409 if email already has a live role (any non-DEMO_VIEWER role).
// Metadata failure → explicit warning in response (never silent "provisioned").

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const LIVE_ROLES = ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER'] as const;

export async function POST(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY non configurata. Provisioning non disponibile.' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON body non valido.' }, { status: 400 });
  }

  const email     = typeof body['email']     === 'string' ? body['email'].trim().toLowerCase()     : '';
  const viewerName = typeof body['viewer_name'] === 'string' ? body['viewer_name'].trim()           : null;

  if (!email) {
    return NextResponse.json({ error: 'email è obbligatoria.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'email non valida.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();
  const warnings: string[] = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let userId: string;
  let inviteStatus: 'sent' | 'existing' | 'not_sent';

  const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: { viewer_name: viewerName ?? '' },
  });

  if (inviteData?.user) {
    userId       = inviteData.user.id;
    inviteStatus = 'sent';
  } else {
    const isAlreadyRegistered =
      inviteErr?.status === 422 ||
      inviteErr?.message?.toLowerCase().includes('already') ||
      inviteErr?.message?.toLowerCase().includes('registered');

    if (isAlreadyRegistered) {
      const { data: usersData, error: listErr } = await db.auth.admin.listUsers({
        page: 1, perPage: 1000,
      });
      if (listErr) {
        return NextResponse.json(
          { error: `Impossibile verificare utente esistente: ${listErr.message}` },
          { status: 500 },
        );
      }

      const existing = usersData?.users?.find((u) => u.email === email);
      if (!existing) {
        return NextResponse.json(
          { error: 'Utente non trovato dopo errore di email duplicata.' },
          { status: 500 },
        );
      }

      // 409 if the email already belongs to a live role — structural isolation requires separation.
      const existingMeta = existing.app_metadata as Record<string, unknown> | undefined;
      const existingRole = existingMeta?.kora_role as string | undefined;
      const isLiveRole   = LIVE_ROLES.includes(existingRole as typeof LIVE_ROLES[number]);

      if (isLiveRole) {
        return NextResponse.json(
          {
            error: `${email} è già registrata con il ruolo live "${existingRole}". Un'identità demo non può condividere l'account con un ruolo live. Usare un indirizzo email diverso.`,
            provisioningStatus: 'conflict',
            existing_role:      existingRole,
          },
          { status: 409 },
        );
      }

      // Already a DEMO_VIEWER — idempotent re-provisioning allowed.
      userId       = existing.id;
      inviteStatus = 'existing';
    } else {
      // SMTP not configured or transient error — create without invite.
      warnings.push(
        `Invito email non inviato (${inviteErr?.message ?? 'SMTP non configurato'}). ` +
        'Inviare manualmente il link di accesso da Supabase Dashboard.',
      );

      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
      });

      if (createErr || !created?.user) {
        return NextResponse.json(
          {
            ok:                 false,
            provisioningStatus: 'partial_failure',
            error:    `Creazione utente fallita: ${createErr?.message ?? 'unknown'}`,
            warnings,
          },
          { status: 207 },
        );
      }

      userId       = created.user.id;
      inviteStatus = 'not_sent';
    }
  }

  // Set app_metadata — server-controlled, never writable by client.
  // No kora_tenant_id: DEMO_VIEWER has no live tenant association.
  const { error: metaErr } = await db.auth.admin.updateUserById(userId, {
    app_metadata: {
      kora_role:   'DEMO_VIEWER',
      kora_status: 'active',
    },
  });

  if (metaErr) {
    // Metadata failure is never silently swallowed — caller must act on warning.
    warnings.push(
      `app_metadata non aggiornato: ${metaErr.message}. ` +
      'Aggiornare manualmente il ruolo da Supabase Auth Dashboard (kora_role: DEMO_VIEWER).',
    );

    return NextResponse.json(
      {
        ok:                 false,
        provisioningStatus: 'partial_failure',
        userId,
        inviteStatus,
        error:    'Metadata non impostato — utente creato ma ruolo DEMO_VIEWER non assegnato.',
        recovery: 'Aggiornare manualmente app_metadata.kora_role = DEMO_VIEWER da Supabase Dashboard.',
        warnings,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    ok:                 true,
    provisioningStatus: 'provisioned',
    userId,
    email,
    koraRole:           'DEMO_VIEWER',
    inviteStatus,
    warnings,
    links: {
      demoArea:   '/demo',
      adminUsers: '/admin/users',
    },
  });
}
