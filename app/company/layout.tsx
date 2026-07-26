// app/company/layout.tsx — Server Component.
// B137: Converted from 'use client' to server-side guard — eliminates auth flicker.
//
// Gate: requireCompanyUser() validates the Supabase session and kora_role before
// any HTML is sent to the client. Unauthenticated or wrong-role users are redirected
// server-side — children never render for unauthorized requests.
//
// B168-P3: KORA_ADMIN admitted for service access (defense in depth layer 2).
// Previously redirected to /admin. Now passes through with audit log + banner.
// Worker-individual data remains absolutely blocked (see app/worker/layout.tsx).
//
// Post-B130: /company/* is live-only. No demo paths exist here anymore.
// Demo experience: use VISTA role switcher → /company/* (same routes, no separate demo copy).

import type { Metadata }                                    from 'next';
import { redirect }                                         from 'next/navigation';
import { cookies, headers }                                  from 'next/headers';
import { requireCompanyUser, getCurrentKoraUser,
         isKoraAuthError }                                  from '@/lib/auth/kora-session';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};
import { canAccess }                                        from '@/lib/auth/access-matrix';
import { logServiceAccess }                                 from '@/lib/audit/log-access';
import { getSupabaseServerClient }                          from '@/lib/supabase/server';
import { CompanySessionProvider }                           from './_providers/CompanySessionProvider';
import { PrivilegedAccessBanner }                           from '@/components/auth/PrivilegedAccessBanner';
import type { KoraEnvironment }                             from '@/lib/auth/access-matrix';

// Resolves the current environment from env var — defaults to 'demo' in Foundation Light.
function resolveEnvironment(): KoraEnvironment {
  const raw = process.env.NEXT_PUBLIC_KORA_ENV ?? 'demo';
  if (raw === 'live' || raw === 'future') return raw;
  return 'demo';
}

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireCompanyUser();

  // ── COMPANY_ADMIN path (standard, unchanged) ────────────────────────────────
  if (!isKoraAuthError(auth)) {
    let companyName: string | null = null;
    try {
      const db = await getSupabaseServerClient();
      const { data } = await db
        .schema('analytics')
        .from('tenant')
        .select('company_name')
        .eq('id', auth.tenantId)
        .maybeSingle();
      companyName = (data as { company_name?: string } | null)?.company_name ?? null;
    } catch { /* companyName stays null — shown as "La tua organizzazione" downstream */ }

    return (
      <CompanySessionProvider
        tenantId={auth.tenantId}
        koraRole={auth.koraRole}
        companyName={companyName}
      >
        {children}
      </CompanySessionProvider>
    );
  }

  // ── KORA_ADMIN service access path ─────────────────────────────────────────
  const admin = await getCurrentKoraUser();
  if (admin?.koraRole === 'KORA_ADMIN') {
    const env = resolveEnvironment();
    const decision = canAccess('KORA_ADMIN', 'company_kpi_kora_index', env);

    // Always true per access matrix — but guard defensively.
    if (!decision.allowed) {
      redirect('/admin');
    }

    // Resolve tenantId: KORA_ADMIN session has no kora_tenant_id in JWT.
    // Read from cookie set by admin navigation (kora-service-tenant-id).
    // If not set: redirect to admin company selector.
    const cookieStore = await cookies();
    const serviceTenantId = cookieStore.get('kora-service-tenant-id')?.value ?? null;

    if (!serviceTenantId) {
      redirect('/admin/companies?reason=select_tenant_for_service_access');
    }

    // Fire-and-forget audit log — non-blocking (fail open).
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? undefined;
    const ua = h.get('user-agent') ?? undefined;
    void logServiceAccess({
      actorId:     admin.id,
      actorRole:   'KORA_ADMIN',
      resource:    'company_kpi_kora_index',
      tenantId:    serviceTenantId,
      environment: env,
      action:      'service_access',
      ipAddress:   ip,
      userAgent:   ua,
    });

    let companyName: string | null = null;
    try {
      const db = await getSupabaseServerClient();
      const { data } = await db
        .schema('analytics')
        .from('tenant')
        .select('company_name')
        .eq('id', serviceTenantId)
        .maybeSingle();
      companyName = (data as { company_name?: string } | null)?.company_name ?? null;
    } catch { /* companyName stays null */ }

    return (
      <CompanySessionProvider
        tenantId={serviceTenantId}
        koraRole="KORA_ADMIN"
        companyName={companyName}
        adminServiceAccess={true}
      >
        {decision.banner && <PrivilegedAccessBanner variant={decision.banner} />}
        {children}
      </CompanySessionProvider>
    );
  }

  // ── Not authorized ──────────────────────────────────────────────────────────
  redirect('/login?role_hint=company');
}
