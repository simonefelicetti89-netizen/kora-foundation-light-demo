// app/admin/workers/page.tsx
// B104: Admin worker provisioning — KORA_ADMIN only.
// Server component with live Supabase session gate.
// Renders a provisioning form and current worker list per tenant.

import { redirect } from 'next/navigation';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';
import WorkersAdminClient from './_components/WorkersAdminClient';

export default async function AdminWorkersPage() {
  const user = await getCurrentKoraUser();
  if (!user || user.koraRole !== 'KORA_ADMIN') {
    redirect('/admin/login');
  }

  return <WorkersAdminClient adminEmail={user.email} />;
}
