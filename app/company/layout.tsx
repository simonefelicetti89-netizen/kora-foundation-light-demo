// app/company/layout.tsx — Server Component.
// B137: Converted from 'use client' to server-side guard — eliminates auth flicker.
//
// Gate: requireCompanyUser() validates the Supabase session and kora_role before
// any HTML is sent to the client. Unauthenticated or wrong-role users are redirected
// server-side — children never render for unauthorized requests.
//
// Post-B130: /company/* is live-only. No demo paths exist here anymore.
// Demo experience lives at /demo/company/* — this layout has no demo-state logic.

import { redirect }                                         from 'next/navigation';
import { requireCompanyUser, getCurrentKoraUser,
         isKoraAuthError }                                  from '@/lib/auth/kora-session';
import { getSupabaseServiceClient }                         from '@/lib/supabase/server';
import { CompanySessionProvider }                           from './_providers/CompanySessionProvider';

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireCompanyUser();

  if (isKoraAuthError(auth)) {
    // KORA_ADMIN navigating to /company/* by mistake — send to admin area.
    const admin = await getCurrentKoraUser();
    if (admin?.koraRole === 'KORA_ADMIN') {
      redirect('/admin');
    }
    // Unauthenticated (401) or wrong role (403) → unified login with company hint.
    redirect('/login?role_hint=company');
  }

  // Company name: resolved server-side so CompanySessionProvider needs no async detection.
  let companyName: string | null = null;
  try {
    const db = getSupabaseServiceClient();
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
