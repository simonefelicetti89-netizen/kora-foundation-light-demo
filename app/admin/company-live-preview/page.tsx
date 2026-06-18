// A-08: Company Live Preview — REDIRECT (B168.5 Phase 2.3)
// Inbound links con ?tenantCode= vengono reindirizzati al drill-in Gen 3.
// Backward-compatible: link senza tenantCode → companies list con ?from=preview.

import { redirect } from 'next/navigation';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';

export default async function CompanyLivePreviewPage({
  searchParams,
}: {
  searchParams: { tenantCode?: string; reportingPeriod?: string };
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tc = searchParams?.tenantCode;
  if (tc) redirect(`/admin/companies/${encodeURIComponent(tc)}/preview`);
  redirect('/admin/companies?from=preview');
}
