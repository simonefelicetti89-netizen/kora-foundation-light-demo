// A-12: Data Intake Studio — pipeline intake dati KORA.
// Scopo: gestire l'intero processo di intake: caricamento fonti,
//        classificazione BCM, match review, approvazione per scoring.
// app/admin/data-intake/page.tsx
// Server Component — KORA_ADMIN only.
// Calls requireKoraAdmin() server-side before rendering.
// Passes only email + koraRole to the client component — no token, no session, no secret.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { DataIntakeStudio } from './_components/DataIntakeStudio';
import Link from 'next/link';

export default async function DataIntakePage() {
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    const is403 = auth.status === 403;
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
          {is403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">
          {is403
            ? 'Quest\'area è riservata agli operatori KORA Admin.'
            : 'Effettua il login come operatore KORA Admin per accedere.'}
        </p>
        <Link
          href="/admin/login"
          className="inline-block mt-2 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Vai al login KORA Admin
        </Link>
      </div>
    );
  }

  return (
    <DataIntakeStudio
      userEmail={auth.email}
      userRole={auth.koraRole}
    />
  );
}
