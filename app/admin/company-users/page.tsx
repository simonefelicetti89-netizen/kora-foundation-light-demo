// A-10: Company Users — REDIRECT (B168.5 Phase 2.3)
// company-users usa tenantId (UUID) internamente, non tenantCode.
// Se il link include ?tenantCode= (raro), redirect al drill-in specifico.
// Altrimenti → companies list con ?from=users.

import { redirect } from 'next/navigation';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';

export default async function CompanyUsersPage({
  searchParams,
}: {
  searchParams: { tenantCode?: string; tenantId?: string };
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const tc = searchParams?.tenantCode;
  if (tc) redirect(`/admin/companies/${encodeURIComponent(tc)}/users`);
  redirect('/admin/companies?from=users');
}
