// A-DEMO-01-WS: ACME-001 Demo Workspace — preview workspace company.
// Scopo: mostrare come appare il workspace company di ACME-001
//        da prospettiva Company Admin, con dati sintetici.
// app/admin/demo/acme-001/company-workspace/page.tsx
// B40 — ACME-001 demo company workspace preview. KORA_ADMIN only.
// Shows what a Company Admin would see — synthetic data, no live DB queries.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { AcmeWorkspacePreview } from './_components/AcmeWorkspacePreview';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Company Workspace Preview — ACME-001 · KORA Admin',
};

export default async function AcmeWorkspacePage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <AcmeWorkspacePreview userEmail={auth.email} />;
}
