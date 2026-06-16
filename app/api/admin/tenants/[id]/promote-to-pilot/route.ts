// app/api/admin/tenants/[id]/promote-to-pilot/route.ts
//
// B162 — Promozione esplicita di un tenant a Pilot+.
//
// POST /api/admin/tenants/[id]/promote-to-pilot
//   Auth:       KORA_ADMIN only (requireKoraAdmin).
//   Client DB:  getSupabaseServerClient — RLS-respecting.
//               analytics.tenant UPDATE coperto da "kora_admin_all_tenants" (FOR ALL).
//               audit.audit_log INSERT coperto da "kora_admin_insert_audit" (mig 021).
//   Body:       nessuno — l'azione è determinata dall'URL.
//   Idempotente: chiamata ripetuta → 200 con already_pilot: true e timestamp originale.
//
// Pilot+ significa: pipeline reale applicata (mig 016-019), worker pseudonymization
// attiva, per-worker UEF records disponibili. Il founder applica mig 021 al pilot
// prima di chiamare questa route.
//
// Audit: ogni promozione scrive una riga in audit.audit_log con:
//   action       = 'tenant_promoted_to_pilot'
//   resource_type = 'tenant'
//   payload      = { before_state, after_state, promoted_at }

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type TenantRow = {
  id:                  string;
  tenant_code:         string;
  production_ready:    boolean;
  production_ready_at: string | null;
  production_ready_by: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const { id: tenantId } = await params;
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant id obbligatorio nel path.' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = await getSupabaseServerClient();

  // ── Legge stato corrente ──────────────────────────────────────────────────
  const { data: tenant, error: readErr }: { data: TenantRow | null; error: unknown } =
    await db
      .schema('analytics')
      .from('tenant')
      .select('id, tenant_code, production_ready, production_ready_at, production_ready_by')
      .eq('id', tenantId)
      .is('deleted_at', null)
      .single();

  if (readErr || !tenant) {
    return NextResponse.json(
      { error: 'Tenant non trovato o già eliminato.' },
      { status: 404 },
    );
  }

  // ── Idempotenza: già Pilot+ → risponde con timestamp originale ────────────
  if (tenant.production_ready) {
    return NextResponse.json({
      ok:           true,
      tenant_id:    tenant.id,
      tenant_code:  tenant.tenant_code,
      already_pilot: true,
      promoted_at:  tenant.production_ready_at,
      promoted_by:  tenant.production_ready_by,
    });
  }

  // ── Promozione ────────────────────────────────────────────────────────────
  const promotedAt = new Date().toISOString();
  const promotedBy = auth.id;

  const { error: updateErr } = await db
    .schema('analytics')
    .from('tenant')
    .update({
      production_ready:    true,
      production_ready_at: promotedAt,
      production_ready_by: promotedBy,
      updated_at:          promotedAt,
    })
    .eq('id', tenantId);

  if (updateErr) {
    return NextResponse.json(
      { error: 'Promozione fallita — aggiornamento tenant non riuscito.' },
      { status: 500 },
    );
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  // Policy "kora_admin_insert_audit" (mig 021) consente INSERT via server client.
  const { error: auditErr } = await db
    .schema('audit')
    .from('audit_log')
    .insert({
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      auth.id,
      action:        'tenant_promoted_to_pilot',
      resource_type: 'tenant',
      resource_id:   tenantId,
      payload: {
        before_state: { production_ready: false },
        after_state:  { production_ready: true },
        promoted_at:  promotedAt,
        tenant_code:  tenant.tenant_code,
      },
    });

  if (auditErr) {
    // Audit failure non blocca la risposta — la promozione è già avvenuta.
    // Logging applicativo per visibilità operativa.
    console.error('[promote-to-pilot] audit_log write failed:', auditErr, {
      tenant_id:   tenantId,
      promoted_by: promotedBy,
      promoted_at: promotedAt,
    });
  }

  return NextResponse.json({
    ok:           true,
    tenant_id:    tenant.id,
    tenant_code:  tenant.tenant_code,
    already_pilot: false,
    promoted_at:  promotedAt,
    promoted_by:  promotedBy,
  });
}
