// app/advisor/layout.tsx
// KORA-WP-030 — Advisor route-tree root. Begins `app/advisor` (did not exist
// before this WP).
//
// Reuses requireAdvisorUser() (KORA-WP-002) unchanged — no new auth concept,
// no duplicate role-check logic. This guard proves only "this authenticated
// identity carries the ADVISOR role"; it does not (and per its own header
// comment, deliberately does not) resolve an advisor_identity row — that
// resolution happens inside app/advisor/page.tsx via the trusted
// requireAdvisorUser().id, never a client-supplied value.

import { redirect } from 'next/navigation';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdvisorUser();
  if (isKoraAuthError(auth)) {
    redirect('/login?role_hint=advisor');
  }

  return <div style={{ minHeight: '100vh' }}>{children}</div>;
}
