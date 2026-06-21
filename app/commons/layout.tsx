// app/commons/layout.tsx
// B185: Auth guard for KORA Commons shared preview routes.
//
// /commons and /commons/publish are shared network preview routes — not public.
// They contain synthetic demo data labelled as "Rete pilota dimostrativa" but
// must not be accessible without a KORA session.
//
// Guard: any authenticated KORA user is admitted (KORA_ADMIN primary live role).
// Middleware already redirects WORKER/COMPANY_ADMIN/PARTNER/DEMO_VIEWER away
// from /commons before this layout runs, so in practice KORA_ADMIN is the
// primary live user who reaches this layout.
// Unauthenticated (no session) → redirect to /login.

import { redirect } from 'next/navigation';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';

export default async function CommonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentKoraUser();

  if (!user) {
    redirect('/login?next=/commons');
  }

  return <>{children}</>;
}
