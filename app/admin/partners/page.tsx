// app/admin/partners/page.tsx
// B116: Partner Map Foundation — KORA_ADMIN partner catalog management.
// KORA_ADMIN creates and publishes partners visible to all workers.
// No marketplace, no booking, no pricing, no partner ranking.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PartnersAdminClient } from './_components/PartnersAdminClient';

export const metadata = {
  title: 'Partner Catalog — KORA Admin',
};

export default async function AdminPartnersPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();

  const { data: partners } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, delivery_mode, status, created_at')
    .order('created_at', { ascending: false });

  const partnerList = (partners ?? []).map(p => ({
    id:            p.id as string,
    name:          p.name as string,
    description:   (p.description as string | null) ?? null,
    pillar:        p.pillar as string,
    category:      (p.category as string | null) ?? null,
    website_url:   (p.website_url as string | null) ?? null,
    city:          (p.city as string | null) ?? null,
    delivery_mode: p.delivery_mode as string,
    status:        p.status as string,
    created_at:    p.created_at as string,
  }));

  return (
    <div style={{
      maxWidth: 960, margin: '0 auto', padding: '40px 24px',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0 }}>
            Partner Catalog
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
          Gestisci i partner della rete KORA. I partner published sono visibili ai worker
          nella sezione &ldquo;Opportunità&rdquo;. Nessun marketplace, nessuna prenotazione, nessun ranking.
        </p>
      </div>

      <PartnersAdminClient initialPartners={partnerList} />
    </div>
  );
}
