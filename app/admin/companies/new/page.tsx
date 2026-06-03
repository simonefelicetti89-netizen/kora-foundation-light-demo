// A-01a: New Company — form di creazione azienda live.
// Scopo: consentire a KORA Admin di creare un nuovo tenant company
//        con dati minimi (nome, sector, headcount, email admin).
// app/admin/companies/new/page.tsx
// B38 — Create live company — KORA_ADMIN only.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { CreateLiveCompanyForm } from './_components/CreateLiveCompanyForm';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Crea Azienda Live — KORA Admin',
};

export default async function CreateLiveCompanyPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <CreateLiveCompanyForm userEmail={auth.email} />;
}
