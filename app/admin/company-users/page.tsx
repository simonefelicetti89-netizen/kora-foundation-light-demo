// A-10: Company Users — provisioning utenti aziendali.
// Scopo: gestire l'accesso degli utenti company (admin/viewer)
//        al workspace KORA della loro azienda.
// app/admin/company-users/page.tsx
// B36 PART 3 — Company user provisioning — KORA_ADMIN only.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyUserProvisioningPanel } from './_components/CompanyUserProvisioningPanel';
import Link from 'next/link';

export default async function CompanyUsersPage() {
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
          {auth.status === 403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
        </h1>
        <Link href="/admin/login"
          className="inline-block mt-2 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.88)] transition-colors">
          Vai al login
        </Link>
      </div>
    );
  }

  return <CompanyUserProvisioningPanel userEmail={auth.email} userRole={auth.koraRole} />;
}
