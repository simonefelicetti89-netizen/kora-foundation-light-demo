// A-DEMO-01: ACME-001 Guided Demo — demo guidata con dataset sintetico.
// Scopo: mostrare il percorso KORA completo su dati ACME (manifattura,
//        250 lavoratori, scenario pre_empirical) senza contaminare pilot live.
// app/admin/demo/acme-001/page.tsx
// B40 — ACME-001 Guided Demo Hub. KORA_ADMIN only.
// 100% static synthetic data — no live DB queries.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { AcmeDemoHub } from './_components/AcmeDemoHub';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Guided Demo — ACME-001 · KORA Admin',
};

export default async function AcmeDemoPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return <AcmeDemoHub userEmail={auth.email} />;
}
