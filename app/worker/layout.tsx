// app/worker/layout.tsx
// B104: Worker route layout — server-side session gate.
// Workers are redirected here from middleware. Non-workers cannot reach /worker/*.
//
// B117-B: Redirect target changed from /worker/login to /login (unified entry).
// This breaks the previous loop where /worker/login was inside this layout:
//   Before: unauthenticated → /worker/login → layout: redirect /worker/login → loop
//   After:  unauthenticated → any /worker/* route → layout: redirect /login → no loop
//
// B168-P3: KORA_ADMIN attempting /worker/* is hard-blocked — not redirected.
// Worker individual data is not accessible to the KORA service team by design.
// Middleware (layer 1) already blocked this path; this is layer 2 of defense in depth.

import { redirect } from 'next/navigation';
import { getCurrentWorkerUser, getCurrentKoraUser } from '@/lib/auth/kora-session';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  // B168-P3: Hard block for KORA_ADMIN — explicit error, not a redirect.
  // canAccess('KORA_ADMIN', 'worker_individual_pib', *) is DENY in all environments.
  const koraAdmin = await getCurrentKoraUser();
  if (koraAdmin) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 border border-red-200 rounded-xl bg-red-50 shadow-sm space-y-4">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
            Accesso negato · Dato individuale worker
          </p>
          <h1 className="text-lg font-semibold text-red-900">
            Worker individual data is not accessible to KORA service team by design.
          </h1>
          <p className="text-sm text-red-700 leading-relaxed">
            I dati personali dei worker (PIB, UEF, profilo individuale) non sono accessibili
            tramite account KORA_ADMIN. Questo blocco è architetturale e non dipende dall&apos;ambiente.
          </p>
        </div>
        <p className="text-[10px] text-red-400 pt-1 font-mono">
          access_matrix: worker_individual_pib → KORA_ADMIN → DENY (all environments)
        </p>
      </div>
    );
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
