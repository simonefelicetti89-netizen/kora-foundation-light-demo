// A-09: Company Submissions — REDIRECT (B168.5 Phase 2.3)
// Inbound links vengono reindirizzati al drill-in Gen 3 o alla companies list.
// Backward-compatible: link senza tenantCode → companies list con ?from=submissions.

import { redirect } from 'next/navigation';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';

export default async function CompanySubmissionsPage({
  searchParams,
}: {
  searchParams: { tenantCode?: string };
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tc = searchParams?.tenantCode;
  if (tc) redirect(`/admin/companies/${encodeURIComponent(tc)}/submissions`);
  redirect('/admin/companies?from=submissions');
}
