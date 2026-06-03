// A-08: Company Live Preview — anteprima live del cockpit company.
// Scopo: mostrare a KORA Admin come appare il cockpit di una company
//        prima di consegnarlo. Read-only, nessuna azione.
// app/admin/company-live-preview/page.tsx
// B20 — Company Live Preview. KORA_ADMIN only.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyLivePreviewPanel } from './_components/CompanyLivePreviewPanel';
import { redirect } from 'next/navigation';

export default async function CompanyLivePreviewPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <CompanyLivePreviewPanel />;
}
