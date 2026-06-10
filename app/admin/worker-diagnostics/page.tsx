// app/admin/worker-diagnostics/page.tsx
// B104: Worker provisioning state per tenant — KORA_ADMIN only.
// Server component with live session gate. Reads from /api/admin/worker-diagnostics.

import { redirect } from 'next/navigation';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';
import WorkerDiagnosticsClient from './_components/WorkerDiagnosticsClient';

export default async function WorkerDiagnosticsPage() {
  const user = await getCurrentKoraUser();
  if (!user || user.koraRole !== 'KORA_ADMIN') {
    redirect('/admin/login');
  }

  return <WorkerDiagnosticsClient />;
}
