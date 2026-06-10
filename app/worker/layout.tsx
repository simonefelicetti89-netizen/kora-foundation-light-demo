// app/worker/layout.tsx
// B104: Worker route layout — server-side session gate.
// Workers are redirected here from middleware. Non-workers cannot reach /worker/*.

import { redirect } from 'next/navigation';
import { getCurrentWorkerUser } from '@/lib/auth/kora-session';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const worker = await getCurrentWorkerUser();
  if (!worker) {
    redirect('/company/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {children}
    </div>
  );
}
