// app/worker/layout.tsx
// B104: Worker route layout — server-side session gate.
// Workers are redirected here from middleware. Non-workers cannot reach /worker/*.
//
// B117-B: Redirect target changed from /worker/login to /login (unified entry).
// This breaks the previous loop where /worker/login was inside this layout:
//   Before: unauthenticated → /worker/login → layout: redirect /worker/login → loop
//   After:  unauthenticated → any /worker/* route → layout: redirect /login → no loop
//
// B141-B2: KORA_ADMIN is not permitted to see live worker data.
// Instead of redirecting to /login (confusing for founder), redirect to /my-kora
// which shows the Foundation Light synthetic worker preview.
// requireWorkerUser() is NOT modified — WORKER gate is unchanged.

import { redirect } from 'next/navigation';
import { getCurrentWorkerUser, getCurrentKoraUser } from '@/lib/auth/kora-session';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  // KORA_ADMIN attempting /worker/* is redirected to the synthetic worker preview.
  // Live worker data stays worker-only. getCurrentKoraUser() returns null for all non-admin.
  const koraAdmin = await getCurrentKoraUser();
  if (koraAdmin) {
    redirect('/my-kora');
  }

  const worker = await getCurrentWorkerUser();
  if (!worker) {
    redirect('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {children}
    </div>
  );
}
