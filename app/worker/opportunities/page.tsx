// app/worker/opportunities/page.tsx
// B116: Worker Partner Map — informational partner catalog for workers.
//
// WORKER only — server component with requireWorkerUser gate.
// Shows published partners filtered by pillar.
// No booking, no marketplace, no ranking, no pricing, no chat.
// No individual click tracking — browsing is private to the worker.
//
// PRIVACY CONTRACT:
//   - workerId and tenantId from session only — never from request params
//   - No click/view tracking stored
//   - Company roles cannot access this page (middleware + layout gate)
//   - Privacy notice is non-suppressible

import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { SessionBar } from '@/components/auth/SessionBar';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PartnerCatalogClient } from './_components/PartnerCatalogClient';

export type PartnerItem = {
  id:            string;
  name:          string;
  description:   string | null;
  pillar:        string;
  category:      string | null;
  website_url:   string | null;
  city:          string | null;
  delivery_mode: string;
};

export default async function WorkerOpportunitiesPage() {
  const worker = await getCurrentWorkerUser();
  if (!worker) redirect('/worker/login');

  const db = getSupabaseServiceClient();

  // Fetch published partners — app layer enforces status = 'published'
  const { data: rawPartners } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, delivery_mode')
    .eq('status', 'published')
    .order('pillar', { ascending: true });

  const partners: PartnerItem[] = (rawPartners ?? []).map(p => ({
    id:            p.id as string,
    name:          p.name as string,
    description:   (p.description as string | null) ?? null,
    pillar:        p.pillar as string,
    category:      (p.category as string | null) ?? null,
    website_url:   (p.website_url as string | null) ?? null,
    city:          (p.city as string | null) ?? null,
    delivery_mode: p.delivery_mode as string,
  }));

  return (
    <>
      <SessionBar email={worker.email} role={worker.koraRole} />
      <div
        data-testid="worker-opportunities-page"
        style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <a
            href="/worker/workspace"
            style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}
          >
            ← Il mio spazio
          </a>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0, marginBottom: 6 }}>
            Opportunità & Partner
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: 0 }}>
            Partner della rete KORA organizzati per pillar — informativo, non una prenotazione.
          </p>
        </div>

        {/* Privacy notice — non-suppressible */}
        <div
          data-testid="partner-privacy-notice"
          style={{
            background: 'rgba(47,125,85,0.06)', border: '1px solid rgba(47,125,85,0.20)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 12, color: '#1a4731', margin: 0, lineHeight: 1.6 }}>
            <strong>Privacy:</strong>{' '}
            La tua navigazione tra i partner non viene mostrata al datore di lavoro.
            L&apos;azienda vede solo dati aggregati anonimi, non le tue scelte individuali.
            Questa sezione è informativa — non genera prenotazioni, non traccia click individuali.
          </p>
        </div>

        {/* Partner catalog */}
        <PartnerCatalogClient partners={partners} />

        <div style={{ marginTop: 32, fontSize: 10, color: 'rgba(6,3,43,0.30)', lineHeight: 1.5 }}>
          KORA Foundation Light · Opportunità & Partner · Nessun marketplace, nessuna prenotazione, nessun ranking.
        </div>
      </div>
    </>
  );
}
