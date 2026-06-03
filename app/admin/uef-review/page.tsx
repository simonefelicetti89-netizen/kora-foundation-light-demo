// A-14: UEF Review Queue — revisione record Unified Event Frame.
// Scopo: consentire a KORA Admin di revisionare, approvare o rifiutare
//        record UEF prima che contribuiscano al KORA Index™.
// app/admin/uef-review/page.tsx
// Server Component — KORA_ADMIN only.
// B5: UEF Review Queue — review interpreter-generated UEF candidates.
// NO scoring. NO KORA Index generation. NO Decision Pack generation.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { UefReviewQueue } from './_components/UefReviewQueue';
import Link from 'next/link';

export default async function UefReviewPage() {
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    const is403 = auth.status === 403;
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
          {is403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">
          {is403 ? 'Area riservata agli operatori KORA Admin.' : 'Effettua il login.'}
        </p>
        <Link href="/admin/login"
          className="inline-block mt-2 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.88)] transition-colors">
          Vai al login
        </Link>
      </div>
    );
  }

  return <UefReviewQueue userEmail={auth.email} userRole={auth.koraRole} />;
}
