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

const FROM_LABELS: Record<string, string> = {
  workspace:   'Spazio Azienda',
  preview:     'Company Live Preview',
  evidence:    'Evidence Archive',
  submissions: 'Company Submissions',
  users:       'Gestione Utenti',
};

export const metadata = {
  title: 'Company Console — KORA Admin',
};

export default async function CompanyConsolePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const fromSection = searchParams?.from && FROM_LABELS[searchParams.from]
    ? FROM_LABELS[searchParams.from]
    : null;

  return (
    <>
      {fromSection && (
        <div className="mb-4 rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.06)] px-4 py-3 text-xs text-[rgba(6,3,43,0.78)] leading-relaxed">
          <span className="font-semibold text-[#C76F3D]">{fromSection}</span>
          {' '}è ora accessibile dal drill-in dell&apos;azienda specifica.
          Seleziona un&apos;azienda per aprire la sezione.
        </div>
      )}
      <WorkforceQuickAccessPanel />
      <CompanyConsolePanel userEmail={auth.email} />
    </>
  );
}
