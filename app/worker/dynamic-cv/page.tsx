// app/worker/dynamic-cv/page.tsx
// B121: Dynamic Impact CV Light — worker private CV page.
//
// Access: WORKER only (requireWorkerUser enforced server-side).
// COMPANY_ADMIN, KORA_ADMIN cannot reach this page as a worker session.
// KORA_ADMIN admin preview is at /admin/preview/worker/dynamic-cv.
//
// Privacy:
//   - no individual worker data exposed to employer
//   - workerId derived from session — never from URL
//   - no ranking, no score, no comparison with colleagues

import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { DynamicCVClient } from './_components/DynamicCVClient';

export const metadata = { title: 'Dynamic Impact CV · Il tuo percorso KORA' };

export default async function DynamicCVPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  return (
    <DynamicCVClient
      userEmail={auth.email}
    />
  );
}
