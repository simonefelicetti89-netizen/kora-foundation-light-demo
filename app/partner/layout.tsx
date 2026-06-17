// app/partner/layout.tsx — Server Component.
// B137: Converted from 'use client' to server-side guard — eliminates blank-flash flicker.
//
// Gate: requirePartnerUser() validates the Supabase session and kora_role=PARTNER
// before any HTML is sent to the client. Unauthorized users are redirected
// server-side — children never render for unauthenticated or wrong-role requests.
//
// KORA_ADMIN admin preview of the partner workspace is available at:
//   /admin/preview/partner/workspace — not via this layout.

import type { Metadata }                                 from 'next';
import { redirect }                                      from 'next/navigation';
import { requirePartnerUser, getCurrentKoraUser,
         isKoraAuthError }                               from '@/lib/auth/kora-session';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const auth = await requirePartnerUser();

  if (isKoraAuthError(auth)) {
    // KORA_ADMIN navigating to /partner/* by mistake — send to admin area.
    const admin = await getCurrentKoraUser();
    if (admin?.koraRole === 'KORA_ADMIN') {
      redirect('/admin');
    }
    // Unauthenticated (401) or wrong role (403) → unified login with partner hint.
    redirect('/login?role_hint=partner');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {children}
    </div>
  );
}
