// A-01: Company Console — lista di tutte le aziende nel portafoglio KORA.
// Scopo: fornire a KORA Admin la vista operativa di ogni azienda con stato
//        pipeline, readiness dati, safeguard e next action operativa.
// app/admin/companies/page.tsx
// B37 — KORA Admin Company Console — live tenant registry.
// Replaces B9/A-15 demo page with real server-auth protected page.
// KORA_ADMIN only. No demo fallback.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyConsolePanel } from './_components/CompanyConsolePanel';
import { WorkforceQuickAccessPanel } from '@/components/admin/WorkforceQuickAccessPanel';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Company Console — KORA Admin',
};

export default async function CompanyConsolePage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return (
    <>
      <WorkforceQuickAccessPanel />
      <CompanyConsolePanel userEmail={auth.email} />
    </>
  );
}
