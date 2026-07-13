// app/admin/workers/page.tsx
// B104: Admin worker provisioning — KORA_ADMIN only.
// Server component with live Supabase session gate.
// Renders a provisioning form and current worker list per tenant.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';
import WorkersAdminClient from './_components/WorkersAdminClient';

export default async function AdminWorkersPage() {
  const user = await getCurrentKoraUser();
  if (!user || user.koraRole !== 'KORA_ADMIN') {
    redirect('/admin/login');
  }

  return (
    <>
      <div style={{ maxWidth: 760, margin: '12px auto 0', padding: '0 24px' }}>
        <Link
          href="/admin/workers/bulk"
          style={{ fontSize: 12.5, fontWeight: 700, color: '#C76F3D', textDecoration: 'none' }}
        >
          Provisioning in blocco (bulk) →
        </Link>
      </div>
      <WorkersAdminClient adminEmail={user.email} />
    </>
  );
}
