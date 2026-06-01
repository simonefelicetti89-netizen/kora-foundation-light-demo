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
      <div className="max-w-md mx-auto mt-16 p-8 border border-slate-200 rounded-xl bg-white shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-slate-800">
          {is403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
        </h1>
        <p className="text-sm text-slate-500">
          {is403 ? 'Area riservata agli operatori KORA Admin.' : 'Effettua il login.'}
        </p>
        <Link href="/admin/login"
          className="inline-block mt-2 bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">
          Vai al login
        </Link>
      </div>
    );
  }

  return <UefReviewQueue userEmail={auth.email} userRole={auth.koraRole} />;
}
