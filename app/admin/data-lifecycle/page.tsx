// A-13: Data Lifecycle — gestione ciclo vita dati.
// Scopo: monitorare e controllare la retention, l'archivio
//        e la rimozione dei dati secondo policy KORA.
// app/admin/data-lifecycle/page.tsx
// B10 — Data Lifecycle Management — KORA_ADMIN only.
// Inspect, archive, and controlled delete of intake batches.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { DataLifecyclePanel } from './_components/DataLifecyclePanel';
import Link from 'next/link';

export default async function DataLifecyclePage() {
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
          {auth.status === 403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
        </h1>
        <Link href="/admin/login"
          className="inline-block mt-2 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium">
          Vai al login
        </Link>
      </div>
    );
  }

  return <DataLifecyclePanel userEmail={auth.email} userRole={auth.koraRole} />;
}
