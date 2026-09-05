// app/commons/layout.tsx
// B185: Auth guard for KORA Commons shared preview routes.
//
// /commons and /commons/publish are shared network preview routes — not public.
// They contain synthetic demo data labelled as "Rete pilota dimostrativa" but
// must not be accessible without a KORA session.
//
// Guard: any authenticated KORA user is admitted (KORA_ADMIN primary live role).
// Middleware already redirects WORKER/COMPANY_ADMIN/PARTNER away from
// /commons before this layout runs, so in practice KORA_ADMIN is the
// primary live user who reaches this layout. (DEMO_VIEWER, retired by CC-00
// on 2026-09-26, used to be redirected here too — no longer a real role.)
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
