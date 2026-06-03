// A-09: Submission Queue — coda submission file aziendali.
// Scopo: gestire i file inviati dalle aziende (intake iniziale),
//        classificarli e avviarli nella pipeline Data Intake.
// app/admin/company-submissions/page.tsx
// B39 — Company submission review queue. KORA_ADMIN only.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { AdminSubmissionQueue } from './_components/AdminSubmissionQueue';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Company Submissions — KORA Admin',
};

export default async function CompanySubmissionsPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <AdminSubmissionQueue userEmail={auth.email} />;
}
