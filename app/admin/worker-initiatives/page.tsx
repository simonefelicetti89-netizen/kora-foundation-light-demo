// app/admin/worker-initiatives/page.tsx
// B109: KORA_ADMIN — Worker Initiatives Management
// Scopo: KORA_ADMIN crea iniziative per tenant, le pubblica e le chiude.
// Worker e company non vedono questa pagina.
// KORA_ADMIN only — server component auth gate.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkerInitiativesClient } from './_components/WorkerInitiativesClient';

export const metadata = {
  title: 'Worker Initiatives — KORA Admin',
};

export default async function WorkerInitiativesPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();

  // Fetch all active tenants for the dropdown
  const { data: tenants } = await db
    .schema('analytics')
    .from('tenant')
    .select('id, company_name, tenant_code')
    .eq('is_active', true)
    .order('company_name');

  const tenantList = (tenants ?? []).map(t => ({
    id: t.id as string,
    company_name: t.company_name as string,
    tenant_code: t.tenant_code as string,
  }));

  return (
    <div style={{
      maxWidth: 960, margin: '0 auto', padding: '40px 24px',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0 }}>
            Worker Initiatives
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'rgba(6,3,43,0.07)', color: 'rgba(6,3,43,0.45)',
            borderRadius: 4, padding: '2px 7px',
          }}>
            KORA ADMIN
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: 0 }}>
          Crea, pubblica e chiudi iniziative per i tenant. I worker vedono solo le iniziative published del proprio tenant.
          L&apos;azienda non vede dati individuali di partecipazione.
        </p>
      </div>

      <div style={{
        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.30)',
        borderRadius: 8, padding: '12px 16px', marginBottom: 28,
        fontSize: 12, color: '#78350f', lineHeight: 1.5,
      }}>
        <strong>Privacy:</strong> I dati di partecipazione individuale dei worker non sono mai visibili qui.
        L&apos;aggregato di partecipazione per pillar è accessibile solo via <code>/api/company/workers/activation-aggregate</code>
        e solo se il conteggio supera la soglia di sicurezza (N≥10).
      </div>

      <WorkerInitiativesClient tenants={tenantList} adminEmail={auth.email} />
    </div>
  );
}
