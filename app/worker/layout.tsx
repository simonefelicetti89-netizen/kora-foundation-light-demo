// app/worker/layout.tsx
// B104: Worker route layout — server-side session gate.
// Workers are redirected here from middleware. Non-workers cannot reach /worker/*.
//
// B117-B: Redirect target changed from /worker/login to /login (unified entry).
// This breaks the previous loop where /worker/login was inside this layout:
//   Before: unauthenticated → /worker/login → layout: redirect /worker/login → loop
//   After:  unauthenticated → any /worker/* route → layout: redirect /login → no loop

import { redirect } from 'next/navigation';
import { getCurrentWorkerUser } from '@/lib/auth/kora-session';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
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
