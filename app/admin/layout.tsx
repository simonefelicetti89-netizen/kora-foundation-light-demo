// app/admin/layout.tsx — Server Component.
// Two-layer admin protection:
//   Layer 1 (this file, server-side): requireKoraAdmin() validates Supabase session
//     and kora_role=KORA_ADMIN from app_metadata. Anonymous or non-admin users
//     never reach the admin workspace — they see an auth error page.
//   Layer 2 (AdminDemoGuard, client-side): useRole() demo-state guard for role
//     switcher scenarios during demo/pilot sessions.
//
// Do not remove either layer. Both are required for correct admin access control.

import type { Metadata } from 'next';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { AdminDemoGuard } from './_components/AdminDemoGuard';
import { SessionBar } from '@/components/auth/SessionBar';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Layer 1: server-side Supabase auth — blocks anonymous and non-KORA_ADMIN users
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    const is403 = auth.status === 403;

    // B117-B: unauthenticated (401) → redirect to unified login.
    // This also handles /admin/login itself: since /admin/login is inside this layout,
    // unauthenticated access redirects to /login?role_hint=admin rather than showing
    // "Sessione non trovata". No more broken button or redirect loop.
    if (!is403) {
      redirect('/login?role_hint=admin');
    }

    // 403: wrong role (e.g. COMPANY_ADMIN trying to access admin area).
    // Show a clear error with a link to the correct login.
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
          Accesso non autorizzato
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">
          Quest&apos;area è riservata agli operatori KORA Admin. Accedi con un account KORA_ADMIN.
        </p>
        <Link
          href="/login?role_hint=admin"
          className="inline-block mt-2 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Vai al login KORA
        </Link>
      </div>
    );
  }

  // Layer 2: demo-state guard (client-side role switcher protection)
  return (
    <>
      <SessionBar email={auth.email} role={auth.koraRole} />
      <AdminDemoGuard>{children}</AdminDemoGuard>
    </>
  );
}
