// app/admin/companies/page.tsx
// B37 — KORA Admin Company Console — live tenant registry.
// Replaces B9/A-15 demo page with real server-auth protected page.
// KORA_ADMIN only. No demo fallback.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyConsolePanel } from './_components/CompanyConsolePanel';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Company Console — KORA Admin',
};

export default async function CompanyConsolePage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <CompanyConsolePanel userEmail={auth.email} />;
}
