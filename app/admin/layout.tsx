// app/admin/layout.tsx — Server Component.
// Two-layer admin protection:
//   Layer 1 (this file, server-side): requireKoraAdmin() validates Supabase session
//     and kora_role=KORA_ADMIN from app_metadata. Anonymous or non-admin users
//     never reach the admin workspace — they see an auth error page.
//   Layer 2 (AdminDemoGuard, client-side): useRole() demo-state guard for role
//     switcher scenarios during demo/pilot sessions.
//
// Do not remove either layer. Both are required for correct admin access control.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { AdminDemoGuard } from './_components/AdminDemoGuard';
import { SessionBar } from '@/components/auth/SessionBar';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Layer 1: server-side Supabase auth — blocks anonymous and non-KORA_ADMIN users
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    const is403 = auth.status === 403;
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
          {is403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">
          {is403
            ? "Quest'area è riservata agli operatori KORA Admin."
            : 'Effettua il login come operatore KORA Admin per accedere a questo workspace.'}
        </p>
        <Link
          href="/admin/login"
          className="inline-block mt-2 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Vai al login KORA Admin
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
