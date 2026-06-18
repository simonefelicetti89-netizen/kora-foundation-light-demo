// app/admin/platform/diagnostics/worker/page.tsx — B169 FASE 5
// Consolidated from app/admin/worker-diagnostics/page.tsx.
// KORA_ADMIN only — worker provisioning state per tenant.

import { redirect } from 'next/navigation';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';
import WorkerDiagnosticsClient from '@/app/admin/worker-diagnostics/_components/WorkerDiagnosticsClient';

export default async function WorkerDiagnosticsPage() {
  const user = await getCurrentKoraUser();
  if (!user || user.koraRole !== 'KORA_ADMIN') {
    redirect('/admin/login');
  }

  return <WorkerDiagnosticsClient />;
}
