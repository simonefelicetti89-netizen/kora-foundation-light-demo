// A-07: Company Workspace Admin — vista workspace autenticata company.
// Scopo: consentire a KORA Admin di visualizzare il workspace
//        di una company specifica per revisione operativa.
// app/admin/company-workspace/page.tsx
// B14 — Spazio azienda: pilot flow orchestration — KORA_ADMIN only.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyWorkspacePanel } from './_components/CompanyWorkspacePanel';
import { redirect } from 'next/navigation';

export default async function CompanyWorkspacePage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <CompanyWorkspacePanel userEmail={auth.email} userRole={auth.koraRole} />;
}
